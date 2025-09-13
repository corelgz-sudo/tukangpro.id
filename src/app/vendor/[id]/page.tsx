'use client';

import { notFound } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { BadgeCheck, ShieldCheck, Star, Phone, Heart, X } from 'lucide-react';
import type { Vendor } from '@/lib/format';
import { formatRupiah, waLink } from '@/lib/format';
import VendorCard from '@/components/VendorCard';
import { onAuthStateChanged } from '@/lib/firebase-auth-shim';
import { auth } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';






// ===== Types =====
type PublicVendor = Vendor & {
  cities?: string[];
  districts?: string[];
  priceContract?: number | null;
  surveyFee?: number | null;
  negoDay?: boolean;
  negoContract?: boolean;
  negoSurvey?: boolean;
  about?: string;
  policy?: string;
  portfolioMeta?: { url: string; path?: string }[];
};

// ===== UI helpers =====
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

function Pill({ children, kind = 'neutral' }: { children: React.ReactNode; kind?: 'nego' | 'fixed' | 'neutral' }) {
  const styles =
    kind === 'nego'
      ? 'bg-emerald-50 text-emerald-700'
      : kind === 'fixed'
      ? 'bg-slate-100 text-slate-700'
      : 'bg-indigo-50 text-indigo-700';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{children}</span>;
}

function Stars({ value = 0 }: { value?: number }) {
  const full = Math.floor(value);
  const arr = Array.from({ length: 5 });
  return (
    <div className="flex items-center gap-1">
      {arr.map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < full ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
          aria-hidden
        />
      ))}
    </div>
  );
}

// ===== Page =====
export default function VendorPublicPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';

  const [vendor, setVendor] = useState<PublicVendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [reco, setReco] = useState<Vendor[]>([]);

  // ==== interaksi butuh login (favorit & WA) ====
const [uid, setUid] = useState<string | null>(null);
const router = useRouter();
const pathname = usePathname();
useEffect(() => onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null)), []);
const canInteract = !!uid;

// ==== lightbox untuk portofolio ====
const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
useEffect(() => {
  if (!lightboxSrc) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setLightboxSrc(null);
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [lightboxSrc]);



  // Fetch utama
  useEffect(() => {
    if (!id) return;
    (async () => {
      const ref = doc(db, 'vendors', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setVendor(null);
        setLoading(false);
        return;
      }
      const v = snap.data() as any;

      const mapped: PublicVendor = {
        id: snap.id,
        displayName: v.displayName || v.name || 'Tanpa Nama',
        avatarUrl: v.photoUrl || v.avatarUrl || '',
        city: v.cityNames?.[0] ?? v.city ?? '',
        district: v.districtNames?.[0] ?? v.district ?? '',
        skills: v.skillNames ?? v.skills ?? [],
        subskills: v.subskillNames ?? v.subskills ?? [],
        yearsExp: typeof v.yearsExp === 'number' ? v.yearsExp : undefined,
        pricePerDay: typeof v.pricePerDay === 'number' ? v.pricePerDay : undefined,
        negotiable: Boolean(v.nego ?? v.negotiable ?? v.negoDay),
        toolsStandard: Boolean(v.toolsStandard),
        rating: Number(v.ratingAvg ?? v.rating ?? 0),
        reviewCount: Number(v.ratingCount ?? v.reviews ?? 0),
        isPro: !!(v.isPro ?? (v.proUntil?.toMillis?.() ? v.proUntil.toMillis() > Date.now() : v.pro)),
        verified: !!v.verified,
        whatsapp: v.waNumber || v.whatsapp || '',
        cities: Array.isArray(v.cities) ? v.cities : v.cityNames ?? (v.city ? [v.city] : []),
        districts: Array.isArray(v.districts) ? v.districts : v.districtNames ?? (v.district ? [v.district] : []),
        priceContract: typeof v.priceContract === 'number' ? v.priceContract : null,
        surveyFee: typeof v.surveyFee === 'number' ? v.surveyFee : null,
        negoDay: Boolean(v.negoDay ?? v.nego ?? v.negotiable),
        negoContract: Boolean(v.negoContract),
        negoSurvey: Boolean(v.negoSurvey),
        about: v.about ?? '',
        policy: v.policy ?? '',
        portfolioMeta: Array.isArray(v.portfolioMeta)
          ? v.portfolioMeta
          : (v.portfolio ?? []).map((u: string) => ({ url: u })),
      };

      setVendor(mapped);
      setLoading(false);

      // fetch rekomendasi (overlap skill, bukan dirinya)
      const s = mapped.skills?.slice(0, 1) ?? [];
      if (s.length) {
        const q = query(
          collection(db, 'vendors'),
          where('skills', 'array-contains-any', s),
          limit(6)
        );
        const rec = await getDocs(q);
        const items: Vendor[] = [];
        rec.forEach((d) => {
          if (d.id === id) return;
          const x: any = d.data();
          items.push({
            id: d.id,
            displayName: x.displayName || x.name || 'Tanpa Nama',
            avatarUrl: x.photoUrl || x.avatarUrl || '',
            city: x.cityNames?.[0] ?? x.city ?? '',
            district: x.districtNames?.[0] ?? x.district ?? '',
            skills: x.skillNames ?? x.skills ?? [],
            subskills: x.subskillNames ?? x.subskills ?? [],
            yearsExp: x.yearsExp,
            pricePerDay: x.pricePerDay,
            negotiable: Boolean(x.nego ?? x.negotiable ?? x.negoDay),
            toolsStandard: Boolean(x.toolsStandard),
            rating: Number(x.ratingAvg ?? x.rating ?? 0),
            reviewCount: Number(x.ratingCount ?? x.reviews ?? 0),
            isPro: !!(x.isPro ?? x.pro),
            verified: !!x.verified,
            whatsapp: x.waNumber || x.whatsapp || '',
          });
        });
        setReco(items);
      } else {
        setReco([]);
      }
    })();
  }, [id]);

  if (!loading && !vendor) {
    notFound();
  }

  // skeleton
  if (loading || !vendor) {
    return (
      <main className="min-h-screen bg-[#F5F7FF]">
        <div className="mx-auto max-w-6xl p-4 sm:p-6">
          <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
        </div>

{lightboxSrc && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    onClick={() => setLightboxSrc(null)}
    role="dialog"
    aria-modal="true"
    aria-label="Preview foto"
  >
    {/* Tombol X */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setLightboxSrc(null);
      }}
      aria-label="Tutup gambar"
      className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
    >
      <X className="h-5 w-5" aria-hidden />
    </button>

    {/* Gambar besar */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={lightboxSrc}
      alt="Preview portofolio"
      className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
      onClick={(e) => e.stopPropagation()} // jangan tutup saat klik gambar
    />
  </div>
)}



      </main>
    );
  }

