import { StarRating } from './Stars.jsx';

export default function RatingBreakdown({ average, count, distribution }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="text-center sm:w-40">
        <p className="text-5xl font-bold tracking-tight text-slate-900">{count ? Number(average).toFixed(1) : '–'}</p>
        <StarRating value={average} size="h-5 w-5" className="mt-2" />
        <p className="mt-1 text-sm text-slate-500">
          {count ? `${count} approved review${count === 1 ? '' : 's'}` : 'No reviews yet'}
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = distribution?.[star] ?? 0;
          const pct = count ? (n / count) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-right text-slate-600">{star}★</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-6 text-slate-500">{n}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
