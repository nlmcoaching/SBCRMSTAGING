import { useState, useEffect, useMemo, Fragment } from "react";
import { RefreshCw, ChevronRight, ArrowUpRight } from "lucide-react";
import { C, hexA } from "../../lib/theme.js";
import { fmtDate, money, norm, cleanName } from "../../lib/format.js";
import { readAmt, applyPaymentReconciliation, reconcileAmountMismatches, formatRegistrationAmount, registrationRevenueChannel } from "../../lib/revenue.js";
import { amountsMatch, normalizeEmail, registrationSessionAmount, registrationCreatedTimestamp } from "../../stripeMatching.js";
import { Panel, Empty } from "../../components/primitives.jsx";

function formatRegistrationDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function registrationBookedDisplay(reg) {
  return formatRegistrationDateTime(reg.createdAt || reg.scheduledAt || reg.calendlyReceivedAt);
}

function sortRegistrationsByCreatedAt(rows) {
  return [...rows].sort((a, b) => registrationCreatedTimestamp(b) - registrationCreatedTimestamp(a));
}

// Module-private remount guard: payment amount repair runs once per page load
// (Strict Mode / drawer remounts must not re-apply the same patches).
let _paymentRepairRanOnce = false;

export function paymentStatusLabel(status) {
  const map = {
    paid: { text: "Paid", color: "#2D6A50" },
    pending_verification: { text: "Pending verification", color: "#D9892B" },
    unmatched: { text: "Unmatched", color: "#C0573F" },
    unpaid: { text: "Unpaid", color: "#C0573F" },
    partial_refund: { text: "Partial refund", color: "#9B59B6" },
    refunded: { text: "Refunded", color: "#C0573F" },
    failed: { text: "Failed", color: "#C0573F" },
    unknown: { text: "Unknown", color: C.ink3 },
  };
  return map[status] || map.unknown;
}

export function registrationSessionMeta(reg, data) {
  const session = (data.sessions || []).find(s => s.id === reg.sessionId);
  const channel = registrationRevenueChannel(session);
  let sessionDate = "—";
  if (reg.scheduledAt) sessionDate = formatRegistrationDateTime(reg.scheduledAt);
  else if (session?.date) sessionDate = `${fmtDate(session.date, true)}${session.time ? ` · ${session.time}` : ""}`;
  return {
    session,
    channel,
    sessionDate,
    sessionName: cleanName(session?.name || reg.eventName || "Session"),
  };
}

