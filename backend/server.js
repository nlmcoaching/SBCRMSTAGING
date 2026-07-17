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
const { SUPPORTED_EVENTS, extractStripePayment, verifyStripeSignature, centsToDollars } = require("./stripe-handlers");
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
  const HEX64 = /^[0-9a-f]{64}$/i;
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
      key: "STRIPE_SECRET_KEY",
      desc: "Stripe secret API key (sk_...) — without this the refund endpoint (/api/stripe/refund) returns 503",
      critical: false,
    },
    {
      key: "ALLOWED_ORIGINS",
      desc: "Comma-separated allowed CORS origins — defaults to http://localhost:5173 (dev only); set your production domain before going live",
      critical: false,
    },
  ];

  const missing = checks.filter(({ key }) => !process.env[key]);
  const malformed = [];

  // Presence alone is not enough: a non-hex or wrong-length key makes _queueKey() return null
  // and silently stores queues/auth-users in plaintext.
  const qek = process.env.QUEUE_ENCRYPTION_KEY;
  if (qek && !HEX64.test(qek)) {
    malformed.push({
      key: "QUEUE_ENCRYPTION_KEY",
      desc: "Must be exactly 64 hex characters (openssl rand -hex 32) — malformed values disable at-rest encryption",
      critical: true,
    });
  }

  if (!missing.length && !malformed.length) return;

  missing.forEach(({ key, desc }) => {
    console.error(`[${isProd && checks.find(c => c.key === key)?.critical ? "FATAL" : "WARN"}] Missing env var: ${key}`);
    console.error(`       ${desc}`);
  });
  malformed.forEach(({ key, desc }) => {
    console.error(`[${isProd ? "FATAL" : "WARN"}] Malformed env var: ${key}`);
    console.error(`       ${desc}`);
  });

  const criticalMissing = missing.filter(c => c.critical);
  const criticalMalformed = malformed.filter(c => c.critical);
  if (isProd && (criticalMissing.length || criticalMalformed.length)) {
    console.error("\n[FATAL] Cannot start in production with missing or malformed critical secrets.");
    console.error(`        Fix: ${[...criticalMissing, ...criticalMalformed].map(c => c.key).join(", ")}`);
    process.exit(1);
  }

  if (!isProd && (missing.length || malformed.length)) {
    console.warn("\n[WARN]  Running in dev mode with missing or malformed secrets.");
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
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,                  // PIN / session mint attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts — please wait and try again." },
});
app.use("/api/auth/", authLimiter);
app.use("/api/", generalLimiter);

// ── CORS: only allow explicitly listed origins ──
// Requests with no Origin (Calendly/Stripe webhooks, health checks, curl) are
// allowed through — CORS is a browser policy; HMAC signatures auth those routes.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173").split(",");
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
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
const QUEUE_KEY_HEX_RE = /^[0-9a-f]{64}$/i;

function _queueKey() {
  const hex = process.env.QUEUE_ENCRYPTION_KEY;
  // Reject missing OR malformed keys — a short/non-hex value must not silently disable encryption.
  if (!hex || !QUEUE_KEY_HEX_RE.test(hex)) return null;
  return Buffer.from(hex, "hex"); // exactly 32 bytes when hex is 64 chars
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
    throw err; // caller quarantines the file — do NOT fall back to raw content
  }
}

/** Rename an unreadable queue file aside so the next write cannot destroy evidence / pending events. */
function _quarantineCorruptFile(filePath, reason) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = `${filePath}.corrupt.${stamp}`;
    fs.renameSync(filePath, dest);
    console.error(`[ERROR] Quarantined corrupt queue file → ${path.basename(dest)} (${reason})`);
  } catch (err) {
    console.error(`[ERROR] Failed to quarantine ${filePath}:`, err.message);
  }
}

/** Atomic write: temp file + rename (POSIX atomic replace; Windows unlink+rename fallback). */
function _atomicWriteUtf8(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmp, content, "utf8");
  try {
    fs.renameSync(tmp, filePath);
  } catch (err) {
    // Windows cannot rename over an existing destination
    try { fs.unlinkSync(filePath); } catch (_) { /* dest may not exist */ }
    try {
      fs.renameSync(tmp, filePath);
    } catch (err2) {
      try { fs.unlinkSync(tmp); } catch (_) { /* best-effort cleanup */ }
      throw err2;
    }
  }
}

function _readQueueFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const json = _decryptQueue(raw);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      _quarantineCorruptFile(filePath, "decrypted payload is not an array");
      return [];
    }
    return parsed;
  } catch (err) {
    if (fs.existsSync(filePath)) {
      _quarantineCorruptFile(filePath, err.message || "read/decrypt failure");
    }
    return [];
  }
}

function readQueue() {
  return _readQueueFile(QUEUE_FILE);
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
  const pruned = _pruneQueue(events);
  const json = JSON.stringify(pruned, null, 2);
  _atomicWriteUtf8(QUEUE_FILE, _encryptQueue(json));
}

function readNamedQueue(filePath) {
  return _readQueueFile(filePath);
}

