/** Stripe ↔ Calendly reconciliation (pure functions — testable).
 *
 * Simple flow:
 * 1. Calendly booking with a list price → unknown until Stripe sync
 * 2. Sync → match by email + nearest booking time; prefer amount ties first
 * 3. Positive list price with no matching Stripe charge for that email → unmatched
 *    (not auto-free — email mismatches would silently undercount revenue)
 * 4. Zero/blank list price, or operator-confirmed coupon → free ($0)
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

/** Stripe payment gross in dollars (handles dual cents/legacy dollar storage). */
export function paymentGrossDollars(p) {
  if (!p) return null;
  const raw = Number(p.amountGross);
  if (Number.isNaN(raw)) return null;
  return p._centsFormat ? raw / 100 : raw;
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
  // Dual-format: integer cents when _centsFormat, else legacy dollar float.
  const gross = paymentGrossDollars(p) ?? 0;
  payments[payIdx] = {
    ...p,
    clientId: reg.clientId,
    bookingId: reg.id,
    sessionId: reg.sessionId,
    matchStatus: "auto",
    matchScore: 100,
    notes: "Matched by email + time",
  };
  const ri = registrations.findIndex(r => r.id === reg.id);
  if (ri < 0) return;
  const prev = registrations[ri];
  registrations[ri] = {
    ...prev,
    paidAmount: gross,
    paymentStatus: "paid",
    stripeVerified: true,
    stripePaymentIntentId: p.stripePaymentIntentId || "",
    stripeChargeId: p.stripeChargeId || "",
    paidAt: p.paidAt || "",
    paymentId: p.id,
    amountRefunded: 0,
    couponCode: "", // real charge supersedes a free-coupon confirmation
    // Drop the placeholder "free session" mismatch — a real Stripe amount now applies.
    lastAmountMismatch: prev.lastAmountMismatch?.reason === "free" ? undefined : prev.lastAmountMismatch,
  };
}

/** Positive list price, no Stripe charge for this email — do not auto-zero as free. */
function markUnmatchedPaidBooking(reg) {
  return {
    ...reg,
    paymentStatus: "unmatched",
    stripeVerified: false,
    paidAmount: null,
    // Clear a prior auto-free mark so the booking surfaces as a payment exception.
    lastAmountMismatch: reg.lastAmountMismatch?.reason === "free" ? undefined : reg.lastAmountMismatch,
  };
}

/**
 * Operator confirms a 100%-off coupon for a booking that never hit Stripe.
 * Marks the registration as a free ($0) session and stores the coupon code so it
 * leaves the Stripe "payment exceptions" list.
 */
export function confirmRegistrationFreeCoupon(reg, couponCode) {
  const code = String(couponCode || "").trim().toUpperCase();
  if (!reg || !code) return reg;
  const listPrice = reg.lastAmountMismatch?.expectedAmount
    ?? reg.paymentAmount
    ?? registrationSessionAmount(reg)
    ?? 0;
  return {
    ...reg,
    couponCode: code,
    paymentStatus: "paid",
    stripeVerified: false,
    paidAmount: 0,
    lastAmountMismatch: {
      expectedAmount: listPrice,
      stripeAmount: 0,
      reason: "free",
      couponCode: code,
      correctedAt: new Date().toISOString(),
    },
  };
}

/**
 * After matching: pending when an unlinked Stripe payment can still pair (same email).
 * Positive list price with no charge for that email → unmatched (not auto-free).
 * Zero/blank list price → free $0. Operator coupon → keep free.
 */
export function finalizeRegistrationPaymentStatuses(registrations, payments, clients, data = {}) {
  const regs = (registrations || []).map(r => ({ ...r }));
  const pendingByEmail = new Map();

  for (const reg of regs) {
    if (reg.stripeVerified || reg.status === "canceled" || reg.status === "rescheduled") continue;
    // Refunded bookings keep their Stripe link/amounts — do not reclassify as free.
    if (reg.paymentStatus === "refunded" || reg.paymentStatus === "partial_refund") continue;
    // Operator-confirmed free coupon — keep $0 / paid; do not reclassify as pending.
    if (String(reg.couponCode || "").trim()) {
      const idxKeep = regs.findIndex(x => x.id === reg.id);
      if (idxKeep >= 0) {
        regs[idxKeep] = {
          ...regs[idxKeep],
          paymentStatus: "paid",
          stripeVerified: false,
          paidAmount: 0,
        };
      }
      continue;
    }
    const listPrice = registrationSessionAmount(reg);
    const idx = regs.findIndex(x => x.id === reg.id);
    if (idx < 0) continue;

    if (listPrice == null || listPrice <= 0) {
      regs[idx] = { ...regs[idx], paymentStatus: "paid", paidAmount: 0 };
      continue;
    }

    const email = normalizeEmail(clients.find(c => c.id === reg.clientId)?.email);
    if (!email || !hasStripePaymentForEmail(email, payments)) {
      // Likely Stripe email ≠ Calendly email, or charge not synced yet — never silent $0.
      regs[idx] = markUnmatchedPaidBooking(regs[idx]);
      continue;
    }

    if (!pendingByEmail.has(email)) pendingByEmail.set(email, []);
    pendingByEmail.get(email).push(reg);
  }

  for (const [email, list] of pendingByEmail) {
    // Most recently booked first — the newest booking is the one a fresh charge verifies.
    list.sort((a, b) => registrationBookingTimestamp(b, data) - registrationBookingTimestamp(a, data));
    const slots = unlinkedPaidCountForEmail(email, payments);
    list.forEach((reg, i) => {
      const idx = regs.findIndex(x => x.id === reg.id);
      if (idx < 0) return;
      if (i < slots) {
        regs[idx] = { ...regs[idx], paymentStatus: "pending_verification" };
      } else {
        // More priced bookings than unlinked charges for this email — unmatched, not free.
        regs[idx] = markUnmatchedPaidBooking(regs[idx]);
      }
    });
  }

  return regs;
}

