'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ChevronDown, Search } from 'lucide-react';

type Opt = { value: string; label: string };

// utils
const byLabel = (a: Opt, b: Opt) => a.label.localeCompare(b.label, 'id');
const isNumericString = (s: string) => /^\d+$/.test(s);
const toMaybeNumber = (v: string): string | number => (isNumericString(v) ? Number(v) : v);

// ---------- Fetch helpers with fallbacks ----------
async function getFirstNonEmpty(
  colNames: string[]
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  for (const name of colNames) {
    try {
      const snap = await getDocs(collection(db, name));
      if (!snap.empty) {
        console.log(`[HeroSearch] loaded ${snap.size} docs from "${name}"`);
        return snap.docs;
      }
    } catch (e) {
      console.warn(`[HeroSearch] error loading "${name}"`, e);
    }
  }
  return [];
}

async function loadRegencies(): Promise<Opt[]> {
  const docs = await getFirstNonEmpty(['catalog_regencies', 'regencies']);
  const opts = docs.map((d) => {
    const v = d.data() as any;
    return { value: String(v.id ?? d.id), label: String(v.name ?? v.title ?? d.id) };
  });
  opts.sort(byLabel);
  return opts;
}

async function loadSkills(): Promise<Opt[]> {
  const docs = await getFirstNonEmpty(['catalog_skills', 'skills']);
  const opts = docs.map((d) => {
    const v = d.data() as any;
    return { value: String(v.id ?? d.id), label: String(v.name ?? v.title ?? d.id) };
  });
  opts.sort(byLabel);
  return opts;
}

async function loadDistrictsByRegency(regencyId: string): Promise<Opt[]> {
  const ridNum = Number(regencyId);
  const ridStr = String(regencyId);

  const candidates: Array<{ field: string; value: any }> = [
    { field: 'regency_id', value: ridNum },
    { field: 'regency_id', value: ridStr },
    { field: 'regencyId', value: ridStr },
  ];

  for (const col of ['catalog_districts', 'districts']) {
    for (const c of candidates) {
      try {
        const snap = await getDocs(query(collection(db, col), where(c.field as any, '==', c.value)));
        if (!snap.empty) {
          const opts = snap.docs.map((d) => {
            const v = d.data() as any;
            return { value: String(v.id ?? d.id), label: String(v.name ?? v.title ?? d.id) };
          });
          opts.sort(byLabel);
          return opts;
        }
      } catch (e) {
        console.warn(`[HeroSearch] districts query ${col}.${c.field}`, e);
      }
    }
  }

  // fallback: load all and filter client-side
  for (const col of ['catalog_districts', 'districts']) {
    try {
      const snap = await getDocs(collection(db, col));
      if (!snap.empty) {
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter(
            (v) =>
              String(v.regency_id) === ridStr ||
              Number(v.regency_id) === ridNum ||
              String(v.regencyId) === ridStr
          )
          .map((v) => ({ value: String(v.id), label: String(v.name ?? v.title ?? v.id) }))
          .sort(byLabel);
        return all;
      }
    } catch (e) {
      console.warn(`[HeroSearch] districts fallback ${col}`, e);
    }
  }
  return [];
}

async function loadSubskillsBySkill(skillId: string): Promise<Opt[]> {
  for (const col of ['catalog_subskills', 'subskills']) {
    for (const field of ['skill_id', 'skillId']) {
      try {
        const snap = await getDocs(query(collection(db, col), where(field as any, '==', skillId)));
        if (!snap.empty) {
          const opts = snap.docs.map((d) => {
            const v = d.data() as any;
            return { value: String(v.id ?? d.id), label: String(v.name ?? v.title ?? d.id) };
          });
          opts.sort(byLabel);
          return opts;
        }
      } catch (e) {
        console.warn(`[HeroSearch] subskills query ${col}.${field}`, e);
      }
    }
  }

  // fallback
  for (const col of ['catalog_subskills', 'subskills']) {
    try {
      const snap = await getDocs(collection(db, col));
      if (!snap.empty) {
        const all = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((v) => String(v.skill_id ?? v.skillId) === skillId)
          .map((v) => ({ value: String(v.id), label: String(v.name ?? v.title ?? v.id) }))
          .sort(byLabel);
        return all;
      }
    } catch (e) {
      console.warn(`[HeroSearch] subskills fallback ${col}`, e);
    }
  }
  return [];
}

