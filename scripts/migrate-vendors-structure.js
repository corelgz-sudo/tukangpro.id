// scripts/migrate-vendors-structure.js
// Jalankan: node scripts/migrate-vendors-structure.js

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// --- Inisialisasi Admin SDK via GOOGLE_APPLICATION_CREDENTIALS ---
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS ke path service-account.json');
}
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = getFirestore();

// ---------- Helpers ----------
const slug = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-./]/g, '')
    .replace(/\s+&\s+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

const normName = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/kab\.?/g, 'kabupaten')
    .replace(/kota adm\.?/g, 'kota')
    .replace(/kotamadya/g, 'kota')
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

// --- Peta skill & subskill dari daftar kamu (label → slug) ---
const SKILL_MAP = {
  'tukang sipil': 'tukang-sipil',
  'tukang elektrik': 'tukang-elektrik',
  'tukang mesin': 'tukang-mesin',
  'tukang konveksi': 'tukang-konveksi',
  'tukang bersih': 'tukang-bersih',
  'tukang gambar': 'tukang-gambar',
  'tukang digital': 'tukang-digital',
};
const SUBSKILL_MAP = {
  // Sipil
  'tukang gali': 'tukang-gali',
  'tukang pondasi': 'tukang-pondasi',
  'tukang batu': 'tukang-batu',
  'tukang besi': 'tukang-besi',
  'tukang cor': 'tukang-cor',
  'tukang plester & aci': 'tukang-plester-aci',
  'tukang keramik': 'tukang-keramik',
  'tukang cat': 'tukang-cat',
  'tukang gypsum/plafon': 'tukang-gypsum-plafon',
  'tukang kaca & aluminium': 'tukang-kaca-aluminium',
  'tukang las': 'tukang-las',
  'tukang kayu': 'tukang-kayu',
  'tukang interior': 'tukang-interior',
  'tukang atap': 'tukang-atap',
  'tukang landscape': 'tukang-landscape',
  'tukang waterproofing': 'tukang-waterproofing',
  'tukang sumur bor': 'tukang-sumur-bor',
  'tukang plumbing air': 'tukang-plumbing-air',
  'tukang topograpy/surveyor': 'tukang-topography-surveyor',

  // Elektrik
  'tukang instalasi listrik': 'instalasi-listrik',
  'tukang penerangan': 'penerangan',
  'tukang grounding': 'grounding',
  'tukang panel listrik': 'panel-listrik',
  'tukang listrik tegangan menengah': 'listrik-tegangan-menengah',
  'tukang listrik industri': 'listrik-industri',
  'tukang genset': 'genset',
  'tukang solar panel (plts)': 'solar-panel-plts',
  'tukang servis listrik': 'servis-listrik',
  'tukang ac': 'ac',
  'tukang elektronik': 'elektronik',
  'tukang internet/cctv': 'internet-cctv',
  'tukang slo': 'slo',
  'tukang nidi': 'nidi',

  // Mesin
  'tukang bubut': 'bubut',
  'tukang las (welder)': 'welder',
  'mekanik mobil': 'mekanik-mobil',
  'mekanik motor': 'mekanik-motor',
  'tukang body repair': 'body-repair',
  'tukang bubut cnc': 'bubut-cnc',
  'tukang maintenance': 'maintenance',
  'tukang genset/diesel': 'genset-diesel',
  'tukang pompa air': 'pompa-air',
  'tukang ac & pendingin': 'ac-pendingin',
  'tukang alat berat': 'alat-berat',

  // Konveksi
  'tukang jahit': 'jahit',
  'tukang potong': 'potong',
  'tukang sablon': 'sablon',
  'tukang dtf': 'dtf',
  'tukang bordir': 'bordir',
  'tukang printing': 'printing',

  // Bersih
  'bersih toren': 'bersih-toren',
  'bersih taman': 'bersih-taman',
  'bersih rumah': 'bersih-rumah',
  'bersih sedot wc': 'sedot-wc',
  'bersih ac': 'bersih-ac',

  // Gambar
  'gambar 3d': 'gambar-3d',
  'gambar mural': 'gambar-mural',
  'gambar grafity': 'gambar-grafity',
  'gambar lukisa': 'gambar-lukisa',

  // Digital
  'photographer': 'photographer',
  'video editor': 'video-editor',
  'animator': 'animator',
  'desainer grafis': 'desainer-grafis',
  'designer ui/ux': 'designer-ui-ux',
  'programmer': 'programmer',
  'software tester': 'software-tester',
  'komputer': 'komputer',
  'konten kreator': 'konten-kreator',
};

const toSkillSlugs = (arr = []) =>
  Array.from(
    new Set(
      arr
        .map((x) => SKILL_MAP[normName(x)] || slug(x))
        .filter(Boolean)
    )
  );
const toSubskillSlugs = (arr = []) =>
  Array.from(
    new Set(
      arr
        .map((x) => SUBSKILL_MAP[normName(x)] || slug(x))
        .filter(Boolean)
    )
  );

