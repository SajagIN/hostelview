import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/submissions', requireAuth, async (req, res) => {
  const uid = req.user.user_id;
  const [hostels, photos, reviews] = await Promise.all([
    query(
      `SELECT h.hostel_id, h.name, h.type, h.status, h.avg_rating, h.created_at, h.updated_at,
              c.name AS college_name,
              (SELECT COUNT(*) FROM rooms r WHERE r.hostel_id = h.hostel_id) AS room_count
         FROM hostels h JOIN colleges c ON c.college_id = h.college_id
        WHERE h.submitted_by = ?
        ORDER BY h.created_at DESC`,
      [uid],
    ),
    query(
      `SELECT p.photo_id, p.url, p.caption, p.status, p.created_at, p.hostel_id,
              h.name AS hostel_name, r.room_type
         FROM photos p
         JOIN hostels h ON h.hostel_id = p.hostel_id
         LEFT JOIN rooms r ON r.room_id = p.room_id
        WHERE p.uploaded_by = ?
        ORDER BY p.created_at DESC`,
      [uid],
    ),
    query(
      `SELECT rv.review_id, rv.rating, rv.title, rv.comment, rv.status, rv.created_at, rv.hostel_id,
              h.name AS hostel_name, r.room_type
         FROM reviews rv
         JOIN hostels h ON h.hostel_id = rv.hostel_id
         LEFT JOIN rooms r ON r.room_id = rv.room_id
        WHERE rv.user_id = ?
        ORDER BY rv.created_at DESC`,
      [uid],
    ),
  ]);
  res.json({ hostels, photos, reviews });
});

export default router;
