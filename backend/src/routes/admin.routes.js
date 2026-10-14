import { Router } from 'express';
import { query, queryOne, withTransaction } from '../db.js';
import { requireRole } from '../middleware/auth.js';
import { removeLocalPhoto } from '../middleware/upload.js';
import { recomputeHostelRatings } from '../services/ratings.js';
import { clearOtp } from '../services/otp.js';
import { loadCollege } from '../services/permissions.js';
import { badRequest, notFound } from '../utils/errors.js';
import { parseBody, parseId, qs, z } from '../utils/validate.js';

const router = Router();
router.use(requireRole('admin'));

const MODERATED = {
  hostels: { table: 'hostels', pk: 'hostel_id', label: 'Hostel' },
  photos: { table: 'photos', pk: 'photo_id', label: 'Photo' },
  reviews: { table: 'reviews', pk: 'review_id', label: 'Review' },
};

function moderatedType(type) {
  const meta = MODERATED[type];
  if (!meta) throw notFound('Unknown content type. Use hostels, photos or reviews.');
  return meta;
}

const STATUSES = ['pending', 'approved', 'rejected'];

router.get('/stats', async (req, res) => {
  const [users, hostels, photos, reviews, totals, recent, perCollege] = await Promise.all([
    query('SELECT role, is_verified, COUNT(*) AS n FROM users GROUP BY role, is_verified'),
    query('SELECT status, COUNT(*) AS n FROM hostels GROUP BY status'),
    query('SELECT status, COUNT(*) AS n FROM photos GROUP BY status'),
    query('SELECT status, COUNT(*) AS n FROM reviews GROUP BY status'),
    queryOne('SELECT (SELECT COUNT(*) FROM colleges) AS colleges, (SELECT COUNT(*) FROM rooms) AS rooms'),
    query(`
      (SELECT 'hostel' AS kind, h.hostel_id AS id, h.hostel_id, h.name AS summary, h.status, h.created_at, u.name AS user_name
         FROM hostels h JOIN users u ON u.user_id = h.submitted_by ORDER BY h.created_at DESC LIMIT 8)
      UNION ALL
      (SELECT 'photo', p.photo_id, p.hostel_id, COALESCE(p.caption, 'Photo'), p.status, p.created_at, u.name
         FROM photos p JOIN users u ON u.user_id = p.uploaded_by ORDER BY p.created_at DESC LIMIT 8)
      UNION ALL
      (SELECT 'review', r.review_id, r.hostel_id, CONCAT(r.rating, '★ ', COALESCE(r.title, '')), r.status, r.created_at, u.name
         FROM reviews r JOIN users u ON u.user_id = r.user_id ORDER BY r.created_at DESC LIMIT 8)
      ORDER BY created_at DESC LIMIT 10`),
    query(`
      SELECT c.college_id, c.name, c.city,
             SUM(h.status = 'approved') AS approved, SUM(h.status = 'pending') AS pending, COUNT(h.hostel_id) AS total
        FROM colleges c LEFT JOIN hostels h ON h.college_id = c.college_id
       GROUP BY c.college_id, c.name, c.city
       ORDER BY total DESC, c.name`),
  ]);

  const byStatus = (rows) => {
    const out = { pending: 0, approved: 0, rejected: 0 };
    rows.forEach((r) => (out[r.status] = Number(r.n)));
    out.total = out.pending + out.approved + out.rejected;
    return out;
  };
  const userStats = { visitor: 0, student: 0, verified_students: 0, admin: 0, total: 0 };
  users.forEach((r) => {
    userStats[r.role] += Number(r.n);
    userStats.total += Number(r.n);
    if (r.role === 'student' && r.is_verified) userStats.verified_students += Number(r.n);
  });

  res.json({
    users: userStats,
    hostels: byStatus(hostels),
    photos: byStatus(photos),
    reviews: byStatus(reviews),
    colleges: Number(totals.colleges),
    rooms: Number(totals.rooms),
    recent,
    per_college: perCollege.map((r) => ({ ...r, approved: Number(r.approved ?? 0), pending: Number(r.pending ?? 0), total: Number(r.total) })),
  });
});

router.get('/moderation/counts', async (req, res) => {
  const row = await queryOne(`
    SELECT (SELECT COUNT(*) FROM hostels WHERE status = 'pending') AS hostels,
           (SELECT COUNT(*) FROM photos  WHERE status = 'pending') AS photos,
           (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS reviews`);
  const counts = { hostels: Number(row.hostels), photos: Number(row.photos), reviews: Number(row.reviews) };
  res.json({ ...counts, total: counts.hostels + counts.photos + counts.reviews });
});

