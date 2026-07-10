/* ── SECURITY UTILITIES ── */
export const Sec = {
  async hashPin(pin) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },
  newSalt() {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  },
  PBKDF2_ITERATIONS: 600_000,   // OWASP 2024 recommendation
  async deriveKey(pin, saltB64, iterations) {
    const iters = iterations ?? Sec.PBKDF2_ITERATIONS;
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const mat  = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" },
      mat,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },
  async encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key,
      new TextEncoder().encode(JSON.stringify(data))
    );
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv); out.set(new Uint8Array(ct), 12);
    // Use loop instead of spread to avoid stack overflow on large payloads
    let str = "";
    for (let i = 0; i < out.length; i++) str += String.fromCharCode(out[i]);
    return btoa(str);
  },
  async decrypt(b64, key) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const pt  = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12)
    );
    return JSON.parse(new TextDecoder().decode(pt));
  },
  // ── Master key (envelope encryption for multi-user) ──
  async generateMasterKeyB64() {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const raw = await crypto.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  },
  async importMasterKey(b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  },
  async wrapKeyForUser(masterKeyB64, pin, salt, iterations) {
    const wrapKey = await Sec.deriveKey(pin, salt, iterations);
    return Sec.encrypt(masterKeyB64, wrapKey);
  },
  async unwrapKeyForUser(wrappedB64, pin, salt, iterations) {
    const wrapKey = await Sec.deriveKey(pin, salt, iterations);
    const mkB64   = await Sec.decrypt(wrappedB64, wrapKey);
    return { raw: mkB64, key: await Sec.importMasterKey(mkB64) };
  },
  // ── Session restore token (per-login bearer token; hash stored per-user) ──
  // A fresh random token is minted on every unlock and kept ONLY in the originating tab's
  // sessionStorage. Its SHA-256 hash is persisted on that user's record in the (plaintext)
  // user list. On refresh the stored token is re-hashed and compared to the user's hash.
  // Because the hash is one-way and the raw token never leaves the tab that unlocked, a
  // different (lower-privilege) user cannot forge a session for another userId — unlike the
  // previous HMAC, which was keyed by the SHARED master key and so could be recomputed by
  // anyone who had logged in (privilege-escalation fix).
  randomToken() {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  },
  async sessionTokenHash(token) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sb-session-v3:" + token));
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },
  // ── Recovery code (offline PIN reset) ──
  // Generates a cryptographically random 30-char code in 6×5 groups (e.g. A3K9M-...).
  // The master key is wrapped with this code the same way it is with the PIN, using its
  // own salt and a reduced iteration count (100k) since the code itself is already
  // high-entropy random — no dictionary attack risk.
  RECOVERY_PBKDF2_ITERATIONS: 100_000,
  generateRecoveryCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 to avoid visual ambiguity
    const bytes = crypto.getRandomValues(new Uint8Array(30));
    const raw = Array.from(bytes).map(b => chars[b % chars.length]).join("");
    return [0,5,10,15,20,25].map(i => raw.slice(i, i + 5)).join("-");
  },
  sanitize(val) {
    if (typeof val !== "string") return val;
    const t = val.trim();
    const clean = /^[=+\-@|%]/.test(t) ? "'" + t : t;  // neutralise CSV formula injection
    return clean.replace(/<[^>]*>/g, "");                // strip HTML tags
  },
  validate(d) {
    return d && typeof d === "object" &&
      ["clients", "partners", "sessions", "offers"].every(k => Array.isArray(d[k]));
  },
};
