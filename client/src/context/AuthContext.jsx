import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

const clearStoredAuth = () => {
  ['bt_token', 'bt_access_token', 'bt_refresh_token', 'bt_user', 'aura_token', 'aura_user'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const getStoredAccessToken = () => {
  return localStorage.getItem('bt_access_token') ||
    sessionStorage.getItem('bt_access_token') ||
    localStorage.getItem('bt_token') ||
    sessionStorage.getItem('bt_token');
};

const getStoredRefreshToken = () => {
  return localStorage.getItem('bt_refresh_token') || sessionStorage.getItem('bt_refresh_token');
};

const getStorageForSession = () => {
  return localStorage.getItem('bt_refresh_token') || localStorage.getItem('bt_access_token') || localStorage.getItem('bt_token')
    ? localStorage
    : sessionStorage;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredAccessToken());
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const persistSession = ({ accessToken, token: legacyToken, refreshToken, user: profile }, rememberMe = false) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const finalAccessToken = accessToken || legacyToken;

    storage.setItem('bt_access_token', finalAccessToken);
    storage.setItem('bt_refresh_token', refreshToken);
    storage.setItem('bt_user', JSON.stringify(profile));
    storage.removeItem('bt_token');

    setToken(finalAccessToken);
    setUser(profile);
  };

  const handleLogout = async (notifyServer = false) => {
    if (notifyServer && getStoredAccessToken()) {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        console.warn('[Auth] Logout request failed:', err.response?.data?.error || err.message);
      }
    }

    clearStoredAuth();
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    const bootstrapUser = async () => {
      const storedToken = getStoredAccessToken();
      const refreshToken = getStoredRefreshToken();

      if (!storedToken && !refreshToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          setToken(storedToken);
        }
      } catch (err) {
        if (refreshToken) {
          try {
            const refreshRes = await api.post('/auth/refresh', { refreshToken });
            const storage = getStorageForSession();
            storage.setItem('bt_access_token', refreshRes.data.accessToken || refreshRes.data.token);
            storage.setItem('bt_refresh_token', refreshRes.data.refreshToken);
            storage.setItem('bt_user', JSON.stringify(refreshRes.data.user));
            setToken(refreshRes.data.accessToken || refreshRes.data.token);
            setUser(refreshRes.data.user);
          } catch (refreshErr) {
            console.warn('[Bootstrap] Session refresh failed:', refreshErr.response?.data?.error || refreshErr.message);
            await handleLogout(false);
          }
        } else {
          await handleLogout(false);
        }
      } finally {
        setLoading(false);
      }
    };

    bootstrapUser();
  }, []);

  const register = async (username, email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const res = await api.post('/auth/register', { username: username.trim(), email: normalizedEmail, password });
      if (res.data.success) {
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to create account right now. Please try again.';
      setAuthError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    setAuthError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const res = await api.post('/auth/login', { email: normalizedEmail, password });
      if (res.data.success) {
        persistSession(res.data, rememberMe);
        return true;
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please check your email and password.';
      setAuthError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => handleLogout(true);

  const updateSettings = async (settingsData) => {
    try {
      const res = await api.put('/auth/settings', settingsData);
      if (res.data.success) {
        const updated = res.data.user;
        const storage = getStorageForSession();
        storage.setItem('bt_user', JSON.stringify(updated));
        setUser(updated);
        return true;
      }
    } catch (err) {
      console.error('[Settings] Update failed:', err.response?.data?.error || err.message);
      return false;
    }
  };

  const forgotPassword = async (email) => {
    setAuthError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const res = await api.post('/auth/forgotpassword', { email: normalizedEmail });
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Password reset request failed.';
      setAuthError(message);
      throw err;
    }
  };

  const verifyEmail = async (email, token) => {
    setAuthError(null);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const res = await api.post('/auth/verify', { email: normalizedEmail, token });
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Email verification failed.';
      setAuthError(message);
      throw err;
    }
  };

  const resetPassword = async (resetToken, password) => {
    setAuthError(null);
    try {
      const res = await api.put(`/auth/resetpassword/${resetToken}`, { password });
      return res.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Password reset update failed.';
      setAuthError(message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      authError,
      register,
      login,
      logout,
      updateSettings,
      forgotPassword,
      resetPassword,
      verifyEmail,
      clearError: () => setAuthError(null),
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
