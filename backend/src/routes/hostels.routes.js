import { Router } from 'express';
import { config } from '../config.js';
import { query, queryOne, withTransaction } from '../db.js';
import { requireAuth, requireContributor } from '../middleware/auth.js';
import { removeLocalPhoto } from '../middleware/upload.js';
import { assertCanContribute, canViewHostel, initialStatus, isAdmin, isVerifiedStudent, loadCollege, loadHostel } from '../services/permissions.js';
import { AMENITY_KEY_RE, normalizeAmenities } from '../utils/amenities.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { serializeHostelSummary, serializeRoom } from '../utils/serializers.js';
import { optionalInt, optionalText, parseBody, parseId, qs, qsNumber, requiredText, z } from '../utils/validate.js';

const router = Router();

const summarySelect = (extra = '') => `
  SELECT h.hostel_id, h.name, h.type, h.address, h.amenities, h.avg_rating, h.status,
         h.created_at, h.updated_at, h.submitted_by,
         c.college_id, c.name AS college_name, c.city, c.state,
         rs.min_price, rs.max_price, rs.room_count, rs.free_beds, rs.total_capacity,
         rs.ac_room_count, rs.min_ac_price, rs.min_non_ac_price, rs.sharing,
         COALESCE(rv.review_count, 0) AS review_count,
         COALESCE(ph.photo_count, 0)  AS photo_count,${extra ? `\n         ${extra},` : ''}
         (SELECT p.url FROM photos p
           WHERE p.hostel_id = h.hostel_id AND p.status = 'approved'
           ORDER BY (p.room_id IS NULL) DESC, p.photo_id
           LIMIT 1) AS cover_url
  FROM hostels h
  JOIN colleges c ON c.college_id = h.college_id
  LEFT JOIN (
      SELECT hostel_id,
             MIN(price_per_month) AS min_price, MAX(price_per_month) AS max_price,
             COUNT(*) AS room_count, SUM(availability) AS free_beds, SUM(capacity) AS total_capacity,
             SUM(is_ac) AS ac_room_count,
             MIN(CASE WHEN is_ac THEN price_per_month END)     AS min_ac_price,
             MIN(CASE WHEN NOT is_ac THEN price_per_month END) AS min_non_ac_price,
             GROUP_CONCAT(DISTINCT capacity ORDER BY capacity) AS sharing
      FROM rooms GROUP BY hostel_id
  ) rs ON rs.hostel_id = h.hostel_id
  LEFT JOIN (
      SELECT hostel_id, COUNT(*) AS review_count FROM reviews WHERE status = 'approved' GROUP BY hostel_id
  ) rv ON rv.hostel_id = h.hostel_id
  LEFT JOIN (
      SELECT hostel_id, COUNT(*) AS photo_count FROM photos WHERE status = 'approved' GROUP BY hostel_id
  ) ph ON ph.hostel_id = h.hostel_id`;

const SUMMARY_SELECT = summarySelect();

const SORTS = {
  rating: 'h.avg_rating DESC, review_count DESC, h.name ASC',
  price_asc: 'rs.min_price IS NULL, rs.min_price ASC, h.avg_rating DESC',
  price_desc: 'rs.max_price IS NULL, rs.max_price DESC, h.avg_rating DESC',
  reviews: 'review_count DESC, h.avg_rating DESC, h.name ASC',
  newest: 'h.created_at DESC',
  name: 'h.name ASC',
};

const HOSTEL_TYPES = ['boys', 'girls', 'coed'];

const truthy = (v) => v === true || v === 1 || ['1', 'true', 'on', 'yes', 'ac'].includes(String(v).toLowerCase());

const money = (label, max) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .positive(`${label} must be greater than 0`)
    .max(max, `${label} is too large`);

