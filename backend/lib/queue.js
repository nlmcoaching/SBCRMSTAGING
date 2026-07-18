// Encrypted JSON queue + webhook log helpers (AES-256-GCM at rest).
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const QUEUE_FILE = path.join(DATA_DIR, "pending-events.json");
const STRIPE_QUEUE_FILE = path.join(DATA_DIR, "stripe-pending-events.json");
const WEBHOOK_LOG_FILE = path.join(DATA_DIR, "webhook-events-log.json");
const WEBHOOK_LOG_MAX = 500;

const QUEUE_KEY_HEX_RE = /^[0-9a-f]{64}$/i;
const QUEUE_MAX_SIZE = 1000;  // hard cap on total queued events
const QUEUE_PURGE_DAYS = 7;   // remove processed events older than this

function queueKey() {
  const hex = process.env.QUEUE_ENCRYPTION_KEY;
  // Reject missing OR malformed keys — a short/non-hex value must not silently disable encryption.
  if (!hex || !QUEUE_KEY_HEX_RE.test(hex)) return null;
  return Buffer.from(hex, "hex"); // exactly 32 bytes when hex is 64 chars
}

function encryptPayload(plaintext) {
  const key = queueKey();
  if (!key) return plaintext; // no key → store plaintext (dev mode)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(12) + tag(16) + ciphertext, base64-encoded
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptPayload(stored) {
  const key = queueKey();
  if (!key) return stored; // no key → treat as plaintext

  // Check format first: if not base64 or too short, it is an old plaintext file — safe to use.
  // Minimum encrypted size: iv(12) + tag(16) + 1 byte payload = 29 bytes → base64 >= 40 chars.
  let buf;
  try { buf = Buffer.from(stored, "base64"); } catch { return stored; }
  if (buf.length < 29) return stored; // clearly not our encrypted format → old plaintext migration

  // Crypto errors (including GCM auth-tag mismatch) mean possible tampering — fail closed.
  try {
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const enc = buf.slice(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("[ERROR] Queue file failed GCM authentication — possible tampering:", err.message);
    throw err; // caller quarantines the file — do NOT fall back to raw content
  }
}

/** Rename an unreadable queue file aside so the next write cannot destroy evidence / pending events. */
function quarantineCorruptFile(filePath, reason) {
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
function atomicWriteUtf8(filePath, content) {
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

function readQueueFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf8");
    const json = decryptPayload(raw);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      quarantineCorruptFile(filePath, "decrypted payload is not an array");
      return [];
    }
    return parsed;
  } catch (err) {
    if (fs.existsSync(filePath)) {
      quarantineCorruptFile(filePath, err.message || "read/decrypt failure");
    }
    return [];
  }
}

function pruneQueue(events) {
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

function readQueue() {
  return readQueueFile(QUEUE_FILE);
}

function writeQueue(events) {
  const pruned = pruneQueue(events);
  const json = JSON.stringify(pruned, null, 2);
  atomicWriteUtf8(QUEUE_FILE, encryptPayload(json));
}

function readNamedQueue(filePath) {
  return readQueueFile(filePath);
}

function writeNamedQueue(filePath, events) {
  const pruned = pruneQueue(events);
  const json = JSON.stringify(pruned, null, 2);
  atomicWriteUtf8(filePath, encryptPayload(json));
}

function appendWebhookLog(entry) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let log = [];
    if (fs.existsSync(WEBHOOK_LOG_FILE)) {
      try {
        const raw = fs.readFileSync(WEBHOOK_LOG_FILE, "utf8");
        log = JSON.parse(decryptPayload(raw));
        if (!Array.isArray(log)) log = [];
      } catch { log = []; }
    }
    log.push(entry);
    if (log.length > WEBHOOK_LOG_MAX) log = log.slice(-WEBHOOK_LOG_MAX);
    fs.writeFileSync(WEBHOOK_LOG_FILE, encryptPayload(JSON.stringify(log, null, 2)), "utf8");
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

module.exports = {
  DATA_DIR,
  QUEUE_FILE,
  STRIPE_QUEUE_FILE,
  WEBHOOK_LOG_FILE,
  QUEUE_MAX_SIZE,
  QUEUE_PURGE_DAYS,
  queueKey,
  encryptPayload,
  decryptPayload,
  atomicWriteUtf8,
  quarantineCorruptFile,
  pruneQueue,
  readQueue,
  writeQueue,
  readNamedQueue,
  writeNamedQueue,
  appendWebhookLog,
  withQueueLock,
};
