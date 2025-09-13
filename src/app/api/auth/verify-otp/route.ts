// src/app/api/auth/verify-otp/route.ts
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const db = admin.firestore();
const auth = admin.auth();

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: 'Email & kode wajib' }, { status: 400 });

    const key = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
    const ref = db.collection('email_otps').doc(key);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Kode tidak ditemukan' }, { status: 400 });

    const data = snap.data()!;
    if (Date.now() > data.expireAt) {
      await ref.delete();
      return NextResponse.json({ error: 'Kode kedaluwarsa' }, { status: 400 });
    }

    const hash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (hash !== data.codeHash) {
      await ref.update({ attempts: (data.attempts || 0) + 1 });
      return NextResponse.json({ error: 'Kode salah' }, { status: 400 });
    }

    // Upsert user & roles
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch {
      user = await auth.createUser({ email, emailVerified: true });
    }

    const claims = (await auth.getUser(user.uid)).customClaims || {};
    const existing = new Set<string>(Array.isArray(claims.roles) ? claims.roles : []);
    // role yang diminta saat kirim OTP (owner/vendor)
    const role = data.role || 'owner';
    existing.add(role);

    await auth.setCustomUserClaims(user.uid, { ...claims, roles: Array.from(existing) });

    // One-time: hapus OTP
    await ref.delete();

    // Buat custom token untuk sign-in di client
    const token = await auth.createCustomToken(user.uid, { roles: Array.from(existing) });
    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
