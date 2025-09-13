// src/lib/firebase.ts
// Inisialisasi Firebase *hanya di client* dan *lazy* supaya build/SSR tidak menyentuh Firebase client SDK.

type FirebaseApp = unknown;

let _app: FirebaseApp | null = null;

function getConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

/** Panggil HANYA di client (komponen 'use client' / di useEffect). */
export function getClientApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;

  const cfg = getConfig();
  if (!cfg.apiKey) return null; // env belum ada → jangan init

  // Import dinamis di client (hindari eksekusi saat SSR/build)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps } = require('firebase/app');

  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return _app;
}

/** Ambil Auth di client; kembalikan null jika env belum ada. */
export async function getClientAuth() {
  if (typeof window === 'undefined') return null;
  const app = getClientApp();
  if (!app) return null;
  const { getAuth } = await import('firebase/auth');
  return getAuth(app as any);
}

/** (Opsional) Analytics di client */
export async function getClientAnalytics() {
  if (typeof window === 'undefined') return null;
  const app = getClientApp();
  if (!app) return null;
  const { getAnalytics, isSupported } = await import('firebase/analytics');
  if (!(await isSupported())) return null;
  return getAnalytics(app as any);
}
