'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CaptchaCheckbox from '@/components/CaptchaCheckbox';
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithCustomToken,
  signInWithEmailAndPassword,
} from 'firebase/auth';

import { doc, serverTimestamp, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { resolveRole, AppRole } from '@/lib/auth/role';


type Mode = 'login' | 'daftar';
type Method = 'otp' | 'password';
type Role = 'owner' | 'vendor';

export default function LoginPage() {
  const sp = useSearchParams();
  const router = useRouter();

  async function routeAfterLogin() {
  const u = auth.currentUser!;
  // baca user doc
  const uref = doc(db, 'users', u.uid);
  const usnap = await getDoc(uref);
  const udata: any = usnap.data() || {};

  // cek apakah dia punya dokumen vendors/{uid}
  const vsnap = await getDoc(doc(db, 'vendors', u.uid));
  const hasVendorDoc = vsnap.exists();

  // ambil role yang paling benar (role → roles[] → tebak dari vendors)
  let role: 'owner' | 'vendor' | 'admin' =
    typeof udata.role === 'string'
      ? (udata.role as any)
      : Array.isArray(udata.roles) && udata.roles.includes('vendor')
      ? 'vendor'
      : Array.isArray(udata.roles) && udata.roles.includes('owner')
      ? 'owner'
      : hasVendorDoc
      ? 'vendor'
      : 'owner';

  // SELF-HEALING: kalau ada vendors/{uid} tapi user doc bukan vendor → perbaiki
  if (hasVendorDoc && role !== 'vendor') {
    await setDoc(
      uref,
      { role: 'vendor', roles: arrayUnion('vendor') },
      { merge: true }
    );
    role = 'vendor';
  }

  // kalau tidak ada vendors/{uid} dan role masih kosong → set owner
  if (!hasVendorDoc && role !== 'owner' && role !== 'admin') {
    await setDoc(uref, { role: 'owner', roles: arrayUnion('owner') }, { merge: true });
    role = 'owner';
  }

  // redirect pasti sesuai role
  if (role === 'vendor') return router.push('/dashboard');
  if (role === 'admin')  return router.push('/admin');
  return router.push('/owner');
}



  // default role dari query (?role=vendor)
  const [role, setRole] = useState<Role>(
    sp.get('role') === 'vendor' ? 'vendor' : 'owner'
  );

  const [mode, setMode] = useState<Mode>('login');           // tab
  const [method, setMethod] = useState<Method>('otp');       // otp/password

  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string|null>(null);
  const [agree, setAgree] = useState(false);

  const [step, setStep] = useState<'send' | 'verify'>('send'); // untuk OTP
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const emailOk = useMemo(() => /^[^@]+@[^@]+\.[^@]+$/.test(email), [email]);
  const pwdOk = pwd.length >= 6;

  // Kapan tombol aktif?
  const canSendOtp = mode === 'login'
    ? emailOk && !!captchaToken // login pakai OTP (tanpa S&K)
    : emailOk && !!captchaToken && agree; // daftar pakai OTP (wajib S&K)

  const canSubmitPwd =
    method === 'password' &&
    emailOk &&
    (mode === 'login' ? pwdOk : (pwdOk && agree && !!captchaToken)); // daftar pakai password: wajib captcha+S&K

  // ===== OTP FLOW =====
  const sendOtp = async () => {
    if (!canSendOtp) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, captchaToken, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Gagal mengirim kode');
      setStep('verify');
    } catch (e:any) { alert(e.message || 'Gagal'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    if (code.trim().length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Kode salah');
      await signInWithCustomToken(auth, data.token);
await routeAfterLogin();

    } catch (e:any) { alert(e.message || 'Gagal verifikasi'); }
    finally { setLoading(false); }
  };

  // ===== PASSWORD FLOW =====
  const loginPwd = async () => {
    if (!canSubmitPwd) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
await routeAfterLogin();

    } catch (e:any) { alert(e.message || 'Login gagal'); }
    finally { setLoading(false); }
  };

  const registerPwd = async () => {
    if (!canSubmitPwd) return;
    setLoading(true);
    try {
      // Buat akun
      const cred = await createUserWithEmailAndPassword(auth, email, pwd);
      // Simpan user doc + role (claims bisa di-set via CFN nanti)
      await setDoc(doc(db, 'users', cred.user.uid), {
  email,
  role,               // ← tambah
  roles: arrayUnion(role), // aman kalau dipanggil lagi
  createdAt: serverTimestamp(),
  tosAcceptedAt: Date.now(),
  tosVersion: '2025-09-01',
}, { merge: true });


      if (role === 'vendor') {
        await setDoc(doc(db, 'vendors', cred.user.uid), {
          ownerUid: cred.user.uid,
          verification: { phone: { status: 'unverified' }, ktp: { status: 'unverified' } },
          visibility: 'limited',
          createdAt: serverTimestamp(),
        }, { merge: true });
      }

      await routeAfterLogin();
    } catch (e:any) { alert(e.message || 'Daftar gagal'); }
    finally { setLoading(false); }
  };

  // ===== UI =====
  return (
    <main className="min-h-screen bg-[#F5F7FF]">
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Masuk / Daftar</h1>
        <p className="text-slate-600 mb-6">Masukkan email untuk menerima kode (OTP) atau gunakan kata sandi.</p>

        {/* Tab Login / Daftar */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-white mb-4">
          <button
            className={`px-4 h-10 rounded-xl ${mode==='login'?'bg-[#2F318B] text-white':'text-slate-700'}`}
            onClick={() => { setMode('login'); setStep('send'); }}
          >Login</button>
          <button
            className={`px-4 h-10 rounded-xl ${mode==='daftar'?'bg-[#2F318B] text-white':'text-slate-700'}`}
            onClick={() => { setMode('daftar'); setStep('send'); }}
          >Daftar</button>
        </div>

        {/* Role hanya saat Daftar */}
        {mode==='daftar' && (
          <div className="mb-4">
            <div className="text-sm mb-1 text-slate-700">Daftar sebagai:</div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white">
              <button
                className={`px-4 h-9 rounded-xl ${role==='owner'?'bg-emerald-600 text-white':'text-slate-700'}`}
                onClick={()=>setRole('owner')}
              >Owner</button>
              <button
                className={`px-4 h-9 rounded-xl ${role==='vendor'?'bg-emerald-600 text-white':'text-slate-700'}`}
                onClick={()=>setRole('vendor')}
              >Tukang</button>
            </div>
          </div>
        )}

        {/* Email */}
        <label className="block text-sm mb-4">
          <span className="block mb-1 text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full h-12 rounded-xl bg-white px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F318B]/30"
            placeholder="nama@contoh.com"
          />
          {!emailOk && email.length>0 && <span className="text-xs text-rose-600">Email tidak valid</span>}
        </label>

        {/* Toggle metode */}
        <div className="flex items-center gap-3 mb-3 text-sm">
          <span className="text-slate-600">Metode:</span>
          <button
            className={`px-3 h-8 rounded-lg border ${method==='otp'?'bg-[#2F318B] text-white border-[#2F318B]':'bg-white border-slate-300'}`}
            onClick={()=>{ setMethod('otp'); setStep('send'); }}
          >OTP Email</button>
          <button
            className={`px-3 h-8 rounded-lg border ${method==='password'?'bg-[#2F318B] text-white border-[#2F318B]':'bg-white border-slate-300'}`}
            onClick={()=>setMethod('password')}
          >Kata Sandi</button>
        </div>

        {/* PASSWORD MODE */}
        {method==='password' && (
          <>
            <label className="block text-sm mb-3">
              <span className="block mb-1 text-slate-700">Password</span>
              <input
                type="password"
                value={pwd}
                onChange={(e)=>setPwd(e.target.value)}
                className="w-full h-12 rounded-xl bg-white px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F318B]/30"
                placeholder="Minimal 6 karakter"
              />
            </label>

            {/* daftar pakai password tetap butuh captcha + S&K */}
            {mode==='daftar' && (
              <>
                <div className="mb-3"><CaptchaCheckbox onChange={setCaptchaToken} /></div>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-gray-300"
                    style={{ accentColor:'#2F318B' }}
                    checked={agree}
                    onChange={(e)=>setAgree(e.target.checked)}
                  />
                  <span>Saya menyetujui <a className="underline" href="/terms">Syarat & Ketentuan</a> dan <a className="underline" href="/privacy">Kebijakan Privasi</a>.</span>
                </label>
              </>
            )}

            <button
              onClick={mode==='login'?loginPwd:registerPwd}
              disabled={!canSubmitPwd || loading}
              className={`mt-5 w-full h-12 rounded-xl px-4 font-extrabold text-white ${!canSubmitPwd||loading?'bg-slate-300':'bg-[#2F318B] hover:opacity-95'}`}
            >
              {loading ? 'Memproses…' : (mode==='login'?'Login':'Daftar')}
            </button>
          </>
        )}

        {/* OTP MODE */}
        {method==='otp' && (
          <>
            {step==='send' ? (
              <>
                <div className="mb-3"><CaptchaCheckbox onChange={setCaptchaToken} /></div>
                {mode==='daftar' && (
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 w-4 h-4 rounded border-gray-300"
                      style={{ accentColor:'#2F318B' }}
                      checked={agree}
                      onChange={(e)=>setAgree(e.target.checked)}
                    />
                    <span>Saya menyetujui <a className="underline" href="/terms">Syarat & Ketentuan</a> dan <a className="underline" href="/privacy">Kebijakan Privasi</a>.</span>
                  </label>
                )}
                <button
                  onClick={sendOtp}
                  disabled={!canSendOtp || loading}
                  className={`mt-5 w-full h-12 rounded-xl px-4 font-extrabold text-white ${!canSendOtp||loading?'bg-slate-300':'bg-[#2F318B] hover:opacity-95'}`}
                >
                  {loading ? 'Mengirim…' : 'Kirim Kode'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-700 mb-3">
                  Kode sudah dikirim ke <b>{email}</b>. Masukkan 6 digit di bawah ini.
                </p>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e)=>setCode(e.target.value.replace(/\D/g,''))}
                  className="tracking-[6px] text-center w-full h-12 rounded-xl bg-white px-4 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F318B]/30"
                  placeholder="••••••"
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={()=>setStep('send')} className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-700">Ganti email</button>
                  <button
                    onClick={verifyOtp}
                    disabled={code.trim().length!==6 || loading}
                    className={`flex-1 h-10 rounded-lg font-semibold text-white ${code.trim().length!==6||loading?'bg-slate-300':'bg-[#2F318B] hover:opacity-95'}`}
                  >
                    Verifikasi & Masuk
                  </button>
                </div>
              </>
            )}
          </>
        )}

        <p className="mt-4 text-xs text-slate-500">OTP via email. Cepat & tidak masuk spam (kita optimalkan deliverability).</p>
      </div>
    </main>
  );
}
