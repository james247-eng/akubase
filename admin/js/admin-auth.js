// ============================================================
// admin-auth.js
// ------------------------------------------------------------
// Gates every admin page. Call requireAdmin(callback) at the top
// of each admin page's script — callback only fires once we've
// confirmed the signed-in user is a real admin.
//
// SETUP REQUIRED (one-time, in Firestore console):
//   Create a collection called "admins".
//   Add one document per admin, with the DOCUMENT ID set to
//   that person's Firebase Auth uid (find it in Authentication →
//   Users after they've signed in once via /auth.html).
//   Document fields are up to you — e.g. { name, role: "owner" } —
//   the check below only cares that the doc exists.
//
// This relies on Firestore security rules also restricting
// reads/writes on admin-only collections to uids present in
// "admins" — this file alone is a UI gate, not real security.
// The rules are what actually stop a non-admin from writing to
// products/orders directly via the SDK.
// ============================================================

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db } from "../../config/firebase-config.js";

let currentAdmin = null;

export function getCurrentAdmin() {
  return currentAdmin;
}

/**
 * Runs `onReady(adminData)` only after confirming the signed-in
 * user has a matching doc in the "admins" collection.
 *
 * - Not signed in at all         → redirect to /auth.html
 * - Signed in but not an admin   → show an Access Denied screen
 * - Signed in and is an admin    → onReady(adminData) fires
 *
 * @param {function} onReady - called with { uid, email, ...adminDocData }
 */
export function requireAdmin(onReady) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      redirectToLogin();
      return;
    }

    try {
      const adminSnap = await getDoc(doc(db, "admins", user.uid));
      if (!adminSnap.exists()) {
        denyAccess(user.email);
        return;
      }

      currentAdmin = { uid: user.uid, email: user.email, ...adminSnap.data() };
      onReady(currentAdmin);
    } catch (err) {
      // Most likely cause: Firestore rules blocking the read because
      // this user genuinely isn't an admin — treat as access denied
      // rather than surfacing a raw error to a stranger who found the URL.
      console.error("Admin check failed:", err);
      denyAccess(user.email);
    }
  });
}

function redirectToLogin() {
  const returnTo = encodeURIComponent(window.location.pathname);
  window.location.href = `/auth.html?redirect=${returnTo}`;
}

function denyAccess(email) {
  document.body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
                text-align:center;padding:40px;background:#f6f6f7;">
      <div style="max-width:340px;">
        <h2 style="margin-bottom:8px;color:#181818;">Access Denied</h2>
        <p style="color:#767676;font-size:0.9rem;line-height:1.5;">
          ${email ? `The account <strong>${email}</strong> doesn't` : "This account doesn't"}
          have admin access to AKUBASE.
        </p>
      </div>
    </div>`;
}