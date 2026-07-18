import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  REFUND_POLICY_HOURS,
  evaluateRefundPolicy,
  refundEligibility,
  registrationSessionTimestamp,
} from "./refundPolicy.js";

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
});

describe("refundEligibility", () => {
  const base = {
    status: "canceled",
    paidAmount: 120,
    stripePaymentIntentId: "pi_test",
    cancelerType: "host",
    canceledAt: "2026-07-10T12:00:00.000Z",
    scheduledAt: "2026-07-17T12:00:00.000Z",
  };

  it("requires canceled + stripe payment", () => {
    assert.equal(refundEligibility({ ...base, status: "active" }, {}).eligible, false);
    assert.equal(refundEligibility({ ...base, paidAmount: 0, stripePaymentIntentId: "" }, {}).eligible, false);
  });

  it("skips already-refunded bookings", () => {
    assert.equal(refundEligibility({ ...base, stripeRefundId: "re_1" }, {}).eligible, false);
  });

  it("uses linked session date when scheduledAt missing", () => {
    const data = { sessions: [{ id: "s1", date: "2026-07-20", time: "15:00" }] };
    const ts = registrationSessionTimestamp({ sessionId: "s1" }, data);
    assert.ok(ts > 0);
    const r = refundEligibility({
      ...base,
      cancelerType: "invitee",
      scheduledAt: "",
      sessionId: "s1",
      canceledAt: "2026-07-10T12:00:00.000Z",
    }, data);
    assert.equal(r.eligible, true);
  });
});
