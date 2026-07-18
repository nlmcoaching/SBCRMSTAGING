import { useState, useMemo } from "react";
import { Upload } from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Bar, Line, Legend } from "recharts";
import { C, FONT, hexA } from "../../lib/theme.js";
import { addMonthsISO, fmtDate, money, sameMonth, norm, cleanName, clientShort } from "../../lib/format.js";
import { SOURCE_COLOR, OFFER_STATUS, OFFER_STATUS_COLOR, OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, REV_CHANNEL_COLOR } from "../../lib/constants.js";
import { _c, calcNet, buildRevenueViewRows, applyStudioSessionSplit, isAutoExpenseRecord, AUTO_SPLIT_EXP_ID_PREFIX, issueStripeRefund } from "../../lib/revenue/index.js";
import { patchRegistration } from "../../lib/domainActions.js";
import { sum } from "../../lib/aggregate.js";
import {
  REFUND_POLICY_HOURS,
  formatRegistrationDateTime,
  sortRegistrationsBySessionTime,
  refundEligibility,
} from "../../lib/refundPolicy.js";
import { Stat, Panel, Tag, DateChip, Empty } from "../../components/primitives.jsx";
import { TableView, RecordTableView } from "../../components/tables.jsx";

export function RevenueThisMonthView({ data, today, query, onOpen, canEdit }) {
  const monthStr = String(today || new Date().toISOString().slice(0, 10)).slice(0, 7); // "YYYY-MM"
  const prevMonthStr = addMonthsISO(monthStr, -1);
  const monthLabel = new Date(monthStr + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const inMonth = (dateStr, m) => String(dateStr || "").startsWith(m);

  const allRev = data.revenue || [];
  // Refunds are negative revenue rows — exclude legacy auto cancellation expenses from P&L.
  const allExp = (data.expenses || []).filter(e =>
    !(e.category === "Refunds & Cancellations" && (e.auto || String(e.id || "").startsWith("cxlexp_"))),
  );
  const revThis = allRev.filter(r => inMonth(r.bookedAt || r.date, monthStr));
  const expThis = allExp.filter(e => inMonth(e.date, monthStr));
  const revPrev = allRev.filter(r => inMonth(r.bookedAt || r.date, prevMonthStr));
  const expPrev = allExp.filter(e => inMonth(e.date, prevMonthStr));

  // Accumulate in integer cents then divide once — prevents 0.1 + 0.2 ≠ 0.3 drift.
  // Refunds are negative gross rows on the revenue ledger (not a parallel expense).
  const sumPositiveGross = (rs) => rs.reduce((s, r) => {
    const g = Number(r.gross) || 0;
    return s + (g > 0 ? _c(g) : 0);
  }, 0) / 100;
  const sumAmount  = (es) => es.reduce((s, e) => s + _c(e.amount),  0) / 100;
  const sumRefundAbs = (rs) => rs.reduce((s, r) => {
    const g = Number(r.gross) || 0;
    return s + (r.isRefund || g < 0 ? _c(Math.abs(g)) : _c(r.refunds));
  }, 0) / 100;

  const figures = (rs, es) => {
    const gross    = sumPositiveGross(rs);
    const refunds  = sumRefundAbs(rs);
    const expenses = sumAmount(es);
    const net      = (_c(gross) - _c(refunds) - _c(expenses)) / 100;
    return { gross, refunds, expenses, net, pct: gross > 0 ? Math.round((net / gross) * 100) : 0 };
  };
  const curr = figures(revThis, expThis);
  const prev = figures(revPrev, expPrev);

  const pctChange = (c, p) => (p > 0 ? Math.round(((c - p) / p) * 100) : null);

  // For expenses an increase is unfavourable, so its delta colours are inverted.
  const cards = [
    { label: "Gross Revenue", value: curr.gross, prevVal: prev.gross, accent: C.brand,
      sub: `${revThis.length} revenue record${revThis.length !== 1 ? "s" : ""} · Stripe amounts` },
    { label: "Expenses", value: curr.expenses, prevVal: prev.expenses, accent: "#C0573F", invert: true,
      sub: `${expThis.length} expense record${expThis.length !== 1 ? "s" : ""}${curr.refunds ? ` · ${money(curr.refunds)} refunds (revenue)` : ""}` },
    { label: "Net Revenue", value: curr.net, prevVal: prev.net, accent: "#2D6A50",
      sub: `${curr.pct}% margin (gross − refunds − expenses)` },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
        {cards.map(({ label, value, prevVal, accent, sub, invert }) => {
          const change = pctChange(value, prevVal);
          const favourable = change === null ? null : (invert ? change <= 0 : change >= 0);
          return (
            <div key={label} style={{
              background: C.surface, borderRadius: 14, border: `1px solid ${C.line}`,
              padding: "16px 18px", borderTop: `3px solid ${accent}`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, marginBottom: 8 }}>{label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: value < 0 ? "#DC2626" : accent }}>{money(value)}</span>
                {change !== null && (
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: favourable ? "#16A34A" : "#DC2626" }}>
                    {change >= 0 ? "▲" : "▼"}{Math.abs(change)}% vs last month
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: C.ink3 }}>{sub}</div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, margin: "4px 2px 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>
        Revenue records — {monthLabel}
      </div>
      <RecordTableView records={revThis} columns={revenueTableCols()} section="revenue"
        query={query} ctx={{ data, today }} onOpen={onOpen} canEdit={canEdit} />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, margin: "20px 2px 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>
        Expenses — {monthLabel}
      </div>
      <RecordTableView records={expThis} columns={expenseTableCols()} section="expenses"
        query={query} ctx={{ data, today }} onOpen={onOpen} canEdit={canEdit} />
    </div>
  );
}

export function RefundsView({ data, setData, canEdit, setConfirm, onOpen, refundToken }) {
  const [busyId, setBusyId] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const clientsById = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
  const sessionsById = Object.fromEntries((data.sessions || []).map(s => [s.id, s]));
  const regClientName = (r) => clientsById[r.clientId] ? cleanName(clientsById[r.clientId].name) : "—";
  const regSessionName = (r) => cleanName(sessionsById[r.sessionId]?.name || r.eventName || "—");

  const canceled = sortRegistrationsBySessionTime(
    (data.registrations || []).filter(r => r.status === "canceled"), data,
  ).map(r => ({ ...r, _elig: refundEligibility(r, data) }));
  const dueRows = canceled.filter(r => r._elig.eligible)
    .sort((a, b) => new Date(b.canceledAt || 0) - new Date(a.canceledAt || 0));
  // "Already refunded" rows live in Refund history below — don't repeat them here.
  const ineligibleRows = canceled.filter(r => !r._elig.eligible && r._elig.reason !== "Already refunded")
    .sort((a, b) => new Date(b.canceledAt || 0) - new Date(a.canceledAt || 0));

  const history = [...(data.revenue || [])]
    .filter(r => r.isRefund && r.stripeRefundId)
    .sort((a, b) => String(b.refundedAt || b.bookedAt || b.date || "").localeCompare(String(a.refundedAt || a.bookedAt || a.date || "")));

  const startRefund = (reg) => {
    const who = clientsById[reg.clientId] ? cleanName(clientsById[reg.clientId].name) : (reg.eventName || "this client");
    setConfirm({
      message: `Refund ${money(reg._elig.amount)} to ${who} via Stripe? The full charge is refunded and this cannot be undone.`,
      okLabel: "Issue refund", danger: true,
      onOk: async () => {
        setBusyId(reg.id);
        setErrMsg("");
        try {
          await issueStripeRefund(reg, setData, refundToken);
        } catch (err) {
          setErrMsg(err.message || "Refund failed");
        }
        setBusyId("");
      },
    });
  };

  const openReg = (r) => {
    const { _elig, ...record } = r;
    onOpen({ db: "registrations", record });
  };

  const baseCols = [
    col("client", "Client", (r) => <strong style={{ color: C.ink }}>{regClientName(r)}</strong>),
    col("session", "Session", (r) => regSessionName(r)),
    col("scheduledAt", "Session time", (r) => formatRegistrationDateTime(r.scheduledAt)),
    col("canceledAt", "Canceled on", (r) => formatRegistrationDateTime(r.canceledAt)),
    col("cancelerType", "Canceled by", (r) => r.cancelerType
      ? <Tag color={String(r.cancelerType).toLowerCase() === "host" ? "#5B6ECC" : "#D9892B"} soft>{String(r.cancelerType).replace(/_/g, " ")}</Tag>
      : <span style={{ color: C.ink3 }}>unknown</span>),
    col("paidAmount", "Paid", (r) => money(Number(r.paidAmount) || 0), { align: "right" }),
  ];
  const dueCols = [
    ...baseCols,
    col("policy", "Policy check", (r) => (
      <div>
        <div style={{ fontSize: 12.5 }}>{r._elig.reason}</div>
        {r._elig.flag && <div style={{ fontSize: 11.5, color: "#B45309", marginTop: 2 }}>⚠ {r._elig.flag}</div>}
      </div>
    )),
    col("action", "", (r) => canEdit ? (
      <button
        disabled={busyId === r.id}
        onClick={(e) => { e.stopPropagation(); startRefund(r); }}
        style={{ background: busyId === r.id ? C.ink3 : "#C0573F", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, padding: "7px 14px", cursor: busyId === r.id ? "default" : "pointer", whiteSpace: "nowrap" }}>
        {busyId === r.id ? "Refunding…" : `Refund ${money(r._elig.amount)}`}
      </button>
    ) : <span style={{ color: C.ink3, fontSize: 12 }}>View only</span>, { align: "right" }),
  ];
  const ineligibleCols = [
    ...baseCols,
    col("policy", "Why no refund", (r) => <span style={{ color: C.ink3, fontSize: 12.5 }}>{r._elig.reason}</span>),
  ];
  const historyCols = [
    col("date", "Date", (r) => r.refundedAt ? formatRegistrationDateTime(r.refundedAt) : fmtDate(r.date), { sortVal: (r) => r.refundedAt || r.date || "" }),
    col("client", "Client", (r) => <strong style={{ color: C.ink }}>{r.client || "—"}</strong>),
    col("name", "Description", (r) => r.name || r.notes || "—"),
    col("amount", "Refunded", (r) => <strong style={{ color: "#C0573F" }}>{money(Math.abs(Number(r.gross) || 0))}</strong>, { align: "right", sum: "gross" }),
    col("stripeRefundId", "Stripe refund ID", (r) => <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5 }}>{r.stripeRefundId}</span>),
  ];

  const heading = (text) => (
    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink2, margin: "20px 2px 8px", textTransform: "uppercase", letterSpacing: ".05em" }}>{text}</div>
  );

  const dl  = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, marginBottom: 2 };
  const dv  = { fontSize: 13, color: C.ink, wordBreak: "break-word" };
  const mono = { ...dv, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5 };
  const field = (l, v, style) => v != null && v !== "" && v !== false ? (
    <div key={l}><div style={dl}>{l}</div><div style={style || dv}>{v}</div></div>
  ) : null;
  const gridWrap = (children, actions) => (
    <div style={{ padding: "10px 4px 6px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "12px 24px" }}>
        {children}
      </div>
      {actions && <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.lineSoft}`, display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );

  const waiveRefund = (r) => {
    const who = clientsById[r.clientId] ? cleanName(clientsById[r.clientId].name) : (r.eventName || "this client");
    setConfirm({
      message: `Override and waive the refund for ${who}? No money will be sent to Stripe. This can be undone by opening the booking record.`,
      okLabel: "Waive refund",
      onOk: () => {
        setData(prev => patchRegistration(prev, r.id, reg => ({
          ...reg,
          refundWaived: true,
          refundWaivedAt: new Date().toISOString(),
        })));
      },
    });
  };

  const expandDue = (r) => {
    const client = clientsById[r.clientId];
    const session = sessionsById[r.sessionId];
    return gridWrap(
      <>
        {field("Email", client?.email)}
        {field("Phone", client?.phone)}
        {field("Session", session ? cleanName(session.name) : (r.eventName || null))}
        {field("Session date/time", formatRegistrationDateTime(r.scheduledAt))}
        {field("Cancel reason", r.cancelReason || null)}
        {field("Payment status", r.paymentStatus)}
        {field("Stripe payment intent", r.stripePaymentIntentId, mono)}
        {field("Stripe charge ID", r.stripeChargeId, mono)}
        {r._elig.flag && field("Review note", <span style={{ color: "#B45309" }}>⚠ {r._elig.flag}</span>)}
      </>,
      <>
        {canEdit && (
          <button
            disabled={busyId === r.id}
            onClick={(e) => { e.stopPropagation(); startRefund(r); }}
            style={{ background: busyId === r.id ? C.ink3 : "#C0573F", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, padding: "7px 14px", cursor: busyId === r.id ? "default" : "pointer" }}>
            {busyId === r.id ? "Refunding…" : `Refund ${money(r._elig.amount)}`}
          </button>
        )}
        {canEdit && (
          <button onClick={(e) => { e.stopPropagation(); waiveRefund(r); }}
            style={{ background: "none", border: `1px solid #D9892B`, borderRadius: 8, fontWeight: 500, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", color: "#9A5A10" }}>
            Don't refund (waive)
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); openReg(r); }}
          style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, fontWeight: 500, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", color: C.ink2 }}>
          Open full record
        </button>
      </>
    );
  };

  const expandHistory = (row) => {
    const reg = (data.registrations || []).find(r =>
      r.id === row.registrationId || (row.stripeRefundId && r.stripeRefundId === row.stripeRefundId),
    );
    const client = reg ? clientsById[reg.clientId] : null;
    const session = reg ? sessionsById[reg.sessionId] : null;
    return gridWrap(
      <>
        {field("Refunded at", row.refundedAt ? formatRegistrationDateTime(row.refundedAt) : (row.date ? fmtDate(row.date) : null))}
        {field("Stripe refund ID", row.stripeRefundId, mono)}
        {field("Description", row.name || row.notes || null)}
        {field("Refunded amount", money(Math.abs(Number(row.gross) || 0)))}
        {client && field("Client email", client.email)}
        {client && field("Client phone", client.phone)}
        {session && field("Session", cleanName(session.name))}
        {reg && field("Session date/time", formatRegistrationDateTime(reg.scheduledAt))}
        {reg && field("Canceled by", reg.cancelerType ? reg.cancelerType.replace(/_/g, " ") : null)}
        {reg && field("Cancel reason", reg.cancelReason || null)}
        {reg && field("Original paid", reg.paidAmount != null ? money(reg.paidAmount) : null)}
      </>,
      <>
        <button onClick={(ev) => { ev.stopPropagation(); onOpen({ db: "revenue", record: row }); }}
          style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, fontWeight: 500, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", color: C.ink2 }}>
          Open revenue record
        </button>
        {reg && (
          <button onClick={(ev) => { ev.stopPropagation(); openReg(reg); }}
            style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, fontWeight: 500, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", color: C.ink2 }}>
            Open booking record
          </button>
        )}
      </>
    );
  };

  const expandIneligible = (r) => {
    const client = clientsById[r.clientId];
    const session = sessionsById[r.sessionId];
    return gridWrap(
      <>
        {field("Email", client?.email)}
        {field("Phone", client?.phone)}
        {field("Session", session ? cleanName(session.name) : (r.eventName || null))}
        {field("Session date/time", formatRegistrationDateTime(r.scheduledAt))}
        {field("Cancel reason", r.cancelReason || null)}
        {field("Payment status", r.paymentStatus)}
        {field("Paid amount", r.paidAmount != null ? money(r.paidAmount) : null)}
        {r.stripeRefundId && field("Stripe refund ID", r.stripeRefundId, mono)}
        {(Number(r.amountRefunded) || 0) > 0 && field("Amount refunded", money(r.amountRefunded))}
        {field("Why no refund", r._elig.reason)}
      </>,
      <>
        <button onClick={(e) => { e.stopPropagation(); openReg(r); }}
          style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, fontWeight: 500, fontSize: 12.5, padding: "7px 14px", cursor: "pointer", color: C.ink2 }}>
          Open full record
        </button>
      </>
    );
  };

  return (
    <div>
      {dueRows.length > 0 && (
        <div style={{ background: "#FEF3EC", border: "1px solid #F5D3BC", borderRadius: 12, padding: "14px 18px", marginBottom: 16, fontSize: 13, color: "#9A4B2E" }}>
          <strong>{dueRows.length} refund{dueRows.length !== 1 ? "s" : ""} due.</strong>{" "}
          These canceled bookings qualify for a full refund under the cancellation policy (host cancels any time; client cancels more than {REFUND_POLICY_HOURS} hours before the session). Review each one and click Refund to issue it through Stripe.
        </div>
      )}
      {errMsg && (
        <div style={{ background: "#FDECEC", border: "1px solid #F2C2C2", borderRadius: 12, padding: "12px 18px", marginBottom: 16, fontSize: 13, color: "#B03030" }}>
          Refund failed: {errMsg}
        </div>
      )}

      {heading(`Refunds due (${dueRows.length})`)}
      {dueRows.length
        ? <TableView columns={dueCols} rows={dueRows} expandRow={expandDue} ctx={{ data }} />
        : <Empty>No refunds due. Canceled bookings that qualify for a refund will appear here.</Empty>}

      {heading(`Refund history (${history.length})`)}
      {history.length
        ? <TableView columns={historyCols} rows={history} expandRow={expandHistory} ctx={{ data }}
            footer={{ label: "Total refunded", amount: money(sum(history, "amount")) }} />
        : <Empty>No Stripe refunds issued yet. Refunds appear here with their Stripe refund ID once processed.</Empty>}

      {heading(`No refund due (${ineligibleRows.length})`)}
      {ineligibleRows.length
        ? <TableView columns={ineligibleCols} rows={ineligibleRows} expandRow={expandIneligible} ctx={{ data }} />
        : <Empty>No canceled bookings outside the refund policy.</Empty>}
    </div>
  );
}

