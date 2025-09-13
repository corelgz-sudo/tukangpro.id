'use client';

import { useEffect, useState } from 'react';
import type { User } from '@/lib/firebase-auth-shim';
import { onAuthStateChanged, signOut } from '@/lib/firebase-auth-shim';
import { getClientAuth } from '@/lib/firebase';

export default function TopNav() {
  console.log('[TopNav] v3 loaded');
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

  return (
    <div className="px-4 py-2 flex items-center gap-3">
      <div className="font-semibold">TukangPro</div>
      <div className="ml-auto flex items-center gap-2">
        {user ? (
          <>
            <span className="text-sm">{user.email}</span>
            <button className="border px-2 py-1 rounded" onClick={() => signOut()}>Logout</button>
          </>
        ) : (
          <a className="border px-2 py-1 rounded" href="/login">Login</a>
        )}
      </div>
    </div>
  );
}
