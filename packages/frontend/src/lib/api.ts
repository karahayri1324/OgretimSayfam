import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Multi-tenant: add school slug header for localhost dev
    const schoolSlug = localStorage.getItem('schoolSlug');
    if (schoolSlug) {
      config.headers['X-School-Slug'] = schoolSlug;
    }
  }
  return config;
});

// Response interceptor - handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          if (data?.data?.accessToken && data?.data?.refreshToken) {
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return api(originalRequest);
          }
          throw new Error('Invalid refresh response');
        } catch (refreshError) {
          console.warn('Token refresh failed:', refreshError instanceof Error ? refreshError.message : 'Unknown error');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('schoolSlug');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('schoolSlug');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