export const roomSchema = z
  .object({
    room_type: requiredText('Room type', 50).transform((s) => s.toLowerCase()),
    capacity: z.coerce
      .number({ invalid_type_error: 'Sharing must be a number' })
      .int('Sharing must be a whole number')
      .min(1, 'At least 1 student per room')
      .max(50, 'Sharing looks too large'),
    is_ac: z.any().optional().transform(truthy),
    floor_no: optionalInt.refine((v) => v === null || (v >= -2 && v <= 100), { message: 'Floor must be between -2 and 100' }),
    price_per_month: money('Price', 999999.99).optional(),
    price_per_year: money('Yearly fee', 9999999).optional(),
    availability: z.coerce
      .number({ invalid_type_error: 'Free beds must be a number' })
      .int('Free beds must be a whole number')
      .min(0, 'Free beds cannot be negative')
      .max(1000, 'Free beds looks too large')
      .default(0),
  })
  .superRefine((r, ctx) => {
    if (r.price_per_month === undefined && r.price_per_year === undefined) {
      ctx.addIssue({ code: 'custom', path: ['price_per_year'], message: 'Enter the fee per year (or per month)' });
    }
  })
  .transform(({ price_per_year, ...r }) => ({
    ...r,
    price_per_month: r.price_per_month ?? Math.round((price_per_year / 12) * 100) / 100,
  }));

const hostelSchema = z.object({
  college_id: optionalInt,
  name: requiredText('Hostel name', 150, 2),
  type: z.enum(HOSTEL_TYPES, { errorMap: () => ({ message: 'Choose boys, girls or co-ed' }) }),
  address: optionalText(1000),
  amenities: z.any().optional(),
  rooms: z.array(roomSchema).max(20, 'At most 20 rooms at once').optional(),
});

function ratingDistribution(rows) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of rows) dist[r.rating] = Number(r.n);
  return dist;
}

function parseAcFilter(v) {
  const s = String(v ?? '').toLowerCase();
  if (['ac', 'true', '1', 'yes'].includes(s)) return 1;
  if (['non_ac', 'nonac', 'non-ac', 'false', '0', 'no'].includes(s)) return 0;
  return null;
}

function parseSharingFilter(v) {
  const sizes = new Set();
  let fivePlus = false;
  for (const raw of String(v ?? '').split(',')) {
    const s = raw.trim();
    if (/^5\+?$|^dorm/.test(s)) fivePlus = true;
    else if (/^[1-4]$/.test(s)) sizes.add(Number(s));
  }
  return { sizes: [...sizes].sort(), fivePlus };
}

