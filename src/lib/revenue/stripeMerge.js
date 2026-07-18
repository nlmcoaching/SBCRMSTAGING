import { reconcileStripePayments, resetStripeAutoMatches } from "../stripeMatching.js";
import { apiHeaders, calendlyApiUrl, fetchWithTimeout } from "../api.js";
import { getApiSessionToken } from "../apiSession.js";
import { uid } from "../format.js";
import { patchAmountMismatches } from "../patchAmountMismatches.js";
import { applyPaymentLookupPatch, applyStripeRefundLocal } from "../domainActions.js";
import { applyRegistrationLifetimeValues } from "./ledger.js";
import { refreshCalendlySessionRevenue } from "./ltv.js";
import { paymentInDollars, readAmt, refundAmountDollars, stripeEventInDollars } from "./money.js";

export { patchAmountMismatches };
export {
  deriveRegistrationPaymentStatus,
  applyRegistrationPaymentLookup,
} from "../registrationPaymentLookup.js";

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
    setData(prev => applyPaymentLookupPatch(prev, payload));
  } catch { /* backend unavailable */ }
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
      calendlyInviteeUri: reg.calendlyInviteeUri || "",
      policy: {
        cancelerType: reg.cancelerType || "",
        canceledAt: reg.canceledAt || "",
        sessionAt,
        calendlyInviteeUri: reg.calendlyInviteeUri || "",
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
  setData(prev => applyStripeRefundLocal(prev, reg, {
    amountRefunded: refundedDollars,
    stripeRefundId: j.refundId || "",
    refundedAt,
  }));
  return j;
}
