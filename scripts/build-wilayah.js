// Node 18+: fetch tersedia. Jika Node <18, uncomment baris berikut:
// import fetch from 'node-fetch';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

// util kecil
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const outDir = path.join(process.cwd(), 'data');
await fs.mkdir(outDir, { recursive: true });

/** normalisasi nama (Title Case ringan) */
function titleCase(s) {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b([a-z\u00C0-\u024F])/g, (m) => m.toUpperCase());
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

console.log('→ Ambil provinsi…');
const provinces = await fetchJson(`${BASE}/provinces.json`); // [{id,name}]
console.log(`  Provinsi: ${provinces.length}`);

const allRegencies = [];
const allDistricts = [];

// batasi concurrency ringan agar santun ke host
for (const [i, prov] of provinces.entries()) {
  console.log(`→ [${i + 1}/${provinces.length}] ${prov.id} ${prov.name} → kab/kota`);
  const reg = await fetchJson(`${BASE}/regencies/${prov.id}.json`); // [{id,province_id,name}]
  reg.forEach((r) => allRegencies.push({
    id: String(r.id),
    name: titleCase(r.name),
    province_id: String(r.province_id),
    province_name: titleCase(prov.name),
    type: r.name.toUpperCase().startsWith('KAB.') ? 'Kabupaten'
         : r.name.toUpperCase().startsWith('KOTA') ? 'Kota' : 'Lain',
  }));

  // ambil kecamatan per kab/kota
  for (const r of reg) {
    const url = `${BASE}/districts/${r.id}.json`; // [{id,regency_id,name}]
    const dist = await fetchJson(url);
    dist.forEach((d) =>
      allDistricts.push({
        id: String(d.id),
        name: titleCase(d.name),
        regency_id: String(d.regency_id),
        regency_name: titleCase(r.name),
        province_id: String(prov.id),
        province_name: titleCase(prov.name),
      })
    );
    await delay(80); // jeda kecil ~sopan
  }
  await delay(120);
}

console.log(`  Kab/Kota: ${allRegencies.length}`);
console.log(`  Kecamatan: ${allDistricts.length}`);

// Tulis JSON
await fs.writeFile(path.join(outDir, 'provinces.json'), JSON.stringify(
  provinces.map(p => ({ id: String(p.id), name: titleCase(p.name) })), null, 2));
await fs.writeFile(path.join(outDir, 'regencies.json'), JSON.stringify(allRegencies, null, 2));
await fs.writeFile(path.join(outDir, 'districts.json'), JSON.stringify(allDistricts, null, 2));

// Tulis CSV (kab/kota & kecamatan)
function toCSV(rows, header) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [header, ...rows.map((r) => header.map((h) => esc(r[h])))]
    .map((a) => a.join(','))
    .join('\n');
}

const kabHeader = ['id','name','type','province_id','province_name'];
const kecHeader = ['id','name','regency_id','regency_name','province_id','province_name'];

await fs.writeFile(path.join(outDir, 'kabkota.csv'), toCSV(allRegencies, kabHeader));
await fs.writeFile(path.join(outDir, 'kecamatan.csv'), toCSV(allDistricts, kecHeader));

console.log(`✅ Selesai. File ada di folder /data:
- data/provinces.json
- data/regencies.json  (kab/kota)
- data/districts.json  (kecamatan)
- data/kabkota.csv
- data/kecamatan.csv
`);
