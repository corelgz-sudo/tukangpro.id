'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // tampilkan detail di console prod
  // (stack mapan karena productionBrowserSourceMaps: true)
  // eslint-disable-next-line no-console
  console.error('[GlobalError]', error);

  return (
    <html>
      <body style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Something went wrong</h1>
        <p>Check the browser console for details.</p>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#111', color: '#eee', padding: 12 }}>
          {(error.stack || error.message || String(error)).slice(0, 2000)}
        </pre>
        <button onClick={() => reset()} style={{ marginTop: 12, padding: '8px 12px' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
