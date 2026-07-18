import { cleanName, money } from "../format.js";
import { calcNet, readAmt } from "./money.js";
import {
  LTV_OFFER_STATUSES,
  buildSessionMap,
  offerRevenueChannel,
  registrationPaymentForLtv,
  registrationRevenueChannel,
} from "./ltv.js";

// ── Auto-maintained financial ledgers ──────────────────────────────────────
// Booking charges and refunds are materialised as revenue-table records (`regrev_*`).
// Refunds are **negative gross** rows (not a parallel "Refunds & Cancellations" expense),
// so P&L never subtracts the same money twice. Studio partner splits remain auto expenses.
export const AUTO_REV_ID_PREFIX = "regrev_";      // revenue record per booking charge / refund
export const AUTO_CXL_EXP_ID_PREFIX = "cxlexp_";  // legacy auto cancellation expenses (purged on sync)
export const AUTO_SPLIT_EXP_ID_PREFIX = "studiosplit_"; // expense record per studio session's revenue split
export const isAutoRevenueRecord = (r) => !!r?.auto || String(r?.id || "").startsWith(AUTO_REV_ID_PREFIX);
export const isAutoExpenseRecord = (e) => !!e?.auto
  || String(e?.id || "").startsWith(AUTO_CXL_EXP_ID_PREFIX)
  || String(e?.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX);

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
  // Sum charge + negative refund rows (refunds are negative gross, not a separate field).
  const gross = Math.round(
    sessionRevRows.reduce((sum, r) => sum + (Number(r.gross) || 0) - (Number(r.refunds) || 0), 0) * 100
  ) / 100;
  const participantCount = sessionRevRows.filter(r => !r.isRefund && (Number(r.gross) || 0) > 0).length;
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

