import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api, notifyModerationChanged } from '../../api/client.js';
import { TypeBadge } from '../../components/Badges.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { formatDate, formatYearly, plural } from '../../lib/format.js';
import { useApi, useDebouncedValue, useDocumentTitle } from '../../lib/useApi.js';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-300',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-300',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-300',
};

export default function AdminHostels() {
  useDocumentTitle('Hostels · Admin');
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const debounced = useDebouncedValue(q, 300);
  const { data, loading, error, reload } = useApi(() => api.get('/admin/moderation/hostels', { status, q: debounced }), [status, debounced]);

  const changeStatus = async (h, newStatus) => {
    try {
      await api.patch(`/admin/moderation/hostels/${h.hostel_id}`, { status: newStatus });
      toast.success(`${h.name} → ${newStatus}`);
      notifyModerationChanged();
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  const remove = async (h) => {
    const ok = await confirm({
      title: `Delete ${h.name}?`,
      message: `This also deletes its ${plural(h.room_count, 'room type')}, ${plural(h.photo_count, 'photo')} and ${plural(h.review_count, 'review')}.`,
      confirmText: 'Delete hostel',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/hostels/${h.hostel_id}`);
      toast.success('Hostel deleted.');
      notifyModerationChanged();
      reload();
    } catch (err) {
      toast.error(err);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search hostels, colleges, submitters…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <Link to="/hostels/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> Add hostel
        </Link>
      </div>

      <div className="mt-4">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <PageLoader />
        ) : !data.items.length ? (
          <EmptyState title="No hostels found" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Hostel</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Content</th>
                  <th className="px-4 py-3">Submitted by</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((h) => (
                  <tr key={h.hostel_id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/hostels/${h.hostel_id}`} className="font-semibold text-slate-900 hover:text-brand-700">
                        {h.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {h.college_name} · {formatDate(h.created_at)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={h.type} />
                    </td>
                    <td className="px-4 py-3 font-medium">{Number(h.avg_rating) > 0 ? `${Number(h.avg_rating).toFixed(1)} ★` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {plural(h.room_count, 'room')} · {plural(h.photo_count, 'photo')} · {plural(h.review_count, 'review')}
                      {h.min_price !== null && <div>from {formatYearly(h.min_price)}/yr</div>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-slate-700">{h.user_name}</p>
                      <p className="text-slate-500">{h.user_college ?? h.user_role}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={h.status}
                        onChange={(e) => changeStatus(h, e.target.value)}
                        className={`rounded-lg border-0 py-1 pr-7 pl-2 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[h.status]}`}
                        aria-label="Status"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/hostels/${h.hostel_id}/edit`} className="btn btn-ghost btn-sm" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button onClick={() => remove(h)} className="btn btn-ghost btn-sm hover:text-rose-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
