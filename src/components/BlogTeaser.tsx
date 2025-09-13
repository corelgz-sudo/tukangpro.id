// src/components/BlogTeaser.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';

export type BlogItem = {
  id: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  category: string;
  cover?: string;
  href?: string;
};

type Props = {
  items?: BlogItem[];
};

const defaultItems: BlogItem[] = [
  {
    id: 'b1',
    title: 'Tips Memilih Tukang Sipil yang Tepat untuk Renovasi Rumah',
    excerpt:
      'Kenali langkah-langkah memilih tukang yang sesuai kebutuhan—mulai dari cek portofolio, ulasan, hingga perjanjian kerja.',
    date: '2025-08-25',
    category: 'Panduan',
    cover:
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=800&auto=format&fit=crop',
    href: '/blogs/tips-memilih-tukang-sipil',
  },
  {
    id: 'b2',
    title: 'Estimasi Biaya Renovasi Kamar Mandi 2025',
    excerpt:
      'Kisaran biaya material dan tukang untuk kamar mandi ukuran 2×2 m: perbandingan opsi hemat, standar, dan premium.',
    date: '2025-08-20',
    category: 'Biaya',
    cover:
      'https://images.unsplash.com/photo-1624003730078-58e27e6f5d6f?q=80&w=800&auto=format&fit=crop',
    href: '/blogs/estimasi-biaya-kamar-mandi-2025',
  },
  {
    id: 'b3',
    title: 'Checklist Sebelum Mulai Proyek: Dari Desain hingga Pembayaran',
    excerpt:
      'Pastikan dokumen, gambar kerja, dan termin pembayaran disepakati sejak awal agar proyek berjalan lancar.',
    date: '2025-08-15',
    category: 'Checklist',
    cover:
      'https://images.unsplash.com/photo-1581094651181-3592d6ab1b89?q=80&w=800&auto=format&fit=crop',
    href: '/blogs/checklist-sebelum-proyek',
  },
];

export default function BlogTeaser({ items = defaultItems }: Props) {
  return (
    <section aria-labelledby="blog-teaser-title" className="mx-auto w-full max-w-6xl px-4">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 id="blog-teaser-title" className="text-xl font-bold text-slate-900">
            Artikel Terbaru
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Tips, panduan, dan inspirasi seputar renovasi & bangun rumah.
          </p>
        </div>
        <Link
          href="/blogs"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Lihat semua
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <article
            key={it.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[16/9] w-full bg-slate-100">
              {it.cover ? (
                <Image
                  src={it.cover}
                  alt={`Sampul: ${it.title}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">
                  {it.category}
                </span>
                <time dateTime={it.date}>
                  {new Date(it.date).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </time>
              </div>
              <h3 className="mt-2 line-clamp-2 text-base font-semibold text-slate-900">
                {it.title}
              </h3>
              <p className="mt-1 line-clamp-3 text-sm text-slate-600">{it.excerpt}</p>
              <div className="mt-auto pt-3">
                <Link
                  href={it.href || '#'}
                  className="text-sm font-semibold text-[#2F318B] hover:underline"
                >
                  Baca selengkapnya →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
