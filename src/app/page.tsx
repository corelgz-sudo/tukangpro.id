'use client';
import { useEffect, useState } from 'react';
import { getClientDb } from '@/lib/firebase';
import HeroSearch from '@/components/HeroSearch';
import TopNav from '@/components/TopNav';

type Vendor = { id: string; name?: string; [k: string]: any };

export default function HomePage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    (async () => {
      const db = await getClientDb();
      if (!db) return; // env belum siap → skip
      const { collection, getDocs } = await import('firebase/firestore');
      const snap = await getDocs(collection(db, 'vendors')).catch((e) => { console.warn('load vendors', e); return null; });
      if (!snap) return;
      setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    })();
  }, []);

  return (
    <main>
      <TopNav />
      <HeroSearch />
      <section className="p-4">
        <h2 className="font-semibold mb-2">Vendors</h2>
        <ul className="list-disc pl-5">
          {vendors.map(v => <li key={v.id}>{v.name ?? v.id}</li>)}
        </ul>
      </section>
    </main>
  );
}
