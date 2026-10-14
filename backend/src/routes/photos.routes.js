import { Router } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, requireContributor } from '../middleware/auth.js';
import { photoUpload, publicUrlFor, removeLocalPhoto } from '../middleware/upload.js';
import { assertCanContribute, initialStatus, isAdmin, loadHostel } from '../services/permissions.js';
import { badRequest, forbidden, notFound } from '../utils/errors.js';
import { optionalInt, optionalText, parseBody, parseId, z } from '../utils/validate.js';

const router = Router();

// checked before multer writes the file to disk
async function loadHostelForUpload(req, res, next) {
  req.hostel = await loadHostel(parseId(req.params.id, 'hostel id'));
  assertCanContribute(req.user, req.hostel);
  next();
}

router.post('/hostels/:id/photos', requireContributor, loadHostelForUpload, photoUpload.single('photo'), async (req, res) => {
  if (!req.file) throw badRequest('Choose a photo to upload (field name "photo").');
  const url = publicUrlFor(req.file.filename);
  try {
    const body = parseBody(z.object({ caption: optionalText(200), room_id: optionalInt }), req.body);
    if (body.room_id) {
      const room = await queryOne('SELECT room_id FROM rooms WHERE room_id = ? AND hostel_id = ?', [body.room_id, req.hostel.hostel_id]);
      if (!room) throw badRequest('That room does not belong to this hostel.');
    }
    const status = initialStatus(req.user);
    const result = await query(
      'INSERT INTO photos (hostel_id, room_id, url, caption, uploaded_by, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.hostel.hostel_id, body.room_id, url, body.caption, req.user.user_id, status],
    );
    res.status(201).json({
      photo: { photo_id: result.insertId, hostel_id: req.hostel.hostel_id, room_id: body.room_id, url, caption: body.caption, status },
      message: status === 'approved' ? 'Photo published.' : 'Photo uploaded — it will appear once a moderator approves it.',
    });
  } catch (err) {
    removeLocalPhoto(url);
    throw err;
  }
});

router.delete('/photos/:id', requireAuth, async (req, res) => {
  const id = parseId(req.params.id, 'photo id');
  const photo = await queryOne('SELECT photo_id, url, uploaded_by FROM photos WHERE photo_id = ?', [id]);
  if (!photo) throw notFound('Photo not found.');
  if (!isAdmin(req.user) && photo.uploaded_by !== req.user.user_id) throw forbidden('You can only delete your own photos.');
  await query('DELETE FROM photos WHERE photo_id = ?', [id]);
  removeLocalPhoto(photo.url);
  res.json({ message: 'Photo deleted.' });
});

export default router;
