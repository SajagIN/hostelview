import { amenityIcon, amenityKeys } from '../lib/amenities.js';
import { useMeta } from '../context/MetaContext.jsx';

function AmenityItems({ keys, labelFor }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {keys.map((key) => {
        const Icon = amenityIcon(key);
        return (
          <li key={key} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200/70">
            <Icon className="h-4.5 w-4.5 shrink-0 text-brand-700" />
            {labelFor(key)}
          </li>
        );
      })}
    </ul>
  );
}

export function AmenityList({ amenities, className = '' }) {
  const { meta, labelFor } = useMeta();
  const keys = amenityKeys(amenities, meta?.amenities);
  if (!keys.length) return <p className="text-sm text-slate-500">No amenities listed yet.</p>;

  const groups = meta?.amenity_groups;
  if (!groups?.length || keys.length < 6) {
    return (
      <div className={className}>
        <AmenityItems keys={keys} labelFor={labelFor} />
      </div>
    );
  }
  const groupOf = new Map((meta.amenities ?? []).map((a) => [a.key, a.group]));
  const sections = [...groups, { key: 'other', label: 'Other' }]
    .map((g) => ({ ...g, keys: keys.filter((k) => (groupOf.get(k) ?? 'other') === g.key) }))
    .filter((g) => g.keys.length);
  return (
    <div className={`space-y-4 ${className}`}>
      {sections.map((g) => (
        <div key={g.key}>
          <p className="mb-2 text-xs font-medium text-slate-500">{g.label}</p>
          <AmenityItems keys={g.keys} labelFor={labelFor} />
        </div>
      ))}
    </div>
  );
}

const CARD_PRIORITY = ['wifi', 'attached_bathroom', 'laundry', 'gym', 'reading_room', 'lift', 'hot_water', 'power_backup'];

export function AmenityIcons({ amenities, max = 5, exclude = [], className = '' }) {
  const { meta, labelFor } = useMeta();
  const rank = (k) => {
    const i = CARD_PRIORITY.indexOf(k);
    return i === -1 ? CARD_PRIORITY.length : i;
  };
  const keys = amenityKeys(amenities, meta?.amenities)
    .filter((k) => !exclude.includes(k))
    .map((k, i) => [k, i])
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1])
    .map(([k]) => k);
  if (!keys.length) return null;
  const extra = keys.length - max;
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {keys.slice(0, max).map((key) => {
        const Icon = amenityIcon(key);
        return (
          <span key={key} title={labelFor(key)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{labelFor(key)}</span>
          </span>
        );
      })}
      {extra > 0 && <span className="text-xs font-medium text-slate-500">+{extra}</span>}
    </div>
  );
}
