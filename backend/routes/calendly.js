// Calendly webhooks + CRM poll/ack/pull/cancel/description + admin queue views.
const express = require("express");
const {
  readQueue,
  writeQueue,
  withQueueLock,
} = require("../lib/queue");
const {
  CALENDLY_API_BASE,
  CALENDLY_API_TIMEOUT_MS,
  verifySignature,
  extractEvent,
  fetchEventTypeDescription,
  fetchEventTypeDescriptionByName,
  fetchEventTypePriceByName,
  fetchInviteePayment,
  enqueueCalendlyWebhookEvent,
  enrichQueuedCalendlyEvent,
  isSyntheticCalendlyUri,
  pullRecentCalendlyBookings,
} = require("../lib/calendly");
const {
  requireFrontendSecret,
  requireEditSession,
  requireAdminToken,
} = require("../lib/authUsers");

const router = express.Router();

// ────────────────────────────────────────────────────────────────
// POST /api/webhooks/calendly
// Receives all Calendly webhook events, verifies signature, queues
// immediately (idempotent), then enriches description/payment async.
// ────────────────────────────────────────────────────────────────
router.post("/webhooks/calendly", async (req, res) => {
  // Signature check
  if (!verifySignature(req)) {
    console.warn("[WARN] Invalid Calendly signature — rejected");
    return res.status(401).json({ error: "Invalid signature" });
  }

  const { event, payload } = req.body;
  if (!event || !payload) {
    return res.status(400).json({ error: "Missing event or payload" });
  }

  const supported = [
    "invitee.created",
    "invitee.canceled",
    "invitee_no_show.created",
    "invitee_no_show.deleted",
    "routing_form_submission",
  ];

  if (!supported.includes(event)) {
    console.log(`[INFO] Ignoring unsupported event: ${event}`);
    return res.status(200).json({ status: "ignored", event });
  }

  const extracted = extractEvent(event, payload);
  if (!extracted.email && event !== "routing_form_submission") {
    console.warn("[WARN] Event has no email — skipping");
    return res.status(200).json({ status: "skipped", reason: "no email" });
  }
  if (isSyntheticCalendlyUri(extracted.calendlyInviteeUri) || isSyntheticCalendlyUri(extracted.calendlyEventUri)) {
    console.warn("[WARN] Ignoring synthetic Calendly TEST URI (signature-test payload)");
    return res.status(200).json({ status: "skipped", reason: "synthetic_test_uri" });
  }

  // Queue first (before any Calendly API enrichment) so we can 200 quickly.
  // Dedup by invitee URI + event type prevents timeout-then-retry duplicates.
  let result;
  try {
    result = await withQueueLock(() => enqueueCalendlyWebhookEvent(extracted));
  } catch (err) {
    console.error("[ERROR] Failed to persist webhook event — returning 500 so Calendly retries:", err.message);
    return res.status(500).json({ error: "Failed to queue event — please retry" });
  }

  res.status(200).json({ status: result.status, id: result.id });

  // Enrich async after the response — description + payment (~3 API calls).
  // CRM also backfills these on sync if enrichment loses the race.
  if (result.queued) {
    const eventTypeUri = payload.scheduled_event?.event_type || extracted.calendlyEventTypeUri || "";
    setImmediate(() => {
      enrichQueuedCalendlyEvent(result.id, {
        eventTypeUri,
        inviteeUri: extracted.calendlyInviteeUri || "",
        calendlyEventTypeUri: extracted.calendlyEventTypeUri || "",
      }).catch(err => {
        console.warn(`[WARN] Async Calendly enrichment failed for ${result.id}:`, err.message);
      });
    });
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/calendly/pull-recent
// Fetches recent bookings from Calendly API and queues any missing invitees
// Body: { daysBack?: number }  (default 30, max 90)
// ────────────────────────────────────────────────────────────────
router.post("/calendly/pull-recent", requireFrontendSecret, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const daysBack = Number(req.body?.daysBack) || 30;
  try {
    const result = await pullRecentCalendlyBookings(daysBack);
    if (result.error) return res.status(result.added ? 200 : 503).json(result);
    res.json(result);
  } catch (err) {
    console.error("[ERROR] Calendly pull-recent failed:", err.message);
    res.status(500).json({ error: err.message || "Calendly API pull failed" });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/pending
// React CRM polls this to retrieve unprocessed events
// ────────────────────────────────────────────────────────────────
router.get("/calendly/pending", requireFrontendSecret, (_req, res) => {
  res.set("Cache-Control", "no-store");
  const queue   = readQueue();
  const pending = queue.filter(e => !e.processed);
  res.json({ events: pending, total: pending.length });
});

// ────────────────────────────────────────────────────────────────
// POST /api/calendly/acknowledge
// React CRM calls this after processing events so they're not re-sent
// Body: { ids: ["evt_...", "evt_..."] }
// ────────────────────────────────────────────────────────────────
router.post("/calendly/acknowledge", requireFrontendSecret, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  if (ids.length > 500) return res.status(400).json({ error: "Too many ids — max 500 per request" });
  if (!ids.every(id => typeof id === "string" && id.length > 0 && id.length <= 100)) {
    return res.status(400).json({ error: "All ids must be non-empty strings (max 100 chars each)." });
  }

  res.set("Cache-Control", "no-store");
  const idSet = new Set(ids);
  await withQueueLock(() => {
    const queue   = readQueue();
    const updated = queue.map(e => idSet.has(e.id) ? { ...e, processed: true, processedAt: new Date().toISOString() } : e);
    writeQueue(updated);
  });

  console.log(`[OK] Acknowledged ${ids.length} event(s)`);
  res.json({ acknowledged: ids.length });
});

// ────────────────────────────────────────────────────────────────
// POST /api/calendly/payment-lookup
// Backfill session prices for registrations (max 25 URIs / 25 event names)
// Body: {
//   uris: ["https://api.calendly.com/scheduled_events/.../invitees/..."],
//   eventTypeByUri: { [inviteeUri]: "https://api.calendly.com/event_types/..." },
//   eventNames: ["Align Yoga - Pleasant Hill, CA"]
// }
// ────────────────────────────────────────────────────────────────
router.post("/calendly/payment-lookup", requireFrontendSecret, async (req, res) => {
  const { uris = [], eventTypeByUri = {}, eventNames = [] } = req.body;
  if (!Array.isArray(uris)) return res.status(400).json({ error: "uris must be an array" });
  if (!Array.isArray(eventNames)) return res.status(400).json({ error: "eventNames must be an array" });
  if (uris.length > 25) return res.status(400).json({ error: "Too many uris — max 25 per request" });
  if (eventNames.length > 25) return res.status(400).json({ error: "Too many eventNames — max 25 per request" });
  if (!uris.every(u => typeof u === "string" && u.startsWith(CALENDLY_API_BASE) && u.length <= 300)) {
    return res.status(400).json({ error: "All uris must be valid Calendly invitee URIs" });
  }
  if (eventTypeByUri != null && typeof eventTypeByUri !== "object") {
    return res.status(400).json({ error: "eventTypeByUri must be an object" });
  }

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return res.status(503).json({ error: "CALENDLY_API_TOKEN not configured" });

  res.set("Cache-Control", "no-store");
  const payments = {};
  for (const uri of uris) {
    const hint = typeof eventTypeByUri?.[uri] === "string" ? eventTypeByUri[uri] : "";
    const pay = await fetchInviteePayment(uri, hint);
    if (pay) payments[uri] = pay;
  }
  const eventPrices = {};
  for (const rawName of eventNames) {
    const name = typeof rawName === "string" ? rawName.trim().slice(0, 200) : "";
    if (!name || eventPrices[name] != null) continue;
    const price = await fetchEventTypePriceByName(name, token);
    if (price != null) {
      eventPrices[name] = {
        paymentAmount: price,
        paidAmount: null,
        paymentSuccessful: false,
        priceSource: "event_type",
      };
    }
  }
  res.json({ payments, eventPrices });
});

// POST /api/calendly/cancel-booking
// Cancels an ENTIRE scheduled event (all invitees). Gate like refunds: destructive + customer-facing.
// Body: { eventUri: "https://api.calendly.com/scheduled_events/<uuid>", reason?: string }
router.post("/calendly/cancel-booking", requireFrontendSecret, requireEditSession, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return res.status(503).json({ error: "CALENDLY_API_TOKEN not configured" });

  const { eventUri, reason } = req.body || {};
  // SSRF guard — same rule as /api/calendly/event-description
  if (typeof eventUri !== "string" || !eventUri.startsWith(CALENDLY_API_BASE) || eventUri.length > 300) {
    return res.status(400).json({ error: "eventUri must be a valid Calendly scheduled_events URI" });
  }
  const uuid = eventUri.split("/").pop();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(uuid)) {
    return res.status(400).json({ error: "Could not extract event UUID" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
  try {
    const resp = await fetch(`${CALENDLY_API_BASE}scheduled_events/${uuid}/cancellation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: String(reason || "Canceled from CRM").slice(0, 500) }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // 403 = event not owned by this token's user; 404 = already canceled or bad UUID
      return res.status(resp.status >= 500 ? 502 : resp.status)
        .json({ error: j?.message || `Calendly returned ${resp.status}` });
    }
    console.log(`[OK] Calendly event ${uuid} canceled — invitee.canceled webhook will sync the CRM`);
    res.json({ status: "canceled", eventUuid: uuid });
  } catch (err) {
    clearTimeout(timer);
    console.error("[ERROR] Calendly cancel failed:", err.message);
    res.status(502).json({ error: "Could not reach Calendly — the booking was NOT canceled. Try again." });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/event-description
// Fetch the event-type description for a scheduled event URI.
// The frontend calls this when a studio session has no stored description.
// Query params (at least one):
//   ?eventUri=https://api.calendly.com/scheduled_events/<uuid>
//   ?eventTypeUri=https://api.calendly.com/event_types/<uuid>
//   ?eventName=Indiga Yoga - Walnut Creek, CA
// ────────────────────────────────────────────────────────────────
router.get("/calendly/event-description", requireFrontendSecret, async (req, res) => {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) {
    return res.status(503).json({ error: "CALENDLY_API_TOKEN not configured" });
  }

  let { eventUri, eventTypeUri, eventName } = req.query;
  eventName = typeof eventName === "string" ? eventName.trim().slice(0, 200) : "";

  // Basic SSRF guard
  const CALENDLY_BASE = "https://api.calendly.com/";
  const isValidUri = (u) => typeof u === "string" && u.startsWith(CALENDLY_BASE) && u.length <= 300;

  if (!eventUri && !eventTypeUri && !eventName) {
    return res.status(400).json({ error: "Provide eventUri, eventTypeUri, or eventName" });
  }

  res.set("Cache-Control", "no-store");
  try {
    let description = "";

    if (eventTypeUri && isValidUri(eventTypeUri)) {
      description = await fetchEventTypeDescription(eventTypeUri);
    }

    if (!description && eventUri && isValidUri(eventUri)) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
      let evtRes;
      try {
        evtRes = await fetch(eventUri, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          signal: controller.signal,
        });
      } finally { clearTimeout(timer); }
      if (!evtRes.ok) {
        return res.status(evtRes.status).json({ error: `Calendly API returned ${evtRes.status}` });
      }
      const evtData = await evtRes.json();
      const resolvedTypeUri = evtData.resource?.event_type || "";
      if (isValidUri(resolvedTypeUri)) {
        description = await fetchEventTypeDescription(resolvedTypeUri);
      }
    }

    if (!description && eventName) {
      description = await fetchEventTypeDescriptionByName(eventName, token);
    }

    res.json({ description });
  } catch (err) {
    console.warn("[WARN] /api/calendly/event-description error:", err.message);
    res.status(500).json({ error: err.message || "Failed to fetch description" });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/events  (debug/admin view of all events)
// ────────────────────────────────────────────────────────────────
router.get("/calendly/events", requireAdminToken, (_req, res) => {
  res.json({ events: readQueue() });
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/calendly/events  (clear queue — dev/admin only)
// ────────────────────────────────────────────────────────────────
router.delete("/calendly/events", requireAdminToken, (_req, res) => {
  writeQueue([]);
  res.json({ status: "cleared" });
});

module.exports = router;