router.get('/', async (req, res) => {
  const f = {
    q: qs(req.query.q),
    collegeId: qsNumber(req.query.college_id),
    city: qs(req.query.city),
    state: qs(req.query.state),
    type: qs(req.query.type),
    minPrice: qsNumber(req.query.min_price),
    maxPrice: qsNumber(req.query.max_price),
    minFee: qsNumber(req.query.min_fee),
    maxFee: qsNumber(req.query.max_fee),
    ac: parseAcFilter(req.query.ac),
    sharing: parseSharingFilter(req.query.sharing),
    minRating: qsNumber(req.query.min_rating),
    amenities: (qs(req.query.amenities) || '')
      .split(',')
      .map((s) => s.trim())
      .filter((k) => AMENITY_KEY_RE.test(k)),
    available: qs(req.query.available) === 'true',
    sort: SORTS[qs(req.query.sort)] ? qs(req.query.sort) : 'rating',
    page: Math.max(1, Math.floor(qsNumber(req.query.page) || 1)),
    limit: Math.min(50, Math.max(1, Math.floor(qsNumber(req.query.limit) || 12))),
  };

  const where = ["h.status = 'approved'"];
  const params = [];
  if (f.q) {
    const like = `%${f.q}%`;
    where.push('(h.name LIKE ? OR c.name LIKE ? OR c.city LIKE ? OR h.address LIKE ?)');
    params.push(like, like, like, like);
  }
  if (f.collegeId) {
    where.push('h.college_id = ?');
    params.push(f.collegeId);
  }
  if (f.city) {
    where.push('c.city = ?');
    params.push(f.city);
  }
  if (f.state) {
    where.push('c.state = ?');
    params.push(f.state);
  }
  if (f.type && HOSTEL_TYPES.includes(f.type)) {
    where.push('h.type = ?');
    params.push(f.type);
  }
  if (f.minRating) {
    where.push('h.avg_rating >= ?');
    params.push(f.minRating);
  }
  for (const key of f.amenities) {
    where.push("JSON_CONTAINS(h.amenities, 'true', ?)");
    params.push(`$.${key}`);
  }

  const roomWhere = [];
  const roomParams = [];
  const roomCond = (sql, ...values) => {
    roomWhere.push(sql);
    roomParams.push(...values);
  };
  if (f.minPrice !== undefined) roomCond('r.price_per_month >= ?', f.minPrice);
  if (f.maxPrice !== undefined) roomCond('r.price_per_month <= ?', f.maxPrice);
  if (f.minFee !== undefined) roomCond('ROUND(r.price_per_month * 12) >= ?', f.minFee);
  if (f.maxFee !== undefined) roomCond('ROUND(r.price_per_month * 12) <= ?', f.maxFee);
  if (f.ac !== null) roomCond('r.is_ac = ?', f.ac);
  if (f.sharing.sizes.length || f.sharing.fivePlus) {
    const parts = [];
    if (f.sharing.sizes.length) parts.push(`r.capacity IN (${f.sharing.sizes.map(() => '?').join(', ')})`);
    if (f.sharing.fivePlus) parts.push('r.capacity >= 5');
    roomCond(`(${parts.join(' OR ')})`, ...f.sharing.sizes);
  }
  if (f.available) roomCond('r.availability > 0');

  let extraSelect = '';
  let extraParams = [];
  let order = SORTS[f.sort];
  if (roomWhere.length) {
    const cond = roomWhere.join(' AND ');
    // budget, AC, sharing and free beds must all hold for the SAME room
    where.push(`EXISTS (SELECT 1 FROM rooms r WHERE r.hostel_id = h.hostel_id AND ${cond})`);
    params.push(...roomParams);
    extraSelect = `(SELECT MIN(r.price_per_month) FROM rooms r WHERE r.hostel_id = h.hostel_id AND ${cond}) AS match_min_price`;
    extraParams = roomParams;
    if (f.sort === 'price_asc') order = 'match_min_price ASC, h.avg_rating DESC';
    if (f.sort === 'price_desc') order = 'match_min_price DESC, h.avg_rating DESC';
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const { total } = await queryOne(
    `SELECT COUNT(*) AS total FROM hostels h JOIN colleges c ON c.college_id = h.college_id ${whereSql}`,
    params,
  );
  const rows = await query(`${summarySelect(extraSelect)} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`, [
    ...extraParams,
    ...params,
    f.limit,
    (f.page - 1) * f.limit,
  ]);

  res.json({
    hostels: rows.map(serializeHostelSummary),
    total: Number(total),
    page: f.page,
    limit: f.limit,
    pages: Math.max(1, Math.ceil(Number(total) / f.limit)),
  });
});

router.get('/compare', async (req, res) => {
  const ids = [
    ...new Set(
      (qs(req.query.ids) || '')
        .split(',')
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ].slice(0, 4);
  if (!ids.length) return res.json({ hostels: [] });

  const [rows, rooms, dist] = await Promise.all([
    query(`${SUMMARY_SELECT} WHERE h.hostel_id IN (?) AND h.status = 'approved'`, [ids]),
    query(
      `SELECT room_id, hostel_id, room_type, capacity, is_ac, floor_no, price_per_month, availability
         FROM rooms WHERE hostel_id IN (?) ORDER BY price_per_month, room_id`,
      [ids],
    ),
    query(
      `SELECT hostel_id, rating, COUNT(*) AS n FROM reviews
        WHERE hostel_id IN (?) AND status = 'approved' GROUP BY hostel_id, rating`,
      [ids],
    ),
  ]);

  const byId = new Map(rows.map((r) => [r.hostel_id, serializeHostelSummary(r)]));
  const hostels = ids
    .filter((id) => byId.has(id))
    .map((id) => ({
      ...byId.get(id),
      rooms: rooms.filter((r) => r.hostel_id === id).map(serializeRoom),
      rating_distribution: ratingDistribution(dist.filter((d) => d.hostel_id === id)),
    }));
  res.json({ hostels });
});

router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id, 'hostel id');
  const row = await queryOne(`${SUMMARY_SELECT} WHERE h.hostel_id = ?`, [id]);
  if (!row || !canViewHostel(req.user, row)) throw notFound('Hostel not found.');

  const user = req.user;
  const [submitter, rooms, photos, reviews, dist, mine] = await Promise.all([
    queryOne(
      `SELECT u.user_id, u.name, u.role, u.is_verified, c.name AS college_name
         FROM users u LEFT JOIN colleges c ON c.college_id = u.college_id WHERE u.user_id = ?`,
      [row.submitted_by],
    ),
    query(
      `SELECT r.room_id, r.room_type, r.capacity, r.is_ac, r.floor_no, r.price_per_month, r.availability, r.created_at,
              COUNT(p.photo_id) AS photo_count
         FROM rooms r
         LEFT JOIN photos p ON p.room_id = r.room_id AND p.status = 'approved'
        WHERE r.hostel_id = ?
        GROUP BY r.room_id
        ORDER BY r.price_per_month, r.room_id`,
      [id],
    ),
    query(
      `SELECT p.photo_id, p.room_id, p.url, p.caption, p.created_at, p.uploaded_by,
              u.name AS uploader_name, r.room_type, r.floor_no
         FROM photos p
         JOIN users u ON u.user_id = p.uploaded_by
         LEFT JOIN rooms r ON r.room_id = p.room_id
        WHERE p.hostel_id = ? AND p.status = 'approved'
        ORDER BY (p.room_id IS NULL) DESC, p.photo_id`,
      [id],
    ),
    query(
      `SELECT rv.review_id, rv.room_id, rv.rating, rv.title, rv.comment, rv.created_at, rv.user_id,
              u.name AS author_name, u.is_verified AS author_verified, c.name AS author_college,
              r.room_type, r.capacity AS room_capacity, r.is_ac AS room_is_ac
         FROM reviews rv
         JOIN users u ON u.user_id = rv.user_id
         LEFT JOIN colleges c ON c.college_id = u.college_id
         LEFT JOIN rooms r ON r.room_id = rv.room_id
        WHERE rv.hostel_id = ? AND rv.status = 'approved'
        ORDER BY rv.created_at DESC`,
      [id],
    ),
    query(`SELECT rating, COUNT(*) AS n FROM reviews WHERE hostel_id = ? AND status = 'approved' GROUP BY rating`, [id]),
    user
      ? Promise.all([
          query("SELECT COUNT(*) AS n FROM photos WHERE hostel_id = ? AND uploaded_by = ? AND status = 'pending'", [id, user.user_id]),
          query('SELECT review_id, room_id, status FROM reviews WHERE hostel_id = ? AND user_id = ?', [id, user.user_id]),
        ])
      : null,
  ]);

  let contributeReason = null;
  let canContribute = false;
  if (user) {
    try {
      assertCanContribute(user, row);
      canContribute = true;
    } catch (err) {
      contributeReason = err.message;
    }
  } else {
    contributeReason = 'Log in as a verified student to contribute.';
  }
  const isOwner = !!user && row.submitted_by === user.user_id;
  const admin = isAdmin(user);

  res.json({
    hostel: {
      ...serializeHostelSummary(row),
      submitter: submitter && { ...submitter, is_verified: Boolean(submitter.is_verified) },
      rating_distribution: ratingDistribution(dist),
      rooms: rooms.map((r) => ({ ...serializeRoom(r), photo_count: Number(r.photo_count) })),
      photos,
      reviews: reviews.map((r) => ({
        ...r,
        author_verified: Boolean(r.author_verified),
        room_is_ac: r.room_is_ac === null ? null : Boolean(r.room_is_ac),
      })),
    },
    permissions: {
      can_contribute: canContribute,
      can_review: canContribute && isVerifiedStudent(user),
      can_edit: admin || (isOwner && row.status !== 'approved'),
      can_delete: admin || (isOwner && row.status !== 'approved'),
      can_manage_rooms: admin || (isOwner && isVerifiedStudent(user)),
      can_moderate: admin,
      is_owner: isOwner,
      reason: contributeReason,
    },
    mine: mine
      ? {
          pending_photos: Number(mine[0][0].n),
          reviews: mine[1],
        }
      : null,
  });
});

