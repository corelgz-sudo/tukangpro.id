'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from '@/src/lib/firebase-auth-shim';
import { doc, onSnapshot } from 'firebase/firestore';

type AppRole = 'owner' | 'vendor' | 'admin';

function resolveRole(data: any): AppRole {
  if (typeof data?.role === 'string' && ['owner', 'vendor', 'admin'].includes(data.role)) {
    return data.role;
  }
  if (Array.isArray(data?.roles)) {
    if (data.roles.includes('admin')) return 'admin';
    if (data.roles.includes('vendor')) return 'vendor';
    if (data.roles.includes('owner')) return 'owner';
  }
  return 'owner';
}

function initials(name?: string | null) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? 'U') + (parts[1]?.[0] ?? '');
}

export default function TopNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // role dari users/{uid}
  const [role, setRole] = useState<AppRole>('owner');

  // profil owner (users/{uid})
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhoto, setProfilePhoto] = useState<string>('');

  // profil vendor (vendors/{uid})
  const [vendorName, setVendorName] = useState<string>('');
  const [vendorPhoto, setVendorPhoto] = useState<string>('');

  const menuRef = useRef<HTMLDivElement | null>(null);

  // observe auth
  useEffect(() => {
    setUser(auth.currentUser ?? null);
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // realtime: users/{uid}
  useEffect(() => {
    if (!user) {
      setRole('owner');
      setProfileName('');
      setProfilePhoto('');
      return;
    }
    const ref = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() || {};
        setRole(resolveRole(data));
        setProfileName((data as any).displayName || user.displayName || '');
        setProfilePhoto((data as any).photoURL || user.photoURL || '');
      },
      (err) => console.error('TopNav users onSnapshot:', err)
    );
    return () => unsub();
  }, [user?.uid]);

  // realtime: vendors/{uid}
  useEffect(() => {
    if (!user) {
      setVendorName('');
      setVendorPhoto('');
      return;
    }
    const ref = doc(db, 'vendors', user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setVendorName('');
          setVendorPhoto('');
          return;
        }
        const d = snap.data() as any;
        setVendorName(d.displayName || d.name || '');
        setVendorPhoto(d.photoURL || d.avatarUrl || d.avatar || '');
      },
      (err) => console.error('TopNav vendors onSnapshot:', err)
    );
    return () => unsub();
  }, [user?.uid]);

  // kalau dokumen vendors ada, pastikan role 'vendor' (jangan timpa admin)
  useEffect(() => {
    if (role !== 'admin' && (vendorName || vendorPhoto)) setRole('vendor');
  }, [vendorName, vendorPhoto]); // eslint-disable-line react-hooks/exhaustive-deps

  // pilih sumber avatar
  const avatarName =
    (role === 'vendor' ? vendorName || profileName : profileName) || user?.displayName || '';
  const avatarPhoto =
    (role === 'vendor' ? vendorPhoto || profilePhoto : profilePhoto) || '';

  // close dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handleLogin = () => router.push('/login');
  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/login');
    setMenuOpen(false);
  };

  const dashboardHref = role === 'vendor' ? '/dashboard' : role === 'admin' ? '/admin' : '/owner';
  const profileHref =
    role === 'vendor' ? '/dashboard?tab=profile' : role === 'admin' ? '/admin' : '/owner?tab=profile';

  return (
    <header className="bg-[#2F318B] text-white">
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-white/20 font-bold">
            TP
          </span>
          <span className="font-semibold">TukangPro.id</span>
        </Link>

        {/* Right */}
        <div className="flex items-center gap-4">
          <Link href="/help" className="hidden sm:inline text-white/90 hover:text-white">
            Bantuan
          </Link>
          <Link href="/blogs" className="hidden sm:inline text-white/90 hover:text-white">
            Blogs
          </Link>

          {!user ? (
            <button
              onClick={handleLogin}
              className="rounded-xl bg-white text-[#2F318B] font-semibold px-4 py-2 hover:opacity-95"
              aria-label="Daftar atau Login"
            >
              Daftar / Login
            </button>
          ) : (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/30 bg-white/10 flex items-center justify-center"
                aria-label="Akun"
              >
                {avatarPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPhoto} alt="avatar" className="w-9 h-9 object-cover" />
                ) : (
                  <span className="text-sm font-semibold">{initials(avatarName).toUpperCase()}</span>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white text-slate-700 rounded-xl shadow-lg overflow-hidden z-30">
                  <Link
                    href={dashboardHref}
                    className="block px-3 py-2 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={profileHref}
                    className="block px-3 py-2 hover:bg-slate-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profil
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2 hover:bg-slate-50">
                    Keluar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
