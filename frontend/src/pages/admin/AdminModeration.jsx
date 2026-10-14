import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Camera, Check, CircleX, ExternalLink, Hourglass, MessageSquareText, Search, Trash2, Undo2 } from 'lucide-react';
import { api, notifyModerationChanged } from '../../api/client.js';
import { AmenityIcons } from '../../components/AmenityList.jsx';
import { StatusBadge, TypeBadge, VerifiedBadge } from '../../components/Badges.jsx';
import Lightbox from '../../components/Lightbox.jsx';
import { StarRating } from '../../components/Stars.jsx';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui.jsx';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { floorLabel, formatYearly, plural, roomTypeLabel, timeAgo } from '../../lib/format.js';
import { useApi, useDebouncedValue, useDocumentTitle } from '../../lib/useApi.js';

const TABS = [
  { key: 'hostels', label: 'Hostels', icon: Building2, pk: 'hostel_id' },
  { key: 'photos', label: 'Photos', icon: Camera, pk: 'photo_id' },
  { key: 'reviews', label: 'Reviews', icon: MessageSquareText, pk: 'review_id' },
];

export default function AdminModeration() {
  useDocumentTitle('Moderation');
  const [params, setParams] = useSearchParams();
  const type = TABS.some((t) => t.key === params.get('type')) ? params.get('type') : 'hostels';
  const status = params.get('status') || 'pending';
  const tab = TABS.find((t) => t.key === type);
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const [selected, setSelected] = useState(new Set());
  const [lightbox, setLightbox] = useState(null);
  const [counts, setCounts] = useState(null);

  const { data, loading, error, reload } = useApi(() => api.get(`/admin/moderation/${type}`, { status, q: debouncedQ }), [type, status, debouncedQ]);
  const items = data?.items ?? [];

  const loadCounts = () => api.get('/admin/moderation/counts').then(setCounts).catch(() => {});
  useEffect(() => {
    loadCounts();
  }, []);
  useEffect(() => setSelected(new Set()), [type, status, debouncedQ]);

  const setParam = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const afterChange = (message) => {
    toast.success(message);
    notifyModerationChanged();
    loadCounts();
    setSelected(new Set());
    reload();
  };

  const act = async (id, newStatus) => {
    try {
      const res = await api.patch(`/admin/moderation/${type}/${id}`, { status: newStatus });
      afterChange(res.message);
    } catch (err) {
      toast.error(err);
    }
  };

  const bulk = async (newStatus) => {
    try {
      const res = await api.post(`/admin/moderation/${type}/bulk`, { ids: [...selected], status: newStatus });
      afterChange(res.message);
    } catch (err) {
      toast.error(err);
    }
  };

  const remove = async (item) => {
    const what = type.slice(0, -1);
    const ok = await confirm({
      title: `Delete this ${what}?`,
      message: type === 'hostels' ? 'All rooms, photos and reviews of this hostel are deleted too.' : 'This cannot be undone.',
      confirmText: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.del(`/${type}/${item[tab.pk]}`);
      afterChange(`${what[0].toUpperCase()}${what.slice(1)} deleted.`);
    } catch (err) {
      toast.error(err);
    }
  };

  const toggleSel = (id) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const allSelected = items.length > 0 && items.every((it) => selected.has(it[tab.pk]));

  const actions = (item) => {
    const id = item[tab.pk];
    return (
      <div className="flex flex-wrap items-center gap-2">
        {item.status !== 'approved' && (
          <button className="btn btn-success btn-sm" onClick={() => act(id, 'approved')}>
            <Check className="h-4 w-4" /> Approve
          </button>
        )}
        {item.status !== 'rejected' && (
          <button className="btn btn-danger-soft btn-sm" onClick={() => act(id, 'rejected')}>
            <CircleX className="h-4 w-4" /> Reject
          </button>
        )}
        {item.status !== 'pending' && (
          <button className="btn btn-ghost btn-sm" onClick={() => act(id, 'pending')} title="Move back to the queue">
            <Undo2 className="h-4 w-4" /> Pending
          </button>
        )}
        <button className="btn btn-ghost btn-sm text-slate-400 hover:text-rose-600" onClick={() => remove(item)} title="Delete permanently">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  const submitter = (item) => (
    <p className="text-xs text-slate-500">
      by <span className="font-medium text-slate-700">{item.user_name}</span> ({item.user_email}){' '}
      {item.user_role === 'admin' ? (
        <span className="font-medium text-violet-700">· admin</span>
      ) : item.user_verified ? (
        <VerifiedBadge label={item.user_college ?? 'verified'} className="ml-1" />
      ) : (
        <span className="font-medium text-amber-700">· not verified</span>
      )}{' '}
      · {timeAgo(item.created_at)}
    </p>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setParam({ type: key })}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ring-1 transition ring-inset ${
              type === key ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
            {counts?.[key] > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold ${type === key ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search hostel, college or user…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setParam({ status: e.target.value === 'pending' ? '' : e.target.value })}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All statuses</option>
        </select>
      </div>

      {items.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-2.5 ring-1 ring-slate-200">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-700"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((it) => it[tab.pk])))}
            />
            Select all ({items.length})
          </label>
          {selected.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-slate-500">{selected.size} selected</span>
              <button className="btn btn-success btn-sm" onClick={() => bulk('approved')}>
                <Check className="h-4 w-4" /> Approve
              </button>
              <button className="btn btn-danger-soft btn-sm" onClick={() => bulk('rejected')}>
                <CircleX className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <PageLoader />
        ) : !items.length ? (
          <EmptyState icon={status === 'pending' ? Check : Hourglass} title={status === 'pending' ? `No pending ${type} — all caught up!` : `No ${status === 'all' ? '' : status} ${type}`}>
            {status === 'pending' ? 'New submissions from students will appear here.' : 'Try another filter.'}
          </EmptyState>
        ) : type === 'photos' ? (
          <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
            {items.map((p, i) => (
              <div key={p.photo_id} className={`card overflow-hidden ${selected.has(p.photo_id) ? 'ring-2 ring-brand-500' : ''}`}>
                <div className="relative aspect-[4/3] bg-slate-100">
                  <button onClick={() => setLightbox(i)} className="h-full w-full">
                    <img src={p.url} alt={p.caption || ''} className="h-full w-full object-cover" loading="lazy" />
                  </button>
                  <input
                    type="checkbox"
                    className="absolute top-3 left-3 h-5 w-5 accent-brand-700"
                    checked={selected.has(p.photo_id)}
                    onChange={() => toggleSel(p.photo_id)}
                    aria-label="Select photo"
                  />
                  <StatusBadge status={p.status} className="absolute top-3 right-3 shadow" />
                </div>
                <div className="space-y-2 p-4">
                  <p className="font-medium text-slate-900">{p.caption || <span className="text-slate-400">No caption</span>}</p>
                  <p className="text-sm text-slate-600">
                    <Link to={`/hostels/${p.hostel_id}`} className="font-medium hover:text-brand-700">
                      {p.hostel_name}
                    </Link>{' '}
                    · {p.room_type ? `${roomTypeLabel(p.room_type)} room${p.floor_no !== null ? `, ${floorLabel(p.floor_no)}` : ''}` : 'hostel-level'}
                    {p.hostel_status !== 'approved' && <span className="text-amber-700"> · hostel {p.hostel_status}</span>}
                  </p>
                  {submitter(p)}
                  <div className="pt-1">{actions(p)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`}>
            {items.map((item) => {
              const id = item[tab.pk];
              return (
                <div key={id} className={`card flex gap-4 p-4 ${selected.has(id) ? 'ring-2 ring-brand-500' : ''}`}>
                  <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-brand-700" checked={selected.has(id)} onChange={() => toggleSel(id)} aria-label="Select" />
                  <div className="min-w-0 flex-1 space-y-2">
                    {type === 'hostels' ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/hostels/${item.hostel_id}`} className="text-base font-semibold text-slate-900 hover:text-brand-700">
                            {item.name}
                          </Link>
                          <TypeBadge type={item.type} />
                          <StatusBadge status={item.status} />
                          <Link to={`/hostels/${item.hostel_id}`} className="text-slate-400 hover:text-slate-700" title="Open hostel page">
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </div>
                        <p className="text-sm text-slate-600">
                          {item.college_name} · {item.city}
                          {item.address ? ` · ${item.address}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span>{plural(item.room_count, 'room type')}</span>
                          <span>{plural(item.photo_count, 'photo')}</span>
                          <span>{plural(item.review_count, 'review')}</span>
                          {item.min_price !== null && <span>from {formatYearly(item.min_price)}/yr</span>}
                          <AmenityIcons amenities={item.amenities} max={8} />
                        </div>
                        {item.updated_at && <p className="text-xs text-amber-700">Edited by the submitter {timeAgo(item.updated_at)}</p>}
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          <StarRating value={item.rating} size="h-4 w-4" />
                          <span className="font-semibold text-slate-900">{item.title || 'Untitled review'}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-sm leading-6 whitespace-pre-line text-slate-700">{item.comment}</p>
                        <p className="text-xs text-slate-500">
                          on{' '}
                          <Link to={`/hostels/${item.hostel_id}`} className="font-medium text-slate-700 hover:text-brand-700">
                            {item.hostel_name}
                          </Link>{' '}
                          · {item.room_type ? `${roomTypeLabel(item.room_type)} room` : 'hostel overall'} · current avg {Number(item.hostel_avg_rating).toFixed(1)}★
                        </p>
                      </>
                    )}
                    {submitter(item)}
                  </div>
                  <div className="shrink-0">{actions(item)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {type === 'photos' && (
        <Lightbox
          photos={items.map((p) => ({ ...p, uploader_name: p.user_name }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
