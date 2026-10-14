import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Camera, ClipboardCheck, MessageSquareText, Users } from 'lucide-react';
import { api } from '../../api/client.js';
import { StatusBadge } from '../../components/Badges.jsx';
import { ErrorState, PageLoader } from '../../components/ui.jsx';
import { timeAgo } from '../../lib/format.js';
import { useApi, useDocumentTitle } from '../../lib/useApi.js';

function StatCard({ icon: Icon, label, total, parts, to }) {
  return (
    <Link to={to} className="card group p-5 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Icon className="h-4 w-4" /> {label}
        </p>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">{total}</p>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {parts.map(([text, cls]) => (
          <span key={text} className={cls}>
            {text}
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function AdminOverview() {
  useDocumentTitle('Admin');
  const { data, loading, error, reload } = useApi(() => api.get('/admin/stats'), []);

  if (loading && !data) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const pendingTotal = data.hostels.pending + data.photos.pending + data.reviews.pending;
  const kindLink = { hostel: 'hostels', photo: 'photos', review: 'reviews' };
  const maxCollege = Math.max(1, ...data.per_college.map((c) => c.total));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Users"
          total={data.users.total}
          to="/admin/users"
          parts={[
            [`${data.users.verified_students} verified students`, 'text-brand-700'],
            [`${data.users.student - data.users.verified_students} unverified`, 'text-amber-700'],
            [`${data.users.visitor} visitor${data.users.visitor === 1 ? '' : 's'}`, 'text-slate-500'],
            [`${data.users.admin} admin${data.users.admin === 1 ? '' : 's'}`, 'text-violet-700'],
          ]}
        />
        {[
          ['Hostels', Building2, data.hostels, 'hostels'],
          ['Photos', Camera, data.photos, 'photos'],
          ['Reviews', MessageSquareText, data.reviews, 'reviews'],
        ].map(([label, icon, s, type]) => (
          <StatCard
            key={label}
            icon={icon}
            label={label}
            total={s.total}
            to={`/admin/moderation?type=${type}`}
            parts={[
              [`${s.approved} approved`, 'text-emerald-700'],
              [`${s.pending} pending`, 'text-amber-700'],
              [`${s.rejected} rejected`, 'text-rose-700'],
            ]}
          />
        ))}
      </div>

      <div className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${pendingTotal ? 'ring-amber-300' : ''}`}>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${pendingTotal ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{pendingTotal ? `${pendingTotal} item${pendingTotal === 1 ? '' : 's'} waiting for review` : 'The moderation queue is empty 🎉'}</p>
          <p className="text-sm text-slate-500">
            {data.hostels.pending} hostel{data.hostels.pending === 1 ? '' : 's'} · {data.photos.pending} photo{data.photos.pending === 1 ? '' : 's'} ·{' '}
            {data.reviews.pending} review{data.reviews.pending === 1 ? '' : 's'}
          </p>
        </div>
        {pendingTotal > 0 && (
          <Link to="/admin/moderation" className="btn btn-primary">
            Start moderating
          </Link>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Recent submissions</h2>
          <ul className="mt-3 divide-y divide-slate-100">
            {data.recent.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="flex items-center gap-3 py-2.5">
                <span className="w-14 shrink-0 text-xs font-semibold text-slate-400 uppercase">{r.kind}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={r.status === 'pending' ? `/admin/moderation?type=${kindLink[r.kind]}` : `/hostels/${r.hostel_id}`}
                    className="block truncate text-sm font-medium text-slate-800 hover:text-brand-700"
                  >
                    {r.summary}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {r.user_name} · {timeAgo(r.created_at)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Hostels per college</h2>
          <ul className="mt-4 space-y-3">
            {data.per_college.map((c) => (
              <li key={c.college_id}>
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate text-slate-700">{c.name}</span>
                  <span className="shrink-0 text-slate-500">
                    {c.approved} live{c.pending ? ` · ${c.pending} pending` : ''}
                  </span>
                </div>
                <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="bg-brand-600" style={{ width: `${(c.approved / maxCollege) * 100}%` }} />
                  <div className="bg-amber-400" style={{ width: `${(c.pending / maxCollege) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            {data.colleges} colleges · {data.rooms} room listings
          </p>
        </section>
      </div>
    </div>
  );
}