// ---- ambil nilai yang bisa null/undefined dari vendor ----
const dayPrice =
  typeof vendor.pricePerDay === 'number' ? vendor.pricePerDay : null;
const contractPrice =
  typeof (vendor as any).priceContract === 'number' ? (vendor as any).priceContract : null;
const surveyPrice =
  typeof (vendor as any).surveyFee === 'number' ? (vendor as any).surveyFee : null;

const dayNego = typeof (vendor as any).negoDay === 'boolean'
  ? (vendor as any).negoDay
  : !!vendor.negotiable;                     // fallback untuk field lama
const contractNego = !!(vendor as any).negoContract;
const surveyNego   = !!(vendor as any).negoSurvey;

const hasTools = !!vendor.toolsStandard;


  const {
    displayName,
    avatarUrl,
    verified,
    isPro,
    rating,
    reviewCount,
    cities,
    districts,
    city,
    district,
    skills,
    subskills,
    yearsExp,
    pricePerDay,
    priceContract,
    surveyFee,
    negoDay,
    negoContract,
    negoSurvey,
    toolsStandard,
    whatsapp,
    about,
    policy,
    portfolioMeta,
  } = vendor;

  const lokasiKota = (cities?.length ? cities : city ? [city] : []);
  const lokasiKec = (districts?.length ? districts : district ? [district] : []);

  return (
    <main className="min-h-screen bg-[#F5F7FF]">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
       {/* TOP ROW: HERO (left) + SPEC/AREA/WA (right) */}
<div className="grid gap-4 lg:grid-cols-3">
  {/* HERO kiri (span 2 kolom) */}
  <section className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* avatar besar */}
      <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={`Foto ${displayName}`} fill sizes="144px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* info utama */}
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">{displayName}</h1>
          {verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4" aria-hidden /> Unverified
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${isPro ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
            <BadgeCheck className="h-4 w-4" aria-hidden /> {isPro ? 'PRO' : 'Free'}
          </span>
          <button
  type="button"
  aria-label={canInteract ? 'Simpan ke favorit' : 'Login untuk menyimpan'}
  onClick={canInteract ? () => {/* TODO: simpan favorit */} : () => router.push(`/login?next=${encodeURIComponent(pathname)}`)}
  className={`ml-auto inline-flex items-center rounded-full border border-slate-200 p-2 ${
    canInteract ? 'text-slate-400 hover:text-rose-500' : 'cursor-not-allowed text-slate-300'
  }`}
  disabled={!canInteract}
>
  <Heart className="h-5 w-5" aria-hidden />
</button>

        </div>

        {/* lokasi + skill + pengalaman */}
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <div>
  📍 {cities?.length ? cities.join(', ') : (city || '—')}
</div>

          <div><span className="font-medium">Keahlian:</span> {skills?.length ? skills.join(', ') : '—'}</div>
          <div><span className="font-medium">Pengalaman:</span> {typeof yearsExp === 'number' ? `${yearsExp} tahun` : '—'}</div>
        </div>

        {/* rating */}
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Stars value={rating ?? 0} />
          <span className="font-semibold text-slate-900">{(rating ?? 0).toFixed(1)}</span>
          <span className="text-slate-600">dari 5</span>
          <span className="mx-2 h-1 w-1 rounded-full bg-slate-300" />
          <span className="text-slate-600">{reviewCount ?? 0} Ulasan</span>
        </div>

        {/* galeri kecil */}
        {portfolioMeta?.length ? (
  <div className="mt-3 flex flex-wrap gap-2">
    {portfolioMeta.slice(0, 6).map((p, i) => (
      <button
        key={i}
        type="button"
        onClick={() => setLightboxSrc(p.url)}
        className="relative h-14 w-20 overflow-hidden rounded-md border border-slate-200 cursor-zoom-in"

        aria-label={`Perbesar foto ${i + 1}`}
      >
        <Image src={p.url} alt={`Foto ${i + 1}`} fill sizes="80px" className="object-cover" />
      </button>
    ))}
  </div>
) : null}


      </div>
    </div>
  </section>

  {/* PANEL KANAN: Spesifikasi + Area + WhatsApp */}
  <aside className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm lg:sticky lg:top-4">
    <h3 className="mb-2 text-sm font-semibold text-slate-900">Spesifikasi Tukang</h3>
    {subskills?.length ? (
      <div className="mb-3 flex flex-wrap gap-2">
        {subskills.map((s, i) => (
          <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{s}</span>
        ))}
      </div>
    ) : (
      <p className="mb-3 text-sm text-slate-600">Belum ada subskill.</p>
    )}

    <h3 className="mb-2 mt-3 text-sm font-semibold text-slate-900">Area jangkauan</h3>
{(districts?.length || district) ? (
  <div className="mb-3 flex flex-wrap gap-2">
    {(districts?.length ? districts : (district ? [district] : []))
      .map((d, i) => (
        <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
          {d}
        </span>
      ))}
  </div>
) : (
  <p className="mb-3 text-sm text-slate-600">Belum diatur.</p>
)}


    {canInteract ? (
  <a
    href={waLink(vendor)}
    target="_blank"
    rel="noopener"
    aria-label={`Hubungi ${displayName} via WhatsApp`}
    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0D7D46] px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#25D366]"
  >
    <Phone className="h-4 w-4" aria-hidden />
    WHATSAPP
  </a>
) : (
  <button
    onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}
    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
    aria-label="Login untuk menghubungi via WhatsApp"
  >
    <Phone className="h-4 w-4" aria-hidden />
    WHATSAPP
  </button>
)}

  </aside>
