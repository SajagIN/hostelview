import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Lock, Plus, Trash2, X } from 'lucide-react';
import { api, fieldErrors, notifyModerationChanged } from '../api/client.js';
import { EmptyState, ErrorState, Field, PageLoader } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { amenityIcon, amenityKeys, toAmenityKey } from '../lib/amenities.js';
import { capitalize } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/useApi.js';
import { AcToggle, DEFAULT_CAPACITY, FALLBACK_ROOM_TYPES } from '../components/modals/RoomFormModal.jsx';

const NEW_ROOM = { room_type: 'double', capacity: 2, is_ac: false, floor_no: '', price_per_year: '', availability: 0 };

const TYPES = [
  { key: 'boys', label: 'Boys', text: 'Male students only', ring: 'peer-checked:ring-sky-500 peer-checked:bg-sky-50' },
  { key: 'girls', label: 'Girls', text: 'Female students only', ring: 'peer-checked:ring-pink-500 peer-checked:bg-pink-50' },
  { key: 'coed', label: 'Co-ed', text: 'Open to everyone', ring: 'peer-checked:ring-violet-500 peer-checked:bg-violet-50' },
];

export default function HostelForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  useDocumentTitle(editing ? 'Edit hostel' : 'Add a hostel');
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { meta, labelFor } = useMeta();
  const toast = useToast();

  const colleges = useApi(() => api.get('/colleges'), []);
  const existing = useApi(() => api.get(`/hostels/${id}`), [id], { enabled: editing });

  const [form, setForm] = useState({ college_id: '', name: '', type: '', address: '', amenities: [], rooms: [{ ...NEW_ROOM }] });
  const [customAmenity, setCustomAmenity] = useState('');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing && existing.data) {
      const h = existing.data.hostel;
      setForm({
        college_id: String(h.college.college_id),
        name: h.name,
        type: h.type,
        address: h.address ?? '',
        amenities: amenityKeys(h.amenities),
        rooms: [],
      });
    }
  }, [editing, existing.data]);

  useEffect(() => {
    if (!editing && user && !isAdmin && user.college_id) setForm((f) => ({ ...f, college_id: String(user.college_id) }));
  }, [editing, user, isAdmin]);

  const catalogKeys = useMemo(() => new Set((meta?.amenities ?? []).map((a) => a.key)), [meta]);
  const customKeys = form.amenities.filter((k) => !catalogKeys.has(k));

  if (editing && existing.loading && !existing.data) return <PageLoader />;
  if (editing && existing.error) {
    return (
      <div className="container-page py-16">
        <ErrorState error={existing.error} onRetry={existing.reload} />
      </div>
    );
  }
  if (editing && existing.data && !existing.data.permissions.can_edit) {
    return (
      <div className="container-page py-16">
        <EmptyState icon={Lock} title="You can't edit this hostel" action={<Link to={`/hostels/${id}`} className="btn btn-primary">Back to hostel</Link>}>
          Approved hostels can only be changed by an admin. Submitters can edit while a listing is pending or rejected.
        </EmptyState>
      </div>
    );
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleAmenity = (key) =>
    setForm((f) => ({ ...f, amenities: f.amenities.includes(key) ? f.amenities.filter((k) => k !== key) : [...f.amenities, key] }));
  const addCustom = () => {
    const key = toAmenityKey(customAmenity);
    if (key.length < 2) return;
    setForm((f) => ({ ...f, amenities: f.amenities.includes(key) ? f.amenities : [...f.amenities, key] }));
    setCustomAmenity('');
  };
  const setRoom = (i, k, v) =>
    setForm((f) => ({
      ...f,
      rooms: f.rooms.map((r, n) =>
        n === i ? { ...r, [k]: v, ...(k === 'room_type' && DEFAULT_CAPACITY[v] ? { capacity: DEFAULT_CAPACITY[v] } : {}) } : r,
      ),
    }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    if (!form.type) {
      setErrors({ type: 'Choose boys, girls or co-ed' });
      return;
    }
    setSaving(true);
    const sentRooms = form.rooms.map((r, i) => ({ r, i })).filter(({ r }) => String(r.price_per_year).trim() !== '');
    const payload = {
      college_id: form.college_id ? Number(form.college_id) : null,
      name: form.name,
      type: form.type,
      address: form.address,
      amenities: form.amenities,
      ...(editing ? {} : { rooms: sentRooms.map(({ r }) => r) }),
    };
    try {
      const data = editing ? await api.put(`/hostels/${id}`, payload) : await api.post('/hostels', payload);
      toast.success(data.message);
      notifyModerationChanged();
      navigate(`/hostels/${editing ? id : data.hostel_id}`);
    } catch (err) {
      const fe = fieldErrors(err);
      const mapped = {};
      for (const [k, v] of Object.entries(fe)) {
        const m = k.match(/^rooms\.(\d+)\.(.+)$/);
        mapped[m ? `rooms.${sentRooms[Number(m[1])]?.i ?? m[1]}.${m[2]}` : k] = v;
      }
      setErrors(mapped);
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const myCollege = colleges.data?.colleges.find((c) => String(c.college_id) === form.college_id);

  return (
    <div className="container-page max-w-4xl py-8">
      <Link to={editing ? `/hostels/${id}` : '/hostels'} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{editing ? 'Edit hostel' : 'Add a hostel'}</h1>
      <p className="mt-1 text-slate-500">
        {editing
          ? 'Rooms, photos and reviews are managed from the hostel page.'
          : 'Share the basics now — you can add photos and reviews right after submitting.'}
      </p>

      {!isAdmin && (
        <div className="mt-5 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 ring-1 ring-sky-200">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
          <p>
            Your submission is saved as <b>pending</b> and becomes public after a moderator approves it.
            {editing && ' Saving changes sends the listing back to the moderation queue.'}
          </p>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="card space-y-5 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Basic details</h2>

          <Field label="College" required error={errors.college_id}>
            {isAdmin ? (
              <select className="input" value={form.college_id} onChange={set('college_id')} required>
                <option value="">Select a college…</option>
                {colleges.data?.colleges.map((c) => (
                  <option key={c.college_id} value={c.college_id}>
                    {c.name} — {c.city}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200">
                <Lock className="h-4 w-4 text-slate-400" />
                {myCollege ? `${myCollege.name} — ${myCollege.city}` : user?.college_name ?? 'Your college'}
                <span className="ml-auto text-xs text-slate-400">verified college</span>
              </div>
            )}
          </Field>

          <Field label="Hostel name" required error={errors.name}>
            <input className="input" value={form.name} onChange={set('name')} maxLength={150} required placeholder="e.g. MH Block Q, Adhiyaman Boys Hostel" />
          </Field>

          <Field label="Hostel type" required error={errors.type}>
            <div className="grid gap-3 sm:grid-cols-3">
              {TYPES.map((t) => (
                <label key={t.key} className="cursor-pointer">
                  <input type="radio" name="type" value={t.key} checked={form.type === t.key} onChange={set('type')} className="peer sr-only" />
                  <div className={`rounded-xl bg-white p-4 ring-1 ring-slate-300 transition peer-checked:ring-2 hover:bg-slate-50 ${t.ring}`}>
                    <p className="font-semibold text-slate-900">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.text}</p>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Address" error={errors.address} hint="Campus block, street, area, PIN code">
            <textarea className="input min-h-20" value={form.address} onChange={set('address')} maxLength={1000} placeholder="RIT Campus, Chennai 600119" />
          </Field>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
          <p className="text-sm text-slate-500">Select everything the hostel offers.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {meta?.amenities?.map((a) => {
              const Icon = amenityIcon(a.key);
              const on = form.amenities.includes(a.key);
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => toggleAmenity(a.key)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium ring-1 transition ring-inset ${
                    on ? 'bg-brand-50 text-brand-800 ring-brand-400' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-brand-700' : 'text-slate-400'}`} />
                  <span className="truncate">{a.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <p className="label">Something else?</p>
            <div className="flex gap-2">
              <input
                className="input"
                value={customAmenity}
                onChange={(e) => setCustomAmenity(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                placeholder="e.g. Swimming pool"
                maxLength={30}
              />
              <button type="button" className="btn btn-secondary" onClick={addCustom}>
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {customKeys.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {customKeys.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-1.5 pl-3 text-xs font-medium text-brand-800 ring-1 ring-brand-200">
                    {labelFor(k)}
                    <button type="button" onClick={() => toggleAmenity(k)} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${k}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {!editing && (
          <section className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Rooms &amp; prices</h2>
                <p className="text-sm text-slate-500">
                  Yearly fee per student (room + mess, without refundable deposits). Rows without a fee are skipped — you can add rooms later too.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setForm((f) => ({ ...f, rooms: [...f.rooms, { ...NEW_ROOM }] }))}
                disabled={form.rooms.length >= 20}
              >
                <Plus className="h-4 w-4" /> Add room type
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {form.rooms.map((room, i) => (
                <div key={i} className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1.3fr_0.8fr_1.3fr_0.7fr_1.3fr_0.8fr_auto] sm:items-end">
                  <Field label="Type" error={errors[`rooms.${i}.room_type`]}>
                    <select className="input" value={room.room_type} onChange={(e) => setRoom(i, 'room_type', e.target.value)}>
                      {(meta?.room_types ?? FALLBACK_ROOM_TYPES).map((t) => (
                        <option key={t} value={t}>
                          {capitalize(t)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Sharing" error={errors[`rooms.${i}.capacity`]}>
                    <input type="number" min="1" className="input" value={room.capacity} onChange={(e) => setRoom(i, 'capacity', e.target.value)} title="Students per room" />
                  </Field>
                  <Field label="AC?" error={errors[`rooms.${i}.is_ac`]}>
                    <AcToggle size="sm" value={room.is_ac} onChange={(v) => setRoom(i, 'is_ac', v)} />
                  </Field>
                  <Field label="Floor" error={errors[`rooms.${i}.floor_no`]}>
                    <input type="number" min="-2" className="input" value={room.floor_no} onChange={(e) => setRoom(i, 'floor_no', e.target.value)} placeholder="—" />
                  </Field>
                  <Field label="₹ / year" error={errors[`rooms.${i}.price_per_year`] || errors[`rooms.${i}.price_per_month`]}>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      className="input"
                      value={room.price_per_year}
                      onChange={(e) => setRoom(i, 'price_per_year', e.target.value)}
                      placeholder="120700"
                    />
                  </Field>
                  <Field label="Free beds" error={errors[`rooms.${i}.availability`]}>
                    <input type="number" min="0" className="input" value={room.availability} onChange={(e) => setRoom(i, 'availability', e.target.value)} />
                  </Field>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, rooms: f.rooms.filter((_, n) => n !== i) }))}
                    className="btn btn-ghost btn-icon col-span-2 justify-self-end text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:col-span-1"
                    aria-label="Remove room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {!form.rooms.length && <p className="text-sm text-slate-500">No rooms added — that&apos;s okay, you can add them from the hostel page.</p>}
            </div>
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link to={editing ? `/hostels/${id}` : '/hostels'} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving…' : editing ? (isAdmin ? 'Save changes' : 'Save & re-submit') : isAdmin ? 'Publish hostel' : 'Submit for moderation'}
          </button>
        </div>
      </form>
    </div>
  );
}