function writeNamedQueue(filePath, events) {
  const pruned = _pruneQueue(events);
  const json = JSON.stringify(pruned, null, 2);
  _atomicWriteUtf8(filePath, _encryptQueue(json));
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
    // Never accept unsigned Calendly webhooks unless explicitly opted in for local testing.
    // Production always rejects. Dev also rejects by default (ngrok exposure is common);
    // set ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true only for intentional local unsigned testing.
    const allowUnsigned = !isProd && process.env.ALLOW_UNSIGNED_CALENDLY_WEBHOOKS === "true";
    if (!allowUnsigned) {
      console.error("[FATAL] CALENDLY_WEBHOOK_SIGNING_KEY not set — rejecting webhook"
        + (isProd ? " in production" : " (set ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true to override in dev)"));
      return false;
    }
    console.warn("[WARN] CALENDLY_WEBHOOK_SIGNING_KEY not set — ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true; skipping signature check (dev only)");
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

/**
 * Invitee display name from registration/billing form data only.
 * Prefer payload.invitee.* when nested; otherwise the invitee resource itself
 * (Calendly webhooks put invitee fields on payload). Never use scheduled_event
 * name/description or other calendar-sync metadata.
 */
function resolveInviteeFormName(inviteeResource, scheduled = {}) {
  if (!inviteeResource || typeof inviteeResource !== "object") return "";
  const form = (inviteeResource.invitee && typeof inviteeResource.invitee === "object")
    ? inviteeResource.invitee
    : inviteeResource;
  const fromParts = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
  const raw = String(form.name || fromParts || "").trim();
  if (!raw) return "";

  // Safeguard: reject values that are clearly calendar event titles / descriptions
  const eventTitle = String(scheduled?.name || "").trim();
  const eventDesc = String(scheduled?.description || "").trim();
  if (eventTitle && raw.toLowerCase() === eventTitle.toLowerCase()) {
    console.warn("[WARN] Rejecting invitee name that matches scheduled_event.name (calendar sync contamination)");
    return "";
  }
  if (eventDesc && raw.toLowerCase() === eventDesc.toLowerCase()) {
    console.warn("[WARN] Rejecting invitee name that matches scheduled_event.description");
    return "";
  }
  return raw;
}

// ── Helper: extract clean fields from Calendly payload ──
function extractEvent(event, payload) {
  // Dedicated invitee object when present; Calendly invitee.* webhooks use payload as the invitee.
  const invitee = (payload.invitee && typeof payload.invitee === "object")
    ? payload.invitee
    : payload;
  const scheduled = payload.scheduled_event || invitee.scheduled_event || {};
  const location  = scheduled.location || {};

  // Custom question answers (registration form)
  const answers = {};
  (invitee.questions_and_answers || payload.questions_and_answers || []).forEach(({ question, answer }) => {
    const key = String(question || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    answers[key] = answer || "";
  });

  const payment = invitee.payment || payload.payment || null;
  const rawAmount = payment?.amount;
  const paymentAmount = rawAmount != null
    ? (typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount))
    : null;

  return {
    id:                   `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt:           new Date().toISOString(),
    processed:            false,
    eventType:            event,                              // invitee.created | invitee.canceled | ...
    // Invitee — name strictly from registration/billing invitee form (never event title)
    name:                 resolveInviteeFormName(payload, scheduled),
    email:                (invitee.email || payload.email || "").toLowerCase(),
    phone:                answers.phone_number || answers.phone || invitee.text_reminder_number || payload.text_reminder_number || "",
    timezone:             invitee.timezone || payload.timezone || "",
    // Scheduled event (calendar metadata — kept separate from invitee name)
    calendlyInviteeUri:   invitee.uri || payload.uri || "",
    calendlyEventUri:     scheduled.uri || "",
    calendlyEventTypeUri: scheduled.event_type || "",
    eventName:            scheduled.name || "",
    description:          scheduled.description || "",
    startTime:            scheduled.start_time || "",
    endTime:              scheduled.end_time  || "",
    createdAt:            invitee.created_at || payload.created_at || "",
    locationType:         location.type || "",               // zoom, physical, custom, etc.
    locationJoinUrl:      location.join_url || "",
    locationAddress:      location.location || "",
    // Status
    rescheduled:          invitee.rescheduled || payload.rescheduled || false,
    cancelerType:         invitee.cancellation?.canceler_type || payload.cancellation?.canceler_type || "",
    cancelReason:         invitee.cancellation?.reason || payload.cancellation?.reason || "",
    // Reschedule links (Calendly: new_invitee on the canceled side, old_invitee on the new booking)
    newInviteeUri:        invitee.new_invitee || payload.new_invitee || "",
    oldInviteeUri:        invitee.old_invitee || payload.old_invitee || "",
    // Custom question answers (full map + common fields)
    doneBreathworkBefore: answers.have_you_done_breathwork_before || answers.breathwork_before || "",
    howHeard:             answers.how_did_you_hear_about_us || answers.how_did_you_find_us || "",
    referredBy:           answers.who_referred_you || answers.referred_by || "",
    concerns:             answers.any_physical_or_emotional_concerns || answers.concerns || "",
    attendanceType:       answers.attending_virtually_or_in_person || answers.attendance_type || "",
    reviewedContraindications: answers.have_you_reviewed_contraindications || answers.contraindications || "",
    customAnswers:        answers,
    // UTM / tracking
    utmSource:            invitee.tracking?.utm_source || payload.tracking?.utm_source || "",
    utmMedium:            invitee.tracking?.utm_medium || payload.tracking?.utm_medium || "",
    utmCampaign:          invitee.tracking?.utm_campaign || payload.tracking?.utm_campaign || "",
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
  // Exact name match only (case-insensitive). Substring matching can cross-bind
  // similar event types (e.g. "Yoga" → "Indiga Yoga - Walnut Creek").
  const needle = String(eventName || "").trim().toLowerCase();
  if (!needle) return "";
  const index = await getEventTypesByNameIndex(token);
  if (index[needle]) return fetchEventTypeDescription(index[needle]);
  return "";
}

async function fetchEventTypePriceByName(eventName, token) {
  // Exact name match only — fuzzy substring matching can assign the wrong list price.
  const needle = String(eventName || "").trim().toLowerCase();
  if (!needle) return null;
  const index = await getEventTypesByNameIndex(token);
  if (index[needle]) return fetchEventTypePrice(index[needle]);
  return null;
}

/**
 * Idempotent Calendly webhook enqueue — dedup by invitee URI + event type
 * (mirrors Stripe's stripeEventId check). Returns { status, id, queued }.
 */
function enqueueCalendlyWebhookEvent(extracted) {
  const queue = readQueue();
  const key = extracted.calendlyInviteeUri
    ? `${extracted.calendlyInviteeUri}|${extracted.eventType}`
    : "";
  if (key) {
    const existing = queue.find(
      e => e.calendlyInviteeUri === extracted.calendlyInviteeUri && e.eventType === extracted.eventType,
    );
    if (existing) {
      console.log(`[INFO] Duplicate Calendly ${extracted.eventType} for ${extracted.calendlyInviteeUri} — skipping`);
      return { status: "duplicate", id: existing.id, queued: false };
    }
  }
  queue.push(extracted);
  writeQueue(queue);
  console.log(`[OK] Queued ${extracted.eventType} for ${extracted.calendlyInviteeUri || extracted.id} — queue length: ${queue.length}`);
  return { status: "queued", id: extracted.id, queued: true };
}

/**
 * Enrich a queued Calendly event after the webhook 200 — description + payment
 * via Calendly API. Patches the queue entry only while still unprocessed.
 */
async function enrichQueuedCalendlyEvent(eventId, { eventTypeUri = "", inviteeUri = "", calendlyEventTypeUri = "" } = {}) {
  const patches = {};

  if (eventTypeUri) {
    const desc = await fetchEventTypeDescription(eventTypeUri);
    if (desc) patches.description = desc;
  }

  if (inviteeUri) {
    const pay = await fetchInviteePayment(inviteeUri, eventTypeUri || calendlyEventTypeUri || "");
    if (pay) {
      if (pay.paymentAmount != null) patches.paymentAmount = pay.paymentAmount;
      if (pay.paidAmount != null || pay.paymentSuccessful != null) patches.paidAmount = pay.paidAmount;
      if (pay.paymentSuccessful != null) patches.paymentSuccessful = pay.paymentSuccessful === true;
      patches.paymentPriceSource = pay.priceSource || "";
    }
  } else if (eventTypeUri) {
    const price = await fetchEventTypePrice(eventTypeUri);
    if (price != null) {
      // Applied only when the queued row still has no amount (see patch below).
      patches._eventTypePrice = price;
    }
  }

  if (Object.keys(patches).length === 0) return;

  await withQueueLock(() => {
    const queue = readQueue();
    const idx = queue.findIndex(e => e.id === eventId && !e.processed);
    if (idx < 0) return;
    const current = queue[idx];
    const applied = { ...patches };
    if (applied._eventTypePrice != null) {
      if (current.paymentAmount == null) {
        applied.paymentAmount = applied._eventTypePrice;
        applied.paymentSuccessful = false;
        applied.paymentPriceSource = "event_type";
      }
      delete applied._eventTypePrice;
    }
    if (Object.keys(applied).length === 0) return;
    queue[idx] = { ...current, ...applied, enrichedAt: new Date().toISOString() };
    writeQueue(queue);
    console.log(`[OK] Enriched Calendly event ${eventId}`);
  });
}

// ────────────────────────────────────────────────────────────────
// POST /api/webhooks/calendly
// Receives all Calendly webhook events, verifies signature, queues
// immediately (idempotent), then enriches description/payment async.
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
    // Invitee name from invitee resource only — never scheduled.name / description
    name:               resolveInviteeFormName(invitee, scheduled),
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

/** Append candidate events to the queue, deduped by invitee URI + event type. Returns {added, skipped, requeued}.
 *  Processed events normally block re-queue (avoid sync thrash). Exceptions:
 *  - Payload changed (name / start / end / event / email) → refresh so CRM picks up edits
 *  - Booked within REQUEUE_RECENT_MS → re-queue so a lost CRM registration can heal
 */
const REQUEUE_RECENT_MS = 72 * 60 * 60 * 1000;

function calendlyEventPayloadChanged(existing, evt) {
  return existing.name !== evt.name
    || existing.email !== evt.email
    || existing.eventName !== evt.eventName
    || existing.startTime !== evt.startTime
    || existing.endTime !== evt.endTime
    || existing.phone !== evt.phone;
}

function isRecentCalendlyBooking(evt) {
  const bookedAt = Date.parse(evt.createdAt || evt.receivedAt || "");
  return Number.isFinite(bookedAt) && (Date.now() - bookedAt) < REQUEUE_RECENT_MS;
}

/** Synthetic URIs from webhook-signature tests (not real Calendly bookings). */
function isSyntheticCalendlyUri(uri) {
  if (!uri) return false;
  const u = String(uri);
  return /\/scheduled_events\/TEST\b/i.test(u) || /\/invitees\/TEST\b/i.test(u);
}

async function queueCandidates(candidates) {
  let added = 0, skipped = 0, requeued = 0;
  await withQueueLock(() => {
    const queue = readQueue();
    // Index by invitee URI + event type (cancellation can coexist with booking).
    const byKey = new Map();
    queue.forEach((e, i) => {
      const key = `${e.calendlyInviteeUri}|${e.eventType}`;
      if (key !== "|") byKey.set(key, i);
    });
    for (const evt of candidates) {
      if (isSyntheticCalendlyUri(evt.calendlyInviteeUri) || isSyntheticCalendlyUri(evt.calendlyEventUri)) {
        skipped++;
        continue;
      }
      const key = `${evt.calendlyInviteeUri}|${evt.eventType}`;
      if (key === "|") { skipped++; continue; }
      const idx = byKey.get(key);
      if (idx == null) {
        queue.push(evt);
        byKey.set(key, queue.length - 1);
        added++;
        continue;
      }
      const existing = queue[idx];
      if (!existing.processed) { skipped++; continue; }
      const shouldRequeue = calendlyEventPayloadChanged(existing, evt) || isRecentCalendlyBooking(evt);
      if (!shouldRequeue) { skipped++; continue; }
      queue[idx] = {
        ...evt,
        id: existing.id,
        processed: false,
        requeuedAt: new Date().toISOString(),
        previouslyProcessedAt: existing.processedAt || "",
      };
      requeued++;
      added++;
    }
    writeQueue(queue);
  });
  return { added, skipped, requeued };
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
  let added = 0, skipped = 0, scanned = 0, requeued = 0;

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
    added += r1.added; skipped += r1.skipped; requeued += r1.requeued || 0;
    if (r1.added > 0) console.log(`[OK] Calendly API pull queued ${r1.added} cancellation(s) (${r1.requeued || 0} re-queued)`);
  } catch (e) {
    console.warn(`[WARN] Cancellation pull failed: ${e.message}`);
  }

  // ── PASS 2: Active bookings (with payment enrichment) ──
  // Group/studio events stay "active" even when an individual participant cancels — only that
  // invitee's status flips to "canceled". So we must inspect invitees of active events too and
  // queue an invitee.canceled for any canceled participant (PASS 1 only catches fully-canceled events).
  const activeEvents = await fetchScheduledEvents(userUri, minStart, "active", token);
  const bookingCandidates = [];
  const lateCancelCandidates = [];
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
        if (invitee.status === "canceled") {
          lateCancelCandidates.push(buildInviteeCanceledFromApi(invitee, scheduled));
          continue;
        }
        const extracted = buildInviteeCreatedFromApi(invitee, scheduled);
        await enrichCalendlyQueueEvent(extracted);
        bookingCandidates.push(extracted);
      }
      invPage = invData.pagination?.next_page_token || null;
    } while (invPage);
  }
  if (lateCancelCandidates.length) {
    const rc = await queueCandidates(lateCancelCandidates);
    added += rc.added; skipped += rc.skipped; requeued += rc.requeued || 0;
    if (rc.added > 0) console.log(`[OK] Calendly API pull queued ${rc.added} group-event participant cancellation(s)`);
  }
  const r2 = await queueCandidates(bookingCandidates);
  added += r2.added; skipped += r2.skipped; requeued += r2.requeued || 0;

  if (added > 0) {
    console.log(`[OK] Calendly API pull queued ${added} event(s) (${requeued} re-queued for CRM heal/refresh, ${skipped} unchanged, ${scanned} invitees scanned)`);
  }

  return { added, skipped, scanned, requeued };
}

// ── Per-session API tokens (minted after CRM PIN unlock; required for money-moving + email) ──
const AUTH_USERS_FILE = path.join(DATA_DIR, "auth-users.json");
const _refundSessions = new Map(); // token → { exp, userId, role, canEdit }
const REFUND_SESSION_TTL = 60 * 60 * 1000; // 1 hour
const _sessionChallenges = new Map(); // nonce → { exp }
const SESSION_CHALLENGE_TTL = 2 * 60 * 1000; // 2 minutes

/** Thrown when auth-users.json exists but cannot be trusted (read/decrypt/parse/shape). */
class AuthUsersStoreError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthUsersStoreError";
    this.code = "AUTH_USERS_UNREADABLE";
  }
}

/**
 * Load the auth-user registry.
 * - File absent → { users: {} } (legitimate first-run Owner bootstrap)
 * - File present but unreadable/decrypt/parse/shape failure → throw AuthUsersStoreError
 *   (fail closed — never treat as empty, or Owner bootstrap re-opens to any FRONTEND_SECRET caller)
 * Unlike webhook queues, we do NOT quarantine-rename the live file: removing it would look
 * like "file absent" and re-enable bootstrap.
 */
function readAuthUsers() {
  if (!fs.existsSync(AUTH_USERS_FILE)) return { users: {} };

  let raw;
  try {
    raw = fs.readFileSync(AUTH_USERS_FILE, "utf8");
  } catch (err) {
    console.error("[ERROR] auth-users.json unreadable — refusing empty fallback:", err.message);
    throw new AuthUsersStoreError("Auth user store unreadable");
  }

  let json;
  try {
    json = _decryptQueue(raw);
  } catch (err) {
    console.error("[ERROR] auth-users.json decrypt failed — refusing Owner bootstrap:", err.message);
    throw new AuthUsersStoreError("Auth user store decrypt failed");
  }

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    console.error("[ERROR] auth-users.json JSON parse failed — refusing Owner bootstrap:", err.message);
    throw new AuthUsersStoreError("Auth user store corrupt");
  }

  if (
    !parsed
    || typeof parsed !== "object"
    || Array.isArray(parsed)
    || typeof parsed.users !== "object"
    || parsed.users === null
    || Array.isArray(parsed.users)
  ) {
    console.error("[ERROR] auth-users.json has invalid shape — refusing Owner bootstrap");
    throw new AuthUsersStoreError("Auth user store invalid");
  }

  return parsed;
}

function writeAuthUsers(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const payload = JSON.stringify({ users: data.users || {} }, null, 2);
  _atomicWriteUtf8(AUTH_USERS_FILE, _encryptQueue(payload));
}

/** Load auth users or send 503. Returns null when the response was already sent. */
function loadAuthUsersOr503(res) {
  try {
    return readAuthUsers();
  } catch (err) {
    if (err?.code === "AUTH_USERS_UNREADABLE") {
      res.status(503).json({
        error: "Auth user store unavailable — restore or repair backend/data/auth-users.json (do not delete unless intentionally re-bootstrapping)",
      });
      return null;
    }
    throw err;
  }
}

function _b64ToBuf(b64) {
  return Buffer.from(b64, "base64");
}

function verifyUnlockProof(unlockSecretHex, nonce, userId, unlockProofB64) {
  if (!unlockSecretHex || !nonce || !userId || !unlockProofB64) return false;
  if (typeof unlockSecretHex !== "string" || !/^[0-9a-f]{64}$/i.test(unlockSecretHex)) return false;
  try {
    const expected = crypto
      .createHmac("sha256", Buffer.from(unlockSecretHex, "hex"))
      .update(`${nonce}:${userId}`)
      .digest();
    const got = _b64ToBuf(unlockProofB64);
    if (got.length !== expected.length) return false;
    return crypto.timingSafeEqual(got, expected);
  } catch {
    return false;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [tok, meta] of _refundSessions.entries()) {
    if (meta.exp < now) _refundSessions.delete(tok);
  }
  for (const [nonce, meta] of _sessionChallenges.entries()) {
    if (meta.exp < now) _sessionChallenges.delete(nonce);
  }
}, 60 * 60 * 1000);

// ── Frontend secret guard (for CRM-facing endpoints) ──
// Fail closed whenever FRONTEND_SECRET is unset, unless ALLOW_INSECURE_DEV_AUTH=true
// (local-only escape hatch — never enable with a public ngrok tunnel).

/** Constant-time string compare for shared secrets (length mismatch → false, no throw). */
function secretsEqual(provided, expected) {
  if (typeof provided !== "string" || typeof expected !== "string") return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // Keep roughly constant work on length mismatch (timingSafeEqual requires equal lengths).
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function requireFrontendSecret(req, res, next) {
  const secret = process.env.FRONTEND_SECRET;
  if (!secret) {
    const allowInsecure = !isProd && process.env.ALLOW_INSECURE_DEV_AUTH === "true";
    if (!allowInsecure) {
      return res.status(503).json({
        error: isProd
          ? "Server misconfigured — FRONTEND_SECRET required"
          : "FRONTEND_SECRET required (set ALLOW_INSECURE_DEV_AUTH=true only for local unsigned testing)",
      });
    }
    console.warn("[WARN] FRONTEND_SECRET not set — ALLOW_INSECURE_DEV_AUTH=true; CRM APIs are unauthenticated (dev only)");
    return next();
  }
  if (!secretsEqual(req.headers["x-frontend-secret"], secret)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

function requireSessionToken(req, res, next) {
  const tok = req.headers["x-session-token"];
  const meta = tok ? _refundSessions.get(tok) : null;
  if (!tok || !meta || meta.exp < Date.now()) {
    if (tok) _refundSessions.delete(tok); // purge expired
    return res.status(401).json({ error: "Session token required or expired — please log in to the CRM." });
  }
  // Optional binding: if the client sends x-user-id, it must match the minting user
  const hdrUser = req.headers["x-user-id"];
  if (hdrUser && meta.userId && hdrUser !== meta.userId) {
    return res.status(403).json({ error: "Session token is not valid for this user." });
  }
  req.apiSession = meta;
  req.refundSession = meta; // backwards-compatible alias
  next();
}

function requireEditSession(req, res, next) {
  requireSessionToken(req, res, () => {
    if (res.headersSent) return;
    if (!req.apiSession?.canEdit) {
      return res.status(403).json({ error: "Edit permission required for this action." });
    }
    next();
  });
}

// GET /api/auth/session-challenge — one-shot nonce required to mint an API session.
app.get("/api/auth/session-challenge", requireFrontendSecret, (req, res) => {
  const nonce = crypto.randomBytes(24).toString("hex");
  _sessionChallenges.set(nonce, { exp: Date.now() + SESSION_CHALLENGE_TTL });
  res.json({ nonce, expiresInMs: SESSION_CHALLENGE_TTL });
});

// POST /api/auth/register-unlock — register/update per-user unlock secret + role bits.
// Body: { userId, unlockSecret?, role?, canEdit?, nonce?, unlockProof? }
// - Empty registry: bootstrap (first Owner setup) — requires unlockSecret; trusts canEdit
// - Owner session: create/update anyone (unlockSecret required only when creating or rotating)
// - Existing user + valid HMAC proof: rotate secret only (role unchanged)
// - New userId without Owner session: allowed with unlockSecret; canEdit forced false
app.post("/api/auth/register-unlock", requireFrontendSecret, (req, res) => {
  const { userId, unlockSecret, role, canEdit, nonce, unlockProof } = req.body ?? {};
  if (!userId || typeof userId !== "string" || userId.length > 80) {
    return res.status(400).json({ error: "userId required" });
  }
  const hasSecret = typeof unlockSecret === "string" && /^[0-9a-f]{64}$/i.test(unlockSecret);
  if (unlockSecret != null && unlockSecret !== "" && !hasSecret) {
    return res.status(400).json({ error: "unlockSecret must be 32-byte hex" });
  }

  const store = loadAuthUsersOr503(res);
  if (!store) return;
  const existing = store.users[userId];
  const sessionTok = req.headers["x-session-token"];
  const sessionMeta = sessionTok ? _refundSessions.get(sessionTok) : null;
  const sessionOk = sessionMeta && sessionMeta.exp >= Date.now();
  const canManageUsers = sessionOk && sessionMeta.role === "Owner";

  const userCount = Object.keys(store.users).length;
  let nextCanEdit;
  let nextRole = typeof role === "string" && role.length <= 40 ? role : (existing?.role || "Viewer");
  let nextSecret = existing?.unlockSecret;

  if (userCount === 0) {
    if (!hasSecret) return res.status(400).json({ error: "unlockSecret required for bootstrap" });
    nextSecret = unlockSecret;
    nextCanEdit = canEdit === true;
    nextRole = typeof role === "string" && role.length <= 40 ? role : "Owner";
  } else if (canManageUsers) {
    if (!existing && !hasSecret) {
      return res.status(400).json({ error: "unlockSecret required to register a new user" });
    }
    if (hasSecret) nextSecret = unlockSecret;
    nextCanEdit = canEdit === true;
    if (typeof role === "string" && role.length <= 40) nextRole = role;
  } else if (existing) {
    if (!hasSecret) {
      return res.status(400).json({ error: "unlockSecret required to rotate" });
    }
    if (!nonce || typeof nonce !== "string") {
      return res.status(400).json({ error: "nonce required to rotate unlock secret" });
    }
    const challenge = _sessionChallenges.get(nonce);
    _sessionChallenges.delete(nonce);
    if (!challenge || challenge.exp < Date.now()) {
      return res.status(401).json({ error: "Invalid or expired challenge" });
    }
    if (!verifyUnlockProof(existing.unlockSecret, nonce, userId, unlockProof)) {
      return res.status(403).json({ error: "Invalid unlock proof — cannot rotate secret" });
    }
    nextSecret = unlockSecret;
    nextCanEdit = existing.canEdit === true;
    nextRole = existing.role || nextRole;
  } else {
    if (!hasSecret) return res.status(400).json({ error: "unlockSecret required" });
    nextSecret = unlockSecret;
    nextCanEdit = false;
    nextRole = typeof role === "string" && role.length <= 40 ? role : "Viewer";
  }

  if (!nextSecret) {
    return res.status(400).json({ error: "unlockSecret required" });
  }

  store.users[userId] = {
    unlockSecret: nextSecret,
    role: nextRole,
    canEdit: nextCanEdit === true,
    updatedAt: new Date().toISOString(),
  };
  writeAuthUsers(store);
  res.json({ ok: true, userId, role: nextRole, canEdit: nextCanEdit === true });
});

// POST /api/auth/session — mint a short-lived API session after CRM PIN unlock.
// Requires x-frontend-secret + fresh challenge nonce + HMAC unlockProof over registered secret.
app.post("/api/auth/session", requireFrontendSecret, (req, res) => {
  const { userId, nonce, unlockProof } = req.body ?? {};
  if (!userId || typeof userId !== "string" || userId.length > 80) {
    return res.status(400).json({ error: "userId required" });
  }
  if (!nonce || typeof nonce !== "string") {
    return res.status(400).json({ error: "session challenge nonce required — call GET /api/auth/session-challenge first" });
  }
  const challenge = _sessionChallenges.get(nonce);
  _sessionChallenges.delete(nonce); // one-shot regardless of outcome
  if (!challenge || challenge.exp < Date.now()) {
    return res.status(401).json({ error: "Invalid or expired session challenge" });
  }

  const store = loadAuthUsersOr503(res);
  if (!store) return;
  const rec = store.users[userId];
  if (!rec?.unlockSecret) {
    return res.status(401).json({ error: "User not registered for API sessions — unlock again or ask Owner to sync permissions" });
  }
  if (!verifyUnlockProof(rec.unlockSecret, nonce, userId, unlockProof)) {
    return res.status(401).json({ error: "Invalid unlockProof" });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const meta = {
    exp: Date.now() + REFUND_SESSION_TTL,
    userId,
    role: rec.role || "Viewer",
    canEdit: rec.canEdit === true,
  };
  _refundSessions.set(token, meta);
  res.json({ token, expiresInMs: REFUND_SESSION_TTL, userId, role: meta.role, canEdit: meta.canEdit });
});

// ────────────────────────────────────────────────────────────────
// Server-side PIN attempt tracking
// In-memory only — resets on server restart (acceptable for local use).
// Provides defence-in-depth against XSS-based brute-force; the client
// cannot clear this counter by calling localStorage.clear() or DevTools.
// Failed increments require a one-shot challenge from GET pin-status so
// a caller with only FRONTEND_SECRET cannot forge lockouts for arbitrary users
// without a challenge round-trip per attempt (and authLimiter caps volume).
// ────────────────────────────────────────────────────────────────
const _pinAttempts = new Map(); // userId -> { count, lockedUntil }
const _pinChallenges = new Map(); // challenge -> { userId, exp }
const SRV_PIN_MAX = 5;
const SRV_PIN_LOCKOUT_MS = 5 * 60 * 1000;
const PIN_CHALLENGE_TTL = 2 * 60 * 1000;

function _pinStatus(userId) {
  const now = Date.now();
  const rec = _pinAttempts.get(userId) || { count: 0, lockedUntil: 0 };
  const locked = rec.lockedUntil > now;
  return {
    locked,
    lockedUntil: locked ? rec.lockedUntil : 0,
    attemptsLeft: Math.max(0, SRV_PIN_MAX - rec.count),
    attemptsMax: SRV_PIN_MAX,
  };
}

function _issuePinChallenge(userId) {
  const challenge = crypto.randomBytes(24).toString("hex");
  _pinChallenges.set(challenge, { userId, exp: Date.now() + PIN_CHALLENGE_TTL });
  // Opportunistic purge of expired challenges
  const now = Date.now();
  for (const [ch, meta] of _pinChallenges.entries()) {
    if (meta.exp < now) _pinChallenges.delete(ch);
  }
  return challenge;
}

function _consumePinChallenge(userId, challenge) {
  if (!challenge || typeof challenge !== "string") return false;
  const meta = _pinChallenges.get(challenge);
  _pinChallenges.delete(challenge);
  if (!meta || meta.exp < Date.now() || meta.userId !== userId) return false;
  return true;
}

// GET /api/auth/pin-status?userId=<id>
app.get("/api/auth/pin-status", requireFrontendSecret, (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId required" });
  const status = _pinStatus(userId);
  const challenge = _issuePinChallenge(userId);
  res.json({ ...status, challenge, challengeExpiresInMs: PIN_CHALLENGE_TTL });
});

// POST /api/auth/pin-attempt — { userId, failed: boolean, challenge: string }
app.post("/api/auth/pin-attempt", requireFrontendSecret, (req, res) => {
  const { userId, failed, challenge } = req.body ?? {};
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId required" });
  if (!_consumePinChallenge(userId, challenge)) {
    return res.status(401).json({ error: "Invalid or expired PIN challenge — call GET /api/auth/pin-status first" });
  }
  if (!failed) {
    _pinAttempts.delete(userId);
    return res.json({ locked: false, lockedUntil: 0, attemptsLeft: SRV_PIN_MAX, attemptsMax: SRV_PIN_MAX });
  }
  const now = Date.now();
  const rec = _pinAttempts.get(userId) || { count: 0, lockedUntil: 0 };
  // Already locked — don't double-count; let the TTL expire naturally
  if (rec.lockedUntil > now) return res.json(_pinStatus(userId));
  const newCount = rec.count + 1;
  const lockedUntil = newCount >= SRV_PIN_MAX ? now + SRV_PIN_LOCKOUT_MS : 0;
  _pinAttempts.set(userId, { count: newCount, lockedUntil });
  if (lockedUntil) {
    console.warn(`[AUTH] PIN lockout triggered for user ${userId} at ${new Date().toISOString()}`);
  }
  res.json(_pinStatus(userId));
});

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
// POST /api/stripe/refund
// Issues a FULL refund for a payment via the Stripe API (POST /v1/refunds).
// Called by the CRM after a human approves a refund for a canceled booking.
// Body: {
//   paymentIntentId?: "pi_...", chargeId?: "ch_...", registrationId: string (required),
//   reason?: string,
//   policy?: { cancelerType, canceledAt, sessionAt, override? }
// }
// ────────────────────────────────────────────────────────────────
const REFUND_POLICY_HOURS = 24;
const REFUND_AUDIT_FILE = path.join(DATA_DIR, "refund-audit.json");

function evaluateRefundPolicyServer(policy) {
  const p = policy && typeof policy === "object" ? policy : {};
  const canceler = String(p.cancelerType || "").toLowerCase();
  if (canceler === "host") {
    return { eligible: true, reason: "Canceled by host — full refund due" };
  }
  const sessionTs = Date.parse(p.sessionAt || "");
  const canceledTs = Date.parse(p.canceledAt || "");
  if (!sessionTs || Number.isNaN(canceledTs)) {
    // Timing unknown — treat as eligible but require human review (UI flags this).
    // Server allows Edit sessions through; Owner override not required.
    return { eligible: true, reason: "Client canceled (timing unknown)" };
  }
  const hoursBefore = (sessionTs - canceledTs) / 3600000;
  if (hoursBefore > REFUND_POLICY_HOURS) {
    return { eligible: true, reason: `Client canceled ${Math.floor(hoursBefore)}h before session` };
  }
  return { eligible: false, reason: `Late cancel (≤${REFUND_POLICY_HOURS}h before session) — no refund per policy` };
}

function appendRefundAudit(entry) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let log = [];
    if (fs.existsSync(REFUND_AUDIT_FILE)) {
      try {
        const raw = fs.readFileSync(REFUND_AUDIT_FILE, "utf8");
        log = JSON.parse(_decryptQueue(raw));
        if (!Array.isArray(log)) log = [];
      } catch { log = []; }
    }
    log.push(entry);
    if (log.length > 500) log = log.slice(-500);
    fs.writeFileSync(REFUND_AUDIT_FILE, _encryptQueue(JSON.stringify(log, null, 2)), "utf8");
  } catch (err) {
    console.warn("[WARN] Could not write refund audit log:", err.message);
  }
}

async function stripeGet(pathSuffix, apiKey) {
  const resp = await fetch(`https://api.stripe.com/v1/${pathSuffix}`, {
    headers: { "Authorization": `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}` },
  });
  const j = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, body: j };
}

