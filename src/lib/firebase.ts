// src/lib/firebase.ts
// Inisialisasi Firebase *client-only & lazy* agar aman saat build/SSR.

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

/** Ambil app di CLIENT; null saat SSR atau env belum siap */
export function getClientApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  const cfg = getConfig();
  if (!cfg.apiKey) return null;
  // Import dinamis agar tidak tersentuh saat build/SSR
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initializeApp, getApps } = require('firebase/app');
  if (!_app) _app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return _app;
}

/** Auth di client; null saat SSR atau env kosong */
export async function getClientAuth() {
  if (typeof window === 'undefined') return null;
  const app = getClientApp();
  if (!app) return null;
  const { getAuth } = await import('firebase/auth');
  return getAuth(app as any);
}

/** Firestore di client; null saat SSR atau env kosong */
export async function getClientDb() {
  if (typeof window === 'undefined') return null;
  const app = getClientApp();
  if (!app) return null;
  const { getFirestore } = await import('firebase/firestore');
  return getFirestore(app as any);
}

/** (opsional) Analytics di client */
export async function getClientAnalytics() {
  if (typeof window === 'undefined') return null;
  const app = getClientApp();
  if (!app) return null;
  const { getAnalytics, isSupported } = await import('firebase/analytics');
  if (!(await isSupported())) return null;
  return getAnalytics(app as any);
}

/**
 * Ekspor dummy agar import lama `import { auth, db } from '@/lib/firebase'` tidak pecah.
 * Jangan dipakai langsung; gunakan getClientAuth()/getClientDb() di code baru.
 */
export const auth: any = undefined as any;
export const db: any = undefined as any;
