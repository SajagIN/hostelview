import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Calendar, Camera, KeyRound, Mail, MessageSquareText, Pencil, ShieldAlert, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { api, fieldErrors, notifyModerationChanged } from '../api/client.js';
import { RoleBadge, StatusBadge, TypeBadge, VerifiedBadge } from '../components/Badges.jsx';
import { StarRating } from '../components/Stars.jsx';
import { Avatar, EmptyState, ErrorState, Field, PageLoader } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, roomTypeLabel, timeAgo } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

export default function Account() {
  useDocumentTitle('My account');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'submissions' ? 'submissions' : 'profile';

  return (
    <div className="container-page max-w-5xl py-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">My account</h1>
      <div className="mt-6 flex gap-1 border-b border-slate-200">
        {[
          ['profile', 'Profile'],
          ['submissions', 'My submissions'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setParams(key === 'profile' ? {} : { tab: key }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === key ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">{tab === 'profile' ? <Profile /> : <Submissions />}</div>
    </div>
  );
}

function Profile() {
  const { user, applySession, isAdmin } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    setSavingName(true);
    try {
      const data = await api.patch('/auth/profile', { name });
      applySession({ user: data.user });
      toast.success('Name updated.');
    } catch (err) {
      toast.error(err);
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.new_password !== pw.confirm) {
      setPwErrors({ confirm: 'Passwords do not match' });
      return;
    }
    setSavingPw(true);
    setPwErrors({});
    try {
      await api.post('/auth/change-password', { current_password: pw.current_password, new_password: pw.new_password });
      toast.success('Password changed.');
      setPw({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      const fe = fieldErrors(err);
      setPwErrors(Object.keys(fe).length ? fe : { current_password: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  const verified = user.role === 'student' && user.is_verified;

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <div className="card h-fit p-6 text-center">
        <Avatar name={user.name} size="h-20 w-20 text-2xl" className="mx-auto" />
        <p className="mt-4 text-lg font-semibold text-slate-900">{user.name}</p>
        <p className="text-sm text-slate-500">{user.email}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <RoleBadge role={user.role} />
          {verified && <VerifiedBadge label="Verified" />}
        </div>
        <dl className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-left text-sm">
          {user.college_name && (
            <div className="flex items-center gap-2 text-slate-600">
              <Building2 className="h-4 w-4 shrink-0 text-slate-400" /> {user.college_name}
            </div>
          )}
          {user.college_email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" /> <span className="truncate">{user.college_email}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" /> Member since {formatDate(user.created_at)}
          </div>
        </dl>
      </div>

      <div className="space-y-6">
        {!isAdmin && (
          <div className={`card flex flex-col gap-4 p-6 sm:flex-row sm:items-center ${verified ? '' : 'ring-amber-300'}`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${verified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {verified ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">
                {verified ? 'College email verified' : user.role === 'visitor' ? 'Visitor account (read-only)' : 'College email not verified yet'}
              </p>
              <p className="text-sm text-slate-500">
                {verified
                  ? `You can contribute to ${user.college_name} hostels.`
                  : user.role === 'visitor'
                    ? 'Living in a hostel? Verify a college email to contribute photos, rooms and reviews.'
                    : 'Confirm the one-time code sent to your college email to start contributing.'}
              </p>
            </div>
            {!verified && (
              <Link to="/verify" className="btn btn-primary">
                {user.role === 'visitor' ? 'Become a student' : 'Verify now'}
              </Link>
            )}
          </div>
        )}

        <form onSubmit={saveName} className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <UserRound className="h-4 w-4 text-slate-400" /> Profile
          </h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Display name" className="flex-1">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} minLength={2} required />
            </Field>
            <button className="btn btn-secondary" disabled={savingName || name.trim() === user.name}>
              {savingName ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>

        <form onSubmit={savePassword} className="card p-6">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <KeyRound className="h-4 w-4 text-slate-400" /> Change password
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Current password" error={pwErrors.current_password}>
              <input type="password" className="input" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} autoComplete="current-password" required />
            </Field>
            <Field label="New password" error={pwErrors.new_password} hint="8+ characters">
              <input type="password" className="input" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label="Confirm new password" error={pwErrors.confirm}>
              <input type="password" className="input" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" required />
            </Field>
          </div>
          <button className="btn btn-secondary mt-4" disabled={savingPw}>
            {savingPw ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Submissions() {
  const { data, loading, error, reload } = useApi(() => api.get('/me/submissions'), []);
  const toast = useToast();
  const confirm = useConfirm();

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const remove = async (kind, id, label) => {
    const ok = await confirm({ title: `Delete this ${label}?`, message: 'This cannot be undone.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    try {
      await api.del(`/${kind}/${id}`);
      toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted.`);
      notifyModerationChanged();
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const counts = (list) => ({
    pending: list.filter((x) => x.status === 'pending').length,
    approved: list.filter((x) => x.status === 'approved').length,
    rejected: list.filter((x) => x.status === 'rejected').length,
  });

  const total = data.hostels.length + data.photos.length + data.reviews.length;
  if (!total) {
    return (
      <EmptyState icon={Building2} title="You haven't contributed anything yet" action={<Link to="/hostels" className="btn btn-primary">Find your hostel</Link>}>
        Hostels, photos and reviews you submit will show up here with their moderation status.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Hostels', Building2, counts(data.hostels)],
          ['Photos', Camera, counts(data.photos)],
          ['Reviews', MessageSquareText, counts(data.reviews)],
        ].map(([label, Icon, c]) => (
          <div key={label} className="card p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Icon className="h-4 w-4" /> {label}
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{c.pending + c.approved + c.rejected}</p>
            <p className="mt-1 text-xs text-slate-500">
              <span className="text-emerald-700">{c.approved} approved</span> · <span className="text-amber-700">{c.pending} pending</span> ·{' '}
              <span className="text-rose-700">{c.rejected} rejected</span>
            </p>
          </div>
        ))}
      </div>

      {data.hostels.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Hostels you listed</h2>
          <div className="card divide-y divide-slate-100">
            {data.hostels.map((h) => (
              <div key={h.hostel_id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link to={`/hostels/${h.hostel_id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                    {h.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {h.college_name} · {h.room_count} room type{h.room_count === 1 ? '' : 's'} · submitted {timeAgo(h.created_at)}
                  </p>
                </div>
                <TypeBadge type={h.type} />
                <StatusBadge status={h.status} />
                <div className="flex gap-1">
                  {h.status !== 'approved' && (
                    <Link to={`/hostels/${h.hostel_id}/edit`} className="btn btn-ghost btn-sm" title="Edit & re-submit">
                      <Pencil className="h-4 w-4" />
                    </Link>
                  )}
                  {h.status !== 'approved' && (
                    <button onClick={() => remove('hostels', h.hostel_id, 'hostel')} className="btn btn-ghost btn-sm hover:text-rose-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.photos.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Photos you uploaded</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.photos.map((p) => (
              <div key={p.photo_id} className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <img src={p.url} alt={p.caption || ''} className="h-full w-full object-cover" loading="lazy" />
                  <StatusBadge status={p.status} className="absolute top-2 left-2 shadow-sm" />
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{p.caption || 'Untitled'}</p>
                    <Link to={`/hostels/${p.hostel_id}`} className="block truncate text-xs text-slate-500 hover:text-brand-700">
                      {p.hostel_name}
                      {p.room_type ? ` · ${roomTypeLabel(p.room_type)} room` : ''}
                    </Link>
                  </div>
                  <button onClick={() => remove('photos', p.photo_id, 'photo')} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.reviews.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Reviews you wrote</h2>
          <div className="space-y-3">
            {data.reviews.map((r) => (
              <div key={r.review_id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRating value={r.rating} size="h-3.5 w-3.5" />
                    <Link to={`/hostels/${r.hostel_id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-700">
                      {r.hostel_name}
                    </Link>
                    <span className="text-xs text-slate-500">{r.room_type ? `${roomTypeLabel(r.room_type)} room` : 'Hostel overall'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <button onClick={() => remove('reviews', r.review_id, 'review')} className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {r.title && <p className="mt-2 font-medium text-slate-900">{r.title}</p>}
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{r.comment}</p>
                <p className="mt-2 text-xs text-slate-400">{timeAgo(r.created_at)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
