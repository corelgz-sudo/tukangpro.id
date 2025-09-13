'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, ShieldCheck, Wallet, LineChart, Settings } from 'lucide-react';

const items = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/directory', icon: Users, label: 'Directory' },
  { href: '/admin/verifications', icon: ShieldCheck, label: 'Verifications' },
  { href: '/admin/finance', icon: Wallet, label: 'Finance' },
  { href: '/admin/analytics', icon: LineChart, label: 'Analytics' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="
        hidden md:flex w-64 flex-col sticky top-3 h-[calc(100svh-24px)] overflow-y-auto
        card-outline bg-white     /* ⬅️ bingkai lembut */
      "
    >
      <div className="h-12 flex items-center px-4 font-semibold tracking-tight">TukangPro Admin</div>
      <nav className="px-2 pb-4 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const active = pathname === it.href || pathname.startsWith(it.href + '/');
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-gray-50
                ${active ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-700'}`}
            >
              <Icon className="size-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
