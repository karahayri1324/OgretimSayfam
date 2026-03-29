'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Step = 'email' | 'success' | 'reset';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Talep alindi!');
      setStep('success');
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Bir hata olustu');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Sifreler eslesmiyor');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Sifre en az 6 karakter olmalidir');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      toast.success('Sifre basariyla sifirlandi!');
      
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'Sifre sifirlanamadi');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 'reset' ? 'Yeni Sifre Belirle' : 'Sifremi Unuttum'}
            </h1>
            <p className="text-gray-500 mt-1">
              {step === 'email' && 'Kayitli e-posta adresinizi girin'}
              {step === 'success' && 'Sifre sifirlama talimatlariniz gonderildi'}
              {step === 'reset' && 'Yeni sifrenizi belirleyin'}
            </p>
          </div>

          {step === 'email' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-center"
              >
                {loading ? 'Gonderiliyor...' : 'Sifirlama Baglantisi Gonder'}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-400">veya</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('reset')}
                className="w-full py-3 text-center text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
              >
                Sifirlama tokenim var
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Eger bu e-posta kayitliysa, sifre sifirlama baglantisi gonderildi.
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      E-posta yapilandirmasi yapilmamissa, yoneticinizden sifirlama tokenini isteyin.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('reset')}
                className="btn-primary w-full py-3 text-center"
              >
                Sifirlama tokenini gir
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full py-3 text-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Tekrar dene
              </button>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sifirlama Tokeni</label>
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.trim())}
                  className="input font-mono text-sm"
                  placeholder="Token kodunu yapistirin"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">
                  E-posta ile gonderilen veya yoneticinizden aldiginiz token
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Sifre</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yeni Sifre (Tekrar)</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Sifrenizi tekrar girin"
                  minLength={6}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-center"
              >
                {loading ? 'Sifre sifirlaniyor...' : 'Sifreyi Sifirla'}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full py-3 text-center text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Geri don
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 hover:underline">
              Giris sayfasina don
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
