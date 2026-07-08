import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "../../config/firebase-config.js";

const SETTINGS_DOC = doc(db, "settings", "store");

export async function initAdminSettings() {
  await loadSettings();
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettings);
}

async function loadSettings() {
  const snap = await getDoc(SETTINGS_DOC);
  const data = snap.exists() ? snap.data() : getDefaultSettings();
  document.getElementById("storeNameInput").value = data.storeName || "";
  document.getElementById("supportPhoneInput").value = data.supportPhone || "";
  document.getElementById("supportEmailInput").value = data.supportEmail || "";
  document.getElementById("storeAddressInput").value = data.storeAddress || "";
  document.getElementById("standardFeeInput").value = data.deliveryFees?.standard || "";
  document.getElementById("expressFeeInput").value = data.deliveryFees?.express || "";
  document.getElementById("pickupFeeInput").value = data.deliveryFees?.pickup || "";
  document.getElementById("cardToggle").checked = data.payments?.cardTransfer ?? true;
  document.getElementById("codToggle").checked = data.payments?.cod ?? true;
}

function getDefaultSettings() {
  return {
    storeName: "AKUBASE",
    supportPhone: "+234 810 000 0000",
    supportEmail: "hello@akubase.ng",
    storeAddress: "14 Adewale Street, Ikorodu, Lagos",
    deliveryFees: {
      standard: "2000",
      express: "3500",
      pickup: "0"
    },
    payments: {
      cardTransfer: true,
      cod: true
    }
  };
}

async function saveSettings() {
  const updates = {
    storeName: document.getElementById("storeNameInput").value.trim(),
    supportPhone: document.getElementById("supportPhoneInput").value.trim(),
    supportEmail: document.getElementById("supportEmailInput").value.trim(),
    storeAddress: document.getElementById("storeAddressInput").value.trim(),
    deliveryFees: {
      standard: document.getElementById("standardFeeInput").value.trim(),
      express: document.getElementById("expressFeeInput").value.trim(),
      pickup: document.getElementById("pickupFeeInput").value.trim()
    },
    payments: {
      cardTransfer: document.getElementById("cardToggle").checked,
      cod: document.getElementById("codToggle").checked
    },
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(SETTINGS_DOC, updates, { merge: true });
    alert("Store settings saved successfully.");
  } catch (err) {
    console.error("Failed to save settings:", err);
    alert("Unable to save settings right now. Please try again.");
  }
}
