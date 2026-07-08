// /js/admin-order-details.js
import { getOrderById, updateOrderStatus } from "../../js/orders.js";

export async function initOrderDetails() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("id");

  if (!orderId) {
    alert("No order ID specified");
    return;
  }

  const order = await getOrderById(orderId);
  if (!order) {
    alert("Order not found");
    return;
  }

  renderOrder(order);
  setupStatusUpdate(orderId);
}

function renderOrder(order) {
  document.getElementById("orderTitle").textContent = `Order #${order.id.slice(0,8).toUpperCase()}`;
  document.getElementById("orderDate").textContent = `Placed ${formatDate(order.createdAt)}`;

  const pill = document.getElementById("statusPill");
  pill.className = `status-pill st-${order.status}`;
  pill.textContent = order.status.toUpperCase();

  // Render items
  const itemsHTML = (order.items || []).map(item => `
    <div class="order-item">
      <img src="${item.image || 'https://placehold.co/100x125/680202/ffffff?text=Item'}" alt="">
      <div class="oi-body">
        <div class="oi-title">${item.title}</div>
        <div class="oi-meta">${item.brand} · ${item.size || '—'}</div>
      </div>
      <div class="oi-price">₦${Number(item.price).toLocaleString()}</div>
    </div>
  `).join("");
  document.getElementById("orderItemsList").innerHTML = itemsHTML;

  // Summary
  document.getElementById("subtotalVal").textContent = `₦${Number(order.subtotal || 0).toLocaleString()}`;
  document.getElementById("deliveryVal").textContent = `₦${Number(order.deliveryFee || 0).toLocaleString()}`;
  document.getElementById("totalVal").textContent = `₦${Number(order.total || 0).toLocaleString()}`;

  // Customer & Delivery
  const addr = order.deliveryAddress || {};
  document.getElementById("custName").textContent = addr.name || "—";
  document.getElementById("custPhone").textContent = addr.phone || "—";
  document.getElementById("addrVal").textContent = addr.address || "—";
  document.getElementById("methodVal").textContent = order.deliveryMethod || "—";
}

function setupStatusUpdate(orderId) {
  const btn = document.getElementById("updateStatusBtn");
  btn.addEventListener("click", async () => {
    const newStatus = document.getElementById("statusSelect").value;
    btn.disabled = true;
    btn.textContent = "Updating...";

    try {
      await updateOrderStatus(orderId, newStatus);
      alert("Status updated");
      window.location.reload();
    } catch (err) {
      alert("Failed to update status");
      console.error(err);
    }

    btn.disabled = false;
    btn.textContent = "Update Status";
  });
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" });
}