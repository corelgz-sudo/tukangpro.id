import { Vendor } from '@/components/VendorCard';

export const dummyVendors: Vendor[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `v${i + 1}`,
  name: `Vendor ${i + 1}`,
  city: i % 2 === 0 ? 'Bandung' : 'Cimahi',
  skill: i % 2 === 0 ? 'Kitchenset' : 'Gypsum',
  exp: `${5 + i} Tahun`,
  priceText: `Rp ${100000 + i * 5000}/Hari`,
  nego: 'Nego',
  tools: 'Lengkap',
  rating: 4.5,
  reviews: 10 + i,
  pro: i % 3 === 0,
  verified: i % 2 === 0,
  photo: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
  portfolioThumb:
    'https://images.unsplash.com/photo-1564767609342-620cb19b2357?w=640',
  waNumber: '6281234567890',
}));
