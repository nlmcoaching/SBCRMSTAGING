/** Revenue helpers — money units, Stripe merge, ledger sync, and LTV. */

export {
  _c,
  readAmt,
  stripeEventInDollars,
  paymentInDollars,
  refundAmountDollars,
  calcNet,
} from "./money.js";

export {
  LTV_OFFER_STATUSES,
  formatRegistrationAmount,
  resolveSessionListPrice,
  formatBookingAmount,
  resolveActualBookingAmount,
  formatActualBookingAmount,
  calendlyBookingAmount,
  registrationPaymentForLtv,
  sessionBookingRevenue,
  applySessionRevenueFromRegistrations,
  refreshCalendlySessionRevenue,
  buildSessionMap,
  registrationRevenueForMonth,
  registrationRevenueByMonth,
  buildSessionListPriceMap,
  registrationRevenueChannel,
  offerRevenueChannel,
} from "./ltv.js";

export {
  AUTO_REV_ID_PREFIX,
  AUTO_CXL_EXP_ID_PREFIX,
  AUTO_SPLIT_EXP_ID_PREFIX,
  isAutoRevenueRecord,
  isAutoExpenseRecord,
  studioSessionFinance,
  sessionFinanceFor,
  buildPaidPaymentsByBooking,
  bookingStripeCharge,
  buildRegistrationRevenueRows,
  buildOfferRevenueRows,
  buildBookingLedgerRecords,
  syncBookingLedgers,
  buildRevenueViewRows,
  applyStudioSessionSplit,
  openRevenueViewRow,
  computeClientLifetimeValue,
  applyRegistrationLifetimeValues,
} from "./ledger.js";

export {
  patchAmountMismatches,
  deriveRegistrationPaymentStatus,
  applyRegistrationPaymentLookup,
  stripePaymentExists,
  buildStripePaymentRecord,
  applyStripePaymentToRegistration,
  stripePaymentFromRecord,
  applyPaymentReconciliation,
  reconcileAmountMismatches,
  processStripeWebhookEvents,
  backfillRegistrationPaymentsForRegs,
  issueStripeRefund,
} from "./stripeMerge.js";
