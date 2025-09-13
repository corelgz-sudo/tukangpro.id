// app/dashboard/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';


import type { Vendor } from '@/lib/format';
import VendorDashboard from '@/components/vendor/VendorDashboard';
import EditVendorForm from '@/components/vendor/EditVendorForm';
import PortfolioUploader, { PortfolioItem } from '@/components/vendor/PortfolioUploader';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

// ---------- Tipe vendor untuk dashboard (superset dari Vendor) ----------
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
  portfolioMeta?: PortfolioItem[];
  isPro?: boolean;
};

function resolveRole(data: any): 'owner'|'vendor'|'admin' {
  if (typeof data?.role === 'string' && ['owner','vendor','admin'].includes(data.role)) {
    return data.role;
  }
  if (Array.isArray(data?.roles)) {
    if (data.roles.includes('admin')) return 'admin';
    if (data.roles.includes('vendor')) return 'vendor';
    if (data.roles.includes('owner')) return 'owner';
  }
  return 'owner';
}


export default function DashboardPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [vendor, setVendor] = useState<DashboardVendor | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Tab via query param ----
  const searchParams = useSearchParams();
  const tab =
    (searchParams?.get('tab') as
      | 'overview'
      | 'edit'
      | 'portfolio'
      | 'pro'
      | 'verify'
      | 'tender'
      | 'referral') || 'overview';

  // ---- Auth guard ----
  // ---- Auth guard ----
useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (!user) {
      setUid(null);
      setAuthReady(true);
      router.replace('/login?role=vendor&next=/dashboard');
    } else {
      setUid(user.uid);
      setAuthReady(true);
    }
  });
  return () => unsub();
}, [router]);


