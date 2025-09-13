'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { db } from '@/lib/firebase'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import type { VendorDoc, VendorStatus } from '@/types/vendor'

const TABS: VendorStatus[] = ['pending', 'verified', 'suspended']

export default function DirectoryPage() {
  const search = useSearchParams()
  const router = useRouter()
  const current: VendorStatus = (search.get('tab') as VendorStatus) || 'pending'
  const [rows, setRows] = useState<VendorDoc[]>([])
  const [loading, setLoading] = useState(true)

  // Sync URL saat klik tab
  function setTab(v: VendorStatus) {
    const sp = new URLSearchParams(search?.toString())
    sp.set('tab', v)
    router.replace(`/admin/directory?${sp.toString()}`)
  }

  useEffect(() => {
    setLoading(true)
    const vendorsRef = collection(db, 'vendors')
    // Catatan: orderBy('createdAt','desc') bisa minta index. Jika error, buat index sesuai console, atau hilangkan orderBy.
    const q = query(vendorsRef, where('status', '==', current), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list: VendorDoc[] = []
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
      setRows(list)
      setLoading(false)
    })
    return () => unsub()
  }, [current])

  const count = rows.length

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'rounded-xl border px-3 py-2 text-sm capitalize hover:bg-gray-50 ' +
              (t === current ? 'bg-gray-100 font-semibold' : '')
            }
          >
            {t} <span className="ml-1 text-xs text-gray-500">{t === current ? count : ''}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card-outline overflow-x-auto">
  <table className="min-w-full text-sm">
    <thead className="bg-gray-50/80 text-left text-gray-600 border-b">
            <tr>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2">Kota</th>
              <th className="px-4 py-2">Skill</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading…</td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">Tidak ada data</td>
              </tr>
            )}
            {rows.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.photoURL || '/avatar.png'} alt="avatar" className="size-8 rounded-full object-cover" />
                    <div>
                      <div className="font-medium">{v.displayName || '—'}</div>
                      <div className="text-xs text-gray-500">{v.phone || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2">{v.city || '—'}</td>
                <td className="px-4 py-2">{v.skills?.slice(0, 3).join(', ') || '—'}</td>
                <td className="px-4 py-2">{v.rating ?? '—'}</td>
                <td className="px-4 py-2 capitalize">{v.status}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-2">
                    {current !== 'verified' && (
                      <button
                        onClick={() => updateStatus(v.id, 'verified')}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Verify
                      </button>
                    )}
                    {current !== 'suspended' && (
                      <button
                        onClick={() => updateStatus(v.id, 'suspended')}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Suspend
                      </button>
                    )}
                    {current !== 'pending' && (
                      <button
                        onClick={() => updateStatus(v.id, 'pending')}
                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        Set Pending
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

async function updateStatus(id: string, status: VendorStatus) {
  const { doc, updateDoc } = await import('firebase/firestore')
  const { db } = await import('@/lib/firebase')
  try {
    await updateDoc(doc(db, 'vendors', id), { status })
    // TODO: optional toast sukses
  } catch (e) {
    console.error(e)
    alert('Gagal update status')
  }
}
