// ============================================================
// paystack-config.js
// ------------------------------------------------------------
// Replace with your real Paystack PUBLIC key
// (Paystack Dashboard → Settings → API Keys & Webhooks).
//
// IMPORTANT: only the PUBLIC key ever belongs in client-side
// code. The SECRET key must never appear in any HTML/JS file —
// it belongs only in your server-side webhook handler
// (see notes at the bottom of this file).
// ============================================================

export const PAYSTACK_CONFIG = {
  publicKey: "YOUR_PAYSTACK_PUBLIC_KEY", // starts with pk_test_ or pk_live_
  currency: "NGN"
};

/**
 * Opens the Paystack inline popup.
 * Requires the Paystack inline script to be loaded on the page:
 *   <script src="https://js.paystack.co/v1/inline.js"></script>
 *
 * @param {Object} opts
 * @param {string} opts.email - customer email
 * @param {number} opts.amountKobo - amount in kobo (₦1 = 100 kobo)
 * @param {string} opts.reference - unique order reference
 * @param {function} opts.onSuccess - callback(response) on payment success
 * @param {function} opts.onClose - callback() if user closes the popup
 */
export function payWithPaystack({ email, amountKobo, reference, onSuccess, onClose }) {
  if (typeof PaystackPop === "undefined") {
    throw new Error("Paystack inline script not loaded — add https://js.paystack.co/v1/inline.js to your page.");
  }

  const handler = PaystackPop.setup({
    key: PAYSTACK_CONFIG.publicKey,
    email,
    amount: amountKobo,
    currency: PAYSTACK_CONFIG.currency,
    ref: reference,
    callback: (response) => onSuccess(response),
    onClose: () => onClose && onClose()
  });

  handler.openIframe();
}

// ------------------------------------------------------------
// SERVER-SIDE NOTE (not this file — for whenever you build the
// Netlify Function webhook you discussed):
//
// 1. Paystack calls your webhook URL after payment.
// 2. The function verifies the transaction using your SECRET
//    key against Paystack's /transaction/verify/:reference
//    endpoint — never trust the client-side `onSuccess`
//    callback alone to mark an order as paid.
// 3. Only after server-side verification does the function
//    write the order to Firestore and flip the product's
//    status to "sold" (using the Firebase Admin SDK, which
//    bypasses client security rules).
// ------------------------------------------------------------
