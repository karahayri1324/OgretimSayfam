'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolSlug, setSchoolSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (schoolSlug) {
      localStorage.setItem('schoolSlug', schoolSlug);
    }

    try {
      await login(email, password);
      toast.success('Giriş başarılı!');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('123456');
    setSchoolSlug('ataturk-anadolu');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center">
                <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ÖğretimSayfam</h1>
            <p className="text-gray-500 mt-1">Dijital Eğitim Yönetim Sistemi</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Okul</label>
              <input
                type="text"
                value={schoolSlug}
                onChange={(e) => setSchoolSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="input"
                placeholder="okul-slug"
              />
              <p className="text-xs text-gray-400 mt-0.5">{schoolSlug || 'okul'}.ogretimsayfam.com</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="ornek@okul.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifre</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-center"
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
              Şifremi Unuttum
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs font-medium text-blue-800 mb-2">Demo Hesapları (tıklayın):</p>
              <div className="text-xs text-blue-700 space-y-1.5">
                <button onClick={() => fillDemo('mudur@ataturk-anadolu.com')} className="block w-full text-left hover:text-blue-900 hover:underline">
                  Okul Admin: mudur@ataturk-anadolu.com
                </button>
                <button onClick={() => fillDemo('ogretmen1@ataturk-anadolu.com')} className="block w-full text-left hover:text-blue-900 hover:underline">
                  Öğretmen: ogretmen1@ataturk-anadolu.com
                </button>
                <button onClick={() => fillDemo('ogrenci1@ataturk-anadolu.com')} className="block w-full text-left hover:text-blue-900 hover:underline">
                  Öğrenci: ogrenci1@ataturk-anadolu.com
                </button>
                <button onClick={() => fillDemo('veli1@ataturk-anadolu.com')} className="block w-full text-left hover:text-blue-900 hover:underline">
                  Veli: veli1@ataturk-anadolu.com
                </button>
                <p className="text-[10px] text-blue-500 mt-1">Şifre: 123456</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
