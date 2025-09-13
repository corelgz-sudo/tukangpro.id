// src/components/TopNavGate.tsx
'use client';
import { usePathname } from 'next/navigation';
import TopNav from './TopNav';

const HIDE_ON: string[] = ['/login', '/register', '/auth', '/admin']; // ⬅️ tambah '/admin'

export default function TopNavGate() {
  const pathname = usePathname();
  const shouldHide = HIDE_ON.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (shouldHide) return null;
  return <TopNav />;
}
