'use client';

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { db, ensureAuth } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { Search, ChevronDown, X, Check } from 'lucide-react';
import AvatarUploader from '@/components/vendor/AvatarUploader';
import PortfolioUploader, { PortfolioItem } from '@/components/vendor/PortfolioUploader';
import { useRouter } from 'next/navigation';
import { getDoc } from 'firebase/firestore';
import { buildSearchIndex, canonicalSlug } from '@/lib/search/tags';

/* ====================================================================== */
/* Types                                                                  */
/* ====================================================================== */
type Option = { value: string; label: string; meta?: Record<string, any> };

type Props = {
  uid: string;
  initial?: {
    displayName?: string;
    whatsapp?: string;

    // lokasi lama (string) — masih dipakai VendorCard
    city?: string;
    district?: string;

    // lokasi baru (multi)
    cities?: string[];
    districts?: string[];

    // skill
    skills?: string[];
    subskills?: string[];

    // angka
    yearsExp?: number | null;
    pricePerDay?: number | null;
    priceContract?: number | null;
    surveyFee?: number | null;
    negoDay?: boolean;
    negoContract?: boolean;
    negoSurvey?: boolean;
    toolsStandard?: boolean;

    // media & teks
    avatarUrl?: string;
    portfolio?: string[];                 // legacy
    portfolioMeta?: PortfolioItem[];      // {url, path}
    about?: string;
    policy?: string;
  };
};

/* ====================================================================== */
/* Utilities                                                              */
/* ====================================================================== */
function useOutsideClick<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

