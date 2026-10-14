const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export const formatPrice = (n) => (n === null || n === undefined || n === '' ? '—' : inr.format(Number(n)));

function formatPriceRange(min, max) {
  if (min === null || min === undefined) return 'Price not listed';
  if (max === null || max === undefined || Number(min) === Number(max)) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export const toYearly = (monthly) => (monthly === null || monthly === undefined || monthly === '' ? null : Math.round(Number(monthly) * 12));

export const formatYearly = (monthly) => formatPrice(toYearly(monthly));

export function formatYearlyRange(minMonthly, maxMonthly) {
  return formatPriceRange(toYearly(minMonthly), toYearly(maxMonthly));
}

export function formatCompactInr(n) {
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (v >= 100000) return `₹${(v / 100000).toFixed(2).replace(/\.?0+$/, '')}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `₹${Math.round(v)}`;
}

export const sharingLabel = (capacity) => (Number(capacity) === 1 ? 'Single' : `${capacity}-sharing`);

export function sharingSummary(list) {
  if (!list?.length) return null;
  if (list.length === 1) return list[0] === 1 ? 'Single rooms' : `${list[0]}-sharing`;
  return `${list.join(' · ')}-sharing`;
}

export function sharingRange(list) {
  if (!list?.length) return null;
  if (list.length === 1) return list[0] === 1 ? 'Single' : `${list[0]}-sharing`;
  const consecutive = list.every((n, i) => i === 0 || n === list[i - 1] + 1);
  return consecutive ? `${list[0]}–${list[list.length - 1]}` : list.join(', ');
}

export function acSummary(h) {
  if (!h?.room_count) return null;
  if (h.ac_room_count > 0 && h.non_ac_room_count > 0) return 'AC & non-AC';
  if (h.ac_room_count > 0) return 'AC rooms';
  return 'Non-AC';
}

export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export function timeAgo(d) {
  if (!d) return '';
  const seconds = Math.round((new Date(d).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), 'day');
  if (abs < 86400 * 365) return rtf.format(Math.round(seconds / (86400 * 30)), 'month');
  return rtf.format(Math.round(seconds / (86400 * 365)), 'year');
}

export const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const plural = (n, word, pluralWord) => `${n} ${n === 1 ? word : pluralWord || `${word}s`}`;

export function floorLabel(f) {
  if (f === null || f === undefined) return null;
  if (f === 0) return 'Ground floor';
  if (f < 0) return `Basement ${-f}`;
  const suffix = f % 10 === 1 && f !== 11 ? 'st' : f % 10 === 2 && f !== 12 ? 'nd' : f % 10 === 3 && f !== 13 ? 'rd' : 'th';
  return `${f}${suffix} floor`;
}

export const HOSTEL_TYPES = {
  boys: { label: 'Boys', cls: 'bg-sky-50 text-sky-700 ring-sky-600/20', solid: 'bg-sky-600 text-white ring-sky-600', gradient: 'from-sky-500 to-indigo-600' },
  girls: { label: 'Girls', cls: 'bg-pink-50 text-pink-700 ring-pink-600/20', solid: 'bg-pink-600 text-white ring-pink-600', gradient: 'from-pink-500 to-rose-600' },
  coed: { label: 'Co-ed', cls: 'bg-violet-50 text-violet-700 ring-violet-600/20', solid: 'bg-violet-600 text-white ring-violet-600', gradient: 'from-violet-500 to-brand-600' },
};

export const typeLabel = (t) => HOSTEL_TYPES[t]?.label ?? capitalize(t);

export const roomTypeLabel = (t) => capitalize(t || 'room');

export const RATING_WORDS = ['', 'Terrible', 'Poor', 'Average', 'Good', 'Excellent'];
