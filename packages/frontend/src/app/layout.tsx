import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin', 'latin-ext'] });

export const metadata: Metadata = {
  title: {
    default: 'ÖğretimSayfam - Dijital Eğitim Yönetim Sistemi',
    template: '%s | ÖğretimSayfam',
  },
  description: 'Okulunuzu dijital olarak yönetin. Ders programı, yoklama, not takibi, duyuru ve daha fazlası tek platformda.',
  keywords: ['okul yönetim sistemi', 'dijital eğitim', 'ders programı', 'yoklama', 'öğretim'],
  authors: [{ name: 'ÖğretimSayfam' }],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'ÖğretimSayfam',
    title: 'ÖğretimSayfam - Dijital Eğitim Yönetim Sistemi',
    description: 'Okulunuzu dijital olarak yönetin. Ders programı, yoklama, not takibi, duyuru ve daha fazlası tek platformda.',
  },
  twitter: {
    card: 'summary',
    title: 'ÖğretimSayfam - Dijital Eğitim Yönetim Sistemi',
    description: 'Okulunuzu dijital olarak yönetin.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" toastOptions={{
          duration: 3000,
          style: { borderRadius: '10px', background: '#333', color: '#fff' },
        }} />
      </body>
    </html>
  );
}
