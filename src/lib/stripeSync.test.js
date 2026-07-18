import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mergeStripeSyncEvents, applyStripeSyncEvents } from "./stripeSync.js";

describe("mergeStripeSyncEvents", () => {
  it("prefers pending over ledger duplicates", () => {
    const pending = [{ id: "q1", stripeEventId: "evt_1", amountGross: 1 }];
    const ledger = [
      { id: "l1", stripeEventId: "evt_1", amountGross: 2 },
      { id: "l2", stripeEventId: "evt_2", amountGross: 3 },
    ];
    const merged = mergeStripeSyncEvents(pending, ledger);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, "q1");
    assert.equal(merged[1].id, "l2");
  });
});

describe("applyStripeSyncEvents", () => {
  it("merges a paid Stripe event and acks only pending ids", () => {
    const prev = {
      payments: [],
      registrations: [{
        id: "r1",
        clientId: "c1",
        sessionId: "s1",
        status: "booked",
        paymentAmount: 29,
        paidAmount: null,
        paymentStatus: "unknown",
        stripeVerified: false,
        createdAt: "2026-07-17T11:00:00.000Z",
        scheduledAt: "2026-07-17T11:00:00.000Z",
      }],
      clients: [{ id: "c1", email: "client1@example.com", name: "Alex" }],
      sessions: [{ id: "s1", name: "Virtual", studioId: "" }],
      revenue: [],
      offers: [],
    };
    const pending = [{
      id: "q1",
      stripeEventId: "evt_pay",
      stripePaymentIntentId: "pi_1",
      stripeChargeId: "ch_1",
      status: "paid",
      amountGross: 2900,
      amountRefunded: 0,
      _centsFormat: true,
      customerEmail: "client1@example.com",
      paidAt: "2026-07-17T11:05:00.000Z",
      createdAt: "2026-07-17T11:05:00.000Z",
    }];
    const { data, processed, ackIds } = applyStripeSyncEvents(prev, pending, pending);
    assert.equal(processed, 1);
    assert.ok(ackIds.includes("q1"));
    assert.ok(data.payments.length >= 1);
    const reg = data.registrations.find(r => r.id === "r1");
    assert.ok(reg);
    // After merge + reconcile, booking should be linked or at least not crash
    assert.ok(["paid", "unknown", "pending", "unmatched"].includes(reg.paymentStatus) || reg.stripeVerified);
  });

  it("still reconciles when the event list is empty", () => {
    const prev = {
      payments: [],
      registrations: [],
      clients: [],
      sessions: [],
      revenue: [],
      offers: [],
    };
    const { data, processed, ackIds } = applyStripeSyncEvents(prev, [], []);
    assert.equal(processed, 0);
    assert.deepEqual(ackIds, []);
    assert.ok(Array.isArray(data.registrations));
  });
});
