// ============================================================
// recent-viewed.js
// ------------------------------------------------------------
// Tracks the last N product IDs a user viewed, most-recent-first,
// for the "Recently Viewed" rail on the Welcome/Home page.
//
// IMPORTANT: this only stores IDs. At render time, the calling
// page must fetch each product's CURRENT status from Firestore
// (or a live listener) and skip any that are no longer 'live' —
// localStorage has no idea an item sold out since the last visit.
// ============================================================

import { readList, writeList } from "./storage.js";

const KEY = "recent";
const MAX_ITEMS = 10;

export function getRecentlyViewed() {
  return readList(KEY);
}

export function trackProductView(productId) {
  let list = getRecentlyViewed();

  // Move to front if already present, otherwise unshift
  list = list.filter(id => id !== productId);
  list.unshift(productId);

  if (list.length > MAX_ITEMS) {
    list = list.slice(0, MAX_ITEMS);
  }

  writeList(KEY, list);
  return list;
}

/**
 * Resolves recently-viewed IDs into live product data, filtering
 * out anything sold or removed. Use this on the Welcome/Home page.
 *
 * @param {function} fetchProductById - async (id) => productDoc|null
 * @param {number} limit - max items to return (default 6)
 */
export async function getRecentlyViewedLive(fetchProductById, limit = 6) {
  const ids = getRecentlyViewed();
  const results = [];

  for (const id of ids) {
    if (results.length >= limit) break;
    const product = await fetchProductById(id);
    if (product && product.status === "live") {
      results.push(product);
    }
  }

  return results;
}