</div>


        {/* GRID 3 kolom: konten kiri + sidebar kanan */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Kiri (2 kolom) */}
          <div className="space-y-4 lg:col-span-2">
            {/* Deskripsi */}
            <SectionCard title="Deskripsi Tukang">
              <p className="whitespace-pre-line text-slate-700">
                {about?.trim() ? about : 'Belum ada deskripsi.'}
              </p>
            </SectionCard>

            {/* Kebijakan */}
            <SectionCard title="Kebijakan">
              <p className="whitespace-pre-line text-slate-700">
                {policy?.trim() ? policy : 'Belum ada kebijakan khusus.'}
              </p>
            </SectionCard>

            {/* Penilaian */}
            <SectionCard title="Penilaian Tukang">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stars value={rating ?? 0} />
                  <span className="font-semibold text-slate-900">{(rating ?? 0).toFixed(1)}</span>
                  <span className="text-slate-600">dari 5</span>
                </div>
                <div className="text-sm text-slate-600">{reviewCount ?? 0} Ulasan</div>
              </div>
              <p className="mt-3 text-slate-600">Belum ada ulasan untuk tukang ini.</p>
            </SectionCard>
          </div>

          {/* Kanan (1 kolom) */}
          <div className="space-y-4">
            {/* Spesifikasi (subskills) */}
            

            {/* Area jangkauan */}
            

            {/* Tombol WA */}
            



            {/* Harian */}