const col = (key, label, render, opts = {}) => ({ key, label, render, ...opts });

function revenueTableCols() {
  return [
    col("date", "Date", (r) => {
      const v = r.bookedAt || r.date || "";
      // Full ISO timestamps (with a time component) → date + time; bare YYYY-MM-DD → date only.
      return v.includes("T") ? formatRegistrationDateTime(v) : fmtDate(v, true);
    }, { sortVal: (r) => (r.bookedAt || r.date || "") }),
    col("name", "Description", (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{cleanName(r.name) || "—"}</span>
        {r.isFree && <span style={{ fontSize: 10.5, fontWeight: 700, background: "#F0F4FF", color: "#5B6ECC", border: "1px solid #C7D0F5", borderRadius: 5, padding: "1px 6px", letterSpacing: ".04em" }}>FREE</span>}
      </span>
    ), { sortVal: (r) => norm(r.name) }),
    col("channel", "Channel", (r) => r.channel ? <Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag> : "—", { sortVal: (r) => r.channel || "" }),
    col("source", "Source", (r) => r.source || "—", { sortVal: (r) => r.source || "" }),
    col("gross", "Gross", (r) => <span style={{ color: r.isFree ? C.ink3 : "inherit" }}>{money(r.gross)}</span>, { align: "right", sum: "gross", sortVal: (r) => Number(r.gross) || 0 }),
    col("refunds", "Refunds", (r) => r.refunds ? <span style={{ color: "#C0573F" }}>-{money(r.refunds)}</span> : "—", { align: "right", sortVal: (r) => Number(r.refunds) || 0 }),
    col("net", "Net", (r) => {
      const n = calcNet(r);
      return <strong style={{ color: n > 0 ? "#4A8C6F" : n < 0 ? "#C0573F" : C.ink3 }}>{money(n)}</strong>;
    }, { align: "right", sum: "net", sortVal: (r) => calcNet(r) }),
    col("auto", "Type", (r) => r.auto ? <Tag soft>Auto</Tag> : <Tag color={C.brand} soft>Manual</Tag>, { align: "center", sortVal: (r) => (r.auto ? 1 : 0) }),
  ];
}

