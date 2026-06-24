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
const { SUPPORTED_EVENTS, extractStripePayment, verifyStripeSignature } = require("./stripe-handlers");
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
      critical: true,
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
      key: "STRIPE_WEBHOOK_SECRET",
      desc: "Stripe webhook signing secret (whsec_...) — without this ALL incoming Stripe webhooks are accepted without verification",
      critical: true,
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
    console.error(`        Set: ${criticalMissing.map(c => c.key).join(", ")}`);
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

// Only trust X-Forwarded-For when explicitly behind ngrok/nginx (see TRUST_PROXY in .env.example)
if (process.env.TRUST_PROXY === "1" || process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

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
app.use("/api/webhooks/stripe", webhookLimiter);
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
const STRIPE_QUEUE_FILE = path.join(DATA_DIR, "stripe-pending-events.json");
const WEBHOOK_LOG_FILE = path.join(DATA_DIR, "webhook-events-log.json");
const WEBHOOK_LOG_MAX = 500;

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

function readNamedQueue(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const json = _decryptQueue(raw);
    return JSON.parse(json);
  } catch { return []; }
}

function writeNamedQueue(filePath, events) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const pruned = _pruneQueue(events);
  const json = JSON.stringify(pruned, null, 2);
  fs.writeFileSync(filePath, _encryptQueue(json), "utf8");
}

function appendWebhookLog(entry) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let log = [];
    if (fs.existsSync(WEBHOOK_LOG_FILE)) {
      try {
        const raw = fs.readFileSync(WEBHOOK_LOG_FILE, "utf8");
        log = JSON.parse(_decryptQueue(raw));
        if (!Array.isArray(log)) log = [];
      } catch { log = []; }
    }
    log.push(entry);
    if (log.length > WEBHOOK_LOG_MAX) log = log.slice(-WEBHOOK_LOG_MAX);
    fs.writeFileSync(WEBHOOK_LOG_FILE, _encryptQueue(JSON.stringify(log, null, 2)), "utf8");
  } catch (err) {
    console.warn("[WARN] Failed to append webhook log:", err.message);
  }
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

  const payment = payload.payment || null;
  const rawAmount = payment?.amount;
  const paymentAmount = rawAmount != null
    ? (typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount))
    : null;

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
    // Reschedule links (Calendly: new_invitee on the canceled side, old_invitee on the new booking)
    newInviteeUri:        payload.new_invitee || "",
    oldInviteeUri:        payload.old_invitee || "",
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
    // Payment (Calendly Stripe / native checkout)
    paymentAmount:        paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paidAmount:           paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paymentCurrency:      payment?.currency || "",
    paymentSuccessful:    payment?.successful === true,
  };
}

// ── Calendly event-type metadata cache (in-memory, per-process) ──
const _eventTypeDescCache = {};
const _eventTypeMetaCache = {};

// Calendly does not expose the Payment-section dollar amount via API — this org stores it in internal_note
// (e.g. "Studio\\n$55", "virtual|$100") to mirror the configured session price.
function parsePriceFromInternalNote(note) {
  if (!note) return null;
  const text = String(note);
  if (/\bfree\b/i.test(text)) return 0;
  const dollarMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (dollarMatch) {
    const amount = parseFloat(dollarMatch[1]);
    return Number.isNaN(amount) ? null : amount;
  }
  const pipeMatch = text.match(/\|\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (pipeMatch) {
    const amount = parseFloat(pipeMatch[1]);
    return Number.isNaN(amount) ? null : amount;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\$?\d+(?:\.\d{1,2})?$/.test(trimmed)) {
      const amount = parseFloat(trimmed.replace(/^\$/, ""));
      if (!Number.isNaN(amount)) return amount;
    }
  }
  return null;
}

function parseCalendlyPaymentAmount(rawAmount) {
  if (rawAmount == null) return null;
  const amount = typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount);
  return amount != null && !Number.isNaN(amount) ? amount : null;
}

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

