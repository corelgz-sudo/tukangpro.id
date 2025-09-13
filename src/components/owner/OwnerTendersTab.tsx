'use client';

import { useEffect, useState } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

type Form = {
  displayName: string;
  phone: string;       // WhatsApp
  email: string;       // opsional
  address: string;     // opsional
  photoURL: string;    // opsional
};

export default function OwnerProfileTab() {
  const [uid, setUid] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    displayName: '',
    phone: '',
    email: '',
    address: '',
    photoURL: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      setLoading(true);
      const ref = doc(db, 'users', uid);
      const snap = await getDoc(ref);
      const d = (snap.exists() ? snap.data() : {}) as any;

      setForm({
        displayName: d.displayName || '',
        phone: d.phone || d.whatsapp || '',
        email: d.email || auth.currentUser?.email || '',
        address: d.address || '',
        photoURL: d.photoURL || '',
      });

      setLoading(false);
    })();
  }, [uid]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    setUploading(true);
    try {
      const path = `avatars/${uid}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      set('photoURL', url);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!form.photoURL) return;
    try {
      const url = new URL(form.photoURL);
      // best-effort: hapus file lama (jika path terdeteksi)
      const path = decodeURIComponent(url.pathname.replace(/^\/v0\/b\/[^/]+\/o\//, ''));
      if (path) {
        const ref = storageRef(storage, path);
        await deleteObject(ref).catch(() => {});
      }
    } finally {
      set('photoURL', '');
    }
  };

  const onSave = async () => {
    if (!uid) return;
    if (!form.displayName.trim() || !form.phone.trim()) {
      alert('Nama dan No. WhatsApp wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, 'users', uid);
      await updateDoc(ref, {
        displayName: form.displayName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        photoURL: form.photoURL,
        updatedAt: serverTimestamp(),
      });
      // opsional: toast sederhana
      console.log('Profil disimpan');
    } finally {
      setSaving(false);
    }
  };

  if (!uid) return <p className="text-gray-600">Silakan login.</p>;
  if (loading)
    return <div className="animate-pulse h-48 rounded-2xl bg-white border border-gray-200" />;

  return (
    <div className="max-w-2xl rounded-2xl bg-white border border-gray-200 p-5">
      <h3 className="text-lg font-semibold text-gray-900">Edit Profil</h3>

      {/* Foto */}
      <div className="mt-4">
        <div className="text-sm text-gray-700">Foto Profil (opsional)</div>
        <div className="mt-2 flex items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-bold">
            {form.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.photoURL} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="select-none">
                {form.displayName
                  ? form.displayName.trim().split(/\s+/).map(s => s[0]).slice(0,2).join('').toUpperCase()
                  : 'U'}
              </span>
            )}
          </div>

          <label className="relative inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={pickPhoto}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
            {uploading ? 'Mengunggah…' : 'Pilih Foto'}
          </label>

          {form.photoURL ? (
            <button
              onClick={removePhoto}
              className="text-sm text-red-600 font-semibold hover:underline"
            >
              Hapus Foto
            </button>
          ) : null}
        </div>
      </div>

      {/* Nama */}
      <label className="mt-6 block text-sm text-gray-700">Nama <span className="text-red-600">*</span></label>
      <input
        value={form.displayName}
        onChange={(e) => set('displayName', e.target.value)}
        placeholder="Nama Anda"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* WhatsApp */}
      <label className="mt-4 block text-sm text-gray-700">
        No. WhatsApp <span className="text-red-600">*</span>
      </label>
      <input
        value={form.phone}
        onChange={(e) => set('phone', e.target.value)}
        placeholder="08xxxxxxxxxx"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* Email (opsional) */}
      <label className="mt-4 block text-sm text-gray-700">Email (opsional)</label>
      <input
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        placeholder="email@contoh.com"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {/* Alamat (opsional) */}
      <label className="mt-4 block text-sm text-gray-700">Alamat (opsional)</label>
      <textarea
        value={form.address}
        onChange={(e) => set('address', e.target.value)}
        placeholder="Alamat lengkap"
        rows={3}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <div className="mt-6">
        <button
          onClick={onSave}
          disabled={saving || !form.displayName.trim() || !form.phone.trim()}
          className="rounded-xl bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
        </button>
      </div>
    </div>
  );
}
