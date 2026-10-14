import { useEffect, useState } from 'react';
import { api, fieldErrors } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../Modal.jsx';
import { Field } from '../ui.jsx';

const EMPTY = { name: '', city: '', state: '', website: '' };

export default function CollegeFormModal({ open, onClose, college, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(college ? { name: college.name, city: college.city, state: college.state, website: college.website ?? '' } : EMPTY);
  }, [open, college]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (college) await api.put(`/colleges/${college.college_id}`, form);
      else await api.post('/colleges', form);
      toast.success(college ? 'College updated.' : 'College added.');
      onSaved?.();
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
      title={college ? 'Edit college' : 'Add a college'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="college-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <form id="college-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="College name" required error={errors.name} className="sm:col-span-2">
          <input className="input" value={form.name} onChange={set('name')} maxLength={150} required autoFocus />
        </Field>
        <Field label="City" required error={errors.city}>
          <input className="input" value={form.city} onChange={set('city')} maxLength={60} required />
        </Field>
        <Field label="State" required error={errors.state}>
          <input className="input" value={form.state} onChange={set('state')} maxLength={60} required />
        </Field>
        <Field label="Website" error={errors.website} className="sm:col-span-2">
          <input className="input" value={form.website} onChange={set('website')} maxLength={150} placeholder="https://college.edu" />
        </Field>
      </form>
    </Modal>
  );
}