async function fetchEventTypeMeta(eventTypeUri) {
  if (!eventTypeUri) return { description: "", price: null };

  if (!eventTypeUri.startsWith(CALENDLY_API_BASE)) {
    console.warn(`[WARN] Rejected suspicious event_type URI (not api.calendly.com): ${eventTypeUri}`);
    return { description: "", price: null };
  }

  const cached = _eventTypeMetaCache[eventTypeUri];
  if (cached) return cached;

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return { description: "", price: null };

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
    const meta = {
      description: pickEventTypeDescription(data.resource),
      price: parsePriceFromInternalNote(data.resource?.internal_note),
    };
    const cacheKeys = Object.keys(_eventTypeMetaCache);
    if (cacheKeys.length >= 500) {
      cacheKeys.slice(0, 250).forEach(k => {
        delete _eventTypeMetaCache[k];
        delete _eventTypeDescCache[k];
      });
    }
    _eventTypeMetaCache[eventTypeUri] = meta;
    if (meta.description) _eventTypeDescCache[eventTypeUri] = meta.description;
    if (meta.price != null) {
      console.log(`[OK] Event type ${eventTypeUri.split("/").pop()} list price: $${meta.price}`);
    }
    return meta;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[WARN] Could not fetch event type metadata: ${err.message}`);
    delete _eventTypeMetaCache[eventTypeUri];
    delete _eventTypeDescCache[eventTypeUri];
    return { description: "", price: null };
  }
}

async function fetchEventTypeDescription(eventTypeUri) {
  const meta = await fetchEventTypeMeta(eventTypeUri);
  return meta.description || "";
}

async function fetchEventTypePrice(eventTypeUri) {
  const meta = await fetchEventTypeMeta(eventTypeUri);
  return meta.price;
}

async function fetchInviteePayment(inviteeUri, eventTypeUriHint = "") {
  if (!inviteeUri?.startsWith(CALENDLY_API_BASE)) return null;

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
  try {
    const res = await fetch(inviteeUri, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const invitee = (await res.json()).resource ?? {};

    let eventTypeUri = eventTypeUriHint || "";
    if (!eventTypeUri && invitee.event?.startsWith(CALENDLY_API_BASE)) {
      const evtController = new AbortController();
      const evtTimer = setTimeout(() => evtController.abort(), CALENDLY_API_TIMEOUT_MS);
      try {
        const evtRes = await fetch(invitee.event, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          signal: evtController.signal,
        });
        clearTimeout(evtTimer);
        if (evtRes.ok) {
          eventTypeUri = (await evtRes.json()).resource?.event_type || "";
        }
      } catch {
        clearTimeout(evtTimer);
      }
    }

    const listPrice = eventTypeUri ? await fetchEventTypePrice(eventTypeUri) : null;
    const payment = invitee.payment;
    const paidAmount = payment != null ? parseCalendlyPaymentAmount(payment.amount) : null;
    const paymentSuccessful = payment?.successful === true;

    // Amount column = configured session price from event type (mirrors Calendly Payment section via internal_note).
    // paidAmount = what Calendly recorded on the invitee (often $0 for coupons).
    const sessionPrice = listPrice ?? paidAmount;

    if (sessionPrice == null && paidAmount == null) {
      return { paymentAmount: null, paidAmount: null, paymentSuccessful: false };
    }

    return {
      paymentAmount: sessionPrice,
      paidAmount,
      paymentSuccessful,
      priceSource: listPrice != null ? "event_type" : "calendly_payment",
    };
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[WARN] Could not fetch invitee payment: ${err.message}`);
    return null;
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

