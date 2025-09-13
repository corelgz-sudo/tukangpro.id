'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

function initials(name?: string) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || 'U') + (parts[1]?.[0] || '');
}

export default function UserAvatar({
  size = 36,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  const [photoURL, setPhotoURL] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;
      // ambil dari users/{uid}
      const snap = await getDoc(doc(db, 'users', u.uid));
      const d = (snap.exists() ? snap.data() : {}) as any;
      setPhotoURL(d.photoURL || '');
      setDisplayName(d.displayName || u.displayName || '');
    });
    return () => unsub();
  }, []);

  const style = { width: size, height: size };

  return (
    <div
      className={[
        'rounded-full bg-indigo-600 text-white flex items-center justify-center overflow-hidden select-none',
        className,
      ].join(' ')}
      style={style}
      aria-label="User avatar"
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoURL} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <span className="font-semibold">{initials(displayName).toUpperCase()}</span>
      )}
    </div>
  );
}
