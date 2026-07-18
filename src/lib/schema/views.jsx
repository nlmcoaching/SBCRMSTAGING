import React from "react";
import { AlertCircle } from "lucide-react";
import { C, hexA } from "../theme.js";
import { fmtDate, money, pct, norm, cleanName, clientShort, fmtStudioType, onOrBefore, sameMonth } from "../format.js";
import { addDays } from "../constants.js";
import * as constants from "../constants.js";
import {
  calcNet,
  calendlyBookingAmount,
  issueStripeRefund,
  sessionFinanceFor,
} from "../revenue/index.js";
import {
  formatRegistrationDateTime,
  sortRegistrationsBySessionTime,
} from "../refundPolicy.js";
import { registrationCreatedTimestamp } from "../stripeMatching.js";
import { cancelRegistration } from "../domainActions.js";
import { sum } from "../aggregate.js";
import { notify } from "../notify.js";
import { Tag, DateChip } from "../../components/primitives.jsx";
import { agreementExt, agreementRecordIsPdf } from "../agreements.js";

const {
  STATUS, STATUS_COLOR, CLIENT_TYPE_COLOR, TAG_COLOR, STAGE, STAGE_COLOR,
  CLOSE_PROB_COLOR, REF_STATUS_COLOR, OUTREACH_CLOSED_STATUSES, OUTREACH_NO_RESPONSE,
  TESTIMONIAL_STATUS_COLOR, TESTIMONIAL_ACTION_STATUSES, TESTIMONIAL_THEMES,
  TMPL_CATEGORY_COLOR, TMPL_CHANNEL_COLOR,
  EXPENSE_CATEGORY_COLOR, REV_CHANNEL_COLOR, CONTENT_STATUS_COLOR, CONTENT_CAT_COLOR,
  PLATFORM_COLOR, SESSION_STATUS_COLOR, OFFER_STATUS_COLOR, SOURCE_COLOR,
  OPEN_STATUSES, WON_STATUSES, REFERRAL_COLOR, FUTYPE, FUTYPE_COLOR,
} = constants;

/* ---------- View configs ---------- */
export const col = (key, label, render, opts = {}) => ({ key, label, render, ...opts });

export function TagList({ tags, max = 3 }) {
  if (!tags || !tags.length) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - max;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {shown.map(t => (
        <span key={t} style={{
          fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          background: hexA(TAG_COLOR[t] || C.ink3, 0.13),
          color: TAG_COLOR[t] || C.ink3, whiteSpace: "nowrap",
        }}>{t}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: C.ink3 }}>+{rest}</span>}
    </div>
  );
}

