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
import { db } from "../../config/firebase-config.js";

const ORDERS = "orders";
const PRODUCTS = "products";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

const PAYMENT_LABELS = {
  "Card / Transfer": "Card / Transfer",
  "Pay on Delivery": "Pay on Delivery",
  card: "Card / Transfer",
  pod: "Pay on Delivery"
};

let allOrders = [];
let activeStatusFilter = "all";
let activePaymentFilter = "all";
let activeSearch = "";

export async function initAdminOrders() {
  attachEventListeners();
  await loadOrders();
}

async function loadOrders() {
  allOrders = await getAllOrdersForAdmin();
  renderOrders();
}

function attachEventListeners() {
  const searchInput = document.getElementById("ordersSearchInput");
  const paymentSelect = document.getElementById("paymentMethodFilter");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      activeSearch = event.target.value.toLowerCase();
      renderOrders();
    });
  }

  if (paymentSelect) {
    paymentSelect.addEventListener("change", (event) => {
      activePaymentFilter = event.target.value;
      renderOrders();
    });
  }

  document.querySelectorAll(".status-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".status-tab").forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      activeStatusFilter = this.dataset.f;
      renderOrders();
    });
  });
}

function renderOrders() {
  const orders = getFilteredOrders();
  const tbody = document.getElementById("tbody");

  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = `\n      <tr>\n        <td colspan="7" style="padding:30px 10px; text-align:center; color:var(--muted);">\n          No orders match the current filters.\n        </td>\n      </tr>`;
  } else {
    tbody.innerHTML = orders.map((order) => {
      const customerName = order.deliveryAddress?.name || order.userId || "Customer";
      const customerPhone = order.deliveryAddress?.phone || "—";
      const itemsCount = (order.items || []).length;
      return `\n        <tr onclick="window.location.href='/admin/order-details.html?id=${order.id}'">\n          <td class="order-id">${order.id.slice(0, 8).toUpperCase()}</td>\n          <td class="customer-cell">\n            <div class="name">${customerName}</div>\n            <div class="contact">${customerPhone}</div>\n          </td>\n          <td class="items-count">${itemsCount} item${itemsCount === 1 ? "" : "s"}</td>\n          <td style="font-weight:700;">₦${Number(order.total || 0).toLocaleString()}</td>\n          <td>${getPaymentLabel(order.paymentMethod)}</td>\n          <td><span class="status-pill ${getStatusClass(order.status)}">${STATUS_LABELS[order.status] || order.status || "Unknown"}</span></td>\n          <td>${formatDate(order.createdAt)}</td>\n        </tr>`;
    }).join("");
  }

  updateSummary(orders);
  updateStatusCounts();
}

function getFilteredOrders() {
  return allOrders.filter((order) => {
    if (activeStatusFilter !== "all" && order.status !== activeStatusFilter) {
      return false;
    }

    if (activePaymentFilter !== "all" && getPaymentLabel(order.paymentMethod) !== activePaymentFilter) {
      return false;
    }

    if (!activeSearch) {
      return true;
    }

    const searchTerm = activeSearch;
    return (
      order.id.toLowerCase().includes(searchTerm) ||
      (order.deliveryAddress?.name || "").toLowerCase().includes(searchTerm) ||
      (order.deliveryAddress?.phone || "").toLowerCase().includes(searchTerm) ||
      (order.userId || "").toLowerCase().includes(searchTerm)
    );
  });
}

function updateSummary(filteredOrders) {
  setTextById("pendingValue", allOrders.filter((o) => o.status === "pending").length);
  setTextById("confirmedValue", allOrders.filter((o) => o.status === "confirmed").length);
  setTextById("shippedValue", allOrders.filter((o) => o.status === "shipped").length);
  setTextById("deliveredValue", allOrders.filter((o) => o.status === "delivered").length);

  const info = document.getElementById("ordersInfo");
  if (info) {
    info.textContent = `Showing ${filteredOrders.length} of ${allOrders.length}`;
  }

  setTextById("ordersTotalCount", `${allOrders.length} total orders`);
}

function updateStatusCounts() {
  document.querySelectorAll(".status-tab").forEach((tab) => {
    const status = tab.dataset.f;
    const countEl = tab.querySelector(".count");
    if (!countEl) return;

    const count = status === "all"
      ? allOrders.length
      : allOrders.filter((o) => o.status === status).length;

    countEl.textContent = count;
  });
}

function setTextById(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getPaymentLabel(method) {
  return PAYMENT_LABELS[method] || method || "Unknown";
}

function getStatusClass(status) {
  return `st-${(status || "").toLowerCase()}`;
}

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

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

// ============================================================
// ADMIN-FACING FUNCTIONS
// Same convention as products.js: every function below assumes
// the caller has already passed requireAdmin() (see admin-auth.js)
// — this file does not check admin status itself. Firestore
// security rules are what actually enforce that only admins can
// read every order (a signed-in customer's own security rules
// should still only allow reading orders where userId == their
// own uid — make sure that rule exists before shipping this).
// ============================================================

/**
 * Fetches every order in the store, most recent first, for the
 * admin Overview and Orders pages.
 *
 * Not paginated — fine while order volume is small (matches the
 * same tradeoff already made in products.js's
 * getAllProductsForAdmin). Add cursor pagination here once order
 * count grows past a few hundred — the query shape (orderBy +
 * startAfter) is the same pattern getLiveProducts already uses in
 * products.js, so it's a small lift when the time comes.
 */
export async function getAllOrdersForAdmin() {
  const q = query(collection(db, ORDERS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}