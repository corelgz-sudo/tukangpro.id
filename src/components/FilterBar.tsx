'use client';

import { useState } from 'react';

export type FilterValues = {
  city: string[];
  district: string[];
  skill: string[];
  subskill: string[];
  q: string;
  sort: 'recommended' | 'rating_desc' | 'reviews_desc' | 'updated_desc';
  view: 'grid' | 'list';
};

export default function FilterBar({
  values,
  onChange,
}: {
  values: FilterValues;
  onChange: (f: FilterValues) => void;
}) {
  const [form, setForm] = useState(values);

  const apply = () => onChange(form);

  return (
    <div className="sticky top-0 z-10 bg-white border-b py-3">
      <div className="flex flex-wrap items-end gap-3">
        {/* Kota */}
        <input
          type="text"
          placeholder="Kota"
          value={form.city.join(',')}
          onChange={(e) =>
            setForm({ ...form, city: e.target.value.split(',') })
          }
          className="border rounded px-2 py-1 text-sm"
        />
        {/* Skill */}
        <input
          type="text"
          placeholder="Skill"
          value={form.skill.join(',')}
          onChange={(e) =>
            setForm({ ...form, skill: e.target.value.split(',') })
          }
          className="border rounded px-2 py-1 text-sm"
        />
        {/* Sort */}
        <select
          value={form.sort}
          onChange={(e) =>
            setForm({ ...form, sort: e.target.value as any })
          }
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="recommended">Rekomendasi</option>
          <option value="rating_desc">Rating Tertinggi</option>
          <option value="reviews_desc">Banyak Ulasan</option>
          <option value="updated_desc">Update Terbaru</option>
        </select>
        {/* Toggle view */}
        <select
          value={form.view}
          onChange={(e) =>
            setForm({ ...form, view: e.target.value as any })
          }
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
        {/* Tombol */}
        <button
          onClick={apply}
          className="ml-auto rounded bg-blue-600 text-white px-4 py-1.5 text-sm font-semibold"
        >
          Terapkan
        </button>
      </div>
    </div>
  );
}
