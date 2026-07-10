import { SEC_META_KEY } from "./api.js";
import { _idbGet, _idbSet, _idbRemove, store } from "./store.js";
import { Sec } from "./sec.js";

/** Encrypted security metadata (users, wrapped keys, salts). */
export const SEC_META_ENC_KEY = "sb:security:v1:enc";
/** Device-local AES key for SEC_META_ENC — IDB preferred; never written to CRM backups. */
const SEC_DEVICE_KEY = "sb:security:device-key:v1";

async function loadOrCreateDeviceKeyB64() {
  // Prefer IndexedDB so a localStorage-only scrape cannot decrypt the vault.
  try {
    const existing = await _idbGet(SEC_DEVICE_KEY);
    if (typeof existing === "string" && existing.length > 20) return existing;
  } catch { /* fall through */ }

  // Legacy / no-IDB: check localStorage once, then migrate into IDB.
  let fromLs = null;
  try {
    fromLs = typeof localStorage !== "undefined" ? localStorage.getItem(SEC_DEVICE_KEY) : null;
  } catch { /* ignore */ }

  const keyB64 = fromLs && fromLs.length > 20 ? fromLs : await Sec.generateMasterKeyB64();

  try {
    await _idbSet(SEC_DEVICE_KEY, keyB64);
  } catch { /* IDB unavailable */ }

  // Do not keep the device key in localStorage once IDB has it.
  if (fromLs) {
    try { localStorage.removeItem(SEC_DEVICE_KEY); } catch { /* ignore */ }
  } else {
    // If IDB write failed, last-resort persist so the vault remains readable this session.
    try {
      const idbCheck = await _idbGet(SEC_DEVICE_KEY);
      if (!idbCheck && typeof localStorage !== "undefined") {
        localStorage.setItem(SEC_DEVICE_KEY, keyB64);
      }
    } catch {
      try {
        if (typeof localStorage !== "undefined") localStorage.setItem(SEC_DEVICE_KEY, keyB64);
      } catch { /* ignore */ }
    }
  }
  return keyB64;
}

async function encryptMeta(obj) {
  const keyB64 = await loadOrCreateDeviceKeyB64();
  const cryptoKey = await Sec.importMasterKey(keyB64);
  return Sec.encrypt(obj, cryptoKey);
}

async function decryptMeta(b64) {
  const keyB64 = await loadOrCreateDeviceKeyB64();
  const cryptoKey = await Sec.importMasterKey(keyB64);
  return Sec.decrypt(b64, cryptoKey);
}

/**
 * Load security metadata. Migrates legacy plaintext `sb:security:v1` into
 * the encrypted vault on first successful read.
 */
export async function loadSecMeta() {
  // 1) Encrypted vault
  try {
    const enc = await store.get(SEC_META_ENC_KEY);
    if (enc?.value) {
      const parsed = await decryptMeta(enc.value);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch (e) {
    console.warn("[secMeta] Failed to decrypt security vault:", e?.message || e);
  }

  // 2) Legacy plaintext — migrate
  try {
    const legacy = await store.get(SEC_META_KEY);
    if (legacy?.value) {
      const parsed = JSON.parse(legacy.value);
      if (parsed && typeof parsed === "object") {
        await saveSecMeta(parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn("[secMeta] Failed to read legacy security meta:", e?.message || e);
  }

  return null;
}

/** Persist security metadata encrypted; scrub legacy plaintext copies. */
export async function saveSecMeta(obj) {
  const payload = obj && typeof obj === "object" ? obj : { version: 2, users: [] };
  const cipher = await encryptMeta(payload);
  await store.set(SEC_META_ENC_KEY, cipher);
  // Remove plaintext legacy from IDB + localStorage
  try { await store.remove(SEC_META_KEY); } catch { /* ignore */ }
  try { await _idbRemove(SEC_META_KEY); } catch { /* ignore */ }
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(SEC_META_KEY);
  } catch { /* ignore */ }
  return payload;
}
