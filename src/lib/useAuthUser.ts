'use client';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/firebase-auth-shim';
import { onAuthStateChanged } from '@/lib/firebase-auth-shim';
import { getClientAuth } from '@/lib/firebase';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const auth = await getClientAuth();
      if (!auth) return;
      unsub = onAuthStateChanged((u) => setUser(u));
    })();
    return () => unsub?.();
  }, []);
  return user;
}
