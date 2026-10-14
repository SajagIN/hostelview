import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { queryOne } from '../db.js';
import { isContributor, isVerifiedStudent } from '../services/permissions.js';
import { forbidden, unauthorized } from '../utils/errors.js';
import { serializeUser } from '../utils/serializers.js';

export async function findUserById(userId) {
  return serializeUser(
    await queryOne(
      `SELECT u.user_id, u.name, u.email, u.role, u.college_email, u.is_verified, u.college_id, u.created_at, c.name AS college_name
         FROM users u LEFT JOIN colleges c ON c.college_id = u.college_id
        WHERE u.user_id = ?`,
      [userId],
    ),
  );
}

export function signToken(user) {
  return jwt.sign({ sub: user.user_id, email: user.email, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

// Attaches req.user when a valid token is sent. Role and verification are re-read from MySQL on every request.
export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(header.slice(7), config.jwt.secret);
    const user = await findUserById(payload.sub);
    if (user && user.email === payload.email) req.user = user;
    else req.authError = 'Your account was not found. Please log in again.';
  } catch (err) {
    if (!['TokenExpiredError', 'JsonWebTokenError', 'NotBeforeError'].includes(err.name)) return next(err);
    req.authError = 'Your session has expired. Please log in again.';
  }
  next();
}

export function requireAuth(req, res, next) {
  next(req.user ? undefined : unauthorized(req.authError));
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(unauthorized(req.authError));
  if (!roles.includes(req.user.role)) return next(forbidden(`This action requires the ${roles.join(' or ')} role.`));
  next();
};

export function requireContributor(req, res, next) {
  if (!req.user) return next(unauthorized(req.authError));
  if (!isContributor(req.user)) return next(forbidden('Only verified students can contribute. Verify your college email first.'));
  next();
}

export function requireVerifiedStudent(req, res, next) {
  if (!req.user) return next(unauthorized(req.authError));
  if (!isVerifiedStudent(req.user)) return next(forbidden('Only verified students can write reviews.'));
  next();
}
