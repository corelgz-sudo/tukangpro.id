'use client';

import * as React from 'react';
import { storage, ensureAuth } from '@/lib/firebase';
import { getDownloadURL, ref as sRef, uploadBytes } from 'firebase/storage';
import { Upload } from 'lucide-react';

type Props = {
  uid: string;
  url?: string;
  onChange: (newUrl: string) => void;
  className?: string;
};

export default function AvatarUploader({ uid, url, onChange, className }: Props) {
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null); // <-- gunakan ref

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget;                // simpan referensi SEBELUM await
    const file = inputEl.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const user = await ensureAuth();
      const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
      const ext = isPng ? '.png' : '.jpg';
      const path = `avatars/${user.uid}/avatar${ext}`; // folder per user, cocok dgn rules
      const ref = sRef(storage, path);

      await uploadBytes(ref, file, { contentType: file.type || (isPng ? 'image/png' : 'image/jpeg') });
      const publicUrl = await getDownloadURL(ref);
      onChange(publicUrl);

      // debug opsional:
      // console.log('Uploaded to', ref.bucket, ref.fullPath);
    } finally {
      setUploading(false);
      // reset input aman via ref (jangan pakai e.currentTarget setelah await)
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">Foto Profil</label>
      <div className="flex items-center gap-3">
        <div className="relative aspect-square h-24 w-24 overflow-hidden rounded-2xl border border-slate-300 bg-slate-100">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Foto profil" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center text-slate-400">1:1</div>
          )}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? 'Mengunggah…' : 'Ganti Foto'}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPick}
            aria-label="Unggah foto profil"
          />
        </label>
      </div>
    </div>
  );
}
