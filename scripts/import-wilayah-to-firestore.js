// scripts/import-wilayah-to-firestore.js
// ESM: proyek Next.js kamu sudah "type": "module".
// Jalankan dengan: node scripts/import-wilayah-to-firestore.js

import fs from 'node:fs/promises';
import path from 'node:path';
import admin from 'firebase-admin';

// --- Kredensial via Application Default Credentials ---
// Pastikan env GOOGLE_APPLICATION_CREDENTIALS menunjuk ke service-account.json
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS belum diset. Set dulu ke path service-account.json.'
  );
}
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

// --- Util ---
const root = path.join(process.cwd(), 'data');
const exists = async (p) => !!(await fs.stat(p).catch(() => null));
const chunks = (arr, n = 450) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

async function importColl(file, collName, idKey = 'id') {
  const full = path.join(root, file);
  if (!(await exists(full))) {
    throw new Error(`File data tidak ditemukan: ${full}. Jalankan build-wilayah.js dulu.`);
  }
  const rows = JSON.parse(await fs.readFile(full, 'utf8'));
  console.log(`→ import ${collName}: ${rows.length} dokumen dari ${file}`);

  let done = 0;
  for (const part of chunks(rows)) {
    const batch = db.batch();
    part.forEach((r) => {
      const ref = db.collection(collName).doc(String(r[idKey]));
      batch.set(ref, r, { merge: false });
    });
    await batch.commit();
    done += part.length;
    process.stdout.write(`   ${done}/${rows.length}\r`);
  }
  console.log(`\n  ✅ selesai ${collName}`);
}

await importColl('provinces.json', 'catalog_provinces');
await importColl('regencies.json', 'catalog_regencies');
await importColl('districts.json', 'catalog_districts');

console.log('🎉 Selesai import semua koleksi.');
