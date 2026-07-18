/**
 * Shared registration activity predicates — keep sync, LTV, and domain recounts aligned.
 */

/** Canceled or rescheduled bookings do not count toward session.registered / active revenue. */
export function isInactiveRegistration(r) {
  return !r || r.status === "canceled" || r.status === "rescheduled";
}

export function isActiveRegistration(r) {
  return !!r && !isInactiveRegistration(r);
}
