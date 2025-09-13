'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from '@/lib/firebase-auth-shim';
import OwnerOverview from '@/components/owner/OwnerOverview';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import OwnerTendersTab from '@/components/owner/OwnerTendersTab';
import OwnerFavoritesTab from '@/components/owner/OwnerFavoritesTab';
import OwnerProfileTab from '@/components/owner/OwnerProfileTab';

type AppRole = 'owner'|'vendor'|'admin';
function resolveRole(data: any): AppRole {
  if (typeof data?.role === 'string' && ['owner','vendor','admin'].includes(data.role)) return data.role as AppRole;
  if (Array.isArray(data?.roles)) {
    if (data.roles.includes('admin')) return 'admin';
    if (data.roles.includes('vendor')) return 'vendor';
    if (data.roles.includes('owner')) return 'owner';
  }
  return 'owner';
}


export default function OwnerDashboardPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get('tab') ?? 'overview') as 'overview'|'tenders'|'favorites'|'profile';

  const [authReady, setAuthReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  // Guard login dulu: tunggu Firebase Auth siap, isi uid & authReady
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (u) => {
    if (!u) {
      // kalau belum login, arahkan ke halaman login owner
      router.replace('/login?role=owner&next=/owner');
    } else {
      setUid(u.uid);
      setAuthReady(true);
    }
  });
  return () => unsub();
}, [router]);


  // Guard: wajib login; jangan cek auth.currentUser di awal supaya tak race saat refresh
  // Setelah login siap → cek role: halaman ini khusus owner
useEffect(() => {
  if (!authReady || !uid) return;
  (async () => {
    const us = await getDoc(doc(db, 'users', uid));
    const data: any = us.data() || {};

    let role =
      typeof data.role === 'string' ? data.role :
      (Array.isArray(data.roles) && data.roles.includes('vendor')) ? 'vendor' :
      (Array.isArray(data.roles) && data.roles.includes('owner'))  ? 'owner'  :
      'owner';

    // 🔒 cross-check vendors/{uid}: kalau ada, anggap vendor
    try {
      const vs = await getDoc(doc(db, 'vendors', uid));
      if (vs.exists()) role = 'vendor';
    } catch {}

    if (role !== 'owner') {
      router.replace(role === 'vendor' ? '/dashboard' : '/admin');
    }
  })();
}, [authReady, uid, router]);




  const tabs = useMemo(() => ([
    { key: 'overview', label: 'Ringkasan' },
    { key: 'tenders',  label: 'Tender Saya' },
    { key: 'favorites',label: 'Favorit' },
    { key: 'profile',  label: 'Profil' },
  ] as const), []);

  if (!authReady) {
  return <main className="max-w-6xl mx-auto px-4 py-6">Memeriksa akun…</main>;
}


  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard Owner</h1>
        <Link
          href="/tender/new"
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700"
        >
          Buat Tender
        </Link>
      </div>

      <nav className="mt-4 flex gap-2">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/owner?tab=${t.key}`}
            className={`px-3 py-1.5 rounded-lg text-sm ${tab===t.key ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-100'}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <section className="mt-6">
        {tab==='overview'  && <OwnerOverview ownerId={uid!} />}
        {tab==='tenders'   && <OwnerTendersTab />}
        {tab==='favorites' && <OwnerFavoritesTab />}
        {tab === 'profile' && uid && <OwnerProfileTab uid={uid} />}
      </section>
    </main>
  );
}


