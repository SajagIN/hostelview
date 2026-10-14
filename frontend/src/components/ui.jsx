import { Loader2 } from 'lucide-react';
import { initials } from '../lib/format.js';

function Spinner({ className = 'h-5 w-5' }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-slate-500">
      <Spinner className="h-8 w-8" />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-12 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-slate-500">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-2xl bg-rose-50 p-6 text-center ring-1 ring-rose-200">
      <p className="font-semibold text-rose-800">Couldn&apos;t load this page</p>
      <p className="mt-1 text-sm text-rose-700">{error?.message || 'Unknown error'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary btn-sm mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function Field({ label, error, hint, required, children, htmlFor, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

const AVATAR_COLORS = ['bg-brand-600', 'bg-sky-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-emerald-600', 'bg-indigo-600'];

export function Avatar({ name = '', size = 'h-9 w-9 text-sm', className = '' }) {
  const color = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${color} ${size} ${className}`}>
      {initials(name) || '?'}
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3" />
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-brand-600' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}
