// src/lib/firebase-auth-shim.ts
// Drop-in pengganti import dari 'firebase/auth' agar lazy & aman saat build/SSR.
import { getClientAuth } from './firebase';

// Re-export tipe agar pemakaian `User` tetap jalan (type-only, tidak mengimport runtime)
export type User = import('firebase/auth').User;

/** Sama signature (kira-kira) dengan firebase: mengembalikan fungsi unsubscribe. */
export function onAuthStateChanged(_ignoredAuth: unknown, cb: (user: User | null) => void) {
  let unsubscribe: (() => void) | undefined;

  (async () => {
    const auth = await getClientAuth();
    if (!auth) return; // env belum ada → diam saja
    const { onAuthStateChanged } = await import('firebase/auth');
    unsubscribe = onAuthStateChanged(auth as any, cb);
  })();

  // kembalikan cleanup sinkron, akan aktif setelah import selesai
  return () => { if (unsubscribe) unsubscribe(); };
}

/** Pengganti signOut(auth) → cukup panggil signOut() saja. */
export async function signOut(_ignoredAuth?: unknown) {
  const auth = await getClientAuth();
  if (!auth) return;
  const { signOut } = await import('firebase/auth');
  return signOut(auth as any);
}
