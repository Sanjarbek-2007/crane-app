import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Firebase is used ONLY for the Google sign-in UX here - no Firestore, no
// Cloud Functions. All app data and device communication goes through the
// self-hosted REST API (see src/lib/api.ts); the backend verifies the
// Google ID token this issues against Google's public keys directly.
const firebaseConfig = {
  projectId: "gen-lang-client-0595727372",
  appId: "1:925730368286:web:e2f751e7a147e1e633370f",
  apiKey: "AIzaSyDDXq5txECMyOe1SLCI4BOaCIcbTiADmbk",
  authDomain: "gen-lang-client-0595727372.firebaseapp.com",
  storageBucket: "gen-lang-client-0595727372.firebasestorage.app",
  messagingSenderId: "925730368286",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
