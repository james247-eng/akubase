// ============================================================
// bottom-nav.js
// ------------------------------------------------------------
// Reusable bottom navigation component. Add it to any page by:
//
//   1. Drop an empty container where the nav should render:
//        <div id="bottomNavRoot"></div>
//
//   2. Import and call it once, telling it which tab is active:
//        import { renderBottomNav } from "./js/bottom-nav.js";
//        renderBottomNav("wishlist"); // 'home' | 'search' | 'wishlist' | 'cart' | 'profile'
//
// That's it — markup, styles, badge wiring, and navigation all
// come from this one file. Removing the nav from a page (e.g.
// Auth, Welcome, Checkout if you revisit that decision) is just
// deleting the container div and the one import/call — nothing
// else on the page depends on it or breaks without it.
// ============================================================

import { initBadges } from "./badges.js";

const TABS = [
  {
    id: "home",
    href: "/products.html",
    icon: `<path d="M3 10l9-7 9 7v9a2 2 0 01-2 2H5a2 2 0 01-2-2v-9z"/>`
  },
  {
    id: "search",
    href: "/search.html",
    icon: `<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>`
  },
  {
    id: "wishlist",
    href: "/wishlist.html",
    icon: `<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>`,
    badge: "wishlist"
  },
  {
    id: "cart",
    href: "/cart.html",
    icon: `<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>`,
    badge: "cart"
  },
  {
    id: "profile",
    href: "/profile.html",
    icon: `<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>`
  }
];

const STYLE_ID = "akubase-bottom-nav-styles";

const STYLES = `
.bottom-nav{
  position:fixed; bottom:0; left:50%; transform:translateX(-50%);
  width:100%; max-width:520px; background:#fff; border-top:1px solid #ececec;
  display:flex; justify-content:space-around; align-items:center;
  padding:10px 8px calc(10px + env(safe-area-inset-bottom)); z-index:30;
}
.bottom-nav .nav-item{
  background:none; border:none; cursor:pointer; text-decoration:none;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:6px 14px; color:#767676; position:relative;
}
.bottom-nav .nav-item.active{ color:#680202; }
.bottom-nav .nav-item svg{ width:22px; height:22px; }
.bottom-nav .nav-badge{
  position:absolute; top:2px; right:6px; width:15px; height:15px; border-radius:50%;
  background:#680202; color:#fff; font-size:0.55rem; font-weight:700;
  display:flex; align-items:center; justify-content:center;
}
.nav-badge--hidden{ display:none !important; }
@media (min-width:768px){
  .bottom-nav{ display:none; }
}
`;

function injectStylesOnce() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

/**
 * Renders the bottom nav into #bottomNavRoot (or appends to
 * <body> if that container doesn't exist on the page).
 *
 * @param {string} activeTabId - 'home' | 'search' | 'wishlist' | 'cart' | 'profile'
 */
export function renderBottomNav(activeTabId) {
  injectStylesOnce();

  const nav = document.createElement("div");
  nav.className = "bottom-nav";
  nav.innerHTML = TABS.map(tab => `
    <a class="nav-item ${tab.id === activeTabId ? "active" : ""}" href="${tab.href}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${tab.icon}</svg>
      ${tab.badge ? `<span class="nav-badge" data-badge="${tab.badge}"></span>` : ""}
    </a>
  `).join("");

  const root = document.getElementById("bottomNavRoot");
  if (root) {
    root.replaceWith(nav);
  } else {
    document.body.appendChild(nav);
  }

  // Wire cart/wishlist counts — safe to call repeatedly across pages,
  // it just re-reads localStorage and re-attaches the update listener.
  initBadges();
}