// ---------- Main ----------
(async () => {
  console.log('→ Load katalog wilayah untuk mapping…');

  // Build map: name → id
  const provSnap = await db.collection('catalog_provinces').get();
  const regSnap  = await db.collection('catalog_regencies').get();
  const disSnap  = await db.collection('catalog_districts').get();

  const PROV_BY_NAME = new Map(); // "jawa barat" => "32"
  provSnap.forEach((d) => {
    const v = d.data();
    PROV_BY_NAME.set(normName(v.name), String(v.id));
  });

  const REG_BY_NAME = new Map(); // "kota bandung" / "kabupaten bandung" => "3273" / "3204"
  const REG_BY_ID   = new Map();
  regSnap.forEach((d) => {
    const v = d.data();
    REG_BY_ID.set(String(v.id), { ...v, id: String(v.id) });
    REG_BY_NAME.set(normName(v.name), String(v.id));
  });

  const DIST_BY_NAME = new Map(); // "arcamanik|3273" (kunci gabungan nama + regency_id) => district_id
  const DIST_BY_ID   = new Map();
  disSnap.forEach((d) => {
    const v = d.data();
    DIST_BY_ID.set(String(v.id), { ...v, id: String(v.id) });
    const key = `${normName(v.name)}|${String(v.regency_id)}`;
    DIST_BY_NAME.set(key, String(v.id));
  });

  console.log('→ Scan koleksi vendors…');
  const snap = await db.collection('vendors').get();
  console.log(`  ditemukan ${snap.size} vendor`);

  const batchSize = 400;
  let buf = [];
  let done = 0;

  for (const doc of snap.docs) {
    const v = doc.data();

    // --- Lokasi sumber kemungkinan:
    // v.province_id / v.province_name
    // v.regency_id / v.regency_name / v.city
    // v.district_ids / v.district_names / v.district_name
    let province_id = v.province_id ? String(v.province_id) : '';
    let regency_id  = v.regency_id ? String(v.regency_id) : '';
    let district_ids = Array.isArray(v.district_ids) ? v.district_ids.map(String) : [];

    // Jika id kosong, coba mapping dari nama
    if (!regency_id && v.regency_name) {
      const rid = REG_BY_NAME.get(normName(v.regency_name));
      if (rid) regency_id = rid;
    } else if (!regency_id && v.city) {
      const rid = REG_BY_NAME.get(normName(v.city));
      if (rid) regency_id = rid;
    }

    if (!province_id && regency_id) {
      const r = REG_BY_ID.get(regency_id);
      if (r?.province_id) province_id = String(r.province_id);
    }
    if (!province_id && v.province_name) {
      const pid = PROV_BY_NAME.get(normName(v.province_name));
      if (pid) province_id = pid;
    }

    // Districts: dari nama → id (perlu regency_id agar akurat)
    if (district_ids.length === 0) {
      const names = Array.isArray(v.district_names)
        ? v.district_names
        : v.district_name
        ? [v.district_name]
        : [];

      if (names.length && regency_id) {
        district_ids = names
          .map((nm) => DIST_BY_NAME.get(`${normName(nm)}|${regency_id}`))
          .filter(Boolean);
      }
    }

    // --- Skills: normalisasi slug
    const skills = toSkillSlugs(
      Array.isArray(v.skills) ? v.skills : v.skill ? [v.skill] : []
    );
    const subskills = toSubskillSlugs(
      Array.isArray(v.subskills) ? v.subskills : v.subskill ? [v.subskill] : []
    );

    // --- Nilai default ranking
    const ratingAvg = Number(v.ratingAvg ?? 0);
    const ratingCount = Number(v.ratingCount ?? 0);
    const rankScore =
      typeof v.rankScore === 'number'
        ? v.rankScore
        : Math.round(100 + ratingAvg * 10 + Math.min(50, ratingCount));

    const patch = {
      province_id: province_id || admin.firestore.FieldValue.delete(),
      regency_id: regency_id || admin.firestore.FieldValue.delete(),
      district_ids: district_ids.length ? district_ids : admin.firestore.FieldValue.delete(),
      skills,
      subskills,
      ratingAvg,
      ratingCount,
      rankScore,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),

      // Simpan label kalau ada
      ...(v.province_name ? { province_name: v.province_name } : {}),
      ...(v.regency_name ? { regency_name: v.regency_name } : {}),
    };

    const ref = db.collection('vendors').doc(doc.id);
    buf.push({ ref, patch });

    if (buf.length >= batchSize) {
      const b = db.batch();
      buf.forEach(({ ref, patch }) => b.set(ref, patch, { merge: true }));
      await b.commit();
      done += buf.length;
      buf = [];
      console.log(`  ✔ ${done}/${snap.size} vendor ter-update`);
    }
  }

  if (buf.length) {
    const b = db.batch();
    buf.forEach(({ ref, patch }) => b.set(ref, patch, { merge: true }));
    await b.commit();
    done += buf.length;
    console.log(`  ✔ ${done}/${snap.size} vendor ter-update`);
  }

  console.log('🎉 Migrasi selesai.');
})();