// ----------------- Component -----------------
export default function HeroSearch() {
  const router = useRouter();
  const sp = useSearchParams();

  const [city, setCity] = useState<string>(sp.get('city') ?? '');
  const [district, setDistrict] = useState<string>(sp.get('district') ?? '');
  const [skill, setSkill] = useState<string>(sp.get('skill') ?? '');
  const [subskill, setSubskill] = useState<string>(sp.get('subskill') ?? '');

  const [cityOpts, setCityOpts] = useState<Opt[]>([]);
  const [districtOpts, setDistrictOpts] = useState<Opt[]>([]);
  const [skillOpts, setSkillOpts] = useState<Opt[]>([]);
  const [subskillOpts, setSubskillOpts] = useState<Opt[]>([]);

  // load city & skill
  useEffect(() => {
    (async () => {
      const [cities, skills] = await Promise.all([loadRegencies(), loadSkills()]);
      setCityOpts(cities);
      setSkillOpts(skills);
    })();
  }, []);

  // when city changes -> districts
  useEffect(() => {
    (async () => {
      setDistrict('');
      setDistrictOpts([]);
      if (!city) return;
      const opts = await loadDistrictsByRegency(city);
      setDistrictOpts(opts);
    })();
  }, [city]);

  // when skill changes -> subskills
  useEffect(() => {
    (async () => {
      setSubskill('');
      setSubskillOpts([]);
      if (!skill) return;
      const opts = await loadSubskillsBySkill(skill);
      setSubskillOpts(opts);
    })();
  }, [skill]);

  // sync when back/forward
  useEffect(() => {
    setCity(sp.get('city') ?? '');
    setDistrict(sp.get('district') ?? '');
    setSkill(sp.get('skill') ?? '');
    setSubskill(sp.get('subskill') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.toString()]);

  function pushSearch() {
    const p = new URLSearchParams();
    if (city) p.set('city', city);
    if (district) p.set('district', district);
    if (skill) p.set('skill', skill);
    if (subskill) p.set('subskill', subskill);
    router.push(`/?${p.toString()}`);
  }

  return (
    <section className="mx-auto mt-6 max-w-6xl rounded-2xl bg-[#F08519] px-4 py-6 text-white shadow-md sm:mt-8 sm:px-6 sm:py-8">
      <h1 className="text-2xl font-extrabold sm:text-3xl">Temukan Tukang Terpercaya di Kota Anda</h1>
      <p className="mt-2 text-sm text-white/90">
        Pilih kota/kabupaten, kecamatan, dan keahlian. Hubungi langsung lewat WhatsApp.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchableSelect
          label="Kota/Kabupaten"
          placeholder="Semua Kota/Kabupaten"
          value={city}
          onChange={setCity}
          options={cityOpts}
        />
        <SearchableSelect
          label="Kecamatan"
          placeholder="Semua Kecamatan"
          value={district}
          onChange={setDistrict}
          options={districtOpts}
          disabled={!city}
        />
        <SearchableSelect
          label="Kategori Keahlian"
          placeholder="Semua Keahlian"
          value={skill}
          onChange={setSkill}
          options={skillOpts}
        />
        <SearchableSelect
          label="Sub. Keahlian"
          placeholder="Semua Sub"
          value={subskill}
          onChange={setSubskill}
          options={subskillOpts}
          disabled={!skill}
        />
      </div>

      <div className="mt-4">
        <button
          onClick={pushSearch}
          className="rounded-xl bg-[#2F318B] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="Cari Tukang"
        >
          Cari Tukang
        </button>
      </div>
    </section>
  );
}

// --------------- SearchableSelect (combobox) ---------------
function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Opt[];
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hoverIndex, setHoverIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selectedLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? '',
    [options, value]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
    return list.slice(0, 200);
  }, [options, q]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  function select(v: string) {
    onChange(v);
    setOpen(false);
    setQ('');
    setHoverIndex(-1);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHoverIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHoverIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = hoverIndex >= 0 ? filtered[hoverIndex]?.value : filtered[0]?.value;
      if (pick) select(pick);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <span className="mb-1 block text-xs text-white/90">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between rounded-xl border-0 bg-white px-4 py-3 text-left text-sm text-slate-900 outline-none ring-2 ring-transparent focus:ring-[#2F318B] disabled:opacity-60"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selectedLabel ? 'text-slate-900' : 'text-slate-500'}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              ref={inputRef}
              placeholder="Ketik untuk mencari…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setHoverIndex(-1);
              }}
              onKeyDown={onKeyDown}
              className="w-full border-0 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
              aria-label={`Cari ${label}`}
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-auto py-1 text-sm" aria-label={label}>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-slate-500">Tidak ada hasil</li>
            ) : (
              filtered.map((o, idx) => (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    onMouseEnter={() => setHoverIndex(idx)}
                    onClick={() => select(o.value)}
                    className={`block w-full px-3 py-2 text-left text-slate-900 hover:bg-indigo-50 ${
                      idx === hoverIndex ? 'bg-indigo-50' : ''
                    } ${o.value === value ? 'font-semibold' : ''}`}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
