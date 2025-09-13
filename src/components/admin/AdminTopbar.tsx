'use client';
import { Bell } from 'lucide-react';

export default function AdminTopbar() {
  return (
    <header className="sticky top-3 z-30">
      <div
        className="
          card-outline h-14 bg-white/80 backdrop-blur
          flex items-center justify-between px-4
        "
      >
        <div className="font-medium">Dashboard</div>
        <button className="rounded-full p-2 hover:bg-gray-100" aria-label="notifications">
          <Bell className="size-5" />
        </button>
      </div>
    </header>
  );
}
