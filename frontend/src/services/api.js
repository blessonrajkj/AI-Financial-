import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Shared Axios client instance with standard defaults
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Configure default authorization header if token exists on load
const initialToken = localStorage.getItem('token');
if (initialToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

// Request interceptor ensuring current token is attached
api.interceptors.request.use(
  (config) => {
    const activeToken = localStorage.getItem('token');
    if (activeToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with global 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        // Let AuthContext handle session state; avoid crashing in interceptor
        console.warn('API returned 401 Unauthorized for path:', currentPath);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
