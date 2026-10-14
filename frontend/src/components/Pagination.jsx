import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const nums = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button className="btn btn-ghost btn-icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
        <ChevronLeft className="h-5 w-5" />
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`gap${i}`} className="px-2 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={n}
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold ${n === page ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {n}
          </button>
        ),
      )}
      <button className="btn btn-ghost btn-icon" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );
}
