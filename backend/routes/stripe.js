// Stripe webhooks, ledger/pending/ack, refunds, and admin queue clear.
const express = require("express");
const {
  STRIPE_QUEUE_FILE,
  readNamedQueue,
  writeNamedQueue,
  appendWebhookLog,
  appendRefundAudit,
  withQueueLock,
  readQueue,
} = require("../lib/queue");
const { SUPPORTED_EVENTS, extractStripePayment, verifyStripeSignature, centsToDollars } = require("../stripe-handlers");
const { attestRefundPolicy, findCalendlyCancellation } = require("../lib/refundPolicy");
const {
  requireFrontendSecret,
  requireEditSession,
  requireAdminToken,
} = require("../lib/authUsers");

const router = express.Router();

const isProd = () => process.env.NODE_ENV === "production";

// ────────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
// Receives Stripe payment events, verifies signature, queues for CRM
// ────────────────────────────────────────────────────────────────
router.post("/webhooks/stripe", async (req, res) => {
  const sigHeader = req.headers["stripe-signature"] || "";
  const verify = verifyStripeSignature(req.rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET);
  if (!verify.ok) {
    console.warn("[WARN] Invalid Stripe signature — rejected:", verify.error);
    return res.status(401).json({ error: "Invalid signature" });
  }
  if (verify.devMode && isProd()) {
    console.error("[FATAL] Stripe webhook received in production without STRIPE_WEBHOOK_SECRET");
    return res.status(503).json({ error: "Stripe webhook verification not configured" });
  }

  let event;
  try {
    event = JSON.parse(req.rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  // Reject id-less events — otherwise dedup collapses to stripe_undefined / "" and drops peers.
  if (!event?.id || typeof event.id !== "string") {
    return res.status(400).json({ error: "Stripe event missing id" });
  }

  const eventType = event?.type;
  if (!SUPPORTED_EVENTS.has(eventType)) {
    console.log(`[INFO] Ignoring unsupported Stripe event: ${eventType}`);
    return res.status(200).json({ status: "ignored", event: eventType });
  }

  const extracted = extractStripePayment(event);
  if (!extracted) {
    return res.status(200).json({ status: "skipped", reason: "could not extract payment" });
  }

  try {
    await withQueueLock(() => {
      // Webhook log + queue share the mutex so concurrent Stripe bursts cannot
      // lose updates on either file's read-modify-write.
      appendWebhookLog({
        id: extracted.id,
        provider: "stripe",
        eventType: eventType,
        receivedAt: extracted.receivedAt,
        processed: false,
        customerEmail: extracted.customerEmail || "",
        amountGross: extracted.amountGross,
        status: extracted.status,
      });
      const queue = readNamedQueue(STRIPE_QUEUE_FILE);
      if (queue.some(e => e.id === extracted.id || e.stripeEventId === extracted.stripeEventId)) {
        console.log(`[INFO] Duplicate Stripe event ${extracted.stripeEventId} — skipping`);
        return;
      }
      queue.push({ ...extracted, processed: false });
      writeNamedQueue(STRIPE_QUEUE_FILE, queue);
      console.log(`[OK] Queued Stripe ${eventType} ${extracted.stripeEventId || extracted.id} — queue length: ${queue.length}`);
    });
  } catch (err) {
    console.error("[ERROR] Failed to persist Stripe event:", err.message);
    return res.status(500).json({ error: "Failed to queue event — please retry" });
  }

  res.status(200).json({ status: "queued", id: extracted.id });
});

// ────────────────────────────────────────────────────────────────
// GET /api/stripe/ledger
// Returns all Stripe payment events in the queue (including already-processed).
// CRM uses this to hydrate local payments[] when webhooks were acked before bookings existed.
// Query: ?daysBack=90 (default 90, max 365)
// ────────────────────────────────────────────────────────────────
router.get("/stripe/ledger", requireFrontendSecret, (req, res) => {
  res.set("Cache-Control", "no-store");
  const daysBack = Math.min(Math.max(Number(req.query.daysBack) || 90, 1), 365);
  const cutoff = Date.now() - daysBack * 86400000;
  const queue = readNamedQueue(STRIPE_QUEUE_FILE);
  const events = queue.filter(e => {
    const t = Date.parse(e.paidAt || e.receivedAt || "");
    if (Number.isNaN(t) || t < cutoff) return false;
    return ["paid", "failed", "refunded", "partial_refund"].includes(e.status);
  });
  res.json({ events, total: events.length });
});

// ────────────────────────────────────────────────────────────────
// GET /api/stripe/pending
// CRM polls unprocessed Stripe payment events
// ────────────────────────────────────────────────────────────────
router.get("/stripe/pending", requireFrontendSecret, (_req, res) => {
  res.set("Cache-Control", "no-store");
  const queue = readNamedQueue(STRIPE_QUEUE_FILE);
  const pending = queue.filter(e => !e.processed);
  res.json({ events: pending, total: pending.length });
});

// ────────────────────────────────────────────────────────────────
// POST /api/stripe/acknowledge
// Body: { ids: ["stripe_evt_...", ...] }
// ────────────────────────────────────────────────────────────────
router.post("/stripe/acknowledge", requireFrontendSecret, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  if (ids.length > 500) return res.status(400).json({ error: "Too many ids — max 500 per request" });
  if (!ids.every(id => typeof id === "string" && id.length > 0 && id.length <= 120)) {
    return res.status(400).json({ error: "All ids must be non-empty strings (max 120 chars each)." });
  }

  res.set("Cache-Control", "no-store");
  const idSet = new Set(ids);
  await withQueueLock(() => {
    const queue = readNamedQueue(STRIPE_QUEUE_FILE);
    const updated = queue.map(e => idSet.has(e.id) ? { ...e, processed: true, processedAt: new Date().toISOString() } : e);
    writeNamedQueue(STRIPE_QUEUE_FILE, updated);
  });

  console.log(`[OK] Acknowledged ${ids.length} Stripe event(s)`);
  res.json({ acknowledged: ids.length });
});

async function stripeGet(pathSuffix, apiKey) {
  const resp = await fetch(`https://api.stripe.com/v1/${pathSuffix}`, {
    headers: { "Authorization": `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` },
  });
  const j = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, body: j };
}

