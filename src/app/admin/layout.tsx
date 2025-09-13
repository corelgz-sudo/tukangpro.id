'use client';

import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopbar from '@/components/admin/AdminTopbar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Matikan footer publik khusus di /admin */}
      <style>{`footer.site-footer{display:none !important}`}</style>

      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          <AdminTopbar />
          <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}

