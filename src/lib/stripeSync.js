/**
 * Pure Stripe queue/ledger → CRM apply (the setData body of App.syncStripe).
 */
import {
  processStripeWebhookEvents,
  applyPaymentReconciliation,
} from "./revenue/index.js";

/** Deduplicate pending + ledger events by stripeEventId || id (pending first). */
export function mergeStripeSyncEvents(pendingEvents = [], ledgerEvents = []) {
  const seen = new Set();
  return [...pendingEvents, ...ledgerEvents].filter(e => {
    const key = e.stripeEventId || e.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Apply Stripe pending/ledger events, then payment reconciliation + amount fixes.
 * processStripeWebhookEvents already runs applyPaymentReconciliation — do not call it again.
 * @returns {{ data, processed, ackIds }}
 */
export function applyStripeSyncEvents(prevData, events, pendingEvents = []) {
  let next = prevData || {};
  let processed = 0;
  let ackIds = [];

  if (events?.length) {
    const result = processStripeWebhookEvents(next, events);
    processed = pendingEvents?.length || 0;
    ackIds = result.ackIds.filter(id => (pendingEvents || []).some(e => e.id === id));
    next = {
      ...next,
      payments: result.payments,
      registrations: result.registrations,
      sessions: result.sessions,
      clients: result.clients,
    };
  } else {
    // Empty event list still heals matches (e.g. bookings arrived after Stripe).
    next = applyPaymentReconciliation(next);
  }

  return {
    data: next,
    processed,
    ackIds,
  };
}
