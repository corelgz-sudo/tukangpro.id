'use client';

export default function Footer() {
  return (
    <footer className="site-footer bg-[#242533] text-gray-300 mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid md:grid-cols-5 gap-8 text-sm">
          <div className="md:col-span-1">
            <div className="font-bold text-white mb-3">Kategori</div>
            <ul className="space-y-1 opacity-80">
              <li>Tukang Sipil</li>
              <li>Tukang Listrik</li>
              <li>Tukang Mesin</li>
              <li>Tukang Gambar</li>
              <li>Tukang Digital</li>
              <li>Tukang Bersih</li>
              <li>Tukang Konveksi</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Cara Penggunaan</div>
            <ul className="space-y-1 opacity-80">
              <li>Daftar Sebagai Tukang</li>
              <li>Cara Mulai Jual Pekerjaan</li>
              <li>Jaminan Pekerjaan</li>
              <li>Blog Informasi</li>
              <li>FAQ</li>
              <li>Atur Pengguna Data Personal</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Kontraktor</div>
            <ul className="space-y-1 opacity-80">
              <li>Renovasi Rumah</li>
              <li>Interior Ruangan</li>
              <li>Kanopi / Pagar</li>
              <li>Kusen</li>
              <li>Plafon</li>
              <li>Lantai Epoxy</li>
              <li>Taman / Landscape</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Tentang TukangPro.id</div>
            <ul className="space-y-1 opacity-80">
              <li>Bekerja dengan TukangPro</li>
              <li>Syarat & Ketentuan</li>
              <li>Kebijakan Privasi</li>
            </ul>
          </div>
          <div>
            <div className="font-bold text-white mb-3">Hubungi kami</div>
            <ul className="space-y-1 opacity-80">
              <li>WhatsApp</li>
              <li>Email: support@tukangpro.id</li>
              <li>Senin–Minggu 09:00–18:00</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-xs opacity-70 flex items-center justify-between">
          <div>Copyright © 2025 TukangPro.id | All Rights Reserved</div>
          <div className="flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Online
          </div>
        </div>
      </div>
    </footer>
  );
}
