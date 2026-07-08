// ============================================================
// auth.js
// ------------------------------------------------------------
// Handles sign-in (Google popup + email/password fallback) and,
// critically, merges whatever guest cart/wishlist/recent-viewed
// data exists in localStorage into Firestore the moment a user
// signs in — then clears localStorage so it isn't double-counted
// on the next visit.
//
// Call `attachAuthModalTriggers()` once per page that has a
// Cart or Checkout button, so clicking it — while signed out —
// opens the low-friction sign-in modal instead of navigating away.
// ============================================================

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, googleProvider, db } from "../config/firebase-config.js";
import { getCart, clearCart } from "./cart.js";
import { getWishlist, clearWishlist } from "./wishlist.js";

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    mergeGuestDataToFirestore(user.uid);
  }
});

export function getCurrentUser() {
  return currentUser;
}

/**
 * Opens Google's own sign-in popup — this IS the "instant modal",
 * no custom UI needed for the Google path itself. Call this
 * directly from a Cart/Checkout button's click handler.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user; // { uid, displayName, email, photoURL }
  } catch (err) {
    console.error("Google sign-in failed:", err);
    throw err;
  }
}

export async function signInWithEmail(email, password) {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signUpWithEmail(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", result.user.uid), {
    name,
    email,
    phone: "",
    addresses: [],
    createdAt: serverTimestamp()
  ,
  role:"user"
  });
  return result.user;
}

export async function logOut() {
  await signOut(auth);
}

/**
 * One-time move of guest localStorage cart/wishlist into
 * Firestore under the newly signed-in user's uid, then clears
 * localStorage so it doesn't get merged again next session.
 *
 * Uses a batch write so it's a single atomic operation rather
 * than N separate round trips.
 */
async function mergeGuestDataToFirestore(uid) {
  const guestCart = getCart();
  const guestWishlist = getWishlist();

  if (guestCart.length === 0 && guestWishlist.length === 0) return;

  const batch = writeBatch(db);

  // Merge cart → carts/{uid}.items (merge:true so we don't clobber
  // anything already saved there from a previous session)
  if (guestCart.length > 0) {
    const cartRef = doc(db, "carts", uid);
    const existing = await getDoc(cartRef);
    const existingItems = existing.exists() ? (existing.data().items || []) : [];
    const mergedItems = mergeCartItems(existingItems, guestCart);
    batch.set(cartRef, { items: mergedItems, updatedAt: serverTimestamp() }, { merge: true });
  }

  // Merge wishlist → wishlist/{uid}/items/{productId} docs
  if (guestWishlist.length > 0) {
    guestWishlist.forEach(productId => {
      const wishRef = doc(db, "wishlist", uid, "items", productId);
      batch.set(wishRef, { addedAt: serverTimestamp() }, { merge: true });
    });
  }

  await batch.commit();

  // Clear local guest state now that it lives in Firestore
  clearCart();
  clearWishlist();
}

function mergeCartItems(existing, incoming) {
  const map = new Map(existing.map(item => [item.productId, item]));
  incoming.forEach(item => map.set(item.productId, item)); // incoming wins on conflict
  return Array.from(map.values());
}

/**
 * Wire this up on any page with a Cart or Checkout button.
 * If the user is signed in, lets the click proceed normally.
 * If not, intercepts the click and triggers the Google popup
 * (falling back to the full auth page only if they dismiss it
 * or want email/password instead).
 *
 * @param {string} selector - CSS selector for the button(s)
 * @param {function} onAuthenticated - callback once signed in, receives the click event
 */
export function attachAuthModalTriggers(selector, onAuthenticated) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener("click", async (e) => {
      if (currentUser) {
        onAuthenticated(e);
        return;
      }
      e.preventDefault();
      try {
        await signInWithGoogle();
        onAuthenticated(e);
      } catch (err) {
        // User closed the Google popup or it failed —
        // fall back to the full auth page with email/password option.
        window.location.href = "/auth.html?redirect=" + encodeURIComponent(window.location.pathname);
      }
    });
  });
}
