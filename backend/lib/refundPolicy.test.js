const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { REFUND_POLICY_HOURS, evaluateRefundPolicy, attestRefundPolicy, findCalendlyCancellation } = require("./refundPolicy");

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

describe("attestRefundPolicy", () => {
  it("ignores unattested host claims (cannot bypass 24h window)", () => {
    const r = attestRefundPolicy({
      cancelerType: "host",
      canceledAt: "2026-07-17T11:00:00.000Z",
      sessionAt: "2026-07-17T12:00:00.000Z",
    }, null);
    assert.equal(r.eligible, false);
  });

  it("prefers server-stored cancelerType over body hint", () => {
    const r = attestRefundPolicy(
      { cancelerType: "host", canceledAt: "2026-07-17T11:00:00.000Z", sessionAt: "2026-07-17T12:00:00.000Z" },
      { cancelerType: "invitee", canceledAt: "2026-07-17T11:00:00.000Z", startTime: "2026-07-17T12:00:00.000Z" },
    );
    assert.equal(r.eligible, false);
    assert.match(r.reason, /Late cancel/);
  });

  it("honors attested host cancels", () => {
    const r = attestRefundPolicy(
      { cancelerType: "invitee" },
      { cancelerType: "host", canceledAt: "2026-07-17T11:00:00.000Z", startTime: "2026-07-17T12:00:00.000Z" },
    );
    assert.equal(r.eligible, true);
    assert.match(r.reason, /host/i);
  });
});

describe("findCalendlyCancellation", () => {
  it("returns the latest invitee.canceled for a URI", () => {
    const uri = "https://api.calendly.com/scheduled_events/e/invitees/i";
    const found = findCalendlyCancellation([
      { eventType: "invitee.created", calendlyInviteeUri: uri },
      { eventType: "invitee.canceled", calendlyInviteeUri: uri, cancelerType: "invitee" },
      { eventType: "invitee.canceled", calendlyInviteeUri: uri, cancelerType: "host" },
    ], uri);
    assert.equal(found.cancelerType, "host");
  });
});
