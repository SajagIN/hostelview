import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check, GitCompareArrows, Minus, Plus, Search, X } from 'lucide-react';
import { api } from '../api/client.js';
import { AcBadge, TypeBadge } from '../components/Badges.jsx';
import HostelCover from '../components/HostelCover.jsx';
import { StarRating } from '../components/Stars.jsx';
import { EmptyState, ErrorState, PageLoader } from '../components/ui.jsx';
import { useCompare } from '../context/CompareContext.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { amenityIcon, MESS_FILTERS, MESS_KEYS } from '../lib/amenities.js';
import { formatYearly, formatYearlyRange, roomTypeLabel, sharingLabel } from '../lib/format.js';

const minOf = (list) => (list.length > 1 ? Math.min(...list) : null);
import { useApi, useDebouncedValue, useDocumentTitle } from '../lib/useApi.js';

function BestTag({ children }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
      <Award className="h-3 w-3" /> {children}
    </span>
  );
}

function AddHostel() {
  const { has, toggle, items, max } = useCompare();
  const [q, setQ] = useState('');
  const debounced = useDebouncedValue(q, 250);
  const results = useApi(() => (debounced.trim() ? api.get('/hostels', { q: debounced.trim(), limit: 6 }) : Promise.resolve(null)), [debounced]);
  const full = items.length >= max;

  return (
    <div className="relative w-full sm:w-80">
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="input pl-9"
        placeholder={full ? `Maximum ${max} hostels — remove one to add another` : 'Add a hostel to compare…'}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={full}
      />
      {debounced.trim() && results.data && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          {results.data.hostels.length ? (
            results.data.hostels.map((h) => (
              <button
                key={h.hostel_id}
                disabled={has(h.hostel_id)}
                onClick={() => {
                  toggle(h);
                  setQ('');
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-50"
              >
                <HostelCover src={h.cover_url} alt="" type={h.type} className="h-10 w-12 rounded-lg" label="" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{h.name}</span>
                  <span className="block truncate text-xs text-slate-500">{h.college.name}</span>
                </span>
                {has(h.hostel_id) ? <Check className="h-4 w-4 text-brand-600" /> : <Plus className="h-4 w-4 text-slate-400" />}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-sm text-slate-500">No approved hostels match “{debounced}”.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Compare() {
  useDocumentTitle('Compare hostels');
  const { items, remove, clear } = useCompare();
  const { meta, labelFor } = useMeta();
  const ids = items.map((i) => i.hostel_id).join(',');
  const { data, loading, error, reload } = useApi(
    () => (ids ? api.get('/hostels/compare', { ids }) : Promise.resolve({ hostels: [] })),
    [ids],
  );

  const hostels = useMemo(() => data?.hostels ?? [], [data]);

  const best = useMemo(() => {
    const rated = hostels.filter((h) => h.review_count > 0);
    const priced = hostels.filter((h) => h.min_price !== null);
    return {
      rating: rated.length > 1 ? Math.max(...rated.map((h) => h.avg_rating)) : null,
      price: priced.length > 1 ? Math.min(...priced.map((h) => h.min_price)) : null,
      ac: minOf(hostels.filter((h) => h.min_ac_price !== null).map((h) => h.min_ac_price)),
      nonAc: minOf(hostels.filter((h) => h.min_non_ac_price !== null).map((h) => h.min_non_ac_price)),
      beds: hostels.length > 1 ? Math.max(...hostels.map((h) => h.free_beds)) : null,
    };
  }, [hostels]);

  const amenityRows = useMemo(() => {
    const present = new Set(hostels.flatMap((h) => Object.keys(h.amenities || {}).filter((k) => h.amenities[k])));
    const catalog = (meta?.amenities ?? []).map((a) => a.key);
    return [...catalog.filter((k) => present.has(k)), ...[...present].filter((k) => !catalog.includes(k)).sort()].filter(
      (k) => !MESS_KEYS.includes(k),
    );
  }, [hostels, meta]);

  const missing = data ? items.filter((i) => !hostels.some((h) => h.hostel_id === i.hostel_id)) : [];

  const header = (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Compare hostels</h1>
        <p className="mt-1 text-slate-500">Up to 4 hostels side by side — mix colleges freely; best values are highlighted.</p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <AddHostel />
        {items.length > 0 && (
          <button onClick={clear} className="btn btn-ghost btn-sm shrink-0">
            Clear all
          </button>
        )}
      </div>
    </div>
  );

  if (!items.length) {
    return (
      <div className="container-page py-8">
        {header}
        <EmptyState
          icon={GitCompareArrows}
          title="Nothing to compare yet"
          className="mt-8"
          action={
            <Link to="/hostels" className="btn btn-primary">
              Browse hostels
            </Link>
          }
        >
          Tap <b>Compare</b> on any hostel card, or search above to add hostels.
        </EmptyState>
      </div>
    );
  }

  if (loading && !data) return <PageLoader />;

  const cell = 'border-b border-slate-100 px-4 py-3 align-top text-sm';
  const labelCell = `${cell} sticky left-0 z-10 bg-white font-medium text-slate-500 w-40 min-w-40`;

  return (
    <div className="container-page py-8">
      {header}
      {error && (
        <div className="mt-6">
          <ErrorState error={error} onRetry={reload} />
        </div>
      )}
      {missing.length > 0 && (
        <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          {missing.map((m) => m.name).join(', ')} {missing.length === 1 ? 'is' : 'are'} no longer publicly listed.{' '}
          <button className="font-semibold underline" onClick={() => missing.forEach((m) => remove(m.hostel_id))}>
            Remove
          </button>
        </div>
      )}
      {hostels.length === 1 && <p className="mt-6 text-sm text-slate-500">Add at least one more hostel to see a real comparison.</p>}

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={`${labelCell} align-bottom`} />
              {hostels.map((h) => (
                <th key={h.hostel_id} className={`${cell} min-w-[13rem] text-left font-normal`}>
                  <div className="relative">
                    <button
                      onClick={() => remove(h.hostel_id)}
                      className="absolute top-2 right-2 z-10 rounded-full bg-white/90 p-1 text-slate-500 shadow hover:text-rose-600"
                      aria-label={`Remove ${h.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <HostelCover src={h.cover_url} alt={h.name} type={h.type} className="h-32 rounded-xl" label="" />
                  </div>
                  <Link to={`/hostels/${h.hostel_id}`} className="mt-3 block text-base font-semibold text-slate-900 hover:text-brand-700">
                    {h.name}
                  </Link>
                  <p className="text-xs text-slate-500">{h.college.name}</p>
                  <TypeBadge type={h.type} className="mt-2" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={labelCell}>Rating</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  {h.review_count ? (
                    <>
                      <div className="flex items-center gap-2">
                        <StarRating value={h.avg_rating} size="h-3.5 w-3.5" />
                        <span className="font-semibold text-slate-900">{h.avg_rating.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{h.review_count} approved reviews</p>
                      {best.rating !== null && h.avg_rating === best.rating && <BestTag>Best rated</BestTag>}
                    </>
                  ) : (
                    <span className="text-slate-400">No reviews yet</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Yearly fee</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  <span className="font-semibold text-slate-900">{formatYearlyRange(h.min_price, h.max_price)}</span>
                  <p className="text-xs text-slate-500">room + mess, per student</p>
                  {best.price !== null && h.min_price === best.price && (
                    <div>
                      <BestTag>Most affordable</BestTag>
                    </div>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Cheapest AC room</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  {h.min_ac_price !== null ? (
                    <>
                      <span className="font-semibold text-slate-900">{formatYearly(h.min_ac_price)}</span>
                      <span className="text-xs text-slate-500"> /yr</span>
                      {best.ac !== null && h.min_ac_price === best.ac && (
                        <div>
                          <BestTag>Cheapest AC</BestTag>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">No AC rooms</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Cheapest non-AC room</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  {h.min_non_ac_price !== null ? (
                    <>
                      <span className="font-semibold text-slate-900">{formatYearly(h.min_non_ac_price)}</span>
                      <span className="text-xs text-slate-500"> /yr</span>
                      {best.nonAc !== null && h.min_non_ac_price === best.nonAc && (
                        <div>
                          <BestTag>Cheapest non-AC</BestTag>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">AC rooms only</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Sharing options</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  {h.sharing?.length ? (
                    <div className="flex flex-wrap gap-1">
                      {h.sharing.map((c) => (
                        <span key={c} className="badge bg-slate-100 text-slate-700 ring-slate-300/40">
                          {sharingLabel(c)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400">Not listed</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Mess</td>
              {hostels.map((h) => {
                const kinds = MESS_FILTERS.filter((m) => h.amenities?.[m.key]);
                return (
                  <td key={h.hostel_id} className={cell}>
                    {kinds.length ? (
                      <div className="flex flex-wrap gap-1">
                        {kinds.map((m) => {
                          const Icon = amenityIcon(m.key);
                          return (
                            <span key={m.key} className="badge bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                              <Icon className="h-3 w-3" /> {m.label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-400">{h.amenities?.mess ? 'Mess (type not listed)' : 'Not listed'}</span>
                    )}
                  </td>
                );
              })}
            </tr>
            <tr>
              <td className={labelCell}>Room options</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  {h.rooms.length ? (
                    <ul className="space-y-1">
                      {h.rooms.map((r) => (
                        <li key={r.room_id} className="flex items-start justify-between gap-2 text-xs">
                          <span className="text-slate-700">
                            {roomTypeLabel(r.room_type)}
                            <span className="mt-0.5 flex items-center gap-1 text-slate-400">
                              {sharingLabel(r.capacity)} <AcBadge ac={r.is_ac} className="px-1.5 py-0 text-[10px]" />
                            </span>
                          </span>
                          <span className="font-medium whitespace-nowrap text-slate-900">{formatYearly(r.price_per_month)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-400">Not listed</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Free beds</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  <span className={`font-semibold ${h.free_beds > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>{h.free_beds}</span>
                  <span className="text-xs text-slate-500"> of {h.total_capacity} beds listed</span>
                  {best.beds !== null && best.beds > 0 && h.free_beds === best.beds && (
                    <div>
                      <BestTag>Most vacancies</BestTag>
                    </div>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Location</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  <p className="font-medium text-slate-900">
                    {h.college.city}, {h.college.state}
                  </p>
                  {h.address && <p className="text-xs text-slate-500">{h.address}</p>}
                </td>
              ))}
            </tr>
            <tr>
              <td className={labelCell}>Photos</td>
              {hostels.map((h) => (
                <td key={h.hostel_id} className={cell}>
                  {h.photo_count} approved
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={hostels.length + 1} className="sticky left-0 bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Amenities
              </td>
            </tr>
            {amenityRows.map((key) => {
              const Icon = amenityIcon(key);
              return (
                <tr key={key}>
                  <td className={labelCell}>
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-400" /> {labelFor(key)}
                    </span>
                  </td>
                  {hostels.map((h) => (
                    <td key={h.hostel_id} className={cell}>
                      {h.amenities?.[key] ? (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <Check className="h-4 w-4" />
                        </span>
                      ) : (
                        <Minus className="h-4 w-4 text-slate-300" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr>
              <td className={`${labelCell} border-b-0`} />
              {hostels.map((h) => (
                <td key={h.hostel_id} className={`${cell} border-b-0`}>
                  <Link to={`/hostels/${h.hostel_id}`} className="btn btn-secondary btn-sm w-full">
                    View hostel
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
