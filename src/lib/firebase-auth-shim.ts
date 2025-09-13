// src/lib/firebase-auth-shim.ts
// Drop-in pengganti 'firebase/auth' agar lazy & aman saat build/SSR.
import { getClientAuth } from './firebase';

export type User = import('firebase/auth').User;

/** Bisa dipanggil: onAuthStateChanged(cb) ATAU onAuthStateChanged(auth, cb) */
export function onAuthStateChanged(authOrCb: any, maybeCb?: (user: User | null) => void) {
  const cb = typeof authOrCb === 'function' ? authOrCb : (maybeCb as (u: User | null) => void);
  let unsubscribe: (() => void) | undefined;

  (async () => {
    const auth = await getClientAuth();
    if (!auth || !cb) return;
    const { onAuthStateChanged } = await import('firebase/auth');
    unsubscribe = onAuthStateChanged(auth as any, cb);
  })();

  return () => { if (unsubscribe) unsubscribe(); };
}

/** signOut(auth) → cukup signOut() */
export async function signOut(_ignoredAuth?: unknown) {
  const auth = await getClientAuth();
  if (!auth) return;
  const { signOut } = await import('firebase/auth');
  return signOut(auth as any);
}
