/** Cents/dollar unit helpers for Stripe queue events and CRM payment rows. */

export const _c = (v) => Math.round((Number(v) || 0) * 100);

// Read amountGross / amountRefunded from a Stripe payment/queue record.
// Queue/ledger events use integer cents with _centsFormat:true; CRM payment
// records store dollar floats (flag stripped at ingestion / on rewrite).
export const readAmt = (rec, field) => {
  const raw = Number(rec?.[field]) || 0;
  return rec?._centsFormat ? raw / 100 : raw;
};

/** Convert a queue/ledger Stripe event to dollar floats and drop _centsFormat. */
export function stripeEventInDollars(evt) {
  if (!evt || !evt._centsFormat) return evt;
  const { _centsFormat, ...rest } = evt;
  return {
    ...rest,
    amountGross: readAmt(evt, "amountGross"),
    amountRefunded: readAmt(evt, "amountRefunded"),
  };
}

/** CRM payment records always store dollar floats — normalize and drop _centsFormat. */
export function paymentInDollars(p) {
  if (!p) return p;
  if (!p._centsFormat) {
    if (!("_centsFormat" in p)) return p;
    const { _centsFormat, ...rest } = p;
    return rest;
  }
  const { _centsFormat, ...rest } = p;
  return {
    ...rest,
    amountGross: readAmt(p, "amountGross"),
    amountRefunded: readAmt(p, "amountRefunded"),
  };
}

/**
 * Refund API returns `amount` in dollars (server centsToDollars).
 * If a cents integer was stored by mistake, convert when it matches paid±1¢.
 */
export function refundAmountDollars(apiAmount, fallbackDollars = 0) {
  if (apiAmount == null || apiAmount === "") return fallbackDollars;
  const n = Number(apiAmount);
  if (!Number.isFinite(n) || n < 0) return fallbackDollars;
  const paid = Number(fallbackDollars) || 0;
  if (paid > 0 && Number.isInteger(n) && n >= 100 && n > paid + 0.01
      && Math.abs(n / 100 - paid) <= 0.01) {
    return Math.round(n) / 100;
  }
  return n;
}

export const calcNet = (r) =>
  (_c(r.gross) - _c(r.stripeFee) - _c(r.studioSplit) - _c(r.facilitatorCost) - _c(r.refunds)) / 100;