function expenseTableCols() {
  return [
    col("date", "Date", (r) => fmtDate(r.date), { sortVal: (r) => r.date || "" }),
    col("vendor", "Vendor", (r) => <strong style={{ color: C.ink }}>{r.vendor || "—"}</strong>, { sortVal: (r) => norm(r.vendor) }),
    col("description", "Description", (r) => r.description || "—", { sortVal: (r) => norm(r.description) }),
    col("category", "Category", (r) => r.category ? <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 8, background: hexA(EXPENSE_CATEGORY_COLOR[r.category] || C.ink3, 0.12), color: EXPENSE_CATEGORY_COLOR[r.category] || C.ink3, fontWeight: 600 }}>{r.category}</span> : "—", { sortVal: (r) => r.category || "" }),
    col("amount", "Amount", (r) => <strong style={{ color: C.ink }}>{money(r.amount)}</strong>, { align: "right", sum: "amount", sortVal: (r) => Number(r.amount) || 0 }),
    col("paymentMethod", "Payment", (r) => r.paymentMethod || "—", { sortVal: (r) => r.paymentMethod || "" }),
    col("taxDeductible", "Tax Ded.", (r) => r.taxDeductible ? <span style={{ color: "#16A34A", fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: C.ink3 }}>No</span>, { align: "center", sortVal: (r) => (r.taxDeductible ? 1 : 0) }),
    col("auto", "Type", (r) => r.auto ? <Tag soft>Auto</Tag> : <Tag color={C.brand} soft>Manual</Tag>, { align: "center", sortVal: (r) => (r.auto ? 1 : 0) }),
  ];
}