<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <h4 className="mb-2 text-base font-semibold text-slate-900">Harian</h4>

  {/* pill harga oranye, ambil dari pricePerDay */}
  <div className="mt-1">
    <span className="inline-flex items-center rounded-md bg-[#F08519] px-4 py-1 text-sm font-extrabold tracking-wide text-white">
      {dayPrice !== null ? formatRupiah(dayPrice).replace('Rp ', '') : '—'}
    </span>
  </div>

  {/* bullet: contoh default + kondisi dari profil */}
  <ul className="mt-3 ml-4 list-disc space-y-1 text-sm marker:text-[#D40000]">
    <li>Jam 08.00 - 16.00 (8 Jam)</li>
    <li>Include Transport</li>
    <li>Include Makan</li>
    {/* kamu boleh pilih salah satu: survey info atau alat */}
    <li>{surveyNego ? 'Alat Standar Disediakan Tukang' : 'Survey sesuai catatan'}</li>
  </ul>

  {/* status NEGO/TETAP (ikut profil) */}
  <span
    className={`mt-3 inline-flex rounded-md px-3 py-1 text-xs font-bold ${
      dayNego ? 'bg-[#F08519] text-white' : 'bg-slate-200 text-slate-700'
    }`}
  >
    {dayNego ? 'NEGO' : 'TETAP'}
  </span>
</div>

{/* Borongan */}
<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <h4 className="mb-2 text-base font-semibold text-slate-900">Borongan</h4>

  {/* jika ada priceContract, tampilkan juga pill harga */}
  {contractPrice !== null && (
    <div className="mt-1">
      <span className="inline-flex items-center rounded-md bg-[#F08519] px-4 py-1 text-sm font-extrabold tracking-wide text-white">
        {formatRupiah(contractPrice).replace('Rp ', '')}
      </span>
    </div>
  )}

  <span
    className={`mt-3 inline-flex items-center rounded-md px-3 py-1 text-xs font-bold ${
      contractNego ? 'bg-[#0D7D46] text-white' : 'bg-slate-200 text-slate-700'
    }`}
  >
    {contractNego ? 'NEGO' : 'TETAP'}
  </span>

  <ul className="mt-3 ml-4 list-disc space-y-1 text-sm marker:text-[#D40000]">
    {hasTools && <li>Alat Standar Disediakan Tukang</li>}
    <li>Sesuai kesepakatan</li>
  </ul>
</div>

{/* Survey */}
<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
  <h4 className="mb-2 text-base font-semibold text-slate-900">Survey</h4>

  {/* jika ada fee, tampilkan pill harga */}
  {surveyPrice !== null && (
    <div className="mt-1">
      <span className="inline-flex items-center rounded-md bg-[#F08519] px-4 py-1 text-sm font-extrabold tracking-wide text-white">
        {formatRupiah(surveyPrice).replace('Rp ', '')}
      </span>
    </div>
  )}

  <span
    className={`mt-3 inline-flex items-center rounded-md px-3 py-1 text-xs font-bold ${
      surveyNego ? 'bg-[#0D7D46] text-white' : 'bg-slate-200 text-slate-700'
    }`}
  >
    {surveyNego ? 'NEGO' : 'TETAP'}
  </span>

  <ul className="mt-3 ml-4 list-disc space-y-1 text-sm marker:text-[#D40000]">
    <li>Waktu disepakati</li>
  </ul>
</div>



            {/* NOTE */}
            <SectionCard title="NOTE">
              <p className="text-sm text-slate-700">
                Informasikan kebutuhan anda kepada tukang selengkap mungkin supaya tidak terjadi kesalahpahaman.
              </p>
            </SectionCard>
          </div>
        </div>

        {/* Rekomendasi Tukang Lain */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-start-3">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Rekomendasi Tukang Lain</h3>
            {reco.length ? (
              <div className="grid gap-3">
                {reco.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-600">Belum ada rekomendasi.</p>
            )}
          </section>
        </div>
      </div>

{lightboxSrc && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    onClick={() => setLightboxSrc(null)}
    role="dialog"
    aria-modal="true"
    aria-label="Preview foto"
  >
    {/* Tombol X */}
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setLightboxSrc(null);
      }}
      aria-label="Tutup gambar"
      className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white"
    >
      <X className="h-5 w-5" aria-hidden />
    </button>

    {/* Gambar besar */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={lightboxSrc}
      alt="Preview portofolio"
      className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl"
      onClick={(e) => e.stopPropagation()} // jangan tutup saat klik gambar
    />
  </div>
)}



    </main>
  );
}
