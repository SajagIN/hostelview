import { z } from 'zod';
import { badRequest } from './errors.js';

export { z };

export function parseId(value, label = 'id') {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw badRequest(`Invalid ${label}.`);
  return n;
}

export const parseBody = (schema, body) => schema.parse(body ?? {});

export const optionalText = (max) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === 'string' ? v.trim() : v) || null)
    .refine((v) => v === null || v.length <= max, { message: `Must be at most ${max} characters` });

export const requiredText = (label, max, min = 1) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be text` })
    .trim()
    .min(min, min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

export const emailField = (label = 'Email') =>
  z.string({ required_error: `${label} is required` }).trim().toLowerCase().email(`Enter a valid ${label.toLowerCase()}`).max(150);

export const optionalInt = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
  .refine((v) => v === null || Number.isInteger(v), { message: 'Must be a whole number' });

export function qs(value) {
  if (Array.isArray(value)) value = value[0];
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

export function qsNumber(value) {
  const n = Number(qs(value));
  return qs(value) !== undefined && Number.isFinite(n) ? n : undefined;
}
