// /js/admin-product-form.js - COMPLETE VERSION
import { createProduct, updateProduct, getProductById } from "../../js/products.js";
import { uploadMultipleImages } from "../../config/cloudinary-config.js";

let currentProductId = null;
let uploadedImages = [];

export async function initProductForm() {
  const params = new URLSearchParams(window.location.search);
  currentProductId = params.get("id");

  if (currentProductId) {
    const product = await getProductById(currentProductId);
    if (product) await loadExistingProduct(product);
  }

  setupImageUpload();
  setupDiscountHint();
  setupConditionGrade();
  setupLiveToggle();
  setupCompletenessMeter();
  setupForm();
  updateCompleteness();
}

async function loadExistingProduct(product) {
  // Fill all form fields
  document.getElementById("brandInput").value = product.brand || "";
  document.getElementById("titleInput").value = product.title || "";
  document.getElementById("categoryInput").value = product.category || "";
  document.getElementById("descriptionInput").value = product.description || "";
  document.getElementById("sizeInput").value = product.size || "";
  document.getElementById("priceInput").value = product.price || "";
  document.getElementById("origInput").value = product.originalPrice || "";
  document.getElementById("conditionNotesInput").value = product.conditionNotes || "";

  // Condition grade
  const grade = product.condition || "Excellent";
  document.querySelectorAll(".grade-opt").forEach(opt => {
    opt.classList.toggle("selected", opt.dataset.grade === grade);
  });

  // Live/draft status
  const liveToggle = document.getElementById("liveToggle");
  if (liveToggle) {
    liveToggle.checked = product.status === "live";
    liveToggle.dispatchEvent(new Event("change"));
  }

  uploadedImages = product.images ? product.images.map(url => ({ url })) : [];
  renderImageGrid();
  updateDiscountHint();
}

function setupImageUpload() {
  const zone = document.getElementById("uploadZone");
  const input = document.getElementById("fileInput");

  zone.onclick = () => input.click();
  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("dragover"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("dragover");
    uploadFiles(e.dataTransfer.files);
  });
  input.onchange = (e) => uploadFiles(e.target.files);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return;

    try {
      const results = await uploadMultipleImages(files);
      uploadedImages.push(...results);
      renderImageGrid();
      updateCompleteness();
    } catch (err) {
      alert("Image upload failed");
    }
  }
}

function renderImageGrid() {
  const grid = document.getElementById("imageGrid");
  grid.innerHTML = uploadedImages.map((img, i) => `
    <div class="image-slot">
      <img src="${img.url}">
      ${i === 0 ? '<div class="cover-tag">Cover</div>' : ''}
      <button class="remove-img" data-i="${i}">×</button>
    </div>
  `).join("");

  grid.querySelectorAll(".remove-img").forEach(btn => {
    btn.onclick = () => {
      uploadedImages.splice(Number(btn.dataset.i), 1);
      renderImageGrid();
      updateCompleteness();
    };
  });
}

// ===== discount hint =====
function setupDiscountHint() {
  document.getElementById("priceInput").addEventListener("input", updateDiscountHint);
  document.getElementById("origInput").addEventListener("input", updateDiscountHint);
}

function updateDiscountHint() {
  const price = parseFloat(document.getElementById("priceInput").value);
  const orig = parseFloat(document.getElementById("origInput").value);
  const discountHint = document.getElementById("discountHint");
  if (price && orig && orig > price) {
    const pct = Math.round((1 - price / orig) * 100);
    discountHint.textContent = pct + "% off retail — will show as a strikethrough on the product page";
    discountHint.style.display = "block";
  } else {
    discountHint.style.display = "none";
  }
  updateCompleteness();
}

// ===== condition grade select =====
function setupConditionGrade() {
  document.querySelectorAll(".grade-opt").forEach(opt => {
    opt.addEventListener("click", function () {
      document.querySelectorAll(".grade-opt").forEach(o => o.classList.remove("selected"));
      this.classList.add("selected");
    });
  });
}

// ===== live toggle =====
function setupLiveToggle() {
  const liveToggle = document.getElementById("liveToggle");
  const statusIndicator = document.getElementById("statusIndicator");
  const statusSub = document.getElementById("statusSub");

  liveToggle.addEventListener("change", function () {
    if (this.checked) {
      statusIndicator.textContent = "Live";
      statusIndicator.style.background = "var(--success-bg)";
      statusIndicator.style.color = "var(--success)";
      statusSub.textContent = "Live — visible in the shop";
    } else {
      statusIndicator.textContent = "Draft";
      statusIndicator.style.background = "";
      statusIndicator.style.color = "";
      statusSub.textContent = "Draft — hidden from shop";
    }
  });
}

// ===== completeness meter =====
function setupCompletenessMeter() {
  document.querySelectorAll('.field input[type="text"], .field input[type="number"], .field textarea, .field select')
    .forEach(el => el.addEventListener("input", updateCompleteness));
}

function updateCompleteness() {
  let score = 0;
  const total = 5;
  if (uploadedImages.length >= 2) score++;
  if (document.getElementById("brandInput").value) score++;
  if (document.getElementById("titleInput").value) score++;
  if (document.getElementById("priceInput").value) score++;
  if (document.getElementById("conditionNotesInput").value) score++;

  const pct = Math.round((score / total) * 100);
  const fill = document.getElementById("completenessFill");
  const label = document.getElementById("completenessPct");
  if (fill) fill.style.width = pct + "%";
  if (label) label.textContent = pct + "%";
}

// ===== save actions =====
function setupForm() {
  document.getElementById("publishBtn").onclick = () => save("live");
  document.getElementById("draftBtn").onclick = () => save("draft");
}

async function save(status) {
  const data = collectFormData();
  data.images = uploadedImages.map(i => i.url);
  data.status = status;

  const liveToggle = document.getElementById("liveToggle");
  if (liveToggle) {
    liveToggle.checked = status === "live";
    liveToggle.dispatchEvent(new Event("change"));
  }

  try {
    if (currentProductId) {
      await updateProduct(currentProductId, data);
    } else {
      await createProduct(data);
    }
    alert("Saved successfully!");
    window.location.href = "/admin/products.html";
  } catch (e) {
    alert("Save failed: " + e.message);
  }
}

function collectFormData() {
  const selectedGrade = document.querySelector(".grade-opt.selected");
  return {
    brand: document.getElementById("brandInput").value,
    title: document.getElementById("titleInput").value,
    price: Number(document.getElementById("priceInput").value),
    originalPrice: Number(document.getElementById("origInput").value) || null,
    category: document.getElementById("categoryInput").value,
    condition: selectedGrade ? selectedGrade.dataset.grade : "Excellent",
    description: document.getElementById("descriptionInput").value,
    size: document.getElementById("sizeInput").value,
    conditionNotes: document.getElementById("conditionNotesInput").value,
  };
}