const normalize = (s?: string) =>
  (s || '')
    .toLowerCase()
    .replace(/\b(kabupaten|kab\.?|kota|kota adm\.)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

// === Hydrate state dari dokumen Firestore ===
function hydrateFromDoc(
  data: any,
  setters: {
    setDisplayName: (v: string) => void;
    setWhatsapp: (v: string) => void;
    setAvatarUrl: (v?: string) => void;
    setSelCities: (v: { value: string; label: string }[]) => void;
    setSelDistricts: (v: { value: string; label: string }[]) => void;
    setSelSkills: (v: { value: string; label: string }[]) => void;
    setSelSubskills: (v: { value: string; label: string }[]) => void;
    setYearsExp: (v: number | '') => void;
    setPricePerDay: (v: number | '') => void;
    setPriceContract: (v: number | '') => void;
    setSurveyFee: (v: number | '') => void;
    setNegoDay: (v: boolean) => void;
    setNegoContract: (v: boolean) => void;
    setNegoSurvey: (v: boolean) => void;
    setToolsStandard: (v: boolean) => void;
    setAbout: (v: string) => void;
    setPolicy: (v: string) => void;
    setPortfolioItems: (v: { url: string; path: string }[]) => void;
  }
) {
  const cityArr = (data.cities ?? []).length ? data.cities : (data.city ? [data.city] : []);
  const districtArr = (data.districts ?? []).length ? data.districts : (data.district ? [data.district] : []);
  setters.setDisplayName(data.displayName ?? '');
  setters.setWhatsapp(data.whatsapp ?? '');
  setters.setAvatarUrl(data.avatarUrl ?? undefined);
  setters.setSelCities(cityArr.map((c: string) => ({ value: String(c), label: String(c) })));
  setters.setSelDistricts(districtArr.map((d: string) => ({ value: String(d), label: String(d) })));
  setters.setSelSkills((data.skills ?? []).map((s: string) => ({ value: s, label: s })));
  setters.setSelSubskills((data.subskills ?? []).map((s: string) => ({ value: s, label: s })));
  setters.setYearsExp(typeof data.yearsExp === 'number' ? data.yearsExp : '');
  setters.setPricePerDay(typeof data.pricePerDay === 'number' ? data.pricePerDay : '');
  setters.setPriceContract(typeof data.priceContract === 'number' ? data.priceContract : '');
  setters.setSurveyFee(typeof data.surveyFee === 'number' ? data.surveyFee : '');
  setters.setNegoDay(!!data.negoDay);
  setters.setNegoContract(!!data.negoContract);
  setters.setNegoSurvey(!!data.negoSurvey);
  setters.setToolsStandard(data.toolsStandard ?? true);
  setters.setAbout(data.about ?? '');
  setters.setPolicy(data.policy ?? '');
  // Insert After setters.setPolicy(...)
if (typeof (setters as any).setVendorKind === 'function') {
  (setters as any).setVendorKind(
    data.vendorKind === 'kontraktor' ? 'kontraktor' : 'tukang'
  );
}
if (typeof (setters as any).setLegalType === 'function') {
  const t = data?.legal?.type === 'badan_hukum' ? 'badan_hukum' : 'tim';
  (setters as any).setLegalType(t);
}

  const meta = Array.isArray(data.portfolioMeta) ? data.portfolioMeta : [];
  const legacy = Array.isArray(data.portfolio) ? data.portfolio.map((u: string) => ({ url: u, path: '' })) : [];
  setters.setPortfolioItems(meta.length ? meta : legacy);
}


/* ====================================================================== */
/* Headless MultiSelect (fix: no button-inside-button)                    */
/* ====================================================================== */
function MultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder = 'Pilih satu atau lebih',
  disabled,
}: {
  label: string;
  values: Option[];
  onChange: (opts: Option[]) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useOutsideClick<HTMLDivElement>(() => setOpen(false));

  const filtered = useMemo(
    () => options.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())),
    [options, q]
  );

  const toggle = (opt: Option) => {
    const exists = values.some((v) => v.value === opt.value);
    onChange(exists ? values.filter((v) => v.value !== opt.value) : [...values, opt]);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>

      {/* trigger: div role=button agar chip bisa punya tombol remove */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={[
          'flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left',
          'border-slate-300 text-sm text-slate-900 shadow-sm',
          'hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200',
          disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : '',
        ].join(' ')}
      >
        <div className="flex min-h-[1.6rem] flex-wrap gap-1">
          {values.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            values.map((v) => (
              <span
                key={v.value}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-800 ring-1 ring-slate-200"
              >
                {v.label}
                {/* FIX: gunakan span berperan tombol, bukan <button> di dalam button */}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(values.filter((x) => x.value !== v.value));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(values.filter((x) => x.value !== v.value));
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-slate-200 focus:outline-none"
                  aria-label={`Hapus ${v.label}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 px-2">
            <Search className="h-4 w-4 text-slate-400" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ketik untuk mencari…"
              className="h-8 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <ul className="max-h-60 space-y-1 overflow-auto" role="listbox" aria-multiselectable>
            {filtered.length === 0 && (
              <li className="px-2 py-1 text-sm text-slate-500">Tidak ada opsi</li>
            )}
            {filtered.map((opt) => {
              const active = values.some((v) => v.value === opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => toggle(opt)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <Check className="h-4 w-4 text-indigo-600" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Form utama                                                             */
/* ====================================================================== */
export default function EditVendorForm({ uid, initial }: Props) {
  // Insert After component start
const [vendorKind, setVendorKind] = useState<'tukang'|'kontraktor'>('tukang');
const [legalType, setLegalType] = useState<'tim'|'badan_hukum'>('tim');

// Opsional (khusus kontraktor): kategori kontraktor untuk crosswalk
const CONTRACTOR_OPTIONS: Option[] = [
  { value: 'kontraktor_pagar_bata_beton', label: 'Pagar Bata/Beton' },
  { value: 'kontraktor_pagar_besi', label: 'Pagar Besi' },
  { value: 'kontraktor_canopy_baja', label: 'Canopy Baja' },
  { value: 'kontraktor_canopy_aluminium', label: 'Canopy Aluminium' },
  { value: 'kontraktor_atap_baja_ringan', label: 'Atap Baja Ringan' },
  { value: 'kontraktor_atap_genteng', label: 'Atap Genteng' },
  { value: 'kontraktor_kusen_aluminium', label: 'Kusen Aluminium' },
  { value: 'kontraktor_kusen_kayu', label: 'Kusen Kayu' },
  { value: 'kontraktor_pintu_kayu', label: 'Pintu Kayu' },
  { value: 'kontraktor_keramik', label: 'Keramik' },
  { value: 'kontraktor_cat', label: 'Pengecatan' },
  { value: 'kontraktor_paving_block', label: 'Paving Block' },
  { value: 'kontraktor_plafon_gypsum', label: 'Plafon Gypsum' },
  { value: 'kontraktor_plafon_pvc', label: 'Plafon PVC' },
  { value: 'kontraktor_landscape', label: 'Landscape' },
  { value: 'kontraktor_epoxy', label: 'Epoxy' },
];
const [contractorCats, setContractorCats] = useState<Option[]>([]);

  // basic
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const router = useRouter();
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '');
  const [yearsExp, setYearsExp] = useState<number | ''>(initial?.yearsExp ?? '');
  const [pricePerDay, setPricePerDay] = useState<number | ''>(initial?.pricePerDay ?? '');
  const [priceContract, setPriceContract] = useState<number | ''>(initial?.priceContract ?? '');
  const [surveyFee, setSurveyFee] = useState<number | ''>(initial?.surveyFee ?? '');
  const [negoDay, setNegoDay] = useState<boolean>(initial?.negoDay ?? false);
  const [negoContract, setNegoContract] = useState<boolean>(initial?.negoContract ?? true);
  const [negoSurvey, setNegoSurvey] = useState<boolean>(initial?.negoSurvey ?? true);
  const [toolsStandard, setToolsStandard] = useState<boolean>(initial?.toolsStandard ?? true);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initial?.avatarUrl);
  const [about, setAbout] = useState(initial?.about ?? '');
  const [policy, setPolicy] = useState(initial?.policy ?? '');

  // catalogs
  const [regencies, setRegencies] = useState<Option[]>([]);
  const [skills, setSkills] = useState<Option[]>([]);
  const [subskillsCatalog, setSubskillsCatalog] = useState<Record<string, Option[]>>({});
  const [allDistricts, setAllDistricts] = useState<Option[]>([]);

  // selections (multi)
  const [selCities, setSelCities] = useState<Option[]>(
    (initial?.cities?.length ? initial.cities : initial?.city ? [initial.city] : []).map((c) => ({
      value: String(c),
      label: String(c),
    }))
  );
  const [selDistricts, setSelDistricts] = useState<Option[]>(
    (initial?.districts?.length ? initial.districts : initial?.district ? [initial.district] : []).map(
      (d) => ({ value: String(d), label: String(d) })
    )
  );
  const [selSkills, setSelSkills] = useState<Option[]>(
    (initial?.skills ?? []).map((s) => ({ value: s, label: s }))
  );
  const [selSubskills, setSelSubskills] = useState<Option[]>(
    (initial?.subskills ?? []).map((s) => ({ value: s, label: s }))
  );

  // portfolio (upload image)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>(
    initial?.portfolioMeta
      ? initial.portfolioMeta
      : (initial?.portfolio ?? []).map((u) => ({ url: u, path: '' }))
  );

  /* -------------------------------- load catalogs -------------------------------- */
  useEffect(() => {
    (async () => {
      // Regencies
      const regSnap = await getDocs(collection(db, 'catalog_regencies'));
      const reg: Option[] = regSnap.docs
        .map((d) => {
          const x = d.data() as any;
          const name = x.name || x.label || x.regency || x.city || x.kabupaten || d.id;
          const id = x.id || x.code || x.regencyId || d.id;
          return { value: String(id), label: String(name), meta: { ...x, id } };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'id-ID'));
      setRegencies(reg);

      // Skills
      const skillSnap = await getDocs(collection(db, 'catalog_skills'));
      const sk: Option[] = skillSnap.docs
        .map((d) => {
          const x = d.data() as any;
          const name = x.name || x.label || d.id;
          const id = x.id || d.id;
          return { value: String(id), label: String(name), meta: { ...x, id } };
        })
        .sort((a, b) => a.label.localeCompare(b.label, 'id-ID'));
      setSkills(sk);

      // Subskills mapped by skill (name/id)
      const subSnap = await getDocs(collection(db, 'catalog_subskills'));
      const group: Record<string, Option[]> = {};
      subSnap.docs.forEach((d) => {
        const x = d.data() as any;
        const name = x.name || x.label || d.id;
        const opt: Option = { value: name, label: name, meta: { ...x } };
        const keys = [x.skill, x.skillName, x.parent, x.parentName, x.skillId, x.skill_id, x.parentId]
          .filter(Boolean) as string[];
        keys.forEach((k) => (group[k] ||= []).push(opt));
      });
      Object.keys(group).forEach((k) =>
        group[k].sort((a, b) => a.label.localeCompare(b.label, 'id-ID'))
      );
      setSubskillsCatalog(group);

      // Districts cache
      const distSnap = await getDocs(collection(db, 'catalog_districts'));
      const all = distSnap.docs.map((d) => {
        const x = d.data() as any;
        const label = String(x.name || x.label || d.id);
        const value = String(x.id || x.code || d.id);
        return {
          value,
          label,
          meta: {
            ...x,
            __normRegency: normalize(
              x.regency || x.regencyName || x.city || x.kabupaten || x.parent || x.parentName
            ),
          },
        } as Option;
      });
      setAllDistricts(all.sort((a, b) => a.label.localeCompare(b.label, 'id-ID')));
    })();
  }, []);

 // Selalu refresh dari Firestore saat membuka form (hindari initial parsial/stale)
// Selalu refresh dari Firestore saat membuka form (hindari initial parsial/stale)
useEffect(() => {
  let alive = true;
  (async () => {
    const snap = await getDoc(doc(db, 'vendors', uid));
    if (!alive || !snap.exists()) return;
    const data = snap.data();
    if (Array.isArray(data?.contractorCategories)) {
  setContractorCats(
    data.contractorCategories.map((v: string) =>
      CONTRACTOR_OPTIONS.find(o => o.value === v) || { value: v, label: v }
    )
  );
}
    hydrateFromDoc(data, {
      setDisplayName,
      setWhatsapp,
      setAvatarUrl,
      setSelCities,
      setSelDistricts,
      setSelSkills,
      setSelSubskills,
      setYearsExp,
      setPricePerDay,
      setPriceContract,
      setSurveyFee,
      setNegoDay,
      setNegoContract,
      setNegoSurvey,
      setToolsStandard,
      setAbout,
      setPolicy,
      setPortfolioItems,
      // opsional (jika state ini ada di form mimin)
      setVendorKind,
      setLegalType,
    } as any);
  })();
  return () => { alive = false; };
}, [uid]);




  /* --------------------------- derived: union districts --------------------------- */
  const districtOptions = useMemo(() => {
    if (selCities.length === 0) return [];
    const out: Option[] = [];
    const pushUnique = (o: Option) => {
      if (!out.find((x) => x.value === o.value)) out.push(o);
    };
    const cityCandidates = selCities.map((c) => {
      const cand = new Set<string>(
        [
          String(c.value),
          String(c.label),
          String(c.meta?.id ?? ''),
          String((c.meta as any)?.code ?? ''),
          String((c.meta as any)?.regencyId ?? ''),
        ].filter(Boolean)
      );
      const norm = normalize(c.label);
      return { cand, norm };
    });

    allDistricts.forEach((o) => {
      const m = o.meta || {};
      const pool = [
        m.regencyId,
        m.regency_id,
        m.cityId,
        m.city_id,
        m.parentId,
        m.parent_id,
        m.codeRegency,
        m.regencyCode,
        m.kabupatenId,
        m.regency,
        m.regencyName,
        m.city,
        m.kabupaten,
        m.parent,
        m.parentName,
      ]
        .filter(Boolean)
        .map(String);

      const matches = cityCandidates.some(({ cand, norm }) => {
        const idMatch = pool.some((v: string) => cand.has(v));
        const nameMatch =
          normalize(m.regency) === norm ||
          normalize(m.regencyName) === norm ||
          normalize(m.city) === norm ||
          normalize(m.kabupaten) === norm ||
          (m.__normRegency && m.__normRegency === norm);
        return idMatch || nameMatch;
      });

      if (matches) pushUnique(o);
    });

    return out.sort((a, b) => a.label.localeCompare(b.label, 'id-ID'));
  }, [selCities, allDistricts]);

    // selaraskan pilihan kota ke opsi katalog saat regencies loaded
  useEffect(() => {
    if (!regencies.length) return;
    setSelCities((prev) =>
      prev.map((c) => {
        const found = regencies.find((o) => o.value === c.value || o.label === c.label);
        return found ?? c;
      })
    );
  }, [regencies]);

  // selaraskan pilihan kecamatan ke opsi katalog saat allDistricts loaded
  useEffect(() => {
    if (!allDistricts.length) return;
    setSelDistricts((prev) =>
      prev.map((d) => {
        const found = allDistricts.find((o) => o.value === d.value || o.label === d.label);
        return found ?? d;
      })
    );
  }, [allDistricts]);


   // bersihkan district HANYA jika opsi sudah siap; toleransi value=label legacy
  useEffect(() => {
    if (districtOptions.length === 0) return; // jangan bersihkan saat opsi belum dimuat
    const allowedVals = new Set(districtOptions.map((d) => d.value));
    const allowedLabels = new Set(districtOptions.map((d) => d.label));
    setSelDistricts((prev) =>
      prev.filter((d) => allowedVals.has(d.value) || allowedLabels.has(d.label))
    );
  }, [districtOptions]);


  /* --------------------------- derived: subskills by skills ---------------------- */
  const subskillOptions = useMemo(() => {
    const out: Option[] = [];
    selSkills.forEach((s) => {
      const byLabel = subskillsCatalog[s.label] ?? [];
      const byId = s.meta?.id ? subskillsCatalog[s.meta.id] ?? [] : [];
      [...byLabel, ...byId].forEach((o) => {
        if (!out.find((x) => x.value === o.value)) out.push(o);
      });
    });
    return out;
  }, [selSkills, subskillsCatalog]);

    useEffect(() => {
    if (subskillOptions.length === 0) return; // skip: katalog belum siap
    const allowed = new Set(subskillOptions.map((o) => o.value));
    setSelSubskills((prev) => prev.filter((p) => allowed.has(p.value)));
  }, [subskillOptions]);


  /* ------------------------------------ submit ---------------------------------- */
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStatus(null);
  setSaving(true);
  try {
    // pastikan ada sesi auth (anonim jika belum)
    const user = await ensureAuth();

    // Guard: hindari tulis ke dokumen user lain
    if (user.uid !== uid) {
      throw new Error('UID tidak cocok dengan sesi login. Silakan muat ulang dan coba lagi.');
    }

    const ref = doc(db, 'vendors', uid);
    // Insert After "const ref = doc(db, 'vendors', uid);"
const contractorTags = contractorCats.map(o => o.value);
const computedSearchIndex = buildSearchIndex({
  vendorKind,
  skills: selSkills.map(s => s.label),
  subskills: selSubskills.map(s => s.label),
  contractorTags,
});

    await setDoc(
      ref,
      {
        
        // identitas
        displayName: displayName.trim(),
        whatsapp: whatsapp.trim(),
        avatarUrl: avatarUrl ?? null,

        // lokasi (back-compat + array)
        city: selCities[0]?.label ?? '',
        district: selDistricts[0]?.label ?? '',
        cities: selCities.map((c) => c.label),
        districts: selDistricts.map((d) => d.label),

        // skills
        skills: selSkills.map((s) => s.label),
        subskills: selSubskills.map((s) => s.label),

        // angka
        yearsExp: typeof yearsExp === 'number' ? yearsExp : null,
        pricePerDay: typeof pricePerDay === 'number' ? pricePerDay : null,
        priceContract: typeof priceContract === 'number' ? priceContract : null,
        surveyFee: typeof surveyFee === 'number' ? surveyFee : null,
        negoDay,
        negoContract,
        negoSurvey,
        toolsStandard,

        // teks
        about: about.trim(),
        policy: policy.trim(),
        

        // media
        portfolio: portfolioItems.map((p) => p.url), // legacy
        portfolioMeta: portfolioItems,

        updatedAt: new Date(),
        vendorKind,
legal: { type: legalType, verified: false },
searchIndex: computedSearchIndex,
contractorCategories: contractorCats.map(o => o.value),
      },
      { merge: true }
    );

   setStatus({ type: 'success', message: 'Profil berhasil disimpan.' });
setTimeout(() => {
  router.replace('/dashboard?updated=1');
  router.refresh();
}, 600);

   
  } catch (err: any) {
    console.error('[EditVendorForm] save error:', err);
    setStatus({
      type: 'error',
      message:
        err?.message ||
        'Gagal menyimpan. Periksa koneksi atau perizinan (Firestore Rules) Anda.',
    });
  } finally {
    setSaving(false);
  }
};


  /* -------------------------------------- UI ------------------------------------ */
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Hapus heading di sini — judul besar ada di page.tsx */}

      {/* foto + nama/wa */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto,1fr]">
        <AvatarUploader uid={uid} url={avatarUrl} onChange={setAvatarUrl} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nama Tampilan</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Nama tukang"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="08xxxxxxxxxx"
            />
          </div>
        </div>
      </div>

     
<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
  <div>
    <label className="mb-1 block text-sm font-medium text-slate-700">Jenis Vendor</label>
    <select
      value={vendorKind}
      onChange={(e) => setVendorKind(e.target.value as any)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
    >
      <option value="tukang">Tukang (perorangan)</option>
      <option value="kontraktor">Kontraktor (tim/perusahaan)</option>
    </select>
  </div>

  <div>
    <label className="mb-1 block text-sm font-medium text-slate-700">Legalitas</label>
    <select
      value={legalType}
      onChange={(e) => setLegalType(e.target.value as any)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
    >
      <option value="tim">Tim</option>
      <option value="badan_hukum">Badan Hukum (NIB/NPWP)</option>
    </select>
  </div>

  {/* kosongkan satu kolom untuk layout rapi */}
  <div />
</div>

{/* Khusus kontraktor: pilih kategori (untuk crosswalk pencarian) */}
{vendorKind === 'kontraktor' && (
  <div className="mt-2">
    <MultiSelect
      label="Kategori Kontraktor (opsional, pengaruh ke pencarian)"
      values={contractorCats}
      onChange={setContractorCats}
      options={CONTRACTOR_OPTIONS}
      placeholder="Pilih kategori yang relevan"
    />
  </div>
)}


      {/* lokasi */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MultiSelect
          label="Kota/Kabupaten"
          values={selCities}
          onChange={setSelCities}
          options={regencies}
          placeholder="Pilih satu atau lebih kota/kabupaten"
        />
        <MultiSelect
          label="Kecamatan"
          values={selDistricts}
          onChange={setSelDistricts}
          options={districtOptions}
          placeholder={selCities.length ? 'Pilih satu atau lebih kecamatan' : 'Pilih kota dulu'}
          disabled={selCities.length === 0}
        />
      </div>

      {/* skills */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MultiSelect
          label="Keahlian"
          values={selSkills}
          onChange={setSelSkills}
          options={skills}
          placeholder="Pilih satu atau lebih"
        />
        <MultiSelect
          label="Subskill"
          values={selSubskills}
          onChange={setSelSubskills}
          options={subskillOptions}
          placeholder={selSkills.length ? 'Pilih subskill' : 'Pilih keahlian dulu'}
          disabled={selSkills.length === 0}
        />
      </div>

      {/* angka & nego */}
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Pengalaman (tahun)</label>
          <input
            inputMode="numeric"
            value={yearsExp}
            onChange={(e) => setYearsExp(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full md:max-w-[10rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="cth: 5"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tarif per hari (Rp)</label>
          <div className="flex items-center gap-3">
            <input
              inputMode="numeric"
              value={pricePerDay}
              onChange={(e) => setPricePerDay(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full md:max-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="175000"
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={negoDay}
                onChange={(e) => setNegoDay(e.target.checked)}
              />
              Nego
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tarif borongan (Rp)</label>
          <div className="flex items-center gap-3">
            <input
              inputMode="numeric"
              value={priceContract}
              onChange={(e) => setPriceContract(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full md:max-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="cth: 2500000"
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={negoContract}
                onChange={(e) => setNegoContract(e.target.checked)}
              />
              Nego
            </label>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Biaya survey (Rp)</label>
          <div className="flex items-center gap-3">
            <input
              inputMode="numeric"
              value={surveyFee}
              onChange={(e) => setSurveyFee(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full md:max-w-[12rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="cth: 0"
            />
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={negoSurvey}
                onChange={(e) => setNegoSurvey(e.target.checked)}
              />
              Nego
            </label>
          </div>
        </div>
      </div>

      {/* toggles */}
      <div className="flex flex-wrap items-center gap-6">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={toolsStandard}
            onChange={(e) => setToolsStandard(e.target.checked)}
          />
          <span className="text-sm text-slate-800">Alat tersedia standar</span>
        </label>
      </div>

      {/* teks panjang */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Deskripsi</label>
          <textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder="Ceritakan pengalaman, spesialisasi, area kerja, dll."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Kebijakan Tukang</label>
          <textarea
            rows={4}
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            placeholder="Jadwal kerja, syarat DP, garansi, pembatalan, dll."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* portofolio upload */}
      <PortfolioUploader uid={uid} items={portfolioItems} onChange={setPortfolioItems} />

{status && (
  <div
    role="status"
    className={[
      'rounded-xl border px-3 py-2 text-sm',
      status.type === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-rose-200 bg-rose-50 text-rose-800',
    ].join(' ')}
  >
    {status.message}
  </div>
)}


      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-[#2F318B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#282A77] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F318B] disabled:opacity-60"
        >
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}
