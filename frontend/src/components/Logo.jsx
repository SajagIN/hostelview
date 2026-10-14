export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0f766e" />
      <path d="M13 30.5 32 15l19 15.5V48a3 3 0 0 1-3 3H16a3 3 0 0 1-3-3z" fill="#fff" />
      <path d="M20.5 38.5c3.3-4.6 7.1-6.9 11.5-6.9s8.2 2.3 11.5 6.9c-3.3 4.6-7.1 6.9-11.5 6.9s-8.2-2.3-11.5-6.9z" fill="#0f766e" />
      <circle cx="32" cy="38.5" r="3.8" fill="#fff" />
    </svg>
  );
}

export default function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Hostel<span className={light ? 'text-brand-300' : 'text-brand-700'}>View</span>
      </span>
    </span>
  );
}
