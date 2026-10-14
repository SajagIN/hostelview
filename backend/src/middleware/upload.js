import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { badRequest } from '../utils/errors.js';

const { photosDir, maxFileSizeMb } = config.uploads;
const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

fs.mkdirSync(photosDir, { recursive: true });

export const photoUpload = multer({
  storage: multer.diskStorage({
    destination: photosDir,
    filename: (req, file, cb) => cb(null, `h${req.params.id}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXTENSIONS[file.mimetype]}`),
  }),
  limits: { fileSize: maxFileSizeMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(EXTENSIONS[file.mimetype] ? null : badRequest('Only JPG, PNG, WEBP or GIF images are allowed.'), true),
});

export const publicUrlFor = (filename) => `/uploads/photos/${filename}`;

export function removeLocalPhoto(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/photos/')) return;
  fs.promises.unlink(path.join(photosDir, path.basename(url))).catch(() => {});
}
