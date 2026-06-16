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
const express    = require("express");
const crypto     = require("crypto");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");
const fs         = require("fs");
const path       = require("path");

// ── Startup configuration validation ──
// In production: missing critical secrets = hard fail (exit 1).
// In dev: loud warnings so the developer knows what's missing.
(function validateConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const checks = [
    {
      key: "CALENDLY_WEBHOOK_SIGNING_KEY",
      desc: "Calendly HMAC signing key — without this ALL incoming webhooks are accepted without verification",
      critical: true,
    },
    {
      key: "QUEUE_ENCRYPTION_KEY",
      desc: "AES-256 key for queue file encryption — without this booking PII is stored in plaintext on disk",
      critical: true,
    },
    {
      key: "FRONTEND_SECRET",
      desc: "Shared secret for /pending and /acknowledge endpoints — without this they are open to any caller",
      critical: false,
    },
    {
      key: "ADMIN_SECRET",
      desc: "Token for admin debug endpoints — without this those endpoints are disabled",
      critical: false,
    },
  ];

  const missing = checks.filter(({ key }) => !process.env[key]);
  if (!missing.length) return;

  missing.forEach(({ key, desc }) => {
    console.error(`[${isProd && checks.find(c => c.key === key)?.critical ? "FATAL" : "WARN"}] Missing env var: ${key}`);
    console.error(`       ${desc}`);
  });

  const criticalMissing = missing.filter(c => c.critical);
  if (isProd && criticalMissing.length) {
    console.error("\n[FATAL] Cannot start in production with missing critical secrets.");
    console.error("        Set CALENDLY_WEBHOOK_SIGNING_KEY and QUEUE_ENCRYPTION_KEY in your .env file.");
    process.exit(1);
  }

  if (!isProd && missing.length) {
    console.warn("\n[WARN]  Running in dev mode with missing secrets.");
    console.warn("        DO NOT deploy to production without setting all required env vars.\n");
  }
})();

// Module-level — used in CORS handler and other guards
const isProd = process.env.NODE_ENV === "production";

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──
app.use(helmet());

// ── Rate limiting ──
// NOTE: uses the default in-memory store which resets on process restart.
// For clustered or long-running production deployments, swap in a persistent
// store (e.g. rate-limit-redis) so limits survive restarts and span instances.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 60,              // 60 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
});
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 30,              // Calendly sends bursts; 30/min is generous but bounded
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests" },
});
app.use("/api/webhooks/calendly", webhookLimiter);
app.use("/api/", generalLimiter);

// ── CORS: only allow explicitly listed origins ──
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, cb) => {
    // Require an Origin header in production; allow null-origin only in dev
    // (Vite proxy and server-to-server calls don't send Origin in dev).
    if (!origin) {
      if (!isProd) return cb(null, true);
      return cb(new Error("Origin header required"));
    }
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  },
}));

