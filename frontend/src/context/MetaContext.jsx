import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { amenityLabel } from '../lib/amenities.js';

const MetaContext = createContext(null);

export function MetaProvider({ children }) {
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      setMeta(await api.get('/meta'));
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ meta, error, reload, labelFor: (key) => amenityLabel(key, meta?.amenities) }),
    [meta, error, reload],
  );
  return <MetaContext.Provider value={value}>{children}</MetaContext.Provider>;
}

export const useMeta = () => useContext(MetaContext);
