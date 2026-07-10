import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  amountsMatch,
  reconcileStripePayments,
  resetStripeAutoMatches,
  finalizeRegistrationPaymentStatuses,
  explainPendingVerificationReason,
  confirmRegistrationFreeCoupon,
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
  it("ties a charge to the booking made at the same time (the $29 case)", () => {
    const registrations = [
      reg("rOld", "c1", 55, "2026-05-25T22:19:53.000Z"),
      reg("r9d", "c1", 29, "2026-06-22T08:38:40.000Z"),
    ];
    const payments = [pay("p29", "jeffreywmason@yahoo.com", 29, "2026-06-22T08:39:15.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "r9d");
    const r9d = outReg.find(r => r.id === "r9d");
    assert.equal(r9d.stripeVerified, true);
    assert.equal(r9d.paidAmount, 29);
    assert.equal(outReg.find(r => r.id === "rOld").paidAmount, 0);
  });

  it("pairs each charge with the booking closest in time", () => {
    const registrations = [
      reg("rMorning", "c1", 29, "2026-06-22T08:30:00.000Z"),
      reg("rAfternoon", "c1", 55, "2026-06-22T14:00:00.000Z"),
    ];
    const payments = [
      pay("pMorning", "jeffreywmason@yahoo.com", 29, "2026-06-22T08:39:00.000Z"),
      pay("pAfternoon", "jeffreywmason@yahoo.com", 55, "2026-06-22T14:06:00.000Z"),
    ];
    const { payments: outPay } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "pMorning").bookingId, "rMorning");
    assert.equal(outPay.find(p => p.id === "pAfternoon").bookingId, "rAfternoon");
  });

  it("ties the charge even when the booking list price is blank", () => {
    const registrations = [{ ...reg("rNew", "c1", null, "2026-06-22T08:30:00.000Z") }];
    const payments = [pay("p29", "jeffreywmason@yahoo.com", 29, "2026-06-22T08:39:15.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "rNew");
    assert.equal(outReg.find(r => r.id === "rNew").paidAmount, 29);
  });

  it("does not tie a charge to a booking outside the time window", () => {
    const registrations = [reg("rOld", "c1", 55, "2026-05-01T10:00:00.000Z")];
    const payments = [pay("p29", "jeffreywmason@yahoo.com", 29, "2026-06-22T08:39:15.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, undefined);
    assert.equal(outReg.find(r => r.id === "rOld").stripeVerified, false);
  });

  it("marks booking paid/free when no stripe payment for that participant", () => {
    const registrations = [reg("r1", "c3", 55, "2026-06-21T16:12:00.000Z")];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-21T16:20:00.000Z")];
    const { registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outReg[0].stripeVerified, false);
    assert.equal(outReg[0].paymentStatus, "paid");
    assert.equal(outReg[0].paidAmount, 0);
  });

  it("clears the free-session mismatch once a real payment matches", () => {
    const registrations = [
      { ...reg("r1", "c1", 29, "2026-06-21T16:12:00.000Z"),
        paymentStatus: "paid", paidAmount: 0,
        lastAmountMismatch: { expectedAmount: 29, stripeAmount: 0, reason: "free", correctedAt: "2026-06-21T00:00:00.000Z" } },
    ];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 29, "2026-06-21T16:20:00.000Z")];
    const { registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outReg[0].stripeVerified, true);
    assert.equal(outReg[0].paidAmount, 29);
    assert.equal(outReg[0].lastAmountMismatch, undefined);
  });

  it("preserves a manual link through reset + re-match (sync)", () => {
    const registrations = [
      { ...reg("rOld", "c1", 55, "2026-05-25T22:19:53.000Z") },
      { ...reg("r9d", "c1", 29, "2026-06-22T08:30:00.000Z"),
        stripeVerified: true, paymentStatus: "paid", paidAmount: 29, paymentId: "p29" },
    ];
    const payments = [
      pay("p29", "jeffreywmason@yahoo.com", 29, "2026-06-22T08:39:15.000Z", { bookingId: "r9d", matchStatus: "manual" }),
    ];
    const reset = resetStripeAutoMatches(payments, registrations);
    const { registrations: outReg, payments: outPay } = reconcileStripePayments(reset.payments, reset.registrations, clients);
    const r9d = outReg.find(r => r.id === "r9d");
    assert.equal(r9d.stripeVerified, true);
    assert.equal(r9d.paidAmount, 29);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "r9d");
    assert.equal(outPay.find(p => p.id === "p29").matchStatus, "manual");
  });
});

describe("confirmRegistrationFreeCoupon", () => {
  it("marks the booking free and stores the coupon code", () => {
    const r = {
      ...reg("r1", "c1", 29, "2026-07-09T21:00:00.000Z"),
      paymentStatus: "paid",
      paidAmount: null,
    };
    const out = confirmRegistrationFreeCoupon(r, " welcome100 ");
    assert.equal(out.couponCode, "WELCOME100");
    assert.equal(out.paidAmount, 0);
    assert.equal(out.paymentStatus, "paid");
    assert.equal(out.stripeVerified, false);
    assert.equal(out.lastAmountMismatch?.reason, "free");
    assert.equal(out.lastAmountMismatch?.couponCode, "WELCOME100");
    assert.equal(out.lastAmountMismatch?.expectedAmount, 29);
    assert.equal(out.lastAmountMismatch?.stripeAmount, 0);
  });

  it("preserves operator coupon through finalize", () => {
    const registrations = [
      confirmRegistrationFreeCoupon(
        { ...reg("r1", "c3", 29, "2026-07-09T21:00:00.000Z"), paymentStatus: "paid" },
        "COMP29",
      ),
    ];
    const out = finalizeRegistrationPaymentStatuses(registrations, [], clients);
    assert.equal(out[0].couponCode, "COMP29");
    assert.equal(out[0].paidAmount, 0);
    assert.equal(out[0].paymentStatus, "paid");
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
  it("explains that more recent bookings match first", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-05-25T22:19:53.000Z"), paymentStatus: "pending_verification" },
      { ...reg("r2", "c1", 55, "2026-06-21T16:53:00.000Z"), paymentStatus: "pending_verification" },
    ];
    const payments = [pay("p1", "jeffreywmason@yahoo.com", 1, "2026-06-19T22:46:56.000Z")];
    const reason = explainPendingVerificationReason(registrations[0], payments, registrations, clients);
    assert.match(reason, /More recent bookings/);
  });
});

describe("amountsMatch", () => {
  it("tolerates cent rounding", () => {
    assert.equal(amountsMatch(55, 55.001), true);
  });
});
