// Simply Breathe OS — Calendly Webhook Backend
// Receives Calendly events, queues them for the React CRM to process on next load.
//
// Setup:
//   1. cp .env.example .env  (fill in your values)
//   2. npm install
//   3. npm run dev  (or: npm start)
//   4. Expose via ngrok for local testing: ngrok http 3001
//   5. Register webhook in Calendly Dashboard → Integrations → Webhooks
//      URL: https://YOUR-NGROK-URL/api/webhooks/calendly
//      Events: invitee.created, invitee.canceled, invitee_no_show.created

require("dotenv").config();
const express  = require("express");
const crypto   = require("crypto");
const cors     = require("cors");
const fs       = require("fs");
const path     = require("path");

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS: only allow the React dev server and production origin ──
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
}));

// ── Raw body needed for HMAC signature verification ──
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// ── Data store: simple JSON file queue ──
const DATA_DIR   = path.join(__dirname, "data");
const QUEUE_FILE = path.join(DATA_DIR, "pending-events.json");

function readQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    return JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
  } catch { return []; }
}

function writeQueue(events) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(events, null, 2), "utf8");
}

// ── Calendly HMAC-SHA256 signature verification ──
// Header: Calendly-Webhook-Signature: t=<timestamp>,v1=<hex-signature>
function verifySignature(req) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    // If no key is configured, skip verification (dev mode only)
    console.warn("[WARN] CALENDLY_WEBHOOK_SIGNING_KEY not set — skipping signature check");
    return true;
  }
  const header = req.headers["calendly-webhook-signature"] || "";
  const parts  = Object.fromEntries(header.split(",").map(p => p.split("=")));
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  const toSign = `${t}.${req.rawBody}`;
  const hmac   = crypto.createHmac("sha256", signingKey);
  hmac.update(toSign);
  const digest = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(v1, "hex"));
  } catch { return false; }
}

// ── Helper: extract clean fields from Calendly payload ──
function extractEvent(event, payload) {
  const scheduled = payload.scheduled_event || {};
  const location  = scheduled.location || {};

  // Custom question answers
  const answers = {};
  (payload.questions_and_answers || []).forEach(({ question, answer }) => {
    const key = question.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    answers[key] = answer || "";
  });

  return {
    id:                   `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt:           new Date().toISOString(),
    processed:            false,
    eventType:            event,                              // invitee.created | invitee.canceled | ...
    // Invitee
    name:                 payload.name || "",
    email:                (payload.email || "").toLowerCase(),
    phone:                answers.phone_number || answers.phone || payload.text_reminder_number || "",
    timezone:             payload.timezone || "",
    // Scheduled event
    calendlyInviteeUri:   payload.uri || "",
    calendlyEventUri:     scheduled.uri || "",
    eventName:            scheduled.name || "",
    startTime:            scheduled.start_time || "",
    endTime:              scheduled.end_time  || "",
    locationType:         location.type || "",               // zoom, physical, custom, etc.
    locationJoinUrl:      location.join_url || "",
    locationAddress:      location.location || "",
    // Status
    rescheduled:          payload.rescheduled || false,
    cancelerType:         payload.cancellation?.canceler_type || "",
    cancelReason:         payload.cancellation?.reason || "",
    // Custom question answers (full map + common fields)
    doneBreathworkBefore: answers.have_you_done_breathwork_before || answers.breathwork_before || "",
    howHeard:             answers.how_did_you_hear_about_us || answers.how_did_you_find_us || "",
    referredBy:           answers.who_referred_you || answers.referred_by || "",
    concerns:             answers.any_physical_or_emotional_concerns || answers.concerns || "",
    attendanceType:       answers.attending_virtually_or_in_person || answers.attendance_type || "",
    reviewedContraindications: answers.have_you_reviewed_contraindications || answers.contraindications || "",
    customAnswers:        answers,
    // UTM / tracking
    utmSource:            payload.tracking?.utm_source || "",
    utmMedium:            payload.tracking?.utm_medium || "",
    utmCampaign:          payload.tracking?.utm_campaign || "",
  };
}

// ────────────────────────────────────────────────────────────────
// POST /api/webhooks/calendly
// Receives all Calendly webhook events, verifies signature, queues
// ────────────────────────────────────────────────────────────────
app.post("/api/webhooks/calendly", (req, res) => {
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

  const queue = readQueue();
  queue.push(extracted);
  writeQueue(queue);

  console.log(`[OK] Queued ${event} for ${extracted.email || "(no email)"} — queue length: ${queue.length}`);
  res.status(200).json({ status: "queued", id: extracted.id });
});

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/pending
// React CRM polls this to retrieve unprocessed events
// ────────────────────────────────────────────────────────────────
app.get("/api/calendly/pending", (_req, res) => {
  const queue   = readQueue();
  const pending = queue.filter(e => !e.processed);
  res.json({ events: pending, total: pending.length });
});

// ────────────────────────────────────────────────────────────────
// POST /api/calendly/acknowledge
// React CRM calls this after processing events so they're not re-sent
// Body: { ids: ["evt_...", "evt_..."] }
// ────────────────────────────────────────────────────────────────
app.post("/api/calendly/acknowledge", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });

  const queue   = readQueue();
  const updated = queue.map(e => ids.includes(e.id) ? { ...e, processed: true, processedAt: new Date().toISOString() } : e);
  writeQueue(updated);

  console.log(`[OK] Acknowledged ${ids.length} event(s)`);
  res.json({ acknowledged: ids.length });
});

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/events  (debug/admin view of all events)
// ────────────────────────────────────────────────────────────────
app.get("/api/calendly/events", (_req, res) => {
  res.json({ events: readQueue() });
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/calendly/events  (clear queue — dev/admin only)
// ────────────────────────────────────────────────────────────────
app.delete("/api/calendly/events", (_req, res) => {
  writeQueue([]);
  res.json({ status: "cleared" });
});

// ── Health check ──
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.listen(PORT, () => {
  console.log(`\n✅ Simply Breathe webhook backend running on http://localhost:${PORT}`);
  console.log(`   Webhook endpoint: POST http://localhost:${PORT}/api/webhooks/calendly`);
  console.log(`   Pending events:   GET  http://localhost:${PORT}/api/calendly/pending\n`);
});