const clientCell = {
  name: (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>,
  status: (r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>,
  type: (r) => r.clientType ? <Tag color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3} soft>{r.clientType}</Tag> : null,
  tags: (r) => <TagList tags={r.tags} />,
};

export function registrationBookedDisplay(reg) {
  return formatRegistrationDateTime(reg.createdAt || reg.scheduledAt || reg.calendlyReceivedAt);
}

export function sortRegistrationsByCreatedAt(rows) {
  return [...rows].sort((a, b) => registrationCreatedTimestamp(b) - registrationCreatedTimestamp(a));
}

// Manually cancel a booking from the CRM. Side effects (studio recount, LTV, virtual
// session revenue) live in cancelRegistration — this wrapper only owns setData.
export function cancelRegistrationManually(setData, regId) {
  if (!setData) return;
  setData(prev => cancelRegistration(prev, regId));
}

// Shared expanded-row detail panel for registration tables (All Bookings + Cancellations).
export function registrationExpandRow(r, ctx) {
  const client = ctx.clientsById?.[r.clientId] || (ctx.data.clients||[]).find(x => x.id === r.clientId);
  const session = (ctx.data.sessions||[]).find(x => x.id === r.sessionId);
  // For a rescheduled booking, find the new booking it was rescheduled to.
  let rescheduledToAt = null;
  if (r.status === "rescheduled") {
    const regs = ctx.data.registrations || [];
    const target = (r.rescheduledToInviteeUri && regs.find(x => x.calendlyInviteeUri === r.rescheduledToInviteeUri))
      || (r.calendlyInviteeUri && regs.find(x => x.rescheduledFromInviteeUri === r.calendlyInviteeUri));
    rescheduledToAt = target?.scheduledAt || null;
  }
  const dl = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, marginBottom: 2 };
  const dv = { fontSize: 13, color: C.ink, wordBreak: "break-word" };
  const mono = { ...dv, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5 };
  const field = (l, v, style) => v ? (
    <div key={l}>
      <div style={dl}>{l}</div>
      <div style={style || dv}>{v}</div>
    </div>
  ) : null;
  return (
    <div style={{ padding: "10px 4px 6px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px 24px" }}>
        {field("Client", client ? cleanName(client.name) : null)}
        {field("Email", client?.email)}
        {field("Phone", client?.phone)}
        {field("Session", session ? cleanName(session.name) : (r.eventName || null))}
        {field("Session date/time", formatRegistrationDateTime(r.scheduledAt))}
        {field("Timezone", r.timezone)}
        {field("Location type", r.locationType)}
        {field("Location address", r.locationAddress)}
        {field("Join URL", r.locationJoinUrl && r.locationJoinUrl.startsWith("https://") ? <a href={r.locationJoinUrl} target="_blank" rel="noreferrer noopener" style={{ color: C.brand, wordBreak: "break-all", fontSize: 12 }}>{r.locationJoinUrl}</a> : (r.locationJoinUrl || null))}
        {field("Attendance type", r.attendanceType)}
        {field("Payment status", r.paymentStatus)}
        {field("Coupon code", r.couponCode || null)}
        {field("Calendly amount", calendlyBookingAmount(r) != null ? money(calendlyBookingAmount(r)) : null)}
        {field("Paid amount", r.paidAmount != null ? money(r.paidAmount) : null)}
        {field("Paid at", r.paidAt ? formatRegistrationDateTime(r.paidAt) : null)}
        {field("Stripe verified", r.stripeVerified ? "✓ Yes" : null)}
        {field("Stripe charge ID", r.stripeChargeId, mono)}
        {field("Stripe payment intent", r.stripePaymentIntentId, mono)}
        {field("Amount refunded", r.amountRefunded > 0 ? money(r.amountRefunded) : null)}
        {field("Stripe refund ID", r.stripeRefundId, mono)}
        {field("Refunded at", r.refundedAt ? formatRegistrationDateTime(r.refundedAt) : null)}
        {field("Waiver", r.waiverStatus)}
        {field("Checked in", r.checkedIn ? "✓ Yes" : null)}
        {field("Attended", r.attended ? "✓ Yes" : null)}
        {field("No-show", r.noShow ? "✓ Yes" : null)}
        {(r.status === "canceled" || r.status === "rescheduled") && field("Cancelled on", r.canceledAt ? new Date(r.canceledAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : null)}
        {(r.status === "canceled" || r.status === "rescheduled") && field("Cancelled by", r.cancelerType ? r.cancelerType.replace(/_/g, " ") : null)}
        {(r.status === "canceled" || r.status === "rescheduled") && field("Cancel reason", r.cancelReason || null)}
        {r.status === "rescheduled" && field("Original session time", formatRegistrationDateTime(r.scheduledAt))}
        {r.status === "rescheduled" && field("Rescheduled to", rescheduledToAt ? formatRegistrationDateTime(rescheduledToAt) : "Not synced yet")}
        {field("Done breathwork before", r.doneBreathworkBefore)}
        {field("How heard", r.howHeard)}
        {field("Referred by", r.referredBy)}
        {field("Concerns", r.concerns)}
        {field("Reviewed contraindications", r.reviewedContraindications)}
        {field("Notes", r.notes)}
      </div>
      {r.calendlyInviteeUri && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.ink3, wordBreak: "break-all" }}>
          <span style={dl}>Calendly invitee URI</span>
          <div>{r.calendlyInviteeUri}</div>
        </div>
      )}
      {ctx?.canEdit && ctx?.setData && r.status !== "canceled" && r.status !== "rescheduled" && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const who = client ? cleanName(client.name) : (r.eventName || "this booking");
              // Host cancels are always refund-eligible when Stripe money was collected —
              // offer the refund right after the cancel so it isn't forgotten.
              const refundable = (Number(r.paidAmount) || 0) > 0
                && (r.stripePaymentIntentId || r.stripeChargeId)
                && !r.stripeRefundId && r.paymentStatus !== "refunded"
                && !((Number(r.amountRefunded) || 0) > 0);
              const doCancel = () => {
                cancelRegistrationManually(ctx.setData, r.id);
                if (refundable && ctx.setConfirm) {
                  const canceledReg = { ...r, status: "canceled", cancelerType: "host" };
                  // Deferred so it opens after the cancel dialog closes (onOk → setConfirm(null)).
                  setTimeout(() => ctx.setConfirm({
                    message: `Refund ${money(Number(r.paidAmount) || 0)} to ${who} via Stripe? The full charge is refunded and this cannot be undone. (You can also do this later from Revenue → Refunds.)`,
                    okLabel: "Issue refund", danger: true,
                    // Return the Promise so ConfirmModal's busy guard covers the full fetch.
                    onOk: () => issueStripeRefund(canceledReg, ctx.setData, ctx.refundToken)
                      .catch(err => notify.error(`Refund failed: ${err.message || err}`)),
                  }), 0);
                }
              };
              if (ctx.setConfirm) {
                ctx.setConfirm({
                  message: `Cancel ${who}'s booking? It will move to Cancellations and Reschedules, free up the spot, and future Calendly syncs will not bring it back.`,
                  okLabel: "Cancel booking", danger: true, onOk: doCancel,
                });
              } else { doCancel(); }
            }}
            style={{ background: "#C0573F", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, padding: "8px 16px", cursor: "pointer" }}>
            Cancel booking
          </button>
        </div>
      )}
    </div>
  );
}

