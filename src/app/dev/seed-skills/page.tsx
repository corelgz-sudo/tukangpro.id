// app/dev/seed-skills/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from '@/src/lib/firebase-auth-shim';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';

type Tree = Record<string, string[]>;

// ====== DATA: dari daftar kamu ======
const SKILL_TREE: Tree = {
  'Tukang Sipil': [
    'Tukang Gali',
    'Tukang Pondasi',
    'Tukang Batu',
    'Tukang Besi',
    'Tukang Cor',
    'Tukang Plester & Aci',
    'Tukang Keramik',
    'Tukang Cat',
    'Tukang Gypsum/Plafon',
    'Tukang Kaca & Aluminium',
    'Tukang Las',
    'Tukang Kayu',
    'Tukang Interior',
    'Tukang Atap',
    'Tukang Landscape',
    'Tukang Waterproofing',
    'Tukang Sumur Bor',
    'Tukang Plumbing Air',
    'Tukang Topography/Surveyor',
  ],
  'Tukang Elektrik': [
    'Tukang Instalasi Listrik',
    'Tukang Penerangan',
    'Tukang Grounding',
    'Tukang Panel Listrik',
    'Tukang Listrik Tegangan Menengah',
    'Tukang Listrik Industri',
    'Tukang Genset',
    'Tukang Solar Panel (PLTS)',
    'Tukang Servis Listrik',
    'Tukang AC',
    'Tukang Elektronik',
    'Tukang Internet/CCTV',
    'Tukang SLO',
    'Tukang NIDI',
  ],
  'Tukang Mesin': [
    'Tukang Bubut',
    'Tukang Las (Welder)',
    'Mekanik Mobil',
    'Mekanik Motor',
    'Tukang Body Repair',
    'Tukang Bubut CNC',
    'Tukang Maintenance',
    'Tukang Genset/Diesel',
    'Tukang Pompa Air',
    'Tukang AC & Pendingin',
    'Tukang Alat Berat',
  ],
  'Tukang Konveksi': [
    'Tukang Jahit',
    'Tukang Potong',
    'Tukang Sablon',
    'Tukang DTF',
    'Tukang Bordir',
    'Tukang Printing',
  ],
  'Tukang Bersih': [
    'Bersih Toren',
    'Bersih Taman',
    'Bersih Rumah',
    'Bersih Sedot WC',
  ],
  'Tukang Gambar': [
    'Gambar 3D',
    'Gambar Mural',
    'Gambar Graffity',
    'Gambar Lukisan',
  ],
  'Tukang Digital': [
    'Photographer',
    'Video Editor',
    'Animator',
    'Desainer Grafis',
    'Designer UI/UX',
    'Programmer',
    'Software Tester',
    'Komputer',
    'Konten Kreator',
  ],
};

// ====== utils ======
function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function SeedSkillsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
  }, []);

  const canRun = useMemo(() => !!uid, [uid]);

  async function seed() {
    if (!uid) return;
    setRunning(true);
    setLogs((s) => [...s, 'Mulai seeding…']);

    try {
      // 1) skills
      for (const [skillName, subs] of Object.entries(SKILL_TREE)) {
        const skillId = slugify(skillName);
        await setDoc(
          doc(collection(db, 'catalog_skills'), skillId),
          {
            id: skillId,
            name: skillName,
            active: true,
            order: 0,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
        setLogs((s) => [...s, `✔ skill: ${skillName}`]);

        // 2) subskills
        for (const subName of subs) {
          const subId = `${skillId}--${slugify(subName)}`;
          await setDoc(
            doc(collection(db, 'catalog_subskills'), subId),
            {
              id: subId,
              name: subName,
              skill_id: skillId,
              skill_name: skillName,
              active: true,
              order: 0,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          setLogs((s) => [...s, `  └ sub: ${subName}`]);
        }
      }

      setLogs((s) => [...s, '✅ Selesai. Cek koleksi catalog_skills & catalog_subskills.']);
    } catch (e: any) {
      setLogs((s) => [...s, `❌ Error: ${e.code ?? e.message}`]);
      alert(e?.message || 'Gagal seeding');
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">Seed Skills & Subskills</h1>
      <p className="mt-2 text-slate-600">
        Pastikan Rules memberi izin tulis sementara untuk akun admin kamu. Setelah selesai, kembalikan ke read-only.
      </p>
      <button
        onClick={seed}
        disabled={!canRun || running}
        className="mt-4 inline-flex items-center rounded-lg bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-900 disabled:opacity-60"
      >
        {running ? 'Menulis…' : 'Jalankan Seeding'}
      </button>

      <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800">
        {logs.join('\n')}
      </pre>
    </main>
  );
}
