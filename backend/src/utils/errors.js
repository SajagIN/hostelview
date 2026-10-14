import multer from 'multer';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const unauthorized = (msg = 'Please log in to continue.') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to do that.') => new HttpError(403, msg);
export const notFound = (msg = 'Not found.') => new HttpError(404, msg);
export const conflict = (msg, details) => new HttpError(409, msg, details);
export const tooMany = (msg, details) => new HttpError(429, msg, details);

const MYSQL_ERRORS = {
  ER_DUP_ENTRY: [409, 'That record already exists.'],
  ER_ROW_IS_REFERENCED_2: [409, 'This record is still referenced by other data and cannot be deleted.'],
  ER_NO_REFERENCED_ROW_2: [400, 'A referenced record does not exist.'],
  ER_CHECK_CONSTRAINT_VIOLATED: [400, 'A value is outside the allowed range.'],
  ER_DATA_TOO_LONG: [400, 'One of the values is too long.'],
  ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: [400, 'One of the values has the wrong format.'],
};

export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';
  let details = err.details;

  if (err instanceof ZodError) {
    const first = err.issues[0];
    status = 400;
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    message = first ? (first.path.length ? `${first.path.join('.')}: ${first.message}` : first.message) : 'Invalid input.';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'That photo is too large.' : `Upload error: ${err.message}`;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body.';
  } else if (MYSQL_ERRORS[err.code]) {
    [status, message] = MYSQL_ERRORS[err.code];
    details = { mysql: err.sqlMessage };
  } else if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT'].includes(err.code)) {
    status = 503;
    message = 'The database is not reachable. Restart the app with npm start.';
  }

  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);
  res.status(status).json({ error: { message, ...(details ? { details } : {}) } });
}
