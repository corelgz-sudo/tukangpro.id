// app/dashboard/edit-profil/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from '@/src/lib/firebase-auth-shim';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Vendor } from '@/lib/format';
import EditVendorForm from '@/components/vendor/EditVendorForm';

export default function EditProfilPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [initial, setInitial] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setUid(user?.uid ?? null);
      if (!user) {
        setInitial(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const ref = doc(db, 'vendors', user.uid);
        const snap = await getDoc(ref);
        const v = snap.data() as any;
        if (v) {
          setInitial({
            id: snap.id,
            displayName:
              v.displayName || v.name || user.displayName || user.email?.split('@')[0] || '',
            avatarUrl: v.photoUrl || v.avatarUrl || '',
            city: v.city || '',
            district: v.district || v.kecamatan || '',
            skills: Array.isArray(v.skills) ? v.skills : v.skill ? [v.skill] : [],
            subskills: Array.isArray(v.subskills) ? v.subskills : [],
            yearsExp: v.yearsExp ?? v.experienceYears ?? undefined,
            pricePerDay: typeof v.pricePerDay === 'number' ? v.pricePerDay : undefined,
            negotiable: Boolean(v.nego ?? v.negotiable ?? true),
            toolsStandard: v.toolsStandard ?? true,
            rating: Number(v.ratingAvg ?? v.rating ?? 0),
            reviewCount: Number(v.ratingCount ?? v.reviews ?? 0),
            isPro: !!(v.proUntil?.toMillis?.() ? v.proUntil.toMillis() > Date.now() : v.pro),
            verified: !!v.verified,
            whatsapp: v.waNumber || v.whatsapp || '',
          });
        } else {
          setInitial(null);
        }
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (!uid) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-bold text-slate-900">Masuk dulu ya</h1>
        <p className="mt-2 text-slate-600">Kamu belum login.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-slate-900">Edit Profil Tukang</h1>
      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : (
        <EditVendorForm uid={uid} initial={initial ?? undefined} />
      )}
    </main>
  );
}
