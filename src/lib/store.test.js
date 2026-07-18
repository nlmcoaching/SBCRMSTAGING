import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

/**
 * Minimal in-memory IndexedDB stub sufficient for store.js open/get/put/delete.
 */
function installMemoryIndexedDB() {
  const dbs = new Map(); // name -> Map(key -> value)

  function makeReq(result, error = null) {
    const req = { result, error, onsuccess: null, onerror: null };
    queueMicrotask(() => {
      if (error) req.onerror?.({ target: req });
      else req.onsuccess?.({ target: req });
    });
    return req;
  }

  class FakeObjectStore {
    constructor(map) { this.map = map; }
    get(key) { return makeReq(this.map.has(key) ? this.map.get(key) : undefined); }
    put(value, key) { this.map.set(key, value); return makeReq(undefined); }
    delete(key) { this.map.delete(key); return makeReq(undefined); }
  }

  class FakeTx {
    constructor(map) {
      this._map = map;
      this.error = null;
      this.oncomplete = null;
      this.onerror = null;
      this.onabort = null;
      queueMicrotask(() => this.oncomplete?.());
    }
    objectStore() { return new FakeObjectStore(this._map); }
  }

  class FakeDB {
    constructor(map) {
      this._map = map;
      this.objectStoreNames = { contains: (n) => n === "kv" };
    }
    transaction() { return new FakeTx(this._map); }
    createObjectStore() { return new FakeObjectStore(this._map); }
  }

  globalThis.indexedDB = {
    open(name) {
      if (!dbs.has(name)) dbs.set(name, new Map());
      const map = dbs.get(name);
      const req = {
        result: null,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      };
      queueMicrotask(() => {
        const db = new FakeDB(map);
        req.result = db;
        // Fire upgrade once for brand-new DB maps (empty)
        if (map._needsUpgrade !== false) {
          req.onupgradeneeded?.({ target: req });
          map._needsUpgrade = false;
        }
        req.onsuccess?.({ target: req });
      });
      return req;
    },
    _dbs: dbs,
    _failOpen: false,
  };

  // Wrap open to support failure injection
  const realOpen = globalThis.indexedDB.open.bind(globalThis.indexedDB);
  globalThis.indexedDB.open = (name, version) => {
    if (globalThis.indexedDB._failOpen) {
      const req = { result: null, error: new Error("idb-blocked"), onsuccess: null, onerror: null, onupgradeneeded: null };
      queueMicrotask(() => req.onerror?.({ target: req }));
      return req;
    }
    return realOpen(name, version);
  };

  return dbs;
}

function installMemoryLocalStorage() {
  const map = new Map();
  globalThis.localStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    _map: map,
  };
  return map;
}

describe("store (IndexedDB + localStorage)", () => {
  let prevIndexedDB;
  let prevLocalStorage;
  let prevWindow;
  let storeMod;

  beforeEach(async () => {
    prevIndexedDB = globalThis.indexedDB;
    prevLocalStorage = globalThis.localStorage;
    prevWindow = globalThis.window;
    globalThis.window = globalThis;
    delete globalThis.window.storage;
    installMemoryLocalStorage();
    installMemoryIndexedDB();
    // Fresh module state (_idbPromise / _idbUnavailable) per test.
    storeMod = await import(`./store.js?t=${Date.now()}-${Math.random()}`);
    storeMod._resetStoreStateForTests();
  });

  afterEach(() => {
    storeMod?._resetStoreStateForTests();
    if (prevIndexedDB === undefined) delete globalThis.indexedDB;
    else globalThis.indexedDB = prevIndexedDB;
    if (prevLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = prevLocalStorage;
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
  });

  it("writes and reads through IndexedDB", async () => {
    const { store } = storeMod;
    await store.set("k1", "cipher-v1");
    const got = await store.get("k1");
    assert.equal(got.value, "cipher-v1");
  });

  it("migrates a localStorage value into IndexedDB on miss", async () => {
    const { store, IDB_NAME } = storeMod;
    localStorage.setItem("legacy", "from-ls");
    const got = await store.get("legacy");
    assert.equal(got.value, "from-ls");
    // Second read should hit IDB (still same value)
    const again = await store.get("legacy");
    assert.equal(again.value, "from-ls");
    assert.ok(indexedDB._dbs.get(IDB_NAME)?.get("legacy") === "from-ls"
      || indexedDB._dbs.get(IDB_NAME)?.has("legacy"));
  });

  it("falls back to localStorage when IndexedDB open fails", async () => {
    const { store } = storeMod;
    localStorage.setItem("safe", "ls-only");
    indexedDB._failOpen = true;
    storeMod._resetStoreStateForTests();
    // Force a new open attempt that fails, then latch unavailable.
    const got = await store.get("safe");
    assert.equal(got.value, "ls-only");
    // Subsequent set should also land in localStorage
    await store.set("safe2", "via-ls");
    assert.equal(localStorage.getItem("safe2"), "via-ls");
  });

  it("prefers window.storage when present", async () => {
    const { store } = storeMod;
    const mem = new Map();
    globalThis.window.storage = {
      async get(key) { return { value: mem.get(key) ?? null }; },
      async set(key, value) { mem.set(key, value); },
      async remove(key) { mem.delete(key); },
    };
    await store.set("canvas", "x");
    assert.equal(mem.get("canvas"), "x");
    const got = await store.get("canvas");
    assert.equal(got.value, "x");
  });

  it("remove clears IndexedDB and localStorage", async () => {
    const { store } = storeMod;
    await store.set("gone", "1");
    localStorage.setItem("gone", "1");
    await store.remove("gone");
    const got = await store.get("gone");
    assert.equal(got.value, null);
  });

  it("available() is always true", () => {
    assert.equal(storeMod.store.available(), true);
  });
});
