// Auth-user registry, session tokens, PIN lockout helpers, and Express guards.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  DATA_DIR,
  encryptPayload,
  decryptPayload,
  atomicWriteUtf8,
} = require("./queue");

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
    json = decryptPayload(raw);
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
  atomicWriteUtf8(AUTH_USERS_FILE, encryptPayload(payload));
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
}, 60 * 60 * 1000).unref();

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
    const allowInsecure = process.env.NODE_ENV !== "production" && process.env.ALLOW_INSECURE_DEV_AUTH === "true";
    if (!allowInsecure) {
      return res.status(503).json({
        error: (process.env.NODE_ENV === "production")
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

// ── Admin token guard (for debug endpoints) ──
function requireAdminToken(req, res, next) {
  const token = process.env.ADMIN_SECRET;
  if (!token) return res.status(503).json({ error: "Admin endpoints disabled — ADMIN_SECRET not configured" });
  if (!secretsEqual(req.headers["x-admin-token"], token)) return res.status(403).json({ error: "Forbidden" });
  next();
}

module.exports = {
  AUTH_USERS_FILE,
  REFUND_SESSION_TTL,
  SESSION_CHALLENGE_TTL,
  SRV_PIN_MAX,
  SRV_PIN_LOCKOUT_MS,
  PIN_CHALLENGE_TTL,
  AuthUsersStoreError,
  readAuthUsers,
  writeAuthUsers,
  loadAuthUsersOr503,
  verifyUnlockProof,
  secretsEqual,
  requireFrontendSecret,
  requireSessionToken,
  requireEditSession,
  requireAdminToken,
  getRefundSessions: () => _refundSessions,
  getSessionChallenges: () => _sessionChallenges,
  pinStatus: _pinStatus,
  issuePinChallenge: _issuePinChallenge,
  consumePinChallenge: _consumePinChallenge,
  clearPinAttempts: (userId) => _pinAttempts.delete(userId),
  setPinAttempt: (userId, rec) => _pinAttempts.set(userId, rec),
  getPinAttempt: (userId) => _pinAttempts.get(userId),
};
