// ============================================================
// wishlist.js
// ------------------------------------------------------------
// Same guest-first pattern as cart.js. Wishlist just stores an
// array of productIds — no size/qty needed, it's a save-for-later
// list, not a purchase intent.
// ============================================================

import { readList, writeList } from "./storage.js";

const KEY = "wishlist";

export function getWishlist() {
  return readList(KEY);
}

export function getWishlistCount() {
  return getWishlist().length;
}

export function isWishlisted(productId) {
  return getWishlist().includes(productId);
}

export function toggleWishlist(productId) {
  const list = getWishlist();
  const index = list.indexOf(productId);

  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(productId);
  }

  writeList(KEY, list);
  return list;
}

export function removeFromWishlist(productId) {
  const list = getWishlist().filter(id => id !== productId);
  writeList(KEY, list);
  return list;
}

export function clearWishlist() {
  writeList(KEY, []);
}
