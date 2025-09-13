'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

type Form = {
  displayName: string;   // wajib
  whatsapp: string;      // wajib
  email: string;         // opsional
  address: string;       // opsional
  photoURL: string;      // opsional
};

export default function OwnerProfileTab(props: { uid?: string }) {
  const router = useRouter();

  // uid bisa dari props ATAU dari auth
  const [uid, setUid] = useState<string | null>(props.uid ?? null);

  useEffect(() => {
    if (props.uid) { setUid(props.uid); return; }
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, [props.uid]);

  const [form, setForm] = useState<Form>({
    displayName: '',
    whatsapp: '',
    email: '',
    address: '',
    photoURL: '',
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  // load data user/{uid}
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const data = (snap.data() || {}) as any;
        setForm({
          displayName: data.displayName || '',
          whatsapp: data.whatsapp || data.phone || '',
          email: data.email || auth.currentUser?.email || '',
          address: data.address || '',
          photoURL: data.photoURL || '',
        });
      } catch (e) {
        console.error('Load profile error:', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, [uid]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  // upload foto → Storage: avatars/{uid}/<filename>
  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const path = `avatars/${uid}/${Date.now()}_${file.name}`;
      const r = sRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      set('photoURL', url);
    } catch (e) {
      console.error(e);
      alert('Upload foto gagal. Coba lagi.');
    } finally {
      setUploading(false);
    }
  };

  const onRemovePhoto = async () => {
    if (!form.photoURL) return;
    try {
      const url = new URL(form.photoURL);
      const path = decodeURIComponent(url.pathname.replace(/^\/v0\/b\/[^/]+\/o\//, ''));
      if (path) await deleteObject(sRef(storage, path)).catch(() => {});
    } finally {
      set('photoURL', '');
    }
  };

  const onSave = async () => {
    if (!uid) { alert('Session berakhir, silakan login ulang.'); return; }
    if (!form.displayName.trim() || !form.whatsapp.trim()) {
      alert('Nama dan No. WhatsApp wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        doc(db, 'users', uid),
        {
          displayName: form.displayName.trim(),
          whatsapp: form.whatsapp.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          photoURL: form.photoURL || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      alert('Profil tersimpan.');
      // balik ke Ringkasan biar keliatan update-nya
      router.replace('/owner?tab=overview');
    } catch (e: any) {
      console.error(e);
      alert(`Gagal menyimpan profil: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  // helper inisial
  const initials = (name: string) =>
    name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'U';

  if (!uid) return <p className="text-gray-600">Silakan login.</p>;
  if (!loaded)
    return <div className="animate-pulse h-48 rounded-2xl bg-white border border-gray-200" />;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(); }}
      className="max-w-2xl space-y-5"
    >
      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Foto Profil (opsional)
        </label>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-bold">
            {form.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photoURL} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span>{initials(form.displayName)}</span>
            )}
          </div>

          <label className="relative inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            {uploading ? 'Mengunggah…' : 'Pilih Foto'}
          </label>

          {form.photoURL ? (
            <button type="button" onClick={onRemovePhoto} className="text-sm text-red-600 font-semibold hover:underline">
              Hapus Foto
            </button>
          ) : null}
        </div>
      </div>

      {/* Nama */}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Nama <span className="text-red-600">*</span>
        </label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Nama Anda"
          value={form.displayName}
          onChange={(e) => set('displayName', e.target.value)}
        />
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block text-sm font-medium text-slate-700">
          WhatsApp <span className="text-red-600">*</span>
        </label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="08xxxxxxxxxx"
          value={form.whatsapp}
          onChange={(e) => set('whatsapp', e.target.value)}
        />
      </div>

      {/* Email (opsional) */}
      <div>
        <label className="block text-sm font-medium text-slate-700">Email (opsional)</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="email@contoh.com"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
        />
      </div>

      {/* Alamat (opsional) */}
      <div>
        <label className="block text-sm font-medium text-slate-700">Alamat (opsional)</label>
        <textarea
          rows={3}
          className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Alamat lengkap"
          value={form.address}
          onChange={(e) => set('address', e.target.value)}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}