router.post("/stripe/refund", requireFrontendSecret, requireEditSession, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(503).json({ error: "STRIPE_SECRET_KEY not configured — refunds cannot be issued from the CRM" });
  }

  const { paymentIntentId, chargeId, registrationId, reason, policy, calendlyInviteeUri } = req.body || {};
  const validId = (v, prefix) => typeof v === "string" && v.startsWith(prefix) && v.length <= 100 && /^[\w]+$/.test(v);
  const pi = validId(paymentIntentId, "pi_") ? paymentIntentId : "";
  const ch = validId(chargeId, "ch_") ? chargeId : "";
  if (!pi && !ch) {
    return res.status(400).json({ error: "A valid paymentIntentId (pi_...) or chargeId (ch_...) is required" });
  }
  if (!registrationId || typeof registrationId !== "string" || registrationId.length > 100) {
    return res.status(400).json({ error: "registrationId is required — refunds must be tied to a CRM booking" });
  }

  // Policy gate: body fields are hints — prefer the backend's stored Calendly cancel record.
  const inviteeUri = String(calendlyInviteeUri || policy?.calendlyInviteeUri || "").trim();
  const cancellationRecord = findCalendlyCancellation(readQueue(), inviteeUri);
  const policyResult = attestRefundPolicy(policy, cancellationRecord);
  if (!policyResult.eligible) {
    const wantsOverride = policy && policy.override === true;
    if (!wantsOverride) {
      return res.status(403).json({ error: policyResult.reason, code: "policy_denied" });
    }
    if (req.apiSession?.role !== "Owner") {
      return res.status(403).json({ error: "Policy override requires Owner role", code: "policy_override_owner_required" });
    }
  }

  // Look up the Stripe object and bind it to this registrationId when possible.
  let stripeObj = null;
  let stripeMetaRegId = "";
  try {
    if (pi) {
      const got = await stripeGet(`payment_intents/${encodeURIComponent(pi)}`, key);
      if (!got.ok) {
        return res.status(400).json({ error: got.body?.error?.message || "PaymentIntent not found in Stripe" });
      }
      stripeObj = got.body;
    } else {
      const got = await stripeGet(`charges/${encodeURIComponent(ch)}`, key);
      if (!got.ok) {
        return res.status(400).json({ error: got.body?.error?.message || "Charge not found in Stripe" });
      }
      stripeObj = got.body;
    }
    stripeMetaRegId = String(stripeObj?.metadata?.registrationId || "");
    const amount = Number(stripeObj?.amount) || 0;
    const amountRefunded = Number(stripeObj?.amount_refunded) || 0;
    const status = String(stripeObj?.status || "");
    if (amount <= 0) {
      return res.status(400).json({ error: "Stripe payment has zero amount — nothing to refund" });
    }
    // Charges expose amount_refunded; PaymentIntents may not — Stripe still rejects double refunds.
    if ((amountRefunded > 0 && amountRefunded >= amount) || status === "canceled") {
      return res.status(400).json({ error: "Stripe payment is already fully refunded or canceled" });
    }
    if (stripeMetaRegId && stripeMetaRegId !== registrationId) {
      return res.status(403).json({
        error: `Stripe payment is linked to a different registration (${stripeMetaRegId})`,
        code: "registration_mismatch",
      });
    }
    // Missing metadata is normal for payments matched only in the CRM — registrationId
    // on the request + Edit session + policy check still bind the refund. Conflicting
    // metadata is the hard deny above.
  } catch (err) {
    console.error("[ERROR] Stripe lookup before refund failed:", err.message);
    return res.status(502).json({ error: "Could not verify payment with Stripe before refunding. Try again." });
  }

  const params = new URLSearchParams();
  if (pi) params.set("payment_intent", pi);
  else params.set("charge", ch);
  const allowedReasons = new Set(["duplicate", "fraudulent", "requested_by_customer"]);
  params.set("reason", allowedReasons.has(reason) ? reason : "requested_by_customer");
  params.set("metadata[registrationId]", registrationId);
  if (req.apiSession?.userId) params.set("metadata[refundedByUserId]", String(req.apiSession.userId).slice(0, 80));

  try {
    const resp = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = j?.error?.message || `Stripe refund failed (HTTP ${resp.status})`;
      console.error(`[ERROR] Stripe refund failed: ${msg}`);
      await withQueueLock(() => {
        appendRefundAudit({
          at: new Date().toISOString(),
          ok: false,
          registrationId,
          paymentIntentId: pi,
          chargeId: ch,
          userId: req.apiSession?.userId || "",
          role: req.apiSession?.role || "",
          error: msg,
        });
      });
      return res.status(resp.status >= 500 ? 502 : 400).json({ error: msg, code: j?.error?.code || "" });
    }
    console.log(`[OK] Stripe refund created: ${j.id} — ${j.amount} ${String(j.currency || "").toUpperCase()} (reg ${registrationId})`);
    await withQueueLock(() => {
      appendRefundAudit({
        at: new Date().toISOString(),
        ok: true,
        registrationId,
        paymentIntentId: pi || (typeof j.payment_intent === "string" ? j.payment_intent : ""),
        chargeId: ch || (typeof j.charge === "string" ? j.charge : ""),
        refundId: j.id || "",
        amount: centsToDollars(j.amount),
        userId: req.apiSession?.userId || "",
        role: req.apiSession?.role || "",
        policyReason: policyResult.reason,
        policyOverride: !!(policy && policy.override),
        hadStripeMeta: !!stripeMetaRegId,
      });
    });
    res.json({
      refundId: j.id || "",
      amount: centsToDollars(j.amount),
      currency: String(j.currency || "usd").toLowerCase(),
      status: j.status || "",
      paymentIntentId: typeof j.payment_intent === "string" ? j.payment_intent : j.payment_intent?.id || "",
      chargeId: typeof j.charge === "string" ? j.charge : j.charge?.id || "",
      createdAt: j.created ? new Date(j.created * 1000).toISOString() : new Date().toISOString(),
    });
  } catch (err) {
    console.error("[ERROR] Stripe refund request failed:", err.message);
    res.status(502).json({ error: "Could not reach Stripe — the refund was NOT issued. Try again." });
  }
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/stripe/events  (clear Stripe queue — dev/admin only)
// ────────────────────────────────────────────────────────────────
router.delete("/stripe/events", requireAdminToken, (_req, res) => {
  writeNamedQueue(STRIPE_QUEUE_FILE, []);
  res.json({ status: "cleared" });
});

module.exports = router;
