import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { patchAmountMismatches } from "./patchAmountMismatches.js";

describe("patchAmountMismatches", () => {
  it("returns the same registrations array reference when nothing changes", () => {
    const registrations = [
      { id: "r1", stripeVerified: true, paymentAmount: 29, paidAmount: 29 },
      { id: "r2", stripeVerified: false, paymentAmount: null, paidAmount: null },
    ];
    const out = patchAmountMismatches(registrations);
    assert.equal(out.changed, false);
    assert.equal(out.registrations, registrations);
  });

  it("fills missing paymentAmount from Stripe paidAmount (stops needsFix loop)", () => {
    const registrations = [
      { id: "r1", stripeVerified: true, paymentAmount: null, paidAmount: 29 },
    ];
    const out = patchAmountMismatches(registrations);
    assert.equal(out.changed, true);
    assert.notEqual(out.registrations, registrations);
    assert.equal(out.registrations[0].paymentAmount, 29);
    assert.equal(out.registrations[0].lastAmountMismatch.expectedAmount, null);
    assert.equal(out.registrations[0].lastAmountMismatch.stripeAmount, 29);

    const again = patchAmountMismatches(out.registrations);
    assert.equal(again.changed, false);
    assert.equal(again.registrations, out.registrations);
  });

  it("corrects mismatched list price to Stripe amount once", () => {
    const registrations = [
      { id: "r1", stripeVerified: true, paymentAmount: 49, paidAmount: 29 },
    ];
    const out = patchAmountMismatches(registrations);
    assert.equal(out.changed, true);
    assert.equal(out.registrations[0].paymentAmount, 29);
    assert.equal(out.registrations[0].lastAmountMismatch.expectedAmount, 49);

    const again = patchAmountMismatches(out.registrations);
    assert.equal(again.changed, false);
    assert.equal(again.registrations, out.registrations);
  });
});
