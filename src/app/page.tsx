// app/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import HeroSearch from '@/components/HeroSearch';
import HomeSponsor from '@/components/SponsorStrip';
import BlogTeaser from '@/components/BlogTeaser';
import VendorCard, { Vendor } from '@/components/VendorCard';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  limit as qlimit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

export default function HomePage() {
  const sp = useSearchParams();

  const filters = useMemo(() => {
    return {
      city: sp.get('city') || '',
      district: sp.get('district') || '',
      skill: sp.get('skill') || '',
      subskill: sp.get('subskill') || '',
    };
  }, [sp]);

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // ----- Query Utama: pilih 1 filter membership (prioritas subskill > skill > district > city)
      const wheres: any[] = [];
let primaryUsed = false;

      if (filters.subskill && !primaryUsed) {
        wheres.push(where('subskillIds', 'array-contains', filters.subskill));
        primaryUsed = true;
      }
      if (filters.skill && !primaryUsed) {
        wheres.push(where('skillIds', 'array-contains', filters.skill));
        primaryUsed = true;
      }
      if (filters.district && !primaryUsed) {
        wheres.push(where('districts', 'array-contains', filters.district));
        primaryUsed = true;
      }
      if (filters.city && !primaryUsed) {
        wheres.push(where('cities', 'array-contains', filters.city));
        primaryUsed = true;
      }

      const base = query(
        collection(db, 'vendors'),
        ...wheres,
        orderBy('rating', 'desc'),
        qlimit(36)
      );
      const snap = await getDocs(base);
      const results: Vendor[] = snap.docs.map((d) => mapVendor(d.id, d.data() as any));

      // ----- Filter sisa di client + WAJIB vendor: role/roles 'vendor' ATAU sinyal vendor kuat (skills/price)
const isVendorDoc = (v: any) => {
  const roleOk =
    v?.role === 'vendor' ||
    (Array.isArray(v?.roles) && v.roles.includes('vendor'));

  const hasVendorSignals =
    (Array.isArray(v?.skillIds) && v.skillIds.length > 0) ||
    (Array.isArray(v?.skills) && v.skills.length > 0) ||
    typeof v?.pricePerDay === 'number' ||
    typeof v?.dailyRate === 'number';

  // WAJIB: minimal salah satu terpenuhi
  if (!roleOk && !hasVendorSignals) return false;

  // Kalau ada status, wajib 'active'; kalau tidak ada, lolos (backward compatible)
  if (v?.status && v.status !== 'active') return false;

  return true;
};

const filtered = results
  .filter(isVendorDoc)
  // lalu terapkan sisa filter UI (city/district/skill/subskill)
  .filter((v) => {
    const okCity = filters.city
      ? (v as any).cities?.includes(filters.city) || v.city === filters.city
      : true;
    const okDistrict = filters.district
      ? (v as any).districts?.includes(filters.district) || v.district === filters.district
      : true;
    const okSkill = filters.skill
      ? (v as any).skillIds?.includes(filters.skill) || v.skills?.includes(filters.skill)
      : true;
    const okSub = filters.subskill
      ? (v as any).subskillIds?.includes(filters.subskill) || v.subskills?.includes(filters.subskill)
      : true;
    return okCity && okDistrict && okSkill && okSub;
  });



      setVendors(filtered);
      setLoading(false);
    })().catch((e) => {
      console.error('load vendors', e);
      setLoading(false);
    });
  }, [filters]);

  return (
    <>
      
      <main className="min-h-screen bg-[#F5F7FF]">
        <div className="mx-auto max-w-6xl px-4">
          <HeroSearch />
          <div className="mt-6">
            <HomeSponsor />
          </div>

          {/* Vendors */}
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Pencarian Ditemukan</h2>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-60 animate-pulse rounded-2xl bg-white shadow" />
                ))}
              </div>
            ) : vendors.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
                Belum ada vendor yang cocok dengan filter. Coba ubah pilihan.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
            )}
          </section>

          {/* Blog */}
          <div className="mt-10">
            <BlogTeaser />
          </div>
        </div>
      </main>
      
    </>
  );
}

// ---- mapping helper
function mapVendor(id: string, v: any): Vendor {
  return {
    id,
    displayName: v.displayName || v.name || 'Tanpa Nama',
    avatarUrl: v.avatarUrl || v.photoUrl || '',
    city: v.cityNames?.[0] ?? v.city ?? '',
    district: v.districtNames?.[0] ?? v.district ?? '',
    skills: v.skillNames ?? v.skills ?? [],
    subskills: v.subskillNames ?? v.subskills ?? [],
    yearsExp: v.yearsExp ?? undefined,
    pricePerDay: typeof v.pricePerDay === 'number' ? v.pricePerDay : undefined,
    negotiable: Boolean(v.nego ?? v.negotiable),
    toolsStandard: Boolean(v.toolsStandard),
    rating: Number(v.ratingAvg ?? v.rating ?? 0),
    reviewCount: Number(v.ratingCount ?? v.reviews ?? 0),
    isPro: !!(v.proUntil?.toMillis?.() ? v.proUntil.toMillis() > Date.now() : v.pro),
    
    verified: !!v.verified,

// ----- tambah passthrough supaya filter defensif di atas aman
role: v.role,
roles: v.roles,
status: v.status,
isPublic: v.isPublic,
vendorKind: v.vendorKind,
legal: v.legal,

    whatsapp: v.waNumber || v.whatsapp || '',
    ...(v.cities ? { cities: v.cities } : {}),
    ...(v.districts ? { districts: v.districts } : {}),
    ...(v.skillIds ? { skillIds: v.skillIds } : {}),
    ...(v.subskillIds ? { subskillIds: v.subskillIds } : {}),
  } as Vendor & Record<string, any>;
}
