import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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
export const db = getFirestore(app, "ai-studio-craneiotplatform-b2cd0bac-fb1b-47b6-80a0-3205835992b7");
export const functions = getFunctions(app, "us-central1");
