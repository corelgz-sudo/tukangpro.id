// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/TopNav';
import Footer from '@/components/Footer';
import TopNavGate from '@/components/TopNavGate';
import FooterGate from '@/components/FooterGate';


export const metadata: Metadata = {
  title: 'TukangPro.id',
  description: 'Temukan tukang terpercaya di kota Anda',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <TopNavGate />
        {children}
        <FooterGate /> {/* bukan <Footer /> */}
      </body>
    </html>
  );
}
