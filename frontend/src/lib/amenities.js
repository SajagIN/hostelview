import {
  ArrowUpDown,
  Bath,
  BatteryCharging,
  Bike,
  BookOpen,
  Cctv,
  ChefHat,
  CircleCheck,
  Droplets,
  Drumstick,
  Dumbbell,
  GlassWater,
  Moon,
  Salad,
  ShieldCheck,
  ShowerHead,
  Sparkles,
  Stethoscope,
  Trophy,
  Tv,
  UserCheck,
  UtensilsCrossed,
  WashingMachine,
  Wifi,
} from 'lucide-react';

const AMENITY_ICONS = {
  veg_mess: Salad,
  nonveg_mess: Drumstick,
  special_mess: ChefHat,
  mess: UtensilsCrossed,
  night_canteen: Moon,
  ro_water: GlassWater,
  attached_bathroom: Bath,
  hot_water: ShowerHead,
  laundry: WashingMachine,
  housekeeping: Sparkles,
  lift: ArrowUpDown,
  wifi: Wifi,
  gym: Dumbbell,
  reading_room: BookOpen,
  common_room: Tv,
  sports: Trophy,
  water_24x7: Droplets,
  power_backup: BatteryCharging,
  parking: Bike,
  security: ShieldCheck,
  cctv: Cctv,
  medical: Stethoscope,
  warden: UserCheck,
};

export const MESS_FILTERS = [
  { key: 'veg_mess', label: 'Veg' },
  { key: 'nonveg_mess', label: 'Non-veg' },
  { key: 'special_mess', label: 'Special' },
];

export const MESS_KEYS = MESS_FILTERS.map((m) => m.key);

export const amenityIcon = (key) => AMENITY_ICONS[key] || CircleCheck;

const prettifyKey = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const amenityLabel = (key, catalog) => catalog?.find((a) => a.key === key)?.label || prettifyKey(key);

export function amenityKeys(obj, catalog) {
  const keys = Object.entries(obj || {})
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (!catalog) return keys;
  const order = new Map(catalog.map((a, i) => [a.key, i]));
  return keys.sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b));
}

export const toAmenityKey = (s) =>
  String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
