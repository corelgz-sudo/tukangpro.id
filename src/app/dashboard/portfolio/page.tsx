'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureAuth } from '@/lib/firebase';
import PortfolioUploader, { PortfolioItem } from '@/components/vendor/PortfolioUploader';

export default function PortfolioPage() {
  const [uid, setUid] = useState<string>('');
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const user = await ensureAuth();
      setUid(user.uid);
      const snap = await getDoc(doc(db, 'vendors', user.uid));
      if (snap.exists()) {
        const v = snap.data() as any;
        setItems(
          Array.isArray(v.portfolioMeta)
            ? v.portfolioMeta
            : (v.portfolio ?? []).map((u: string) => ({ url: u, path: '' }))
        );
      }
    })();
  }, []);

  const onSave = async () => {
    if (!uid) return;
    setSaving(true);
    await setDoc(
      doc(db, 'vendors', uid),
      { portfolioMeta: items, portfolio: items.map((i) => i.url), updatedAt: new Date() },
      { merge: true }
    );
    setSaving(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 sm:p-6">
      <h1 className="text-xl font-semibold text-slate-900">Kelola Portofolio</h1>
      <PortfolioUploader uid={uid} items={items} onChange={setItems} />
      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-xl bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#282A77] focus:outline-none focus:ring-2 focus:ring-[#2F318B] disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </div>
  );
}
