const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calendlyEventPayloadChanged,
  isRecentCalendlyBooking,
  isSyntheticCalendlyUri,
  planCalendlyQueueCandidates,
  REQUEUE_RECENT_MS,
} = require("./calendly");

const INV = "https://api.calendly.com/scheduled_events/abc/invitees/xyz";
const EVT = "https://api.calendly.com/scheduled_events/abc";

function booking(extra = {}) {
  return {
    id: "evt_1",
    calendlyInviteeUri: INV,
    calendlyEventUri: EVT,
    eventType: "invitee.created",
    name: "Alex",
    email: "a@ex.com",
    eventName: "Breathwork",
    startTime: "2026-07-20T18:00:00.000Z",
    endTime: "2026-07-20T19:00:00.000Z",
    phone: "",
    createdAt: "2026-07-10T12:00:00.000Z",
    processed: false,
    ...extra,
  };
}

describe("isSyntheticCalendlyUri", () => {
  it("flags signature-test URIs only", () => {
    assert.equal(isSyntheticCalendlyUri(""), false);
    assert.equal(isSyntheticCalendlyUri(INV), false);
    assert.equal(isSyntheticCalendlyUri("https://api.calendly.com/scheduled_events/TEST"), true);
    assert.equal(isSyntheticCalendlyUri("https://api.calendly.com/scheduled_events/x/invitees/TEST"), true);
  });
});

describe("calendlyEventPayloadChanged", () => {
  it("detects identity/schedule edits", () => {
    const a = booking();
    assert.equal(calendlyEventPayloadChanged(a, booking()), false);
    assert.equal(calendlyEventPayloadChanged(a, booking({ name: "Sam" })), true);
    assert.equal(calendlyEventPayloadChanged(a, booking({ startTime: "2026-07-21T18:00:00.000Z" })), true);
  });
});

describe("isRecentCalendlyBooking", () => {
  it("uses the requeue window from a fixed now", () => {
    const now = Date.parse("2026-07-17T12:00:00.000Z");
    assert.equal(
      isRecentCalendlyBooking({ createdAt: "2026-07-16T12:00:00.000Z" }, now),
      true,
    );
    assert.equal(
      isRecentCalendlyBooking({ createdAt: new Date(now - REQUEUE_RECENT_MS - 1000).toISOString() }, now),
      false,
    );
  });
});

describe("planCalendlyQueueCandidates", () => {
  const now = Date.parse("2026-07-17T12:00:00.000Z");

  it("adds new invitee+type keys", () => {
    const r = planCalendlyQueueCandidates([], [booking()], now);
    assert.equal(r.added, 1);
    assert.equal(r.skipped, 0);
    assert.equal(r.queue.length, 1);
  });

  it("skips duplicates while still unprocessed", () => {
    const existing = booking({ id: "kept" });
    const r = planCalendlyQueueCandidates([existing], [booking({ id: "dup" })], now);
    assert.equal(r.added, 0);
    assert.equal(r.skipped, 1);
    assert.equal(r.queue[0].id, "kept");
  });

  it("allows cancel + created for the same invitee", () => {
    const created = booking({ eventType: "invitee.created" });
    const canceled = booking({ id: "evt_c", eventType: "invitee.canceled" });
    const r = planCalendlyQueueCandidates([created], [canceled], now);
    assert.equal(r.added, 1);
    assert.equal(r.queue.length, 2);
  });

  it("skips synthetic TEST URIs", () => {
    const r = planCalendlyQueueCandidates([], [booking({
      calendlyInviteeUri: "https://api.calendly.com/scheduled_events/x/invitees/TEST",
    })], now);
    assert.equal(r.added, 0);
    assert.equal(r.skipped, 1);
  });

  it("requeues processed events when payload changed", () => {
    const existing = booking({
      id: "kept",
      processed: true,
      processedAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const r = planCalendlyQueueCandidates(
      [existing],
      [booking({ name: "Alex Updated", createdAt: "2026-01-01T00:00:00.000Z" })],
      now,
    );
    assert.equal(r.requeued, 1);
    assert.equal(r.added, 1);
    assert.equal(r.queue[0].id, "kept");
    assert.equal(r.queue[0].processed, false);
    assert.equal(r.queue[0].name, "Alex Updated");
  });

  it("requeues recent processed bookings for CRM heal", () => {
    const existing = booking({
      id: "kept",
      processed: true,
      processedAt: "2026-07-16T00:00:00.000Z",
      createdAt: "2026-07-16T12:00:00.000Z",
    });
    const r = planCalendlyQueueCandidates([existing], [booking({
      createdAt: "2026-07-16T12:00:00.000Z",
    })], now);
    assert.equal(r.requeued, 1);
    assert.equal(r.queue[0].processed, false);
  });

  it("skips old unchanged processed bookings", () => {
    const existing = booking({
      id: "kept",
      processed: true,
      processedAt: "2026-01-02T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const r = planCalendlyQueueCandidates(
      [existing],
      [booking({ createdAt: "2026-01-01T00:00:00.000Z" })],
      now,
    );
    assert.equal(r.added, 0);
    assert.equal(r.skipped, 1);
    assert.equal(r.queue[0].processed, true);
  });
});
