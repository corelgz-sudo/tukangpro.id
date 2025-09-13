// app/tukang/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Vendor } from '@/lib/format';
import { doc, onSnapshot /* , query, where, collection */ } from 'firebase/firestore';
import VendorDashboard from '@/components/vendor/VendorDashboard';

export default function TukangDashboardPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  // auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  // live fetch vendor profile
  useEffect(() => {
    if (!uid) {
      setVendor(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    // === Jika ID dokumen = UID (disarankan) ===
    const ref = doc(db, 'vendors', uid);
    const off = onSnapshot(
      ref,
      (snap) => {
        const v = snap.data() as any;
        if (!v) {
          setVendor(null);
        } else {
          const mapped: Vendor = {
            id: snap.id,
            displayName: v.displayName || v.name || 'Tanpa Nama',
            avatarUrl: v.photoUrl || v.avatarUrl || '',
            city: v.city || '',
            district: v.district || v.kecamatan || '',
            skills: Array.isArray(v.skills) ? v.skills : v.skill ? [v.skill] : [],
            subskills: Array.isArray(v.subskills) ? v.subskills : [],
            yearsExp: v.yearsExp ?? v.experienceYears ?? undefined,
            pricePerDay: typeof v.pricePerDay === 'number' ? v.pricePerDay : undefined,
            negotiable: Boolean(v.nego ?? v.negotiable),
            toolsStandard: Boolean(v.toolsStandard),
            rating: Number(v.ratingAvg ?? v.rating ?? 0),
            reviewCount: Number(v.ratingCount ?? v.reviews ?? 0),
            isPro: !!(v.proUntil?.toMillis?.() ? v.proUntil.toMillis() > Date.now() : v.pro),
            verified: !!v.verified,
            whatsapp: v.waNumber || v.whatsapp || '',
          };
          setVendor(mapped);
        }
        setLoading(false);
      },
      (err) => {
        console.error('vendors snapshot error:', err);
        setLoading(false);
      }
    );

    // === Jika kamu pakai auto-ID + ownerId, ganti dengan query ini ===
    // const q = query(collection(db, 'vendors'), where('ownerId', '==', uid));
    // const off = onSnapshot(q, (snap) => { ...ambil first doc... });

    return () => off();
  }, [uid]);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-200/60" />
            ))}
          </div>
        </div>
      );
    }
    if (!uid) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Masuk dulu ya</h1>
          <p className="mt-2 text-slate-600">
            Kamu belum login. Silakan masuk untuk membuka Dashboard Tukang.
          </p>
        </div>
      );
    }
    if (!vendor) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Profil tidak ditemukan</h1>
          <p className="mt-2 text-slate-600">
            Kami belum menemukan data vendor kamu. Coba buka halaman <span className="font-semibold">Edit Profil</span> dan simpan sekali.
          </p>
        </div>
      );
    }
    return <VendorDashboard vendor={vendor} />;
  }, [loading, uid, vendor]);

  return <main className="min-h-screen bg-[#F5F7FF]">{content}</main>;
}
