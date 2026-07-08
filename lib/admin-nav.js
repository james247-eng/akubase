// /lib/admin-nav.js
export function renderAdminNav(activePage) {
  const navHTML = `
    <div class="sidebar">
      <div class="sidebar-logo">AKUBASE Admin</div>

      <div class="nav-group-label">Main</div>
      <a href="/admin/index.html" class="nav-link ${activePage === 'overview' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
        Overview
      </a>
      <a href="/admin/products.html" class="nav-link ${activePage === 'products' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        Products
      </a>
      <a href="/admin/orders.html" class="nav-link ${activePage === 'orders' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2h6l1 4H8l1-4z"/><path d="M4 6h16l-1.5 14a2 2 0 01-2 1.8H7.5A2 2 0 015.5 20L4 6z"/></svg>
        Orders
      </a>
      <a href="/admin/customers.html" class="nav-link ${activePage === 'customers' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Customers
      </a>

      <div class="nav-group-label">Insights</div>
      <a href="/admin/analytics.html" class="nav-link ${activePage === 'analytics' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-6 3 3 5-8"/></svg>
        Analytics
      </a>

      <div class="nav-group-label">System</div>
      <a href="/admin/settings.html" class="nav-link ${activePage === 'settings' ? 'active' : ''}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.16.31.44.63 1 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Settings
      </a>

      <div class="sidebar-foot">
        <div class="avatar">JO</div>
        <div>
          <div class="name">James O.</div>
          <div class="role">Admin</div>
        </div>
      </div>
    </div>
  `;

  const container = document.getElementById("adminSidebarRoot");
  if (container) {
    container.innerHTML = navHTML;
  } else {
    console.warn("adminSidebarRoot not found on this page");
  }
}