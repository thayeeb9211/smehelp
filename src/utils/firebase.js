import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import secretConfig from './secret_config.json';

// Default configurations with your live project credentials
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAdLelaajwQnnUPErp7z27yE_KtQmaMiEI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smehelp-80e97.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smehelp-80e97",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smehelp-80e97.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "697181602375",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:697181602375:web:36edba2060ba4eefb4e762"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Export emails array for reference or display in other parts of code if needed
export const SME_EMAILS = secretConfig.sme_emails;

// Helper to determine if an email belongs to an SME
export const isSmeEmail = (email) => {
  if (!email) return false;
  return SME_EMAILS.map(e => e.toLowerCase().trim()).includes(email.toLowerCase().trim());
};

export default app;
