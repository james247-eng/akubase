// ============================================================
// badges.js
// ------------------------------------------------------------
// Keeps the bottom-nav Cart/Wishlist badge counts in sync with
// localStorage, live — no page refresh needed. Import and call
// initBadges() once on every page that has the bottom nav.
//
// Expects the bottom nav markup to include, on the relevant
// nav-item buttons:
//   <span class="nav-badge" data-badge="cart"></span>
//   <span class="nav-badge" data-badge="wishlist"></span>
// (hidden via CSS when count is 0 — see the class toggle below)
// ============================================================

import { getCartCount } from "./cart.js";
import { getWishlistCount } from "./wishlist.js";

function updateBadge(type, count) {
  document.querySelectorAll(`[data-badge="${type}"]`).forEach(el => {
    el.textContent = count > 9 ? "9+" : String(count);
    el.classList.toggle("nav-badge--hidden", count === 0);
  });
}

export function refreshBadges() {
  updateBadge("cart", getCartCount());
  updateBadge("wishlist", getWishlistCount());
}

export function initBadges() {
  refreshBadges();
  // storage.js dispatches this event on every cart/wishlist write
  window.addEventListener("akubase:storage-update", (e) => {
    if (e.detail.key === "cart") updateBadge("cart", e.detail.list.length);
    if (e.detail.key === "wishlist") updateBadge("wishlist", e.detail.list.length);
  });
}
