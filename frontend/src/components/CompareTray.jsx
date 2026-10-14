import { Link, useLocation } from 'react-router-dom';
import { GitCompareArrows, X } from 'lucide-react';
import { useCompare } from '../context/CompareContext.jsx';
import HostelCover from './HostelCover.jsx';

export default function CompareTray() {
  const { items, remove, clear, max } = useCompare();
  const { pathname } = useLocation();
  if (!items.length || pathname === '/compare' || pathname.startsWith('/admin')) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-full animate-slide-up items-center gap-3 rounded-2xl bg-slate-900 p-2 pl-3 text-white shadow-2xl ring-1 ring-white/10">
        <GitCompareArrows className="hidden h-5 w-5 shrink-0 text-brand-300 sm:block" />
        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto">
          {items.map((h) => (
            <div key={h.hostel_id} className="group relative flex shrink-0 items-center gap-2 rounded-xl bg-white/10 py-1 pr-2 pl-1">
              <HostelCover src={h.cover_url} alt="" className="h-8 w-8 rounded-lg" label="" />
              <span className="max-w-[8rem] truncate text-sm">{h.name}</span>
              <button onClick={() => remove(h.hostel_id)} className="rounded p-0.5 text-white/60 hover:text-white" aria-label={`Remove ${h.name}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {items.length < max && <span className="hidden shrink-0 text-xs text-white/50 sm:block">+{max - items.length} more</span>}
        </div>
        <button onClick={clear} className="hidden shrink-0 rounded-lg px-2 py-1.5 text-xs text-white/60 hover:text-white sm:block">
          Clear
        </button>
        <Link to="/compare" className="btn btn-sm shrink-0 bg-brand-500 text-white hover:bg-brand-400">
          Compare {items.length}
        </Link>
      </div>
    </div>
  );
}
