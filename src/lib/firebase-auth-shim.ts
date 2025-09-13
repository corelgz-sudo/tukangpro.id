// src/lib/firebase-auth-shim.ts
// Drop-in pengganti 'firebase/auth' agar lazy & aman saat build/SSR.
import { getClientAuth } from './firebase';

// Type-only re-exports (tidak menarik runtime module saat build/SSR)
export type User = import('firebase/auth').User;
export type UserCredential = import('firebase/auth').UserCredential;

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

/** createUserWithEmailAndPassword(auth, email, password) */
export async function createUserWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
  const auth = await getClientAuth();
  if (!auth) throw new Error('auth_unavailable');
  const { createUserWithEmailAndPassword: impl } = await import('firebase/auth');
  return impl(auth as any, email, password);
}

/** signInWithEmailAndPassword(auth, email, password) */
export async function signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential> {
  const auth = await getClientAuth();
  if (!auth) throw new Error('auth_unavailable');
  const { signInWithEmailAndPassword: impl } = await import('firebase/auth');
  return impl(auth as any, email, password);
}

/** signInWithCustomToken(auth, token) */
export async function signInWithCustomToken(token: string): Promise<UserCredential> {
  const auth = await getClientAuth();
  if (!auth) throw new Error('auth_unavailable');
  const { signInWithCustomToken: impl } = await import('firebase/auth');
  return impl(auth as any, token);
}
