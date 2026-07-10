/**
 * Stripe webhook extraction + signature verification.
 * Queued payloads are processed by the CRM frontend (encrypted store lives client-side).
 */

const SUPPORTED_EVENTS = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
  "charge.refund.updated",
]);

// Keep Stripe's integer cents as-is so the frontend can accumulate without IEEE-754 drift.
// Records produced here carry _centsFormat:true; older records in the store have dollar floats.
// The frontend readAmt() helper handles both.
function ensureCents(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.round(n); // integer cents
}
// Kept for the one remaining call-site in server.js that formats the refund response amount.
function centsToDollars(cents) {
  if (cents == null || cents === "") return null;
  const n = Number(cents);
  if (Number.isNaN(n)) return null;
  return Math.round(n) / 100;
}

function pickEmail(...candidates) {
  for (const c of candidates) {
    const e = String(c || "").trim().toLowerCase();
    if (e && e.includes("@")) return e;
  }
  return "";
}

function pickText(...candidates) {
  for (const c of candidates) {
    const t = String(c || "").trim();
    if (t) return t;
  }
  return "";
}

function extractStripePayment(event) {
  const obj = event?.data?.object || {};
  const type = event?.type || "unknown";
  const base = {
    id: `stripe_${event.id}`,
    provider: "stripe",
    eventType: type,
    receivedAt: new Date().toISOString(),
    stripeEventId: event.id || "",
    currency: String(obj.currency || "usd").toLowerCase(),
    rawEventType: type,
    _centsFormat: true, // amountGross/amountRefunded are integer cents; use readAmt() in frontend
  };

  if (type === "checkout.session.completed") {
    const gross = ensureCents(obj.amount_total);
    return {
      ...base,
      status: gross != null && gross > 0 ? "paid" : "paid",
      customerEmail: pickEmail(obj.customer_details?.email, obj.customer_email),
      amountGross: gross,
      amountRefunded: 0,
      stripeCheckoutSessionId: obj.id || "",
      stripePaymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id || "",
      stripeCustomerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id || "",
      paidAt: obj.created ? new Date(obj.created * 1000).toISOString() : base.receivedAt,
      receiptUrl: "",
      paymentMethodType: obj.payment_method_types?.[0] || "",
      description: pickText(
        obj.description,
        obj.metadata?.event_type_name,
        obj.metadata?.event_name,
        obj.metadata?.description,
        obj.custom_text?.submit?.message,
      ),
    };
  }

  if (type === "payment_intent.succeeded") {
    const gross = ensureCents(obj.amount_received ?? obj.amount);
    const charge = obj.charges?.data?.[0] || {};
    return {
      ...base,
      status: "paid",
      customerEmail: pickEmail(
        obj.receipt_email,
        charge.billing_details?.email,
        obj.metadata?.email,
        obj.metadata?.customer_email,
        obj.metadata?.invitee_email,
      ),
      amountGross: gross,
      amountRefunded: 0,
      stripePaymentIntentId: obj.id || "",
      stripeChargeId: charge.id || "",
      stripeCustomerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id || "",
      paidAt: obj.created ? new Date(obj.created * 1000).toISOString() : base.receivedAt,
      receiptUrl: charge.receipt_url || "",
      paymentMethodType: charge.payment_method_details?.type || "",
      stripeFee: charge.balance_transaction ? null : null,
      description: pickText(
        obj.description,
        charge.description,
        obj.metadata?.event_type_name,
        obj.metadata?.event_name,
        charge.metadata?.event_type_name,
      ),
    };
  }

  if (type === "payment_intent.payment_failed") {
    const gross = ensureCents(obj.amount);
    return {
      ...base,
      status: "failed",
      customerEmail: pickEmail(obj.receipt_email, obj.last_payment_error?.payment_method?.billing_details?.email),
      amountGross: gross,
      amountRefunded: 0,
      stripePaymentIntentId: obj.id || "",
      stripeCustomerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id || "",
      paidAt: obj.created ? new Date(obj.created * 1000).toISOString() : base.receivedAt,
      failureMessage: obj.last_payment_error?.message || "",
    };
  }

  if (type === "charge.refunded" || type === "charge.refund.updated") {
    const gross    = ensureCents(obj.amount);
    const refunded = ensureCents(obj.amount_refunded);
    const fullyRefunded = gross != null && refunded != null && refunded >= gross - 1; // 1 cent tolerance
    return {
      ...base,
      status: fullyRefunded ? "refunded" : "partial_refund",
      customerEmail: pickEmail(obj.billing_details?.email, obj.receipt_email),
      amountGross: gross,
      amountRefunded: refunded,
      stripeChargeId: obj.id || "",
      stripePaymentIntentId: typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent?.id || "",
      paidAt: obj.created ? new Date(obj.created * 1000).toISOString() : base.receivedAt,
      receiptUrl: obj.receipt_url || "",
    };
  }

  return null;
}

function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!webhookSecret) {
    // Fail closed unless explicitly opted into unsigned local testing (never with public ngrok).
    const allowUnsigned = process.env.NODE_ENV !== "production"
      && process.env.ALLOW_UNSIGNED_STRIPE_WEBHOOKS === "true";
    if (!allowUnsigned) {
      return {
        ok: false,
        error: process.env.NODE_ENV === "production"
          ? "STRIPE_WEBHOOK_SECRET not configured"
          : "STRIPE_WEBHOOK_SECRET not set (set ALLOW_UNSIGNED_STRIPE_WEBHOOKS=true to override in dev)",
      };
    }
    console.warn("[WARN] STRIPE_WEBHOOK_SECRET not set — ALLOW_UNSIGNED_STRIPE_WEBHOOKS=true; skipping Stripe signature check (dev only)");
    return { ok: true, devMode: true };
  }
  if (!signatureHeader || !rawBody) return { ok: false, error: "Missing signature or body" };

  // Parse header — collect all v1= entries into an array to support secret rotation
  // (Stripe sends multiple v1= values during the overlap window of a key rotation).
  let timestamp = null;
  const v1Signatures = [];
  for (const segment of String(signatureHeader).split(",")) {
    const eqIdx = segment.indexOf("=");
    if (eqIdx === -1) continue;
    const key = segment.slice(0, eqIdx).trim();
    const val = segment.slice(eqIdx + 1).trim();
    if (key === "t") {
      if (timestamp !== null) return { ok: false, error: "Duplicate timestamp field" };
      timestamp = val;
    } else if (key === "v1") {
      v1Signatures.push(val);
    }
  }

  if (!timestamp || !v1Signatures.length) return { ok: false, error: "Invalid Stripe-Signature header" };

  const MAX_AGE_SEC = 5 * 60;
  if (Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10)) > MAX_AGE_SEC) {
    return { ok: false, error: "Stripe webhook timestamp too old" };
  }

  const crypto = require("crypto");
  const signedPayload = `${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  // Accept if any of the provided v1 signatures matches (handles key rotation overlap)
  const matched = v1Signatures.some(sig => {
    try {
      return crypto.timingSafeEqual(expectedBuf, Buffer.from(sig, "hex"));
    } catch {
      return false;
    }
  });
  return matched ? { ok: true } : { ok: false, error: "Signature mismatch" };
}

module.exports = {
  SUPPORTED_EVENTS,
  extractStripePayment,
  verifyStripeSignature,
  centsToDollars,
};
