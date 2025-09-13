// src/lib/format.ts
export type Vendor = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  city: string;
  district?: string;
  skills: string[];         // kategori utama
  subskills?: string[];     // sub skill ringkas 1–3 item
  yearsExp?: number;
  pricePerDay?: number;     // angka; "Rp 175.000 / hari"
  negotiable?: boolean;     // label "Nego" jika true
  toolsStandard?: boolean;  // "Alat tersedia standar"
  rating?: number;          // 0–5
  reviewCount?: number;     // jumlah ulasan
  isPro?: boolean;          // badge Pro
  verified?: boolean;       // badge Verified
  whatsapp?: string;        // nomor WA
};

export const formatRupiah = (value?: number) => {
  if (value == null || isNaN(value)) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '');
};

export const normalizePhone = (phone?: string) => {
  if (!phone) return '';
  let p = phone.replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = p.slice(1);
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return p;
};

export const waLink = (vendor: Vendor) => {
  const phone = normalizePhone(vendor.whatsapp || '');
  const text =
    `Halo ${vendor.displayName}, saya melihat profil Anda di TukangPro.id ` +
    `dan ingin konsultasi pekerjaan. Apakah bisa dibantu?`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};
