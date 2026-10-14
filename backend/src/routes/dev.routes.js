import { Router } from 'express';
import { clearMail, listMail } from '../services/mailer.js';
import { qs } from '../utils/validate.js';

const router = Router();

router.get('/mailbox', (req, res) => {
  res.json({ messages: listMail({ to: qs(req.query.to), limit: qs(req.query.limit) }) });
});

router.delete('/mailbox', (req, res) => {
  clearMail();
  res.json({ message: 'Mailbox cleared.' });
});

export default router;
