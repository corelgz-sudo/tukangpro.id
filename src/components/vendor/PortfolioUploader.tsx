'use client';

import * as React from 'react';
import { storage, ensureAuth } from '@/lib/firebase';
import { deleteObject, getDownloadURL, ref as sRef, uploadBytes } from 'firebase/storage';
import { Upload, X } from 'lucide-react';

export type PortfolioItem = { url: string; path: string };

type Props = {
  uid: string;
  items: PortfolioItem[];
  onChange: (next: PortfolioItem[]) => void;
  className?: string;
};

export default function PortfolioUploader({ uid, items, onChange, className }: Props) {
  const [busy, setBusy] = React.useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const user = await ensureAuth();
      const uploads = Array.from(files).map(async (file, i) => {
        const extGuess = file.name.toLowerCase().endsWith('.png') ? '.png' : '.jpg';
        const safe = file.name.replace(/\s+/g, '_').replace(/[^\w.-]/g, '');
        const path = `portfolios/${user.uid}/${Date.now()}-${i}-${safe}${extGuess}`;
        const ref = sRef(storage, path);
        await uploadBytes(ref, file, { contentType: file.type });
        const url = await getDownloadURL(ref);
        return { url, path } as PortfolioItem;
      });
      const results = await Promise.all(uploads);
const merged = [...(items ?? []), ...results];
// dedup by path/url agar tidak ganda
const uniq = merged.filter(
  (it, idx, arr) => arr.findIndex(x => (x.path && it.path ? x.path === it.path : x.url === it.url)) === idx
);
onChange(uniq);

    } finally {
      setBusy(false);
    }
  }

  async function removeAt(idx: number) {
    const it = items[idx];
    onChange(items.filter((_, i) => i !== idx));
    if (it?.path) {
      try {
        await deleteObject(sRef(storage, it.path));
      } catch {
        // silently ignore (mis. sudah terhapus)
      }
    }
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">Portofolio</label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <Upload className="h-4 w-4" aria-hidden />
          {busy ? 'Mengunggah…' : 'Tambah Foto'}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            aria-label="Unggah foto portofolio"
          />
        </label>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada foto. Klik “Tambah Foto”.</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map((it, i) => (
            <div
              key={`${it.url}-${i}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt={`Portofolio ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute right-1 top-1 hidden rounded-full bg-white/90 p-1 text-slate-700 shadow group-hover:block hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-200"
                aria-label={`Hapus foto ${i + 1}`}
                title="Hapus"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
