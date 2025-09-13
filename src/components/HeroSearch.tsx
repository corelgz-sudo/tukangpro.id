'use client';
import { useEffect, useState } from 'react';
import { getClientDb } from '@/lib/firebase';

type Row = { id: string; [k: string]: any };

export default function HeroSearch() {
  const [skills, setSkills] = useState<Row[]>([]);
  const [regencies, setRegencies] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await getClientDb();
      if (!db) { console.warn('[HeroSearch] DB not ready'); return; }

      const { collection, getDocs } = await import('firebase/firestore');

      const [snapSkills, snapRegencies] = await Promise.all([
        getDocs(collection(db, 'catalog_skills')).catch((e) => { console.warn('[HeroSearch] skills', e); return null; }),
        getDocs(collection(db, 'catalog_regencies')).catch((e) => { console.warn('[HeroSearch] regencies', e); return null; }),
      ]);

      if (cancelled) return;
      if (snapSkills)   setSkills(snapSkills.docs.map(d => ({ id: d.id, ...d.data() })));
      if (snapRegencies) setRegencies(snapRegencies.docs.map(d => ({ id: d.id, ...d.data() })));
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 text-sm opacity-80">
      skills: {skills.length} • regencies: {regencies.length}
    </div>
  );
}
