// ============================================================
// storage.js
// ------------------------------------------------------------
// Tiny wrapper around localStorage so cart.js / wishlist.js /
// recent-viewed.js don't each reimplement JSON parsing and
// error handling. Also fires a custom event on every write so
// any page can listen for badge-count updates without polling.
// ============================================================

const PREFIX = "akubase_";

export function readList(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn(`Failed to read localStorage key "${key}":`, e);
    return [];
  }
}

export function writeList(key, list) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(list));
    // Notify any listeners on this page (e.g. bottom nav badge)
    window.dispatchEvent(new CustomEvent("akubase:storage-update", {
      detail: { key, list }
    }));
  } catch (e) {
    console.warn(`Failed to write localStorage key "${key}":`, e);
  }
}

export function clearList(key) {
  localStorage.removeItem(PREFIX + key);
  window.dispatchEvent(new CustomEvent("akubase:storage-update", {
    detail: { key, list: [] }
  }));
}
