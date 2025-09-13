'use client';
import { useEffect, useState } from 'react';
import { withFirestore } from '@/lib/firebase';
type Row = { id: string; [k: string]: any };

export default function HeroSearch() {
  console.log('[HeroSearch] v3 loaded');
  const [skills, setSkills] = useState<Row[]>([]);
  const [regencies, setRegencies] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await withFirestore(async (fs, db) => {
          const [snapSkills, snapReg] = await Promise.all([
            fs.getDocs(fs.collection(db, 'catalog_skills')),
            fs.getDocs(fs.collection(db, 'catalog_regencies')),
          ]);
          if (cancelled) return;
          setSkills(snapSkills.docs.map(d => ({ id: d.id, ...d.data() })));
          setRegencies(snapReg.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } catch (e) {
        console.warn('[HeroSearch] load error', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 text-sm opacity-80">
      skills: {skills.length} • regencies: {regencies.length}
    </div>
  );
}
