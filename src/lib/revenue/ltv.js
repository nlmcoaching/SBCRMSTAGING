import { registrationSessionAmount } from "../stripeMatching.js";
import { money } from "../format.js";
import { isActiveRegistration, isInactiveRegistration } from "../registrationStatus.js";

export const LTV_OFFER_STATUSES = new Set(["Paid", "Accepted"]);

export function formatRegistrationAmount(reg) {
  const amt = registrationSessionAmount(reg);
  if (amt == null) return null;
  if (amt === 0) return "Free";
  return money(amt);
}

export function resolveSessionListPrice(registrations, sessionId) {
  for (const r of registrations || []) {
    if (r.sessionId !== sessionId || r.status === "canceled") continue;
    const amt = registrationSessionAmount(r);
    if (amt != null) return amt;
  }
  return null;
}

export function formatBookingAmount(reg, fallbackAmount) {
  const direct = formatRegistrationAmount(reg);
  if (direct) return direct;
  if (fallbackAmount == null || Number.isNaN(Number(fallbackAmount))) return null;
  if (fallbackAmount === 0) return "Free";
  return money(fallbackAmount);
}

// Returns the actual amount paid for a booking — Stripe paidAmount when verified,
// explicit $0 for coupons, otherwise falls back to the Calendly list price.
export function resolveActualBookingAmount(reg, fallbackListPrice) {
  if (!reg) return fallbackListPrice ?? null;
  if (reg.stripeVerified && reg.paidAmount != null) {
    const paid = Number(reg.paidAmount);
    const refunded = Number(reg.amountRefunded) || 0;
    if (!Number.isNaN(paid)) return Math.max(0, Math.round((paid - refunded) * 100) / 100);
  }
  if (reg.paidAmount != null && Number(reg.paidAmount) === 0) return 0;
  if (reg.paymentStatus === "paid" && reg.paidAmount != null) {
    const paid = Number(reg.paidAmount);
    if (!Number.isNaN(paid) && paid > 0) return paid;
  }
  const listAmt = registrationSessionAmount(reg);
  if (listAmt != null) return listAmt;
  return fallbackListPrice ?? null;
}

export function formatActualBookingAmount(reg, fallbackListPrice) {
  const amt = resolveActualBookingAmount(reg, fallbackListPrice);
  if (amt == null) return null;
  if (amt === 0) return "Free";
  return money(amt);
}

// The expected price for the booking, as reported by Calendly. When Stripe later corrected
// paymentAmount on a mismatch, the original Calendly value is preserved in lastAmountMismatch.expectedAmount.
export function calendlyBookingAmount(reg) {
  if (!reg) return null;
  if (reg.lastAmountMismatch?.expectedAmount != null) return Number(reg.lastAmountMismatch.expectedAmount);
  const cal = registrationSessionAmount(reg);
  return cal != null ? cal : null;
}

// Recognised revenue for a single booking — the ACTUAL Stripe charge only, mirroring the revenue
// table (buildRegistrationRevenueRows) and the Stripe page. There is no Calendly list-price
// fallback: a booking with no confirmed Stripe charge (free/coupon, pending, unmatched) is $0, so
// LTV, session-card revenue, and the dashboard B2B/B2C split all agree with the Revenue tab.
export function registrationPaymentForLtv(reg) {
  if (isInactiveRegistration(reg)) return 0;
  if (["unpaid", "failed", "refunded"].includes(reg.paymentStatus)) return 0;
  // Stripe-verified: the actual charged amount, net of refunds.
  if (reg.stripeVerified && reg.paidAmount != null) {
    const paid = Number(reg.paidAmount);
    const refunded = Number(reg.amountRefunded) || 0;
    if (!Number.isNaN(paid)) return Math.max(0, Math.round((paid - refunded) * 100) / 100);
  }
  // Recorded as paid (or partially refunded) with an explicit Stripe amount, awaiting verification.
  if ((reg.paymentStatus === "paid" || reg.paymentStatus === "partial_refund") && reg.paidAmount != null) {
    const paid = Number(reg.paidAmount);
    const refunded = Number(reg.amountRefunded) || 0;
    if (!Number.isNaN(paid) && paid > 0) return Math.max(0, Math.round((paid - refunded) * 100) / 100);
  }
  return 0; // no confirmed Stripe charge → $0
}

