import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../../config/firebase-config.js";
import { getAllOrdersForAdmin } from "../../js/orders.js";

let allCustomers = [];
let allOrders = [];
let currentSearch = "";
let currentFilter = "all";

export async function initAdminCustomers() {
  [allCustomers, allOrders] = await Promise.all([fetchCustomers(), getAllOrdersForAdmin()]);
  renderKpis();
  renderTable();
  attachEventListeners();
}

async function fetchCustomers() {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function attachEventListeners() {
  const searchInput = document.getElementById("customersSearchInput");
  const filterSelect = document.getElementById("customerFilter");

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      currentSearch = event.target.value.toLowerCase();
      renderTable();
    });
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", (event) => {
      currentFilter = event.target.value;
      renderTable();
    });
  }
}

function renderKpis() {
  const totalCustomers = allCustomers.length;
  const summary = allCustomers.map((customer) => getCustomerSummary(customer.id));
  const repeatBuyers = summary.filter((item) => item.orderCount > 1).length;
  const avgSpend = totalCustomers
    ? Math.round(summary.reduce((sum, item) => sum + item.totalSpent, 0) / totalCustomers)
    : 0;
  const newThisMonth = allCustomers.filter((customer) => withinLastDays(customer.createdAt, 30)).length;

  setText("totalCustomersValue", totalCustomers);
  setText("repeatBuyersValue", repeatBuyers);
  setText("avgSpendValue", `₦${avgSpend.toLocaleString()}`);
  setText("newThisMonthValue", newThisMonth);
  setText("customerSubText", `${totalCustomers} total customers`);
}

function renderTable() {
  const tbody = document.getElementById("tbody");
  const subText = document.getElementById("customerSubText");
  if (!tbody) return;

  const customers = getFilteredCustomers();
  if (subText) {
    subText.textContent = `${customers.length} customer${customers.length === 1 ? "" : "s"} shown`;
  }

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="padding:30px 10px; text-align:center; color:var(--muted);">
          No customers match the current filters.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = customers.map((customer) => {
    const summary = getCustomerSummary(customer.id);
    return `
      <tr>
        <td>
          <div class="cust-cell">
            <div class="cust-avatar">${getInitials(customer.name || customer.email || "CU")}</div>
            <div>
              <div class="cust-name">${customer.name || customer.email || "Customer"}</div>
              <div class="cust-email">${customer.email || "—"}</div>
            </div>
          </div>
        </td>
        <td>${summary.orderCount}</td>
        <td style="font-weight:700;">₦${summary.totalSpent.toLocaleString()}</td>
        <td>${formatDate(summary.lastOrder)}</td>
        <td>${formatDate(customer.createdAt)}</td>
      </tr>`;
  }).join("");
}

function getFilteredCustomers() {
  return allCustomers.filter((customer) => {
    const name = (customer.name || customer.email || "").toLowerCase();
    const email = (customer.email || "").toLowerCase();
    const matchesSearch = !currentSearch || name.includes(currentSearch) || email.includes(currentSearch);
    if (!matchesSearch) return false;

    const summary = getCustomerSummary(customer.id);
    if (currentFilter === "repeat") {
      return summary.orderCount > 1;
    }
    if (currentFilter === "new") {
      return withinLastDays(customer.createdAt, 30);
    }
    return true;
  });
}

function getCustomerSummary(userId) {
  const orders = allOrders.filter((order) => order.userId === userId && order.status !== "cancelled");
  const totalSpent = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lastOrderDate = orders.reduce((latest, order) => {
    const date = toJsDate(order.createdAt);
    if (!date) return latest;
    return latest && latest > date ? latest : date;
  }, null);
  return {
    orderCount: orders.length,
    totalSpent,
    lastOrder: lastOrderDate
  };
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function withinLastDays(timestamp, days) {
  const date = toJsDate(timestamp);
  if (!date) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function toJsDate(timestamp) {
  if (!timestamp) return null;
  return typeof timestamp.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
}

function formatDate(timestamp) {
  const date = toJsDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}
