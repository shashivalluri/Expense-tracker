import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const getAccessToken = () => {
  return localStorage.getItem('bt_access_token') ||
    sessionStorage.getItem('bt_access_token') ||
    localStorage.getItem('bt_token') ||
    sessionStorage.getItem('bt_token');
};

const getRefreshToken = () => {
  return localStorage.getItem('bt_refresh_token') || sessionStorage.getItem('bt_refresh_token');
};

const clearAuthStorage = () => {
  ['bt_token', 'bt_access_token', 'bt_refresh_token', 'bt_user', 'aura_token', 'aura_user'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRoute = [
      '/auth/login',
      '/auth/register',
      '/auth/forgotpassword',
      '/auth/resetpassword',
      '/auth/refresh',
      '/auth/verify',
    ].some((route) => requestUrl.includes(route));

    if (error.response?.status === 401 && !isAuthRoute && !error.config?._retry) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          error.config._retry = true;
          const refreshRes = await api.post('/auth/refresh', { refreshToken });
          const storage = localStorage.getItem('bt_refresh_token') ? localStorage : sessionStorage;
          const accessToken = refreshRes.data.accessToken || refreshRes.data.token;

          storage.setItem('bt_access_token', accessToken);
          storage.setItem('bt_refresh_token', refreshRes.data.refreshToken);
          storage.setItem('bt_user', JSON.stringify(refreshRes.data.user));

          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return api(error.config);
        } catch (refreshError) {
          console.warn('[API] Session refresh failed');
        }
      }

      clearAuthStorage();
      window.location.href = '/login?expired=true';
    }

    return Promise.reject(error);
  }
);

export default api;
