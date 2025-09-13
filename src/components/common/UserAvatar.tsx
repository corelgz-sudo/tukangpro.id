'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/firebase-auth-shim';
import { onAuthStateChanged } from '@/lib/firebase-auth-shim';
import { getClientAuth } from '@/lib/firebase';

export default function UserAvatar() {
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

  const src = user?.photoURL ?? 'https://i.pravatar.cc/64';
  const alt = user?.email ?? 'avatar';
  return (
    // pakai <img> dulu biar simpel; nanti bisa ganti ke next/image
    <img src={src} alt={alt} width={32} height={32} style={{ borderRadius: 9999 }} />
  );
}
