// ============================================================
// admin-overview.js
// ------------------------------------------------------------
// Powers the Admin > Overview dashboard entirely from real
// Firestore data (products + orders) — no placeholder numbers,
// no fake chart arrays.
//
// Data sources:
//   - getAllProductsForAdmin()  (products.js)
//   - getAllOrdersForAdmin()    (orders.js)
//
// TWO DELIBERATE DEPARTURES FROM THE OLD MOCK LAYOUT — both
// because the underlying data to compute them honestly doesn't
// exist yet, and faking it would defeat the point:
//
// 1. "Conversion Rate" → "Avg. Order Value"
//    products.views is a single lifetime counter (incremented via
//    increment(1), no per-day timestamp). There's no way to know
//    how many views happened in the last 7 days vs 30 — only the
//    running total — so a time-boxed conversion rate can't be
//    computed correctly. AOV (revenue / orders) uses the same
//    order data as every other KPI here and is fully real and
//    time-boxable. If per-day view events get added later (e.g. a
//    Cloud Function logging to an `analyticsEvents` collection), a
//    genuine conversion-rate KPI can replace this without touching
//    anything else in the file.
//
// 2. "Sales by Category" → "Live Listings by Category"
//    Order line items (see checkout.html's orderData.items) only
//    store productId/title/brand/price/size/image — never
//    category. Computing true sales-by-category would mean an
//    extra product lookup per historical order line, which can
//    also break once a product is deleted. Live Listings by
//    Category uses product.category directly and is 100% real.
//    To get true sales-by-category later, add `category:
//    p.category` to the item mapping in checkout.html's
//    orderData.items — then this function is a small rewrite.
// ============================================================

import { getAllProductsForAdmin } from "../../js/products.js";
import { getAllOrdersForAdmin } from "../../js/orders.js";

const STALE_DAYS_THRESHOLD = 10;  // "listed a while" cutoff for Needs Attention
const LOW_VIEWS_THRESHOLD = 10;   // matches the same threshold used in admin/products.html
const OVERDUE_ORDER_DAYS = 2;     // pending/confirmed longer than this counts as overdue

const CATEGORY_COLORS = {
  Footwear: "#680202",
  Outerwear: "#b5750f",
  Shirts: "#2e7d4f",
  Bags: "#3355cc",
  Trousers: "#8a4baf",
  Accessories: "#c2185b",
  Other: "#a6a6a6"
};

let allProducts = [];
let allOrders = [];
let currentRange = "7d";

// Chart.js instances — tracked so we can destroy before re-drawing.
// Chart.js throws "Canvas is already in use" if you re-init a
// canvas that still has a live chart attached to it.
let revenueChartInstance = null;
let categoryChartInstance = null;
let sparklineInstances = {};

export async function initAdminOverview() {
  [allProducts, allOrders] = await Promise.all([
    getAllProductsForAdmin(),
    getAllOrdersForAdmin()
  ]);

  renderHealthStrip();
  renderCategoryBreakdown();
  renderTopPerformers();
  renderRecentOrders();
  renderNeedsAttention();
  renderRange(currentRange);

  document.querySelectorAll(".range-tab").forEach(tab => {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".range-tab").forEach(t => t.classList.remove("active"));
      this.classList.add("active");
      currentRange = this.dataset.range;
      renderRange(currentRange);
    });
  });
}

// ------------------------------------------------------------
// Date / range helpers
// ------------------------------------------------------------

function toJsDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === "function") return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
function endOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

/**
 * Returns the current window + the equal-length prior window (for
 * "vs previous period" comparisons) + the bucket granularity to use
 * for the trend chart/sparklines.
 */
