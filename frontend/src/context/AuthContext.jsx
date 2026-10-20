import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Re-verify session on mount
  useEffect(() => {
    async function initAuth() {
      const token = getToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        setUser(res.user);
      } catch (err) {
        console.warn('Initial session expired or invalid:', err.message);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password, requestedRole = null) => {
    const res = await api.post('/auth/login', { email, password, requestedRole });
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    setToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const switchRole = async (targetRole) => {
    const res = await api.post('/auth/switch-role', { targetRole });
    setToken(res.token);
    setUser(prev => ({
      ...prev,
      activeRole: res.activeRole,
      availableRoles: res.availableRoles
    }));
    return res.activeRole;
  };

  const requestRole = async (role) => {
    const res = await api.post('/profiles/request-role', { role });
    setUser(prev => ({
      ...prev,
      availableRoles: res.availableRoles
    }));
    return res;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      // Ignore logout errors
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.user);
    } catch (e) {}
  };

  const value = {
    user,
    loading,
    activeRole: user?.activeRole || 'student',
    availableRoles: user?.availableRoles || [],
    login,
    register,
    switchRole,
    requestRole,
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