// A Stripe charge is created at the moment a participant books, so the charge time
// is effectively the same as the booking time. Match within this window (handles
// webhook/sync lag and timezone skew) and pick the closest booking.
export const STRIPE_MATCH_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Tie each Stripe charge to the Calendly booking it paid for, by matching the charge
 * time to the booking time for the same participant. Within the window, prefer a
 * booking whose list price amountsMatch the charge (first-pass tiebreaker); otherwise
 * the closest booking in time wins. The Stripe amount becomes that booking's session amount.
 */
export function reconcileStripePayments(paymentsIn, registrationsIn, clients, data = {}) {
  const payments = (paymentsIn || []).map(p => ({ ...p }));
  const registrations = (registrationsIn || []).map(r => ({ ...r }));

  // Unverified bookings per participant.
  const bookingsByEmail = new Map();
  for (const reg of registrations) {
    if (reg.status === "canceled" || reg.status === "rescheduled" || reg.stripeVerified) continue;
    const email = normalizeEmail(clients.find(c => c.id === reg.clientId)?.email);
    if (!email) continue;
    if (!bookingsByEmail.has(email)) bookingsByEmail.set(email, []);
    bookingsByEmail.get(email).push(reg);
  }

  // Unlinked paid charges per participant, processed oldest first for stable assignment.
  const payByEmail = new Map();
  payments.forEach((p, i) => {
    if (p.status !== "paid" || p.bookingId || p.matchStatus === "manual") return;
    const email = normalizeEmail(p.customerEmail);
    if (!email) return;
    if (!payByEmail.has(email)) payByEmail.set(email, []);
    payByEmail.get(email).push(i);
  });

  for (const [email, payIdxList] of payByEmail) {
    const bookingList = bookingsByEmail.get(email) || [];
    const used = new Set();
    payIdxList.sort((a, b) => paymentSortTimestamp(payments[a]) - paymentSortTimestamp(payments[b]));
    for (const payIdx of payIdxList) {
      const payTs = paymentSortTimestamp(payments[payIdx]);
      const payAmt = paymentGrossDollars(payments[payIdx]);
      let best = -1;
      let bestDiff = Infinity;
      let bestAmtMatch = false;
      for (let k = 0; k < bookingList.length; k++) {
        if (used.has(k)) continue;
        const diff = Math.abs(registrationBookingTimestamp(bookingList[k], data) - payTs);
        if (diff > STRIPE_MATCH_WINDOW_MS) continue;
        const listPrice = registrationSessionAmount(bookingList[k]);
        const amtOk = listPrice != null && payAmt != null && amountsMatch(listPrice, payAmt);
        // First-pass: prefer amount match; among the same class, prefer nearer time.
        if (
          best < 0
          || (amtOk && !bestAmtMatch)
          || (amtOk === bestAmtMatch && diff < bestDiff)
        ) {
          best = k;
          bestDiff = diff;
          bestAmtMatch = amtOk;
        }
      }
      if (best >= 0) {
        used.add(best);
        linkStripePaymentToRegistration(payments, registrations, payIdx, bookingList[best]);
      }
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

/** Clear auto-matched links so reconciliation can run fresh.
 * Keeps manual links and refunded/partial_refund links (re-link only considers paid). */
export function resetStripeAutoMatches(paymentsIn, registrationsIn) {
  const payments = (paymentsIn || []).map(p => {
    if (p.matchStatus === "manual") return { ...p };
    // Refunded charges are not re-linked (reconcile only matches status === "paid").
    // Clearing their bookingId would permanently orphan them and zero the registration.
    if (p.status === "refunded" || p.status === "partial_refund") return { ...p };
    return {
      ...p,
      bookingId: "",
      clientId: "",
      sessionId: "",
      matchStatus: p.status === "paid" ? "unmatched" : p.matchStatus,
      matchScore: 0,
      notes: "",
    };
  });
  const registrations = (registrationsIn || []).map(r => {
    // Any payment that still points here (manual or refunded) keeps the registration intact.
    if (payments.some(p => p.bookingId === r.id)) return { ...r };
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
  const moreRecent = pendingSameEmail.filter(r =>
    registrationBookingTimestamp(r, data) > regTs,
  );

  if (moreRecent.length >= unlinked.length) {
    return "More recent bookings for this participant match first — click Sync Stripe now";
  }

  return "Click Sync Stripe now to match";
}
