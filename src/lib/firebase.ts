// src/lib/firebase.ts
// Firebase client-only & lazy init (aman untuk SSR/build)

type FirebaseApp = unknown;
export type FirebaseUser = import('firebase/auth').User;

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
  // Import dinamis agar tidak dievaluasi saat build/SSR
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

/** Storage di client; null saat SSR atau env kosong */
export async function getClientStorage() {
  if (typeof window === 'undefined') return null;
  const app = getClientApp();
  if (!app) return null;
  const { getStorage } = await import('firebase/storage');
  return getStorage(app as any);
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
 * Pastikan auth siap & dapatkan user (client only).
 * Menunggu onAuthStateChanged sekali, atau fallback currentUser jika sudah ada.
 */
export async function ensureAuth(timeoutMs = 3000): Promise<FirebaseUser | null> {
  if (typeof window === 'undefined') return null;
  const auth = await getClientAuth();
  if (!auth) return null;

  // Fallback cepat bila sudah ada currentUser (dibungkus try agar aman tipe)
  try {
    // @ts-expect-error runtime
    if (auth.currentUser) return auth.currentUser as FirebaseUser;
  } catch {}

  const { onAuthStateChanged } = await import('firebase/auth');

  return await new Promise<FirebaseUser | null>((resolve) => {
    let settled = false;
    const unsub = onAuthStateChanged(auth as any, (u) => {
      if (settled) return;
      settled = true;
      unsub();
      resolve((u as FirebaseUser) ?? null);
    });
    setTimeout(() => {
      if (settled) return;
      settled = true;
      unsub();
      resolve(null);
    }, timeoutMs);
  });
}

/**
 * Jalankan fungsi dengan modul Firestore yang sama (hindari mismatch identity).
 * Pakai ini untuk semua query: withFirestore(async (fs, db) => { ... })
 */
export async function withFirestore<T>(
  fn: (fs: typeof import('firebase/firestore'), db: Awaited<ReturnType<typeof getClientDb>>) => Promise<T>
): Promise<T> {
  if (typeof window === 'undefined') throw new Error('withFirestore: client-only');
  const app = getClientApp();
  if (!app) throw new Error('withFirestore: app not ready');
  const fs = await import('firebase/firestore');
  const db = fs.getFirestore(app as any);
  // @ts-expect-error runtime
  return fn(fs as any, db as any);
}

/**
 * Ekspor dummy agar import lama `import { auth, db, storage } from '@/lib/firebase'`
 * tidak memecah build. Untuk runtime, gunakan getter di atas.
 */
export const auth: any = undefined as any;
export const db: any = undefined as any;
export const storage: any = undefined as any;
