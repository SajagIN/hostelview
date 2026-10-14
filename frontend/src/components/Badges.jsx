import { CircleCheck, CircleX, Fan, Hourglass, ShieldCheck, Snowflake } from 'lucide-react';
import { HOSTEL_TYPES } from '../lib/format.js';

const STATUS = {
  pending: { label: 'Pending', icon: Hourglass, cls: 'bg-amber-50 text-amber-800 ring-amber-600/25' },
  approved: { label: 'Approved', icon: CircleCheck, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  rejected: { label: 'Rejected', icon: CircleX, cls: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
};

export function StatusBadge({ status, className = '' }) {
  const s = STATUS[status] ?? STATUS.pending;
  const Icon = s.icon;
  return (
    <span className={`badge ${s.cls} ${className}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

export function TypeBadge({ type, solid = false, className = '' }) {
  const t = HOSTEL_TYPES[type];
  if (!t) return null;
  return <span className={`badge ${solid ? `${t.solid} shadow-sm` : t.cls} ${className}`}>{t.label}</span>;
}

const ROLES = {
  visitor: { label: 'Visitor', cls: 'bg-slate-100 text-slate-700 ring-slate-500/20' },
  student: { label: 'Student', cls: 'bg-brand-50 text-brand-800 ring-brand-600/20' },
  admin: { label: 'Admin', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
};

export function RoleBadge({ role, className = '' }) {
  const r = ROLES[role] ?? ROLES.visitor;
  return <span className={`badge ${r.cls} ${className}`}>{r.label}</span>;
}

export function VerifiedBadge({ label = 'Verified student', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-brand-700 ${className}`} title="College email verified with a one-time code">
      <ShieldCheck className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function AcBadge({ ac, className = '' }) {
  return ac ? (
    <span className={`badge bg-sky-50 text-sky-700 ring-sky-600/20 ${className}`}>
      <Snowflake className="h-3 w-3" />
      AC
    </span>
  ) : (
    <span className={`badge bg-slate-100 text-slate-600 ring-slate-500/20 ${className}`}>
      <Fan className="h-3 w-3" />
      Non-AC
    </span>
  );
}
