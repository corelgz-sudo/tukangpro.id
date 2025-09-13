'use client';

import * as React from 'react';
import Link from 'next/link';
import { Phone, BadgeCheck, Star, ShieldCheck } from 'lucide-react';
import { Vendor, formatRupiah, waLink } from '@/lib/format';

type Props = {
  vendor: Vendor;
  className?: string;
};

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'T';
}

export default function VendorCard({ vendor, className }: Props) {
  const {
    id,
    displayName,
    avatarUrl,
    city,
    district,
    skills = [],
    yearsExp,
    pricePerDay,
    negotiable,
    toolsStandard,
    rating,
    reviewCount,
    isPro,
    verified,
    whatsapp,
  } = vendor;

  const locationDisplay =
    [district, city].filter(Boolean).join(', ') || '—';
  const mainSkill = skills[0] ?? '—';

  const hasWA = Boolean(whatsapp && whatsapp.trim().length > 0);
  const waHref = hasWA ? waLink(vendor) : undefined;

  // rating stars
  const starFilled = Math.max(0, Math.min(5, Math.floor(rating ?? 0)));
  const stars = Array.from({ length: 5 });

  return (
    <article
      className={[
        'relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md',
        className ?? '',
      ].join(' ')}
    >
      {/* Cover 1:1 */}
      <div className="relative aspect-square w-full bg-slate-100">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`Foto profil ${displayName}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <span className="rounded-full bg-white/80 px-3 py-1 text-lg font-semibold text-slate-700 ring-1 ring-slate-200">
              {initials(displayName)}
            </span>
          </div>
        )}

        {/* Badge kiri: Pro / Free */}
        <div className="pointer-events-none absolute left-3 top-3">
          {isPro ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-xs font-semibold text-white shadow ring-1 ring-amber-500/50">
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Pro
            </span>
          ) : (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300">
              Free
            </span>
          )}
        </div>

        {/* Badge kanan: Verified / Unverified */}
        <div className="pointer-events-none absolute right-3 top-3">
          {verified ? (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow ring-1 ring-emerald-600/60">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
          ) : (
            <span className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300">
              Unverified
            </span>
          )}
        </div>
      </div>

      {/* Nama */}
      <div className="px-4 pt-3">
        <h3 className="truncate text-base font-semibold text-slate-900">
          {displayName}
        </h3>
        
<div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
  {/* Jenis Vendor */}
  {'vendorKind' in vendor && (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-700">
      {(vendor as any).vendorKind === 'kontraktor' ? 'Kontraktor' : 'Tukang'}
    </span>
  )}

  {/* Legalitas */}
  {'legal' in vendor && (vendor as any).legal?.type && (
    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2 py-0.5 text-slate-700">
      {(vendor as any).legal?.type === 'badan_hukum' ? 'Badan Hukum' : 'Tim'}
    </span>
  )}
</div>

      </div>

      {/* Detail */}
      <div className="px-4 pt-2">
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-start gap-2">
            <dt className="w-28 shrink-0 font-semibold text-slate-900">Kota:</dt>
            <dd className="text-slate-800">{locationDisplay}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="w-28 shrink-0 font-semibold text-slate-900">Keahlian:</dt>
            <dd className="text-slate-800">{mainSkill}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="w-28 shrink-0 font-semibold text-slate-900">Pengalaman:</dt>
            <dd className="text-slate-800">
              {typeof yearsExp === 'number' ? `${yearsExp} Tahun` : '—'}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="w-28 shrink-0 font-semibold text-slate-900">Tarif per hari:</dt>
            <dd className="text-slate-800">
              {typeof pricePerDay === 'number' ? formatRupiah(pricePerDay) : '—'}
            </dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="w-28 shrink-0 font-semibold text-slate-900">Borongan:</dt>
            <dd className="text-slate-800">{negotiable ? 'Nego' : '—'}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className="w-28 shrink-0 font-semibold text-slate-900">Alat:</dt>
            <dd className="text-slate-800">{toolsStandard ? 'Tersedia Standar' : '—'}</dd>
          </div>
        </dl>

        {/* Rating */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center">
            {stars.map((_, i) => (
              <Star
                key={i}
                className={[
                  'h-4 w-4',
                  i < starFilled ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300',
                ].join(' ')}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-[#F08519]">
              {(rating ?? 0).toFixed(1)}{' '}
              <span className="font-normal text-slate-700">dari 5</span>
            </span>
          </div>
          <div className="text-sm text-slate-500">{(reviewCount ?? 0)} Ulasan</div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            aria-label={
              hasWA ? `Hubungi ${displayName} via WhatsApp` : `Nomor WhatsApp tidak tersedia`
            }
            className={[
              'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white',
              hasWA
                ? 'bg-[#25D366] hover:bg-[#1ebe57] active:bg-[#17a34a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#25D366]'
                : 'bg-slate-400 cursor-not-allowed',
            ].join(' ')}
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            WHATSAPP
          </a>

          <Link
            href={`/vendor/${id}`}
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-white bg-[#2F318B] hover:bg-[#282A77] active:bg-[#232563] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#2F318B]"
          >
            Selengkapnya
          </Link>
        </div>
      </div>
    </article>
  );
}

/** Skeleton (opsional) */
export function VendorCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={[
        'animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
        className ?? '',
      ].join(' ')}
      aria-hidden="true"
    >
      <div className="aspect-square w-full bg-slate-200" />
      <div className="p-4">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-56 rounded bg-slate-200" />
          <div className="h-3 w-48 rounded bg-slate-200" />
          <div className="h-3 w-40 rounded bg-slate-200" />
          <div className="h-3 w-36 rounded bg-slate-200" />
          <div className="h-3 w-44 rounded bg-slate-200" />
        </div>
        <div className="mt-3 h-4 w-28 rounded bg-slate-200" />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="h-9 rounded-xl bg-slate-200" />
          <div className="h-9 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
