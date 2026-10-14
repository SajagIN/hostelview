import { Router } from 'express';
import { query, queryOne, withTransaction } from '../db.js';
import { requireAuth, requireVerifiedStudent } from '../middleware/auth.js';
import { assertCanContribute, isAdmin, loadHostel } from '../services/permissions.js';
import { recomputeHostelRatings } from '../services/ratings.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js';
import { optionalInt, optionalText, parseBody, parseId, z } from '../utils/validate.js';

const router = Router();

const reviewSchema = z.object({
  rating: z.coerce
    .number({ invalid_type_error: 'Pick a rating from 1 to 5' })
    .int('Pick a rating from 1 to 5')
    .min(1, 'Pick a rating from 1 to 5')
    .max(5, 'Pick a rating from 1 to 5'),
  title: optionalText(150),
  comment: z
    .string({ required_error: 'Write a short review' })
    .trim()
    .min(10, 'Tell future students a bit more (at least 10 characters)')
    .max(3000, 'Reviews can be at most 3000 characters'),
  room_id: optionalInt,
});

router.post('/hostels/:id/reviews', requireVerifiedStudent, async (req, res) => {
  const hostelId = parseId(req.params.id, 'hostel id');
  assertCanContribute(req.user, await loadHostel(hostelId));

  const data = parseBody(reviewSchema, req.body);
  if (data.room_id) {
    const room = await queryOne('SELECT room_id FROM rooms WHERE room_id = ? AND hostel_id = ?', [data.room_id, hostelId]);
    if (!room) throw badRequest('That room does not belong to this hostel.');
  }

  const existing = await queryOne(
    "SELECT review_id, status FROM reviews WHERE hostel_id = ? AND user_id = ? AND room_id <=> ? AND status <> 'rejected'",
    [hostelId, req.user.user_id, data.room_id],
  );
  if (existing) {
    throw conflict(
      data.room_id ? 'You have already reviewed this room.' : 'You have already written a hostel-level review for this hostel.',
    );
  }

  const result = await query(
    `INSERT INTO reviews (hostel_id, room_id, user_id, rating, title, comment, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [hostelId, data.room_id, req.user.user_id, data.rating, data.title, data.comment],
  );
  res.status(201).json({
    review_id: result.insertId,
    status: 'pending',
    message: 'Thanks! Your review will be published after moderation.',
  });
});

router.delete('/reviews/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id, 'review id');
  const review = await queryOne('SELECT review_id, hostel_id, user_id FROM reviews WHERE review_id = ?', [id]);
  if (!review) throw notFound('Review not found.');
  if (!isAdmin(req.user) && review.user_id !== req.user.user_id) throw forbidden('You can only delete your own reviews.');

  await withTransaction(async (q) => {
    await q('DELETE FROM reviews WHERE review_id = ?', [id]);
    await recomputeHostelRatings(q, review.hostel_id);
  });
  res.json({ message: 'Review deleted.' });
});

export default router;
