import admin from 'firebase-admin';
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();

const demo = [
  {
    id: 'vnd_demo_1',
    displayName: 'CV Maju Jaya',
    waNumber: '628123456789',
    province_id: '32',     // Jawa Barat
    regency_id: '3273',    // Kota Bandung
    district_ids: ['3273051'], // Arcamanik contoh
    skills: ['tukang-sipil'],
    subskills: ['tukang-cat', 'tukang-keramik'],
    ratingAvg: 4.7,
    ratingCount: 31,
    rankScore: 147,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    regency_name: 'Kota Bandung',
    province_name: 'Jawa Barat',
  },
  {
    id: 'vnd_demo_2',
    displayName: 'Tekno Listrik',
    waNumber: '628112223334',
    province_id: '31',     // DKI Jakarta
    regency_id: '3173',    // Jakarta Barat contoh
    district_ids: [],
    skills: ['tukang-elektrik'],
    subskills: ['instalasi-listrik', 'panel-listrik'],
    ratingAvg: 4.9,
    ratingCount: 12,
    rankScore: 149,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    regency_name: 'Kota Administrasi Jakarta Barat',
    province_name: 'DKI Jakarta',
  },
];

for (const v of demo) {
  await db.collection('vendors').doc(v.id).set(v, { merge: true });
}
console.log('✅ Seed vendors selesai');
