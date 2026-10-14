import { Link } from 'react-router-dom';
import { BedDouble, Check, GitCompareArrows, MapPin, Salad, Snowflake, Users } from 'lucide-react';
import { useCompare } from '../context/CompareContext.jsx';
import { MESS_FILTERS, MESS_KEYS } from '../lib/amenities.js';
import { acSummary, formatYearly, sharingSummary, toYearly } from '../lib/format.js';
import { AmenityIcons } from './AmenityList.jsx';
import { TypeBadge } from './Badges.jsx';
import HostelCover from './HostelCover.jsx';
import { RatingPill } from './Stars.jsx';


export default function HostelCard({ hostel }) {
  const { has, toggle } = useCompare();
  const inCompare = has(hostel.hostel_id);
  const to = `/hostels/${hostel.hostel_id}`;

  const matched = hostel.match_min_price !== undefined && hostel.match_min_price !== null;
  const fromPrice = matched ? hostel.match_min_price : hostel.min_price;
  const ac = acSummary(hostel);
  const sharing = sharingSummary(hostel.sharing);
  const mess = MESS_FILTERS.filter((m) => hostel.amenities?.[m.key]).map((m) => m.label);

  return (
    <article className="group card relative flex flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/80">
      <Link to={to} className="block" tabIndex={-1} aria-hidden="true">
        <HostelCover
          src={hostel.cover_url}
          alt={hostel.name}
          type={hostel.type}
          className="aspect-[16/10]"
          imgClassName="transition duration-500 group-hover:scale-[1.03]"
        >
          <div className="absolute top-3 left-3">
            <TypeBadge type={hostel.type} solid />
          </div>
        </HostelCover>
      </Link>

      <button
        type="button"
        onClick={() => toggle(hostel)}
        aria-pressed={inCompare}
        title={inCompare ? 'Remove from compare' : 'Add to compare'}
        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition ${
          inCompare ? 'bg-brand-700 text-white' : 'bg-white/90 text-slate-700 hover:bg-white'
        }`}
      >
        {inCompare ? <Check className="h-3.5 w-3.5" /> : <GitCompareArrows className="h-3.5 w-3.5" />}
        {inCompare ? 'Comparing' : 'Compare'}
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-base leading-snug font-semibold text-slate-900">
              <Link to={to} className="hover:text-brand-700">
                {hostel.name}
              </Link>
            </h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {hostel.college.name} · {hostel.college.city}
              </span>
            </p>
          </div>
          <RatingPill rating={hostel.avg_rating} count={hostel.review_count} />
        </div>

        {(ac || sharing || mess.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ac && (
              <span className={`badge ${hostel.ac_room_count > 0 ? 'bg-sky-50 text-sky-700 ring-sky-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'}`}>
                <Snowflake className="h-3 w-3" /> {ac}
              </span>
            )}
            {sharing && (
              <span className="badge bg-slate-100 text-slate-700 ring-slate-500/20">
                <Users className="h-3 w-3" /> {sharing}
              </span>
            )}
            {mess.length > 0 && (
              <span className="badge bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                <Salad className="h-3 w-3" /> {mess.join(' · ')}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-slate-500">{fromPrice !== null ? (matched ? 'Matching rooms from' : 'From') : '\u00a0'}</p>
            <p className="text-lg font-bold text-slate-900" title={fromPrice !== null ? `≈ ₹${Math.round(toYearly(fromPrice) / 12).toLocaleString('en-IN')} per month` : undefined}>
              {fromPrice !== null ? (
                <>
                  {formatYearly(fromPrice)}
                  <span className="text-sm font-normal text-slate-500">/year</span>
                </>
              ) : (
                <span className="text-sm font-medium text-slate-400">Price not listed</span>
              )}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${hostel.free_beds > 0 ? 'text-emerald-700' : 'text-slate-400'}`}
          >
            <BedDouble className="h-3.5 w-3.5" />
            {hostel.free_beds > 0 ? `${hostel.free_beds} bed${hostel.free_beds === 1 ? '' : 's'} free` : 'Currently full'}
          </span>
        </div>

        <AmenityIcons amenities={hostel.amenities} max={5} exclude={MESS_KEYS} className="mt-3 border-t border-slate-100 pt-3" />
      </div>
    </article>
  );
}