export function ExpenseSummaryView({ data, today, onOpen, onImportExpenses, canEdit = true }) {
  const expenses = data.expenses || [];
  const mo  = today.slice(0, 7);
  const yr  = today.slice(0, 4);

  const mtd  = expenses.filter(e => (e.date||"").startsWith(mo));
  const ytd  = expenses.filter(e => (e.date||"").startsWith(yr));
  const totMTD  = mtd.reduce((s,e) => s + (+e.amount||0), 0);
  const totYTD  = ytd.reduce((s,e) => s + (+e.amount||0), 0);
  const taxDed  = ytd.filter(e => e.taxDeductible).reduce((s,e) => s + (+e.amount||0), 0);
  const recurring = expenses.filter(e => e.recurring).reduce((s,e) => s + (+e.amount||0), 0);

  // By category
  const byCat = EXPENSE_CATEGORY.map(cat => {
    const rows = ytd.filter(e => e.category === cat);
    return { cat, total: rows.reduce((s,e) => s + (+e.amount||0), 0), count: rows.length };
  }).filter(c => c.total > 0).sort((a,b) => b.total - a.total);

  const maxCat = byCat[0]?.total || 1;

  // Vendor breakdown (top 8)
  const byVendor = Object.entries(
    ytd.reduce((acc, e) => { acc[e.vendor] = (acc[e.vendor]||0) + (+e.amount||0); return acc; }, {})
  ).map(([vendor, total]) => ({ vendor, total })).sort((a,b) => b.total - a.total).slice(0,8);

  // Monthly trend (last 6 months) — use addMonthsISO to avoid setMonth/toISOString UTC mismatch.
  const months = Array.from({length:6}, (_,i) => addMonthsISO(today.slice(0,7), i - 5));
  const monthlyData = months.map(m => ({
    label: new Date(m+"-01").toLocaleDateString("en-US",{month:"short"}),
    total: expenses.filter(e=>(e.date||"").startsWith(m)).reduce((s,e)=>s+(+e.amount||0),0),
  }));
  const maxMonth = Math.max(...monthlyData.map(m=>m.total), 1);

  // Revenue context for margin — use same pipeline as Revenue Attribution so studio splits are deducted
  const revRowsMTD = useMemo(() =>
    buildRevenueViewRows(data)
      .filter(r => ((r.bookedAt || r.date) || "").startsWith(mo))
      .map(applyStudioSessionSplit(data)),
  [data, mo]);
  const grossRevMTD = sum(revRowsMTD, "gross");
  const studioSplitsMTD = sum(revRowsMTD, "studioSplit");
  const netRevMTD = revRowsMTD.reduce((s, r) => s + calcNet(r), 0);
  // totMTD includes auto Studio Split / legacy cancellation expenses; calcNet already reflects
  // refunds via negative revenue rows and studioSplit on charge rows — exclude those autos from Op Profit.
  const totMTDForOp = mtd.filter(e => !(isAutoExpenseRecord(e) && (
    String(e.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)
    || String(e.id || "").startsWith("cxlexp_")
    || e.category === "Refunds & Cancellations"
  )))
    .reduce((s, e) => s + (+e.amount || 0), 0);
  const opProfit = netRevMTD - totMTDForOp;
  const margin = grossRevMTD > 0 ? Math.round((opProfit / grossRevMTD) * 100) : null;

  // CSV import instructions
  const csvCols = "date,vendor,description,amount,category,paymentMethod,taxDeductible,recurring,recurringFreq,notes";

  return (
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:24}}>
        {[
          { label:"Expenses MTD",      value: money(totMTD),           sub: "this month", color: "#EF4444" },
          { label:"Expenses YTD",      value: money(totYTD),           sub: "this year",  color: C.ink2 },
          { label:"Tax Deductible YTD",value: money(taxDed),           sub: `${totYTD>0?Math.round(taxDed/totYTD*100):0}% of total`, color:"#16A34A" },
          { label:"Recurring / mo",    value: money(recurring),        sub: "committed monthly", color: "#8E44AD" },
          { label:"Operating Margin",  value: margin !== null ? margin+"%" : "—", sub: `Net: ${money(netRevMTD)} · Profit: ${money(opProfit)}`, color: opProfit >= 0 ? "#16A34A" : "#EF4444" },
        ].map(s => (
          <div key={s.label} style={{background:C.surface,borderRadius:14,padding:"16px 18px",border:`1px solid ${C.line}`}}>
            <div style={{fontSize:11,color:C.ink3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:700,color:s.color,margin:"6px 0 2px",fontFamily:FONT.display}}>{s.value}</div>
            <div style={{fontSize:11,color:C.ink3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        {/* Category breakdown */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Spend by Category — YTD</div>
          {byCat.length === 0 ? <div style={{color:C.ink3,fontSize:13}}>No data</div> : byCat.map(c => (
            <div key={c.cat} style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:C.ink,fontWeight:600}}>{c.cat} <span style={{color:C.ink3,fontWeight:400}}>({c.count})</span></span>
                <span style={{color:EXPENSE_CATEGORY_COLOR[c.cat]||C.ink3,fontWeight:700}}>{money(c.total)}</span>
              </div>
              <div style={{height:7,background:C.line,borderRadius:4}}>
                <div style={{height:"100%",width:(c.total/maxCat*100)+"%",background:EXPENSE_CATEGORY_COLOR[c.cat]||C.brand,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly trend */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Monthly Trend</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:130}}>
            {monthlyData.map(m => (
              <div key={m.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:11,color:C.ink3,fontWeight:600}}>{m.total>0?money(m.total):""}</div>
                <div style={{width:"100%",background:C.brand,borderRadius:"4px 4px 0 0",height:Math.max(4,Math.round((m.total/maxMonth)*90))+"px"}}/>
                <div style={{fontSize:11,color:C.ink3}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        {/* Top vendors */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Top Vendors — YTD</div>
          {byVendor.map((v,i) => (
            <div key={v.vendor} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
              <span style={{fontSize:11,fontWeight:700,color:C.ink3,width:16,textAlign:"right"}}>{i+1}</span>
              <span style={{flex:1,fontSize:13,color:C.ink}}>{v.vendor}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{money(v.total)}</span>
            </div>
          ))}
        </div>

        {/* Margin summary */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Profitability — MTD</div>
          {[
            { label:"Gross Revenue MTD",    value: grossRevMTD,              positive:true },
            { label:"Studio Splits MTD",    value: -studioSplitsMTD,         positive:false },
            { label:"Net Revenue MTD",      value: netRevMTD,                positive:true, bold:true },
            { label:"Total Expenses MTD",   value: -totMTDForOp,             positive:false },
            { label:"Operating Profit MTD", value: opProfit,                 positive:opProfit>=0, bold:true, big:true },
          ].map(r => (
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.line}`,fontSize:r.big?15:13}}>
              <span style={{color:r.bold?C.ink:C.ink3,fontWeight:r.bold?700:400}}>{r.label}</span>
              <span style={{fontWeight:r.bold||r.big?700:600,color:r.value>=0?"#16A34A":"#EF4444"}}>{r.value>=0?money(r.value):"-"+money(Math.abs(r.value))}</span>
            </div>
          ))}
          {margin !== null && (
            <div style={{marginTop:10,textAlign:"center",fontSize:12,color:C.ink3}}>
              Operating margin: <strong style={{color:margin>=0?"#16A34A":"#EF4444"}}>{margin}%</strong>
            </div>
          )}
        </div>
      </div>

      {/* CSV import guide */}
      <div style={{background:C.surface,borderRadius:16,border:`2px solid ${C.brand}`,padding:"20px 22px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:10}}>
          <div style={{fontWeight:700,fontSize:15,color:C.ink,display:"flex",alignItems:"center",gap:8}}>
            <Upload size={17} color={C.brand} /> Bulk Import via CSV
          </div>
          {canEdit && (
          <label style={{
            display:"inline-flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,
            background:C.brand,color:"#fff",fontWeight:700,fontSize:13.5,cursor:"pointer",
            boxShadow:`0 2px 8px ${hexA(C.brand,0.35)}`,
          }}>
            <Upload size={15} /> Upload Expense CSV
            <input type="file" accept=".csv" style={{display:"none"}} onChange={(e) => {
              if (e.target.files[0] && onImportExpenses) onImportExpenses(e.target.files[0]);
            }} />
          </label>
          )}
        </div>
        <div style={{fontSize:13,color:C.ink3,marginBottom:12,lineHeight:1.7}}>
          Export your expenses from your bank, credit card statement, QuickBooks, Wave, or Xero as a CSV — then click <strong style={{color:C.ink}}>Upload Expense CSV</strong> above to import all rows at once.
        </div>
        <div style={{fontWeight:600,fontSize:12,color:C.ink2,marginBottom:6}}>Required CSV column headers (in any order):</div>
        <div style={{fontFamily:"monospace",fontSize:12,background:C.surfaceAlt,padding:"10px 14px",borderRadius:10,color:C.brand,wordBreak:"break-all",marginBottom:12}}>{csvCols}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:12,color:C.ink3}}>
          <div><strong style={{color:C.ink2}}>date</strong> — YYYY-MM-DD format (e.g. 2026-06-15)</div>
          <div><strong style={{color:C.ink2}}>amount</strong> — number only, no $ sign (e.g. 49.99)</div>
          <div><strong style={{color:C.ink2}}>category</strong> — must match an allowed category exactly</div>
          <div><strong style={{color:C.ink2}}>taxDeductible</strong> — true or false</div>
          <div><strong style={{color:C.ink2}}>recurring</strong> — true or false</div>
          <div><strong style={{color:C.ink2}}>recurringFreq</strong> — One-time, Monthly, Quarterly, or Annual</div>
        </div>
        <div style={{marginTop:12,fontSize:12,color:C.ink3,fontStyle:"italic"}}>
          Tip: Export directly from QuickBooks, Wave, or your bank statement. Rename the columns to match the headers above before importing.
        </div>
      </div>
    </div>
  );
}

export function RevenueAttributionView({ data, derived, today, onOpen, dateMode = "session" }) {
  // Read directly from the revenue and expense ledgers (auto-synced from bookings/payments).
  // This ensures gross amounts match Stripe, studio splits use the actual partner studioSharePct,
  // and cancellation expenses are included — rather than re-deriving from raw registrations.
  const rows = data.revenue || [];
  const allExpenses = data.expenses || [];
  const [highlight, setHighlight] = useState(null);
  const mo = today.slice(0, 7);
  const dateKey = (r) => dateMode === "booked" ? (r.bookedAt || r.date || "") : (r.date || r.bookedAt || "");
  const mtdRows     = rows.filter(r => sameMonth(dateKey(r), today));
  const mtdExpRows  = allExpenses.filter(e => sameMonth(e.date, today));
  const mtdSplitExp = mtdExpRows.filter(e => e.category === "Studio Split");

  // ── Core totals (MTD only) ───────────────────────────────────
  // Refunds are negative revenue rows — never also add auto "Refunds & Cancellations" expenses.
  const totalGross = mtdRows.reduce((a, r) => a + Math.max(0, Number(r.gross) || 0), 0);
  const totalFees  = sum(mtdRows, "stripeFee") + sum(mtdRows, "facilitatorCost");
  const totalSplit = mtdSplitExp.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const totalRef   = mtdRows.reduce((a, r) => {
    const g = Number(r.gross) || 0;
    if (r.isRefund || g < 0) return a + Math.abs(g);
    return a + (Number(r.refunds) || 0);
  }, 0);
  const totalNet   = totalGross - totalFees - totalSplit - totalRef;
  const margin     = totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 0;

  // ── By channel (MTD) ────────────────────────────────────────
  const byChannel = {};
  mtdRows.forEach(r => {
    const ch = r.channel || "Unknown";
    if (!byChannel[ch]) byChannel[ch] = { gross: 0, fees: 0, split: 0, refunds: 0, net: 0, count: 0 };
    const g = Number(r.gross || 0);
    if (r.isRefund || g < 0) {
      byChannel[ch].refunds += Math.abs(g);
    } else {
      byChannel[ch].gross   += g;
      byChannel[ch].fees    += Number(r.stripeFee || 0) + Number(r.facilitatorCost || 0);
      byChannel[ch].refunds += Number(r.refunds || 0);
      byChannel[ch].count++;
    }
  });
  // Studio splits come from the expense ledger — always attributed to the "Studio session" channel
  mtdSplitExp.forEach(e => {
    const ch = "Studio session";
    if (!byChannel[ch]) byChannel[ch] = { gross: 0, fees: 0, split: 0, refunds: 0, net: 0, count: 0 };
    byChannel[ch].split += Number(e.amount || 0);
  });
  const channelRows = Object.entries(byChannel)
    .map(([ch, d]) => {
      const net = (_c(d.gross) - _c(d.fees) - _c(d.split) - _c(d.refunds)) / 100;
      return {
        ch, ...d, net,
        margin: d.gross > 0 ? Math.round((net / d.gross) * 100) : 0,
      };
    })
    .sort((a, b) => b.net - a.net);

  // ── By source (MTD) ─────────────────────────────────────────
  const bySrc = {};
  mtdRows.forEach(r => {
    const s = r.source || "Unknown";
    if (!bySrc[s]) bySrc[s] = { gross: 0, net: 0, count: 0 };
    bySrc[s].gross += Number(r.gross || 0);
    bySrc[s].net   += calcNet(r);
    bySrc[s].count++;
  });
  const srcRows = Object.entries(bySrc)
    .map(([src, d]) => ({ src, ...d, margin: d.gross > 0 ? Math.round((d.net / d.gross) * 100) : 0 }))
    .sort((a, b) => b.net - a.net);

  // ── By client (all-time) ──────────────────────────────────────
  // Top clients by gross revenue — all-time so long-term value is visible
  const byClient = {};
  rows.filter(r => r.clientId).forEach(r => {
    if (!byClient[r.clientId]) byClient[r.clientId] = { gross: 0, net: 0, count: 0 };
    byClient[r.clientId].gross += Number(r.gross || 0);
    byClient[r.clientId].net   += calcNet(r);
    byClient[r.clientId].count++;
  });
  const clientRows = Object.entries(byClient)
    .map(([id, d]) => ({ id, name: cleanName(derived.clientName[id] || id), ...d }))
    .sort((a, b) => b.net - a.net);


  // ── Monthly Jan–Dec chart data (current year) ───────────────
  const year = today.slice(0, 4);
  const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlyNetData = MONTH_LABELS.map((label, i) => {
    const mm = String(i + 1).padStart(2, "0");
    const prefix = `${year}-${mm}`;
    const mRows = rows.filter(r => dateKey(r).startsWith(prefix));
    const mExp  = allExpenses.filter(e => (e.date || "").startsWith(prefix));
    const gross    = mRows.reduce((a, r) => a + Math.max(0, Number(r.gross) || 0), 0);
    const fees     = sum(mRows, "stripeFee") + sum(mRows, "facilitatorCost");
    const splits   = mExp.filter(e => e.category === "Studio Split").reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const refunds  = mRows.reduce((a, r) => {
      const g = Number(r.gross) || 0;
      if (r.isRefund || g < 0) return a + Math.abs(g);
      return a + (Number(r.refunds) || 0);
    }, 0);
    const expenses = fees + splits + refunds;
    const net      = gross - expenses;
    return { label, gross: Math.round(gross), expenses: Math.round(expenses), net: Math.round(net) };
  });

  const marginColor = (m) => m >= 70 ? "#4A8C6F" : m >= 45 ? C.gold : "#C0573F";
  const thS = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdS = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };
  const tdR = { ...tdS, textAlign: "right" };

  const marginBar = (m, maxM) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: C.line, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: Math.max(0, m) + "%", background: marginColor(m), borderRadius: 6, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: marginColor(m), width: 36, textAlign: "right" }}>{m}%</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Key metrics */}
      <div className="sb-stats">
        <Stat label="Gross revenue MTD" value={money(sum(mtdRows, "gross"))} accent={C.brand} hint="gross session booking revenue this month" />
        <Stat label="Net revenue MTD" value={money(totalNet)} accent="#2F6FD0" hint="after studio splits, fees & refunds" />
        <Stat label="YTD Revenue" value={money(sum(rows.filter(r => dateKey(r).startsWith(today.slice(0,4))), "gross"))} accent="#4A8C6F" hint="gross session booking revenue this year" />
        <Stat label="YTD Net Revenue" value={money(rows.filter(r => dateKey(r).startsWith(today.slice(0,4))).reduce((a, r) => a + calcNet(r), 0))} accent={C.gold} hint="net session revenue this year after splits, fees & refunds" />
      </div>

      {/* Net revenue chart Jan–Dec */}
      <Panel title={`Net revenue ${year} — gross, expenses & net by month`}>
        <div style={{ padding: "8px 0 4px" }}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyNetData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.ink3 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} tick={{ fontSize: 11, fill: C.ink3 }} axisLine={false} tickLine={false} width={52} />
              <Tooltip
                formatter={(value, name) => [money(value), name === "gross" ? "Gross Revenue" : name === "expenses" ? "Expenses" : "Net Revenue"]}
                contentStyle={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13 }}
                labelStyle={{ fontWeight: 700, color: C.ink }}
              />
              <Legend formatter={name => name === "gross" ? "Gross Revenue" : name === "expenses" ? "Expenses" : "Net Revenue"} iconType="square" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="gross" fill="#2F6FD0" radius={[3,3,0,0]} maxBarSize={32} />
              <Bar dataKey="expenses" fill={C.gold} radius={[3,3,0,0]} maxBarSize={32} />
              <Line dataKey="net" type="monotone" stroke="#4A8C6F" strokeWidth={2.5} dot={{ r: 3, fill: "#4A8C6F" }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Channel P&L table */}
      <Panel title="P&L by channel — MTD">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thS}>Channel</th>
              <th style={{ ...thS, textAlign: "right" }}>Txns</th>
              <th style={{ ...thS, textAlign: "right" }}>Gross</th>
              <th style={{ ...thS, textAlign: "right" }}>Studio split</th>
              <th style={{ ...thS, textAlign: "right" }}>Fees</th>
              <th style={{ ...thS, textAlign: "right" }}>Net</th>
              <th style={{ ...thS, minWidth: 120 }}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {channelRows.map(r => (
              <tr key={r.ch}
                onMouseEnter={() => setHighlight(r.ch)} onMouseLeave={() => setHighlight(null)}
                style={{ background: highlight === r.ch ? C.surfaceAlt : "transparent", cursor: "default" }}>
                <td style={{ ...tdS }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: REV_CHANNEL_COLOR[r.ch] || C.ink3, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{r.ch}</span>
                  </div>
                </td>
                <td style={tdR}>{r.count}</td>
                <td style={tdR}>{money(r.gross)}</td>
                <td style={{ ...tdR, color: r.split > 0 ? C.gold : C.ink3 }}>{r.split > 0 ? money(r.split) : "—"}</td>
                <td style={{ ...tdR, color: C.ink2 }}>{r.fees > 0 ? money(r.fees) : "—"}</td>
                <td style={{ ...tdR, fontWeight: 700, color: marginColor(r.margin) }}>{money(r.net)}</td>
                <td style={{ ...tdS, minWidth: 130 }}>{marginBar(r.margin)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: C.surfaceAlt }}>
              <td style={{ ...tdS, fontWeight: 700 }}>Total</td>
              <td style={tdR}>{mtdRows.length}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{money(totalGross)}</td>
              <td style={{ ...tdR, color: C.gold, fontWeight: 600 }}>{money(totalSplit)}</td>
              <td style={{ ...tdR, color: C.ink2 }}>{money(totalFees)}</td>
              <td style={{ ...tdR, fontWeight: 700, color: marginColor(margin) }}>{money(totalNet)}</td>
              <td style={{ ...tdS }}>{marginBar(margin)}</td>
            </tr>
          </tfoot>
        </table>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        {/* By source */}
        <Panel title="Net revenue by source">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thS}>Source</th>
                <th style={{ ...thS, textAlign: "right" }}>Gross</th>
                <th style={{ ...thS, textAlign: "right" }}>Net</th>
                <th style={{ ...thS, minWidth: 90 }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {srcRows.map(r => (
                <tr key={r.src}>
                  <td style={tdS}><Tag color={SOURCE_COLOR[r.src] || C.ink3} soft>{r.src}</Tag></td>
                  <td style={tdR}>{money(r.gross)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: marginColor(r.margin) }}>{money(r.net)}</td>
                  <td style={{ ...tdS, minWidth: 100 }}>{marginBar(r.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* By client */}
        <Panel title="Top clients by net revenue">
          {!clientRows.length ? <Empty>No client-linked transactions yet</Empty> : (
            <div style={{ maxHeight: 230, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {clientRows.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? hexA(C.brand, 0.06) : "transparent" }}>
                  <span style={{ width: 20, fontSize: 12, fontWeight: 700, color: C.ink3, textAlign: "right" }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{(r.name || "—").trim()}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#4A8C6F", fontSize: 13 }}>{money(r.net)}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{r.count} txn{r.count !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>


    </div>
  );
}

export function OfferConversionView({ data, derived, today, onOpen }) {
  const offers = data.offers || [];

  // ── Core metrics ────────────────────────────────────────────
  const won    = offers.filter(o => WON_STATUSES.includes(o.status));
  const lost   = offers.filter(o => LOST_STATUSES.includes(o.status));
  const open   = offers.filter(o => OPEN_STATUSES.includes(o.status));
  const closed = won.length + lost.length;
  const convRate  = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const wonRev    = sum(won, "price");
  const pipeline  = sum(open, "price");
  const avgDeal   = won.length > 0 ? wonRev / won.length : 0;

  // ── Pipeline stage bar ──────────────────────────────────────
  const stageCount = {};
  OFFER_STATUS.forEach(s => { stageCount[s] = offers.filter(o => o.status === s).length; });
  const maxStage = Math.max(1, ...Object.values(stageCount));

  // ── By offer type ───────────────────────────────────────────
  const byType = {};
  offers.forEach(o => {
    const t = o.offerType || "Unknown";
    if (!byType[t]) byType[t] = { sent: 0, won: 0, lost: 0, rev: 0 };
    byType[t].sent++;
    if (WON_STATUSES.includes(o.status))  { byType[t].won++; byType[t].rev += Number(o.price) || 0; }
    if (LOST_STATUSES.includes(o.status)) byType[t].lost++;
  });
  const typeRows = Object.entries(byType)
    .map(([type, d]) => ({ type, ...d, rate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : null }))
    .sort((a, b) => b.rev - a.rev);

  // ── By source ───────────────────────────────────────────────
  const bySrc = {};
  offers.forEach(o => {
    const s = o.source || "Unknown";
    if (!bySrc[s]) bySrc[s] = { sent: 0, won: 0, lost: 0, rev: 0 };
    bySrc[s].sent++;
    if (WON_STATUSES.includes(o.status))  { bySrc[s].won++; bySrc[s].rev += Number(o.price) || 0; }
    if (LOST_STATUSES.includes(o.status)) bySrc[s].lost++;
  });
  const srcRows = Object.entries(bySrc)
    .map(([source, d]) => ({ source, ...d, rate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : null }))
    .sort((a, b) => b.rev - a.rev);

  // ── Recent wins & losses ─────────────────────────────────────
  const recentWon  = [...won].sort((a, b) => (b.dateOffered || "").localeCompare(a.dateOffered || "")).slice(0, 5);
  const recentLost = [...lost].sort((a, b) => (b.dateOffered || "").localeCompare(a.dateOffered || "")).slice(0, 5);

  const rateColor = (r) => r === null ? C.ink3 : r >= 60 ? "#4A8C6F" : r >= 35 ? C.gold : "#C0573F";

  const convBar = (won, total) => {
    const p = total > 0 ? Math.round((won / total) * 100) : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: p + "%", background: rateColor(p), borderRadius: 6 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: rateColor(p), width: 32 }}>{p}%</span>
      </div>
    );
  };

  const thStyle = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdStyle = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Key metrics */}
      <div className="sb-stats">
        <Stat label="Conversion rate" value={convRate + "%"} accent={rateColor(convRate)} hint={`${won.length} won of ${closed} closed`} />
        <Stat label="Won revenue"     value={money(wonRev)}  accent={C.brand} hint="accepted + paid" />
        <Stat label="Open pipeline"   value={money(pipeline)} hint={`${open.length} open offer${open.length !== 1 ? "s" : ""}`} />
        <Stat label="Avg deal size"   value={money(avgDeal)}  hint="per closed offer" />
      </div>

      {/* Pipeline stage breakdown */}
      <Panel title="Pipeline by status">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0" }}>
          {OFFER_STATUS.map(s => {
            const n = stageCount[s] || 0;
            if (!n) return null;
            return (
              <div key={s} style={{ flex: 1, minWidth: 90, background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${OFFER_STATUS_COLOR[s]}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: OFFER_STATUS_COLOR[s] }}>{n}</div>
                <div style={{ fontSize: 11, color: C.ink2, fontWeight: 600, marginTop: 3 }}>{s}</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                  {money(sum(offers.filter(o => o.status === s), "price"))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        {/* By offer type */}
        <Panel title="Conversion by offer type">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Won</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map(r => (
                <tr key={r.type}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.type}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: C.ink2 }}>{r.sent}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#4A8C6F", fontWeight: 600 }}>{r.won}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{money(r.rev)}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{convBar(r.won, r.won + r.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* By source */}
        <Panel title="Conversion by source">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Won</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {srcRows.map(r => (
                <tr key={r.source}>
                  <td style={{ ...tdStyle }}>
                    <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: C.ink2 }}>{r.sent}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#4A8C6F", fontWeight: 600 }}>{r.won}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{money(r.rev)}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{convBar(r.won, r.won + r.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Follow-up due warning */}
      {(() => {
        const fu = offers.filter(o => o.status === "Follow-up due" || (OPEN_STATUSES.includes(o.status) && o.followUpDate && o.followUpDate <= today));
        if (!fu.length) return null;
        return (
          <Panel title={`Follow-up needed · ${fu.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fu.slice(0, 8).map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: hexA("#D9892B", 0.07), borderRadius: 8, cursor: "pointer", borderLeft: `3px solid #D9892B` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</span>
                    <span style={{ fontSize: 12, color: C.ink2, marginLeft: 8 }}>{o.offerType} · {money(o.price)}</span>
                  </div>
                  <Tag color={OFFER_STATUS_COLOR[o.status]}>{o.status}</Tag>
                  {o.followUpDate && <DateChip iso={o.followUpDate} today={today} />}
                </div>
              ))}
            </div>
          </Panel>
        );
      })()}

      {/* Recent wins & losses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        <Panel title={`Recent wins · ${won.length}`}>
          {!recentWon.length ? <Empty>No closed offers yet</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentWon.map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hexA("#4A8C6F", 0.06), borderLeft: "3px solid #4A8C6F" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                    <div style={{ fontSize: 11, color: C.ink2 }}>{o.offerType} · {fmtDate(o.dateOffered)}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: "#4A8C6F", fontSize: 13 }}>{money(o.price)}</span>
                </div>
              ))}
            </div>
          }
        </Panel>
        <Panel title={`Recent losses · ${lost.length}`}>
          {!recentLost.length ? <Empty>No lost offers yet</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentLost.map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hexA("#C0573F", 0.05), borderLeft: "3px solid #C0573F" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                    <div style={{ fontSize: 11, color: C.ink2 }}>{o.offerType} · {fmtDate(o.dateOffered)}</div>
                  </div>
                  {o.reasonLost && <span style={{ fontSize: 11, color: "#C0573F", maxWidth: 120, textAlign: "right" }}>{o.reasonLost}</span>}
                </div>
              ))}
            </div>
          }
        </Panel>
      </div>
    </div>
  );
}
