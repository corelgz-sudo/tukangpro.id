'use client';

export default function Page() {
  const cfg = {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: !!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>/debug</h2>
      <p>isBrowser: {String(typeof window !== 'undefined')}</p>
      <pre>{JSON.stringify(cfg, null, 2)}</pre>
    </div>
  );
}
