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
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { user, accessToken, refreshToken } = data.data;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      if (user.school?.slug) {
        localStorage.setItem('schoolSlug', user.school.slug);
      }
    }
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout API çağrısı başarısız oldu, yerel oturum yine de temizlenecek:', err);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('schoolSlug');
    }
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const payload = JSON.parse(atob(parts[1]));

      if (!payload.exp || typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

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

      const userId = payload.sub;
      api.get(`/users/${userId}`).then(({ data }) => {
        
        const currentUser = get().user;
        if (!currentUser || currentUser.id !== userId) return;

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
      }).catch((err) => {
        console.warn('Kullanıcı profili yüklenemedi:', err);
      });
    } catch (err) {
      console.warn('Oturum doğrulama hatası, oturum temizleniyor:', err);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  updateUser: (updates: Partial<User>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));
