import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, RotateCcw, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { api } from '../api/client.js';
import HostelCard from '../components/HostelCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { CardSkeleton, EmptyState, ErrorState } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMeta } from '../context/MetaContext.jsx';
import { amenityIcon, MESS_FILTERS, MESS_KEYS } from '../lib/amenities.js';
import { formatPrice, sharingLabel, typeLabel } from '../lib/format.js';
import { useApi, useDocumentTitle } from '../lib/useApi.js';

const DEFAULTS = {
  q: '',
  city: '',
  college_id: '',
  type: '',
  ac: '',
  sharing: '',
  min_fee: '',
  max_fee: '',
  min_rating: '',
  amenities: '',
  available: '',
  sort: 'rating',
  page: '1',
};

const SORTS = [
  ['rating', 'Top rated'],
  ['price_asc', 'Price: low to high'],
  ['price_desc', 'Price: high to low'],
  ['reviews', 'Most reviewed'],
  ['newest', 'Newest'],
];

const BUDGETS = [
  ['', '100000', 'Under ₹1L'],
  ['100000', '150000', '₹1L – 1.5L'],
  ['150000', '200000', '₹1.5L – 2L'],
  ['200000', '', '₹2L +'],
];

const SHARING = [
  ['1', 'Single'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5+', '5+'],
];


export default function Explore() {
  useDocumentTitle('Explore hostels');
  const [params, setParams] = useSearchParams();
  const { meta, labelFor } = useMeta();
  const { canContribute } = useAuth();
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(() => Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, params.get(k) ?? DEFAULTS[k]])), [params]);
  const amenitySet = useMemo(() => new Set(filters.amenities.split(',').filter(Boolean)), [filters.amenities]);
  const sharingSet = useMemo(() => new Set(filters.sharing.split(',').filter(Boolean)), [filters.sharing]);

  const setFilter = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === undefined || v === DEFAULTS[k]) next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const [q, setQ] = useState(filters.q);
  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== filters.q) setFilter({ q });
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const query = params.toString();
  const { data, loading, error, reload } = useApi(() => api.get(`/hostels?${query}${query ? '&' : ''}limit=9`), [query]);
  const colleges = useApi(() => api.get('/colleges'), []);

  const toggleAmenity = (key) => {
    const next = new Set(amenitySet);
    next.has(key) ? next.delete(key) : next.add(key);
    setFilter({ amenities: [...next].join(',') });
  };

  const toggleSharing = (value) => {
    const next = new Set(sharingSet);
    next.has(value) ? next.delete(value) : next.add(value);
    setFilter({ sharing: SHARING.map(([v]) => v).filter((v) => next.has(v)).join(',') });
  };

  const activeChips = [];
  if (filters.q) activeChips.push(['q', `“${filters.q}”`]);
  if (filters.city) activeChips.push(['city', filters.city]);
  if (filters.college_id) {
    const c = colleges.data?.colleges.find((x) => String(x.college_id) === filters.college_id);
    activeChips.push(['college_id', c?.name ?? 'College']);
  }
  if (filters.type) activeChips.push(['type', typeLabel(filters.type)]);
  if (filters.ac) activeChips.push(['ac', filters.ac === 'ac' ? 'AC rooms' : 'Non-AC rooms']);
  if (sharingSet.size) {
    activeChips.push(['sharing', [...sharingSet].map((v) => (v === '5+' ? '5+ sharing' : sharingLabel(v))).join(', ')]);
  }
  if (filters.min_fee || filters.max_fee) {
    activeChips.push([
      ['min_fee', 'max_fee'],
      (filters.min_fee && filters.max_fee
        ? `${formatPrice(filters.min_fee)} – ${formatPrice(filters.max_fee)}`
        : filters.min_fee
          ? `From ${formatPrice(filters.min_fee)}`
          : `Up to ${formatPrice(filters.max_fee)}`) + ' /yr',
    ]);
  }
  if (filters.min_rating) activeChips.push(['min_rating', `${filters.min_rating}+ stars`]);
  amenitySet.forEach((key) => activeChips.push([`amenity:${key}`, labelFor(key)]));
  if (filters.available) activeChips.push(['available', 'Has free beds']);

  const removeChip = (key) => {
    if (Array.isArray(key)) setFilter(Object.fromEntries(key.map((k) => [k, ''])));
    else if (key.startsWith('amenity:')) toggleAmenity(key.slice(8));
    else setFilter({ [key]: '' });
  };

  const resetAll = () => {
    setQ('');
    setParams(new URLSearchParams(filters.sort !== 'rating' ? { sort: filters.sort } : {}), { replace: true });
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <label className="label" htmlFor="f-q">
          Search
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="f-q" className="input pl-9" placeholder="Hostel, college, area…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="label" htmlFor="f-city">
            City
          </label>
          <select id="f-city" className="input" value={filters.city} onChange={(e) => setFilter({ city: e.target.value })}>
            <option value="">All cities</option>
            {meta?.cities?.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city} ({c.hostel_count})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-college">
            College
          </label>
          <select id="f-college" className="input" value={filters.college_id} onChange={(e) => setFilter({ college_id: e.target.value })}>
            <option value="">All colleges</option>
            {colleges.data?.colleges.map((c) => (
              <option key={c.college_id} value={c.college_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="label">Hostel type</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {[
            ['', 'Any'],
            ['boys', 'Boys'],
            ['girls', 'Girls'],
            ['coed', 'Co-ed'],
          ].map(([value, label]) => (
            <button
              key={value || 'any'}
              type="button"
              onClick={() => setFilter({ type: value })}
              className={`rounded-lg py-1.5 text-sm font-medium transition ${filters.type === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Room</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {[
            ['', 'Any'],
            ['ac', 'AC'],
            ['non_ac', 'Non-AC'],
          ].map(([value, label]) => (
            <button
              key={value || 'any'}
              type="button"
              onClick={() => setFilter({ ac: value })}
              aria-pressed={filters.ac === value}
              className={`rounded-lg py-1.5 text-sm font-medium transition ${filters.ac === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-3 mb-1.5 text-xs font-medium text-slate-500">Sharing (students per room)</p>
        <div className="flex flex-wrap gap-1.5">
          {SHARING.map(([value, label]) => {
            const on = sharingSet.has(value);
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleSharing(value)}
                aria-pressed={on}
                className={`chip min-w-11 justify-center px-2.5 py-1 text-xs ${on ? 'chip-on' : 'chip-off'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label">Yearly fee (₹ per student)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="5000"
            className="input"
            placeholder="Min"
            value={filters.min_fee}
            onChange={(e) => setFilter({ min_fee: e.target.value })}
            aria-label="Minimum yearly fee"
          />
          <span className="text-slate-400">–</span>
          <input
            type="number"
            min="0"
            step="5000"
            className="input"
            placeholder="Max"
            value={filters.max_fee}
            onChange={(e) => setFilter({ max_fee: e.target.value })}
            aria-label="Maximum yearly fee"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {BUDGETS.map(([min, max, label]) => {
            const on = filters.min_fee === min && filters.max_fee === max;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(on ? { min_fee: '', max_fee: '' } : { min_fee: min, max_fee: max })}
                className={`chip px-2.5 py-1 text-xs ${on ? 'chip-on' : 'chip-off'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] leading-4 text-slate-400">Room + mess for the academic year, excluding refundable deposits.</p>
      </div>

      <div>
        <p className="label">Mess</p>
        <div className="flex flex-wrap gap-1.5">
          {MESS_FILTERS.map((m) => {
            const Icon = amenityIcon(m.key);
            const on = amenitySet.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => toggleAmenity(m.key)}
                aria-pressed={on}
                className={`chip px-3 py-1 text-xs ${on ? 'chip-on' : 'chip-off'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label">Minimum rating</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            ['', 'Any'],
            ['3', '3+'],
            ['4', '4+'],
            ['4.5', '4.5+'],
          ].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilter({ min_rating: value })}
              className={`chip px-3 py-1 text-xs ${filters.min_rating === value ? 'chip-on' : 'chip-off'}`}
            >
              {value && <Star className="h-3 w-3" fill="currentColor" strokeWidth={0} />}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Amenities</p>
        <div className="space-y-3">
          {(meta?.amenity_groups ?? [{ key: null, label: '' }]).map((g) => {
            const items = (meta?.amenities ?? []).filter((a) => !MESS_KEYS.includes(a.key) && (g.key === null || a.group === g.key));
            if (!items.length) return null;
            return (
              <div key={g.key ?? 'all'}>
                {g.label && <p className="mb-1.5 text-xs font-medium text-slate-500">{g.label}</p>}
                <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1 xl:grid-cols-2">
                  {items.map((a) => {
                    const Icon = amenityIcon(a.key);
                    const on = amenitySet.has(a.key);
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => toggleAmenity(a.key)}
                        aria-pressed={on}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium ring-1 transition ring-inset ${
                          on ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-brand-700' : 'text-slate-400'}`} />
                        <span className="truncate">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
        <span className="text-sm font-medium text-slate-700">Only hostels with free beds</span>
        <input
          type="checkbox"
          className="h-4 w-4 accent-brand-700"
          checked={filters.available === 'true'}
          onChange={(e) => setFilter({ available: e.target.checked ? 'true' : '' })}
        />
      </label>

      {activeChips.length > 0 && (
        <button onClick={resetAll} className="btn btn-secondary w-full">
          <RotateCcw className="h-4 w-4" /> Reset filters
        </button>
      )}
    </div>
  );

  const page = Number(filters.page) || 1;

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Explore hostels</h1>
          <p className="mt-1 text-slate-500">Only moderator-approved listings are shown.</p>
        </div>
        {canContribute && (
          <Link to="/hostels/new" className="btn btn-secondary">
            <Building2 className="h-4 w-4" /> Missing a hostel? Add it
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 pb-4">{filterPanel}</div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {loading && !data ? (
                'Searching…'
              ) : (
                <>
                  <span className="font-semibold text-slate-900">{data?.total ?? 0}</span> hostel{data?.total === 1 ? '' : 's'} found
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary btn-sm lg:hidden" onClick={() => setShowFilters((v) => !v)}>
                <SlidersHorizontal className="h-4 w-4" /> Filters {activeChips.length > 0 && `(${activeChips.length})`}
              </button>
              <label className="sr-only" htmlFor="sort">
                Sort by
              </label>
              <select id="sort" className="input w-auto py-1.5" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
                {SORTS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showFilters && <div className="card mt-4 p-4 lg:hidden">{filterPanel}</div>}

          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map(([key, label]) => (
                <button
                  key={Array.isArray(key) ? key.join() : key}
                  onClick={() => removeChip(key)}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-1 pr-2 pl-3 text-xs font-medium text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100"
                >
                  {label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))}
              <button onClick={resetAll} className="text-xs font-medium text-slate-500 hover:text-slate-800">
                Clear all
              </button>
            </div>
          )}

          <div className="mt-5">
            {error ? (
              <ErrorState error={error} onRetry={reload} />
            ) : loading && !data ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : data?.hostels.length ? (
              <div className={`grid gap-6 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
                {data.hostels.map((h) => (
                  <HostelCard key={h.hostel_id} hostel={h} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title="No hostels match these filters"
                action={
                  <button onClick={resetAll} className="btn btn-secondary">
                    <RotateCcw className="h-4 w-4" /> Reset filters
                  </button>
                }
              >
                Try a wider budget, another sharing option, fewer amenities or another college.
              </EmptyState>
            )}
          </div>

          {data && (
            <div className="mt-8">
              <Pagination page={page} pages={data.pages} onChange={(p) => setFilter({ page: String(p) })} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
