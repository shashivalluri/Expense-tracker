import axios from 'axios';

// Define unified Axios instance pointing to the Express server
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000 // 15 second timeout
});

// Request Interceptor: Inject JWT token into headers for every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bt_token') || sessionStorage.getItem('bt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Debug log: uncomment to trace API calls
    // console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Only redirect on 401 for PROTECTED routes, NOT for auth routes
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // ✅ FIX: Skip redirect for auth routes (login, register, forgotpassword, resetpassword)
    // Without this fix, a failed login (wrong password → 401) would cause a redirect loop
    const requestUrl = error.config?.url || '';
    const isAuthRoute = requestUrl.includes('/auth/login') ||
                        requestUrl.includes('/auth/register') ||
                        requestUrl.includes('/auth/forgotpassword') ||
                        requestUrl.includes('/auth/resetpassword');

    if (error.response && error.response.status === 401 && !isAuthRoute) {
      // Only clean storage and redirect if a PROTECTED route returns 401 (token expired/invalid)
      const token = localStorage.getItem('bt_token') || sessionStorage.getItem('bt_token');
      if (token) {
        console.warn('[API] Session expired — redirecting to login');
        localStorage.removeItem('bt_token');
        localStorage.removeItem('bt_user');
        sessionStorage.removeItem('bt_token');
        sessionStorage.removeItem('bt_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
