import { Router } from 'express';
import { config } from '../config.js';
import { query, queryOne } from '../db.js';
import { AMENITIES, AMENITY_GROUPS } from '../utils/amenities.js';

const router = Router();

router.get('/meta', async (req, res) => {
  const [cities, server] = await Promise.all([
    query(
      `SELECT c.city, c.state, COUNT(h.hostel_id) AS hostel_count
         FROM colleges c
         JOIN hostels h ON h.college_id = c.college_id AND h.status = 'approved'
        GROUP BY c.city, c.state
        ORDER BY c.city`,
    ),
    queryOne('SELECT VERSION() AS version'),
  ]);
  res.json({
    amenities: AMENITIES,
    amenity_groups: AMENITY_GROUPS,
    room_types: ['single', 'double', 'triple', 'four-sharing', 'six-sharing', 'dormitory'],
    cities,
    otp: { ttl_minutes: config.otp.ttlMinutes },
    max_upload_mb: config.uploads.maxFileSizeMb,
    database: { engine: 'MySQL', version: server.version },
  });
});

router.get('/stats', async (req, res) => {
  const row = await queryOne(`
    SELECT (SELECT COUNT(*) FROM colleges)                                       AS colleges,
           (SELECT COUNT(*) FROM hostels WHERE status = 'approved')              AS hostels,
           (SELECT COUNT(*) FROM reviews WHERE status = 'approved')              AS reviews,
           (SELECT COUNT(*) FROM photos  WHERE status = 'approved')              AS photos,
           (SELECT COUNT(*) FROM users   WHERE role = 'student' AND is_verified) AS verified_students`);
  res.json(row);
});

router.get('/health', async (req, res) => {
  try {
    const row = await queryOne('SELECT VERSION() AS version, DATABASE() AS name, @@port AS port');
    res.json({ ok: true, database: { connected: true, ...row } });
  } catch (err) {
    res.status(503).json({ ok: false, database: { connected: false, error: err.code || err.message } });
  }
});

export default router;