// ---- Role guard: vendor-only + cross-check vendors/{uid} ----
useEffect(() => {
  if (!authReady || !uid) return;
  (async () => {
    const usnap = await getDoc(doc(db, 'users', uid));
    let role = resolveRole(usnap.data());

    // jika ada dokumen vendors/{uid}, anggap vendor (meski user.role salah)
    try {
      const vsnap = await getDoc(doc(db, 'vendors', uid));
      if (vsnap.exists()) role = 'vendor';
    } catch {}

    if (role !== 'vendor') router.replace('/owner');
  })();
}, [authReady, uid, router]);



  // ---- Live fetch vendor profile ----
  useEffect(() => {
    if (!uid) {
      setVendor(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const ref = doc(db, 'vendors', uid);
    const off = onSnapshot(
      ref,
      (snap) => {
        const v = snap.data() as any;
        if (!v) {
          setVendor(null);
        } else {
          const mapped: DashboardVendor = {
            // bidang lama
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

            // bidang baru
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
              : (v.portfolio ?? []).map((u: string) => ({ url: u, path: '' })),
          };
          setVendor(mapped);
        }
        setLoading(false);
      },
      (e) => {
        console.error('vendors snapshot error:', e);
        setError(e?.code || 'unknown');
        setLoading(false);
      }
    );

    return () => off();
  }, [uid]);

  async function createVendorScaffold() {
    if (!uid) return;
    setCreating(true);
    try {
      const ref = doc(db, 'vendors', uid);
      const exists = await getDoc(ref);
      if (!exists.exists()) {
        const u = auth.currentUser;
        await setDoc(
          ref,
          {
            displayName: u?.displayName || (u?.email ? u.email.split('@')[0] : 'Pengguna Baru'),
            email: u?.email ?? null,
            city: '',
            district: '',
            skills: [],
            subskills: [],
            yearsExp: null,
            pricePerDay: null,
            priceContract: null,
            surveyFee: null,
            negoDay: true,
            negoContract: true,
            negoSurvey: true,
            toolsStandard: true,
            rating: 0,
            ratingCount: 0,
            verified: false,
            isPro: false,
            waNumber: '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (e: any) {
      alert(`Gagal membuat profil: ${e.code ?? e.message}`);
    } finally {
      setCreating(false);
    }
  }

  // ---- Komponen kecil: Tabs ----
  function Tabs() {
    const base = '/dashboard';
    const item = (
      key: 'overview' | 'edit' | 'portfolio' | 'pro' | 'verify' | 'tender' | 'referral',
      label: string
    ) => (
      <Link
        key={key}
        href={`${base}?tab=${key}`}
        className={
          'rounded-lg px-3 py-1.5 text-sm font-medium ' +
          (tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900')
        }
      >
        {label}
      </Link>
    );
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {item('overview', 'Ringkasan')}
        {item('edit', 'Edit Profil')}
        {item('portfolio', 'Portofolio')}
        {item('pro', 'Upgrade ke Pro')}
        {item('verify', 'Verifikasi')}
        {item('tender', 'Tender')}
        {item('referral', 'Referal')}
      </div>
    );
  }

  // ---- Portofolio inline (tab) ----
  function PortfolioInline() {
    const [items, setItems] = useState<PortfolioItem[]>(vendor?.portfolioMeta ?? []);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      setItems(vendor?.portfolioMeta ?? []);
    }, [vendor?.portfolioMeta]);

    const onSave = async () => {
      if (!uid) return;
      setSaving(true);
      await setDoc(
        doc(db, 'vendors', uid),
        { portfolioMeta: items, portfolio: items.map((i) => i.url), updatedAt: new Date() },
        { merge: true }
      );
      setSaving(false);
    };

    return (
      <div className="space-y-4">
        <PortfolioUploader uid={uid || ''} items={items} onChange={setItems} />
        <div className="flex justify-end">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#282A77] focus:outline-none focus:ring-2 focus:ring-[#2F318B] disabled:opacity-60"
          >
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Referral Card (tab) ----
  function ReferralCard({ uid, isPro }: { uid: string; isPro: boolean }) {
    const [origin, setOrigin] = useState('');
    useEffect(() => {
      if (typeof window !== 'undefined') setOrigin(window.location.origin);
    }, []);
    const code = (uid || '').slice(0, 6).toUpperCase();
    const link = origin ? `${origin}/r/${code}` : '';

    if (!isPro) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Referal</h2>
          <p className="text-sm text-slate-700">Fitur referal hanya untuk akun <b>Pro</b>. Silakan upgrade terlebih dahulu.</p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-base font-semibold text-slate-900">Referal</h2>
        <p className="mb-3 text-sm text-slate-700">
          Ajak teman bergabung. Kamu mendapat komisi ketika mereka upgrade ke Pro.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">Kode Referal</div>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900">{code}</code>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
              >
                Salin
              </button>
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">Link Undangan</div>
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm" />
              <button
                onClick={() => link && navigator.clipboard.writeText(link)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
              >
                Salin
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Builder konten utama (dengan tabs) ----
  const content = useMemo(() => {
    if (!authReady) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-10 w-40 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

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
          <p className="mt-2 text-slate-600">Kamu belum login. Silakan masuk untuk membuka Dashboard.</p>
        </div>
      );
    }
    if (!vendor) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Profil tidak ditemukan</h1>
          <p className="mt-2 text-slate-600">
            Kami belum menemukan data vendor kamu. Klik tombol di bawah untuk membuat profil dasar.
          </p>
          <button
            onClick={createVendorScaffold}
            disabled={creating}
            className="mt-6 inline-flex items-center rounded-lg bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-900 disabled:opacity-60"
          >
            {creating ? 'Membuat…' : 'Buat Profil Sekarang'}
          </button>
          {error && <p className="mt-3 text-xs text-amber-700">Catatan: {error}</p>}
        </div>
      );
    }

    // === Halaman ketika vendor ada ===
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Tabs />

        {tab === 'overview' && <VendorDashboard vendor={vendor} />}

        {tab === 'edit' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <EditVendorForm uid={uid!} initial={vendor} redirectTo="/dashboard?tab=overview" />
          </div>
        )}

        {tab === 'portfolio' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Kelola Portofolio</h2>
            <PortfolioInline />
          </div>
        )}

        {tab === 'pro' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-base font-semibold text-slate-900">Upgrade ke Pro</h2>
            <ul className="mb-4 list-disc pl-5 text-sm text-slate-700">
              <li>Lencana Pro & prioritas tampil di hasil pencarian.</li>
              <li>Bisa ikut tender & akses fitur referral.</li>
              <li>Statistik performa & dukungan prioritas.</li>
            </ul>
            <button
              onClick={async () => {
                if (!uid) return;
                await setDoc(doc(db, 'vendors', uid), { isPro: true, updatedAt: new Date() }, { merge: true });
                alert('Status Pro diaktifkan (demo). Sesuaikan dengan alur pembayaranmu.');
              }}
              className="rounded-xl bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#282A77] focus:outline-none focus:ring-2 focus:ring-[#2F318B]"
            >
              Upgrade Sekarang
            </button>
          </div>
        )}

        {tab === 'verify' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-base font-semibold text-slate-900">Verifikasi Akun</h2>
            <p className="mb-3 text-sm text-slate-700">
              Unggah KTP & data pendukung. Setelah diajukan, admin akan meninjau dalam 1–2 hari kerja.
            </p>
            <button
              onClick={async () => {
                if (!uid) return;
                await setDoc(
                  doc(db, 'vendors', uid),
                  { verificationRequested: true, updatedAt: new Date() },
                  { merge: true }
                );
                alert('Pengajuan verifikasi terkirim. (demo)');
              }}
              className="rounded-xl bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#282A77] focus:outline-none focus:ring-2 focus:ring-[#2F318B]"
            >
              Ajukan Verifikasi
            </button>
          </div>
        )}

        {tab === 'tender' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-2 text-base font-semibold text-slate-900">Tender</h2>
            <p className="text-sm text-slate-700">
              Belum ada tender aktif. Fitur ini akan menampilkan daftar pekerjaan untuk akun Pro.
            </p>
          </div>
        )}

        {tab === 'referral' && <ReferralCard uid={uid || ''} isPro={!!vendor?.isPro} />}
      </div>
    );
  }, [creating, error, loading, tab, uid, vendor]);

  return <main className="min-h-screen bg-[#F5F7FF]">{content}</main>;
}
