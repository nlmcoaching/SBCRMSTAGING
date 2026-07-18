/**
 * Pure domain mutation helpers — (data, …) => nextData.
 * Callers keep React ownership: setData(prev => helper(prev, …)).
 *
 * Registration / client updates that touch multiple collections MUST go through
 * these helpers so LTV and session recount side effects are never skipped.
 */

import { applyRegistrationLifetimeValues } from "./revenue/ledger.js";
import { refreshCalendlySessionRevenue } from "./revenue/ltv.js";
import { paymentInDollars } from "./revenue/money.js";
import { applyRegistrationPaymentLookup } from "./registrationPaymentLookup.js";
import { confirmRegistrationFreeCoupon } from "./stripeMatching.js";

/** Collections deleted when a client is cascade-deleted. */
export const CLIENT_CASCADE_DELETE_COLS = [
  "registrations",
  "sequences",
  "followups",
  "offers",
  "testimonials",
  "referrals",
];

/** Money history kept with clientId cleared. */
export const CLIENT_CASCADE_CLEAR_COLS = ["payments", "revenue", "expenses"];

/**
 * After registrations change: refresh client LTV, virtual-session revenue,
 * and studio session.registered counts (studio financial fields untouched).
 */
export function refreshAfterRegistrations(data, registrations) {
  const regs = registrations || [];
  const ltvData = {
    registrations: regs,
    revenue: data.revenue || [],
    offers: data.offers || [],
  };
  const refreshed = refreshCalendlySessionRevenue(data.sessions || [], regs);
  const sessions = refreshed.map(s => {
    if (!s.studioId) return s;
    const regCount = regs.filter(r => r.sessionId === s.id && r.status !== "canceled").length;
    return { ...s, registered: regCount };
  });
  return {
    ...data,
    registrations: regs,
    sessions,
    clients: applyRegistrationLifetimeValues(data.clients || [], ltvData),
  };
}

/** Insert or replace a registration, then run side-effect refresh. */
export function upsertRegistration(data, reg) {
  if (!data || !reg?.id) return data;
  const rows = data.registrations || [];
  const nextRows = rows.some(r => r.id === reg.id)
    ? rows.map(r => (r.id === reg.id ? reg : r))
    : [...rows, reg];
  return refreshAfterRegistrations(data, nextRows);
}

/** Patch one registration by id via mapFn, then refresh. */
export function patchRegistration(data, regId, mapFn) {
  if (!data || !regId || typeof mapFn !== "function") return data;
  const rows = data.registrations || [];
  const idx = rows.findIndex(r => r.id === regId);
  if (idx < 0) return data;
  const next = mapFn(rows[idx]);
  if (!next || next === rows[idx]) return data;
  const nextRows = [...rows];
  nextRows[idx] = next;
  return refreshAfterRegistrations(data, nextRows);
}

/**
 * Mark a booking canceled in the CRM. Never deletes the session record.
 * Recounts studio registered + refreshes LTV / virtual session revenue.
 */
export function cancelRegistration(data, regId) {
  if (!data || !regId) return data;
  const registrations = data.registrations || [];
  const idx = registrations.findIndex(r => r.id === regId);
  if (idx < 0) return data;
  const reg = registrations[idx];
  if (reg.status === "canceled" || reg.status === "rescheduled") return data;
  const nextRows = [...registrations];
  nextRows[idx] = {
    ...reg,
    status: "canceled",
    canceledAt: new Date().toISOString(),
    cancelReason: reg.cancelReason || "Canceled in CRM",
    cancelerType: "host",
  };
  return refreshAfterRegistrations(data, nextRows);
}

/** Confirm a free coupon on a booking and refresh side effects. */
export function confirmFreeCoupon(data, bookingId, code) {
  if (!data || !bookingId) return data;
  return patchRegistration(data, bookingId, r => confirmRegistrationFreeCoupon(r, code));
}

/**
 * Apply Calendly payment-lookup payload onto registrations, then refresh.
 * payload: { payments?: { [inviteeUri]: pay }, eventPrices?: { [eventName]: pay } }
 */
export function applyPaymentLookupPatch(data, payload) {
  if (!data || !payload) return data;
  const registrations = (data.registrations || []).map(r => {
    const pay = payload.payments?.[r.calendlyInviteeUri]
      || (r.eventName ? payload.eventPrices?.[r.eventName] : null);
    return pay ? applyRegistrationPaymentLookup(r, pay) : r;
  });
  const changed = registrations.some((r, i) => r !== (data.registrations || [])[i]);
  if (!changed) return data;
  return refreshAfterRegistrations(data, registrations);
}

/**
 * Stamp a Stripe refund onto the registration and matching payment, then refresh.
 * refundMeta: { amountRefunded, stripeRefundId, refundedAt }
 */
export function applyStripeRefundLocal(data, reg, refundMeta = {}) {
  if (!data || !reg?.id) return data;
  const refundedDollars = Number(refundMeta.amountRefunded) || 0;
  const refundedAt = refundMeta.refundedAt || new Date().toISOString();
  const stripeRefundId = refundMeta.stripeRefundId || "";

  const registrations = (data.registrations || []).map(r => (r.id === reg.id ? {
    ...r,
    paymentStatus: "refunded",
    amountRefunded: refundedDollars,
    stripeRefundId,
    refundedAt,
  } : r));

  const payments = (data.payments || []).map(p => {
    const match = (reg.paymentId && p.id === reg.paymentId)
      || (reg.stripePaymentIntentId && p.stripePaymentIntentId === reg.stripePaymentIntentId)
      || (reg.stripeChargeId && p.stripeChargeId === reg.stripeChargeId);
    return match ? paymentInDollars({
      ...p,
      status: "refunded",
      amountRefunded: refundedDollars,
      stripeRefundId,
      refundedAt,
    }) : paymentInDollars(p);
  });

  return refreshAfterRegistrations({ ...data, payments }, registrations);
}

function referralTouchesClient(ref, clientId) {
  return ref.clientId === clientId
    || ref.referrerId === clientId
    || ref.referredId === clientId;
}

/**
 * Delete a client and cascade:
 * - delete registrations, sequences, followups, offers, testimonials, referrals
 * - clear clientId on payments, revenue, expenses
 * - recount sessions + recompute LTV for remaining clients
 */
export function deleteClientCascade(data, clientId) {
  if (!data || !clientId) return data;
  if (!(data.clients || []).some(c => c.id === clientId)) return data;

  let next = {
    ...data,
    clients: (data.clients || []).filter(c => c.id !== clientId),
  };

  for (const col of CLIENT_CASCADE_DELETE_COLS) {
    const rows = next[col] || [];
    if (col === "referrals") {
      next[col] = rows.filter(r => !referralTouchesClient(r, clientId));
    } else {
      next[col] = rows.filter(r => r.clientId !== clientId);
    }
  }

  for (const col of CLIENT_CASCADE_CLEAR_COLS) {
    const rows = next[col] || [];
    next[col] = rows.map(r => (r.clientId === clientId ? { ...r, clientId: "" } : r));
  }

  return refreshAfterRegistrations(next, next.registrations || []);
}
