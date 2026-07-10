// ── IndexedDB key/value backend ──────────────────────────────────────────────
// localStorage has a hard ~5 MB per-origin cap and throws QuotaExceededError when full, which
// silently breaks saving once the encrypted dataset + agreement blobs grow large. IndexedDB offers
// hundreds of MB to GBs, so the encrypted store lives here. Existing localStorage values are
// migrated lazily on first read so no data is lost on upgrade.
export const IDB_NAME = "simplybreathe";
export const IDB_STORE = "kv";
export let _idbPromise = null;
export function _idbOpen() {
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no-indexeddb")); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idbPromise;
}
export function _idbGet(key) {
  return _idbOpen().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}
export function _idbSet(key, value) {
  return _idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}
export function _idbRemove(key) {
  return _idbOpen().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

// Unified storage — window.storage (Cursor canvas) → IndexedDB → localStorage (last-resort fallback)
export const store = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        return window.storage.get(key);
      }
      if (typeof indexedDB !== "undefined") {
        const v = await _idbGet(key);
        if (v != null) return { value: v };
        // Lazy migration: pull a pre-existing localStorage value into IndexedDB once.
        const ls = (typeof localStorage !== "undefined") ? localStorage.getItem(key) : null;
        if (ls != null) { try { await _idbSet(key, ls); } catch { /* ignore */ } }
        return { value: ls };
      }
      return { value: localStorage.getItem(key) };
    } catch { return { value: null }; }
  },
  async set(key, value) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        return await window.storage.set(key, value);
      }
      if (typeof indexedDB !== "undefined") {
        await _idbSet(key, value);
        // Best-effort: drop the now-stale localStorage copy so it stops consuming the 5 MB cap.
        try { if (typeof localStorage !== "undefined") localStorage.removeItem(key); } catch { /* ignore */ }
        return;
      }
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("[SBCRM store.set] FAILED for key " + key + " (value " + (typeof value === "string" ? value.length : 0) + " chars):", e);
      throw e;
    }
  },
  async remove(key) {
    try {
      if (typeof window !== "undefined" && window.storage?.remove) {
        return window.storage.remove(key);
      }
      if (typeof indexedDB !== "undefined") { await _idbRemove(key); }
      if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    } catch { /* storage unavailable */ }
  },
  available() { return true; }, // store always works via a fallback
};