// Index the Stripe payments ledger by the booking each charge paid for. Mirrors how the Stripe
// reconciliation page links charges to bookings, so revenue can read the same source of truth.
export function buildPaidPaymentsByBooking(payments) {
  const map = {};
  (payments || []).forEach(p => {
    // Include refunded charges so we can emit the original gross + a negative refund row.
    if (p.bookingId && (p.status === "paid" || p.status === "partial_refund" || p.status === "refunded")) {
      map[p.bookingId] = p;
    }
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
  if (reg.paidAmount != null && (
    reg.stripeVerified
    || reg.paymentStatus === "paid"
    || reg.paymentStatus === "partial_refund"
    || reg.paymentStatus === "refunded"
  )) {
    return {
      gross:   Math.max(0, Number(reg.paidAmount) || 0),
      refunds: Math.max(0, Number(reg.amountRefunded) || 0),
    };
  }
  // Canceled + refunded with no payment row still on file.
  if (reg.status === "canceled" && (Number(reg.amountRefunded) || 0) > 0) {
    return {
      gross:   Math.max(0, Number(reg.paidAmount) || Number(reg.amountRefunded) || 0),
      refunds: Math.max(0, Number(reg.amountRefunded) || 0),
    };
  }
  return { gross: 0, refunds: 0 }; // no Stripe charge → $0, matching the Stripe log
}

function buildRegRevenueRow(r, session, client, {
  gross, date, notes, isRefund = false, isFree = false, idSuffix = "",
}) {
  const channel = registrationRevenueChannel(session);
  const net = Math.round(Number(gross) * 100) / 100;
  return {
    id: AUTO_REV_ID_PREFIX + r.id + idSuffix,
    name: client
      ? `${cleanName(client.name)} — ${cleanName(session?.name || r.eventName || "Session")}${isRefund ? " (refund)" : ""}`
      : cleanName(session?.name || r.eventName || "Session booking") + (isRefund ? " (refund)" : ""),
    date,
    channel,
    source: client?.source || "Calendly",
    campaign: "",
    sessionId: r.sessionId || "",
    studioId: session?.studioId || null,
    clientId: r.clientId || "",
    client: client ? cleanName(client.name) : "",
    gross: net,
    stripeFee: 0,
    studioSplit: 0,
    facilitatorCost: 0,
    // Refunds are negative gross rows — never also stored in `refunds` (avoids double-count with expenses).
    refunds: 0,
    net,
    costCenter: channel,
    notes,
    registrationId: r.id,
    bookedAt: isRefund ? (r.refundedAt || r.canceledAt || r.paidAt || r.createdAt || "") : (r.paidAt || r.createdAt || ""),
    isFree: !!isFree,
    isRefund: !!isRefund,
    stripeRefundId: isRefund ? (r.stripeRefundId || "") : "",
    refundedAt: isRefund ? (r.refundedAt || "") : "",
    _derived: true,
  };
}

export function buildRegistrationRevenueRows(data = {}) {
  const sessions = buildSessionMap(data.sessions);
  const clients = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
  const paidByBooking = buildPaidPaymentsByBooking(data.payments);
  const rows = [];

  for (const r of (data.registrations || [])) {
    if (r.status === "rescheduled") continue;
    // Skip unresolved payment states — priced bookings with status "unknown" (pre-Stripe-sync)
    // must not emit $0 isFree rows that understate revenue until reconcile.
    if (["unpaid", "pending_verification", "unmatched", "failed", "unknown"].includes(r.paymentStatus)) continue;

    const session = sessions[r.sessionId];
    const client = clients[r.clientId];
    const { gross: chargeGross, refunds: chargeRefunds } = bookingStripeCharge(r, paidByBooking);
    const refunded = Math.max(0, Number(r.amountRefunded) || chargeRefunds || 0);

    // Canceled: keep the original charge (if any) and emit a negative revenue row for the refund.
    // Do not drop the charge when canceling — that plus a cancellation expense double-counted.
    if (r.status === "canceled") {
      if (chargeGross > 0) {
        const chargeDate = (session?.date || r.scheduledAt || r.paidAt || r.createdAt || "").slice(0, 10);
        if (chargeDate) {
          rows.push(buildRegRevenueRow(r, session, client, {
            gross: chargeGross,
            date: chargeDate,
            notes: "Actual Stripe charge",
          }));
        }
      }
      if (refunded > 0) {
        const refundDate = (r.refundedAt || r.canceledAt || r.scheduledAt || r.createdAt || "").slice(0, 10);
        if (refundDate) {
          rows.push(buildRegRevenueRow(r, session, client, {
            gross: -refunded,
            date: refundDate,
            notes: r.stripeRefundId ? `Stripe refund ${r.stripeRefundId}` : "Stripe refund",
            isRefund: true,
            idSuffix: "_refund",
          }));
        }
      }
      continue;
    }

    // Active bookings (including partial/full refunds while still booked).
    const chargeDate = (session?.date || r.scheduledAt || r.createdAt || "").slice(0, 10);
    if (!chargeDate) continue;

    if (chargeGross <= 0 && refunded <= 0) {
      rows.push(buildRegRevenueRow(r, session, client, {
        gross: 0,
        date: chargeDate,
        notes: "Actual Stripe charge",
        isFree: true,
      }));
      continue;
    }

    if (chargeGross > 0) {
      rows.push(buildRegRevenueRow(r, session, client, {
        gross: chargeGross,
        date: chargeDate,
        notes: "Actual Stripe charge",
        isFree: chargeGross === 0,
      }));
    }

    if (refunded > 0) {
      const refundDate = (r.refundedAt || chargeDate).slice(0, 10);
      rows.push(buildRegRevenueRow(r, session, client, {
        gross: -refunded,
        date: refundDate,
        notes: r.stripeRefundId ? `Stripe refund ${r.stripeRefundId}` : "Stripe refund",
        isRefund: true,
        idSuffix: "_refund",
      }));
    }
  }

  return rows;
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

// ── Auto-maintained financial ledgers (builders) ────────────────────────────
// syncBookingLedgers is run from an effect whenever bookings change (see the App component).
export function buildBookingLedgerRecords(data = {}) {
  const partners = Object.fromEntries((data.partners || []).map(p => [p.id, p]));

  // Revenue: charge rows + negative refund rows (single ledger for refunds — no cxlexp P&L).
  const revenueRows = buildRegistrationRevenueRows(data);
  const revenue = revenueRows.map(row => ({
    ...row,
    notes: row.isRefund
      ? (row.notes || "Auto-recorded Stripe refund")
      : "Auto-recorded from Calendly booking",
    auto: true,
  }));

  // Studio split: one expense per studio session that owes its partner a revenue share. The amount
  // is derived from actual Stripe revenue received for that session × the partner's share % —
  // automatically stays accurate without any manual entry as payments come in and refunds occur.
  // (Legacy cxlexp_* cancellation expenses are intentionally not regenerated — refunds live on revenue.)
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

  return { revenue, expenses: splitExpenses };
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
// with studioSessionFinance that reads the real studioSharePct from the partner.
// Arithmetic is done in cents to avoid float-subtraction drift.
export function applyStudioSessionSplit(data) {
  const partnersById = Object.fromEntries((data.partners || []).map(p => [p.id, p]));
  return (row) => {
    if (row.isRefund || row.channel !== "Studio session") return row;
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
