// Auth routes: session mint, unlock registration, PIN lockout.
const express = require("express");
const crypto = require("crypto");
const {
  REFUND_SESSION_TTL,
  SESSION_CHALLENGE_TTL,
  SRV_PIN_MAX,
  SRV_PIN_LOCKOUT_MS,
  PIN_CHALLENGE_TTL,
  writeAuthUsers,
  loadAuthUsersOr503,
  verifyUnlockProof,
  requireFrontendSecret,
  getRefundSessions,
  getSessionChallenges,
  pinStatus,
  issuePinChallenge,
  consumePinChallenge,
  clearPinAttempts,
  setPinAttempt,
  getPinAttempt,
} = require("../lib/authUsers");

const router = express.Router();

// GET /api/auth/session-challenge — one-shot nonce required to mint an API session.
router.get("/session-challenge", requireFrontendSecret, (req, res) => {
  const nonce = crypto.randomBytes(24).toString("hex");
  getSessionChallenges().set(nonce, { exp: Date.now() + SESSION_CHALLENGE_TTL });
  res.json({ nonce, expiresInMs: SESSION_CHALLENGE_TTL });
});

// POST /api/auth/register-unlock — register/update per-user unlock secret + role bits.
// Body: { userId, unlockSecret?, role?, canEdit?, nonce?, unlockProof? }
// - Empty registry: bootstrap (first Owner setup) — requires unlockSecret; trusts canEdit
// - Owner session: create/update anyone (unlockSecret required only when creating or rotating)
// - Existing user + valid HMAC proof: rotate secret only (role unchanged)
// - New userId without Owner session: allowed with unlockSecret; canEdit forced false, role forced Viewer
router.post("/register-unlock", requireFrontendSecret, (req, res) => {
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
  const sessionMeta = sessionTok ? getRefundSessions().get(sessionTok) : null;
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
    const challenge = getSessionChallenges().get(nonce);
    getSessionChallenges().delete(nonce);
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
    // Self-registration: never trust client-supplied role/canEdit (privilege escalation).
    if (!hasSecret) return res.status(400).json({ error: "unlockSecret required" });
    nextSecret = unlockSecret;
    nextCanEdit = false;
    nextRole = "Viewer";
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
router.post("/session", requireFrontendSecret, (req, res) => {
  const { userId, nonce, unlockProof } = req.body ?? {};
  if (!userId || typeof userId !== "string" || userId.length > 80) {
    return res.status(400).json({ error: "userId required" });
  }
  if (!nonce || typeof nonce !== "string") {
    return res.status(400).json({ error: "session challenge nonce required — call GET /api/auth/session-challenge first" });
  }
  const challenge = getSessionChallenges().get(nonce);
  getSessionChallenges().delete(nonce); // one-shot regardless of outcome
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
  getRefundSessions().set(token, meta);
  res.json({ token, expiresInMs: REFUND_SESSION_TTL, userId, role: meta.role, canEdit: meta.canEdit });
});

// GET /api/auth/pin-status?userId=<id>
router.get("/pin-status", requireFrontendSecret, (req, res) => {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId required" });
  const status = pinStatus(userId);
  const challenge = issuePinChallenge(userId);
  res.json({ ...status, challenge, challengeExpiresInMs: PIN_CHALLENGE_TTL });
});

// POST /api/auth/pin-attempt — { userId, failed: boolean, challenge: string }
router.post("/pin-attempt", requireFrontendSecret, (req, res) => {
  const { userId, failed, challenge } = req.body ?? {};
  if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId required" });
  if (!consumePinChallenge(userId, challenge)) {
    return res.status(401).json({ error: "Invalid or expired PIN challenge — call GET /api/auth/pin-status first" });
  }
  if (!failed) {
    clearPinAttempts(userId);
    return res.json({ locked: false, lockedUntil: 0, attemptsLeft: SRV_PIN_MAX, attemptsMax: SRV_PIN_MAX });
  }
  const now = Date.now();
  const rec = getPinAttempt(userId) || { count: 0, lockedUntil: 0 };
  // Already locked — don't double-count; let the TTL expire naturally
  if (rec.lockedUntil > now) return res.json(pinStatus(userId));
  const newCount = rec.count + 1;
  const lockedUntil = newCount >= SRV_PIN_MAX ? now + SRV_PIN_LOCKOUT_MS : 0;
  setPinAttempt(userId, { count: newCount, lockedUntil });
  if (lockedUntil) {
    console.warn(`[AUTH] PIN lockout triggered for user ${userId} at ${new Date().toISOString()}`);
  }
  res.json(pinStatus(userId));
});

module.exports = router;
