import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const schoolSlug = localStorage.getItem('schoolSlug');
    if (schoolSlug) {
      config.headers['X-School-Slug'] = schoolSlug;
    }
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (typeof window === 'undefined') return Promise.reject(error);

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        isRefreshing = true;
        try {
          const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          if (data?.data?.accessToken && data?.data?.refreshToken) {
            localStorage.setItem('accessToken', data.data.accessToken);
            localStorage.setItem('refreshToken', data.data.refreshToken);
            isRefreshing = false;
            onTokenRefreshed(data.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return api(originalRequest);
          }
          throw new Error('Invalid refresh response');
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('schoolSlug');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('schoolSlug');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