router.post('/', requireContributor, async (req, res) => {
  const data = parseBody(hostelSchema, req.body);
  const user = req.user;

  let collegeId = data.college_id ?? user.college_id;
  if (!isAdmin(user) && config.rules.restrictToOwnCollege) {
    if (data.college_id && data.college_id !== user.college_id) {
      throw forbidden('You can only add hostels for your own college.');
    }
    collegeId = user.college_id;
  }
  if (!collegeId) throw badRequest('college_id: Select a college.');
  await loadCollege(collegeId);

  const dup = await queryOne("SELECT hostel_id, status FROM hostels WHERE college_id = ? AND name = ? AND status <> 'rejected'", [
    collegeId,
    data.name,
  ]);
  if (dup) {
    throw conflict(
      `"${data.name}" is already listed for this college${dup.status === 'pending' ? ' and is awaiting moderation' : ''}.`,
      { hostel_id: dup.hostel_id },
    );
  }

  const status = initialStatus(user);
  const amenities = normalizeAmenities(data.amenities);

  const hostelId = await withTransaction(async (q) => {
    const result = await q(
      `INSERT INTO hostels (college_id, name, type, address, amenities, submitted_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [collegeId, data.name, data.type, data.address, JSON.stringify(amenities), user.user_id, status],
    );
    for (const room of data.rooms ?? []) {
      await q(
        `INSERT INTO rooms (hostel_id, room_type, capacity, is_ac, floor_no, price_per_month, availability)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, room.room_type, room.capacity, room.is_ac, room.floor_no, room.price_per_month, room.availability],
      );
    }
    return result.insertId;
  });

  res.status(201).json({
    hostel_id: hostelId,
    status,
    message: status === 'approved' ? 'Hostel published.' : 'Thanks! Your hostel was submitted and is waiting for moderation.',
  });
});

