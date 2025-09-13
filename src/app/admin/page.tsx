'use client'


import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase' // asumsi sudah ada
import { collection, getCountFromServer, query, where } from 'firebase/firestore'
import StatCard from '@/components/admin/StatCard'
import { Users, ShieldCheck, Ban } from 'lucide-react'


export default function AdminHomePage() {
const [pending, setPending] = useState<number | null>(null)
const [verified, setVerified] = useState<number | null>(null)
const [suspended, setSuspended] = useState<number | null>(null)


useEffect(() => {
async function run() {
try {
const vendorsRef = collection(db, 'vendors')
const p = await getCountFromServer(query(vendorsRef, where('status', '==', 'pending')))
const v = await getCountFromServer(query(vendorsRef, where('status', '==', 'verified')))
const s = await getCountFromServer(query(vendorsRef, where('status', '==', 'suspended')))
setPending(p.data().count)
setVerified(v.data().count)
setSuspended(s.data().count)
} catch (e) {
console.error(e)
}
}
run()
}, [])


return (
<div className="space-y-6">
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
<StatCard title="Pending Vendors" value={pending ?? '—'} icon={<Users className="size-6" />} />
<StatCard title="Verified Vendors" value={verified ?? '—'} icon={<ShieldCheck className="size-6" />} />
<StatCard title="Suspended" value={suspended ?? '—'} icon={<Ban className="size-6" />} />
</div>


{/* Placeholder panel ringkas */}
<div className="card-outline p-5">
  <div className="font-semibold">Quick Actions</div>
  <div className="mt-3 flex flex-wrap gap-2">
    <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition">
      Review Pending
    </button>
    <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition">
      Open Analytics
    </button>
    <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition">
      Settings
    </button>
</div>
</div>
</div>
)
}