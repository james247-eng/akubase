// ============================================================
// orders.js
// ------------------------------------------------------------
// Firestore reads for a signed-in user's own orders, plus the
// single write path for creating an order (createOrder).
//
// createOrder runs as a Firestore TRANSACTION: it re-checks every
// item is still 'live', creates the order doc, AND flips every
// item to 'sold' — all in one atomic operation. Either all of it
// happens, or none of it does. This replaces the old pattern of
// calling createOrder() then separately calling markProductSold()
// per item, which could fail halfway through (e.g. network drop
// after the order was created but before an item was marked sold)
// and leave a paid order pointing at an item still marked 'live'.
//
// If someone else buys an item in the seconds between checkout's
// last client-side stock check and this transaction running,
// createOrder throws an error with code 'items-unavailable' and
// a list of the offending productIds — checkout.html should catch
// this specifically and show "sold out, please review your bag"
// rather than a generic error.
// ============================================================

import {
  collection, query, where, orderBy, getDocs, doc, getDoc,
  runTransaction, serverTimestamp, updateDoc, arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../config/firebase-config.js";

const ORDERS = "orders";
const PRODUCTS = "products";

/**
 * All orders for a signed-in user, most recent first.
 * Status filtering happens client-side here since the list is
 * small per user — no need for a composite index just for this.
 */
export async function getOrdersForUser(userId) {
  const q = query(
    collection(db, ORDERS),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Single order by ID — used by Order Confirmation and any "Track Order" link. */
export async function getOrderById(orderId) {
  const snap = await getDoc(doc(db, ORDERS, orderId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getAllOrdersForAdmin() {
  const q = query(collection(db, ORDERS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Creates a new order AND marks every item in it 'sold', atomically.
 *
 * IMPORTANT CAVEAT (repeating from the old file, still true): for
 * card/transfer payments, this write happens after Paystack's
 * CLIENT-SIDE "success" callback. That callback can be spoofed by
 * anyone with browser dev tools — treat paymentStatus:"paid" orders
 * created this way as NOT cryptographically trustworthy until a
 * server-side webhook verification step is added (see the note at
 * the bottom of paystack-config.js). Pay-on-Delivery orders don't
 * have this problem since no money changes hands online either way.
 *
 * @param {Object} orderData - { userId, items: [{productId, title,
 *   brand, price, size, image}], subtotal, deliveryFee, total,
 *   deliveryMethod, deliveryAddress, paymentMethod, paymentStatus }
 * @returns {Promise<string>} the new order's Firestore document ID
 * @throws {Error} code 'items-unavailable' if any item sold out
 *   between checkout's last check and now — err.productIds lists which
 */
export async function createOrder(orderData) {
  const productRefs = orderData.items.map(item => doc(db, PRODUCTS, item.productId));

  const newOrderId = await runTransaction(db, async (transaction) => {
    // All reads must happen before any writes in a Firestore transaction.
    const productSnaps = await Promise.all(
      productRefs.map(ref => transaction.get(ref))
    );

    const unavailable = [];
    productSnaps.forEach((snap, i) => {
      if (!snap.exists() || snap.data().status !== "live") {
        unavailable.push(orderData.items[i].productId);
      }
    });

    if (unavailable.length > 0) {
      const err = new Error("Some items in this order are no longer available.");
      err.code = "items-unavailable";
      err.productIds = unavailable;
      throw err;
    }

    const orderRef = doc(collection(db, ORDERS));
    transaction.set(orderRef, {
      ...orderData,
      status: "pending",
      statusHistory: [{ status: "pending", at: new Date().toISOString() }],
      createdAt: serverTimestamp()
    });

    productRefs.forEach(ref => {
      transaction.update(ref, { status: "sold", soldAt: serverTimestamp() });
    });

    return orderRef.id;
  });

  return newOrderId;
}

/**
 * Updates an order's status (e.g. pending → confirmed → shipped →
 * delivered) and appends to its statusHistory. Used by the admin
 * order-details page — not exposed to customers.
 */
export async function updateOrderStatus(orderId, newStatus) {
  await updateDoc(doc(db, ORDERS, orderId), {
    status: newStatus,
    statusHistory: arrayUnion({ status: newStatus, at: new Date().toISOString() })
  });
}