import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await api.get('/auth/me');
      setUser(data.user);
      setVerification(data.verification);
      return data.user;
    } catch (err) {
      if (err.status === 401) {
        tokenStore.clear();
        setUser(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => {
      tokenStore.clear();
      setUser(null);
      setVerification(null);
    };
    window.addEventListener('hv:unauthorized', onUnauthorized);
    return () => window.removeEventListener('hv:unauthorized', onUnauthorized);
  }, []);

  const applySession = useCallback((data) => {
    if (data.token) tokenStore.set(data.token);
    if (data.user) setUser(data.user);
    if (data.verification) setVerification(data.verification);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await api.post('/auth/login', { email, password });
      applySession(data);
      return data.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.post('/auth/register', payload);
      applySession(data);
      return data;
    },
    [applySession],
  );

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setVerification(null);
  }, []);

  const value = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    const isVerifiedStudent = user?.role === 'student' && user?.is_verified;
    return {
      user,
      loading,
      verification,
      setVerification,
      refresh,
      login,
      register,
      logout,
      applySession,
      isAdmin,
      isVerifiedStudent,
      canContribute: Boolean(isAdmin || isVerifiedStudent),
      needsVerification: user?.role === 'student' && !user?.is_verified,
    };
  }, [user, loading, verification, refresh, login, register, logout, applySession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
