'use client';
import { useEffect, useState } from 'react';
import { withFirestore } from '@/lib/firebase';
import TopNav from '@/components/TopNav';
import HeroSearch from '@/components/HeroSearch';

type Vendor = { id: string; name?: string; [k: string]: any };

export default function HomePage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    (async () => {
      try {
        await withFirestore(async (fs, db) => {
          const snap = await fs.getDocs(fs.collection(db, 'vendors'));
          setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('load vendors error', e);
      }
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
