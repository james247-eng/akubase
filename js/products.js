// ============================================================
// products.js
// ------------------------------------------------------------
// All Firestore reads/writes for product data live here, so both
// the customer storefront and the admin dashboard call the same
// functions instead of each writing their own queries.
//
// Customer-facing: getLiveProducts, getProductById, listenToProduct,
//   incrementProductViews, searchProductsClientSide
// Admin-facing:    getAllProductsForAdmin, updateProduct,
//   deleteProduct, markProductSold
//
// markProductSold lives here (not in an admin-only file) on purpose:
// it's called both by checkout (via orders.js's transaction — see
// orders.js, which duplicates this exact status flip inside its own
// transaction rather than calling this function, since Firestore
// transactions need direct transaction.update() calls) and by the
// admin dashboard's bulk "Mark Sold" action outside of any order.
// Keeping one definition here avoids two places quietly drifting
// apart on what "sold" actually sets.
// ============================================================

import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, doc, getDoc, addDoc, onSnapshot, increment, updateDoc,
  deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../config/firebase-config.js";

const PRODUCTS = "products";

/**
 * Paginated listing query — cursor-based (Firestore doesn't
 * support offset pagination efficiently). Pass the last document
 * snapshot from the previous page as `afterDoc` to get the next page.
 */
export async function getLiveProducts({ category = null, pageSize = 12, afterDoc = null } = {}) {
  const constraints = [
    where("status", "==", "live"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  ];
  if (category && category !== "All") {
    constraints.splice(1, 0, where("category", "==", category));
  }
  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }

  const q = query(collection(db, PRODUCTS), ...constraints);
  const snap = await getDocs(q);
  return {
    items: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null
  };
}

/** One-time fetch by ID — used by cart validation, recently-viewed resolution. */
export async function getProductById(productId) {
  const snap = await getDoc(doc(db, PRODUCTS, productId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Real-time listener for a single product — use this on the
 * Product Details page so a mid-view sale (status flips to
 * 'sold') updates the UI without a refresh.
 * Returns an unsubscribe function — call it on page teardown.
 */
export function listenToProduct(productId, onChange) {
  return onSnapshot(doc(db, PRODUCTS, productId), (snap) => {
    onChange(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/**
 * Client-side view counter. Gameable by refreshing — acceptable
 * at current scale since there's no Cloud Function to dedupe by
 * session server-side. Revisit only if it becomes a real problem.
 */
export async function incrementProductViews(productId) {
  try {
    await updateDoc(doc(db, PRODUCTS, productId), { views: increment(1) });
  } catch (e) {
    console.warn("Failed to increment views:", e);
  }
}

/**
 * Client-side search fallback (no Firestore full-text search).
 * Fine while the live catalog is small; swap for Algolia once
 * you pass ~150-200 live items — see build proposal notes.
 */
export async function searchProductsClientSide(queryText) {
  const q = query(collection(db, PRODUCTS), where("status", "==", "live"));
  const snap = await getDocs(q);
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const needle = queryText.trim().toLowerCase();
  if (!needle) return [];
  return all.filter(p =>
    `${p.brand} ${p.title} ${p.category}`.toLowerCase().includes(needle)
  );
}

// ============================================================
// ADMIN-FACING FUNCTIONS
// Every function below assumes the caller has already passed
// requireAdmin() (see admin-auth.js) — this file does not check
// admin status itself. Firestore security rules are what actually
// enforce that only admins can write here; requireAdmin is just
// the UI gate that keeps non-admins from seeing the dashboard.
// ============================================================

/**
 * Fetches every product regardless of status (live/sold/draft),
 * for the admin Products table. Not paginated — fine while the
 * catalog is small; add cursor pagination here if it grows past
 * a few hundred items.
 */
export async function getAllProductsForAdmin() {
  const q = query(collection(db, PRODUCTS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Creates a new product listing (used by add-product.html).
 * Pass status: 'draft' or 'live' in productData depending on
 * which button the admin clicked.
 */
export async function createProduct(productData) {
  const docRef = await addDoc(collection(db, PRODUCTS), {
    ...productData,
    views: 0,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

/**
 * Partial update to an existing product — used for editing a
 * listing, or admin actions like "Move to Draft".
 */
export async function updateProduct(productId, updates) {
  await updateDoc(doc(db, PRODUCTS, productId), updates);
}

/**
 * Permanently deletes a product document. Does NOT delete its
 * images from Cloudinary — those are orphaned on purpose for now
 * (safer than accidentally deleting a shared/reused image); clean
 * up Cloudinary separately if storage cost becomes a concern.
 */
export async function deleteProduct(productId) {
  await deleteDoc(doc(db, PRODUCTS, productId));
}

/**
 * Manually marks a single product 'sold' outside of the checkout
 * flow — e.g. an admin selling something in person and marking it
 * sold on the dashboard, or a bulk "Mark Sold" action.
 *
 * NOTE: this is a direct, non-transactional write. When an item
 * sells THROUGH checkout, orders.js's createOrder() handles the
 * live-check + sold-flip as part of one atomic transaction instead
 * of calling this function — see the comment at the top of this file.
 */
export async function markProductSold(productId) {
  await updateDoc(doc(db, PRODUCTS, productId), {
    status: "sold",
    soldAt: serverTimestamp()
  });
}