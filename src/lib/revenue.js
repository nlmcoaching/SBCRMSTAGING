import { amountsMatch, registrationSessionAmount, reconcileStripePayments, resetStripeAutoMatches } from "../stripeMatching.js";
import { apiHeaders, calendlyApiUrl, fetchWithTimeout } from "./api.js";
import { getApiSessionToken } from "./apiSession.js";
import { cleanName, money, uid } from "./format.js";
import { patchAmountMismatches } from "./patchAmountMismatches.js";

export { patchAmountMismatches };

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

export const deriveRegistrationPaymentStatus = (amount, successful) => {
  if (successful === true) return "paid";
  if (amount === 0) return "paid";
  if (amount != null && amount !== "" && !Number.isNaN(Number(amount)) && successful === false) return "unpaid";
  return "unknown";
};
export const applyRegistrationPaymentLookup = (reg, pay) => {
  if (!pay || pay.paymentAmount == null) return reg;
  const paymentAmount = pay.paymentAmount;
  const paidAmount = pay.paidAmount != null ? pay.paidAmount : reg.paidAmount;
  let paymentStatus = reg.paymentStatus;
  if (reg.stripeVerified) {
    paymentStatus = reg.paymentStatus;
  } else if (paymentAmount === 0) {
    paymentStatus = "paid";
  } else if (paymentAmount > 0) {
    paymentStatus = reg.paymentStatus === "pending_verification" ? reg.paymentStatus : "unknown";
  } else {
    paymentStatus = deriveRegistrationPaymentStatus(
      paidAmount != null ? paidAmount : paymentAmount,
      pay.paymentSuccessful,
    );
  }
  return { ...reg, paymentAmount, paidAmount, paymentStatus };
};
export function stripePaymentExists(payments, stripeEvt) {
  const list = payments || [];
  if (list.some(p => p.stripeEventId && p.stripeEventId === stripeEvt.stripeEventId)) return true;
  if (stripeEvt.stripePaymentIntentId && list.some(p =>
    p.stripePaymentIntentId === stripeEvt.stripePaymentIntentId
    && p.status === stripeEvt.status
    && ["paid", "failed"].includes(stripeEvt.status),
  )) return true;
  return false;
}
export function buildStripePaymentRecord(stripeEvt, extra = {}) {
  const evt = stripeEventInDollars(stripeEvt) || stripeEvt || {};
  // Always dollar floats in the CRM store — never copy _centsFormat onto payments.
  return {
    id: uid("pay"),
    clientId: extra.clientId || "",
    bookingId: extra.bookingId || "",
    sessionId: extra.sessionId || "",
    provider: "stripe",
    stripePaymentIntentId: evt.stripePaymentIntentId || "",
    stripeChargeId: evt.stripeChargeId || "",
    stripeCheckoutSessionId: evt.stripeCheckoutSessionId || "",
    stripeEventId: evt.stripeEventId || "",
    stripeQueueId: evt.id || "",
    customerEmail: evt.customerEmail || "",
    description: evt.description || "",
    amountGross: Number(evt.amountGross) || 0,
    amountRefunded: Number(evt.amountRefunded) || 0,
    currency: evt.currency || "usd",
    status: extra.status || evt.status || "paid",
    matchScore: extra.matchScore ?? null,
    matchStatus: extra.matchStatus || "unmatched",
    paidAt: evt.paidAt || evt.receivedAt || "",
    refundedAt: extra.refundedAt || "",
    receiptUrl: evt.receiptUrl || "",
    paymentMethodType: evt.paymentMethodType || "",
    failureMessage: evt.failureMessage || "",
    createdAt: new Date().toISOString(),
    notes: extra.notes || "",
  };
}
export function applyStripePaymentToRegistration(reg, stripeEvt, paymentId) {
  const gross = readAmt(stripeEvt, "amountGross");
  let paymentStatus = "paid";
  if (stripeEvt.status === "failed") paymentStatus = "failed";
  else if (stripeEvt.status === "refunded") paymentStatus = "refunded";
  else if (stripeEvt.status === "partial_refund") paymentStatus = "partial_refund";
  return {
    ...reg,
    paidAmount: gross,
    paymentStatus,
    stripeVerified: ["paid", "partial_refund"].includes(stripeEvt.status),
    stripePaymentIntentId: stripeEvt.stripePaymentIntentId || reg.stripePaymentIntentId || "",
    stripeChargeId: stripeEvt.stripeChargeId || reg.stripeChargeId || "",
    paidAt: stripeEvt.paidAt || reg.paidAt || "",
    paymentId: paymentId || reg.paymentId || "",
    amountRefunded: readAmt(stripeEvt, "amountRefunded") || reg.amountRefunded || 0,
  };
}
export function stripePaymentFromRecord(p) {
  return {
    customerEmail: p.customerEmail,
    description: p.description,
    amountGross: readAmt(p, "amountGross"),
    paidAt: p.paidAt,
    receivedAt: p.createdAt,
    stripePaymentIntentId: p.stripePaymentIntentId,
    stripeChargeId: p.stripeChargeId,
    stripeEventId: p.stripeEventId,
    status: p.status,
  };
}
export function applyPaymentReconciliation(prevData) {
  // Heal any mixed-unit payment rows, then clear auto links and re-match.
  const paymentsIn = (prevData.payments || []).map(paymentInDollars);
  const reset = resetStripeAutoMatches(paymentsIn, prevData.registrations || []);
  const { payments, registrations } = reconcileStripePayments(
    reset.payments,
    reset.registrations,
    prevData.clients || [],
    prevData,
  );
  const afterAmounts = reconcileAmountMismatches({ ...prevData, payments, registrations });
  const sessions = refreshCalendlySessionRevenue(prevData.sessions || [], afterAmounts.registrations);
  const ltvData = { registrations: afterAmounts.registrations, revenue: prevData.revenue || [], offers: prevData.offers || [] };
  return {
    ...prevData,
    payments,
    registrations: afterAmounts.registrations,
    sessions,
    clients: applyRegistrationLifetimeValues(prevData.clients || [], ltvData),
  };
}
export function reconcileAmountMismatches(prevData) {
  const prevRegs = prevData.registrations || [];
  const { registrations, changed } = patchAmountMismatches(prevRegs);

  if (!changed) {
    return {
      registrations: prevRegs,
      sessions: prevData.sessions,
      clients: prevData.clients,
    };
  }

  const sessions = refreshCalendlySessionRevenue(prevData.sessions || [], registrations);
  const ltvData = { registrations, revenue: prevData.revenue || [], offers: prevData.offers || [] };
  return {
    registrations,
    sessions,
    clients: applyRegistrationLifetimeValues(prevData.clients || [], ltvData),
  };
}
export function processStripeWebhookEvents(prevData, events) {
  const ackIds = [];
  let payments = (prevData.payments || []).map(paymentInDollars);
  let registrations = [...(prevData.registrations || [])];
  const clients = prevData.clients || [];

  for (const rawEvt of events) {
    // Ingestion boundary: queue/ledger cents → dollars before any merge/write.
    const stripeEvt = stripeEventInDollars(rawEvt) || rawEvt;
    ackIds.push(stripeEvt.id);
    const dupIdx = payments.findIndex(p =>
      p.stripeEventId && p.stripeEventId === stripeEvt.stripeEventId,
    );
    if (dupIdx >= 0) continue;

    const piIdx = stripeEvt.stripePaymentIntentId
      ? payments.findIndex(p => p.stripePaymentIntentId === stripeEvt.stripePaymentIntentId && p.status === stripeEvt.status && ["paid", "failed"].includes(stripeEvt.status))
      : -1;
    if (piIdx >= 0) {
      const prevPay = payments[piIdx];
      payments[piIdx] = paymentInDollars({
        ...prevPay,
        customerEmail: prevPay.customerEmail || stripeEvt.customerEmail || "",
        description: prevPay.description || stripeEvt.description || "",
        amountGross: stripeEvt.amountGross != null
          ? (Number(stripeEvt.amountGross) || 0)
          : readAmt(prevPay, "amountGross"),
        stripeChargeId: prevPay.stripeChargeId || stripeEvt.stripeChargeId || "",
        receiptUrl: prevPay.receiptUrl || stripeEvt.receiptUrl || "",
      });
      continue;
    }

    if (stripeEvt.status === "refunded" || stripeEvt.status === "partial_refund") {
      const payIdx = payments.findIndex(p =>
        (stripeEvt.stripeChargeId && p.stripeChargeId === stripeEvt.stripeChargeId)
        || (stripeEvt.stripePaymentIntentId && p.stripePaymentIntentId === stripeEvt.stripePaymentIntentId),
      );
      if (payIdx >= 0) {
        const prevPay = payments[payIdx];
        payments[payIdx] = paymentInDollars({
          ...prevPay,
          status: stripeEvt.status,
          amountRefunded: stripeEvt.amountRefunded != null
            ? (Number(stripeEvt.amountRefunded) || 0)
            : readAmt(prevPay, "amountRefunded"),
          refundedAt: stripeEvt.paidAt || new Date().toISOString(),
        });
        if (payments[payIdx].bookingId) {
          const regIdx = registrations.findIndex(r => r.id === payments[payIdx].bookingId);
          if (regIdx >= 0) {
            registrations[regIdx] = applyStripePaymentToRegistration(registrations[regIdx], stripeEvt, payments[payIdx].id);
          }
        }
      } else {
        payments.push(buildStripePaymentRecord(stripeEvt, { matchStatus: "unmatched", notes: "Refund with no linked payment" }));
      }
      continue;
    }

    if (stripeEvt.status === "failed") {
      payments.push(buildStripePaymentRecord(stripeEvt, { matchStatus: "unmatched", status: "failed" }));
      continue;
    }

    payments.push(buildStripePaymentRecord(stripeEvt, { matchStatus: "unmatched", status: "paid" }));
  }

  const reconciled = applyPaymentReconciliation({ ...prevData, payments, registrations, clients });
  return {
    payments: reconciled.payments ?? payments,
    registrations: reconciled.registrations ?? registrations,
    sessions: reconciled.sessions ?? prevData.sessions,
    clients: reconciled.clients ?? clients,
    ackIds,
  };
}
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
export async function backfillRegistrationPaymentsForRegs(regs, setData) {
  if (!setData || !regs?.length) return;
  const missingRegs = regs.filter(r => r.paymentAmount == null || r.paymentAmount === "");
  if (!missingRegs.length) return;
  const missingPaymentUris = [...new Set(missingRegs.map(r => r.calendlyInviteeUri).filter(Boolean))].slice(0, 25);
  const missingEventNames = [...new Set(missingRegs.map(r => r.eventName).filter(Boolean))].slice(0, 25);
  const eventTypeByUri = {};
  missingRegs.forEach(r => {
    if (r.calendlyInviteeUri && r.calendlyEventTypeUri) {
      eventTypeByUri[r.calendlyInviteeUri] = r.calendlyEventTypeUri;
    }
  });
  if (!missingPaymentUris.length && !missingEventNames.length) return;
  try {
    const res = await fetch(calendlyApiUrl("/api/calendly/payment-lookup"), {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ uris: missingPaymentUris, eventNames: missingEventNames, eventTypeByUri }),
    });
    if (!res.ok) return;
    const payload = await res.json();
    if (!payload?.payments && !payload?.eventPrices) return;
    setData(prev => {
      const registrations = (prev.registrations || []).map(r => {
        const pay = payload.payments?.[r.calendlyInviteeUri]
          || (r.eventName ? payload.eventPrices?.[r.eventName] : null);
        return pay ? applyRegistrationPaymentLookup(r, pay) : r;
      });
      const ltvData = { registrations, revenue: prev.revenue || [], offers: prev.offers || [] };
      return {
        ...prev,
        registrations,
        sessions: refreshCalendlySessionRevenue(prev.sessions || [], registrations),
        clients: applyRegistrationLifetimeValues(prev.clients || [], ltvData),
      };
    });
  } catch { /* backend unavailable */ }
}
// Recognised revenue for a single booking — the ACTUAL Stripe charge only, mirroring the revenue
// table (buildRegistrationRevenueRows) and the Stripe page. There is no Calendly list-price
// fallback: a booking with no confirmed Stripe charge (free/coupon, pending, unmatched) is $0, so
// LTV, session-card revenue, and the dashboard B2B/B2C split all agree with the Revenue tab.
export function registrationPaymentForLtv(reg) {
  if (!reg || reg.status === "canceled" || reg.status === "rescheduled") return 0;
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
    .filter(r => r.sessionId === sessionId && r.status !== "canceled" && r.status !== "rescheduled")
    .reduce((sum, r) => sum + registrationPaymentForLtv(r), 0);
}
export function applySessionRevenueFromRegistrations(session, registrations) {
  if (!session?.id) return session;
  const activeRegs = (registrations || []).filter(r => r.sessionId === session.id && r.status !== "canceled");
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
// ── Studio session finance (simple model) ───────────────────────────────────
// A studio session's economics come from three inputs, all set by hand so they never move on a
// Calendly/Stripe sync: the per-seat price entered on the session (`pricePerSeat`), the number of
// PAID attendees, and the studio partner's revenue share %.
//   gross        = price-per-seat × paid attendees
//   studioSplit  = gross × (studio's share % ÷ 100)   ← owed to the studio partner
//   net          = gross − studioSplit                ← Simply Breathe's keep
// The values recompute from the session + partner records, so the only things that change a studio
// split (and its linked expense) are editing the price-per-seat, the paid attendees, or the share %.
export function studioSessionFinance(session, data, ctx) {
  const partnersById = ctx?.partnersById || Object.fromEntries((data.partners || []).map(p => [p.id, p]));
  const sharePct = Math.min(100, Math.max(0, Number(partnersById[session.studioId]?.studioSharePct) || 0));
  // Gross = sum of actual payments received (Stripe charges minus refunds) for this session.
  // Pass ctx.revenueRows from the caller to avoid re-building the full table in list views.
  const revenueRows = ctx?.revenueRows || buildRegistrationRevenueRows(data);
  const sessionRevRows = revenueRows.filter(r => r.sessionId === session.id);
  const gross = Math.round(
    sessionRevRows.reduce((sum, r) => sum + Math.max(0, r.gross - r.refunds), 0) * 100
  ) / 100;
  const participantCount = sessionRevRows.length;
  const studioSplit = Math.round(gross * (sharePct / 100) * 100) / 100;
  const net = Math.round((gross - studioSplit) * 100) / 100;
  // seatPrice kept for display reference only — no longer drives the split calculation.
  const seatPrice = Number(session.pricePerSeat) || 0;
  return { seatPrice, attendance: Number(session.attendance) || 0, paidAttendees: Number(session.paidAttendees) || 0, participantCount, gross, sharePct, studioSplit, net };
}
// Finance for any session: the live studio model for studio sessions, or the booking-derived
// revenue (no split) for virtual sessions.
export function sessionFinanceFor(session, data) {
  if (session?.studioId) return studioSessionFinance(session, data);
  return {
    seatPrice: 0,
    attendance: Number(session?.attendance) || 0,
    gross: Number(session?.revenue) || 0,
    sharePct: 0,
    studioSplit: 0,
    net: Number(session?.netRevenue) || 0,
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
// Index the Stripe payments ledger by the booking each charge paid for. Mirrors how the Stripe
// reconciliation page links charges to bookings, so revenue can read the same source of truth.
export function buildPaidPaymentsByBooking(payments) {
  const map = {};
  (payments || []).forEach(p => {
    if (p.bookingId && (p.status === "paid" || p.status === "partial_refund")) map[p.bookingId] = p;
  });
  return map;
}
// A booking's recognised revenue, sourced exactly like the Stripe log: the GROSS amount of its
// matched Stripe charge, and $0 when there is no charge (free / 100%-off-coupon bookings appear
// as the $0 "Free" rows on the Stripe page). The list price is never used here, so a free booking
// of a paid-price session is never over-counted at its expected price.
export function bookingStripeCharge(reg, paidByBooking) {
  const charge = paidByBooking[reg.id];
  if (charge) {
    return {
      gross:   Math.max(0, readAmt(charge, "amountGross")),
      refunds: Math.max(0, readAmt(charge, "amountRefunded")),
    };
  }
  // Fallback when the ledger isn't loaded but the booking itself carries a verified Stripe amount.
  if (reg.stripeVerified && reg.paymentStatus !== "refunded" && reg.paidAmount != null) {
    return {
      gross:   Math.max(0, Number(reg.paidAmount) || 0),
      refunds: Math.max(0, Number(reg.amountRefunded) || 0),
    };
  }
  return { gross: 0, refunds: 0 }; // no Stripe charge → $0, matching the Stripe log
}
export function buildRegistrationRevenueRows(data = {}) {
  const sessions = buildSessionMap(data.sessions);
  const clients = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
  const paidByBooking = buildPaidPaymentsByBooking(data.payments);
  return (data.registrations || [])
    .filter(r => r.status !== "canceled" && r.status !== "rescheduled"
      && !["unpaid", "pending_verification", "unmatched", "failed"].includes(r.paymentStatus))
    .map(r => {
      const session = sessions[r.sessionId];
      const client = clients[r.clientId];
      const { gross, refunds } = bookingStripeCharge(r, paidByBooking);
      const net = Math.round((gross - refunds) * 100) / 100;
      // Date = the session date (when the service is delivered). Falls back to scheduledAt
      // (session start time from Calendly), then createdAt (booking time) if no session is linked.
      const date = (session?.date || r.scheduledAt || r.createdAt || "").slice(0, 10);
      if (!date) return null;
      return {
        id: "regrev_" + r.id,
        name: client
          ? `${cleanName(client.name)} — ${cleanName(session?.name || r.eventName || "Session")}`
          : cleanName(session?.name || r.eventName || "Session booking"),
        date,
        channel: registrationRevenueChannel(session),
        source: client?.source || "Calendly",
        campaign: "",
        sessionId: r.sessionId || "",
        studioId: session?.studioId || null,
        clientId: r.clientId || "",
        client: client ? cleanName(client.name) : "",
        gross,
        stripeFee: 0,
        studioSplit: 0,
        facilitatorCost: 0,
        refunds,
        net,
        costCenter: registrationRevenueChannel(session),
        notes: "Actual Stripe charge",
        registrationId: r.id,
        bookedAt: r.paidAt || r.createdAt || "",
        isFree: gross === 0,
        _derived: true,
      };
    })
    .filter(Boolean);
}
export function buildOfferRevenueRows(data = {}) {
  return (data.offers || [])
    .filter(o => LTV_OFFER_STATUSES.has(o.status) && Number(o.price) > 0)
    .map(o => {
      const date = o.closeDate || o.dateOffered || "";
      if (!date) return null;
      const gross = Number(o.price) || 0;
      return {
        id: "offerrev_" + o.id,
        name: cleanName(o.name),
        date,
        channel: offerRevenueChannel(o.offerType),
        source: o.source || "",
        campaign: "",
        sessionId: "",
        clientId: o.clientId || "",
        client: "",
        gross,
        stripeFee: 0,
        studioSplit: 0,
        facilitatorCost: 0,
        refunds: 0,
        net: gross,
        costCenter: offerRevenueChannel(o.offerType),
        notes: `${o.offerType} — ${o.status}`,
        bookedAt: o.closeDate || o.dateOffered || "",
        offerId: o.id,
        _derived: true,
      };
    })
    .filter(Boolean);
}
// ── Auto-maintained financial ledgers ──────────────────────────────────────
// Every active virtual/studio booking is materialised as a revenue-table record, and every
// canceled booking as an expense-table record (for the actual Stripe amount, $0 for free/coupon
// bookings). These carry `auto: true` and a deterministic id so they can be regenerated from the
// current bookings on every change without disturbing manually-entered revenue/expense rows.
// syncBookingLedgers is run from an effect whenever bookings change (see the App component).
export const AUTO_REV_ID_PREFIX = "regrev_";      // revenue record per active booking
export const AUTO_CXL_EXP_ID_PREFIX = "cxlexp_";  // expense record per canceled booking
export const AUTO_SPLIT_EXP_ID_PREFIX = "studiosplit_"; // expense record per studio session's revenue split
export const isAutoRevenueRecord = (r) => !!r?.auto || String(r?.id || "").startsWith(AUTO_REV_ID_PREFIX);
export const isAutoExpenseRecord = (e) => !!e?.auto
  || String(e?.id || "").startsWith(AUTO_CXL_EXP_ID_PREFIX)
  || String(e?.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX);

export function buildBookingLedgerRecords(data = {}) {
  const sessions = buildSessionMap(data.sessions);
  const clients = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
  const partners = Object.fromEntries((data.partners || []).map(p => [p.id, p]));
  const listPrices = buildSessionListPriceMap(data.registrations);

  // Revenue: reuse the exact per-booking rows the reports derive (channel = session type,
  // gross = resolved Stripe amount), flagged as auto-generated for the persisted ledger.
  // Build once here so the studio-split block below can reuse the same rows without re-computing.
  const revenueRows = buildRegistrationRevenueRows(data);
  const revenue = revenueRows.map(row => ({
    ...row,
    notes: "Auto-recorded from Calendly booking",
    auto: true,
  }));

  // Expenses: one record per CANCELED booking. Reschedules are skipped — no money moves, the
  // payment simply follows the booking to its new time. The amount reflects money that actually
  // left via Stripe (amountRefunded) — a late cancel or free booking books a $0 expense so the
  // cancellation stays visible without distorting the P&L.
  const expenses = (data.registrations || [])
    .filter(r => r.status === "canceled")
    .map(r => {
      const session = sessions[r.sessionId];
      const client = clients[r.clientId];
      const sessName = cleanName(session?.name || r.eventName || "Session");
      const refunded = Math.max(0, Number(r.amountRefunded) || 0);
      const listAmt = resolveActualBookingAmount(r, listPrices[r.sessionId]) ?? 0;
      const noteParts = [];
      if (r.stripeRefundId) noteParts.push(`Stripe refund ${r.stripeRefundId}`);
      else if (refunded > 0) noteParts.push("Refunded via Stripe");
      else if ((Number(r.paidAmount) || 0) > 0 || listAmt > 0) noteParts.push("No refund issued");
      if (r.cancelReason) noteParts.push(`Reason: ${r.cancelReason}`);
      return {
        id: AUTO_CXL_EXP_ID_PREFIX + r.id,
        date: (r.refundedAt || r.canceledAt || r.scheduledAt || r.createdAt || "").slice(0, 10),
        vendor: client ? cleanName(client.name) : (r.eventName || "Canceled booking"),
        description: `Canceled session — ${sessName}`,
        amount: Math.round(refunded * 100) / 100,
        category: "Refunds & Cancellations",
        paymentMethod: "Stripe",
        taxDeductible: false,
        recurring: false,
        recurringFreq: "One-time",
        linkedSession: r.sessionId || "",
        linkedPartner: session?.studioId || "",
        receiptUrl: "",
        stripeRefundId: r.stripeRefundId || "",
        refundedAt: r.refundedAt || "",
        notes: noteParts.join(" — ") || "Auto-recorded when the Calendly booking was canceled.",
        clientId: r.clientId || "",
        registrationId: r.id,
        auto: true,
      };
    });

  // Studio split: one expense per studio session that owes its partner a revenue share. The amount
  // is derived from actual Stripe revenue received for that session × the partner's share % —
  // automatically stays accurate without any manual entry as payments come in and refunds occur.
  const splitExpenses = (data.sessions || [])
    .filter(s => s.studioId)
    .map(s => {
      const fin = studioSessionFinance(s, data, { partnersById: partners, revenueRows });
      if (fin.studioSplit <= 0) return null;
      const partner = partners[s.studioId];
      const sessName = cleanName(s.name || "Studio session");
      const dateStr = (s.date || "").slice(0, 10);
      return {
        id: AUTO_SPLIT_EXP_ID_PREFIX + s.id,
        date: dateStr,
        vendor: partner ? cleanName(partner.name) : "Studio partner",
        description: `Studio split — ${sessName}${dateStr ? ` ${dateStr}` : ""}`,
        amount: fin.studioSplit,
        category: "Studio Split",
        paymentMethod: "Bank Transfer",
        taxDeductible: true,
        recurring: false,
        recurringFreq: "One-time",
        linkedSession: s.id,
        linkedPartner: s.studioId,
        receiptUrl: "",
        notes: `Auto-recorded studio revenue split — ${fin.participantCount} paid × ${money(fin.gross)} actual revenue × ${fin.sharePct}% to studio.`,
        auto: true,
      };
    })
    .filter(Boolean);

  return { revenue, expenses: [...expenses, ...splitExpenses] };
}

// Merge manually-entered revenue/expense rows with freshly-rebuilt auto booking records.
// Returns `changed: false` when nothing materially differs, so callers can skip a state update.
export function syncBookingLedgers(data = {}) {
  const { revenue: autoRev, expenses: autoExp } = buildBookingLedgerRecords(data);
  const manualRev = (data.revenue || []).filter(r => !isAutoRevenueRecord(r));
  const manualExp = (data.expenses || []).filter(e => !isAutoExpenseRecord(e));

  // Studio-split auto expenses are keyed to a session. If a session's computed split drops to $0
  // (e.g. paidAttendees was accidentally cleared, or the partner's share % was temporarily zeroed),
  // the record is excluded from autoExp. Rather than silently deleting a previously-recorded
  // positive-amount split, we preserve it so the user doesn't lose data. The user can manually
  // delete the record if it is genuinely no longer owed.
  const newAutoSplitIds = new Set(
    autoExp.filter(e => String(e?.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)).map(e => e.id)
  );
  const preservedSplitExp = (data.expenses || [])
    .filter(e => String(e?.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)
      && Number(e.amount) > 0
      && !newAutoSplitIds.has(e.id));

  const nextRevenue = [...manualRev, ...autoRev];
  const nextExpenses = [...manualExp, ...autoExp, ...preservedSplitExp];
  const sig = (arr, amtKey) => arr.map(x => `${x.id}|${x[amtKey] ?? ""}|${x.date ?? ""}|${x.stripeRefundId ?? ""}`).sort().join(";");
  const changed =
    sig(nextRevenue, "gross") !== sig(data.revenue || [], "gross") ||
    sig(nextExpenses, "amount") !== sig(data.expenses || [], "amount");
  return { revenue: nextRevenue, expenses: nextExpenses, changed };
}

export function buildRevenueViewRows(data = {}) {
  const clientsById = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
  // Manually-entered revenue records (partner agreements, corporate events, packages, etc.) are
  // part of the revenue ledger and count toward reports. Auto booking records are excluded here
  // because the live per-booking rows below already represent them (avoids double-counting).
  const manualRev = (data.revenue || [])
    .filter(r => !isAutoRevenueRecord(r))
    .map(rec => ({
      ...rec,
      client: rec.clientId ? cleanName(clientsById[rec.clientId]?.name || rec.client || "") : (rec.client || ""),
      net: rec.net != null ? rec.net : Math.round(calcNet(rec) * 100) / 100,
      bookedAt: rec.bookedAt || rec.date || "",
      isFree: rec.isFree ?? ((Number(rec.gross) || 0) === 0 && (Number(rec.refunds) || 0) === 0),
    }));
  return [...buildRegistrationRevenueRows(data), ...manualRev, ...buildOfferRevenueRows(data)]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
// Returns a mapper that applies the actual per-partner studio split to each revenue row.
// Previously used a hardcoded 70/30 constant (STUDIO_REV_SHARE_STUDIO/US) which disagreed
// with studioSessionFinance (line 1879+) that reads the real studioSharePct from the partner.
// Arithmetic is done in cents to avoid float-subtraction drift.
export function applyStudioSessionSplit(data) {
  const partnersById = Object.fromEntries((data.partners || []).map(p => [p.id, p]));
  return (row) => {
    if (row.channel !== "Studio session") return row;
    // Fallback 0% — matches studioSessionFinance / normalizeData. Never invent a 30% split.
    const studioPct = Math.min(100, Math.max(0, Number(partnersById[row.studioId]?.studioSharePct) || 0));
    const usPct = 100 - studioPct;
    const grossCents  = Math.round((Number(row.gross) || 0) * 100);
    const splitCents  = Math.round(grossCents * studioPct / 100);
    return {
      ...row,
      studioSplit: splitCents / 100,
      net: (grossCents - splitCents) / 100,
      notes: row.notes ? `${row.notes} · ${usPct}/${studioPct} split` : `${usPct}/${studioPct} split`,
    };
  };
}
export function openRevenueViewRow(r, data, onOpen) {
  if (r.registrationId) {
    const reg = (data.registrations || []).find(x => x.id === r.registrationId);
    if (reg) { onOpen({ db: "registrations", record: reg }); return; }
  }
  if (r.offerId) {
    const offer = (data.offers || []).find(x => x.id === r.offerId);
    if (offer) { onOpen({ db: "offers", record: offer }); return; }
  }
  onOpen({ db: "revenue", record: r });
}
export function computeClientLifetimeValue(clientId, data = {}) {
  const { registrations = [], revenue = [], offers = [] } = data;
  const regTotal = registrations
    .filter(r => r.clientId === clientId)
    .reduce((sum, r) => sum + registrationPaymentForLtv(r), 0);
  const revTotal = revenue
    // Auto booking records mirror registrations (already summed above) — exclude to avoid double-counting.
    .filter(r => r.clientId === clientId && !isAutoRevenueRecord(r))
    .reduce((sum, r) => sum + Math.max(0, (Number(r.gross) || 0) - (Number(r.refunds) || 0)), 0);
  const offerTotal = offers
    .filter(o => o.clientId === clientId && LTV_OFFER_STATUSES.has(o.status))
    .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  return Math.round((regTotal + revTotal + offerTotal) * 100) / 100;
}
export function applyRegistrationLifetimeValues(clients, data) {
  const regClientIds = new Set((data.registrations || []).map(r => r.clientId).filter(Boolean));
  if (!regClientIds.size) return clients;
  return clients.map(c => regClientIds.has(c.id)
    ? { ...c, lifetimeValue: computeClientLifetimeValue(c.id, data) }
    : c);
}

/** Issues a FULL Stripe refund via the backend, then stamps the refund on the
 * registration and its linked payment record. Shared by RefundsView and
 * registration expand-row cancel/refund actions. */
export async function issueStripeRefund(reg, setData, sessionToken, opts = {}) {
  const tok = sessionToken || getApiSessionToken();
  if (!tok) throw new Error("Not authorised — please log out and log back in before issuing a refund.");
  if (!reg?.id) throw new Error("Registration id required for refund.");
  const sessionAt = reg.scheduledAt || opts.sessionAt || "";
  const res = await fetchWithTimeout(calendlyApiUrl("/api/stripe/refund"), {
    method: "POST",
    headers: { ...apiHeaders(), "x-session-token": tok },
    body: JSON.stringify({
      paymentIntentId: reg.stripePaymentIntentId || "",
      chargeId: reg.stripeChargeId || "",
      registrationId: reg.id || "",
      reason: "requested_by_customer",
      policy: {
        cancelerType: reg.cancelerType || "",
        canceledAt: reg.canceledAt || "",
        sessionAt,
        override: opts.policyOverride === true,
      },
    }),
  }, 20000);
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Refund request failed (${res.status})`);

  const refundedAt = j.createdAt || new Date().toISOString();
  const paidFallback = Number(reg.paidAmount) || 0;
  // API contract: j.amount is dollars (server centsToDollars). Assert/normalize before store.
  const refundedDollars = refundAmountDollars(j.amount, paidFallback);
  setData(prev => {
    const registrations = (prev.registrations || []).map(r => r.id === reg.id ? {
      ...r,
      paymentStatus: "refunded",
      amountRefunded: refundedDollars,
      stripeRefundId: j.refundId || "",
      refundedAt,
    } : r);
    const payments = (prev.payments || []).map(p => {
      const match = (reg.paymentId && p.id === reg.paymentId)
        || (reg.stripePaymentIntentId && p.stripePaymentIntentId === reg.stripePaymentIntentId)
        || (reg.stripeChargeId && p.stripeChargeId === reg.stripeChargeId);
      return match ? paymentInDollars({
        ...p,
        status: "refunded",
        amountRefunded: refundedDollars,
        stripeRefundId: j.refundId || "",
        refundedAt,
      }) : paymentInDollars(p);
    });
    return { ...prev, registrations, payments };
  });
  return j;
}