export function ChargeDetails({ row }) {
  const d = row.details || {};
  const dl = { fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: C.ink3, fontWeight: 600, marginBottom: 2 };
  const dv = { fontSize: 12.5, color: C.ink, wordBreak: "break-all" };
  const mono = { ...dv, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
  const items = [
    { label: "Session date & time", value: d.sessionDateTime || "—", style: dv },
    { label: "Status", value: d.status || "—", style: dv },
    { label: "Paid at", value: d.paidAt || "—", style: dv },
    { label: "Amount", value: `${money(row.stripeAmount)} ${d.currency || ""}`.trim(), style: dv },
    { label: "Refunded", value: d.amountRefunded ? money(d.amountRefunded) : "—", style: dv },
    { label: "Payment method", value: d.paymentMethodType || "—", style: dv },
    { label: "Session", value: row.matched ? `${row.sessionName}${row.channel ? ` · ${row.channel}` : ""}` : "No matching booking", style: dv },
    { label: "Match", value: d.matchStatus || "—", style: dv },
    { label: "Charge ID", value: d.stripeChargeId || "—", style: mono },
    { label: "Payment intent", value: d.stripePaymentIntentId || "—", style: mono },
    { label: "Checkout session", value: d.stripeCheckoutSessionId || "—", style: mono },
    { label: "Event ID", value: d.stripeEventId || "—", style: mono },
  ];
  return (
    <div style={{ paddingTop: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 24px" }}>
        {items.map(it => (
          <div key={it.label}>
            <div style={dl}>{it.label}</div>
            <div style={it.style}>{it.value}</div>
          </div>
        ))}
      </div>
      {(d.receiptUrl || d.notes) && (
        <div style={{ marginTop: 12, display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          {d.receiptUrl && (
            <a href={d.receiptUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "#2F6FD0", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <ArrowUpRight size={13} /> View Stripe receipt
            </a>
          )}
          {d.notes && <div style={{ fontSize: 12, color: C.ink3 }}>{d.notes}</div>}
        </div>
      )}
    </div>
  );
}

export function PaymentReconciliationView({ data, derived, setData, onOpen, syncStripe, stripeStatus, canEdit, query }) {
  const payments = data.payments || [];
  const registrations = data.registrations || [];
  const clients = data.clients || [];
  const [expandedCharges, setExpandedCharges] = useState({});
  const toggleCharge = (id) => setExpandedCharges(prev => ({ ...prev, [id]: !prev[id] }));

  // One-time repair: undo stale "unmatched" booking labels and re-run FIFO matching.
  // Guard is a module-level variable (not useRef) so it persists across remounts.
  useEffect(() => {
    if (!setData || _paymentRepairRanOnce) return;
    _paymentRepairRanOnce = true;
    setData(prev => applyPaymentReconciliation(prev));
  }, [setData]);

  useEffect(() => {
    // Mirror reconcileAmountMismatches: Stripe-verified + paidAmount set, but list
    // price missing/NaN or not matching paidAmount. Keep this aligned so a no-op
    // reconcile cannot leave needsFix true (endless setData / re-encrypt loop).
    const needsFix = registrations.some(r => {
      if (!r.stripeVerified || r.paidAmount == null) return false;
      const stripeAmt = Number(r.paidAmount);
      if (Number.isNaN(stripeAmt)) return false;
      const hasListPrice = r.paymentAmount != null && r.paymentAmount !== "";
      const expected = hasListPrice ? Number(r.paymentAmount) : null;
      if (expected == null || Number.isNaN(expected)) return true;
      return !amountsMatch(expected, stripeAmt);
    });
    if (!needsFix || !setData) return;
    setData(prev => {
      const fix = reconcileAmountMismatches(prev);
      if (fix.registrations === prev.registrations) return prev;
      return { ...prev, registrations: fix.registrations, sessions: fix.sessions, clients: fix.clients };
    });
  }, [registrations, setData]);

  const pendingBookings = registrations.filter(r =>
    r.status !== "canceled"
    && r.status !== "rescheduled"
    && r.paymentStatus === "pending_verification"
    && !r.stripeVerified,
  );
  // One row per Stripe charge, tied to the Calendly session it paid for. Any booking with no
  // Stripe charge (e.g. a free/coupon-code booking that never hits Stripe) is surfaced as a
  // $0.00 "Free session" row so the page is a complete record of every booking. These are
  // display-only and self-correct: if a charge arrives later, the booking matches and the row
  // becomes a normal charge automatically.
  const sessions = data.sessions || [];
  const stripeCharges = useMemo(() => {
    // Build O(1) lookup maps once — avoids O(n×m) .find()/.some() per payment/booking.
    const regById      = new Map(registrations.map(r => [r.id, r]));
    const clientById   = new Map(clients.map(c => [c.id, c]));
    const clientByEmail = new Map(
      clients.filter(c => c.email).map(c => [normalizeEmail(c.email), c]),
    );
    const sessionById  = new Map(sessions.map(s => [s.id, s]));
    // paymentsByBookingId: one payment can match one booking; track which statuses link them.
    const paymentsByBookingId = new Map();
    payments.forEach(p => {
      if (p.bookingId) {
        if (!paymentsByBookingId.has(p.bookingId)) paymentsByBookingId.set(p.bookingId, []);
        paymentsByBookingId.get(p.bookingId).push(p);
      }
    });

    const regSessionMeta = (reg) => {
      const session = sessionById.get(reg.sessionId);
      const channel = registrationRevenueChannel(session);
      let sessionDate = "—";
      if (reg.scheduledAt) sessionDate = formatRegistrationDateTime(reg.scheduledAt);
      else if (session?.date) sessionDate = `${fmtDate(session.date, true)}${session.time ? ` · ${session.time}` : ""}`;
      return { session, channel, sessionDate, sessionName: cleanName(session?.name || reg.eventName || "Session") };
    };

    const ts = (s) => { const t = Date.parse(s || ""); return Number.isNaN(t) ? 0 : t; };
    const chargeRows = payments
      .filter(p => p.status === "paid")
      .map(p => {
        const booking = regById.get(p.bookingId);
        const client = (booking && clientById.get(booking.clientId))
          || clientByEmail.get(normalizeEmail(p.customerEmail));
        const meta = booking ? regSessionMeta(booking) : null;
        const expected = booking
          ? (booking.lastAmountMismatch?.expectedAmount ?? booking.paymentAmount ?? registrationSessionAmount(booking))
          : null;
        const amt = readAmt(p, "amountGross");
        return {
          id: p.id,
          name: cleanName(client?.name || p.customerEmail || "—"),
          email: client?.email || p.customerEmail || "",
          sessionName: meta?.sessionName || (booking ? cleanName(booking.eventName || "Session") : null),
          channel: meta?.channel || null,
          matched: !!booking,
          description: p.description || "",
          paidDisplay: formatRegistrationDateTime(p.paidAt || p.createdAt),
          bookedDisplay: formatRegistrationDateTime(booking ? booking.createdAt : (p.paidAt || p.createdAt)),
          sortTs: booking ? registrationCreatedTimestamp(booking) : ts(p.paidAt || p.createdAt),
          expected,
          stripeAmount: amt,
          sessionAmount: amt,
          details: {
            sessionDateTime: booking ? (formatRegistrationDateTime(booking.scheduledAt) || "—") : "—",
            status: p.status || "",
            currency: (p.currency || "usd").toUpperCase(),
            paidAt: formatRegistrationDateTime(p.paidAt) || "—",
            paymentMethodType: p.paymentMethodType || "",
            amountRefunded: readAmt(p, "amountRefunded"),
            stripeChargeId: p.stripeChargeId || "",
            stripePaymentIntentId: p.stripePaymentIntentId || "",
            stripeCheckoutSessionId: p.stripeCheckoutSessionId || "",
            stripeEventId: p.stripeEventId || "",
            receiptUrl: p.receiptUrl || "",
            matchStatus: p.matchStatus || "",
            notes: p.notes || "",
          },
        };
      });

    // Bookings with no paid Stripe charge: split into genuine-free rows and payment exceptions.
    // pending_verification is excluded here — it has its own "Bookings awaiting a charge" panel.
    // Also exclude bookings whose linked payment was refunded: they are already covered by the
    // "Refunded payments" panel and should not reappear here as a phantom "Free session".
    const _linkedStatuses = new Set(["paid", "partial_refund", "refunded"]);
    const noChargeCandidates = registrations
      .filter(r => r.status !== "canceled" && r.status !== "rescheduled"
        && !r.stripeVerified && r.paymentStatus !== "pending_verification")
      .filter(r => !(paymentsByBookingId.get(r.id) || []).some(p => _linkedStatuses.has(p.status)));

    // A booking is a payment exception when it carries evidence that money WAS expected/attempted
    // (status "paid", "failed", or "unmatched") but no Stripe charge exists. Auto-forgiving these
    // as free would silently absorb failed or missing charges as comped sessions.
    const isPaymentException = (r) => {
      if (r.paymentStatus === "failed") return true;
      const expAmt = r.lastAmountMismatch?.expectedAmount ?? r.paymentAmount ?? registrationSessionAmount(r);
      return (r.paymentStatus === "paid" || r.paymentStatus === "unmatched") && Number(expAmt) > 0;
    };

    const freeRows = noChargeCandidates
      .filter(r => !isPaymentException(r))
      .map(r => {
        const client = clientById.get(r.clientId);
        const meta = regSessionMeta(r);
        const expected = r.lastAmountMismatch?.expectedAmount ?? r.paymentAmount ?? registrationSessionAmount(r);
        return {
          id: `free-${r.id}`,
          name: cleanName(client?.name || "—"),
          email: client?.email || "",
          sessionName: meta?.sessionName || cleanName(r.eventName || "Session"),
          channel: meta?.channel || null,
          matched: true,
          free: true,
          paymentException: false,
          description: "Free session — no Stripe charge",
          paidDisplay: "—",
          bookedDisplay: formatRegistrationDateTime(r.createdAt),
          sortTs: registrationCreatedTimestamp(r),
          expected,
          stripeAmount: 0,
          sessionAmount: 0,
          details: {
            sessionDateTime: formatRegistrationDateTime(r.scheduledAt) || "—",
            status: "free session",
            currency: "USD",
            paidAt: "—",
            paymentMethodType: "",
            amountRefunded: 0,
            stripeChargeId: "",
            stripePaymentIntentId: "",
            stripeCheckoutSessionId: "",
            stripeEventId: "",
            receiptUrl: "",
            matchStatus: "free",
            notes: "No Stripe transaction tied to this booking — recorded as a free ($0.00) session (e.g. booked with a free coupon code).",
          },
        };
      });

    // Payment exceptions: bookings where a charge was expected/attempted but cannot be found in
    // Stripe. Surfaced separately so operators can investigate rather than treating them as free.
    const exceptionRows = noChargeCandidates
      .filter(r => isPaymentException(r))
      .map(r => {
        const client = clientById.get(r.clientId);
        const meta = regSessionMeta(r);
        const expected = r.lastAmountMismatch?.expectedAmount ?? r.paymentAmount ?? registrationSessionAmount(r);
        const expectedAmt = expected != null ? Number(expected) : null;
        const isFailed = r.paymentStatus === "failed";
        return {
          id: `exc-${r.id}`,
          bookingId: r.id,
          name: cleanName(client?.name || "—"),
          email: client?.email || "",
          sessionName: meta?.sessionName || cleanName(r.eventName || "Session"),
          channel: meta?.channel || null,
          matched: true,
          free: false,
          paymentException: true,
          paymentStatus: r.paymentStatus,
          description: isFailed
            ? "Charge failed — no payment collected"
            : `No Stripe charge found (booking status: ${r.paymentStatus})`,
          paidDisplay: "—",
          bookedDisplay: formatRegistrationDateTime(r.createdAt),
          sortTs: registrationCreatedTimestamp(r),
          expected,
          stripeAmount: 0,
          sessionAmount: 0,
          details: {
            sessionDateTime: formatRegistrationDateTime(r.scheduledAt) || "—",
            status: isFailed ? "charge failed" : r.paymentStatus,
            currency: "USD",
            paidAt: "—",
            paymentMethodType: "",
            amountRefunded: 0,
            stripeChargeId: "",
            stripePaymentIntentId: "",
            stripeCheckoutSessionId: "",
            stripeEventId: "",
            receiptUrl: "",
            matchStatus: "missing_charge",
            notes: `Payment was expected (status: ${r.paymentStatus}${expectedAmt > 0 ? `, expected ${money(expectedAmt)}` : ""}) but no Stripe charge could be found. Not auto-forgiven as free — reconcile or mark manually.`,
          },
        };
      });

    return [...chargeRows, ...freeRows, ...exceptionRows].sort((a, b) => b.sortTs - a.sortTs);
  }, [payments, registrations, clients, sessions, stripeStatus?.reconciledAt, stripeStatus?.at]);
  // Header search box: filter every list on the page by name, email, session, or description.
  const q = norm(query);
  const chargeMatches = (c) => !q
    || [c.name, c.email, c.sessionName, c.description, c.channel].some(v => norm(v).includes(q));
  // Exception rows are kept separate so they never silently absorb into the normal charge list.
  const exceptionCharges = stripeCharges.filter(c => c.paymentException).filter(chargeMatches);
  const matchedCharges   = stripeCharges.filter(c => c.matched && !c.paymentException).filter(chargeMatches);
  const unmatchedCharges = stripeCharges.filter(c => !c.matched).filter(chargeMatches);
  const refundedPayments = payments
    .filter(p => p.status === "refunded" || p.status === "partial_refund")
    .filter(p => !q || [p.customerEmail, p.description].some(v => norm(v).includes(q)));
  const pendingBookingsShown = pendingBookings.filter(r => {
    if (!q) return true;
    const client = clients.find(c => c.id === r.clientId);
    return [client?.name, client?.email, r.eventName].some(v => norm(v).includes(q));
  });

  const thS = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left" };
  const tdS = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5, maxWidth: 640 }}>
          <strong>How it works:</strong> A Stripe charge is created the moment a participant books, so each charge is tied to the Calendly session booked at the same time. The Stripe amount becomes that session's amount. Click <strong>Sync Stripe now</strong> to pull the latest charges.
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button type="button" className="sb-ghost" onClick={syncStripe} disabled={stripeStatus?.syncing}
            style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <RefreshCw size={15} style={{ animation: stripeStatus?.syncing ? "spin 1s linear infinite" : "none" }} />
            {stripeStatus?.syncing ? "Syncing Stripe…" : "Sync Stripe now"}
          </button>
        </div>
      </div>

      {stripeStatus?.error && (
        <div style={{ background: hexA("#C0573F", 0.08), border: `1px solid ${hexA("#C0573F", 0.25)}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#8B3A2F" }}>
          {stripeStatus.error}
        </div>
      )}

      {pendingBookings.length > 0 && (data.payments || []).length === 0 && (
        <div style={{ background: hexA("#D9892B", 0.09), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#7A4D0F", lineHeight: 1.55 }}>
          <strong>No Stripe payments in the CRM yet.</strong> Click <strong>Sync Stripe now</strong> to load charges from the backend ledger and tie them to bookings.
          If this persists, confirm Stripe webhooks reach your backend URL → <code>/api/webhooks/stripe</code> (check ngrok at http://127.0.0.1:4040).
        </div>
      )}

      {exceptionCharges.length > 0 && (
        <Panel title={`Payment exceptions — charge expected but not found (${exceptionCharges.length})`}>
          <div style={{ fontSize: 12, color: "#8B3A2F", marginBottom: 12, lineHeight: 1.55, background: hexA("#C0573F", 0.07), border: `1px solid ${hexA("#C0573F", 0.22)}`, borderRadius: 8, padding: "10px 14px" }}>
            <strong>These bookings were not auto-forgiven as free sessions.</strong> Each one was recorded as paid, failed, or unmatched in Calendly but has no corresponding Stripe charge. A failed or missing charge can look identical to a comped session if silently zeroed. Review each booking — mark the payment status manually or open the booking to reconcile.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 28 }}></th>
                <th style={thS}>Booked</th>
                <th style={thS}>Name</th>
                <th style={thS}>Session</th>
                <th style={{ ...thS, textAlign: "right" }}>Expected</th>
                <th style={thS}>Booking status</th>
              </tr>
            </thead>
            <tbody>
              {exceptionCharges.map(row => {
                const open = !!expandedCharges[row.id];
                return (
                  <Fragment key={row.id}>
                    <tr onClick={() => toggleCharge(row.id)} style={{ cursor: "pointer", background: open ? hexA("#C0573F", 0.06) : hexA("#C0573F", 0.02) }}>
                      <td style={{ ...tdS, textAlign: "center", color: C.ink3 }}>
                        <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                      </td>
                      <td style={tdS}>{row.bookedDisplay}</td>
                      <td style={tdS}>
                        <strong>{row.name}</strong>
                        {row.email && <div style={{ fontSize: 11, color: C.ink3 }}>{row.email}</div>}
                      </td>
                      <td style={tdS}>{row.sessionName}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: "#C0573F" }}>
                        {row.expected != null && Number(row.expected) > 0 ? money(row.expected) : "—"}
                      </td>
                      <td style={tdS}>
                        <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: hexA("#C0573F", 0.12), color: "#8B3A2F", textTransform: "uppercase", letterSpacing: ".04em" }}>
                          {row.paymentStatus || "unknown"}
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td></td>
                        <td colSpan={5} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: hexA("#C0573F", 0.04) }}>
                          <ChargeDetails row={row} />
                          {row.bookingId && onOpen && (
                            <button type="button" onClick={() => { const r = registrations.find(x => x.id === row.bookingId); if (r) onOpen({ db: "registrations", record: r }); }}
                              style={{ marginTop: 10, padding: "5px 12px", fontSize: 12, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, cursor: "pointer" }}>
                              Open booking
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {unmatchedCharges.length > 0 && (
        <Panel title={`Unmatched Stripe transactions (${unmatchedCharges.length})`}>
          <div style={{ fontSize: 12, color: C.ink3, marginBottom: 12, lineHeight: 1.5 }}>
            Stripe shows these charges but no Calendly booking matched them (no booking within 2 days of the charge for that participant). Common causes: test charges, duplicate payments, or a different email between Stripe and Calendly.
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thS, width: 28 }}></th>
                <th style={thS}>Name</th>
                <th style={thS}>Paid</th>
                <th style={thS}>Description</th>
                <th style={{ ...thS, textAlign: "right" }}>Stripe amount</th>
              </tr>
            </thead>
            <tbody>
              {unmatchedCharges.map(row => {
                const open = !!expandedCharges[row.id];
                return (
                  <Fragment key={row.id}>
                    <tr onClick={() => toggleCharge(row.id)} style={{ cursor: "pointer", background: open ? C.surfaceAlt : "transparent" }}>
                      <td style={{ ...tdS, textAlign: "center", color: C.ink3 }}>
                        <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                      </td>
                      <td style={tdS}>
                        <strong>{row.name}</strong>
                        {row.email && <div style={{ fontSize: 11, color: C.ink3 }}>{row.email}</div>}
                      </td>
                      <td style={tdS}>{row.paidDisplay}</td>
                      <td style={{ ...tdS, color: C.ink2 }}>{row.description || "—"}</td>
                      <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: "#C0573F" }}>{money(row.stripeAmount)}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td></td>
                        <td colSpan={4} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: C.surfaceAlt }}>
                          <ChargeDetails row={row} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      <Panel title={`Stripe charges (${matchedCharges.length})`}>
        {stripeStatus?.at && (
          <div style={{ fontSize: 11.5, color: C.ink3, marginBottom: 10, lineHeight: 1.45 }}>
            Updated {stripeStatus.at}
            {stripeStatus.synced > 0 ? ` · ${stripeStatus.synced} new Stripe event${stripeStatus.synced !== 1 ? "s" : ""} processed` : " · up to date"}
          </div>
        )}
        {!matchedCharges.length ? (
          <Empty pad>No matched Stripe charges yet — click Sync Stripe now to pull them from Stripe.</Empty>
        ) : (
          <div style={{ maxHeight: "calc(100vh - 260px)", overflowY: "auto", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...thS, width: 28, position: "sticky", top: 0, background: C.surface, zIndex: 1 }}></th>
                  <th style={{ ...thS, position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>Booked</th>
                  <th style={{ ...thS, position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>Name</th>
                  <th style={{ ...thS, position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>Session</th>
                  <th style={{ ...thS, textAlign: "right", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>Expected</th>
                  <th style={{ ...thS, textAlign: "right", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>Stripe</th>
                  <th style={{ ...thS, textAlign: "right", position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>Session amount</th>
                </tr>
              </thead>
              <tbody>
                {matchedCharges.map(row => {
                  const open = !!expandedCharges[row.id];
                  return (
                    <Fragment key={row.id}>
                      <tr onClick={() => toggleCharge(row.id)} style={{ cursor: "pointer", background: open ? C.surfaceAlt : "transparent" }}>
                        <td style={{ ...tdS, textAlign: "center", color: C.ink3 }}>
                          <ChevronRight size={14} style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                        </td>
                        <td style={tdS}>{row.bookedDisplay}</td>
                        <td style={tdS}>
                          <strong>{row.name}</strong>
                          {row.email && <div style={{ fontSize: 11, color: C.ink3 }}>{row.email}</div>}
                        </td>
                        <td style={tdS}>
                          {row.sessionName}
                          {row.free && (
                            <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20, background: hexA(C.gold, 0.15), color: C.gold, textTransform: "uppercase", letterSpacing: ".04em" }}>Free</span>
                          )}
                        </td>
                        <td style={{ ...tdS, textAlign: "right", color: C.ink3 }}>{row.expected != null ? money(row.expected) : "—"}</td>
                        <td style={{ ...tdS, textAlign: "right", fontWeight: 600, color: row.free ? C.ink3 : "#2D6A50" }}>{money(row.stripeAmount)}</td>
                        <td style={{ ...tdS, textAlign: "right", fontWeight: 700 }}>{money(row.sessionAmount)}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td></td>
                          <td colSpan={6} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: C.surfaceAlt }}>
                            <ChargeDetails row={row} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pendingBookingsShown.length > 0 && (
        <Panel title={`Bookings awaiting a Stripe charge (${pendingBookingsShown.length})`}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thS}>Client</th>
                <th style={thS}>Session</th>
                <th style={{ ...thS, textAlign: "right" }}>Expected</th>
                <th style={thS}>Booked</th>
                <th style={thS}></th>
              </tr>
            </thead>
            <tbody>
              {sortRegistrationsByCreatedAt(pendingBookingsShown).map(r => {
                const client = clients.find(c => c.id === r.clientId);
                return (
                  <tr key={r.id}>
                    <td style={tdS}><strong>{cleanName(client?.name || "—")}</strong><div style={{ fontSize: 11, color: C.ink3 }}>{client?.email}</div></td>
                    <td style={tdS}>{cleanName(r.eventName || "—")}</td>
                    <td style={{ ...tdS, textAlign: "right" }}>{formatRegistrationAmount(r) || money(r.paymentAmount)}</td>
                    <td style={tdS}>{registrationBookedDisplay(r)}</td>
                    <td style={tdS}>
                      <button type="button" onClick={() => onOpen({ db: "registrations", record: r })} style={{ padding: "4px 10px", fontSize: 11, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, cursor: "pointer" }}>Open</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}

      {refundedPayments.length > 0 && (
        <Panel title={`Refunded payments (${refundedPayments.length})`}>
          {refundedPayments.map(p => (
            <div key={p.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 }}>
              {p.customerEmail || "—"} · {money(readAmt(p, "amountGross"))} · refunded {money(readAmt(p, "amountRefunded"))}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