// ── Raw body needed for HMAC signature verification (256 KB cap) ──
app.use(express.json({
  limit: "256kb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// ── Data store: encrypted JSON file queue ──
const DATA_DIR   = path.join(__dirname, "data");
const QUEUE_FILE = path.join(DATA_DIR, "pending-events.json");

// AES-256-GCM helpers for queue file at rest
function _queueKey() {
  const hex = process.env.QUEUE_ENCRYPTION_KEY;
  if (!hex || hex.length < 64) return null;
  return Buffer.from(hex.slice(0, 64), "hex");
}
function _encryptQueue(plaintext) {
  const key = _queueKey();
  if (!key) return plaintext; // no key → store plaintext (dev mode)
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc  = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag  = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext, base64-encoded
  return Buffer.concat([iv, tag, enc]).toString("base64");
}
function _decryptQueue(stored) {
  const key = _queueKey();
  if (!key) return stored; // no key → treat as plaintext

  // Check format first: if not base64 or too short, it is an old plaintext file — safe to use.
  // Minimum encrypted size: iv(12) + tag(16) + 1 byte payload = 29 bytes → base64 >= 40 chars.
  let buf;
  try { buf = Buffer.from(stored, "base64"); } catch { return stored; }
  if (buf.length < 29) return stored; // clearly not our encrypted format → old plaintext migration

  // Crypto errors (including GCM auth-tag mismatch) mean possible tampering — fail closed.
  try {
    const iv       = buf.slice(0, 12);
    const tag      = buf.slice(12, 28);
    const enc      = buf.slice(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("[ERROR] Queue file failed GCM authentication — possible tampering:", err.message);
    throw err; // readQueue() catches this and returns [] — do NOT fall back to raw content
  }
}

function readQueue() {
  try {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    const raw  = fs.readFileSync(QUEUE_FILE, "utf8");
    const json = _decryptQueue(raw);
    return JSON.parse(json);
  } catch { return []; }
}

const QUEUE_MAX_SIZE    = 1000;  // hard cap on total queued events
const QUEUE_PURGE_DAYS  = 7;     // remove processed events older than this

function _pruneQueue(events) {
  const cutoff = Date.now() - QUEUE_PURGE_DAYS * 24 * 60 * 60 * 1000;
  // Drop processed events older than the purge window
  let pruned = events.filter(e => !(e.processed && new Date(e.processedAt || 0).getTime() < cutoff));
  // If still over cap, drop oldest processed first, then oldest unprocessed
  if (pruned.length > QUEUE_MAX_SIZE) {
    pruned = pruned
      .sort((a, b) => (a.processed ? 0 : 1) - (b.processed ? 0 : 1) || new Date(a.receivedAt) - new Date(b.receivedAt))
      .slice(-QUEUE_MAX_SIZE);
    console.warn(`[WARN] Queue trimmed to ${QUEUE_MAX_SIZE} events`);
  }
  return pruned;
}

function writeQueue(events) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const pruned = _pruneQueue(events);
  const json = JSON.stringify(pruned, null, 2);
  fs.writeFileSync(QUEUE_FILE, _encryptQueue(json), "utf8");
}

// ── In-process async mutex for queue file access ──
// Serialises all read-modify-write operations to prevent concurrent webhook
// bursts from overwriting each other (lost update / event loss).
let _queueLock = Promise.resolve();
function withQueueLock(fn) {
  const next = _queueLock.then(fn).catch((err) => {
    console.error("[ERROR] Queue lock operation failed:", err.message);
  });
  _queueLock = next;
  return next;
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
  // Parse with explicit limit-split and duplicate-key rejection to prevent
  // crafted headers from manipulating the timestamp or signature fields.
  const parts = {};
  for (const segment of header.split(",")) {
    const eqIdx = segment.indexOf("=");
    if (eqIdx === -1) continue;
    const key = segment.slice(0, eqIdx).trim();
    const val = segment.slice(eqIdx + 1).trim();
    if (parts[key] !== undefined) {
      console.warn("[WARN] Duplicate key in Calendly-Webhook-Signature header — rejecting");
      return false;
    }
    parts[key] = val;
  }
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  // Reject replayed webhooks older than 5 minutes
  const MAX_AGE_MS = 5 * 60 * 1000;
  if (Math.abs(Date.now() - parseInt(t, 10) * 1000) > MAX_AGE_MS) {
    console.warn("[WARN] Calendly webhook timestamp too old — possible replay attack");
    return false;
  }

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
    description:          scheduled.description || "",
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

// ── Calendly event-type description cache (in-memory, per-process) ──
const _eventTypeDescCache = {};

const CALENDLY_API_BASE = "https://api.calendly.com/";

async function fetchEventTypeDescription(eventTypeUri) {
  if (!eventTypeUri) return "";

  // SSRF guard: only allow requests to the official Calendly API
  if (!eventTypeUri.startsWith(CALENDLY_API_BASE)) {
    console.warn(`[WARN] Rejected suspicious event_type URI (not api.calendly.com): ${eventTypeUri}`);
    return "";
  }

  if (_eventTypeDescCache[eventTypeUri] !== undefined) return _eventTypeDescCache[eventTypeUri];

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return "";

  try {
    const res = await fetch(eventTypeUri, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Calendly API ${res.status}`);
    const data = await res.json();
    const desc = data.resource?.description_plain || data.resource?.description_html || "";
    // Evict oldest entries if cache exceeds 500 to prevent unbounded growth
    const cacheKeys = Object.keys(_eventTypeDescCache);
    if (cacheKeys.length >= 500) {
      cacheKeys.slice(0, 250).forEach(k => delete _eventTypeDescCache[k]);
    }
    _eventTypeDescCache[eventTypeUri] = desc;
    console.log(`[OK] Fetched event type description for ${eventTypeUri.split("/").pop()}: "${desc.slice(0, 60)}${desc.length > 60 ? "…" : ""}"`);
    return desc;
  } catch (err) {
    console.warn(`[WARN] Could not fetch event type description: ${err.message}`);
    _eventTypeDescCache[eventTypeUri] = ""; // cache miss so we don't retry on every webhook
    return "";
  }
}

// ────────────────────────────────────────────────────────────────
// POST /api/webhooks/calendly
// Receives all Calendly webhook events, verifies signature, queues
// ────────────────────────────────────────────────────────────────
app.post("/api/webhooks/calendly", async (req, res) => {
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

  // Enrich with event type description from Calendly API (cached per event type)
  const eventTypeUri = payload.scheduled_event?.event_type;
  if (eventTypeUri) {
    extracted.description = await fetchEventTypeDescription(eventTypeUri) || extracted.description;
  }

  await withQueueLock(() => {
    const queue = readQueue();
    queue.push(extracted);
    writeQueue(queue);
    console.log(`[OK] Queued ${event} for ${extracted.email || "(no email)"} — queue length: ${queue.length}`);
  });

  res.status(200).json({ status: "queued", id: extracted.id });
});

// ── Frontend secret guard (for CRM-facing endpoints) ──
function requireFrontendSecret(req, res, next) {
  const secret = process.env.FRONTEND_SECRET;
  if (!secret) {
    // If not configured, allow in dev mode but warn loudly
    console.warn("[WARN] FRONTEND_SECRET not set — /pending and /acknowledge are unauthenticated");
    return next();
  }
  if (req.headers["x-frontend-secret"] !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/pending
// React CRM polls this to retrieve unprocessed events
// ────────────────────────────────────────────────────────────────
app.get("/api/calendly/pending", requireFrontendSecret, (_req, res) => {
  const queue   = readQueue();
  const pending = queue.filter(e => !e.processed);
  res.json({ events: pending, total: pending.length });
});

// ────────────────────────────────────────────────────────────────
// POST /api/calendly/acknowledge
// React CRM calls this after processing events so they're not re-sent
// Body: { ids: ["evt_...", "evt_..."] }
// ────────────────────────────────────────────────────────────────
app.post("/api/calendly/acknowledge", requireFrontendSecret, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: "ids must be an array" });
  if (ids.length > 500) return res.status(400).json({ error: "Too many ids — max 500 per request" });

  await withQueueLock(() => {
    const queue   = readQueue();
    const updated = queue.map(e => ids.includes(e.id) ? { ...e, processed: true, processedAt: new Date().toISOString() } : e);
    writeQueue(updated);
  });

  console.log(`[OK] Acknowledged ${ids.length} event(s)`);
  res.json({ acknowledged: ids.length });
});

// ── Admin token guard (for debug endpoints) ──
function requireAdminToken(req, res, next) {
  const token = process.env.ADMIN_SECRET;
  if (!token) return res.status(503).json({ error: "Admin endpoints disabled — ADMIN_SECRET not configured" });
  if (req.headers["x-admin-token"] !== token) return res.status(403).json({ error: "Forbidden" });
  next();
}

// ────────────────────────────────────────────────────────────────
// GET /api/calendly/events  (debug/admin view of all events)
// ────────────────────────────────────────────────────────────────
app.get("/api/calendly/events", requireAdminToken, (_req, res) => {
  res.json({ events: readQueue() });
});

// ────────────────────────────────────────────────────────────────
// DELETE /api/calendly/events  (clear queue — dev/admin only)
// ────────────────────────────────────────────────────────────────
app.delete("/api/calendly/events", requireAdminToken, (_req, res) => {
  writeQueue([]);
  res.json({ status: "cleared" });
});

// ── Health check ──
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`\n✅ Simply Breathe webhook backend running on http://localhost:${PORT}`);
  console.log(`   Webhook endpoint: POST http://localhost:${PORT}/api/webhooks/calendly`);
  console.log(`   Pending events:   GET  http://localhost:${PORT}/api/calendly/pending\n`);
});