async function fetchEventTypePriceByName(eventName, token) {
  const needle = String(eventName || "").trim().toLowerCase();
  if (!needle) return null;
  const index = await getEventTypesByNameIndex(token);
  if (index[needle]) return fetchEventTypePrice(index[needle]);
  const matchKey = Object.keys(index).find(k => needle === k || needle.includes(k) || k.includes(needle));
  if (matchKey) return fetchEventTypePrice(index[matchKey]);
  return null;
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

  // Resolve session list price + actual paid amount (Calendly Payment section amount lives in event type internal_note)
  if (extracted.calendlyInviteeUri) {
    const pay = await fetchInviteePayment(
      extracted.calendlyInviteeUri,
      eventTypeUri || extracted.calendlyEventTypeUri || "",
    );
    if (pay) {
      if (pay.paymentAmount != null) extracted.paymentAmount = pay.paymentAmount;
      if (pay.paidAmount != null || pay.paymentSuccessful != null) extracted.paidAmount = pay.paidAmount;
      if (pay.paymentSuccessful != null) extracted.paymentSuccessful = pay.paymentSuccessful === true;
      extracted.paymentPriceSource = pay.priceSource || "";
    }
  } else if (extracted.paymentAmount == null && eventTypeUri) {
    const price = await fetchEventTypePrice(eventTypeUri);
    if (price != null) {
      extracted.paymentAmount = price;
      extracted.paymentSuccessful = false;
      extracted.paymentPriceSource = "event_type";
    }
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

// ────────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
// Receives Stripe payment events, verifies signature, queues for CRM
// ────────────────────────────────────────────────────────────────
app.post("/api/webhooks/stripe", async (req, res) => {
  const sigHeader = req.headers["stripe-signature"] || "";
  const verify = verifyStripeSignature(req.rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET);
  if (!verify.ok) {
    console.warn("[WARN] Invalid Stripe signature — rejected:", verify.error);
    return res.status(401).json({ error: "Invalid signature" });
  }
  if (verify.devMode && isProd) {
    console.error("[FATAL] Stripe webhook received in production without STRIPE_WEBHOOK_SECRET");
    return res.status(503).json({ error: "Stripe webhook verification not configured" });
  }

  let event;
  try {
    event = JSON.parse(req.rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
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

  try {
    await withQueueLock(() => {
      const queue = readNamedQueue(STRIPE_QUEUE_FILE);
      if (queue.some(e => e.id === extracted.id || e.stripeEventId === extracted.stripeEventId)) {
        console.log(`[INFO] Duplicate Stripe event ${extracted.stripeEventId} — skipping`);
        return;
      }
      queue.push({ ...extracted, processed: false });
      writeNamedQueue(STRIPE_QUEUE_FILE, queue);
      console.log(`[OK] Queued Stripe ${eventType} for ${extracted.customerEmail || "(no email)"} — queue length: ${queue.length}`);
    });
  } catch (err) {
    console.error("[ERROR] Failed to persist Stripe event:", err.message);
    return res.status(500).json({ error: "Failed to queue event — please retry" });
  }

  res.status(200).json({ status: "queued", id: extracted.id });
});

/** Build a queue event from Calendly REST API objects (same shape as webhook extractEvent). */
function buildInviteeCreatedFromApi(invitee, scheduled) {
  const location = scheduled.location || {};
  const answers = {};
  (invitee.questions_and_answers || []).forEach(({ question, answer }) => {
    const key = String(question || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    answers[key] = answer || "";
  });

  const payment = invitee.payment || null;
  const rawAmount = payment?.amount;
  const paymentAmount = rawAmount != null
    ? (typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount))
    : null;

  return {
    id:                 `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt:         new Date().toISOString(),
    processed:          false,
    eventType:          "invitee.created",
    source:             "calendly_api_pull",
    name:               invitee.name || "",
    email:              (invitee.email || "").toLowerCase(),
    phone:              answers.phone_number || answers.phone || invitee.text_reminder_number || "",
    timezone:           invitee.timezone || "",
    calendlyInviteeUri: invitee.uri || "",
    calendlyEventUri:   scheduled.uri || "",
    calendlyEventTypeUri: scheduled.event_type || "",
    eventName:          scheduled.name || "",
    description:        scheduled.description || "",
    startTime:          scheduled.start_time || "",
    endTime:            scheduled.end_time || "",
    createdAt:          invitee.created_at || "",
    locationType:       location.type || "",
    locationJoinUrl:    location.join_url || "",
    locationAddress:    location.location || "",
    rescheduled:        invitee.rescheduled || false,
    newInviteeUri:      invitee.new_invitee || "",
    oldInviteeUri:      invitee.old_invitee || "",
    doneBreathworkBefore: answers.have_you_done_breathwork_before || answers.breathwork_before || "",
    howHeard:           answers.how_did_you_hear_about_us || answers.how_did_you_find_us || "",
    referredBy:         answers.who_referred_you || answers.referred_by || "",
    concerns:           answers.any_physical_or_emotional_concerns || answers.concerns || "",
    attendanceType:     answers.attending_virtually_or_in_person || answers.attendance_type || "",
    reviewedContraindications: answers.have_you_reviewed_contraindications || answers.contraindications || "",
    customAnswers:      answers,
    utmSource:          invitee.tracking?.utm_source || "",
    utmMedium:          invitee.tracking?.utm_medium || "",
    utmCampaign:        invitee.tracking?.utm_campaign || "",
    paymentAmount:      paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paidAmount:         paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paymentCurrency:    payment?.currency || "",
    paymentSuccessful:  payment?.successful === true,
  };
}

async function enrichCalendlyQueueEvent(extracted) {
  const eventTypeUri = extracted.calendlyEventTypeUri || "";
  if (eventTypeUri) {
    extracted.description = await fetchEventTypeDescription(eventTypeUri) || extracted.description;
  }
  if (extracted.calendlyInviteeUri) {
    const pay = await fetchInviteePayment(extracted.calendlyInviteeUri, eventTypeUri);
    if (pay) {
      if (pay.paymentAmount != null) extracted.paymentAmount = pay.paymentAmount;
      if (pay.paidAmount != null || pay.paymentSuccessful != null) extracted.paidAmount = pay.paidAmount;
      if (pay.paymentSuccessful != null) extracted.paymentSuccessful = pay.paymentSuccessful === true;
      extracted.paymentPriceSource = pay.priceSource || "";
    }
  } else if (extracted.paymentAmount == null && eventTypeUri) {
    const price = await fetchEventTypePrice(eventTypeUri);
    if (price != null) {
      extracted.paymentAmount = price;
      extracted.paymentSuccessful = false;
      extracted.paymentPriceSource = "event_type";
    }
  }
  return extracted;
}

/** Build an invitee.canceled queue event from Calendly API objects (canceled invitee). */
function buildInviteeCanceledFromApi(invitee, scheduled) {
  const evt = buildInviteeCreatedFromApi(invitee, scheduled);
  evt.eventType    = "invitee.canceled";
  evt.rescheduled  = invitee.rescheduled || false;
  evt.cancelerType = invitee.cancellation?.canceler_type || "";
  evt.cancelReason = invitee.cancellation?.reason || "";
  evt.canceledAt   = invitee.cancellation?.created_at || invitee.updated_at || "";
  return evt;
}

/** Fetch all scheduled events of a given status (active|canceled) within the window. */
async function fetchScheduledEvents(userUri, minStart, status, token) {
  const events = [];
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ user: userUri, min_start_time: minStart, count: "100", status });
    if (pageToken) qs.set("page_token", pageToken);
    const data = await calendlyApiGet(`scheduled_events?${qs}`, token);
    events.push(...(data.collection || []));
    pageToken = data.pagination?.next_page_token || null;
  } while (pageToken);
  return events;
}

/** Append candidate events to the queue, deduped by invitee URI + event type. Returns {added, skipped}. */
async function queueCandidates(candidates) {
  let added = 0, skipped = 0;
  await withQueueLock(() => {
    const queue = readQueue();
    // Dedup by invitee URI + event type so a cancellation can still be queued even if the
    // original booking event for that invitee is already in the queue.
    const knownKeys = new Set(queue.map(e => `${e.calendlyInviteeUri}|${e.eventType}`).filter(k => k !== "|"));
    for (const evt of candidates) {
      const key = `${evt.calendlyInviteeUri}|${evt.eventType}`;
      if (knownKeys.has(key)) { skipped++; continue; }
      queue.push(evt);
      knownKeys.add(key);
      added++;
    }
    writeQueue(queue);
  });
  return { added, skipped };
}

/** Fetch recent Calendly bookings AND cancellations via API; queue any missing events (webhook fallback). */
async function pullRecentCalendlyBookings(daysBack = 30) {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) {
    return { added: 0, skipped: 0, scanned: 0, error: "CALENDLY_API_TOKEN not configured" };
  }

  const userUri = await getCalendlyUserUri(token);
  if (!userUri) {
    return { added: 0, skipped: 0, scanned: 0, error: "Could not resolve Calendly user" };
  }

  const minStart = new Date(Date.now() - Math.min(Math.max(daysBack, 1), 90) * 86400000).toISOString();
  let added = 0, skipped = 0, scanned = 0;

  // ── PASS 1: Cancellations first ──
  // Canceled events are few and need no payment enrichment, so they queue within ~1-2s —
  // well inside the frontend's ~12s pull timeout, ensuring they're processed on the same sync.
  try {
    const canceledEvents = await fetchScheduledEvents(userUri, minStart, "canceled", token);
    const cancelCandidates = [];
    for (const scheduled of canceledEvents) {
      const uuid = scheduled.uri?.split("/").pop();
      if (!uuid) continue;
      let invPage = null;
      do {
        const qs = new URLSearchParams({ count: "100" });
        if (invPage) qs.set("page_token", invPage);
        const invData = await calendlyApiGet(`scheduled_events/${uuid}/invitees?${qs}`, token);
        for (const invitee of invData.collection || []) {
          scanned++;
          if (!invitee.uri || !invitee.email) continue;
          if (invitee.status !== "canceled") continue;
          cancelCandidates.push(buildInviteeCanceledFromApi(invitee, scheduled));
        }
        invPage = invData.pagination?.next_page_token || null;
      } while (invPage);
    }
    const r1 = await queueCandidates(cancelCandidates);
    added += r1.added; skipped += r1.skipped;
    if (r1.added > 0) console.log(`[OK] Calendly API pull queued ${r1.added} cancellation(s)`);
  } catch (e) {
    console.warn(`[WARN] Cancellation pull failed: ${e.message}`);
  }

  // ── PASS 2: Active bookings (with payment enrichment) ──
  const activeEvents = await fetchScheduledEvents(userUri, minStart, "active", token);
  const bookingCandidates = [];
  for (const scheduled of activeEvents) {
    const uuid = scheduled.uri?.split("/").pop();
    if (!uuid) continue;
    let invPage = null;
    do {
      const qs = new URLSearchParams({ count: "100" });
      if (invPage) qs.set("page_token", invPage);
      const invData = await calendlyApiGet(`scheduled_events/${uuid}/invitees?${qs}`, token);
      for (const invitee of invData.collection || []) {
        scanned++;
        if (!invitee.uri || !invitee.email) continue;
        if (invitee.status === "canceled") continue;
        const extracted = buildInviteeCreatedFromApi(invitee, scheduled);
        await enrichCalendlyQueueEvent(extracted);
        bookingCandidates.push(extracted);
      }
      invPage = invData.pagination?.next_page_token || null;
    } while (invPage);
  }
  const r2 = await queueCandidates(bookingCandidates);
  added += r2.added; skipped += r2.skipped;

  if (added > 0) {
    console.log(`[OK] Calendly API pull queued ${added} new event(s) total (${skipped} already known, ${scanned} invitees scanned)`);
  }

  return { added, skipped, scanned };
}

// ── Frontend secret guard (for CRM-facing endpoints) ──
function requireFrontendSecret(req, res, next) {
  const secret = process.env.FRONTEND_SECRET;
  if (!secret) {
    if (isProd) {
      return res.status(503).json({ error: "Server misconfigured — FRONTEND_SECRET required" });
    }
    console.warn("[WARN] FRONTEND_SECRET not set — /pending and /acknowledge are unauthenticated");
    return next();
  }
  if (req.headers["x-frontend-secret"] !== secret) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ────────────────────────────────────────────────────────────────
// POST /api/calendly/pull-recent
// Fetches recent bookings from Calendly API and queues any missing invitees
// Body: { daysBack?: number }  (default 30, max 90)
// ────────────────────────────────────────────────────────────────
app.post("/api/calendly/pull-recent", requireFrontendSecret, async (req, res) => {
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
// POST /api/calendly/payment-lookup
// Backfill session prices for registrations (max 25 URIs / 25 event names)
// Body: {
//   uris: ["https://api.calendly.com/scheduled_events/.../invitees/..."],
//   eventTypeByUri: { [inviteeUri]: "https://api.calendly.com/event_types/..." },
//   eventNames: ["Align Yoga - Pleasant Hill, CA"]
// }
// ────────────────────────────────────────────────────────────────
app.post("/api/calendly/payment-lookup", requireFrontendSecret, async (req, res) => {
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

// ────────────────────────────────────────────────────────────────
// GET /api/stripe/ledger
// Returns all Stripe payment events in the queue (including already-processed).
// CRM uses this to hydrate local payments[] when webhooks were acked before bookings existed.
// Query: ?daysBack=90 (default 90, max 365)
// ────────────────────────────────────────────────────────────────
app.get("/api/stripe/ledger", requireFrontendSecret, (req, res) => {
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
app.get("/api/stripe/pending", requireFrontendSecret, (_req, res) => {
  res.set("Cache-Control", "no-store");
  const queue = readNamedQueue(STRIPE_QUEUE_FILE);
  const pending = queue.filter(e => !e.processed);
  res.json({ events: pending, total: pending.length });
});

// ────────────────────────────────────────────────────────────────
// POST /api/stripe/acknowledge
// Body: { ids: ["stripe_evt_...", ...] }
// ────────────────────────────────────────────────────────────────
app.post("/api/stripe/acknowledge", requireFrontendSecret, async (req, res) => {
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

// ────────────────────────────────────────────────────────────────
// DELETE /api/stripe/events  (clear Stripe queue — dev/admin only)
// ────────────────────────────────────────────────────────────────
app.delete("/api/stripe/events", requireAdminToken, (_req, res) => {
  writeNamedQueue(STRIPE_QUEUE_FILE, []);
  res.json({ status: "cleared" });
});

// ────────────────────────────────────────────────────────────────
// POST /api/integration/clear-queues
// Clears Calendly + Stripe pending queues (used by Reset to Production).
// ────────────────────────────────────────────────────────────────
app.post("/api/integration/clear-queues", requireFrontendSecret, requireAdminToken, (_req, res) => {
  writeQueue([]);
  writeNamedQueue(STRIPE_QUEUE_FILE, []);
  res.json({ status: "cleared", calendly: 0, stripe: 0 });
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
  console.log(`   Calendly webhook: POST http://localhost:${PORT}/api/webhooks/calendly`);
  console.log(`   Stripe webhook:   POST http://localhost:${PORT}/api/webhooks/stripe`);
  console.log(`   Pull from API:    POST http://localhost:${PORT}/api/calendly/pull-recent`);
  console.log(`   Pending events:   GET  http://localhost:${PORT}/api/calendly/pending`);
  console.log(`   Stripe ledger:    GET  http://localhost:${PORT}/api/stripe/ledger`);
  console.log(`   Stripe pending:   GET  http://localhost:${PORT}/api/stripe/pending\n`);
});