router.put('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id, 'hostel id');
  const hostel = await loadHostel(id);

  const admin = isAdmin(req.user);
  if (!admin) {
    if (hostel.submitted_by !== req.user.user_id) throw forbidden('Only the student who submitted this hostel (or an admin) can edit it.');
    if (!isVerifiedStudent(req.user)) throw forbidden('Only verified students can edit submissions.');
    if (hostel.status === 'approved') throw forbidden('Approved hostels can only be edited by an admin.');
  }

  const data = parseBody(hostelSchema.omit({ rooms: true }), req.body);
  let collegeId = hostel.college_id;
  if (admin && data.college_id && data.college_id !== hostel.college_id) {
    collegeId = (await loadCollege(data.college_id)).college_id;
  }

  const dup = await queryOne(
    "SELECT hostel_id FROM hostels WHERE college_id = ? AND name = ? AND status <> 'rejected' AND hostel_id <> ?",
    [collegeId, data.name, id],
  );
  if (dup) throw conflict(`Another hostel called "${data.name}" already exists for this college.`);

  const newStatus = admin ? hostel.status : 'pending';
  await query(
    `UPDATE hostels
        SET college_id = ?, name = ?, type = ?, address = ?, amenities = ?, status = ?, updated_at = NOW()
      WHERE hostel_id = ?`,
    [collegeId, data.name, data.type, data.address, JSON.stringify(normalizeAmenities(data.amenities)), newStatus, id],
  );

  res.json({
    status: newStatus,
    message: admin ? 'Hostel updated.' : 'Changes saved — the hostel was re-submitted for moderation.',
  });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id, 'hostel id');
  const hostel = await loadHostel(id);
  const admin = isAdmin(req.user);
  if (!admin && !(hostel.submitted_by === req.user.user_id && hostel.status !== 'approved')) {
    throw forbidden('Only admins can delete approved hostels.');
  }
  const photos = await query('SELECT url FROM photos WHERE hostel_id = ?', [id]);
  await query('DELETE FROM hostels WHERE hostel_id = ?', [id]);
  photos.forEach((p) => removeLocalPhoto(p.url));
  res.json({ message: 'Hostel deleted.' });
});

export default router;