export function sessionBookingRevenue(sessionId, registrations) {
  return (registrations || [])
    .filter(r => r.sessionId === sessionId && isActiveRegistration(r))
    .reduce((sum, r) => sum + registrationPaymentForLtv(r), 0);
}

export function applySessionRevenueFromRegistrations(session, registrations) {
  if (!session?.id) return session;
  const activeRegs = (registrations || []).filter(r => r.sessionId === session.id && isActiveRegistration(r));
  const gross = sessionBookingRevenue(session.id, registrations);
  const isVirtual = !session.studioId && (session.locationType === "zoom" || session.locationType === "custom" || !session.locationType);
  const paidCount = activeRegs.filter(r => registrationPaymentForLtv(r) > 0).length;
  return {
    ...session,
    revenue: gross,
    netRevenue: gross,
    // Studio sessions drive paid attendees by hand (part of the studio finance model), so a
    // Calendly/Stripe sync must never reset it. Only virtual/booking-driven sessions derive it.
    paidAttendees: session.studioId
      ? (Number(session.paidAttendees) || 0)
      : (isVirtual ? (gross > 0 ? 1 : (session.paidAttendees || 0)) : paidCount),
    registered: activeRegs.length || session.registered || 0,
  };
}

export function refreshCalendlySessionRevenue(sessions, registrations) {
  return sessions.map(s => {
    // Studio sessions use hand-entered financial fields (pricePerSeat, paidAttendees, attendance,
    // revenue, studioSplit). Never overwrite these from Stripe/Calendly booking sums — the model
    // is pricePerSeat × paidAttendees, not the sum of individual charges.
    if (s.studioId) return s;
    if (s.calendlyEventUri || (registrations || []).some(r => r.sessionId === s.id && r.paymentAmount != null)) {
      return applySessionRevenueFromRegistrations(s, registrations);
    }
    return s;
  });
}

export function buildSessionMap(sessions) {
  return Object.fromEntries((sessions || []).map(s => [s.id, s]));
}

export function registrationRevenueForMonth(registrations, sessions, monthPrefix, { studioOnly, virtualOnly } = {}) {
  const sessionById = buildSessionMap(sessions);
  return (registrations || []).reduce((sum, r) => {
    const session = sessionById[r.sessionId];
    if (!session?.date?.startsWith(monthPrefix)) return sum;
    const isVirtual = !session.studioId && (session.locationType === "zoom" || session.locationType === "custom" || !session.locationType);
    if (studioOnly && isVirtual) return sum;
    if (virtualOnly && !isVirtual) return sum;
    return sum + registrationPaymentForLtv(r);
  }, 0);
}

// Revenue bucketed by the month the booking was made (createdAt = "Scheduled On"), falling back
// to the session date/time, so the trend reflects when sales happened rather than when sessions run.
export function registrationRevenueByMonth(registrations) {
  const months = {};
  (registrations || []).forEach(r => {
    const amt = registrationPaymentForLtv(r);
    if (amt <= 0) return;
    const dateStr = r.createdAt || r.scheduledAt || "";
    if (!dateStr) return;
    const k = dateStr.slice(0, 7);
    months[k] = (months[k] || 0) + amt;
  });
  return months;
}

export function buildSessionListPriceMap(registrations) {
  const map = {};
  (registrations || []).forEach(r => {
    if (!r.sessionId) return;
    const amt = registrationSessionAmount(r);
    if (amt != null && map[r.sessionId] == null) map[r.sessionId] = amt;
  });
  return map;
}

export function registrationRevenueChannel(session) {
  if (!session) return "Studio session";
  const isVirtual = !session.studioId && (session.locationType === "zoom" || session.locationType === "custom" || !session.locationType);
  return isVirtual ? "Virtual session" : "Studio session";
}

export function offerRevenueChannel(offerType) {
  if (offerType === "Private session") return "Private client";
  if (offerType === "Single session" || offerType === "Virtual session") return "Virtual session";
  return "Group package";
}