function getRangeBounds(rangeKey) {
  const now = new Date();
  const todayEnd = endOfDay(now);
  const todayStart = startOfDay(now);

  if (rangeKey === "today") {
    return {
      start: todayStart, end: todayEnd,
      prevStart: addDays(todayStart, -1), prevEnd: new Date(todayStart.getTime() - 1),
      granularity: "hour", label: "vs yesterday"
    };
  }
  if (rangeKey === "30d") {
    const start = addDays(todayStart, -29);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = addDays(prevEnd, -29);
    return { start, end: todayEnd, prevStart, prevEnd, granularity: "day", label: "vs prior 30d" };
  }
  if (rangeKey === "all") {
    return { start: null, end: todayEnd, prevStart: null, prevEnd: null, granularity: "month", label: "" };
  }
  // default: 7d
  const start = addDays(todayStart, -6);
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = addDays(prevEnd, -6);
  return { start, end: todayEnd, prevStart, prevEnd, granularity: "day", label: "vs prior 7d" };
}

function withinRange(date, start, end) {
  if (!date) return false;
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

// ------------------------------------------------------------
// Order aggregation
// ------------------------------------------------------------

function ordersInRange(start, end) {
  return allOrders.filter(o => withinRange(toJsDate(o.createdAt), start, end));
}

/** Cancelled orders are excluded from every revenue/volume metric — they were never fulfilled. */
function summarize(orders) {
  const counted = orders.filter(o => o.status !== "cancelled");
  const revenue = counted.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const orderCount = counted.length;
  const itemsSold = counted.reduce((sum, o) => sum + ((o.items && o.items.length) || 0), 0);
  const aov = orderCount ? revenue / orderCount : 0;
  return { revenue, orderCount, itemsSold, aov };
}

/** Returns null when there's no prior-period baseline to compare against. */
function pctChange(curr, prev) {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

// ------------------------------------------------------------
// KPI + chart rendering for the selected range
// ------------------------------------------------------------

function renderRange(rangeKey) {
  const { start, end, prevStart, prevEnd, granularity, label } = getRangeBounds(rangeKey);

  const current = summarize(ordersInRange(start, end));
  const previous = (rangeKey === "all") ? null : summarize(ordersInRange(prevStart, prevEnd));

  updateKpi("Revenue", formatNaira(current.revenue), previous ? pctChange(current.revenue, previous.revenue) : null, label);
  updateKpi("Orders", String(current.orderCount), previous ? pctChange(current.orderCount, previous.orderCount) : null, label);
  updateKpi("Items", String(current.itemsSold), previous ? pctChange(current.itemsSold, previous.itemsSold) : null, label);
  updateKpi("Aov", formatNaira(Math.round(current.aov)), previous ? pctChange(current.aov, previous.aov) : null, label);

  renderRevenueChart(start, end, granularity);
  renderSparklines(start, end, granularity);
}

function updateKpi(key, valueText, changePct, label) {
  const valueEl = document.getElementById(`kpi${key}Value`);
  const changeEl = document.getElementById(`kpi${key}Change`);
  if (valueEl) valueEl.textContent = valueText;
  if (!changeEl) return;

  if (changePct === null || changePct === undefined) {
    changeEl.innerHTML = `<span class="period">${label || "no prior data"}</span>`;
    changeEl.className = "kpi-change";
    return;
  }
  const isUp = changePct >= 0;
  changeEl.className = "kpi-change " + (isUp ? "up" : "down");
  const arrow = isUp
    ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 15l-6-6-6 6"/></svg>`
    : `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 9l6 6 6-6"/></svg>`;
  changeEl.innerHTML = `${arrow} ${Math.abs(changePct).toFixed(1)}% <span class="period">${label}</span>`;
}

// ------------------------------------------------------------
// Bucketing shared by the revenue chart + sparklines
// ------------------------------------------------------------

function bucketKey(date, granularity) {
  if (granularity === "hour") return String(date.getHours()).padStart(2, "0") + ":00";
  if (granularity === "day") return date.toISOString().slice(0, 10);
  return date.toISOString().slice(0, 7); // month
}

function generateBucketLabels(start, end, granularity) {
  const labels = [];
  if (granularity === "hour") {
    for (let h = 0; h < 24; h++) labels.push(String(h).padStart(2, "0") + ":00");
    return labels;
  }
  if (granularity === "day") {
    let cur = new Date(start);
    while (cur <= end) {
      labels.push(cur.toISOString().slice(0, 10));
      cur = addDays(cur, 1);
    }
    return labels;
  }
  // month buckets for "All Time" — span from the earliest order to now, capped at 12 points
  const dates = allOrders.map(o => toJsDate(o.createdAt)).filter(Boolean);
  if (dates.length === 0) {
    labels.push(new Date().toISOString().slice(0, 7));
    return labels;
  }
  const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
  let cur = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const now = new Date();
  while (cur <= now && labels.length < 12) {
    labels.push(cur.toISOString().slice(0, 7));
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }
  return labels;
}

function bucketOrders(orders, labels, granularity, valueFn) {
  const map = {};
  labels.forEach(l => (map[l] = 0));
  orders.filter(o => o.status !== "cancelled").forEach(o => {
    const d = toJsDate(o.createdAt);
    if (!d) return;
    const key = bucketKey(d, granularity);
    if (key in map) map[key] += valueFn(o);
  });
  return labels.map(l => map[l]);
}

function formatBucketLabel(key, granularity) {
  if (granularity === "hour") return key;
  if (granularity === "day") return new Date(key + "T00:00:00").toLocaleDateString("en-NG", { weekday: "short" });
  return new Date(key + "-01T00:00:00").toLocaleDateString("en-NG", { month: "short" });
}

function renderRevenueChart(start, end, granularity) {
  const labels = generateBucketLabels(start, end, granularity);
  const orders = granularity === "month" ? allOrders : ordersInRange(start, end);
  const data = bucketOrders(orders, labels, granularity, o => Number(o.total || 0));
  const displayLabels = labels.map(l => formatBucketLabel(l, granularity));

  const canvas = document.getElementById("revenueChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (revenueChartInstance) revenueChartInstance.destroy();

  revenueChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: displayLabels,
      datasets: [{ data, backgroundColor: "#680202", borderRadius: 6, maxBarThickness: 32 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: "#f0f0f0" }, ticks: { callback: v => "₦" + (v / 1000) + "k", font: { size: 11 } } },
        x: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function renderSparklines(start, end, granularity) {
  const labels = generateBucketLabels(start, end, granularity);
  const orders = granularity === "month" ? allOrders : ordersInRange(start, end);

  const series = {
    Revenue: bucketOrders(orders, labels, granularity, o => Number(o.total || 0)),
    Orders: bucketOrders(orders, labels, granularity, () => 1),
    Items: bucketOrders(orders, labels, granularity, o => (o.items && o.items.length) || 0)
  };
  // AOV per bucket = that bucket's revenue / that bucket's order count (0 if no orders that bucket)
  series.Aov = series.Revenue.map((rev, i) => (series.Orders[i] ? rev / series.Orders[i] : 0));

  const colors = { Revenue: "#2e7d4f", Orders: "#680202", Items: "#b5750f", Aov: "#3355cc" };

  Object.entries(series).forEach(([key, data]) => {
    const canvas = document.getElementById(`spark${key}`);
    if (!canvas || typeof Chart === "undefined") return;
    if (sparklineInstances[key]) sparklineInstances[key].destroy();
    sparklineInstances[key] = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels.map((_, i) => i),
        datasets: [{ data, borderColor: colors[key], borderWidth: 2, pointRadius: 0, tension: 0.4, fill: true, backgroundColor: colors[key] + "1a" }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: { x: { display: false }, y: { display: false } },
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  });
}

// ------------------------------------------------------------
// Live Listings by Category (donut) — replaces "Sales by
// Category"; see file header for why.
// ------------------------------------------------------------

function renderCategoryBreakdown() {
  const live = allProducts.filter(p => p.status === "live");
  const counts = {};
  live.forEach(p => {
    const cat = p.category || "Other";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const total = live.length || 1;

  const canvas = document.getElementById("categoryChart");
  const legendEl = document.getElementById("categoryLegend");
  if (!canvas || typeof Chart === "undefined") return;

  if (entries.length === 0) {
    if (legendEl) legendEl.innerHTML = `<p style="font-size:0.8rem;color:var(--muted);">No live listings yet.</p>`;
    return;
  }

  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: entries.map(([name]) => name),
      datasets: [{
        data: entries.map(([, count]) => count),
        backgroundColor: entries.map(([name]) => CATEGORY_COLORS[name] || CATEGORY_COLORS.Other),
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: "68%", plugins: { legend: { display: false } } }
  });

  if (legendEl) {
    legendEl.innerHTML = entries.map(([name, count]) => `
      <div class="legend-row">
        <span class="legend-dot" style="background:${CATEGORY_COLORS[name] || CATEGORY_COLORS.Other}"></span>
        <span class="name">${name}</span>
        <span class="pct">${Math.round((count / total) * 100)}%</span>
      </div>
    `).join("");
  }
}

// ------------------------------------------------------------
// Top Performing Items (ranked by lifetime views)
// ------------------------------------------------------------

function renderTopPerformers() {
  const tbody = document.getElementById("topItemsBody");
  if (!tbody) return;

  const ranked = [...allProducts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);

  if (ranked.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No products listed yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = ranked.map(p => {
    const created = toJsDate(p.createdAt);
    const daysListed = created ? Math.max(0, Math.floor((Date.now() - created.getTime()) / 86400000)) : "—";
    const views = p.views || 0;
    const statusText = (p.status || "").charAt(0).toUpperCase() + (p.status || "").slice(1);
    return `
      <tr>
        <td>
          <div class="item-cell">
            <img src="${(p.images && p.images[0]) || 'https://placehold.co/80x100/eee/999?text=Item'}">
            <div><div class="item-title">${p.title || "Untitled"}</div><div class="item-brand">${p.brand || ""}</div></div>
          </div>
        </td>
        <td>${p.category || "—"}</td>
        <td class="${views < LOW_VIEWS_THRESHOLD ? "views-cell low" : "views-cell"}">${views}${views < LOW_VIEWS_THRESHOLD ? " ⚠" : ""}</td>
        <td>${daysListed}</td>
        <td><span class="status-pill status-${p.status}">${statusText || "—"}</span></td>
      </tr>
    `;
  }).join("");
}

// ------------------------------------------------------------
// Recent Orders feed — always the latest orders, independent of
// whichever range tab is selected.
// ------------------------------------------------------------

function renderRecentOrders() {
  const container = document.getElementById("recentOrdersFeed");
  if (!container) return;

  const recent = [...allOrders]
    .sort((a, b) => (toJsDate(b.createdAt) || 0) - (toJsDate(a.createdAt) || 0))
    .slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = `<p style="font-size:0.82rem;color:var(--muted);padding:12px 0;">No orders yet.</p>`;
    return;
  }

  const iconFor = (status) => {
    if (status === "delivered") return { bg: "var(--success-bg)", color: "var(--success)", path: `<path d="M20 6L9 17l-5-5"/>` };
    if (status === "cancelled") return { bg: "var(--danger-bg)", color: "var(--danger)", path: `<path d="M18 6L6 18M6 6l12 12"/>` };
    if (status === "pending") return { bg: "var(--warn-bg)", color: "var(--warn)", path: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>` };
    return { bg: "var(--maroon-tint)", color: "var(--maroon)", path: `<path d="M9 2h6l1 4H8l1-4z"/><path d="M4 6h16l-1.5 14a2 2 0 01-2 1.8H7.5A2 2 0 015.5 20L4 6z"/>` };
  };

  container.innerHTML = recent.map(o => {
    const icon = iconFor(o.status);
    const name = (o.deliveryAddress && o.deliveryAddress.name) || "Customer";
    const itemCount = (o.items && o.items.length) || 0;
    return `
      <div class="feed-item" style="cursor:pointer;" data-order="${o.id}">
        <div class="feed-icon" style="background:${icon.bg}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${icon.color}" stroke-width="2">${icon.path}</svg>
        </div>
        <div class="feed-body">
          <div class="feed-title">Order #${o.id.slice(0, 8).toUpperCase()} · ₦${Number(o.total || 0).toLocaleString()}</div>
          <div class="feed-sub">${name} · ${itemCount} item${itemCount !== 1 ? "s" : ""}</div>
        </div>
        <div class="feed-time">${timeAgo(toJsDate(o.createdAt))}</div>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-order]").forEach(el => {
    el.addEventListener("click", () => {
      window.location.href = `/admin/order-details.html?id=${el.dataset.order}`;
    });
  });
}

// ------------------------------------------------------------
// Needs Attention: stale low-view listings + overdue orders
// ------------------------------------------------------------

function renderNeedsAttention() {
  const list = document.getElementById("needsAttentionList");
  if (!list) return;

  const now = Date.now();

  const staleProducts = allProducts
    .filter(p => p.status === "live")
    .map(p => {
      const created = toJsDate(p.createdAt);
      const daysListed = created ? Math.floor((now - created.getTime()) / 86400000) : 0;
      return { ...p, daysListed };
    })
    .filter(p => p.daysListed >= STALE_DAYS_THRESHOLD && (p.views || 0) < LOW_VIEWS_THRESHOLD)
    .sort((a, b) => b.daysListed - a.daysListed)
    .slice(0, 3)
    .map(p => ({
      type: "product",
      id: p.id,
      title: p.title || "Untitled listing",
      sub: `${p.daysListed} days listed · ${p.views || 0} views only`,
      action: "Reprice"
    }));

  const overdueOrders = allOrders
    .filter(o => ["pending", "confirmed"].includes(o.status))
    .map(o => {
      const created = toJsDate(o.createdAt);
      const daysOld = created ? Math.floor((now - created.getTime()) / 86400000) : 0;
      return { ...o, daysOld };
    })
    .filter(o => o.daysOld >= OVERDUE_ORDER_DAYS)
    .sort((a, b) => b.daysOld - a.daysOld)
    .slice(0, 3)
    .map(o => ({
      type: "order",
      id: o.id,
      title: `Order #${o.id.slice(0, 8).toUpperCase()}`,
      sub: `Awaiting dispatch · ${o.daysOld} days overdue`,
      action: "Update"
    }));

  const combined = [...staleProducts, ...overdueOrders].slice(0, 5);

  if (combined.length === 0) {
    list.innerHTML = `<p style="font-size:0.82rem;color:var(--muted);padding:12px 0;">Nothing needs attention right now — nice work.</p>`;
    return;
  }

  list.innerHTML = combined.map(item => `
    <div class="alert-row">
      <div>
        <div class="alert-title">${item.title}</div>
        <div class="alert-sub">${item.sub}</div>
      </div>
      <div class="alert-action" data-type="${item.type}" data-id="${item.id}">${item.action}</div>
    </div>
  `).join("");

  list.querySelectorAll(".alert-action").forEach(btn => {
    btn.addEventListener("click", () => {
      if (btn.dataset.type === "product") {
        window.location.href = `/admin/product-form.html?id=${btn.dataset.id}`;
      } else {
        window.location.href = `/admin/order-details.html?id=${btn.dataset.id}`;
      }
    });
  });
}

// ------------------------------------------------------------
// Health strip
// ------------------------------------------------------------

function renderHealthStrip() {
  const live = allProducts.filter(p => p.status === "live").length;
  const sold = allProducts.filter(p => p.status === "sold").length;
  const now = Date.now();
  const attention = allProducts.filter(p => {
    if (p.status !== "live") return false;
    const created = toJsDate(p.createdAt);
    const daysListed = created ? Math.floor((now - created.getTime()) / 86400000) : 0;
    return daysListed >= STALE_DAYS_THRESHOLD && (p.views || 0) < LOW_VIEWS_THRESHOLD;
  }).length;

  setText("healthLive", live);
  setText("healthSold", sold);
  setText("healthAttention", attention);
  setText("totalListingsSub", `${allProducts.length} total listings`);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------

function formatNaira(amount) {
  return "₦" + Number(amount || 0).toLocaleString();
}

function timeAgo(date) {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}