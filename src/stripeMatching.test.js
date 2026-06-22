import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amountsMatch,
  reconcileStripePayments,
  resetStripeAutoMatches,
  finalizeRegistrationPaymentStatuses,
  explainPendingVerificationReason,
} from "./stripeMatching.js";

const clients = [
  { id: "c1", name: "Jeff Mason", email: "jeffreywmason@yahoo.com" },
  { id: "c2", name: "Jan Brady", email: "jan@test.com" },
  { id: "c3", name: "Jeffrey Mason", email: "jeff@simplybreathe.ai" },
];

function reg(id, clientId, paymentAmount, createdAt, extra = {}) {
  return {
    id,
    clientId,
    sessionId: "s1",
    status: "booked",
    paymentAmount,
    paymentStatus: "unknown",
    stripeVerified: false,
    createdAt,
    scheduledAt: extra.scheduledAt || createdAt,
    ...extra,
  };
}

function pay(id, email, amount, paidAt, extra = {}) {
  return {
    id,
    status: "paid",
    customerEmail: email,
    amountGross: amount,
    paidAt,
    createdAt: paidAt,
    matchStatus: "unmatched",
    ...extra,
  };
}

describe("reconcileStripePayments", () => {
  it("pairs oldest booking with oldest payment for same email (FIFO)", () => {
    const registrations = [
      reg("r1", "c1", 55, "2026-05-25T22:19:53.000Z"),
      reg("r2", "c1", 55, "2026-06-21T16:53:00.000Z"),
    ];
    const payments = [
      pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-19T22:46:56.000Z"),
      pay("p2", "jeffreywmason@yahoo.com", 1, "2026-06-21T16:53:16.000Z"),
    ];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p1").bookingId, "r1");
    assert.equal(outPay.find(p => p.id === "p2").bookingId, "r2");
    assert.equal(outReg.find(r => r.id === "r1").stripeVerified, true);
    assert.equal(outReg.find(r => r.id === "r2").stripeVerified, true);
  });

  it("marks booking paid/free when no stripe payment for that email", () => {
    const registrations = [reg("r1", "c3", 55, "2026-06-21T16:12:00.000Z")];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-21T16:20:00.000Z")];
    const { registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outReg[0].stripeVerified, false);
    assert.equal(outReg[0].paymentStatus, "paid");
    assert.equal(outReg[0].paidAmount, 0);
  });

  it("leaves only matchable bookings pending when payments are scarce", () => {
    const registrations = [
      reg("r1", "c1", 55, "2026-05-25T22:19:53.000Z"),
      reg("r2", "c1", 55, "2026-06-21T16:53:00.000Z"),
    ];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-19T22:46:56.000Z")];
    const { registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outReg.find(r => r.id === "r1").stripeVerified, true);
    assert.equal(outReg.find(r => r.id === "r2").paymentStatus, "paid");
    assert.equal(outReg.find(r => r.id === "r2").paidAmount, 0);
  });
});

describe("finalizeRegistrationPaymentStatuses", () => {
  it("treats bookings without stripe as free paid sessions with amount mismatch", () => {
    const registrations = [
      { ...reg("r1", "c3", 55, "2026-06-21T16:12:00.000Z"), paymentStatus: "pending_verification" },
    ];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-21T16:20:00.000Z")];
    const out = finalizeRegistrationPaymentStatuses(registrations, payments, clients);
    assert.equal(out[0].paymentStatus, "paid");
    assert.equal(out[0].paidAmount, 0);
    assert.equal(out[0].lastAmountMismatch?.expectedAmount, 55);
    assert.equal(out[0].lastAmountMismatch?.stripeAmount, 0);
    assert.equal(out[0].lastAmountMismatch?.reason, "free");
  });

  it("keeps pending only when unlinked stripe payment exists", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-06-21T16:12:00.000Z"), paymentStatus: "unknown" },
    ];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-21T16:20:00.000Z")];
    const out = finalizeRegistrationPaymentStatuses(registrations, payments, clients);
    assert.equal(out[0].paymentStatus, "pending_verification");
  });
});

describe("explainPendingVerificationReason", () => {
  it("explains fifo queue when earlier bookings exist", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-05-25T22:19:53.000Z"), paymentStatus: "pending_verification" },
      { ...reg("r2", "c1", 55, "2026-06-21T16:53:00.000Z"), paymentStatus: "pending_verification" },
    ];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-19T22:46:56.000Z")];
    const reason = explainPendingVerificationReason(registrations[1], payments, registrations, clients);
    assert.match(reason, /Earlier bookings/);
  });
});

describe("amountsMatch", () => {
  it("tolerates cent rounding", () => {
    assert.equal(amountsMatch(55, 55.001), true);
  });
});