router.get('/moderation/:type', async (req, res) => {
  const { pk } = moderatedType(req.params.type);
  const status = qs(req.query.status) || 'pending';
  const q = qs(req.query.q);
  const where = [];
  const params = [];
  const alias = { hostels: 'h', photos: 'p', reviews: 'rv' }[req.params.type];
  if (status !== 'all') {
    if (!STATUSES.includes(status)) throw badRequest('Unknown status filter.');
    where.push(`${alias}.status = ?`);
    params.push(status);
  }
  if (q) {
    const like = `%${q}%`;
    where.push('(h.name LIKE ? OR c.name LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = status === 'pending' ? 'ASC' : 'DESC';

  let rows;
  if (req.params.type === 'hostels') {
    rows = await query(
      `SELECT h.hostel_id, h.name, h.type, h.address, h.amenities, h.status, h.avg_rating, h.created_at, h.updated_at,
              c.college_id, c.name AS college_name, c.city,
              u.user_id AS user_id, u.name AS user_name, u.email AS user_email, u.college_email AS user_college_email,
              u.is_verified AS user_verified, u.role AS user_role, uc.name AS user_college,
              (SELECT COUNT(*) FROM rooms r WHERE r.hostel_id = h.hostel_id)    AS room_count,
              (SELECT COUNT(*) FROM photos p WHERE p.hostel_id = h.hostel_id)   AS photo_count,
              (SELECT COUNT(*) FROM reviews x WHERE x.hostel_id = h.hostel_id)  AS review_count,
              (SELECT MIN(r.price_per_month) FROM rooms r WHERE r.hostel_id = h.hostel_id) AS min_price
         FROM hostels h
         JOIN colleges c ON c.college_id = h.college_id
         JOIN users u ON u.user_id = h.submitted_by
         LEFT JOIN colleges uc ON uc.college_id = u.college_id
         ${whereSql}
        ORDER BY h.created_at ${order}, h.${pk} ${order}
        LIMIT 300`,
      params,
    );
  } else if (req.params.type === 'photos') {
    rows = await query(
      `SELECT p.photo_id, p.hostel_id, p.room_id, p.url, p.caption, p.status, p.created_at,
              h.name AS hostel_name, h.status AS hostel_status, c.name AS college_name,
              r.room_type, r.floor_no,
              u.user_id AS user_id, u.name AS user_name, u.email AS user_email, u.is_verified AS user_verified,
              u.role AS user_role, uc.name AS user_college
         FROM photos p
         JOIN hostels h ON h.hostel_id = p.hostel_id
         JOIN colleges c ON c.college_id = h.college_id
         JOIN users u ON u.user_id = p.uploaded_by
         LEFT JOIN colleges uc ON uc.college_id = u.college_id
         LEFT JOIN rooms r ON r.room_id = p.room_id
         ${whereSql}
        ORDER BY p.created_at ${order}, p.${pk} ${order}
        LIMIT 300`,
      params,
    );
  } else {
    rows = await query(
      `SELECT rv.review_id, rv.hostel_id, rv.room_id, rv.rating, rv.title, rv.comment, rv.status, rv.created_at,
              h.name AS hostel_name, h.status AS hostel_status, h.avg_rating AS hostel_avg_rating, c.name AS college_name,
              r.room_type, r.floor_no,
              u.user_id AS user_id, u.name AS user_name, u.email AS user_email, u.is_verified AS user_verified,
              u.role AS user_role, uc.name AS user_college
         FROM reviews rv
         JOIN hostels h ON h.hostel_id = rv.hostel_id
         JOIN colleges c ON c.college_id = h.college_id
         JOIN users u ON u.user_id = rv.user_id
         LEFT JOIN colleges uc ON uc.college_id = u.college_id
         LEFT JOIN rooms r ON r.room_id = rv.room_id
         ${whereSql}
        ORDER BY rv.created_at ${order}, rv.${pk} ${order}
        LIMIT 300`,
      params,
    );
  }

  res.json({ items: rows.map((r) => ({ ...r, user_verified: Boolean(r.user_verified) })) });
});

const statusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'], { errorMap: () => ({ message: 'Status must be pending, approved or rejected' }) }),
});

async function setStatus(type, ids, status) {
  const { table, pk } = moderatedType(type);
  return withTransaction(async (q) => {
    const rows = await q(
      `SELECT ${pk} AS id${type === 'hostels' ? '' : ', hostel_id'} FROM ${table} WHERE ${pk} IN (?) FOR UPDATE`,
      [ids],
    );
    if (!rows.length) throw notFound('Nothing to update — the item may have been deleted.');
    await q(`UPDATE ${table} SET status = ? WHERE ${pk} IN (?)`, [status, rows.map((r) => r.id)]);
    if (type === 'reviews') await recomputeHostelRatings(q, rows.map((r) => r.hostel_id));
    return rows.length;
  });
}

