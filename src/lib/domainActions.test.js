import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  refreshAfterRegistrations,
  upsertRegistration,
  cancelRegistration,
  confirmFreeCoupon,
  applyPaymentLookupPatch,
  applyStripeRefundLocal,
  deleteClientCascade,
  patchRegistration,
} from "./domainActions.js";

function baseData(overrides = {}) {
  return {
    clients: [
      { id: "c1", name: "Alex", lifetimeValue: 0 },
      { id: "c2", name: "Blake", lifetimeValue: 0 },
    ],
    sessions: [
      {
        id: "se-v",
        name: "Virtual 1:1",
        studioId: "",
        locationType: "zoom",
        calendlyEventUri: "https://calendly.com/e/v",
        registered: 1,
        revenue: 0,
        netRevenue: 0,
      },
      {
        id: "se-s",
        name: "Studio class",
        studioId: "sp1",
        registered: 2,
        revenue: 100,
        pricePerSeat: 35,
        paidAttendees: 2,
      },
    ],
    registrations: [
      {
        id: "r1",
        clientId: "c1",
        sessionId: "se-v",
        status: "booked",
        paymentStatus: "paid",
        stripeVerified: true,
        paidAmount: 55,
        paymentId: "pay1",
        stripePaymentIntentId: "pi_1",
        calendlyInviteeUri: "https://calendly.com/i/1",
        eventName: "Virtual 1:1",
      },
      {
        id: "r2",
        clientId: "c1",
        sessionId: "se-s",
        status: "booked",
        paymentStatus: "paid",
        stripeVerified: true,
        paidAmount: 35,
      },
      {
        id: "r3",
        clientId: "c2",
        sessionId: "se-s",
        status: "booked",
        paymentStatus: "paid",
        stripeVerified: true,
        paidAmount: 35,
      },
    ],
    revenue: [],
    payments: [
      {
        id: "pay1",
        clientId: "c1",
        bookingId: "r1",
        stripePaymentIntentId: "pi_1",
        status: "paid",
        amountGross: 55,
        amountRefunded: 0,
      },
    ],
    expenses: [{ id: "ex1", clientId: "c1", amount: 10 }],
    sequences: [{ id: "sq1", clientId: "c1", status: "active" }],
    followups: [{ id: "f1", clientId: "c1", name: "Check-in" }],
    offers: [{ id: "o1", clientId: "c1", status: "Draft", price: 200 }],
    testimonials: [{ id: "t1", clientId: "c1", quote: "Great" }],
    referrals: [
      { id: "ref1", referrerId: "c1", referredName: "Sam", referredId: "" },
      { id: "ref2", referrerId: "c2", referredId: "c1", referredName: "Alex" },
      { id: "ref3", referrerId: "c2", referredName: "Other", referredId: "" },
    ],
    ...overrides,
  };
}

describe("refreshAfterRegistrations / upsertRegistration", () => {
  it("refreshes client LTV and virtual session revenue from Stripe-verified paid amount", () => {
    const data = baseData();
    const next = upsertRegistration(data, {
      ...data.registrations[0],
      paidAmount: 80,
    });
    const client = next.clients.find(c => c.id === "c1");
    assert.equal(client.lifetimeValue, 80 + 35);
    const virt = next.sessions.find(s => s.id === "se-v");
    assert.equal(virt.revenue, 80);
    assert.equal(virt.netRevenue, 80);
  });

  it("excludes rescheduled bookings from studio registered recount", () => {
    const withReschedule = {
      ...baseData(),
      registrations: [
        ...baseData().registrations,
        {
          id: "r4",
          clientId: "c2",
          sessionId: "se-s",
          status: "rescheduled",
          paymentStatus: "paid",
          stripeVerified: true,
          paidAmount: 35,
        },
      ],
    };
    const next = refreshAfterRegistrations(withReschedule, withReschedule.registrations);
    assert.equal(next.sessions.find(s => s.id === "se-s").registered, 2);
  });

  it("recounts studio registered without overwriting studio revenue fields", () => {
    const data = baseData();
    const next = upsertRegistration(data, {
      id: "r4",
      clientId: "c2",
      sessionId: "se-s",
      status: "booked",
      paymentStatus: "paid",
      stripeVerified: true,
      paidAmount: 35,
    });
    const studio = next.sessions.find(s => s.id === "se-s");
    assert.equal(studio.registered, 3);
    assert.equal(studio.revenue, 100);
    assert.equal(studio.pricePerSeat, 35);
    assert.equal(studio.paidAttendees, 2);
  });
});

describe("cancelRegistration", () => {
  it("marks canceled, recounts studio registered, does not delete session", () => {
    const data = baseData();
    const next = cancelRegistration(data, "r2");
    const reg = next.registrations.find(r => r.id === "r2");
    assert.equal(reg.status, "canceled");
    assert.equal(reg.cancelerType, "host");
    assert.ok(reg.canceledAt);
    const studio = next.sessions.find(s => s.id === "se-s");
    assert.equal(studio.registered, 1);
    assert.ok(next.sessions.find(s => s.id === "se-s"));
    assert.ok(next.sessions.find(s => s.id === "se-v"));
    const client = next.clients.find(c => c.id === "c1");
    assert.equal(client.lifetimeValue, 55);
  });

  it("is a no-op when already canceled", () => {
    const data = baseData();
    data.registrations[1] = { ...data.registrations[1], status: "canceled" };
    const next = cancelRegistration(data, "r2");
    assert.equal(next, data);
  });
});

