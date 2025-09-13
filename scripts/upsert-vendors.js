import admin from 'firebase-admin';
import fs from 'node:fs/promises';
import path from 'node:path';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('Set GOOGLE_APPLICATION_CREDENTIALS ke path service-account.json');
}
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

const file = path.join(process.cwd(), 'data', 'vendors.upsert.json');
const rows = JSON.parse(await fs.readFile(file, 'utf8'));

for (const v of rows) {
  const id = v.id || db.collection('_ids').doc().id;
  const payload = {
    displayName: v.displayName ?? 'Vendor',
    photoUrl: v.photoUrl ?? '',
    waNumber: v.waNumber ?? '',
    province_id: v.province_id ?? null,
    regency_id: v.regency_id ?? null,
    district_ids: Array.isArray(v.district_ids) ? v.district_ids : [],
    skills: Array.isArray(v.skills) ? v.skills : [],
    subskills: Array.isArray(v.subskills) ? v.subskills : [],
    rankScore: typeof v.rankScore === 'number' ? v.rankScore : 100,
    ratingAvg: Number(v.ratingAvg ?? 0),
    ratingCount: Number(v.ratingCount ?? 0),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    verified: !!v.verified,
    proUntil: v.proUntil ?? null,
    province_name: v.province_name ?? null,
    regency_name: v.regency_name ?? null,
  };
  // bersihkan null agar tidak buat field null
  Object.keys(payload).forEach(k => payload[k] == null && delete payload[k]);

  await db.collection('vendors').doc(id).set(payload, { merge: true });
  console.log('✔ upsert', id, payload.displayName);
}
console.log('🎉 selesai upsert');
