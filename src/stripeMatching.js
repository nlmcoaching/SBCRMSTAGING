/** Stripe ↔ Calendly reconciliation (pure functions — testable).
 *
 * Simple flow:
 * 1. Calendly booking with a list price → unknown until Stripe sync
 * 2. Sync → match by email when a Stripe charge exists; otherwise treat as free (paid, $0)
 * 3. Only bookings with an unlinked Stripe payment for the same email stay pending
 */

export const normalizeEmail = (e) => String(e || "").trim().toLowerCase();

export const amountsMatch = (a, b, tolerance = 0.01) => {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  return Math.abs(na - nb) <= tolerance;
};

export function registrationSessionAmount(reg) {
  if (!reg) return null;
  const amt = Number(reg.paymentAmount);
  return Number.isNaN(amt) ? null : amt;
}

export function registrationCreatedTimestamp(reg) {
  if (reg?.createdAt) {
    const t = Date.parse(reg.createdAt);
    if (!Number.isNaN(t)) return t;
  }
  if (reg?.calendlyReceivedAt) {
    const t = Date.parse(reg.calendlyReceivedAt);
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export function registrationBookingTimestamp(reg, data = {}) {
  const created = registrationCreatedTimestamp(reg);
  if (created) return created;
  if (reg?.scheduledAt) {
    const t = Date.parse(reg.scheduledAt);
    if (!Number.isNaN(t)) return t;
  }
  if (reg?.sessionId && data?.sessions) {
    const s = data.sessions.find(x => x.id === reg.sessionId);
    if (s?.date) {
      const t = Date.parse(`${s.date}T${(s.time || "12:00").slice(0, 5)}`);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

export function clearRegistrationStripeVerification(reg) {
  const listPrice = registrationSessionAmount(reg);
  return {
    ...reg,
    stripeVerified: false,
    paymentStatus: listPrice != null && listPrice > 0 ? "unknown" : (reg.paymentStatus || "unknown"),
    paymentId: "",
    stripePaymentIntentId: "",
    stripeChargeId: "",
    paidAt: "",
    paidAmount: null,
    amountRefunded: 0,
  };
}

function paymentSortTimestamp(p) {
  const t = Date.parse(p.paidAt || p.createdAt || "");
  return Number.isNaN(t) ? 0 : t;
}

function unlinkedPaidCountForEmail(email, payments) {
  return (payments || []).filter(p =>
    p.status === "paid"
    && !p.bookingId
    && p.matchStatus !== "manual"
    && normalizeEmail(p.customerEmail) === email,
  ).length;
}

/** Link one Stripe payment record to one Calendly registration (mutates arrays). */
export function linkStripePaymentToRegistration(payments, registrations, payIdx, reg) {
  const p = payments[payIdx];
  if (!p || !reg) return;
  const gross = Number(p.amountGross) || 0;
  payments[payIdx] = {
    ...p,
    clientId: reg.clientId,
    bookingId: reg.id,
    sessionId: reg.sessionId,
    matchStatus: "auto",
    matchScore: 100,
    notes: "Matched by email",
  };
  const ri = registrations.findIndex(r => r.id === reg.id);
  if (ri < 0) return;
  registrations[ri] = {
    ...registrations[ri],
    paidAmount: gross,
    paymentStatus: "paid",
    stripeVerified: true,
    stripePaymentIntentId: p.stripePaymentIntentId || "",
    stripeChargeId: p.stripeChargeId || "",
    paidAt: p.paidAt || "",
    paymentId: p.id,
    amountRefunded: 0,
  };
}

function markFreeSessionRegistration(reg, listPrice) {
  const correctedAt = reg.lastAmountMismatch?.reason === "free"
    ? reg.lastAmountMismatch.correctedAt
    : new Date().toISOString();
  return {
    ...reg,
    paymentStatus: "paid",
    stripeVerified: false,
    paidAmount: 0,
    lastAmountMismatch: {
      expectedAmount: listPrice,
      stripeAmount: 0,
      reason: "free",
      correctedAt,
    },
  };
}

/**
 * After matching: pending only when an unlinked Stripe payment can still pair (FIFO).
 * No Stripe charge for email → free session (paid, $0) recorded in amount mismatches.
 */
export function finalizeRegistrationPaymentStatuses(registrations, payments, clients, data = {}) {
  const regs = (registrations || []).map(r => ({ ...r }));
  const pendingByEmail = new Map();

  for (const reg of regs) {
    if (reg.stripeVerified || reg.status === "canceled" || reg.status === "rescheduled") continue;
    const listPrice = registrationSessionAmount(reg);
    const idx = regs.findIndex(x => x.id === reg.id);
    if (idx < 0) continue;

    if (listPrice == null || listPrice <= 0) {
      regs[idx] = { ...regs[idx], paymentStatus: "paid", paidAmount: 0 };
      continue;
    }

    const email = normalizeEmail(clients.find(c => c.id === reg.clientId)?.email);
    if (!email || !hasStripePaymentForEmail(email, payments)) {
      regs[idx] = markFreeSessionRegistration(regs[idx], listPrice);
      continue;
    }

    if (!pendingByEmail.has(email)) pendingByEmail.set(email, []);
    pendingByEmail.get(email).push(reg);
  }

  for (const [email, list] of pendingByEmail) {
    list.sort((a, b) => registrationBookingTimestamp(a, data) - registrationBookingTimestamp(b, data));
    const slots = unlinkedPaidCountForEmail(email, payments);
    list.forEach((reg, i) => {
      const idx = regs.findIndex(x => x.id === reg.id);
      if (idx < 0) return;
      if (i < slots) {
        regs[idx] = { ...regs[idx], paymentStatus: "pending_verification" };
      } else {
        regs[idx] = markFreeSessionRegistration(regs[idx], registrationSessionAmount(reg));
      }
    });
  }

  return regs;
}

/**
 * Pair unverified Calendly bookings (oldest first) with unlinked Stripe payments (oldest first) per email.
 * Only attempts match when a Stripe payment exists for that email.
 */
export function reconcileStripePayments(paymentsIn, registrationsIn, clients, data = {}) {
  const payments = (paymentsIn || []).map(p => ({ ...p }));
  const registrations = (registrationsIn || []).map(r => ({ ...r }));

  const pendingByEmail = new Map();
  for (const reg of registrations) {
    if (reg.status === "canceled" || reg.status === "rescheduled" || reg.stripeVerified) continue;
    const listPrice = registrationSessionAmount(reg);
    if (listPrice == null || listPrice <= 0) continue;
    const email = normalizeEmail(clients.find(c => c.id === reg.clientId)?.email);
    if (!email || !hasStripePaymentForEmail(email, payments)) continue;
    if (!pendingByEmail.has(email)) pendingByEmail.set(email, []);
    pendingByEmail.get(email).push(reg);
  }
  for (const list of pendingByEmail.values()) {
    list.sort((a, b) => registrationBookingTimestamp(a, data) - registrationBookingTimestamp(b, data));
  }

  const payByEmail = new Map();
  payments.forEach((p, i) => {
    if (p.status !== "paid" || p.bookingId || p.matchStatus === "manual") return;
    const email = normalizeEmail(p.customerEmail);
    if (!email) return;
    if (!payByEmail.has(email)) payByEmail.set(email, []);
    payByEmail.get(email).push({ i, ts: paymentSortTimestamp(p) });
  });
  for (const list of payByEmail.values()) {
    list.sort((a, b) => a.ts - b.ts);
  }

  for (const [email, pendingList] of pendingByEmail) {
    const payList = payByEmail.get(email) || [];
    const n = Math.min(pendingList.length, payList.length);
    for (let k = 0; k < n; k++) {
      linkStripePaymentToRegistration(payments, registrations, payList[k].i, pendingList[k]);
    }
  }

  return {
    payments,
    registrations: finalizeRegistrationPaymentStatuses(registrations, payments, clients, data),
  };
}

export function hasStripePaymentForEmail(email, payments) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return (payments || []).some(p =>
    p.status === "paid" && normalizeEmail(p.customerEmail) === normalized,
  );
}

/** Clear auto-matched links so reconciliation can run fresh (keeps manual links). */
export function resetStripeAutoMatches(paymentsIn, registrationsIn) {
  const payments = (paymentsIn || []).map(p => {
    if (p.matchStatus === "manual") return { ...p };
    return {
      ...p,
      bookingId: "",
      clientId: "",
      sessionId: "",
      matchStatus: p.status === "paid" ? "unmatched" : p.matchStatus,
      matchScore: 0,
      notes: p.matchStatus === "manual" ? p.notes : "",
    };
  });
  const registrations = (registrationsIn || []).map(r => {
    const manualPay = payments.some(p => p.bookingId === r.id && p.matchStatus === "manual");
    if (manualPay) return { ...r };
    if (r.stripeVerified || r.paymentId) return clearRegistrationStripeVerification(r);
    return { ...r };
  });
  return { payments, registrations };
}

/** Plain-language reason a booking is still pending verification (for UI). */
export function explainPendingVerificationReason(reg, payments, registrations, clients, data = {}) {
  const client = clients.find(c => c.id === reg.clientId);
  const email = normalizeEmail(client?.email);
  if (!email) return "No client email on file";

  const unlinked = (payments || []).filter(p =>
    p.status === "paid" && !p.bookingId && p.matchStatus !== "manual"
    && normalizeEmail(p.customerEmail) === email,
  );
  if (!unlinked.length) return "Click Sync Stripe now to match";

  const pendingSameEmail = (registrations || []).filter(r =>
    r.id !== reg.id
    && r.status !== "canceled" && r.status !== "rescheduled"
    && r.paymentStatus === "pending_verification"
    && !r.stripeVerified
    && normalizeEmail(clients.find(c => c.id === r.clientId)?.email) === email,
  );

  const regTs = registrationBookingTimestamp(reg, data);
  const pendingBefore = pendingSameEmail.filter(r =>
    registrationBookingTimestamp(r, data) < regTs,
  );

  if (pendingBefore.length >= unlinked.length) {
    return "Earlier bookings for this email will match first — click Sync Stripe now";
  }

  return "Click Sync Stripe now to match";
}
