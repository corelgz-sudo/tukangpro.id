'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';
import { formatRupiah, waLink } from '@/lib/format';
import type { Vendor } from '@/lib/format';
import {
  Phone,
  BadgeCheck,
  Star,
  ShieldCheck,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import VendorCard from '@/components/VendorCard';

type Props = { id: string };

function Stars({ rating = 0 }: { rating?: number }) {
  const filled = Math.floor(Math.max(0, Math.min(5, rating)));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={[
            'h-4 w-4',
            i < filled ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300',
          ].join(' ')}
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function VendorDetailClient({ id }: Props) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [reco, setReco] = useState<Vendor[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, 'vendors', id));
      if (!snap.exists()) {
        setVendor(null);
        return;
      }
      const data = snap.data() as any;
      const v: Vendor = {
        id: snap.id,
        displayName: data.displayName || 'Tukang',
        avatarUrl: data.avatarUrl || '',
        city: data.city || data.cities?.[0] || '',
        district: data.district || data.districts?.[0] || '',
        skills: data.skills || [],
        subskills: data.subskills || [],
        yearsExp: data.yearsExp ?? undefined,
        pricePerDay: data.pricePerDay ?? undefined,
        negotiable: data.negoDay ?? data.negotiable ?? false,
        toolsStandard: data.toolsStandard ?? true,
        rating: data.rating ?? 0,
        reviewCount: data.reviewCount ?? 0,
        isPro: data.isPro ?? false,
        verified: data.verified ?? false,
        whatsapp: data.whatsapp || '',
      };
      setVendor(v);

      // recommended: kota sama atau skill pertama sama (ambil 6 lain)
      const byCity = v.city
        ? query(
            collection(db, 'vendors'),
            where('city', '==', v.city),
            limit(6)
          )
        : query(collection(db, 'vendors'), limit(6));
      const recSnap = await getDocs(byCity);
      const list: Vendor[] = recSnap.docs
        .filter((d) => d.id !== v.id)
        .map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            displayName: x.displayName || 'Tukang',
            avatarUrl: x.avatarUrl || '',
            city: x.city || x.cities?.[0] || '',
            district: x.district || x.districts?.[0] || '',
            skills: x.skills || [],
            subskills: x.subskills || [],
            yearsExp: x.yearsExp ?? undefined,
            pricePerDay: x.pricePerDay ?? undefined,
            negotiable: x.negoDay ?? x.negotiable ?? false,
            toolsStandard: x.toolsStandard ?? true,
            rating: x.rating ?? 0,
            reviewCount: x.reviewCount ?? 0,
            isPro: x.isPro ?? false,
            verified: x.verified ?? false,
            whatsapp: x.whatsapp || '',
          } as Vendor;
        });
      setReco(list);
    })();
  }, [id]);

  const gallery: string[] = useMemo(() => {
    const meta = (vendor as any)?.portfolioMeta as { url: string }[] | undefined;
    const portfolio = meta?.map((m) => m.url) ?? ((vendor as any)?.portfolio ?? []);
    const imgs = (portfolio as string[]).filter(Boolean);
    // avatar at first if exists
    return [vendor?.avatarUrl, ...imgs].filter(Boolean) as string[];
  }, [vendor]);

  if (!vendor) return <VendorDetailSkeleton />;

  const waHref = vendor.whatsapp ? waLink(vendor) : undefined;
  // helper lokasi untuk chip area
const lokasiKota = ((vendor as any).cities ?? [vendor.city]).filter(Boolean) as string[];
const lokasiKec  = ((vendor as any).districts ?? [vendor.district]).filter(Boolean) as string[];


  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
      
       {/* ====== BARIS ATAS: HERO (kiri) + SPESIFIKASI/AREA/WA (kanan) ====== */}
