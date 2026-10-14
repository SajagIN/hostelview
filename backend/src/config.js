import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PROJECT_DIR = path.resolve(BACKEND_DIR, '..');
export const DATABASE_DIR = path.join(PROJECT_DIR, 'database');
export const FRONTEND_DIR = path.join(PROJECT_DIR, 'frontend');

export const config = {
  port: Number(process.env.PORT) || 5000,
  db: { port: Number(process.env.DB_PORT) || 3307, name: 'hostelview' },
  jwt: { secret: process.env.JWT_SECRET || 'hostelview-local-secret', expiresIn: '7d' },
  otp: { ttlMinutes: 10, resendCooldownSeconds: 30, maxAttempts: 5 },
  rules: { restrictToOwnCollege: true, autoApproveAdmin: true },
  uploads: {
    dir: path.join(BACKEND_DIR, 'uploads'),
    photosDir: path.join(BACKEND_DIR, 'uploads', 'photos'),
    maxFileSizeMb: 5,
  },
};
