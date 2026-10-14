import { Router } from 'express';
import { query, queryOne, withTransaction } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { conflict, notFound } from '../utils/errors.js';
import { parseSharing } from '../utils/serializers.js';
import { optionalText, parseBody, parseId, qs, requiredText, z } from '../utils/validate.js';

const router = Router();

const COLLEGE_SELECT = `
  SELECT c.college_id, c.name, c.city, c.state, c.website, c.created_at,
         COALESCE(hs.hostel_count, 0)      AS hostel_count,
         COALESCE(hs.boys_hostels, 0)      AS boys_hostels,
         COALESCE(hs.girls_hostels, 0)     AS girls_hostels,
         COALESCE(hs.coed_hostels, 0)      AS coed_hostels,
         COALESCE(hs.veg_mess_hostels, 0)    AS veg_mess_hostels,
         COALESCE(hs.nonveg_mess_hostels, 0) AS nonveg_mess_hostels,
         hs.avg_rating,
         COALESCE(rv.review_count, 0)      AS review_count,
         (SELECT COUNT(*) FROM users u
           WHERE u.college_id = c.college_id AND u.role = 'student' AND u.is_verified = TRUE) AS verified_students,
         rs.min_price, rs.max_price, rs.min_ac_price, rs.min_non_ac_price,
         COALESCE(rs.room_count, 0) AS room_count,
         COALESCE(rs.ac_room_count, 0) AS ac_room_count,
         rs.sharing
  FROM colleges c
  LEFT JOIN (
      SELECT college_id,
             COUNT(*)                                   AS hostel_count,
             SUM(type = 'boys')                         AS boys_hostels,
             SUM(type = 'girls')                        AS girls_hostels,
             SUM(type = 'coed')                         AS coed_hostels,
             SUM(COALESCE(JSON_CONTAINS(amenities, 'true', '$.veg_mess'), 0))    AS veg_mess_hostels,
             SUM(COALESCE(JSON_CONTAINS(amenities, 'true', '$.nonveg_mess'), 0)) AS nonveg_mess_hostels,
             ROUND(AVG(NULLIF(avg_rating, 0)), 1)       AS avg_rating
      FROM hostels WHERE status = 'approved' GROUP BY college_id
  ) hs ON hs.college_id = c.college_id
  LEFT JOIN (
      SELECT h.college_id,
             MIN(r.price_per_month) AS min_price, MAX(r.price_per_month) AS max_price,
             MIN(CASE WHEN r.is_ac THEN r.price_per_month END)     AS min_ac_price,
             MIN(CASE WHEN NOT r.is_ac THEN r.price_per_month END) AS min_non_ac_price,
             COUNT(*) AS room_count, SUM(r.is_ac) AS ac_room_count,
             GROUP_CONCAT(DISTINCT r.capacity ORDER BY r.capacity) AS sharing
      FROM rooms r JOIN hostels h ON h.hostel_id = r.hostel_id AND h.status = 'approved'
      GROUP BY h.college_id
  ) rs ON rs.college_id = c.college_id
  LEFT JOIN (
      SELECT h.college_id, COUNT(*) AS review_count
      FROM reviews x JOIN hostels h ON h.hostel_id = x.hostel_id AND h.status = 'approved'
      WHERE x.status = 'approved'
      GROUP BY h.college_id
  ) rv ON rv.college_id = c.college_id`;

const COUNT_FIELDS = [
  'hostel_count', 'boys_hostels', 'girls_hostels', 'coed_hostels', 'veg_mess_hostels',
  'nonveg_mess_hostels', 'review_count', 'verified_students', 'room_count', 'ac_room_count',
];

const serialize = (r) => ({
  ...r,
  ...Object.fromEntries(COUNT_FIELDS.map((k) => [k, Number(r[k] ?? 0)])),
  avg_rating: r.avg_rating === null ? null : Number(r.avg_rating),
  sharing: parseSharing(r.sharing),
});

const normalizeWebsite = (v) => {
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

const collegeSchema = z.object({
  name: requiredText('College name', 150, 2),
  city: requiredText('City', 60, 2),
  state: requiredText('State', 60, 2),
  website: optionalText(150)
    .transform(normalizeWebsite)
    .refine((v) => v === null || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), { message: 'Enter a valid website URL' }),
});

router.get('/', async (req, res) => {
  const q = qs(req.query.q);
  const where = q ? 'WHERE c.name LIKE ? OR c.city LIKE ? OR c.state LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
  const rows = await query(`${COLLEGE_SELECT} ${where} ORDER BY c.name`, params);
  res.json({ colleges: rows.map(serialize) });
});

router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const row = await queryOne(`${COLLEGE_SELECT} WHERE c.college_id = ?`, [id]);
  if (!row) throw notFound('College not found.');
  res.json({ college: serialize(row) });
});

router.post('/', requireRole('admin'), async (req, res) => {
  const data = parseBody(collegeSchema, req.body);
  const dup = await queryOne('SELECT college_id FROM colleges WHERE name = ? AND city = ?', [data.name, data.city]);
  if (dup) throw conflict(`${data.name} (${data.city}) already exists.`);
  const result = await query('INSERT INTO colleges (name, city, state, website) VALUES (?, ?, ?, ?)', [
    data.name,
    data.city,
    data.state,
    data.website,
  ]);
  res.status(201).json({ message: 'College added.', college_id: result.insertId });
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseId(req.params.id);
  const data = parseBody(collegeSchema, req.body);
  const result = await query('UPDATE colleges SET name = ?, city = ?, state = ?, website = ? WHERE college_id = ?', [
    data.name,
    data.city,
    data.state,
    data.website,
    id,
  ]);
  if (!result.affectedRows) throw notFound('College not found.');
  res.json({ message: 'College updated.' });
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = parseId(req.params.id);
  const { n } = (await queryOne('SELECT COUNT(*) AS n FROM hostels WHERE college_id = ?', [id])) ?? { n: 0 };
  if (n > 0) throw conflict(`This college still has ${n} hostel${n === 1 ? '' : 's'} (any status). Delete those first.`);

  await withTransaction(async (q) => {
    await q("UPDATE users SET is_verified = FALSE WHERE college_id = ? AND role = 'student'", [id]);
    const result = await q('DELETE FROM colleges WHERE college_id = ?', [id]);
    if (!result.affectedRows) throw notFound('College not found.');
  });
  res.json({ message: 'College deleted.' });
});

export default router;