<div className="grid gap-6 lg:grid-cols-3">
  {/* HERO hanya satu kartu (span 2) */}
  <article className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="grid grid-cols-[112px,1fr] gap-4">
      {/* avatar / hero image */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        {gallery[activeImageIdx] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gallery[activeImageIdx]}
            alt={`Foto ${vendor.displayName}`}
            className="h-28 w-28 object-cover md:h-36 md:w-36"
          />
        ) : (
          <div className="grid h-28 w-28 place-items-center bg-slate-100 text-slate-400 md:h-36 md:w-36">
            1:1
          </div>
        )}
      </div>

      {/* judul, badge, lokasi, keahlian, pengalaman, rating */}
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h1 className="truncate text-xl font-bold text-slate-900 md:text-2xl">
            {vendor.displayName}
          </h1>
          <button
            type="button"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            aria-label="Simpan ke favorit"
            title="Simpan"
          >
            ♥
          </button>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {vendor.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
              Unverified
            </span>
          )}
          {vendor.isPro ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
              PRO
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
              Free
            </span>
          )}
        </div>

        <div className="mt-3 text-sm leading-6 text-slate-800">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-slate-500" aria-hidden />
            <span className="truncate">
              {[vendor.city, vendor.district].filter(Boolean).join(', ')}
            </span>
          </div>
          <div>
            <span className="font-semibold">Keahlian:</span>{' '}
            {vendor.skills?.[0] ?? '—'}
          </div>
          <div>
            <span className="font-semibold">Pengalaman:</span>{' '}
            {typeof vendor.yearsExp === 'number' ? `${vendor.yearsExp} Tahun` : '—'}
          </div>
        </div>

        {/* rating */}
        <div className="mt-2 flex items-center gap-2">
          <Stars rating={vendor.rating} />
          <div className="text-sm">
            <span className="font-semibold text-[#F08519]">
              {(vendor.rating ?? 0).toFixed(1)}{' '}
            </span>
            <span className="text-slate-600">dari 5</span>
            {vendor.reviewCount ? (
              <span className="text-slate-400"> · {vendor.reviewCount} Ulasan</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>

    {/* thumbnails */}
    {gallery.length > 1 && (
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {gallery.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`Foto ${i + 1}`}
            onClick={() => setActiveImageIdx(i)}
            className={[
              'h-14 w-14 cursor-pointer rounded-md border object-cover',
              i === activeImageIdx ? 'border-[#2F318B]' : 'border-slate-200 hover:border-slate-300',
            ].join(' ')}
          />
        ))}
      </div>
    )}
  </article>

  {/* PANEL KANAN: spesifikasi + area + WA (menempel di atas) */}
  <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4">
    <h3 className="mb-2 text-sm font-semibold text-slate-900">Spesifikasi Tukang</h3>
    {(vendor.subskills?.length ? vendor.subskills : vendor.skills)?.slice(0, 12).length ? (
      <div className="mb-3 flex flex-wrap gap-2">
        {(vendor.subskills?.length ? vendor.subskills : vendor.skills)
          .slice(0, 12)
          .map((s) => (
            <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {s}
            </span>
          ))}
      </div>
    ) : (
      <p className="mb-3 text-sm text-slate-600">Belum ada subskill.</p>
    )}

    <h3 className="mb-2 mt-3 text-sm font-semibold text-slate-900">Area jangkauan</h3>
    {(lokasiKec.length || lokasiKota.length) ? (
      <div className="mb-3 flex flex-wrap gap-2">
        {lokasiKec.map((d, i) => (
          <span key={`d-${i}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {d}
          </span>
        ))}
        {lokasiKota.map((c, i) => (
          <span key={`c-${i}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {c}
          </span>
        ))}
      </div>
    ) : (
      <p className="mb-3 text-sm text-slate-600">Belum diatur.</p>
    )}

    <a
      href={waHref}
      target="_blank"
      rel="noopener"
      aria-label={`Hubungi ${vendor.displayName} via WhatsApp`}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
    >
      <Phone className="h-4 w-4" aria-hidden />
      WHATSAPP
    </a>
  </aside>
</div>

{/* ====== BARIS BAWAH: kiri (desc/kebijakan/penilaian) & kanan (harga/dll) ====== */}
<div className="mt-4 grid gap-4 lg:grid-cols-3">
  {/* kiri */}
  <div className="space-y-4 lg:col-span-2">
    {/* Deskripsi */}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Deskripsi Tukang</h2>
      <div className="px-4 py-3 text-sm leading-7 text-slate-800 whitespace-pre-wrap">
        {(vendor as any).about || 'Belum ada deskripsi.'}
      </div>
    </section>

    {/* Kebijakan */}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <h2 className="border-b px-4 py-3 text-sm font-semibold text-slate-900">Kebijakan</h2>
      <div className="px-4 py-3 text-sm leading-7 text-slate-800 whitespace-pre-wrap">
        {(vendor as any).policy || 'Belum ada kebijakan khusus.'}
      </div>
    </section>

    {/* Penilaian */}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Penilaian Tukang</h2>
        <div className="flex items-center gap-2">
          <Stars rating={vendor.rating} />
          <span className="text-sm text-slate-700">
            <span className="font-semibold text-[#F08519]">{(vendor.rating ?? 0).toFixed(1)}</span> dari 5
          </span>
        </div>
      </div>
      <div className="px-4 py-6 text-sm text-slate-500">Belum ada ulasan untuk tukang ini.</div>
    </section>
  </div>

  {/* kanan */}
  <div className="space-y-4">
    {/* Harian */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-900">Harian</h4>
      <div className="text-lg font-bold text-[#2F318B]">
        {typeof vendor.pricePerDay === 'number' ? formatRupiah(vendor.pricePerDay) : 'Hubungi'}
      </div>
      <ul className="mt-2 space-y-1 text-sm text-slate-700">
        {[
          'Jam 08.00 - 16.00 (8 Jam)',
          'Include Transport',
          'Include Makan',
          (vendor as any).negoSurvey ? 'Survey negosiasi' : 'Survey sesuai catatan',
        ].map((txt) => (
          <li key={txt} className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
            {txt}
          </li>
        ))}
      </ul>
    </div>

    {/* Borongan */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-900">Borongan</h4>
      <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
        {(vendor as any).negoContract ? 'NEGO' : 'Tetap'}
      </span>
      <div className="mt-2 text-sm text-slate-700">
        {vendor.toolsStandard && (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
            Alat Standar Disediakan Tukang
          </div>
        )}
      </div>
    </div>

    {/* Survey */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-900">Survey</h4>
      <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
        {(vendor as any).negoSurvey ? 'NEGO' : 'Tetap'}
      </span>
      <div className="mt-2 text-sm text-slate-700">Waktu disepakati</div>
    </div>

    {/* Note */}
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-600">
        <span className="font-semibold">NOTE:</span> Informasikan kebutuhan anda kepada
        tukang selengkap mungkin supaya tidak terjadi kesalahpahaman.
      </p>
    </div>
  </div>


      </div>

      {/* Rekomendasi */}
      {reco.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Rekomendasi Tukang Lain
            </h2>
            <Link
              href="/"
              className="text-sm font-medium text-[#2F318B] hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reco.slice(0, 6).map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------------- Skeleton ---------------- */
export function VendorDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-[112px,1fr] gap-4">
              <div className="h-28 w-28 rounded-2xl bg-slate-200 md:h-36 md:w-36" />
              <div className="space-y-3">
                <div className="h-6 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-4 w-1/2 rounded bg-slate-200" />
              </div>
            </div>
            <div className="mt-3 h-14 w-full rounded bg-slate-200" />
          </div>
          <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
