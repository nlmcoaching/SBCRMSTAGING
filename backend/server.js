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
    {
      key: "RESEND_API_KEY",
      desc: "Resend API key — without this the Send Email feature will return 503",
      critical: false,
    },
    {
      key: "CALENDLY_API_TOKEN",
      desc: "Calendly PAT — without this session descriptions will not be fetched and /api/calendly/event-description returns 503",
      critical: false,
    },
    {
      key: "ALLOWED_ORIGINS",
      desc: "Comma-separated allowed CORS origins — defaults to http://localhost:5173 (dev only); set your production domain before going live",
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
app.use(helmet({
  // Strict CSP for the API server — no inline scripts, only self-origin resources
  contentSecurityPolicy: {
    directives: {
      defaultSrc:      ["'self'"],
      scriptSrc:       ["'self'"],
      styleSrc:        ["'self'"],
      imgSrc:          ["'self'"],
      connectSrc:      ["'self'"],
      frameAncestors:  ["'none'"],
      baseUri:         ["'self'"],
      formAction:      ["'self'"],
      objectSrc:       ["'none'"],
    },
  },
  // Force HTTPS in production (1-year max-age, include subdomains)
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  // Prevent MIME type sniffing
  noSniff: true,
  // Prevent embedding in iframes
  frameguard: { action: "deny" },
  // Control referrer information
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  // Remove X-Powered-By header
  hidePoweredBy: true,
  // Cross-Origin policies
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
}));

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
// Strict limiter for email sending — prevents bulk-send abuse even with a valid session
const emailLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,              // 10 emails per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email requests — please wait before sending more." },
});
app.use("/api/webhooks/calendly", webhookLimiter);
app.use("/api/send-email", emailLimiter);
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
  // Chain onto the lock. Errors are logged AND re-thrown so callers can return
  // a 500 to Calendly, triggering a retry rather than silently losing the event.
  const next = _queueLock.then(fn).catch((err) => {
    console.error("[ERROR] Queue lock operation failed:", err.message);
    throw err;
  });
  // Prevent the shared lock chain from breaking on rejection by catching separately.
  _queueLock = next.catch(() => {});
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
    calendlyEventTypeUri: scheduled.event_type || "",
    eventName:            scheduled.name || "",
    description:          scheduled.description || "",
    startTime:            scheduled.start_time || "",
    endTime:              scheduled.end_time  || "",
    createdAt:            payload.created_at || "",
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

const CALENDLY_API_TIMEOUT_MS = 10_000; // 10 s — prevents hanging webhook handler

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickEventTypeDescription(resource) {
  const plain = String(resource?.description_plain || "").trim();
  const fromHtml = stripHtml(resource?.description_html || "");
  if (!plain) return fromHtml;
  if (!fromHtml) return plain;
  const plainTruncated = plain.endsWith("...") || plain.endsWith("…");
  if (plainTruncated && fromHtml.length > plain.length) return fromHtml;
  return plain.length >= fromHtml.length ? plain : fromHtml;
}

async function fetchEventTypeDescription(eventTypeUri) {
  if (!eventTypeUri) return "";

  // SSRF guard: only allow requests to the official Calendly API
  if (!eventTypeUri.startsWith(CALENDLY_API_BASE)) {
    console.warn(`[WARN] Rejected suspicious event_type URI (not api.calendly.com): ${eventTypeUri}`);
    return "";
  }

  const cached = _eventTypeDescCache[eventTypeUri];
  if (cached) return cached;

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);

  try {
    const res = await fetch(eventTypeUri, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Calendly API ${res.status}`);
    const data = await res.json();
    const desc = pickEventTypeDescription(data.resource);
    if (desc) {
      const cacheKeys = Object.keys(_eventTypeDescCache);
      if (cacheKeys.length >= 500) {
        cacheKeys.slice(0, 250).forEach(k => delete _eventTypeDescCache[k]);
      }
      _eventTypeDescCache[eventTypeUri] = desc;
      console.log(`[OK] Fetched event type description for ${eventTypeUri.split("/").pop()}: "${desc.slice(0, 60)}${desc.length > 60 ? "…" : ""}"`);
    }
    return desc;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[WARN] Could not fetch event type description: ${err.message}`);
    delete _eventTypeDescCache[eventTypeUri];
    return "";
  }
}

let _calendlyUserUri = null;
let _eventTypesByNameCache = null;
let _eventTypesByNameCacheAt = 0;
const EVENT_TYPES_CACHE_MS = 5 * 60 * 1000;

