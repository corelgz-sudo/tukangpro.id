// src/lib/firebase.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET!, // ex: tukangpro-69c18.appspot.com  OR  tukangpro
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const db = getFirestore(app);

// penting: arahkan ke bucket dari ENV supaya tidak nyasar
const storage = getStorage(app, `gs://${process.env.NEXT_PUBLIC_FB_STORAGE_BUCKET}`);

// helper login anonim kalau belum login (dipakai uploader)
export async function ensureAuth(): Promise<User> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return auth.currentUser!;
}

export { app, auth, db, storage };
