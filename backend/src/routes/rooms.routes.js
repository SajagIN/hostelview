import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireContributor } from '../middleware/auth.js';
import { assertCanContribute, isAdmin, isVerifiedStudent, loadHostel } from '../services/permissions.js';
import { forbidden, notFound } from '../utils/errors.js';
import { parseBody, parseId } from '../utils/validate.js';
import { roomSchema } from './hostels.routes.js';

const router = Router();

function assertCanManageRooms(user, hostel) {
  if (isAdmin(user)) return;
  if (hostel.submitted_by === user.user_id && isVerifiedStudent(user)) return;
  throw forbidden('Only the student who listed this hostel (or an admin) can change its rooms.');
}

router.post('/hostels/:id/rooms', requireContributor, async (req, res) => {
  const hostel = await loadHostel(parseId(req.params.id, 'hostel id'));
  assertCanContribute(req.user, hostel);
  const room = parseBody(roomSchema, req.body);
  const result = await query(
    `INSERT INTO rooms (hostel_id, room_type, capacity, is_ac, floor_no, price_per_month, availability)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [hostel.hostel_id, room.room_type, room.capacity, room.is_ac, room.floor_no, room.price_per_month, room.availability],
  );
  res.status(201).json({ message: 'Room added.', room_id: result.insertId });
});

router.put('/rooms/:id', requireAuth, async (req, res) => {
  const roomId = parseId(req.params.id, 'room id');
  const existing = await queryOne('SELECT room_id, hostel_id FROM rooms WHERE room_id = ?', [roomId]);
  if (!existing) throw notFound('Room not found.');
  assertCanManageRooms(req.user, await loadHostel(existing.hostel_id));
  const room = parseBody(roomSchema, req.body);
  await query(
    `UPDATE rooms SET room_type = ?, capacity = ?, is_ac = ?, floor_no = ?, price_per_month = ?, availability = ?
      WHERE room_id = ?`,
    [room.room_type, room.capacity, room.is_ac, room.floor_no, room.price_per_month, room.availability, roomId],
  );
  res.json({ message: 'Room updated.' });
});

router.delete('/rooms/:id', requireAuth, async (req, res) => {
  const roomId = parseId(req.params.id, 'room id');
  const existing = await queryOne('SELECT room_id, hostel_id FROM rooms WHERE room_id = ?', [roomId]);
  if (!existing) throw notFound('Room not found.');
  assertCanManageRooms(req.user, await loadHostel(existing.hostel_id));
  await query('DELETE FROM rooms WHERE room_id = ?', [roomId]);
  res.json({ message: 'Room deleted.' });
});

export default router;
