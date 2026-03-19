import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  school?: { id: string; name: string; slug: string } | null;
  teacherProfileId?: string;
  studentProfileId?: string;
  studentClassId?: string;
  parentProfileId?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (user.school?.slug) {
      localStorage.setItem('schoolSlug', user.school.slug);
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('schoolSlug');
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }
    // Decode JWT to get user info
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Check if expired
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('accessToken');
        set({ isLoading: false, isAuthenticated: false });
        return;
      }
      // Fetch fresh user data from token payload
      set({
        user: {
          id: payload.sub,
          email: payload.email,
          firstName: '',
          lastName: '',
          role: payload.role,
        },
        isAuthenticated: true,
        isLoading: false,
      });
      // Fetch full user data in background
      api.get(`/users/${payload.sub}`).then(({ data }) => {
        if (data.success) {
          const u = data.data;
          if (u.school?.slug) {
            localStorage.setItem('schoolSlug', u.school.slug);
          }
          set({
            user: {
              id: u.id,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              role: u.role,
              school: u.school || null,
              teacherProfileId: u.teacherProfile?.id,
              studentProfileId: u.studentProfile?.id,
              studentClassId: u.studentProfile?.classId,
              parentProfileId: u.parentProfile?.id,
            },
          });
        }
      }).catch(() => {});
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
