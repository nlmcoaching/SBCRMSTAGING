import { apiHeaders, calendlyApiUrl, fetchWithTimeout } from "./api.js";
import { Sec } from "./sec.js";

/** Register or update a user's unlock secret + role bits on the backend. */
export async function registerUnlockCredential(userId, unlockSecret, { role, canEdit, ownerSessionToken } = {}) {
  if (!userId || !unlockSecret) return false;
  try {
    const headers = { ...apiHeaders() };
    if (ownerSessionToken) headers["x-session-token"] = ownerSessionToken;
    const res = await fetchWithTimeout(calendlyApiUrl("/api/auth/register-unlock"), {
      method: "POST",
      headers,
      body: JSON.stringify({
        userId,
        unlockSecret,
        role: role || "Viewer",
        canEdit: canEdit === true,
      }),
    }, 5000);
    return res.ok;
  } catch (_) {
    return false;
  }
}

/** Owner-only: update role/canEdit for an already-registered user (no secret required). */
export async function setUnlockPermissions(userId, { role, canEdit, ownerSessionToken }) {
  if (!userId || !ownerSessionToken) return false;
  try {
    const res = await fetchWithTimeout(calendlyApiUrl("/api/auth/register-unlock"), {
      method: "POST",
      headers: { ...apiHeaders(), "x-session-token": ownerSessionToken },
      body: JSON.stringify({
        userId,
        role: role || "Viewer",
        canEdit: canEdit === true,
      }),
    }, 5000);
    return res.ok;
  } catch (_) {
    return false;
  }
}

/** Mint a short-lived API session; returns token string or null. */
export async function mintApiSession(userId, unlockSecret) {
  if (!userId || !unlockSecret) return null;
  try {
    const chRes = await fetchWithTimeout(calendlyApiUrl("/api/auth/session-challenge"), {
      method: "GET",
      headers: apiHeaders(false),
    }, 5000);
    if (!chRes.ok) return null;
    const ch = await chRes.json().catch(() => ({}));
    if (!ch.nonce) return null;
    const unlockProof = await Sec.unlockProofHmac(unlockSecret, ch.nonce, userId);
    const res = await fetchWithTimeout(calendlyApiUrl("/api/auth/session"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ userId, nonce: ch.nonce, unlockProof }),
    }, 5000);
    if (!res.ok) return null;
    const j = await res.json().catch(() => ({}));
    return j.token || null;
  } catch (_) {
    return null;
  }
}

/** Try mint; on failure register then mint again. Returns token or null. */
export async function ensureRegisteredAndMint(userId, unlockSecret, opts = {}) {
  let token = await mintApiSession(userId, unlockSecret);
  if (token) return token;
  await registerUnlockCredential(userId, unlockSecret, opts);
  return mintApiSession(userId, unlockSecret);
}

/**
 * Ensure a PIN-wrapped unlock secret on the user, optionally persist it,
 * then register + mint. Returns { token, secret, wrapped }.
 */
export async function ensureUnlockAndMint(user, pin, { role, canEdit, persist } = {}) {
  const iters = user.pbkdf2Iterations ?? Sec.PBKDF2_ITERATIONS;
  let secret = null;
  let wrapped = user.wrappedUnlockSecret || null;
  if (wrapped) {
    try {
      secret = await Sec.unwrapUnlockSecret(wrapped, pin, user.pinSalt, iters);
    } catch (_) {
      secret = null;
      wrapped = null;
    }
  }
  if (!secret) {
    secret = Sec.generateUnlockSecret();
    wrapped = await Sec.wrapUnlockSecret(secret, pin, user.pinSalt, iters);
    if (typeof persist === "function") {
      await persist(wrapped);
    }
  }
  const edit = canEdit ?? !!(user.permissions?.edit);
  const r = role || user.role || "Viewer";
  const token = await ensureRegisteredAndMint(user.id, secret, { role: r, canEdit: edit });
  return { token, secret, wrapped };
}