async function calendlyApiGet(path, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
  try {
    const res = await fetch(`${CALENDLY_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Calendly API ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function getCalendlyUserUri(token) {
  if (_calendlyUserUri) return _calendlyUserUri;
  const data = await calendlyApiGet("users/me", token);
  _calendlyUserUri = data.resource?.uri || "";
  return _calendlyUserUri;
}

async function getEventTypesByNameIndex(token) {
  if (_eventTypesByNameCache && Date.now() - _eventTypesByNameCacheAt < EVENT_TYPES_CACHE_MS) {
    return _eventTypesByNameCache;
  }
  const userUri = await getCalendlyUserUri(token);
  if (!userUri) return {};
  const index = {};
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ user: userUri, count: "100" });
    if (pageToken) qs.set("page_token", pageToken);
    const data = await calendlyApiGet(`event_types?${qs}`, token);
    for (const et of data.collection || []) {
      const name = String(et.name || "").trim().toLowerCase();
      if (name && !index[name]) index[name] = et.uri;
    }
    pageToken = data.pagination?.next_page_token || null;
  } while (pageToken);
  _eventTypesByNameCache = index;
  _eventTypesByNameCacheAt = Date.now();
  return index;
}

async function fetchEventTypeDescriptionByName(eventName, token) {
  const needle = String(eventName || "").trim().toLowerCase();
  if (!needle) return "";
  const index = await getEventTypesByNameIndex(token);
  if (index[needle]) return fetchEventTypeDescription(index[needle]);
  const matchKey = Object.keys(index).find(k => needle.includes(k) || k.includes(needle));
  if (matchKey) return fetchEventTypeDescription(index[matchKey]);
  return "";
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

  try {
    await withQueueLock(() => {
      const queue = readQueue();
      queue.push(extracted);
      writeQueue(queue);
      console.log(`[OK] Queued ${event} for ${extracted.email || "(no email)"} — queue length: ${queue.length}`);
    });
  } catch (err) {
    console.error("[ERROR] Failed to persist webhook event — returning 500 so Calendly retries:", err.message);
    return res.status(500).json({ error: "Failed to queue event — please retry" });
  }

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
app.post("/api/calendly/acknowledge", requireFrontendSecret, async (req, res) => {
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
// GET /api/calendly/event-description
// Fetch the event-type description for a scheduled event URI.
// The frontend calls this when a studio session has no stored description.
// Query params (at least one):
//   ?eventUri=https://api.calendly.com/scheduled_events/<uuid>
//   ?eventTypeUri=https://api.calendly.com/event_types/<uuid>
//   ?eventName=Indiga Yoga - Walnut Creek, CA
// ────────────────────────────────────────────────────────────────
app.get("/api/calendly/event-description", requireFrontendSecret, async (req, res) => {
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

// ── Send Email via Resend ─────────────────────────────────────────────────
const { Resend } = require("resend");
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.post("/api/send-email", requireFrontendSecret, async (req, res) => {
  if (!resendClient) {
    return res.status(503).json({ error: "Email service not configured (RESEND_API_KEY missing)." });
  }

  const { to, recipientName, subject, body } = req.body;

  // Input validation
  if (!to || !subject || !body) {
    return res.status(400).json({ error: "Missing required fields: to, subject, body." });
  }
  // Stricter email regex: requires domain with proper TLD, rejects localhost/IP targets
  if (typeof to !== "string" || !/^[^\s@]{1,64}@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(to)) {
    return res.status(400).json({ error: "Invalid recipient email address." });
  }
  if (typeof subject !== "string" || subject.length > 200) {
    return res.status(400).json({ error: "Invalid subject." });
  }
  // Strip CRLF from subject to prevent email header injection
  const safeSubject = subject.replace(/[\r\n]/g, " ").trim();
  if (typeof body !== "string" || body.length > 50000) {
    return res.status(400).json({ error: "Message body too long." });
  }
  // Validate optional recipientName
  if (recipientName !== undefined && (typeof recipientName !== "string" || recipientName.length > 200)) {
    return res.status(400).json({ error: "Invalid recipientName." });
  }

  const FROM    = process.env.RESEND_FROM    || "jeff@simplybreathe.ai";
  const REPLY   = process.env.RESEND_REPLY_TO || FROM;

  // HTML-escape helper — prevents injection of tags/scripts into the email HTML
  const esc = (s) => String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  // Convert plain text body to safe HTML (escape all user content, preserve line breaks)
  const htmlBody = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { font-family: Georgia, serif; font-size: 16px; line-height: 1.7; color: #1a1a2e; max-width: 600px; margin: 40px auto; padding: 0 24px; }
p { margin: 0 0 1em; }
</style></head><body>
${body.split(/\n\n+/).map(para =>
  `<p>${esc(para).replace(/\n/g, "<br>")}</p>`
).join("")}
</body></html>`;

  try {
    const { data, error } = await resendClient.emails.send({
      from:     `Simply Breathe <${FROM}>`,
      to:       [to],
      replyTo:  REPLY,
      subject:  safeSubject,
      html:     htmlBody,
      text:     body,
    });

    if (error) {
      console.error("[send-email] Resend API error:", error);
      return res.status(502).json({ error: error.message || "Email service error." });
    }

    console.log(`[send-email] Sent to ${to} — id: ${data.id}`);
    res.json({ success: true, id: data.id });
  } catch (err) {
    console.error("[send-email] Unexpected error:", err.message);
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
});

// ── Get email delivery status from Resend ────────────────────────────────
app.get("/api/email-status/:id", requireFrontendSecret, async (req, res) => {
  if (!resendClient) return res.status(503).json({ error: "Email service not configured." });

  const { id } = req.params;
  if (!id || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
    return res.status(400).json({ error: "Invalid email ID." });
  }

  res.set("Cache-Control", "no-store");
  try {
    const email = await resendClient.emails.get(id);
    if (email.error) return res.status(502).json({ error: email.error.message });
    res.json({
      id:        email.data?.id,
      status:    email.data?.last_event || "unknown",
      createdAt: email.data?.created_at,
      to:        email.data?.to,
      subject:   email.data?.subject,
    });
  } catch (err) {
    console.error("[email-status] Error:", err.message);
    res.status(500).json({ error: "Could not fetch email status." });
  }
});

// ── Health check (unauthenticated — accepted: used by process monitors) ──
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`\n✅ Simply Breathe webhook backend running on http://localhost:${PORT}`);
  console.log(`   Webhook endpoint: POST http://localhost:${PORT}/api/webhooks/calendly`);
  console.log(`   Pending events:   GET  http://localhost:${PORT}/api/calendly/pending\n`);
});
