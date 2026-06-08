import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bt_token') || sessionStorage.getItem('bt_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Initialize and verify user on boot
  useEffect(() => {
    const bootstrapUser = async () => {
      const storedToken = localStorage.getItem('bt_token') || sessionStorage.getItem('bt_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error('[Bootstrap] Token validation failed:', err.message);
          handleLogout();
        }
      }
      setLoading(false);
    };
    bootstrapUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('bt_token');
    localStorage.removeItem('bt_user');
    sessionStorage.removeItem('bt_token');
    sessionStorage.removeItem('bt_user');
    // Also clean legacy keys if present
    localStorage.removeItem('aura_token');
    localStorage.removeItem('aura_user');
    sessionStorage.removeItem('aura_token');
    sessionStorage.removeItem('aura_user');
    setUser(null);
    setToken(null);
  };

  // Register User
  const register = async (username, email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      // ✅ FIX: Normalize email before sending
      const normalizedEmail = email.toLowerCase().trim();
      const res = await api.post('/auth/register', { username, email: normalizedEmail, password });
      if (res.data.success) {
        const { token: jwtToken, user: profile } = res.data;
        // Registration defaults to persistent login unless specified
        localStorage.setItem('bt_token', jwtToken);
        localStorage.setItem('bt_user', JSON.stringify(profile));
        setToken(jwtToken);
        setUser(profile);
        return true;
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Registration failed. Please try again.';
      setAuthError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Login User
  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    setAuthError(null);
    try {
      // ✅ FIX: Normalize email before sending — prevents case mismatch failures
      const normalizedEmail = email.toLowerCase().trim();
      console.log('[Auth] Attempting login for:', normalizedEmail);
      const res = await api.post('/auth/login', { email: normalizedEmail, password });
      if (res.data.success) {
        const { token: jwtToken, user: profile } = res.data;
        
        if (rememberMe) {
          localStorage.setItem('bt_token', jwtToken);
          localStorage.setItem('bt_user', JSON.stringify(profile));
        } else {
          sessionStorage.setItem('bt_token', jwtToken);
          sessionStorage.setItem('bt_user', JSON.stringify(profile));
        }
        
        setToken(jwtToken);
        setUser(profile);
        console.log('[Auth] Login successful for:', normalizedEmail);
        return true;
      }
    } catch (err) {
      // ✅ FIX: Show the exact error message from the server (not a generic one)
      const message = err.response?.data?.error || 'Login failed. Please check your email and password.';
      console.error('[Auth] Login failed:', message);
      setAuthError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout User
  const logout = () => {
    handleLogout();
  };

  // Update Settings (Theme, Currency, Language)
  const updateSettings = async (settingsData) => {
    try {
      const res = await api.put('/auth/settings', settingsData);
      if (res.data.success) {
        const updated = res.data.user;
        if (localStorage.getItem('bt_token')) {
          localStorage.setItem('bt_user', JSON.stringify(updated));
        } else if (sessionStorage.getItem('bt_token')) {
          sessionStorage.setItem('bt_user', JSON.stringify(updated));
        }
        setUser(updated);
        return true;
      }
    } catch (err) {
      console.error('[Settings] Update failed:', err.message);
      return false;
    }
  };

  // Forgot Password Trigger
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

  // Reset Password Action
  const resetPassword = async (code, password) => {
    setAuthError(null);
    try {
      const res = await api.put(`/auth/resetpassword/${code}`, { password });
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
      clearError: () => setAuthError(null)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
