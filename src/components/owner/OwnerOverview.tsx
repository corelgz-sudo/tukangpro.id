'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {
  ClipboardList,
  Heart,
  Inbox,
  User2,
  Phone,
  Mail,
  MapPin,
  Pencil,
} from 'lucide-react';
import Link from 'next/link';

type Counts = {
  tendersOpen: number;
  favorites: number;
  bidsPending: number;
};

type OwnerUser = {
  displayName?: string;
  phone?: string;         // nomor WA
  email?: string;
  address?: string;
  photoURL?: string;
};

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-w-[280px] rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-gray-700 font-semibold">{title}</p>
        <div className="text-gray-400">{icon}</div>
      </div>
      <div className="mt-3 text-3xl font-bold text-gray-900">{value}</div>
      {hint ? <p className="mt-2 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function avatarInitial(name?: string) {
  if (!name) return 'U';
  const t = name.trim();
  if (!t) return 'U';
  const parts = t.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  return (first + second).toUpperCase();
}

function InfoRow({
  icon,
  label,
  value,
  required = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  required?: boolean;
}) {
  const empty = !value || !value.trim();
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="mt-[2px] text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="text-gray-500">{label}</div>
        {empty ? (
          <div className="mt-0.5 inline-flex items-center gap-2">
            <span className="text-gray-400 italic">- belum diisi -</span>
            {required && (
              <span className="text-[11px] rounded-md bg-red-50 text-red-600 px-2 py-0.5 border border-red-200">
                Wajib
              </span>
            )}
          </div>
        ) : (
          <div className="mt-0.5 font-medium text-gray-900 break-all">{value}</div>
        )}
      </div>
    </div>
  );
}

function ProfileQuickCard({ user }: { user: OwnerUser }) {
  const email = user.email || auth.currentUser?.email || '';

  const needName = !user.displayName || !user.displayName.trim();
  const needWa = !user.phone || !user.phone.trim();
  const needFix = needName || needWa;

  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 overflow-hidden flex items-center justify-center text-indigo-700 font-bold">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span>{avatarInitial(user.displayName)}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Profil Singkat</h3>
            <Link
              href="/owner?tab=profile"
              className={[
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold',
                needFix
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700',
              ].join(' ')}
              title="Edit Profil"
            >
              <Pencil className="h-4 w-4" />
              {needFix ? 'Lengkapi Profil' : 'Edit Profil'}
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow
              icon={<User2 className="h-4 w-4" />}
              label="Nama"
              value={user.displayName}
              required
            />
            <InfoRow
              icon={<Phone className="h-4 w-4" />}
              label="No. WhatsApp"
              value={user.phone}
              required
            />
            <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={email || ''} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label="Alamat" value={user.address} />
          </div>

          {needFix && (
            <p className="mt-3 text-xs text-red-600">
              Lengkapi *Nama* dan *No. WhatsApp* agar vendor mudah menghubungi Anda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OwnerOverview({ ownerId }: { ownerId: string }) {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [user, setUser] = useState<OwnerUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch counts + user profile
  useEffect(() => {
    if (!ownerId) return;
    let mounted = true;

    (async () => {
      setLoading(true);
      try {
        // --- counts ---
        const qTenders = query(
          collection(db, 'tenders'),
          where('ownerId', '==', ownerId),
          where('status', '==', 'open')
        );
        const tendersSnap = await getDocs(qTenders);

        const qFav = query(
          collection(db, 'favorites'),
          where('ownerId', '==', ownerId)
        );
        const favSnap = await getDocs(qFav);

        let bidsPending = 0;
        try {
          const qBids = query(
            collectionGroup(db, 'bids'),
            where('ownerId', '==', ownerId),
            where('status', '==', 'pending')
          );
          const bidsSnap = await getDocs(qBids);
          bidsPending = bidsSnap.size;
        } catch {
          const tenderIds = tendersSnap.docs.map((d) => d.id);
          let total = 0;
          for (const tid of tenderIds) {
            const qPend = query(
              collection(db, `tenders/${tid}/bids`),
              where('status', '==', 'pending')
            );
            const s = await getDocs(qPend);
            total += s.size;
          }
          bidsPending = total;
        }

        // --- user profile ---
        const uref = doc(db, 'users', ownerId);
        const usnap = await getDoc(uref);
        const udata = (usnap.exists() ? (usnap.data() as OwnerUser) : {}) as OwnerUser;

        if (!mounted) return;
        setCounts({
          tendersOpen: tendersSnap.size,
          favorites: favSnap.size,
          bidsPending,
        });
        setUser({
          displayName: udata.displayName || '',
          phone: udata.phone || (udata as any).whatsapp || '',
          email: udata.email || auth.currentUser?.email || '',
          address: udata.address || '',
          photoURL: udata.photoURL || '',
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [ownerId]);

  const skeleton = useMemo(
    () => (
      <div className="space-y-4">
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white border border-gray-200 p-5">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="mt-4 h-8 w-16 bg-gray-200 rounded" />
              <div className="mt-3 h-3 w-40 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="animate-pulse h-40 rounded-2xl bg-white border border-gray-200" />
      </div>
    ),
    []
  );

  if (loading || !counts) return skeleton;

  return (
    <div className="space-y-4">
      {/* 3 stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Tender Aktif"
          value={counts.tendersOpen}
          hint="otomatis bertambah saat membuat tender"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <StatCard
          title="Favorit"
          value={counts.favorites}
          hint="ringkasan cepat"
          icon={<Heart className="h-5 w-5" />}
        />
        <StatCard
          title="Bid Masuk"
          value={counts.bidsPending}
          hint="vendor yang menawar tender Anda"
          icon={<Inbox className="h-5 w-5" />}
        />
      </div>

      {/* Quick profile */}
      <ProfileQuickCard user={user || {}} />
    </div>
  );
}
