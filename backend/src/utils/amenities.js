export const AMENITY_GROUPS = [
  { key: 'food', label: 'Mess & food' },
  { key: 'room', label: 'Room & bathroom' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'safety', label: 'Safety & care' },
];

export const AMENITIES = [
  { key: 'veg_mess', label: 'Veg mess', group: 'food' },
  { key: 'nonveg_mess', label: 'Non-veg mess', group: 'food' },
  { key: 'special_mess', label: 'Special / premium mess', group: 'food' },
  { key: 'mess', label: 'Mess / dining hall', group: 'food' },
  { key: 'night_canteen', label: 'Night canteen', group: 'food' },
  { key: 'ro_water', label: 'RO drinking water', group: 'food' },
  { key: 'attached_bathroom', label: 'Attached bathrooms', group: 'room' },
  { key: 'hot_water', label: 'Hot water', group: 'room' },
  { key: 'laundry', label: 'Laundry service', group: 'room' },
  { key: 'housekeeping', label: 'Room cleaning', group: 'room' },
  { key: 'lift', label: 'Lift', group: 'room' },
  { key: 'wifi', label: 'Wi-Fi', group: 'facilities' },
  { key: 'gym', label: 'Gym', group: 'facilities' },
  { key: 'reading_room', label: 'Study / reading room', group: 'facilities' },
  { key: 'common_room', label: 'TV / common room', group: 'facilities' },
  { key: 'sports', label: 'Sports & games', group: 'facilities' },
  { key: 'water_24x7', label: '24×7 water', group: 'facilities' },
  { key: 'power_backup', label: 'Power backup', group: 'facilities' },
  { key: 'parking', label: 'Cycle / bike parking', group: 'facilities' },
  { key: 'security', label: '24×7 security', group: 'safety' },
  { key: 'cctv', label: 'CCTV', group: 'safety' },
  { key: 'medical', label: 'Medical room / doctor', group: 'safety' },
  { key: 'warden', label: 'Resident warden', group: 'safety' },
];

export const AMENITY_KEY_RE = /^[a-z0-9_]{2,30}$/;

const toAmenityKey = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);

// ["wifi", "Swimming pool"] or {wifi: true, gym: false} → {wifi: true, swimming_pool: true}
export function normalizeAmenities(input) {
  if (!input) return {};
  let keys = [];
  if (Array.isArray(input)) keys = input;
  else if (typeof input === 'object') keys = Object.keys(input).filter((k) => input[k] === true || input[k] === 1 || input[k] === 'true');
  else if (typeof input === 'string') keys = input.split(',');
  const amenities = {};
  for (const key of keys.map(toAmenityKey)) if (AMENITY_KEY_RE.test(key)) amenities[key] = true;
  return amenities;
}