export const VIEWS = {
  workflows: {
    views: [{ name: "All workflows", layout: "workflows" }],
  },
  users: {
    views: [{ name: "Users & Permissions", layout: "user-management" }],
  },
  admin: {
    views: [
      { name: "Overview",        layout: "admin-overview" },
      { name: "Settings",        layout: "admin-settings" },
      { name: "Journey Descriptions", layout: "admin-journeys" },
      { name: "Schema Browser",  layout: "admin-schema" },
      { name: "Data Integrity",  layout: "admin-integrity" },
      { name: "Storage & Backup", layout: "admin-storage" },
      { name: "Email Logs", layout: "admin-email-logs" },
      { name: "Reset to Production", layout: "admin-reset" },
    ],
  },
  expenses: {
    views: [
      { name: "Summary",        layout: "expense-summary" },
      {
        name: "By Category", layout: "table",
        columns: [
          col("category",  "Category",      r => <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,0.12),color:EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,fontWeight:600}}>{r.category}</span>),
          col("vendor",    "Vendor",        r => r.vendor),
          col("date",      "Date",          r => r.date),
          col("amount",    "Amount",        r => money(r.amount), {align:"right"}),
          col("notes",     "Notes",         r => r.notes),
        ],
        run: (rows) => ({
          rows: [...rows].sort((a,b)=>(a.category||"").localeCompare(b.category||"")),
          footer: { amount: rows.reduce((s,r)=>s+(+r.amount||0),0) },
        }),
      },
      {
        name: "Recurring", layout: "table",
        columns: [
          col("vendor",        "Vendor",      r => <strong style={{color:C.ink}}>{r.vendor}</strong>),
          col("description",   "Description", r => r.description),
          col("category",      "Category",    r => r.category),
          col("amount",        "Amount",      r => money(r.amount), {align:"right"}),
          col("recurringFreq", "Frequency",   r => r.recurringFreq),
        ],
        run: (rows) => {
          const filtered = rows.filter(r => r.recurring);
          return { rows: filtered, footer: { amount: filtered.reduce((s,r)=>s+(+r.amount||0),0) } };
        },
      },
      {
        name: "Tax Deductible", layout: "table",
        columns: [
          col("date",        "Date",        r => r.date),
          col("vendor",      "Vendor",      r => r.vendor),
          col("description", "Description", r => r.description),
          col("category",    "Category",    r => r.category),
          col("amount",      "Amount",      r => money(r.amount), {align:"right"}),
        ],
        run: (rows) => {
          const filtered = rows.filter(r => r.taxDeductible);
          return { rows: filtered, footer: { amount: filtered.reduce((s,r)=>s+(+r.amount||0),0) } };
        },
      },
      { name: "Expense Table", layout: "record-table", columns: expenseTableCols() },
    ],
  },
  registrations: {
    views: [
      {
        name: "All Bookings", layout: "table",
        columns: [
          col("createdAt",   "Scheduled On",     r => formatRegistrationDateTime(r.createdAt)),
          col("clientId",    "Client",       (r, ctx) => { const c = ctx.clientsById?.[r.clientId] || (ctx.data.clients||[]).find(x => x.id === r.clientId); return c ? <strong style={{color:C.ink}}>{cleanName(c.name)}</strong> : <span style={{color:C.ink3}}>—</span>; }),
          col("scheduledAt", "Session Date/Time", r => formatRegistrationDateTime(r.scheduledAt)),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("calendlyAmount","Calendly Amount", r => {
            const cal = calendlyBookingAmount(r);
            if (cal === 0) return <span style={{color:C.ink3}}>Free</span>;
            return cal != null
              ? <span style={{color:C.ink2}}>{money(cal)}</span>
              : <span style={{color:C.ink3}}>—</span>;
          }, { align: "right" }),
          col("status",      "Status",       r => {
            const clr = { booked: C.brand, attended: "#4A8C6F", canceled: "#C0573F", rescheduled: C.gold, no_show: "#8A96AC" }[r.status] || C.ink3;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.status}</span>;
          }),
          col("attendanceType","Attendance", r => r.attendanceType || "—"),
        ],
        run: (rows) => ({ rows: sortRegistrationsByCreatedAt(rows) }),
        expandRow: registrationExpandRow,
      },
      {
        name: "Pending Waivers", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = ctx.clientsById?.[r.clientId] || (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Status",       r => r.status),
          col("waiverStatus","Waiver",       r => <span style={{color:"#C0573F",fontWeight:600}}>⚠ Pending</span>),
          col("concerns",    "Concerns",     r => r.concerns || "—"),
        ],
        run: (rows, ctx) => ({ rows: sortRegistrationsBySessionTime(rows.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled"), ctx.data) }),
      },
      {
        name: "Unpaid", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = ctx.clientsById?.[r.clientId] || (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Booking",      r => r.status),
          col("paymentStatus","Payment",     r => <span style={{color:"#C0573F",fontWeight:700}}>Unpaid</span>),
        ],
        run: (rows, ctx) => ({ rows: sortRegistrationsBySessionTime(rows.filter(r => r.paymentStatus === "unpaid" && r.status !== "canceled"), ctx.data) }),
      },
      {
        name: "Cancellations and Reschedules", layout: "table",
        columns: [
          col("canceledAt",  "Cancelled On", r => r.canceledAt ? new Date(r.canceledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + new Date(r.canceledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = ctx.clientsById?.[r.clientId] || (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || r.eventName || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"),
          col("status",      "Status",       r => {
            const clr = r.status === "canceled" ? "#C0573F" : C.gold;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.status}</span>;
          }),
          col("cancelerType","Cancelled By", r => r.cancelerType ? r.cancelerType.replace(/_/g, " ") : "—"),
          col("cancelReason","Cancel Reason",r => r.cancelReason || "—"),
        ],
        run: (rows, ctx) => ({
          rows: [...rows]
            .filter(r => r.status === "canceled" || r.status === "rescheduled")
            .sort((a, b) => (b.canceledAt || b.createdAt || "").localeCompare(a.canceledAt || a.createdAt || "")),
        }),
        expandRow: registrationExpandRow,
      },
      { name: "Refunds", layout: "refunds" },
    ],
  },
  clients: {
    views: [
      { name: "All clients", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("email", "Email", (r) => r.email ? <a href={`mailto:${r.email}`} style={{ color: C.brand }} onClick={e => e.stopPropagation()}>{r.email}</a> : "—"),
          col("phone", "Phone", (r) => r.phone ? <a href={`tel:${r.phone}`} style={{ color: C.brand }} onClick={e => e.stopPropagation()}>{r.phone}</a> : "—"),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("referral", "Referral", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("lifetimeValue", "LTV", (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
      { name: "Pipeline", layout: "board", card: ["clientType", "tags", "nextSession", "packageType", "referral"],
        run: (rows) => ({ groups: STATUS.map((s) => ({ key: s, label: s, color: STATUS_COLOR[s], cards: rows.filter((r) => r.status === s) })) }) },
      { name: "By segment", layout: "table",
        columns: [
          col("name",        "Client",   clientCell.name),
          col("clientType",  "Segment",  clientCell.type),
          col("tags",        "Intent",   clientCell.tags),
          col("status",      "Status",   clientCell.status),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",    (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.clientType || "").localeCompare(b.clientType || "")) }) },
      { name: "Reactivation list", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("clientType","Segment",   clientCell.type),
          col("tags",      "Intent",    clientCell.tags),
          col("lastSession","Last seen", (r) => fmtDate(r.lastSession)),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
          col("notes",     "Notes",     (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
        ],
        run: (rows, c) => ({
          rows: rows.filter(r =>
            r.clientType === "Past client — reactivate" ||
            (r.lastSession && r.lastSession < addDays(c.today, -30))
          ).sort((a, b) => (a.lastSession || "").localeCompare(b.lastSession || ""))
        }) },
      { name: "Advocates & referrers", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("status",    "Status",    clientCell.status),
          col("tags",      "Intent",    clientCell.tags),
          col("referral",  "Referral potential", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.referral === "High" || r.status === "Advocate" || r.clientType === "Referral source" || r.clientType === "Advocate").sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
      { name: "Sessions due / overdue", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("nextSession", "Next session", (r, c) => <DateChip iso={r.nextSession} today={c.today} />),
          col("phone", "Phone", (r) => <span style={{ color: C.ink2 }}>{r.phone}</span>),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => onOrBefore(r.nextSession, c.today)).sort((a, b) => (a.nextSession || "").localeCompare(b.nextSession || "")) }) },
      { name: "High value", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("packageType", "Package", (r) => r.packageType),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "Lifetime value", (r) => <strong>{money(r.lifetimeValue)}</strong>, { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter((r) => Number(r.lifetimeValue) > 0).sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
    ],
  },
  partners: {
    views: [
      { name: "Active partners", layout: "table",
        columns: activePartnerCols(),
        run: (rows, c) => ({ rows: rows.filter((r) => partnerIsActive(r, c?.derived?.sessionsByStudio)).sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
      { name: "Pipeline", layout: "partner-pipeline",
        run: (rows) => ({ groups: STAGE.map((s) => ({ key: s, label: s, color: STAGE_COLOR[s], cards: rows.filter((r) => r.stage === s) })) }) },
      { name: "In outreach", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("contact", "Contact", (r) => r.contact),
          col("lastTouch", "Last touch", (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => ({ rows: rows.filter((r) => !["Recurring partner", "Lost / not a fit"].includes(r.stage)).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "Revenue forecast", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("estimatedCommunitySize", "Community", (r) => Number(r.estimatedCommunitySize || 0).toLocaleString(), { align: "right" }),
          col("revenuePotential", "Rev. potential", (r) => <strong>{money(r.revenuePotential)}</strong>, { align: "right", sum: "revenuePotential" }),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => {
          const sorted = [...rows].filter((r) => r.stage !== "Lost / not a fit").sort((a, b) => Number(b.revenuePotential) - Number(a.revenuePotential));
          return { rows: sorted, footer: { revenuePotential: money(sum(sorted, "revenuePotential")), label: "Total pipeline value" } };
        } },
      { name: "All partners", layout: "table",
        columns: [
          col("name",      "Studio",        (r) => <span style={{ fontWeight: 700 }}>{cleanName(r.name)}</span>),
          col("studioType","Type",          (r) => fmtStudioType(r.studioType)),
          col("stage",     "Stage",         (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("location",  "Address",       (r) => r.location || "—"),
          col("contact",   "Contact",       (r) => r.contact || "—"),
          col("phone",     "Phone",         (r) => r.phone ? <a href={`tel:${r.phone}`} style={{ color: C.brand }}>{r.phone}</a> : "—"),
          col("email",     "Email",         (r) => r.email ? <a href={`mailto:${r.email}`} style={{ color: C.brand }}>{r.email}</a> : "—"),
          col("studioSharePct", "Studio share", (r) => r.studioSharePct ? `${r.studioSharePct}%` : "—"),
          col("contractStatus", "Contract", (r) => r.contractStatus ? <Tag color={r.contractStatus === "Signed" ? "#4A8C6F" : C.gold} soft>{r.contractStatus}</Tag> : "—"),
          col("lastTouch", "Last touch",    (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
    ],
  },
  sessions: {
    views: [
      { name: "Calendar", layout: "calendar", run: (rows) => ({ rows }) },
      { name: "Performance", layout: "session-perf", run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
      { name: "Revenue leaderboard", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId", "Studio", (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("date", "Date", (r) => fmtDate(r.date)),
          col("status", "Status", (r) => <Tag color={SESSION_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("attendance", "In room", (r) => `${r.attendance || 0}/${r.capacity || "?"}`, { align: "right" }),
          col("revenue", "Gross", (r, c) => money(sessionFinanceFor(r, c.data).gross), { align: "right" }),
          col("studioSplit", "Studio cut", (r, c) => money(sessionFinanceFor(r, c.data).studioSplit), { align: "right" }),
          col("netRevenue", "Your net", (r, c) => <strong>{money(sessionFinanceFor(r, c.data).net)}</strong>, { align: "right" }),
        ],
        run: (rows, ctx) => {
          const withFin = rows.map(r => ({ r, fin: sessionFinanceFor(r, ctx.data) }));
          withFin.sort((a, b) => b.fin.net - a.fin.net);
          return {
            rows: withFin.map(x => x.r),
            footer: {
              revenue: money(withFin.reduce((s, x) => s + x.fin.gross, 0)),
              netRevenue: money(withFin.reduce((s, x) => s + x.fin.net, 0)),
              label: "All-time total",
            },
          };
        } },
      { name: "Conversion", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("attendance", "In room", (r) => r.attendance, { align: "right" }),
          col("paidAttendees", "Paid", (r) => r.paidAttendees || "—", { align: "right" }),
          col("waivers", "Waivers", (r) => r.waivers || "—", { align: "right" }),
          col("packagesSold", "Packages", (r) => r.packagesSold, { align: "right" }),
          col("testimonialsCapt", "Testimonials", (r) => r.testimonialsCapt || 0, { align: "right" }),
          col("referralsGenerated", "Referrals", (r) => r.referralsGenerated, { align: "right" }),
          col("conversion", "Conversion", (r) => <Tag color={r.conversion >= 0.3 ? "#2F6FD0" : r.conversion >= 0.2 ? "#3F87DC" : "#9FB2CC"} soft>{pct(r.conversion)}</Tag>, { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => Number(b.conversion) - Number(a.conversion)) }) },
      { name: "All Sessions", layout: "table",
        columns: [
          col("date",       "Session Date & Time", (r) => r.time ? `${fmtDate(r.date)} ${r.time}` : fmtDate(r.date)),
          col("name",       "Session",    (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId",   "Studio",     (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("status",     "Status",     (r) => <Tag color={SESSION_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("attendance", "Attendance", (r) => `${r.attendance || 0}/${r.capacity || "?"}`, { align: "right" }),
          col("netRevenue", "Gross Rev",   (r) => money(r.revenue || r.netRevenue), { align: "right" }),
          col("notes",      "Notes",      (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (b.date || "").localeCompare(a.date || "")) }) },
    ],
  },
  offers: {
    views: [
      { name: "Open pipeline", layout: "table",
        columns: offerCols(),
        run: (rows) => ({ rows: rows.filter((r) => OPEN_STATUSES.includes(r.status)).sort((a, b) => (a.expireDate || "9999").localeCompare(b.expireDate || "9999")) }) },
      { name: "Conversion analytics", layout: "offer-analytics" },
      { name: "By offer type", layout: "table",
        columns: [
          col("offerType", "Type", (r) => r.offerType),
          col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
          col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
          col("source", "Source", (r) => r.source || "—"),
          col("notes", "Notes", (r) => <span style={{ color: C.ink2, fontSize: 12 }}>{r.notes}</span>),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => a.offerType.localeCompare(b.offerType)) }) },
      { name: "Won this month", layout: "table",
        columns: offerCols(),
        run: (rows, c) => {
          const r = rows.filter((x) => WON_STATUSES.includes(x.status) && sameMonth(x.dateOffered, c.today));
          return { rows: r, footer: { price: money(sum(r, "price")), label: "Closed this month" } };
        } },
      { name: "All offers", layout: "table", columns: offerCols(), run: (rows) => ({ rows }) },
    ],
  },
  stripe: {
    views: [
      { name: "Stripe reconciliation", layout: "payment-reconciliation" },
    ],
  },
  revenue: {
    views: [
      { name: "Revenue attribution", layout: "revenue-analytics-booked" },
      { name: "This month", layout: "revenue-this-month" },
      { name: "Revenue Table", layout: "record-table", columns: revenueTableCols() },
    ],
  },
  content: {
    views: [
      { name: "Pipeline",
        layout: "board",
        card: ["category", "platform", "scheduledDate", "leads", "booked"],
        run: (rows) => ({
          groups: ["Idea","Draft","Scheduled","Published"].map(s => ({
            key: s, label: s, color: CONTENT_STATUS_COLOR[s],
            cards: rows.filter(r => r.status === s),
          })),
        }) },
      { name: "Analytics", layout: "content-analytics" },
      { name: "Calendar",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: [...rows]
            .filter(r => r.status !== "Archived")
            .sort((a, b) => (a.scheduledDate || a.datePosted || "9999").localeCompare(b.scheduledDate || b.datePosted || "9999")),
        }) },
      { name: "Top performers",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: [...rows]
            .filter(r => r.status === "Published")
            .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0) || (Number(b.leads) || 0) - (Number(a.leads) || 0)),
          footer: {
            revenue: money(rows.filter(r=>r.status==="Published").reduce((a,r)=>a+(Number(r.revenue)||0),0)),
            label: "Total attributed revenue",
          },
        }) },
      { name: "Ideas & drafts",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: rows.filter(r => ["Idea","Draft"].includes(r.status))
            .sort((a, b) => (a.scheduledDate || "9999").localeCompare(b.scheduledDate || "9999")),
        }) },
    ],
  },
  followups: {
    views: [
      { name: "Due today", layout: "table",
        columns: [
          col("name",       "Follow-up",   (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",      (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype",     "Type",        (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("_send",      "",            (r, c) => {
            const Btn = c.FollowUpSendButton;
            return Btn ? <Btn r={r} data={c.data} setData={c.setData} today={c.today} /> : null;
          }),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => r.nextAction && r.nextAction <= c.today).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "All follow-ups", layout: "table",
        columns: [
          col("name",       "Follow-up",   (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",      (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype",     "Type",        (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r) => fmtDate(r.nextAction)),
          col("outcome",    "Outcome",     (r) => r.outcome ? <span style={{ color: C.brand }}>{r.outcome}</span> : <span style={{ color: C.ink3 }}>pending</span>),
          col("_send",      "",            (r, c) => {
            const Btn = c.FollowUpSendButton;
            return Btn ? <Btn r={r} data={c.data} setData={c.setData} today={c.today} /> : null;
          }),
        ],
        run: (rows) => ({ rows }) },
      { name: "By type", layout: "board", card: ["clientId", "nextAction", "outcome"],
        run: (rows) => ({ groups: FUTYPE.map((t) => ({ key: t, label: t, color: FUTYPE_COLOR[t], cards: rows.filter((r) => r.futype === t) })) }) },
    ],
  },
  testimonials: {
    views: [
      { name: "Library", layout: "testimonial-library" },
      { name: "All", layout: "table",
        columns: [
          col("name",       "Testimonial",  (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",       (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("status",     "Status",       (r) => <Tag color={TESTIMONIAL_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("type",       "Type",         (r) => r.type),
          col("themes",     "Themes",       (r) => <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{(r.themes||[]).slice(0,2).map(t=><Tag key={t} soft>{t}</Tag>)}</div>),
          col("useOnWebsite","Web",         (r) => r.useOnWebsite ? <span style={{ color:"#4A8C6F" }}>✓</span> : "—", { align:"center" }),
          col("useOnSocial", "Social",      (r) => r.useOnSocial  ? <span style={{ color:"#6B5CE7" }}>✓</span> : "—", { align:"center" }),
          col("datePublished","Published",  (r) => fmtDate(r.datePublished)),
        ],
        run: (rows) => ({ rows: [...rows].sort((a,b) => {
          const ord = { Published:0, Approved:1, Received:2, "Request sent":3, "Breakthrough noted":4, Declined:5 };
          return (ord[a.status]??9) - (ord[b.status]??9);
        }) }) },
      { name: "Action needed", layout: "table",
        columns: [
          col("name",     "Testimonial",  (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId", "Client",       (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("status",   "Status",       (r) => <Tag color={TESTIMONIAL_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("notes",    "Notes",        (r) => r.notes),
        ],
        run: (rows) => ({ rows: rows.filter(r => TESTIMONIAL_ACTION_STATUSES.includes(r.status)) }) },
      { name: "By theme", layout: "board",
        card: ["clientId","status","bestQuote"],
        run: (rows) => ({
          groups: TESTIMONIAL_THEMES.map(th => ({
            key: th, label: th, color: "#6B5CE7",
            cards: rows.filter(r => (r.themes||[]).includes(th)),
          })).filter(g => g.cards.length > 0),
        }) },
    ],
  },
  templates: {
    views: [
      { name: "Library", layout: "template-library" },
      { name: "All", layout: "table",
        columns: [
          col("name",     "Template",  r => <span style={{ fontWeight: 600 }}>{r.name}</span>),
          col("category", "Category",  r => <Tag color={TMPL_CATEGORY_COLOR[r.category]||C.ink3} soft>{r.category}</Tag>),
          col("channel",  "Channel",   r => <Tag color={TMPL_CHANNEL_COLOR[r.channel]||C.ink3} soft>{r.channel}</Tag>),
          col("subject",  "Subject",   r => <span style={{ fontSize: 12, color: C.ink2 }}>{r.subject||"—"}</span>),
          col("usageCount","Used", r => r.usageCount || 0),
        ],
        run: (rows) => ({ rows }),
      },
    ],
  },
  referrals: {
    views: [
      { name: "Referral tree", layout: "referral-tree" },
      { name: "Action needed", layout: "table",
        columns: refActionCols(),
        run: (rows, c) => ({
          rows: rows.filter(referralActionPending)
                    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        }) },
      { name: "All referrals", layout: "table", columns: refCols(), run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
    ],
  },
  outreach: {
    views: [
      { name: "All targets",        layout: "outreach-hub",
        run: (rows) => ({ rows }) },
      { name: "Hot leads",          layout: "outreach-hub",
        run: (rows, { today }) => ({ rows: rows.filter(r => r.warmth === "Hot") }) },
      { name: "Overdue",            layout: "outreach-hub",
        run: (rows, { today }) => ({ rows: rows.filter(r =>
          r.nextFollowUp && r.nextFollowUp < today && !OUTREACH_CLOSED_STATUSES.includes(r.status)
        )}) },
      { name: "No response",        layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => OUTREACH_NO_RESPONSE.includes(r.responseStatus)) }) },
      { name: "Demo stage",          layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => ["Demo offered","Demo scheduled"].includes(r.status)) }) },
      { name: "Agreement pending",   layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => r.status === "Agreement pending") }) },
      { name: "High potential",      layout: "outreach-hub",
        run: (rows) => ({ rows: [...rows].filter(r => Number(r.revenuePotential) >= 1000).sort((a,b) => Number(b.revenuePotential) - Number(a.revenuePotential)) }) },
    ],
  },
};

export function partnerHasAgreementPdf(partner) {
  return (partner.agreements || []).some((a) => {
    if (a.isPdf === false) return false;
    if (agreementExt(a.name) !== "pdf") return false;
    if (a.isPdf === true || a.id) return true;
    return agreementRecordIsPdf(a);
  });
}

// Any uploaded Studio Partner Agreement file (PDF or Word) marks a partner as a live, working partner.
export function partnerHasUploadedAgreement(partner) {
  return (partner?.agreements || []).length > 0;
}

// A partner counts as "active" when their pipeline stage shows a live engagement, they have an
// uploaded agreement on file, OR they have at least one studio session on the calendar — so
// signed/working partners are never hidden by a stale stage value.
export function partnerIsActive(partner, sessionsByStudio) {
  if (partner.stage === "Recurring partner"
    || partner.stage === "First session scheduled"
    || partner.stage === "Pilot completed") return true;
  if (partnerHasUploadedAgreement(partner)) return true;
  if ((sessionsByStudio?.[partner.id] || []).length > 0) return true;
  return false;
}

export function partnerCols() {
  return [
    col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
    col("location", "Location", (r) => <span style={{ color: C.ink2 }}>{r.location}</span>),
    col("contact", "Contact", (r) => `${r.contact} · ${r.role}`),
    col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
    col("avgAttendance", "Avg att.", (r) => r.avgAttendance || "—", { align: "right" }),
    col("sessionsPerMonth", "Sess/mo", (r) => r.sessionsPerMonth || "—", { align: "right" }),
    col("revenuePotential", "Rev. potential", (r) => money(r.revenuePotential), { align: "right" }),
  ];
}
export function activePartnerCols() {
  return [
    col("name", "Studio", (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {!partnerHasAgreementPdf(r) && (
          <span title="Please upload Studio Partner Agreement" style={{ display: "inline-flex", flexShrink: 0, cursor: "help" }}>
            <AlertCircle size={15} color="#C0392B" />
          </span>
        )}
        <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>
      </span>
    )),
    ...partnerCols().slice(1),
  ];
}
export function offerCols() {
  return [
    col("clientId", "Client / Studio", (r, c) => <span style={{ fontWeight: 600 }}>{clientShort(c.derived.clientName[r.clientId] || cleanName(r.name))}</span>),
    col("offerType", "Type", (r) => r.offerType),
    col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
    col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("probability", "Prob.", (r) => r.probability || "—", { align: "right" }),
    col("source", "Source", (r) => r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"),
    col("dateOffered", "Offered", (r) => fmtDate(r.dateOffered)),
    col("expireDate", "Expires", (r, c) => <DateChip iso={r.expireDate} today={c.today} />),
    col("followUpDate", "Follow-up", (r, c) => <DateChip iso={r.followUpDate} today={c.today} />),
  ];
}
export function referralActionPending(r) {
  return !r.rewardGiven;
}
export function refCols() {
  return [
    col("referrerId", "Referred by", (r, c) => {
      const n = c.derived.clientName[r.referrerId];
      return n ? <span style={{ fontWeight: 600 }}>{clientShort(n)}</span> : "—";
    }),
    col("referredName", "Referred person", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.referredName)}</span>),
    col("status", "Status", (r) => <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("revenue", "Revenue", (r) => r.revenue ? <strong style={{ color: "#4A8C6F" }}>{money(r.revenue)}</strong> : "—", { align: "right" }),
    col("thankYouSent", "Thank-you", (r) => r.thankYouSent
      ? <span style={{ color: "#4A8C6F", fontWeight: 600 }}>✓ Sent</span>
      : <span style={{ color: "#D9892B", fontWeight: 600 }}>Needed</span>),
    col("rewardGiven", "Action Status", (r) => r.rewardGiven
      ? <span style={{ color: "#4A8C6F", fontWeight: 600 }}>✓ Completed</span>
      : <span style={{ color: C.ink3 }}>Pending</span>),
    col("notes", "Notes", (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
  ];
}

export function refActionCols() {
  const updateRef = (c, r, patch) => {
    if (!c.setData) return;
    c.setData(d => ({
      ...d,
      referrals: d.referrals.map(x => x.id === r.id ? { ...x, ...patch } : x),
    }));
  };
  return [
    col("referrerId", "Referred by", (r, c) => {
      const n = c.derived.clientName[r.referrerId];
      return n ? <span style={{ fontWeight: 600 }}>{clientShort(n)}</span> : "—";
    }),
    col("referredName", "Referred person", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.referredName)}</span>),
    col("status", "Status", (r) => <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("date", "Date", (r, c) => <DateChip iso={r.date} today={c.today} />),
    col("rewardGiven", "Action Status", (r, c) => r.rewardGiven
      ? <span style={{ color: "#4A8C6F" }}>✓ Completed</span>
      : <button
          onClick={e => { e.stopPropagation(); updateRef(c, r, { rewardGiven: true }); }}
          style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
            background: hexA("#4A8C6F", 0.1), color: "#4A8C6F", border: `1px solid ${hexA("#4A8C6F", 0.3)}` }}>
          Mark Completed
        </button>),
    col("notes", "Notes", (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
  ];
}
export function revCols() {
  return [
    col("bookedAt", "Booked Date & Time", (r) => r.bookedAt ? formatRegistrationDateTime(r.bookedAt) : "—"),
    col("name", "Description", (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>
        {r.isFree && <span style={{ fontSize: 10.5, fontWeight: 700, background: "#F0F4FF", color: "#5B6ECC", border: "1px solid #C7D0F5", borderRadius: 5, padding: "1px 6px", letterSpacing: ".04em" }}>FREE</span>}
      </span>
    )),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("channel", "Channel", (r) => <Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag>),
    col("gross", "Gross", (r) => <span style={{ color: r.isFree ? C.ink3 : "inherit" }}>{money(r.gross)}</span>, { align: "right", sum: "gross" }),
    col("studioSplit", "Studio split", (r) => r.studioSplit ? money(r.studioSplit) : "—", { align: "right" }),
    col("stripeFee", "Processing", (r) => r.stripeFee ? money(r.stripeFee) : "—", { align: "right" }),
    col("refunds", "Refunds", (r) => r.refunds ? <span style={{ color: "#C0573F" }}>-{money(r.refunds)}</span> : "—", { align: "right" }),
    col("net", "Net", (r) => {
      const n = calcNet(r);
      return <strong style={{ color: n > 0 ? "#4A8C6F" : n < 0 ? "#C0573F" : C.ink3 }}>{money(n)}</strong>;
    }, { align: "right", sum: "net" }),
  ];
}
// Collapsed columns for the raw Revenue table listing (record-table layout).
// `sortVal` returns the raw comparable value used by the sortable column headers.
export function revenueTableCols() {
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
// Collapsed columns for the raw Expense table listing (record-table layout).
export function expenseTableCols() {
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
export function contentCols() {
  return [
    col("name",      "Title",    (r) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{cleanName(r.name)}</div>
        {r.body && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{r.body}</div>}
      </div>
    )),
    col("category",  "Category",  (r) => <Tag color={CONTENT_CAT_COLOR[r.category] || C.ink3} soft>{r.category}</Tag>),
    col("status",    "Status",    (r) => <Tag color={CONTENT_STATUS_COLOR[r.status] || C.ink3} soft>{r.status}</Tag>),
    col("platform",  "Platform",  (r) => <Tag color={PLATFORM_COLOR[r.platform] || C.ink3} soft>{r.platform}</Tag>),
    col("scheduledDate","Date",   (r) => <DateChip iso={r.datePosted || r.scheduledDate} />),
    col("reach",     "Reach",     (r) => (Number(r.reach) || 0).toLocaleString(), { align: "right" }),
    col("leads",     "Leads",     (r) => Number(r.leads) || 0, { align: "right" }),
    col("booked",    "Booked",    (r) => <strong style={{ color: C.brand }}>{Number(r.booked) || 0}</strong>, { align: "right" }),
    col("revenue",   "Revenue",   (r) => money(r.revenue), { align: "right" }),
  ];
}
export { sum };
