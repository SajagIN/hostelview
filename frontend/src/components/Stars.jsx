import { useState } from 'react';
import { Star } from 'lucide-react';
import { RATING_WORDS } from '../lib/format.js';

export function StarRating({ value = 0, size = 'h-4 w-4', className = '' }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
      <span className="flex text-slate-200">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={size} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={`${size} shrink-0`} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
    </span>
  );
}

export function RatingPill({ rating, count, className = '' }) {
  if (!count) {
    return <span className={`badge bg-slate-100 text-slate-500 ring-slate-200 ${className}`}>New</span>;
  }
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-900 ring-1 ring-amber-200 ring-inset ${className}`}>
      <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" strokeWidth={0} />
      {Number(rating).toFixed(1)}
      <span className="font-normal text-amber-800/70">({count})</span>
    </span>
  );
}

export function StarInput({ value, onChange, size = 'h-8 w-8' }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''} — ${RATING_WORDS[n]}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-brand-600"
          >
            <Star
              className={`${size} ${n <= shown ? 'text-amber-400' : 'text-slate-200'}`}
              fill="currentColor"
              strokeWidth={0}
            />
          </button>
        ))}
      </div>
      <span className="w-20 text-sm font-medium text-slate-600">{RATING_WORDS[shown] || ''}</span>
    </div>
  );
}
