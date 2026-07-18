import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  readAmt,
  stripeEventInDollars,
  paymentInDollars,
  refundAmountDollars,
  buildStripePaymentRecord,
  processStripeWebhookEvents,
} from "./revenue/index.js";

describe("readAmt / unit helpers", () => {
  it("divides cents when _centsFormat is set", () => {
    assert.equal(readAmt({ amountGross: 5500, _centsFormat: true }, "amountGross"), 55);
    assert.equal(readAmt({ amountRefunded: 2000, _centsFormat: true }, "amountRefunded"), 20);
  });

  it("passes through dollar floats on legacy records", () => {
    assert.equal(readAmt({ amountGross: 55 }, "amountGross"), 55);
  });

  it("stripeEventInDollars strips the flag and converts", () => {
    const out = stripeEventInDollars({
      id: "e1", amountGross: 5500, amountRefunded: 5500, _centsFormat: true, status: "refunded",
    });
    assert.equal(out._centsFormat, undefined);
    assert.equal(out.amountGross, 55);
    assert.equal(out.amountRefunded, 55);
  });

  it("paymentInDollars heals cents rows into dollar floats", () => {
    const out = paymentInDollars({
      id: "p1", amountGross: 5500, amountRefunded: 2000, _centsFormat: true, status: "partial_refund",
    });
    assert.equal(out._centsFormat, undefined);
    assert.equal(out.amountGross, 55);
    assert.equal(out.amountRefunded, 20);
    assert.equal(readAmt(out, "amountGross"), 55);
  });
});

describe("refundAmountDollars", () => {
  it("accepts dollar amounts from the refund API", () => {
    assert.equal(refundAmountDollars(55, 55), 55);
    assert.equal(refundAmountDollars(20.5, 55), 20.5);
  });

  it("converts a mistaken cents integer that matches paid", () => {
    assert.equal(refundAmountDollars(5500, 55), 55);
  });

  it("falls back when amount is missing", () => {
    assert.equal(refundAmountDollars(null, 55), 55);
    assert.equal(refundAmountDollars(undefined, 29), 29);
  });
});

describe("buildStripePaymentRecord", () => {
  it("stores dollars and never copies _centsFormat", () => {
    const p = buildStripePaymentRecord({
      id: "stripe_evt",
      stripeEventId: "evt_1",
      amountGross: 2900,
      amountRefunded: 0,
      _centsFormat: true,
      status: "paid",
      customerEmail: "a@b.com",
    });
    assert.equal(p.amountGross, 29);
    assert.equal(p.amountRefunded, 0);
    assert.equal(p._centsFormat, undefined);
  });
});

describe("processStripeWebhookEvents unit mixing", () => {
  it("merge into a _centsFormat payment writes dollars and drops the flag", () => {
    const prev = {
      payments: [{
        id: "p1",
        stripePaymentIntentId: "pi_1",
        stripeChargeId: "ch_1",
        status: "paid",
        amountGross: 5500,
        amountRefunded: 0,
        _centsFormat: true,
        matchStatus: "auto",
        bookingId: "r1",
        customerEmail: "client1@example.com",
      }],
      registrations: [{
        id: "r1",
        clientId: "c1",
        status: "booked",
        paymentStatus: "paid",
        paidAmount: 55,
        stripeVerified: true,
        paymentId: "p1",
      }],
      clients: [{ id: "c1", email: "client1@example.com" }],
      sessions: [],
      revenue: [],
      offers: [],
    };
    const events = [{
      id: "stripe_ref",
      stripeEventId: "evt_ref",
      stripePaymentIntentId: "pi_1",
      stripeChargeId: "ch_1",
      status: "refunded",
      amountGross: 5500,
      amountRefunded: 5500,
      _centsFormat: true,
      paidAt: "2026-07-10T12:00:00.000Z",
    }];
    const { payments, registrations } = processStripeWebhookEvents(prev, events);
    const p = payments.find(x => x.id === "p1");
    assert.ok(p);
    assert.equal(p._centsFormat, undefined);
    assert.equal(p.amountGross, 55);
    assert.equal(p.amountRefunded, 55);
    assert.equal(p.status, "refunded");
    // Next read must not divide again
    assert.equal(readAmt(p, "amountGross"), 55);
    assert.equal(readAmt(p, "amountRefunded"), 55);
    const r = registrations.find(x => x.id === "r1");
    assert.equal(r.paymentStatus, "refunded");
    assert.equal(r.amountRefunded, 55);
    assert.equal(r.paidAmount, 55);
  });

  it("paid merge does not leave dollars under a cents flag", () => {
    const prev = {
      payments: [{
        id: "p1",
        stripePaymentIntentId: "pi_1",
        status: "paid",
        amountGross: 2900,
        amountRefunded: 0,
        _centsFormat: true,
        matchStatus: "unmatched",
        customerEmail: "",
        description: "",
        stripeChargeId: "",
        receiptUrl: "",
      }],
      registrations: [],
      clients: [],
      sessions: [],
      revenue: [],
      offers: [],
    };
    const events = [{
      id: "stripe_dup",
      stripeEventId: "evt_2",
      stripePaymentIntentId: "pi_1",
      status: "paid",
      amountGross: 2900,
      amountRefunded: 0,
      _centsFormat: true,
      customerEmail: "a@b.com",
      description: "Session",
      stripeChargeId: "ch_2",
      receiptUrl: "https://example.com/r",
    }];
    const { payments } = processStripeWebhookEvents(prev, events);
    const p = payments.find(x => x.id === "p1");
    assert.equal(p._centsFormat, undefined);
    assert.equal(p.amountGross, 29);
    assert.equal(readAmt(p, "amountGross"), 29);
    assert.equal(p.customerEmail, "a@b.com");
  });
});

describe("refunds as negative revenue rows", () => {
  it("emits charge + negative refund rows and no cxlexp expense", async () => {
    const { buildRegistrationRevenueRows, buildBookingLedgerRecords, calcNet } = await import("./revenue/index.js");
    const data = {
      clients: [{ id: "c1", name: "Ada", email: "a@b.com", source: "Calendly" }],
      sessions: [{ id: "s1", name: "Virtual", date: "2026-07-10", locationType: "zoom" }],
      payments: [{
        id: "p1", bookingId: "r1", status: "refunded", amountGross: 55, amountRefunded: 55,
        customerEmail: "a@b.com",
      }],
      registrations: [{
        id: "r1", clientId: "c1", sessionId: "s1", status: "canceled",
        paymentStatus: "refunded", paidAmount: 55, amountRefunded: 55,
        stripeRefundId: "re_123", refundedAt: "2026-07-11T12:00:00.000Z",
        scheduledAt: "2026-07-10T18:00:00.000Z", createdAt: "2026-07-01T10:00:00.000Z",
      }],
    };
    const rows = buildRegistrationRevenueRows(data);
    const charge = rows.find(r => !r.isRefund);
    const refund = rows.find(r => r.isRefund);
    assert.ok(charge);
    assert.equal(charge.gross, 55);
    assert.equal(charge.refunds, 0);
    assert.ok(refund);
    assert.equal(refund.gross, -55);
    assert.equal(refund.stripeRefundId, "re_123");
    assert.equal(Math.round((calcNet(charge) + calcNet(refund)) * 100) / 100, 0);

    const { revenue, expenses } = buildBookingLedgerRecords(data);
    assert.equal(expenses.filter(e => e.category === "Refunds & Cancellations").length, 0);
    assert.ok(revenue.some(r => r.isRefund && r.gross === -55));
  });
});
