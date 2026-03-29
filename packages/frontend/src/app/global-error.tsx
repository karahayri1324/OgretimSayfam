'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>!</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '0.5rem' }}>
              Beklenmedik bir hata olustu
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Uygulama yuklenirken bir sorun meydana geldi.
            </p>
            <button
              onClick={reset}
              style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.625rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