describe("confirmFreeCoupon", () => {
  it("stamps coupon and refreshes LTV to exclude unpaid Stripe amount", () => {
    const data = baseData({
      registrations: [
        {
          id: "r1",
          clientId: "c1",
          sessionId: "se-v",
          status: "booked",
          paymentStatus: "pending_verification",
          paymentAmount: 55,
          stripeVerified: false,
          paidAmount: null,
        },
      ],
    });
    const next = confirmFreeCoupon(data, "r1", "WELCOME100");
    const reg = next.registrations.find(r => r.id === "r1");
    assert.equal(reg.couponCode, "WELCOME100");
    assert.equal(reg.paidAmount, 0);
    assert.equal(reg.paymentStatus, "paid");
    const client = next.clients.find(c => c.id === "c1");
    assert.equal(client.lifetimeValue, 0);
  });
});

describe("applyPaymentLookupPatch", () => {
  it("applies invitee URI prices and refreshes LTV", () => {
    const data = baseData({
      registrations: [
        {
          id: "r1",
          clientId: "c1",
          sessionId: "se-v",
          status: "booked",
          calendlyInviteeUri: "https://calendly.com/i/1",
          paymentStatus: "unknown",
          stripeVerified: false,
        },
      ],
    });
    const next = applyPaymentLookupPatch(data, {
      payments: {
        "https://calendly.com/i/1": { paymentAmount: 0, paidAmount: 0, paymentSuccessful: true },
      },
    });
    assert.equal(next.registrations[0].paymentAmount, 0);
    assert.equal(next.registrations[0].paymentStatus, "paid");
  });
});

describe("applyStripeRefundLocal", () => {
  it("stamps refund on reg + payment and drops LTV for that charge", () => {
    const data = baseData();
    const reg = data.registrations[0];
    const next = applyStripeRefundLocal(data, reg, {
      amountRefunded: 55,
      stripeRefundId: "re_1",
      refundedAt: "2026-07-01T00:00:00.000Z",
    });
    const updated = next.registrations.find(r => r.id === "r1");
    assert.equal(updated.paymentStatus, "refunded");
    assert.equal(updated.amountRefunded, 55);
    assert.equal(updated.stripeRefundId, "re_1");
    const pay = next.payments.find(p => p.id === "pay1");
    assert.equal(pay.status, "refunded");
    assert.equal(pay.amountRefunded, 55);
    const client = next.clients.find(c => c.id === "c1");
    assert.equal(client.lifetimeValue, 35);
    const virt = next.sessions.find(s => s.id === "se-v");
    assert.equal(virt.revenue, 0);
  });
});

describe("patchRegistration", () => {
  it("applies mapFn and refreshes side effects", () => {
    const data = baseData();
    const next = patchRegistration(data, "r1", r => ({ ...r, refundWaived: true }));
    assert.equal(next.registrations.find(r => r.id === "r1").refundWaived, true);
  });
});

describe("deleteClientCascade", () => {
  it("deletes booking deps, clears money clientId, recounts sessions", () => {
    const data = baseData();
    const next = deleteClientCascade(data, "c1");
    assert.equal(next.clients.some(c => c.id === "c1"), false);
    assert.equal(next.clients.some(c => c.id === "c2"), true);
    assert.equal((next.registrations || []).some(r => r.clientId === "c1"), false);
    assert.equal((next.sequences || []).length, 0);
    assert.equal((next.followups || []).length, 0);
    assert.equal((next.offers || []).length, 0);
    assert.equal((next.testimonials || []).length, 0);
    assert.equal((next.referrals || []).some(r => r.id === "ref1" || r.id === "ref2"), false);
    assert.equal((next.referrals || []).some(r => r.id === "ref3"), true);
    assert.equal(next.payments.find(p => p.id === "pay1").clientId, "");
    assert.equal(next.expenses.find(e => e.id === "ex1").clientId, "");
    const studio = next.sessions.find(s => s.id === "se-s");
    assert.equal(studio.registered, 1);
    const remaining = next.registrations.find(r => r.id === "r3");
    assert.ok(remaining);
  });

  it("is a no-op when client is missing", () => {
    const data = baseData();
    assert.equal(deleteClientCascade(data, "missing"), data);
  });
});

describe("refreshAfterRegistrations", () => {
  it("accepts an explicit registrations array", () => {
    const data = baseData();
    const regs = data.registrations.filter(r => r.id !== "r2");
    const next = refreshAfterRegistrations(data, regs);
    assert.equal(next.registrations.length, 2);
    assert.equal(next.sessions.find(s => s.id === "se-s").registered, 1);
  });
});
