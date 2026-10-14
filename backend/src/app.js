import path from 'node:path';
import express from 'express';
import morgan from 'morgan';
import { config, FRONTEND_DIR } from './config.js';
import { authenticate } from './middleware/auth.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import collegeRoutes from './routes/colleges.routes.js';
import devRoutes from './routes/dev.routes.js';
import hostelRoutes from './routes/hostels.routes.js';
import meRoutes from './routes/me.routes.js';
import metaRoutes from './routes/meta.routes.js';
import photoRoutes from './routes/photos.routes.js';
import reviewRoutes from './routes/reviews.routes.js';
import roomRoutes from './routes/rooms.routes.js';
import { errorHandler } from './utils/errors.js';

export function createApp() {
  const app = express();
  const dist = path.join(FRONTEND_DIR, 'dist');

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan('dev', { skip: (req) => !req.originalUrl.startsWith('/api') }));
  app.use('/uploads', express.static(config.uploads.dir, { maxAge: '7d', fallthrough: false }));

  app.use('/api', authenticate);
  app.use('/api', metaRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/colleges', collegeRoutes);
  app.use('/api/hostels', hostelRoutes);
  app.use('/api', roomRoutes);
  app.use('/api', photoRoutes);
  app.use('/api', reviewRoutes);
  app.use('/api/me', meRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/dev', devRoutes);
  app.use('/api', (req, res) => res.status(404).json({ error: { message: `No API route for ${req.method} ${req.originalUrl}` } }));

  app.use(express.static(dist, { index: false }));
  app.use((req, res, next) => (req.method === 'GET' ? res.sendFile(path.join(dist, 'index.html')) : next()));

  app.use(errorHandler);
  return app;
}
