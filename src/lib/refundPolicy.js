/**
 * Shared cancellation → Stripe refund policy.
 * Used by the CRM UI (Refunds tab, Today alerts). The Express backend mirrors
 * evaluateRefundPolicy / REFUND_POLICY_HOURS in backend/lib/refundPolicy.js
 * (CommonJS) for POST /api/stripe/refund — keep both in sync.
 *
 * Matrix:
 *   Host cancels    → full refund at any time.
 *   Client cancels  → full refund only when canceled more than REFUND_POLICY_HOURS
 *                     before the session start (late cancels keep the charge).
 *   $0 / no Stripe payment / already refunded → nothing to refund (client check).
 */

export const REFUND_POLICY_HOURS = 24;

/** Session start as epoch ms — prefers reg.scheduledAt, else linked session date+time. */
export function registrationSessionTimestamp(reg, data) {
  if (reg?.scheduledAt) {
    const t = Date.parse(reg.scheduledAt);
    if (!Number.isNaN(t)) return t;
  }
  if (reg?.sessionId && data?.sessions) {
    const s = data.sessions.find(x => x.id === reg.sessionId);
    if (s?.date) {
      const t = Date.parse(`${s.date}T${(s.time || "00:00").slice(0, 5)}`);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

export function formatRegistrationDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function sortRegistrationsBySessionTime(rows, data) {
  return [...rows].sort((a, b) => registrationSessionTimestamp(b, data) - registrationSessionTimestamp(a, data));
}

/**
 * Pure timing/initiator gate from attested fields.
 * policy: { cancelerType?, canceledAt?, sessionAt? }
 * Returns { eligible, reason, flag? } — `flag` is a UI caution (optional).
 */
export function evaluateRefundPolicy(policy) {
  const p = policy && typeof policy === "object" ? policy : {};
  const canceler = String(p.cancelerType || "").toLowerCase();
  if (canceler === "host") {
    return { eligible: true, reason: "Canceled by host — full refund due" };
  }

  // Client (invitee) cancel — apply the window. Unknown initiators are treated
  // like client cancels but flagged for review before the human approves.
  const flag = canceler && canceler !== "invitee"
    ? `Canceled by "${p.cancelerType}" — review before refunding`
    : (!canceler ? "Initiator unknown — review before refunding" : "");

  const sessionTs = Date.parse(p.sessionAt || "");
  const canceledTs = Date.parse(p.canceledAt || "");
  if (!sessionTs || Number.isNaN(canceledTs)) {
    return {
      eligible: true,
      reason: "Client canceled (timing unknown)",
      flag: flag || "Cancellation timing unknown — verify the 24-hour policy before refunding",
    };
  }
  const hoursBefore = (sessionTs - canceledTs) / 3600000;
  if (hoursBefore > REFUND_POLICY_HOURS) {
    return {
      eligible: true,
      reason: `Client canceled ${Math.floor(hoursBefore)}h before session`,
      ...(flag ? { flag } : {}),
    };
  }
  return {
    eligible: false,
    reason: `Late cancel (\u2264${REFUND_POLICY_HOURS}h before session) — no refund per policy`,
  };
}

/**
 * Full CRM eligibility for a canceled booking (payment guards + policy matrix).
 * Returns { eligible, amount, reason, flag? }.
 */
export function refundEligibility(reg, data) {
  if (!reg || reg.status !== "canceled") return { eligible: false, amount: 0, reason: "Not canceled" };
  const amount = Number(reg.paidAmount) || 0;
  if (reg.stripeRefundId || reg.paymentStatus === "refunded" || (Number(reg.amountRefunded) || 0) > 0) {
    return { eligible: false, amount: 0, reason: "Already refunded" };
  }
  if (reg.refundWaived) return { eligible: false, amount, reason: "Refund waived" };
  if (amount <= 0) return { eligible: false, amount: 0, reason: "Free booking — nothing to refund" };
  if (!reg.stripePaymentIntentId && !reg.stripeChargeId) {
    return { eligible: false, amount, reason: "No Stripe payment on file" };
  }

  const sessionTs = registrationSessionTimestamp(reg, data);
  const policy = evaluateRefundPolicy({
    cancelerType: reg.cancelerType,
    canceledAt: reg.canceledAt,
    sessionAt: sessionTs ? new Date(sessionTs).toISOString() : (reg.scheduledAt || ""),
  });

  // Prefer the friendlier client-facing reason when timing is unknown but we still
  // show the review flag (matches prior Refunds UI copy).
  const reason = policy.reason === "Client canceled (timing unknown)" && policy.flag
    ? "Client canceled"
    : policy.reason;

  return {
    eligible: policy.eligible,
    amount,
    reason,
    ...(policy.flag ? { flag: policy.flag } : {}),
  };
}
