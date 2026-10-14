import { useCallback, useEffect, useRef, useState } from 'react';

export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setState((s) => ({ ...s, loading: false }));
      return undefined;
    }
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch((error) => active && setState((s) => ({ data: s.data, loading: false, error })));
    return () => {
      active = false;
    };
  }, [...deps, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback(
    (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
    [],
  );
  return { ...state, reload, setData };
}

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · HostelView` : 'HostelView — see the hostel before you move in';
  }, [title]);
}