router.patch('/moderation/:type/:id', async (req, res) => {
  const { label } = moderatedType(req.params.type);
  const id = parseId(req.params.id);
  const { status } = parseBody(statusSchema, req.body);
  await setStatus(req.params.type, [id], status);
  res.json({ message: `${label} ${status}.` });
});

router.post('/moderation/:type/bulk', async (req, res) => {
  const { label } = moderatedType(req.params.type);
  const { ids, status } = parseBody(
    statusSchema.extend({ ids: z.array(z.coerce.number().int().positive()).min(1, 'Select at least one item').max(500) }),
    req.body,
  );
  const n = await setStatus(req.params.type, [...new Set(ids)], status);
  res.json({ message: `${n} ${label.toLowerCase()}${n === 1 ? '' : 's'} ${status}.`, updated: n });
});

router.get('/users', async (req, res) => {
  const q = qs(req.query.q);
  const role = qs(req.query.role);
  const where = [];
  const params = [];
  if (q) {
    const like = `%${q}%`;
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.college_email LIKE ? OR c.name LIKE ?)');
    params.push(like, like, like, like);
  }
  if (role === 'unverified') where.push("u.role = 'student' AND u.is_verified = FALSE");
  else if (['visitor', 'student', 'admin'].includes(role)) {
    where.push('u.role = ?');
    params.push(role);
  }
  const rows = await query(
    `SELECT u.user_id, u.name, u.email, u.role, u.college_email, u.is_verified, u.college_id, u.created_at,
            c.name AS college_name,
            (SELECT COUNT(*) FROM hostels h WHERE h.submitted_by = u.user_id) AS hostel_count,
            (SELECT COUNT(*) FROM photos p  WHERE p.uploaded_by  = u.user_id) AS photo_count,
            (SELECT COUNT(*) FROM reviews r WHERE r.user_id      = u.user_id) AS review_count
       FROM users u
       LEFT JOIN colleges c ON c.college_id = u.college_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY u.created_at DESC, u.user_id DESC
      LIMIT 500`,
    params,
  );
  res.json({ users: rows.map((r) => ({ ...r, is_verified: Boolean(r.is_verified) })) });
});

router.patch('/users/:id', async (req, res) => {
  const id = parseId(req.params.id, 'user id');
  const data = parseBody(
    z.object({
      role: z.enum(['visitor', 'student', 'admin']).optional(),
      is_verified: z.boolean().optional(),
      college_id: z.union([z.number().int().positive(), z.null()]).optional(),
    }),
    req.body,
  );
  if (id === req.user.user_id && data.role && data.role !== 'admin') {
    throw badRequest("You can't remove your own admin role.");
  }
  const user = await queryOne('SELECT user_id, role, is_verified, college_id, college_email FROM users WHERE user_id = ?', [id]);
  if (!user) throw notFound('User not found.');

  const next = {
    role: data.role ?? user.role,
    is_verified: data.is_verified ?? Boolean(user.is_verified),
    college_id: data.college_id !== undefined ? data.college_id : user.college_id,
  };
  if (data.college_id) await loadCollege(data.college_id);
  if (next.role === 'visitor') next.is_verified = false;
  if (next.role === 'admin') next.is_verified = true;
  if (next.role === 'student' && next.is_verified && !next.college_id) {
    throw badRequest('Assign a college before marking a student as verified.');
  }

  await query('UPDATE users SET role = ?, is_verified = ?, college_id = ? WHERE user_id = ?', [
    next.role,
    next.is_verified,
    next.college_id,
    id,
  ]);
  if (next.is_verified) clearOtp(id);
  res.json({ message: 'User updated.' });
});

router.delete('/users/:id', async (req, res) => {
  const id = parseId(req.params.id, 'user id');
  if (id === req.user.user_id) throw badRequest("You can't delete your own account.");

  const photoUrls = await withTransaction(async (q) => {
    const [user] = await q('SELECT user_id FROM users WHERE user_id = ? FOR UPDATE', [id]);
    if (!user) throw notFound('User not found.');
    const affected = await q('SELECT DISTINCT hostel_id FROM reviews WHERE user_id = ?', [id]);
    const photos = await q('SELECT url FROM photos WHERE uploaded_by = ?', [id]);
    await q('UPDATE hostels SET submitted_by = ? WHERE submitted_by = ?', [req.user.user_id, id]);
    await q('DELETE FROM users WHERE user_id = ?', [id]);
    await recomputeHostelRatings(q, affected.map((r) => r.hostel_id));
    return photos.map((p) => p.url);
  });
  photoUrls.forEach(removeLocalPhoto);
  clearOtp(id);
  res.json({ message: 'User deleted. Their hostels were re-assigned to you.' });
});

export default router;
