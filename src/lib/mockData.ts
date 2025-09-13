import type { Vendor } from '@/lib/format';

export const dummyVendors: Vendor[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `v${i + 1}`,
  displayName: `Vendor ${i + 1}`,
  avatarUrl: '',

  // Lokasi
  city: 'Jakarta',
  district: 'Kebayoran',

  // Skills (array of canonical tags)
  skills: ['tukang_batu'],

  // Profil angka
  yearsExp: 3 + (i % 5),
  pricePerDay: 250_000 + i * 10_000,

  // Flags / metrik
  negotiable: i % 2 === 0,
  toolsStandard: true,
  rating: 4.2,
  reviewCount: 10 + i,
  isPro: i % 4 === 0,
  verified: i % 3 === 0,

  // Kontak
  whatsapp: '08123456789',
}));
