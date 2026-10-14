import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { query, queryOne } from '../db.js';
import { findUserById, requireAuth, signToken } from '../middleware/auth.js';
import { otpEmail, sendMail } from '../services/mailer.js';
import { generateOtp, otpStatus, verifyOtp } from '../services/otp.js';
import { loadCollege } from '../services/permissions.js';
import { badRequest, conflict, unauthorized } from '../utils/errors.js';
import { emailField, optionalInt, parseBody, requiredText, z } from '../utils/validate.js';

const router = Router();

const passwordField = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

const optionalEmail = (label) => z.preprocess((v) => (v === '' || v === null ? undefined : v), emailField(label).optional());

const registerSchema = z
  .object({
    name: requiredText('Name', 100, 2),
    email: emailField('Email'),
    password: passwordField,
    account_type: z.enum(['visitor', 'student']).default('visitor'),
    college_id: optionalInt,
    college_email: optionalEmail('College email'),
  })
  .superRefine((d, ctx) => {
    if (d.account_type !== 'student') return;
    if (!d.college_id) ctx.addIssue({ code: 'custom', path: ['college_id'], message: 'Select your college' });
    if (!d.college_email) ctx.addIssue({ code: 'custom', path: ['college_email'], message: 'Your college email is required' });
  });

async function assertCollegeEmailAvailable(collegeEmail, userId) {
  const taken = await queryOne('SELECT user_id FROM users WHERE college_email = ? AND is_verified = TRUE AND user_id <> ?', [
    collegeEmail,
    userId,
  ]);
  if (taken) throw conflict('This college email is already verified by another HostelView account.');
}

async function sendVerificationCode(user, college, collegeEmail) {
  const code = generateOtp(user.user_id, { collegeId: college.college_id, collegeEmail });
  const mail = otpEmail({ name: user.name, code, collegeName: college.name, ttlMinutes: config.otp.ttlMinutes });
  sendMail({ to: collegeEmail, ...mail, meta: { type: 'otp', code, user_id: user.user_id } });
  return {
    sent_to: collegeEmail,
    college_name: college.name,
    expires_in_minutes: config.otp.ttlMinutes,
    resend_in: config.otp.resendCooldownSeconds,
    dev_otp: code,
  };
}

router.post('/register', async (req, res) => {
  const data = parseBody(registerSchema, req.body);
  if (await queryOne('SELECT user_id FROM users WHERE email = ?', [data.email])) {
    throw conflict('An account with this email already exists. Try logging in instead.');
  }

  let college = null;
  if (data.account_type === 'student') {
    college = await loadCollege(data.college_id);
    await assertCollegeEmailAvailable(data.college_email, 0);
  }

  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, college_email, is_verified, college_id)
     VALUES (?, ?, ?, ?, ?, FALSE, ?)`,
    [data.name, data.email, await bcrypt.hash(data.password, 10), data.account_type, college ? data.college_email : null, college?.college_id ?? null],
  );

  const user = await findUserById(result.insertId);
  const otp = college ? await sendVerificationCode(user, college, data.college_email) : null;
  res.status(201).json({ token: signToken(user), user, otp, verification: otpStatus(user.user_id) });
});

router.post('/login', async (req, res) => {
  const { email, password } = parseBody(
    z.object({ email: emailField('Email'), password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required') }),
    req.body,
  );
  const row = await queryOne('SELECT user_id, password_hash FROM users WHERE email = ?', [email]);
  if (!row || !(await bcrypt.compare(password, row.password_hash))) throw unauthorized('Incorrect email or password.');

  const user = await findUserById(row.user_id);
  res.json({ token: signToken(user), user, verification: otpStatus(user.user_id) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user, verification: otpStatus(req.user.user_id) });
});

router.post('/verification/send', requireAuth, async (req, res) => {
  const user = req.user;
  if (user.role === 'admin') throw badRequest('Admins do not need college verification.');

  const body = parseBody(z.object({ college_id: optionalInt, college_email: optionalEmail('College email') }), req.body);
  const collegeId = body.college_id ?? user.college_id;
  const collegeEmail = body.college_email ?? user.college_email;
  if (!collegeId) throw badRequest('college_id: Select your college.');
  if (!collegeEmail) throw badRequest('college_email: Enter your official college email.');
  if (user.is_verified && collegeId === user.college_id && collegeEmail === user.college_email) {
    throw badRequest('This college email is already verified on your account.');
  }

  const college = await loadCollege(collegeId);
  await assertCollegeEmailAvailable(collegeEmail, user.user_id);
  const otp = await sendVerificationCode(user, college, collegeEmail);
  res.json({ message: `We sent a 6-digit code to ${collegeEmail}.`, otp, verification: otpStatus(user.user_id) });
});

router.post('/verification/confirm', requireAuth, async (req, res) => {
  const { code } = parseBody(z.object({ code: z.coerce.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the email') }), req.body);
  const { collegeId, collegeEmail } = verifyOtp(req.user.user_id, code);
  await assertCollegeEmailAvailable(collegeEmail, req.user.user_id);

  await query(
    `UPDATE users
        SET role = IF(role = 'admin', 'admin', 'student'), is_verified = TRUE, college_id = ?, college_email = ?
      WHERE user_id = ?`,
    [collegeId, collegeEmail, req.user.user_id],
  );

  const user = await findUserById(req.user.user_id);
  res.json({ message: `You're verified! You can now contribute to ${user.college_name} hostels.`, user, token: signToken(user) });
});

router.patch('/profile', requireAuth, async (req, res) => {
  const { name } = parseBody(z.object({ name: requiredText('Name', 100, 2) }), req.body);
  await query('UPDATE users SET name = ? WHERE user_id = ?', [name, req.user.user_id]);
  res.json({ message: 'Profile updated.', user: await findUserById(req.user.user_id) });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = parseBody(
    z.object({ current_password: z.string().min(1, 'Current password is required'), new_password: passwordField }),
    req.body,
  );
  const row = await queryOne('SELECT password_hash FROM users WHERE user_id = ?', [req.user.user_id]);
  if (!(await bcrypt.compare(current_password, row.password_hash))) throw badRequest('Your current password is incorrect.');
  await query('UPDATE users SET password_hash = ? WHERE user_id = ?', [await bcrypt.hash(new_password, 10), req.user.user_id]);
  res.json({ message: 'Password updated.' });
});

export default router;
