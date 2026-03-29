import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-primary-600">404</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sayfa Bulunamadi</h1>
        <p className="text-gray-500 mb-6">Aradiginiz sayfa mevcut degil veya tasinmis olabilir.</p>
        <Link href="/dashboard" className="btn-primary px-6 py-2.5 inline-block">
          Ana Sayfaya Don
        </Link>
      </div>
    </div>
  );
}
