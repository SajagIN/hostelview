import { useEffect, useState } from 'react';
import { Fan, Snowflake } from 'lucide-react';
import { api, fieldErrors } from '../../api/client.js';
import { useMeta } from '../../context/MetaContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { capitalize, formatPrice } from '../../lib/format.js';
import Modal from '../Modal.jsx';
import { Field } from '../ui.jsx';

const EMPTY = { room_type: 'double', capacity: 2, is_ac: false, floor_no: '', price: '', price_unit: 'year', availability: 0 };
export const DEFAULT_CAPACITY = { single: 1, double: 2, triple: 3, 'four-sharing': 4, 'six-sharing': 6, dormitory: 8 };
export const FALLBACK_ROOM_TYPES = ['single', 'double', 'triple', 'four-sharing', 'six-sharing', 'dormitory'];

export function AcToggle({ value, onChange, size = 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Air-conditioning">
      {[
        [false, 'Non-AC', Fan],
        [true, 'AC', Snowflake],
      ].map(([v, label, Icon]) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition ${pad} ${
            value === v ? (v ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function RoomFormModal({ open, onClose, hostelId, room, onSaved }) {
  const { meta } = useMeta();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      room
        ? {
            room_type: room.room_type,
            capacity: room.capacity,
            is_ac: Boolean(room.is_ac),
            floor_no: room.floor_no ?? '',
            price: Math.round(Number(room.price_per_month) * 12),
            price_unit: 'year',
            availability: room.availability,
          }
        : EMPTY,
    );
  }, [open, room]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const types = meta?.room_types ?? FALLBACK_ROOM_TYPES;
  const isCustom = !types.includes(form.room_type);

  const priceNum = Number(form.price);
  const priceHint =
    form.price !== '' && priceNum > 0
      ? form.price_unit === 'year'
        ? `≈ ${formatPrice(priceNum / 12)} per month`
        : `≈ ${formatPrice(priceNum * 12)} per year`
      : 'Per student — room + mess if bundled, excluding refundable deposits';

  const switchUnit = (unit) =>
    setForm((f) => {
      if (unit === f.price_unit) return f;
      const n = Number(f.price);
      const converted = f.price === '' || !(n > 0) ? f.price : unit === 'year' ? Math.round(n * 12) : Math.round((n / 12) * 100) / 100;
      return { ...f, price_unit: unit, price: converted };
    });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    const { price, price_unit, ...rest } = form;
    const body = { ...rest, [price_unit === 'year' ? 'price_per_year' : 'price_per_month']: price };
    try {
      if (room) await api.put(`/rooms/${room.room_id}`, body);
      else await api.post(`/hostels/${hostelId}/rooms`, body);
      toast.success(room ? 'Room updated.' : 'Room added.');
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
      title={room ? 'Edit room' : 'Add a room'}
      description="Room type, sharing, AC / non-AC, yearly fee per student and current vacancies."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="room-form" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : room ? 'Save changes' : 'Add room'}
          </button>
        </>
      }
    >
      <form id="room-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Room type" required error={errors.room_type} className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, room_type: t, capacity: room ? f.capacity : DEFAULT_CAPACITY[t] ?? f.capacity }))}
                className={`chip ${form.room_type === t ? 'chip-on' : 'chip-off'}`}
              >
                {capitalize(t)}
              </button>
            ))}
            <button type="button" onClick={() => setForm((f) => ({ ...f, room_type: '' }))} className={`chip ${isCustom ? 'chip-on' : 'chip-off'}`}>
              Other…
            </button>
          </div>
          {isCustom && (
            <input
              className="input mt-2"
              placeholder="e.g. double (attached bath), apartment-style 4-bed"
              value={form.room_type}
              onChange={set('room_type')}
              maxLength={50}
              autoFocus
            />
          )}
        </Field>
        <Field label="Air-conditioning" error={errors.is_ac}>
          <AcToggle value={form.is_ac} onChange={(v) => setForm((f) => ({ ...f, is_ac: v }))} />
        </Field>
        <Field label="Students per room" required hint="1 = single, 2 = 2-sharing …" error={errors.capacity}>
          <input type="number" min="1" max="50" className="input" value={form.capacity} onChange={set('capacity')} required />
        </Field>
        <Field label="Fee per student (₹)" required hint={priceHint} error={errors.price_per_year || errors.price_per_month} className="sm:col-span-2">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="any"
              className="input"
              value={form.price}
              onChange={set('price')}
              required
              placeholder={form.price_unit === 'year' ? '120700' : '10000'}
              aria-label="Fee"
            />
            <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Fee period">
              {[
                ['year', 'per year'],
                ['month', 'per month'],
              ].map(([unit, label]) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => switchUnit(unit)}
                  aria-pressed={form.price_unit === unit}
                  className={`rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition ${
                    form.price_unit === unit ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </Field>
        <Field label="Floor" hint="0 = ground floor" error={errors.floor_no}>
          <input type="number" min="-2" max="100" className="input" value={form.floor_no} onChange={set('floor_no')} placeholder="Optional" />
        </Field>
        <Field label="Free beds right now" error={errors.availability}>
          <input type="number" min="0" className="input" value={form.availability} onChange={set('availability')} />
        </Field>
      </form>
    </Modal>
  );
}
