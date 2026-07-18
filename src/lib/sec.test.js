import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Sec } from "./sec.js";

describe("Sec.validatePassphrase", () => {
  it("requires length, a letter, and a number", () => {
    assert.equal(Sec.validatePassphrase("short1A").ok, false);
    assert.equal(Sec.validatePassphrase("abcdefghijkl").ok, false);
    assert.equal(Sec.validatePassphrase("123456789012").ok, false);
    assert.equal(Sec.validatePassphrase("GoodPass1234").ok, true);
    assert.equal(Sec.isWeakPassphrase("GoodPass1234"), false);
    assert.equal(Sec.isWeakPassphrase("weak"), true);
  });
});

describe("Sec.sanitize", () => {
  it("strips HTML and neutralizes CSV formula prefixes", () => {
    assert.equal(Sec.sanitize("  hello  "), "hello");
    assert.equal(Sec.sanitize("<b>x</b>"), "x");
    assert.equal(Sec.sanitize("=cmd()"), "'=cmd()");
    assert.equal(Sec.sanitize("+1"), "'+1");
    assert.equal(Sec.sanitize(12), 12);
  });
});

describe("Sec.validate", () => {
  it("requires core CRM array tables", () => {
    assert.ok(!Sec.validate(null));
    assert.ok(!Sec.validate({}));
    assert.equal(Sec.validate({
      clients: [], partners: [], sessions: [], offers: [],
    }), true);
    assert.ok(!Sec.validate({
      clients: [], partners: [], sessions: "nope", offers: [],
    }));
  });
});

describe("Sec crypto round-trip", () => {
  it("wraps and unwraps a master key with a passphrase", async () => {
    const salt = Sec.newSalt();
    const master = await Sec.generateMasterKeyB64();
    const wrapped = await Sec.wrapKeyForUser(master, "GoodPass1234", salt, 10_000);
    const { raw, key } = await Sec.unwrapKeyForUser(wrapped, "GoodPass1234", salt, 10_000);
    assert.equal(raw, master);
    const payload = { hello: "world", n: 1 };
    const enc = await Sec.encrypt(payload, key);
    assert.notEqual(enc, JSON.stringify(payload));
    assert.deepEqual(await Sec.decrypt(enc, key), payload);
  });

  it("hashes session tokens stably", async () => {
    const a = await Sec.sessionTokenHash("token-a");
    const b = await Sec.sessionTokenHash("token-a");
    const c = await Sec.sessionTokenHash("token-b");
    assert.equal(a, b);
    assert.notEqual(a, c);
  });
});
