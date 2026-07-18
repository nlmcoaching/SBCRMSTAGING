/** Pure amount-mismatch patch (no Vite/api imports — unit-testable under node:test). */
import { amountsMatch } from "./stripeMatching.js";

export function patchAmountMismatches(prevRegs = []) {
  let changed = false;
  const registrations = prevRegs.map(r => {
    if (!r.stripeVerified || r.paidAmount == null) return r;
    const stripeAmt = Number(r.paidAmount);
    if (Number.isNaN(stripeAmt)) return r;

    const hasListPrice = r.paymentAmount != null && r.paymentAmount !== "";
    // Do not call registrationSessionAmount for a missing list price — Number(null)===0
    // would fake an expected amount of $0 and skip the "fill from Stripe" path.
    const expected = hasListPrice ? Number(r.paymentAmount) : null;

    if (expected == null || Number.isNaN(expected)) {
      changed = true;
      return {
        ...r,
        paymentAmount: stripeAmt,
        lastAmountMismatch: {
          expectedAmount: null,
          stripeAmount: stripeAmt,
          correctedAt: new Date().toISOString(),
        },
      };
    }

    if (amountsMatch(expected, stripeAmt)) return r;

    changed = true;
    return {
      ...r,
      paymentAmount: stripeAmt,
      lastAmountMismatch: {
        expectedAmount: expected,
        stripeAmount: stripeAmt,
        correctedAt: new Date().toISOString(),
      },
    };
  });
  return { registrations: changed ? registrations : prevRegs, changed };
}
