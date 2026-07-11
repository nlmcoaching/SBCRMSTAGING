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
  { id: "c1", name: "Alex Rivera", email: "client1@example.com" },
  { id: "c2", name: "Jan Brady", email: "client2@example.com" },
  { id: "c3", name: "Sam Lee", email: "client3@example.com" },
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
    const payments = [pay("p29", "client1@example.com", 29, "2026-06-22T08:39:15.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "r9d");
    const r9d = outReg.find(r => r.id === "r9d");
    assert.equal(r9d.stripeVerified, true);
    assert.equal(r9d.paidAmount, 29);
    // Older priced booking with no remaining charge → unmatched (not silent free $0)
    assert.equal(outReg.find(r => r.id === "rOld").paymentStatus, "unmatched");
    assert.equal(outReg.find(r => r.id === "rOld").paidAmount, null);
  });

  it("pairs each charge with the booking closest in time", () => {
    const registrations = [
      reg("rMorning", "c1", 29, "2026-06-22T08:30:00.000Z"),
      reg("rAfternoon", "c1", 55, "2026-06-22T14:00:00.000Z"),
    ];
    const payments = [
      pay("pMorning", "client1@example.com", 29, "2026-06-22T08:39:00.000Z"),
      pay("pAfternoon", "client1@example.com", 55, "2026-06-22T14:06:00.000Z"),
    ];
    const { payments: outPay } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "pMorning").bookingId, "rMorning");
    assert.equal(outPay.find(p => p.id === "pAfternoon").bookingId, "rAfternoon");
  });

  it("prefers amount match over nearer time when both are in the window", () => {
    // Charge is slightly closer to the $55 booking in time, but amount matches the $29 booking.
    const registrations = [
      reg("r29", "c1", 29, "2026-06-22T08:30:00.000Z"),
      reg("r55", "c1", 55, "2026-06-22T08:50:00.000Z"),
    ];
    const payments = [pay("p29", "client1@example.com", 29, "2026-06-22T08:45:00.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "r29");
    assert.equal(outReg.find(r => r.id === "r29").paidAmount, 29);
    assert.equal(outReg.find(r => r.id === "r55").paymentStatus, "unmatched");
  });

  it("ties the charge even when the booking list price is blank", () => {
    const registrations = [{ ...reg("rNew", "c1", null, "2026-06-22T08:30:00.000Z") }];
    const payments = [pay("p29", "client1@example.com", 29, "2026-06-22T08:39:15.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "rNew");
    assert.equal(outReg.find(r => r.id === "rNew").paidAmount, 29);
  });

  it("does not tie a charge to a booking outside the time window", () => {
    const registrations = [reg("rOld", "c1", 55, "2026-05-01T10:00:00.000Z")];
    const payments = [pay("p29", "client1@example.com", 29, "2026-06-22T08:39:15.000Z")];
    const { payments: outPay, registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, undefined);
    assert.equal(outReg.find(r => r.id === "rOld").stripeVerified, false);
  });

  it("marks priced booking unmatched when Stripe email differs (not silent free $0)", () => {
    const registrations = [reg("r1", "c3", 55, "2026-06-21T16:12:00.000Z")];
    const payments = [pay("p1", "client1@example.com", 1, "2026-06-21T16:20:00.000Z")];
    const { registrations: outReg } = reconcileStripePayments(payments, registrations, clients);
    assert.equal(outReg[0].stripeVerified, false);
    assert.equal(outReg[0].paymentStatus, "unmatched");
    assert.equal(outReg[0].paidAmount, null);
    assert.equal(outReg[0].lastAmountMismatch?.reason, undefined);
  });

  it("clears the free-session mismatch once a real payment matches", () => {
    const registrations = [
      { ...reg("r1", "c1", 29, "2026-06-21T16:12:00.000Z"),
        paymentStatus: "paid", paidAmount: 0,
        lastAmountMismatch: { expectedAmount: 29, stripeAmount: 0, reason: "free", correctedAt: "2026-06-21T00:00:00.000Z" } },
    ];
    const payments = [pay("p1", "client1@example.com", 29, "2026-06-21T16:20:00.000Z")];
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
      pay("p29", "client1@example.com", 29, "2026-06-22T08:39:15.000Z", { bookingId: "r9d", matchStatus: "manual" }),
    ];
    const reset = resetStripeAutoMatches(payments, registrations);
    const { registrations: outReg, payments: outPay } = reconcileStripePayments(reset.payments, reset.registrations, clients);
    const r9d = outReg.find(r => r.id === "r9d");
    assert.equal(r9d.stripeVerified, true);
    assert.equal(r9d.paidAmount, 29);
    assert.equal(outPay.find(p => p.id === "p29").bookingId, "r9d");
    assert.equal(outPay.find(p => p.id === "p29").matchStatus, "manual");
  });

  it("preserves a refunded payment link through reset + re-match (sync)", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-06-22T08:30:00.000Z"),
        stripeVerified: false, paymentStatus: "refunded", paidAmount: 55,
        paymentId: "p1", amountRefunded: 55, refundedAt: "2026-06-23T10:00:00.000Z" },
    ];
    const payments = [
      pay("p1", "client1@example.com", 55, "2026-06-22T08:39:00.000Z", {
        bookingId: "r1", matchStatus: "auto", status: "refunded",
        amountRefunded: 55, refundedAt: "2026-06-23T10:00:00.000Z",
      }),
    ];
    const reset = resetStripeAutoMatches(payments, registrations);
    assert.equal(reset.payments.find(p => p.id === "p1").bookingId, "r1");
    assert.equal(reset.registrations.find(r => r.id === "r1").paymentStatus, "refunded");
    assert.equal(reset.registrations.find(r => r.id === "r1").amountRefunded, 55);

    const { registrations: outReg, payments: outPay } = reconcileStripePayments(
      reset.payments, reset.registrations, clients,
    );
    const r1 = outReg.find(r => r.id === "r1");
    const p1 = outPay.find(p => p.id === "p1");
    assert.equal(p1.bookingId, "r1");
    assert.equal(p1.status, "refunded");
    assert.equal(p1.amountRefunded, 55);
    assert.equal(r1.paymentStatus, "refunded");
    assert.equal(r1.paidAmount, 55);
    assert.equal(r1.amountRefunded, 55);
    assert.equal(r1.paymentId, "p1");
  });

  it("preserves a partial_refund payment link through reset + re-match (sync)", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-06-22T08:30:00.000Z"),
        stripeVerified: true, paymentStatus: "partial_refund", paidAmount: 55,
        paymentId: "p1", amountRefunded: 20 },
    ];
    const payments = [
      pay("p1", "client1@example.com", 55, "2026-06-22T08:39:00.000Z", {
        bookingId: "r1", matchStatus: "auto", status: "partial_refund", amountRefunded: 20,
      }),
    ];
    const reset = resetStripeAutoMatches(payments, registrations);
    const { registrations: outReg, payments: outPay } = reconcileStripePayments(
      reset.payments, reset.registrations, clients,
    );
    assert.equal(outPay.find(p => p.id === "p1").bookingId, "r1");
    const r1 = outReg.find(r => r.id === "r1");
    assert.equal(r1.paymentStatus, "partial_refund");
    assert.equal(r1.paidAmount, 55);
    assert.equal(r1.amountRefunded, 20);
    assert.equal(r1.stripeVerified, true);
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
  it("marks priced bookings unmatched when Stripe email differs (not free)", () => {
    const registrations = [
      { ...reg("r1", "c3", 55, "2026-06-21T16:12:00.000Z"), paymentStatus: "pending_verification" },
    ];
    const payments = [pay("p1", "client1@example.com", 1, "2026-06-21T16:20:00.000Z")];
    const out = finalizeRegistrationPaymentStatuses(registrations, payments, clients);
    assert.equal(out[0].paymentStatus, "unmatched");
    assert.equal(out[0].paidAmount, null);
    assert.equal(out[0].lastAmountMismatch?.reason, undefined);
  });

  it("clears a prior auto-free mark when re-finalizing a priced unmatched booking", () => {
    const registrations = [
      {
        ...reg("r1", "c3", 55, "2026-06-21T16:12:00.000Z"),
        paymentStatus: "paid",
        paidAmount: 0,
        lastAmountMismatch: { expectedAmount: 55, stripeAmount: 0, reason: "free", correctedAt: "2026-06-21T00:00:00.000Z" },
      },
    ];
    const out = finalizeRegistrationPaymentStatuses(registrations, [], clients);
    assert.equal(out[0].paymentStatus, "unmatched");
    assert.equal(out[0].paidAmount, null);
    assert.equal(out[0].lastAmountMismatch, undefined);
  });

  it("keeps pending only when unlinked stripe payment exists", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-06-21T16:12:00.000Z"), paymentStatus: "unknown" },
    ];
    const payments = [pay("p1", "client1@example.com", 1, "2026-06-21T16:20:00.000Z")];
    const out = finalizeRegistrationPaymentStatuses(registrations, payments, clients);
    assert.equal(out[0].paymentStatus, "pending_verification");
  });

  it("still treats zero list price as free paid", () => {
    const registrations = [reg("r1", "c3", 0, "2026-06-21T16:12:00.000Z")];
    const out = finalizeRegistrationPaymentStatuses(registrations, [], clients);
    assert.equal(out[0].paymentStatus, "paid");
    assert.equal(out[0].paidAmount, 0);
  });
});

describe("explainPendingVerificationReason", () => {
  it("explains that more recent bookings match first", () => {
    const registrations = [
      { ...reg("r1", "c1", 55, "2026-05-25T22:19:53.000Z"), paymentStatus: "pending_verification" },
      { ...reg("r2", "c1", 55, "2026-06-21T16:53:00.000Z"), paymentStatus: "pending_verification" },
    ];
    const payments = [pay("p1", "client1@example.com", 1, "2026-06-19T22:46:56.000Z")];
    const reason = explainPendingVerificationReason(registrations[0], payments, registrations, clients);
    assert.match(reason, /More recent bookings/);
  });
});

describe("amountsMatch", () => {
  it("tolerates cent rounding", () => {
    assert.equal(amountsMatch(55, 55.001), true);
  });
});
