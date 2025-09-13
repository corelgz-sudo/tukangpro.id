// src/components/SponsorStrip.tsx
'use client';

import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type SponsorItem = {
  id: string;
  href: string;
  label: string;
  utm?: string;
};

const items: SponsorItem[] = [
  { id: 's1', href: 'https://example.com', label: 'Sponsor A', utm: 'utm_source=tukangpro&utm_medium=banner&utm_campaign=home' },
  { id: 's2', href: 'https://example.com', label: 'Sponsor B', utm: 'utm_source=tukangpro&utm_medium=banner&utm_campaign=home' },
  { id: 's3', href: 'https://example.com', label: 'Sponsor C', utm: 'utm_source=tukangpro&utm_medium=banner&utm_campaign=home' },
];

const HIDE_KEY = 'tp_sponsor_hide_until';
const ROTATE_MS = 5000;

export default function SponsorStrip() {
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(true);
  const timer = useRef<number | null>(null);

  // cek localStorage untuk visibility (hide 24 jam)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HIDE_KEY);
      if (raw) {
        const until = Number(raw);
        if (Date.now() < until) {
          setHidden(true);
          return;
        }
      }
    } catch {
      // ignore
    }
    setHidden(false);
  }, []);

  // auto-rotate
  useEffect(() => {
    if (hidden) return;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, ROTATE_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [hidden]);

  const go = (i: number) => setIndex(i % items.length);

  const formatted = useMemo(() => {
    return items.map((it) => {
      const url = it.utm ? `${it.href}${it.href.includes('?') ? '&' : '?'}${it.utm}` : it.href;
      return { ...it, url };
    });
  }, []);

  if (hidden) return null;

  return (
    <section aria-label="Banner Sponsor" className="mx-auto w-full max-w-6xl px-4">
      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <button
          type="button"
          onClick={() => {
            try {
              const until = Date.now() + 24 * 60 * 60 * 1000;
              localStorage.setItem(HIDE_KEY, String(until));
            } catch {}
            setHidden(true);
          }}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 outline-none ring-offset-2 transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400"
          aria-label="Tutup banner sponsor"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {formatted.map((it, i) => (
            <a
              key={it.id}
              href={it.url}
              target="_blank"
              rel="noopener"
              className={`relative aspect-[16/9] w-full select-none rounded-xl border border-dashed ${
                index === i ? 'border-indigo-400' : 'border-slate-300'
              } bg-slate-50 transition`}
              aria-current={index === i ? 'true' : undefined}
              onMouseEnter={() => go(i)}
            >
              <div className="absolute inset-0 m-2 flex items-center justify-center rounded-lg bg-white text-center text-lg font-semibold text-slate-500">
                Banner Sponsor
              </div>
              <span className="sr-only">{it.label}</span>
            </a>
          ))}
        </div>

        {/* dots */}
        <div className="mt-3 flex justify-center gap-2">
          {formatted.map((it, i) => (
            <button
              key={it.id}
              type="button"
              className={`h-2.5 w-2.5 rounded-full transition ${
                index === i ? 'bg-[#2F318B]' : 'bg-slate-300'
              }`}
              aria-label={`Slide ${i + 1}`}
              aria-pressed={index === i}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
