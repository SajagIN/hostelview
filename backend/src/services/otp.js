import crypto from 'node:crypto';
import { config } from '../config.js';
import { badRequest, tooMany } from '../utils/errors.js';

const store = new Map();
const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export function generateOtp(userId, { collegeId, collegeEmail }) {
  const now = Date.now();
  const existing = store.get(userId);
  const cooldownMs = config.otp.resendCooldownSeconds * 1000;
  if (existing && now - existing.lastSentAt < cooldownMs) {
    const wait = Math.ceil((cooldownMs - (now - existing.lastSentAt)) / 1000);
    throw tooMany(`Please wait ${wait}s before requesting another code.`, { retry_after: wait });
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  store.set(userId, {
    codeHash: sha256(code),
    collegeId,
    collegeEmail,
    expiresAt: now + config.otp.ttlMinutes * 60_000,
    attempts: 0,
    lastSentAt: now,
  });
  return code;
}

export function verifyOtp(userId, code) {
  const entry = store.get(userId);
  if (!entry) throw badRequest('No active code — request a new one.');
  if (Date.now() > entry.expiresAt) {
    store.delete(userId);
    throw badRequest('This code has expired — request a new one.');
  }
  if (sha256(String(code).trim()) !== entry.codeHash) {
    entry.attempts += 1;
    const left = config.otp.maxAttempts - entry.attempts;
    if (left <= 0) {
      store.delete(userId);
      throw tooMany('Too many incorrect attempts — request a new code.');
    }
    throw badRequest(`Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`);
  }
  store.delete(userId);
  return { collegeId: entry.collegeId, collegeEmail: entry.collegeEmail };
}

export function otpStatus(userId) {
  const entry = store.get(userId);
  if (!entry || Date.now() > entry.expiresAt) return { pending: false };
  return {
    pending: true,
    college_id: entry.collegeId,
    college_email: entry.collegeEmail,
    expires_at: new Date(entry.expiresAt).toISOString(),
    resend_in: Math.max(0, Math.ceil((entry.lastSentAt + config.otp.resendCooldownSeconds * 1000 - Date.now()) / 1000)),
  };
}

export function clearOtp(userId) {
  store.delete(userId);
}
