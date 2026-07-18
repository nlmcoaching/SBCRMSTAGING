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
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const { writeQueue, writeNamedQueue, STRIPE_QUEUE_FILE } = require("./lib/queue");
const { requireFrontendSecret, requireEditSession } = require("./lib/authUsers");

const calendlyRoutes = require("./routes/calendly");
const stripeRoutes   = require("./routes/stripe");
const authRoutes     = require("./routes/auth");
const emailRoutes    = require("./routes/email");

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
  hsts: isProd
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
  noSniff: true,
  frameguard: { action: "deny" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hidePoweredBy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
}));

// ── Rate limiting ──
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please slow down" },
});
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many webhook requests" },
});
const emailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email requests — please wait before sending more." },
});
app.use("/api/webhooks/calendly", webhookLimiter);
app.use("/api/webhooks/stripe", webhookLimiter);
app.use("/api/send-email", emailLimiter);
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts — please wait and try again." },
});
app.use("/api/auth/", authLimiter);
app.use("/api/", generalLimiter);

// ── CORS ──
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

// ── Routes ──
app.use("/api", calendlyRoutes);
app.use("/api", stripeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", emailRoutes);

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
