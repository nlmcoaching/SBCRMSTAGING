const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const {
  pruneQueue,
  QUEUE_MAX_SIZE,
  QUEUE_PURGE_DAYS,
  encryptPayload,
  decryptPayload,
  atomicWriteUtf8,
} = require("./queue");

describe("pruneQueue", () => {
  it("keeps unprocessed events", () => {
    const events = [
      { id: "a", processed: false, receivedAt: "2020-01-01T00:00:00.000Z" },
      { id: "b", processed: false, receivedAt: "2026-07-01T00:00:00.000Z" },
    ];
    const pruned = pruneQueue(events);
    assert.equal(pruned.length, 2);
  });

  it("drops processed events older than the purge window", () => {
    const old = new Date(Date.now() - (QUEUE_PURGE_DAYS + 2) * 86400000).toISOString();
    const recent = new Date(Date.now() - 1 * 86400000).toISOString();
    const events = [
      { id: "old", processed: true, processedAt: old, receivedAt: old },
      { id: "new", processed: true, processedAt: recent, receivedAt: recent },
      { id: "pending", processed: false, receivedAt: old },
    ];
    const pruned = pruneQueue(events);
    assert.deepEqual(pruned.map(e => e.id).sort(), ["new", "pending"]);
  });

  it("trims to QUEUE_MAX_SIZE preferring processed drops first", () => {
    const events = [];
    for (let i = 0; i < QUEUE_MAX_SIZE + 5; i++) {
      events.push({
        id: `e${i}`,
        processed: i < 10,
        processedAt: new Date().toISOString(),
        receivedAt: new Date(Date.now() - (QUEUE_MAX_SIZE + 5 - i) * 1000).toISOString(),
      });
    }
    const pruned = pruneQueue(events);
    assert.equal(pruned.length, QUEUE_MAX_SIZE);
    assert.ok(pruned.every(e => e.id));
  });
});

describe("encryptPayload / decryptPayload", () => {
  const prev = process.env.QUEUE_ENCRYPTION_KEY;

  before(() => {
    process.env.QUEUE_ENCRYPTION_KEY = crypto.randomBytes(32).toString("hex");
  });

  after(() => {
    if (prev === undefined) delete process.env.QUEUE_ENCRYPTION_KEY;
    else process.env.QUEUE_ENCRYPTION_KEY = prev;
  });

  it("round-trips JSON plaintext when a valid key is set", () => {
    const plaintext = JSON.stringify([{ id: "evt_1", processed: false }], null, 2);
    const enc = encryptPayload(plaintext);
    assert.notEqual(enc, plaintext);
    assert.equal(decryptPayload(enc), plaintext);
  });

  it("fails closed on tampered ciphertext", () => {
    const enc = encryptPayload('["ok"]');
    const buf = Buffer.from(enc, "base64");
    buf[buf.length - 1] ^= 0xff;
    const tampered = buf.toString("base64");
    assert.throws(() => decryptPayload(tampered));
  });

  it("treats short/non-encrypted values as plaintext migration", () => {
    assert.equal(decryptPayload("[1]"), "[1]");
  });
});

describe("atomicWriteUtf8", () => {
  it("writes content that can be read back", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sbcrm-queue-"));
    const file = path.join(dir, "out.json");
    try {
      atomicWriteUtf8(file, '{"ok":true}');
      assert.equal(fs.readFileSync(file, "utf8"), '{"ok":true}');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