app.post("/api/stripe/refund", requireFrontendSecret, requireEditSession, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.status(503).json({ error: "STRIPE_SECRET_KEY not configured — refunds cannot be issued from the CRM" });
  }

  const { paymentIntentId, chargeId, registrationId, reason, policy } = req.body || {};
  const validId = (v, prefix) => typeof v === "string" && v.startsWith(prefix) && v.length <= 100 && /^[\w]+$/.test(v);
  const pi = validId(paymentIntentId, "pi_") ? paymentIntentId : "";
  const ch = validId(chargeId, "ch_") ? chargeId : "";
  if (!pi && !ch) {
    return res.status(400).json({ error: "A valid paymentIntentId (pi_...) or chargeId (ch_...) is required" });
  }
  if (!registrationId || typeof registrationId !== "string" || registrationId.length > 100) {
    return res.status(400).json({ error: "registrationId is required — refunds must be tied to a CRM booking" });
  }

  // Server-side policy gate (same 24h matrix as the CRM UI).
  const policyResult = evaluateRefundPolicyServer(policy);
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

// POST /api/calendly/cancel-booking
// Cancels an ENTIRE scheduled event (all invitees). Gate like refunds: destructive + customer-facing.
// Body: { eventUri: "https://api.calendly.com/scheduled_events/<uuid>", reason?: string }
app.post("/api/calendly/cancel-booking", requireFrontendSecret, requireEditSession, async (req, res) => {
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
  if (!secretsEqual(req.headers["x-admin-token"], token)) return res.status(403).json({ error: "Forbidden" });
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
// requireAdminToken is intentionally omitted: this endpoint is called from the browser during
// Reset to Production. ADMIN_SECRET is a server-side-only secret the browser cannot send.
// Gate like refunds: FRONTEND_SECRET + Edit-capable API session (x-session-token).
app.post("/api/integration/clear-queues", requireFrontendSecret, requireEditSession, (_req, res) => {
  writeQueue([]);
  writeNamedQueue(STRIPE_QUEUE_FILE, []);
  res.json({ status: "cleared", calendly: 0, stripe: 0 });
});

// ── Send Email via Resend ─────────────────────────────────────────────────
const { Resend } = require("resend");
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

app.post("/api/send-email", requireFrontendSecret, requireEditSession, async (req, res) => {
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

    console.log(`[send-email] Sent — id: ${data.id}`);
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
