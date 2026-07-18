/**
 * Shared cancellation → Stripe refund policy (CommonJS for the Express backend).
 * Keep in sync with src/lib/refundPolicy.js evaluateRefundPolicy / REFUND_POLICY_HOURS.
 *
 * Matrix:
 *   Host cancels    → full refund at any time.
 *   Client cancels  → full refund only when canceled more than REFUND_POLICY_HOURS
 *                     before the session start (late cancels keep the charge).
 */

const REFUND_POLICY_HOURS = 24;

/**
 * Pure timing/initiator gate from attested fields.
 * policy: { cancelerType?, canceledAt?, sessionAt? }
 * Returns { eligible, reason, flag? } — `flag` is a UI caution (optional).
 */
function evaluateRefundPolicy(policy) {
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
 * Find the backend's stored Calendly cancel event for an invitee URI.
 * Body fields are hints only — prefer this record for policy gating.
 */
function findCalendlyCancellation(queue, calendlyInviteeUri) {
  const uri = String(calendlyInviteeUri || "").trim();
  if (!uri || !Array.isArray(queue)) return null;
  let latest = null;
  for (const e of queue) {
    if (e?.eventType !== "invitee.canceled") continue;
    if (e.calendlyInviteeUri !== uri) continue;
    latest = e;
  }
  return latest;
}

/**
 * Merge a server-stored cancellation with client-supplied policy hints.
 * Without an attested cancel record, a client-supplied `cancelerType:"host"`
 * is ignored (would otherwise bypass the 24h window).
 */
function attestRefundPolicy(hint, cancellationRecord) {
  const h = hint && typeof hint === "object" ? hint : {};
  const rec = cancellationRecord && typeof cancellationRecord === "object"
    ? cancellationRecord
    : null;

  let cancelerType = "";
  if (rec) {
    cancelerType = rec.cancelerType || "";
  } else {
    const claimed = String(h.cancelerType || "").toLowerCase();
    // Unattested "host" claims are untrusted — treat as unknown initiator.
    cancelerType = claimed === "host" ? "" : (h.cancelerType || "");
  }

  return evaluateRefundPolicy({
    cancelerType,
    canceledAt: rec?.canceledAt || rec?.receivedAt || h.canceledAt || "",
    sessionAt: rec?.startTime || h.sessionAt || "",
  });
}

module.exports = {
  REFUND_POLICY_HOURS,
  evaluateRefundPolicy,
  findCalendlyCancellation,
  attestRefundPolicy,
};
