// ============================================================
// cart.js
// ------------------------------------------------------------
// Guest cart lives entirely in localStorage. No Firestore write
// happens until the user hits Checkout or Cart and signs in —
// at which point mergeGuestCartToFirestore() (in auth.js) takes
// over and moves this data server-side, then clears local state.
//
// Each cart line item: { productId, size, addedAt }
// Quantity is implicitly 1 per line — since every item is a
// unique one-of-one piece, "quantity" doesn't apply the way it
// would for a normal retailer. Adding the same productId twice
// just updates its size/timestamp rather than duplicating a row.
// ============================================================

import { readList, writeList } from "./storage.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../config/firebase-config.js";

const KEY = "cart";

export function getCart() {
  return readList(KEY);
}

export function getCartCount() {
  return getCart().length;
}

export function addToCart(productId, size = null) {
  const cart = getCart();
  const existingIndex = cart.findIndex(item => item.productId === productId);

  if (existingIndex > -1) {
    cart[existingIndex].size = size;
    cart[existingIndex].addedAt = Date.now();
  } else {
    cart.push({ productId, size, addedAt: Date.now() });
  }

  writeList(KEY, cart);
  return cart;
}

export function removeFromCart(productId) {
  const cart = getCart().filter(item => item.productId !== productId);
  writeList(KEY, cart);
  return cart;
}

export function isInCart(productId) {
  return getCart().some(item => item.productId === productId);
}

export function clearCart() {
  writeList(KEY, []);
}

export async function getUserCart(uid) {
  if (!uid) return [];
  const snap = await getDoc(doc(db, "carts", uid));
  return snap.exists() ? (snap.data().items || []) : [];
}

export async function saveUserCart(uid, items) {
  if (!uid) return;
  await setDoc(doc(db, "carts", uid), {
    items,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getCartLines(uid = null) {
  const localCart = getCart();
  if (localCart.length > 0) {
    return { lines: localCart, source: "local" };
  }
  if (uid) {
    const userCart = await getUserCart(uid);
    return { lines: userCart, source: "firestore" };
  }
  return { lines: [], source: "local" };
}

/**
 * Cross-checks every cart line item against Firestore to catch
 * items that sold out since they were added (real risk with
 * 1-unit stock). Call this on the Cart page before rendering,
 * and again right before Checkout submits.
 *
 * @param {function} fetchProductById - async (id) => productDoc|null
 * @param {Array|null} cartLines - optional cart lines to validate instead of localStorage
 * @param {function|null} onSave - optional persistence callback for valid cart lines
 * @returns {Promise<{valid: Array, removed: Array}>}
 */
export async function validateCartAgainstLiveStock(fetchProductById, cartLines = null, onSave = null) {
  const cart = cartLines || getCart();
  const valid = [];
  const removed = [];

  for (const item of cart) {
    const product = await fetchProductById(item.productId);
    if (product && product.status === "live") {
      valid.push(item);
    } else {
      removed.push(item);
    }
  }

  if (removed.length > 0) {
    if (cartLines === null) {
      writeList(KEY, valid);
    } else if (typeof onSave === "function") {
      await onSave(valid);
    }
  }

  return { valid, removed };
}
