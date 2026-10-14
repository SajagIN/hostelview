import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useToast } from './ToastContext.jsx';

const CompareContext = createContext(null);
const KEY = 'hv_compare';
const MAX = 4;

const load = () => {
  try {
    const items = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(items) ? items.slice(0, MAX) : [];
  } catch {
    return [];
  }
};

export function CompareProvider({ children }) {
  const [items, setItems] = useState(load);
  const toast = useToast();

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const has = useCallback((id) => items.some((i) => i.hostel_id === id), [items]);

  const toggle = useCallback(
    (h) => {
      if (items.some((i) => i.hostel_id === h.hostel_id)) {
        setItems((list) => list.filter((i) => i.hostel_id !== h.hostel_id));
        return;
      }
      if (items.length >= MAX) {
        toast.info(`You can compare up to ${MAX} hostels at a time.`);
        return;
      }
      setItems((list) => [
        ...list,
        { hostel_id: h.hostel_id, name: h.name, cover_url: h.cover_url ?? null, college: h.college?.name ?? h.college_name ?? '' },
      ]);
    },
    [items, toast],
  );

  const remove = useCallback((id) => setItems((list) => list.filter((i) => i.hostel_id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(() => ({ items, has, toggle, remove, clear, max: MAX }), [items, has, toggle, remove, clear]);
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
