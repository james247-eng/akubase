// /js/admin-products.js - FULL VERSION
import { 
  getAllProductsForAdmin, 
  deleteProduct, 
  markProductSold, 
  updateProduct 
} from "../../js/products.js";

let allProducts = [];
let filteredProducts = [];

export async function initAdminProducts() {
  allProducts = await getAllProductsForAdmin();
  filteredProducts = [...allProducts];
  renderTable();
  setupFiltersAndBulk();
}

function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = filteredProducts.map(p => `
    <tr>
      <td><input type="checkbox" class="row-check" data-id="${p.id}"></td>
      <td>
        <div class="item-cell">
          <img src="${p.images?.[0] || 'https://placehold.co/80x100/eee/999?text=Item'}">
          <div>
            <div class="item-title">${p.title}</div>
            <div class="item-brand">${p.brand}</div>
          </div>
        </div>
      </td>
      <td>${p.category || '—'}</td>
      <td>₦${Number(p.price).toLocaleString()}</td>
      <td><span class="condition-pill ${getCondClass(p.condition)}">${p.condition || '—'}</span></td>
      <td>${p.views || 0}</td>
      <td>${formatDate(p.createdAt)}</td>
      <td><span class="status-pill status-${p.status}">${p.status}</span></td>
      <td>
        <button onclick="editProduct('${p.id}')">Edit</button>
        <button onclick="deleteProductConfirm('${p.id}')">Delete</button>
      </td>
    </tr>
  `).join("");
}

function getCondClass(cond) {
  const map = { Excellent: "cond-excellent", Good: "cond-good", Fair: "cond-fair" };
  return map[cond] || "";
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

function setupFiltersAndBulk() {
  // Search
  document.getElementById("searchInput").addEventListener("input", filterTable);

  // Status tabs
  document.querySelectorAll(".status-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".status-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      filterTable();
    });
  });

  // Bulk actions
  document.getElementById("bulkMarkSold").onclick = bulkMarkSold;
  document.getElementById("bulkDelete").onclick = bulkDelete;
}

function filterTable() {
  const search = document.getElementById("searchInput").value.toLowerCase().trim();
  const activeFilter = document.querySelector(".status-tab.active").dataset.filter;

  filteredProducts = allProducts.filter(p => {
    const matchesSearch = !search || 
      `${p.brand} ${p.title}`.toLowerCase().includes(search);
    const matchesStatus = activeFilter === "all" || p.status === activeFilter;
    return matchesSearch && matchesStatus;
  });

  renderTable();
}

async function bulkMarkSold() {
  const ids = getSelectedIds();
  if (!ids.length) return;
  if (!confirm(`Mark ${ids.length} products as sold?`)) return;

  for (const id of ids) {
    await markProductSold(id);
  }
  refreshData();
}

async function bulkDelete() {
  const ids = getSelectedIds();
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} products permanently?`)) return;

  for (const id of ids) {
    await deleteProduct(id);
  }
  refreshData();
}

function getSelectedIds() {
  return Array.from(document.querySelectorAll(".row-check:checked"))
              .map(cb => cb.dataset.id);
}

function refreshData() {
  initAdminProducts(); // reload
}

window.editProduct = (id) => window.location.href = `/admin/add-product.html?id=${id}`;
window.deleteProductConfirm = async (id) => {
  if (confirm("Delete permanently?")) {
    await deleteProduct(id);
    refreshData();
  }
};