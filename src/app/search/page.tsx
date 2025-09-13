'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import TopNav from '@/components/TopNav';
import VendorCard from '@/components/VendorCard';
import type { Vendor } from '@/lib/format';
import Pagination from '@/components/Pagination';
import Footer from '@/components/Footer';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';

const PAGE_SIZE = 12;

type SortKey = 'recommended' | 'rating_desc' | 'reviews_desc' | 'updated_desc';

export default function SearchPage() {
  const sp = useSearchParams();

  // ── params dari URL (hasil HeroSearch)
  const regencyId  = sp.get('city') ?? '';      // regency_id (kota/kab)
const districtId = sp.get('district') ?? '';  // district_id (kec)
  const skill        = sp.get('skill') ?? '';        // slug skill
  const subskill     = sp.get('subskill') ?? '';     // slug subskill
  const sortParam    = (sp.get('sort') as SortKey) || 'recommended';

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // ── mapping sort ke field Firestore
  const sortDef = (() => {
    switch (sortParam) {
      case 'rating_desc':  return { key: 'ratingAvg',   dir: 'desc' as const };
      case 'reviews_desc': return { key: 'ratingCount', dir: 'desc' as const };
      case 'updated_desc': return { key: 'updatedAt',   dir: 'desc' as const };
      default:             return { key: 'rankScore',   dir: 'desc' as const }; // recommended
    }
  })();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const constraints: QueryConstraint[] = [];

        // ── lokasi (prioritas paling spesifik)
        if (districtId) {
          // vendor menyimpan array district_ids: string[]
          constraints.push(where('district_ids', 'array-contains', districtId));
        } else if (regencyId) {
          // vendor.regency_id = '3273' (misal Kota Bandung)
          constraints.push(where('regency_id', '==', regencyId));
        } 

        // ── keahlian (pakai subskill dulu kalau ada)
        if (subskill) {
          constraints.push(where('subskills', 'array-contains', subskill));
        } else if (skill) {
          constraints.push(where('skills', 'array-contains', skill));
        }

        constraints.push(orderBy(sortDef.key, sortDef.dir));
        constraints.push(limit(120)); // ambil cukup banyak → paginasi di klien dulu

        const snap = await getDocs(query(collection(db, 'vendors'), ...constraints));
        const rows: Vendor[] = snap.docs.map((d) => mapVendorDoc(d.id, d.data()));
        setVendors(rows);
        setPage(1); // reset ke halaman 1 setiap filter berubah
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regencyId, districtId, skill, subskill, sortParam, sp.toString()]);

  // ── paginasi klien
  const start = (page - 1) * PAGE_SIZE;
  const paged = useMemo(() => vendors.slice(start, start + PAGE_SIZE), [vendors, start]);
  const totalPages = Math.max(1, Math.ceil(vendors.length / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-transparent">
      <TopNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="mt-6 mb-2 text-lg font-semibold">Hasil Pencarian</h1>

        {/* bar kecil untuk ringkas filter + sort */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
          
          {regencyId && <Badge>Kota/Kab: {regencyId}</Badge>}
{districtId && <Badge>Kecamatan: {districtId}</Badge>}
          {skill && <Badge>Keahlian: {skill}</Badge>}
          {subskill && <Badge>Sub: {subskill}</Badge>}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-500">Urut</span>
            <SortSelect current={sortParam} />
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-80 rounded-2xl bg-white border border-slate-200 shadow-sm animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {vendors.length === 0 && (
              <div className="mt-10 text-center text-sm text-slate-600">
                Belum ada vendor yang cocok. Coba kurangi filter atau ganti lokasi/keahlian.
              </div>
            )}

            <section className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((v) => <VendorCard key={v.id} vendor={v} />)}
            </section>

            <div className="flex justify-center my-8">
              <Pagination page={page} total={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

/** Map dokumen Firestore vendors → tipe VendorCard */
function mapVendorDoc(id: string, v: DocumentData): Vendor {
  return {
    id,

    // Nama/tampilan
    displayName: v.displayName || v.name || 'Vendor',
    avatarUrl: v.photoURL || v.avatarUrl || '',

    // Lokasi
    city: v.city || v.regency_name || '-',
    district: v.district || v.district_name || '',

    // Skills harus array
    skills: Array.isArray(v.skills) ? v.skills
           : v.skills ? [String(v.skills)]
           : [],

    // Pengalaman (angka, default 0)
    yearsExp: typeof v.yearsExp === 'number' ? v.yearsExp
             : typeof v.experienceYears === 'number' ? v.experienceYears
             : 0,

    // Tarif harian (angka, default 0)
    pricePerDay: typeof v.dailyRate === 'number' ? v.dailyRate
               : typeof v.pricing?.daily === 'number' ? v.pricing.daily
               : 0,

    // Flag/opsi lain
    negotiable: Boolean(v.negoDay ?? v.nego ?? false),
    toolsStandard: !(v.toolsProvidedByOwner ?? false),
    rating: Number(v.rating ?? 0),
    reviewCount: Number(v.reviewCount ?? 0),
    isPro: Array.isArray(v.badges) ? v.badges.includes('pro') : false,
    verified: v.status === 'verified' || v.verified === true,

    // Kontak
    whatsapp: v.phone || v.whatsapp || '',
  } satisfies Vendor;
}

/** Badge kecil */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2 py-0.5">
      {children}
    </span>
  );
}

/** Dropdown sort yang update query string */
function SortSelect({ current }: { current: SortKey }) {
  const options: { v: SortKey; l: string }[] = [
    ['recommended', 'Rekomendasi'],
    ['rating_desc', 'Rating Tertinggi'],
    ['reviews_desc', 'Banyak Ulasan'],
    ['updated_desc', 'Update Terbaru'],
  ].map(([v, l]) => ({ v: v as SortKey, l }));

  const onChange = (val: string) => {
    const qs = new URLSearchParams(window.location.search);
    qs.set('sort', val);
    window.history.pushState({}, '', `?${qs.toString()}`);
    // paksa re-render halaman membaca URL baru
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="border border-slate-200 bg-white rounded-md px-2 py-1"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>{o.l}</option>
      ))}
    </select>
  );
}
