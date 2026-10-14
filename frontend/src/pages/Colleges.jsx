import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, ExternalLink, GraduationCap, Scale, Search, Star, Users } from 'lucide-react';
import { api } from '../api/client.js';
import { EmptyState, ErrorState, Skeleton } from '../components/ui.jsx';
import { formatCompactInr, formatYearly, formatYearlyRange, sharingLabel, toYearly } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

function Best({ children }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
      <Award className="h-3 w-3" /> {children}
    </span>
  );
}

const lowest = (list, key) => {
  const vals = list.map((c) => c[key]).filter((v) => v !== null && v !== undefined);
  return vals.length > 1 ? Math.min(...vals) : null;
};

function CollegeComparison({ colleges }) {
  const cols = colleges.filter((c) => c.hostel_count > 0);
  const best = useMemo(() => {
    const rated = cols.filter((c) => c.avg_rating);
    return {
      fee: lowest(cols, 'min_price'),
      ac: lowest(cols, 'min_ac_price'),
      nonAc: lowest(cols, 'min_non_ac_price'),
      rating: rated.length > 1 ? Math.max(...rated.map((c) => c.avg_rating)) : null,
    };
  }, [cols]);
  if (cols.length < 2) return null;

  const cell = 'border-b border-slate-100 px-4 py-3 align-top text-sm';
  const labelCell = `${cell} sticky left-0 z-10 w-44 min-w-44 bg-white font-medium text-slate-500`;
  const row = (label, render) => (
    <tr>
      <td className={labelCell}>{label}</td>
      {cols.map((c) => (
        <td key={c.college_id} className={cell}>
          {render(c)}
        </td>
      ))}
    </tr>
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Scale className="h-5 w-5 text-brand-700" /> Compare colleges side by side
          </h2>
          <p className="text-sm text-slate-500">Computed live from approved hostels, rooms and reviews in the database.</p>
        </div>
        <Link to="/compare" className="text-sm font-semibold text-brand-700 hover:underline">
          Compare individual hostels →
        </Link>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={`${labelCell} align-bottom`} />
              {cols.map((c) => (
                <th key={c.college_id} className={`${cell} min-w-[12rem] text-left font-normal`}>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c.city}, {c.state}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('Approved hostels', (c) => (
              <>
                <span className="font-semibold text-slate-900">{c.hostel_count}</span>
                <p className="text-xs text-slate-500">
                  {[c.boys_hostels && `${c.boys_hostels} boys`, c.girls_hostels && `${c.girls_hostels} girls`, c.coed_hostels && `${c.coed_hostels} co-ed`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </>
            ))}
            {row('Yearly fee range', (c) => (
              <>
                <span className="font-semibold text-slate-900">{formatYearlyRange(c.min_price, c.max_price)}</span>
                {best.fee !== null && c.min_price === best.fee && (
                  <div>
                    <Best>Most affordable</Best>
                  </div>
                )}
              </>
            ))}
            {row('Cheapest AC room', (c) =>
              c.min_ac_price !== null ? (
                <>
                  <span className="font-semibold text-slate-900">{formatYearly(c.min_ac_price)}</span>
                  <span className="text-xs text-slate-500"> /yr</span>
                  {best.ac !== null && c.min_ac_price === best.ac && (
                    <div>
                      <Best>Cheapest AC</Best>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-slate-400">No AC rooms listed</span>
              ),
            )}
            {row('Cheapest non-AC room', (c) =>
              c.min_non_ac_price !== null ? (
                <>
                  <span className="font-semibold text-slate-900">{formatYearly(c.min_non_ac_price)}</span>
                  <span className="text-xs text-slate-500"> /yr</span>
                  {best.nonAc !== null && c.min_non_ac_price === best.nonAc && (
                    <div>
                      <Best>Cheapest non-AC</Best>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-slate-400">—</span>
              ),
            )}
            {row('AC room types', (c) => (
              <span className="text-slate-700">
                {c.ac_room_count} of {c.room_count}
              </span>
            ))}
            {row('Sharing options', (c) =>
              c.sharing.length ? (
                <div className="flex flex-wrap gap-1">
                  {c.sharing.map((n) => (
                    <span key={n} className="badge bg-slate-100 text-slate-700 ring-slate-300/40">
                      {sharingLabel(n)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">—</span>
              ),
            )}
            {row('Mess', (c) => (
              <span className="text-slate-700">
                Veg in {c.veg_mess_hostels}/{c.hostel_count} · Non-veg in {c.nonveg_mess_hostels}/{c.hostel_count}
              </span>
            ))}
            {row('Average hostel rating', (c) =>
              c.avg_rating ? (
                <>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
                    <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" strokeWidth={0} />
                    {c.avg_rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500"> · {c.review_count} reviews</span>
                  {best.rating !== null && c.avg_rating === best.rating && (
                    <div>
                      <Best>Best rated</Best>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-slate-400">No reviews yet</span>
              ),
            )}
            {row('Verified students', (c) => (
              <span className="text-slate-700">{c.verified_students}</span>
            ))}
            <tr>
              <td className={`${labelCell} border-b-0`} />
              {cols.map((c) => (
                <td key={c.college_id} className={`${cell} border-b-0`}>
                  <Link to={`/hostels?college_id=${c.college_id}`} className="btn btn-secondary btn-sm w-full">
                    View hostels
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Fees are approximate yearly room + mess charges per student (demo data based on published 2025-26 fee notices), excluding refundable
        deposits and one-time admission fees.
      </p>
    </section>
  );
}

export default function Colleges() {
  useDocumentTitle('Colleges');
  const { data, loading, error, reload } = useApi(() => api.get('/colleges'), []);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = data?.colleges ?? [];
    return term ? all.filter((c) => `${c.name} ${c.city} ${c.state}`.toLowerCase().includes(term)) : all;
  }, [data, q]);

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Colleges</h1>
          <p className="mt-1 text-slate-500">Every hostel on HostelView is linked to the college it serves.</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Search colleges or cities…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : list.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {list.map((c) => (
              <div key={c.college_id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="leading-snug font-semibold text-slate-900">{c.name}</h2>
                    <p className="text-sm text-slate-500">
                      {c.city}, {c.state}
                    </p>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 py-2">
                    <dt className="text-[11px] text-slate-500">Hostels</dt>
                    <dd className="font-bold text-slate-900">{c.hostel_count}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 py-2">
                    <dt className="text-[11px] text-slate-500">Avg rating</dt>
                    <dd className="inline-flex items-center gap-1 font-bold text-slate-900">
                      {c.avg_rating ? (
                        <>
                          <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" strokeWidth={0} />
                          {c.avg_rating.toFixed(1)}
                        </>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 py-2">
                    <dt className="text-[11px] text-slate-500">From / yr</dt>
                    <dd className="text-sm font-bold text-slate-900" title={c.min_price ? `${formatYearly(c.min_price)} per year` : undefined}>
                      {c.min_price ? formatCompactInr(toYearly(c.min_price)) : '—'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="h-3.5 w-3.5" /> {c.verified_students} verified student{c.verified_students === 1 ? '' : 's'} contributing
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                  {c.website ? (
                    <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                      <ExternalLink className="h-3.5 w-3.5" /> Website
                    </a>
                  ) : (
                    <span />
                  )}
                  <Link to={`/hostels?college_id=${c.college_id}`} className="btn btn-secondary btn-sm">
                    View hostels <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={GraduationCap} title="No colleges found">
            Try a different search.
          </EmptyState>
        )}
      </div>

      {data && <CollegeComparison colleges={list} />}
    </div>
  );
}
