const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { REFUND_POLICY_HOURS, evaluateRefundPolicy } = require("./refundPolicy");

describe("evaluateRefundPolicy", () => {
  it("refunds host cancels any time", () => {
    const r = evaluateRefundPolicy({
      cancelerType: "host",
      canceledAt: "2026-07-17T12:00:00.000Z",
      sessionAt: "2026-07-17T13:00:00.000Z",
    });
    assert.equal(r.eligible, true);
    assert.match(r.reason, /host/i);
  });

  it("refunds client cancels outside the window", () => {
    const r = evaluateRefundPolicy({
      cancelerType: "invitee",
      canceledAt: "2026-07-15T12:00:00.000Z",
      sessionAt: "2026-07-17T12:00:00.000Z",
    });
    assert.equal(r.eligible, true);
    assert.match(r.reason, /before session/);
  });

  it("denies late client cancels", () => {
    const r = evaluateRefundPolicy({
      cancelerType: "invitee",
      canceledAt: "2026-07-17T01:00:00.000Z",
      sessionAt: "2026-07-17T12:00:00.000Z",
    });
    assert.equal(r.eligible, false);
    assert.match(r.reason, new RegExp(String(REFUND_POLICY_HOURS)));
  });

  it("allows unknown timing with a review flag", () => {
    const r = evaluateRefundPolicy({
      cancelerType: "invitee",
      canceledAt: "",
      sessionAt: "",
    });
    assert.equal(r.eligible, true);
    assert.ok(r.flag);
  });

  it("flags unknown canceler types for review", () => {
    const r = evaluateRefundPolicy({
      cancelerType: "system",
      canceledAt: "2026-07-15T12:00:00.000Z",
      sessionAt: "2026-07-17T12:00:00.000Z",
    });
    assert.equal(r.eligible, true);
    assert.match(r.flag || "", /review/i);
  });
});
