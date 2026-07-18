import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { notify, subscribeNotify } from "./notify.js";

describe("notify", () => {
  it("delivers toasts to subscribers with default error type", () => {
    const seen = [];
    const unsub = subscribeNotify((t) => seen.push(t));
    notify("boom");
    unsub();
    assert.equal(seen.length, 1);
    assert.equal(seen[0].message, "boom");
    assert.equal(seen[0].type, "error");
  });

  it("supports typed helpers", () => {
    const types = [];
    const unsub = subscribeNotify((t) => types.push(t.type));
    notify.success("ok");
    notify.warning("careful");
    notify.info("note");
    unsub();
    assert.deepEqual(types, ["success", "warning", "info"]);
  });

  it("unsubscribes cleanly", () => {
    let calls = 0;
    const unsub = subscribeNotify(() => { calls += 1; });
    unsub();
    notify.error("gone");
    assert.equal(calls, 0);
  });
});
