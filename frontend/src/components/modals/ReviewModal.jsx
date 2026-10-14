import { useEffect, useState } from 'react';
import { api, fieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { floorLabel, roomTypeLabel } from '../../lib/format.js';
import Modal from '../Modal.jsx';
import { StarInput } from '../Stars.jsx';
import { Field } from '../ui.jsx';

export default function ReviewModal({ open, onClose, hostel, myReviews = [], onSubmitted }) {
  const toast = useToast();
  const [form, setForm] = useState({ rating: 0, title: '', comment: '', room_id: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const taken = new Set(myReviews.filter((r) => r.status !== 'rejected').map((r) => (r.room_id ? String(r.room_id) : '')));

  useEffect(() => {
    if (!open) return;
    setErrors({});
    const firstFree = ['', ...(hostel.rooms ?? []).map((r) => String(r.room_id))].find((id) => !taken.has(id)) ?? '';
    setForm({ rating: 0, title: '', comment: '', room_id: firstFree });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating) {
      setErrors({ rating: 'Pick a rating from 1 to 5' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      const data = await api.post(`/hostels/${hostel.hostel_id}/reviews`, form);
      toast.success(data.message);
      onSubmitted?.();
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`Review ${hostel.name}`}
      description="Be honest and specific — what would you tell a junior before they move in?"
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="review-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit for moderation'}
          </button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit} className="space-y-4">
        <Field label="Your rating" required error={errors.rating}>
          <StarInput value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
        </Field>
        <Field label="What are you reviewing?" error={errors.room_id}>
          <select className="input" value={form.room_id} onChange={(e) => setForm((f) => ({ ...f, room_id: e.target.value }))}>
            <option value="" disabled={taken.has('')}>
              The hostel overall{taken.has('') ? ' — already reviewed' : ''}
            </option>
            {hostel.rooms?.map((r) => (
              <option key={r.room_id} value={r.room_id} disabled={taken.has(String(r.room_id))}>
                {roomTypeLabel(r.room_type)} · {r.is_ac ? 'AC' : 'non-AC'}{r.floor_no !== null ? ` · ${floorLabel(r.floor_no)}` : ''}
                {taken.has(String(r.room_id)) ? ' — already reviewed' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title" error={errors.title}>
          <input
            className="input"
            maxLength={150}
            placeholder="e.g. Great mess food, strict curfew"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>
        <Field label="Your review" required error={errors.comment} hint={`${form.comment.trim().length}/3000 · at least 10 characters`}>
          <textarea
            className="input min-h-32"
            maxLength={3000}
            placeholder="Cleanliness, Wi-Fi, food, water, warden, safety, noise, rules…"
            value={form.comment}
            onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
            required
          />
        </Field>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Reviews are published after a moderator approves them. The hostel&apos;s average rating only counts approved reviews.
        </p>
      </form>
    </Modal>
  );
}
