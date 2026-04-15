import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('kasi_token'));

  const fetchUser = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const data = await api.getMe();
      setUser(data.user);
      setProviderProfile(data.providerProfile);
    } catch {
      localStorage.removeItem('kasi_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('kasi_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await api.register(formData);
    localStorage.setItem('kasi_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('kasi_token');
    setToken(null);
    setUser(null);
    setProviderProfile(null);
  };

  const updateUser = (updatedUser) => setUser(updatedUser);

  const isProvider = user && (user.role === 'provider' || user.role === 'both');
  const isAdmin = user && user.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, providerProfile, loading, token,
      login, register, logout, updateUser, fetchUser, setUser,
      isProvider, isAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
