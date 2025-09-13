// src/components/vendor/VendorDashboard.tsx
'use client';

import { formatRupiah, Vendor } from '@/lib/format';
import {
  BadgeCheck,
  CheckCircle2,
  Edit3,
  Phone,
  ShieldCheck,
  Star,
  Wrench,   // ⬅️ ganti dari Tool → Wrench
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useMemo } from 'react';

// tipe yang lebih lengkap utk dashboard (superset dari Vendor)
type DashboardVendor = Vendor & {
  cities?: string[];
  districts?: string[];
  priceContract?: number | null;
  surveyFee?: number | null;
  negoDay?: boolean;
  negoContract?: boolean;
  negoSurvey?: boolean;
  about?: string;
  policy?: string;
};


type Props = { vendor: DashboardVendor };

export default function VendorDashboard({ vendor }: Props) {
  // hitung kelengkapan profil sederhana
  const completeness = useMemo(() => {
  const hasLocation =
    (vendor.cities && vendor.cities.length > 0) ||
    !!vendor.city ||
    (vendor.districts && vendor.districts.length > 0) ||
    !!vendor.district;

  const hasAnyPrice =
    typeof vendor.pricePerDay === 'number' || typeof vendor.priceContract === 'number';

  const checks = [
    !!vendor.displayName && vendor.displayName.trim().length >= 2,
    hasLocation,
    (vendor.skills?.length ?? 0) > 0,
    !!vendor.whatsapp,
    hasAnyPrice,
    typeof vendor.yearsExp === 'number',
    typeof vendor.toolsStandard === 'boolean',
  ];
  const done = checks.filter(Boolean).length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);
  return { done, total, pct };
}, [vendor]);


  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      {/* Header */}
      <section className="flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
            {vendor.avatarUrl ? (
              <Image
                src={vendor.avatarUrl}
                alt={`Foto ${vendor.displayName}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-slate-500">
                {vendor.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{vendor.displayName}</h1>
          

            <div className="mt-2 flex flex-wrap gap-2">
              {vendor.isPro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pro
                </span>
              )}
              {vendor.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Rating" value={(vendor.rating ?? 0).toFixed(1)} icon={<Star className="h-4 w-4" />} />
          <Stat label="Ulasan" value={String(vendor.reviewCount ?? 0)} icon={<CheckCircle2 className="h-4 w-4" />} />
          <Stat label="Kelengkapan" value={`${completeness.pct}%`} icon={<Wrench className="h-4 w-4" />} />
        </div>
      </section>

      {/* Grid utama */}
      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Kolom kiri: Info & skills */}
        <div className="col-span-2 flex flex-col gap-4">
          <Card title="Informasi Utama">
            {/* Kota/Kabupaten */}
<ListItem
  label="Kota/Kabupaten"
  value={vendor.cities?.length ? vendor.cities.join(', ') : (vendor.city || '—')}
/>

{/* Kecamatan */}
<ListItem
  label="Kecamatan"
  value={vendor.districts?.length ? vendor.districts.join(', ') : (vendor.district || '—')}
/>


            <ListItem label="Keahlian" value={vendor.skills?.join(', ') || '-'} />
            <ListItem
              label="Subskill"
              value={
                vendor.subskills && vendor.subskills.length > 0
                  ? vendor.subskills.join(', ')
                  : '-'
              }
            />
            <ListItem
  label="Tarif"
  value={
    vendor.pricePerDay != null
      ? `${formatRupiah(vendor.pricePerDay)} / hari${(vendor.negoDay ?? vendor.negotiable) ? ' · Nego' : ''}`
      : '-'
  }
  icon={<Wallet className="h-4 w-4" />}
/>
{vendor.priceContract != null && (
  <ListItem
    label="Borongan"
    value={`${formatRupiah(vendor.priceContract)}${vendor.negoContract ? ' · Nego' : ''}`}
  />
)}

{vendor.surveyFee != null && (
  <ListItem
    label="Survey"
    value={`${formatRupiah(vendor.surveyFee)}${vendor.negoSurvey ? ' · Nego' : ''}`}
  />
)}

            <ListItem
              label="Pengalaman"
              value={vendor.yearsExp != null ? `${vendor.yearsExp} tahun` : '-'}
            />
            <ListItem
              label="Alat"
              value={vendor.toolsStandard ? 'Alat tersedia standar' : 'Alat by request'}
            />
            <ListItem
              label="WhatsApp"
              value={vendor.whatsapp || '-'}
              icon={<Phone className="h-4 w-4" />}
            />
          </Card>

          <div className="sm:col-span-2 mt-2 grid gap-4 sm:grid-cols-2">
  {/* Deskripsi */}
<section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
  <h3 className="mb-3 text-base font-semibold text-slate-900">Deskripsi</h3>
  <p className="whitespace-pre-line text-slate-800">{vendor.about || '—'}</p>
</section>

{/* Kebijakan Tukang */}
<section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
  <h3 className="mb-3 text-base font-semibold text-slate-900">Kebijakan Tukang</h3>
  <p className="whitespace-pre-line text-slate-800">{vendor.policy || '—'}</p>
</section>

</div>

          
        </div>

        {/* Kolom kanan: Progress & tips */}
        <div className="flex flex-col gap-4">
          <Card title="Kelengkapan Profil">
            <div className="text-sm text-slate-600">
              {completeness.done} dari {completeness.total} poin terisi
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-[#2F318B]"
                style={{ width: `${completeness.pct}%` }}
                aria-label={`Kelengkapan ${completeness.pct}%`}
              />
            </div>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
              {missingHints(vendor).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Card>

          <Card title="Panduan Singkat">
            <ul className="space-y-2 text-sm text-slate-600">
              <li>• Lengkapi foto profil dan contoh pekerjaan terbaik.</li>
              <li>• Aktifkan badge <b>Verified</b> lewat verifikasi admin.</li>
              <li>• Tulis subskill spesifik (mis. “baja ringan, waterproofing”).</li>
              <li>• Balas cepat chat WhatsApp untuk tingkatkan rating.</li>
            </ul>
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
      <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-lg font-bold text-slate-900">{value}</div>
    </div>
  );
}

function ListItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
      <div className="mt-1 shrink-0 text-slate-500">{icon}</div>
      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="text-sm text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function missingHints(v: DashboardVendor): string[] {
  const tips: string[] = [];
  const hasLocation =
    (v.cities && v.cities.length > 0) ||
    !!v.city ||
    (v.districts && v.districts.length > 0) ||
    !!v.district;

  const hasAnyPrice =
    typeof v.pricePerDay === 'number' || typeof v.priceContract === 'number';

  if (!hasLocation) tips.push('Lengkapi lokasi kota/kecamatan.');
  if (!v.skills || v.skills.length === 0) tips.push('Tambah minimal 1 keahlian utama.');
  if (!v.whatsapp) tips.push('Isi nomor WhatsApp agar pelanggan bisa menghubungi.');
  if (!hasAnyPrice) tips.push('Isi tarif: harian atau borongan (bisa Nego).');
  if (typeof v.yearsExp !== 'number') tips.push('Isi lama pengalaman (tahun).');
  if (typeof v.toolsStandard !== 'boolean') tips.push('Tandai ketersediaan alat (standar/by request).');
  return tips;
}

