'use client';

export default function Pagination({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = Array.from({ length: total }).map((_, i) => i + 1);
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}

        disabled={page === 1}
        className="px-3 py-1.5 rounded border text-sm disabled:opacity-40"
      >
        ‹
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 rounded border text-sm ${
            p === page ? 'bg-gray-900 text-white border-gray-900' : ''
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page === total}
        className="px-3 py-1.5 rounded border text-sm disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}
