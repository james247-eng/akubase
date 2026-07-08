// ============================================================
// firebase-config.js
// ------------------------------------------------------------
// Replace every value below with your real Firebase project
// credentials (Firebase Console → Project Settings → General →
// "Your apps" → SDK setup and configuration).
//
// NEVER commit real credentials to a public GitHub repo.
// These values are safe to expose in client-side code ONLY
// because Firestore/Auth security rules do the real access
// control — this config alone grants no special access.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBUCyGzKSE7GhHi-xX1HKC2TwYomjNrXNM",
  authDomain: "my-project-742e6.firebaseapp.com",
  projectId: "my-project-742e6",
  storageBucket: "my-project-742e6.firebasestorage.app",
  messagingSenderId: "203162014113",
  appId: "1:203162014113:web:31e7c2e2063bc47389fbe0"
};

// ---- Initialize ----
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics only works when served over https (or localhost) —
// wrap in try/catch so local file:// testing doesn't throw.
export let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics not initialized:", e.message);
}
