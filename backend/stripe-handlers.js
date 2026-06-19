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
  };

  if (type === "checkout.session.completed") {
    const gross = centsToDollars(obj.amount_total);
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
    };
  }

  if (type === "payment_intent.succeeded") {
    const gross = centsToDollars(obj.amount_received ?? obj.amount);
    const charge = obj.charges?.data?.[0] || {};
    return {
      ...base,
      status: "paid",
      customerEmail: pickEmail(obj.receipt_email, charge.billing_details?.email),
      amountGross: gross,
      amountRefunded: 0,
      stripePaymentIntentId: obj.id || "",
      stripeChargeId: charge.id || "",
      stripeCustomerId: typeof obj.customer === "string" ? obj.customer : obj.customer?.id || "",
      paidAt: obj.created ? new Date(obj.created * 1000).toISOString() : base.receivedAt,
      receiptUrl: charge.receipt_url || "",
      paymentMethodType: charge.payment_method_details?.type || "",
      stripeFee: charge.balance_transaction ? null : null,
    };
  }

  if (type === "payment_intent.payment_failed") {
    const gross = centsToDollars(obj.amount);
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
    const gross = centsToDollars(obj.amount);
    const refunded = centsToDollars(obj.amount_refunded);
    const fullyRefunded = gross != null && refunded != null && refunded >= gross - 0.01;
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
    if (process.env.NODE_ENV === "production") {
      return { ok: false, error: "STRIPE_WEBHOOK_SECRET not configured" };
    }
    console.warn("[WARN] STRIPE_WEBHOOK_SECRET not set — skipping Stripe signature check");
    return { ok: true, devMode: true };
  }
  if (!signatureHeader || !rawBody) return { ok: false, error: "Missing signature or body" };

  const parts = {};
  for (const segment of String(signatureHeader).split(",")) {
    const eqIdx = segment.indexOf("=");
    if (eqIdx === -1) continue;
    const key = segment.slice(0, eqIdx).trim();
    const val = segment.slice(eqIdx + 1).trim();
    if (parts[key] !== undefined) return { ok: false, error: "Duplicate signature field" };
    parts[key] = val;
  }

  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return { ok: false, error: "Invalid Stripe-Signature header" };

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

  try {
    const ok = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
    return ok ? { ok: true } : { ok: false, error: "Signature mismatch" };
  } catch {
    return { ok: false, error: "Signature mismatch" };
  }
}

module.exports = {
  SUPPORTED_EVENTS,
  extractStripePayment,
  verifyStripeSignature,
};
