import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, ComposedChart, Bar, Line, Legend } from "recharts";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, ChevronDown, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
  Zap, Copy, Clock, TrendingUp, BarChart2, AlertCircle, Activity, Send, Info, BellRing, Milestone,
  LogOut, UserCircle, Shield, KeyRound, Receipt, ClipboardList, FileSignature, CalendarCheck, CheckCircle, Save, Scale, Lock,
} from "lucide-react";
import { C, FONT, hexA } from "../../lib/theme.js";
import { uid, todayISO, addDaysISO, addMonthsISO, MONTHS, fmtDate, money, pct, onOrBefore, sameMonth, num, bool, norm, cleanName, preferLongerText, clientShort, sectionLabel, fmtStudioType, isValidISODate } from "../../lib/format.js";
import * as constants from "../../lib/constants.js";
import { emptySessionChecklist, emptyEquipChecklist, SESSION_CHECKLIST, EQUIP_CHECKLIST, VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS } from "../../lib/checklists.js";
import { sendCrmEmail, makeEmailFailEntry, cappedLog, EMAIL_LOG_CAP, slimHistEntry } from "../../lib/email.js";
import { extractTemplateVars, autoFillTemplateVars, applyTemplateVars, findUnreplacedTemplateTokens, unreplacedTokensMessage, resolveRelationshipActionRecipient, suggestEmailTemplatesForAction } from "../../lib/templates.js";
import { BreathMark, Stat, Panel, Row, Dot, Tag, MiniChip, DateChip, Empty } from "../../components/primitives.jsx";
import { useCrm } from "../../lib/crmContext.jsx";
import { registrationBookingTimestamp, registrationCreatedTimestamp } from "../../lib/stripeMatching.js";
import {
  buildRegistrationRevenueRows,
  registrationRevenueForMonth,
  computeClientLifetimeValue,
} from "../../lib/revenue/index.js";
import { refundEligibility } from "../../lib/refundPolicy.js";
const { OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, STAGE, STAGE_COLOR, SESSION_STATUS, SESSION_STATUS_COLOR, CLIENT_TYPE, STATUS, STATUS_COLOR, FUTYPE, FUTYPE_COLOR, REF_STATUS, OUTREACH_STATUS, TESTIMONIAL_ACTION_STATUSES, OUTREACH_CLOSED_STATUSES, OUTREACH_NO_RESPONSE } = constants;

/* ============================================================
   TODAY DASHBOARD — Command Center
   ============================================================ */

export const CAT_META = {
  revenue:      { label: "Revenue",      Icon: DollarSign, color: C.brand,    bg: C.brandSoft,   text: C.brandDeep },
  relationship: { label: "Relationship", Icon: Users,      color: C.gold,     bg: "#F6EAD6",     text: "#7A4D0F"   },
  operational:  { label: "Operational",  Icon: Check,      color: "#4A8C6F",  bg: "#E2F0EA",     text: "#1E5239"   },
};
export const LANE = {
  b2c:  { label: "B2C", full: "Client Revenue",  color: C.brand,   bg: C.brandSoft, text: C.brandDeep, accent: C.brand,   soft: C.brandSoft  },
  b2b:  { label: "B2B", full: "Studio Revenue",  color: "#6B5CE7", bg: "#EEEAFF",   text: "#3D2DA0",   accent: "#6B5CE7", soft: "#EEEAFF"    },
  core: { label: "",    full: "",                color: C.ink2,    bg: C.surfaceAlt, text: C.ink2,     accent: C.ink2,    soft: C.surfaceAlt },
};
export const URGENCY_DOT = { high: "#C0573F", medium: C.gold, low: C.ink3 };

export function sessionIsVirtual(s) {
  return !s.studioId && (s.locationType === "zoom" || s.locationType === "custom" || !s.locationType);
}

export function sessionActionLocation(s, derived) {
  if (sessionIsVirtual(s)) return "Virtual";
  const studio = derived.partnerName[s.studioId];
  return studio ? cleanName(studio) : "—";
}

export function sessionVirtualPreSessionComplete(s, data) {
  const equip = s.equipChecklist || {};
  // Match VirtualSessionChecklist "Virtual Setup" phase — not the merged Pre-Session block
  const virtualSetupItems = virtualEquipPhaseItems("virtual_setup");
  if (!virtualSetupItems.every((i) => equip[i.id])) return false;
  const regs = (data.registrations || []).filter(
    (r) => r.sessionId === s.id && r.status !== "cancelled" && r.status !== "canceled"
  );
  if (regs.some((r) => r.paymentStatus === "unpaid")) return false;
  return true;
}

export function sessionStudioPreSessionComplete(s, data) {
  const checklist = s.checklist || {};
  const setupReady = s.roomSetupStatus === "Ready" || checklist.room_setup_done || checklist.tech_room_setup;
  const audioReady = s.musicSetupStatus === "Ready" || checklist.audio_tested;
  if (!setupReady || !audioReady) return false;
  const regs = (data.registrations || []).filter(
    (r) => r.sessionId === s.id && r.status !== "cancelled" && r.status !== "canceled"
  );
  if (regs.some((r) => r.paymentStatus === "unpaid")) return false;
  return true;
}

export function sessionPreSessionComplete(s, data) {
  return sessionIsVirtual(s)
    ? sessionVirtualPreSessionComplete(s, data)
    : sessionStudioPreSessionComplete(s, data);
}

export function normalizeChecklistMap(cl, emptyFn) {
  if (!cl || typeof cl !== "object" || Array.isArray(cl)) return emptyFn();
  return cl;
}

/** Resolve a Next Best Action to a live record + optional drawer tab */
export function resolveActionOpen(action, data) {
  const db = action.db;
  if (!db || !action.record?.id) return null;
  const list = data[db] || [];
  let record = list.find((r) => r.id === action.record.id) || action.record;
  if (db === "sessions") {
    record = {
      ...record,
      checklist: normalizeChecklistMap(record.checklist, emptySessionChecklist),
      equipChecklist: normalizeChecklistMap(record.equipChecklist, emptyEquipChecklist),
    };
  }
  let initialTab;
  if (db === "sessions" && (action.id.startsWith("tod_") || action.id.startsWith("tmr_"))) {
    initialTab = "session-checklist";
  } else if (db === "clients" && action.id.startsWith("nfu_")) {
    initialTab = "timeline";
  }
  return { db, record, initialTab };
}

/** Client/partner phone + name for NBA revenue actions (follow-ups, offers, etc.) */
export function resolveActionContact(action, data) {
  const { db, record: r } = action;
  if (!r) return null;
  const clients = data.clients || [];
  const partners = data.partners || [];
  if (db === "clients") {
    const c = clients.find((x) => x.id === r.id) || r;
    return { name: cleanName(c.name), phone: c.phone || "", email: c.email || "" };
  }
  if (db === "followups" || db === "offers") {
    const c = clients.find((x) => x.id === r.clientId);
    if (c) return { name: cleanName(c.name || r.name), phone: c.phone || "", email: c.email || "" };
  }
  if (db === "partners") {
    const p = partners.find((x) => x.id === r.id) || r;
    return { name: cleanName(p.contact || p.name), phone: p.phone || "", email: p.email || "" };
  }
  return null;
}

/** Map record db key → main nav section id (for NBA deep-links) */
const NBA_SECTION_FOR_DB = {
  sessions: "sessions", clients: "clients", partners: "partners",
  followups: "followups", offers: "offers",
};

export function buildActions(data, derived, today) {
  const daysBetween = (a, b) => (!a || !b) ? 0 : Math.round((new Date(b) - new Date(a)) / 86400000);
  const tomorrowISO = addDaysISO(today, 1);
  const actions = [];
  const followups = data.followups || [];
  const clients = data.clients || [];
  const offers = data.offers || [];
  const partners = data.partners || [];
  const sessions = data.sessions || [];

  // ── REVENUE ──────────────────────────────────────────────────────────
  // Overdue follow-ups (24h / 72h)
  followups
    .filter((f) => !f.outcome && f.nextAction && f.nextAction <= today && (f.futype === "24h" || f.futype === "72h"))
    .forEach((f) => {
      const client = clients.find((c) => c.id === f.clientId);
      const d = daysBetween(f.nextAction, today);
      const label = f.futype === "24h" ? "24-hour" : "72-hour";
      actions.push({ id: "fu_" + f.id, priority: d >= 2 ? 1 : 2, urgency: d >= 2 ? "high" : "medium", category: "revenue",
        text: `Call ${cleanName(client?.name || f.name)} — ${label} post-session follow-up ${d > 0 ? `${d} day${d !== 1 ? "s" : ""} overdue` : "due today"}`,
        sub: `${label} follow-up · client since ${fmtDate(client?.firstSession) || "—"}${client?.phone ? ` · ${client.phone}` : ""}`, db: "followups", record: f });
    });

  // Open offers
  offers
    .filter((o) => OPEN_STATUSES.includes(o.status))
    .forEach((o) => {
      const client = data.clients.find((c) => c.id === o.clientId);
      const d = daysBetween(o.dateOffered, today);
      actions.push({ id: "off_" + o.id, priority: d >= 5 ? 2 : 3, urgency: d >= 5 ? "high" : "medium", category: "revenue",
        text: `Follow up with ${cleanName(client?.name || o.name)} — open ${o.offerType} offer${d ? `, offered ${d} day${d !== 1 ? "s" : ""} ago` : ""}`,
        sub: `${o.offerType} · ${money(o.price)} · offered ${fmtDate(o.dateOffered)}${client?.phone ? ` · ${client.phone}` : ""}`, db: "offers", record: o });
    });

  // Attended 1x — no rebook
  clients
    .filter((c) => c.status === "Attended 1x" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "reb_" + c.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Rebook ${cleanName(c.name)} — attended once on ${fmtDate(c.lastSession)}, no next session set`,
        sub: `Attended 1x · source: ${c.source} · ${c.referral} referral potential${c.phone ? ` · ${c.phone}` : ""}`, db: "clients", record: c });
    });

  // Leads with no follow-up at all
  clients
    .filter((c) => c.status === "Lead" && !followups.some((f) => f.clientId === c.id))
    .forEach((c) => {
      actions.push({ id: "ld_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Convert lead ${cleanName(c.name)} — no follow-up scheduled yet`,
        sub: `Lead · ${c.source} · next session: ${fmtDate(c.nextSession) || "none"}${c.phone ? ` · ${c.phone}` : ""}`, db: "clients", record: c });
    });

  // Studio partners needing next step
  partners
    .filter((p) => ["Demo completed", "Pilot proposed", "Agreement sent", "Discovery call booked", "Demo session offered"].includes(p.stage))
    .filter((p) => !(derived.sessionsByStudio[p.id] || []).some((s) => s.date >= today))
    .forEach((p) => {
      actions.push({ id: "sp_" + p.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Book next session with ${cleanName(p.name)} — ${p.stage.toLowerCase()}, no upcoming session`,
        sub: `${p.stage} · contact: ${p.contact} · ${p.email}${p.phone ? ` · ${p.phone}` : ""}`, db: "partners", record: p });
    });

  // Engaged clients (2-3x) — no package yet
  clients
    .filter((c) => c.status === "Engaged (2-3x)" && (!c.packageType || c.packageType === "None" || c.packageType === "Drop-in"))
    .forEach((c) => {
      actions.push({ id: "pkg_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Offer package to ${cleanName(c.name)} — ${c.sessionsAttended} sessions in, still on drop-in`,
        sub: `Engaged · LTV: ${money(c.lifetimeValue)} · last seen: ${fmtDate(c.lastSession)}${c.phone ? ` · ${c.phone}` : ""}`, db: "clients", record: c });
    });

  // ── RELATIONSHIP ──────────────────────────────────────────────────────
  // Referral follow-ups overdue
  followups
    .filter((f) => f.futype === "Referral" && !f.outcome && f.nextAction && f.nextAction <= today)
    .forEach((f) => {
      const client = clients.find((c) => c.id === f.clientId);
      actions.push({ id: "ref_" + f.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Thank ${cleanName(client?.name || f.name)} for the referral — follow-up due ${daysBetween(f.nextAction, today) > 0 ? "& overdue" : "today"}`,
        sub: `Referral follow-up · due ${fmtDate(f.nextAction)}`, db: "followups", record: f });
    });

  // Advocates + High-referral — request testimonial
  clients
    .filter((c) => c.status === "Advocate" || (c.referral === "High" && Number(c.sessionsAttended) >= 3))
    .filter((c) => !followups.some((f) => f.clientId === c.id && f.futype === "Referral" && f.lastContact >= (today.slice(0, 7) + "-01")))
    .slice(0, 3)
    .forEach((c) => {
      actions.push({ id: "tst_" + c.id, priority: 5, urgency: "low", category: "relationship",
        text: `Request a testimonial from ${cleanName(c.name)} — ${c.sessionsAttended} sessions, noted as ${c.referral.toLowerCase()} referral`,
        sub: `${c.status} · last session: ${fmtDate(c.lastSession)}`, db: "clients", record: c });
    });

  // Active partners — no session in 14+ days
  partners
    .filter((p) => p.stage === "Recurring partner" || p.stage === "Pilot completed" || p.stage === "First session scheduled")
    .filter((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      return !last || daysBetween(last, today) > 14;
    })
    .forEach((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      actions.push({ id: "pi_" + p.id, priority: 5, urgency: "low", category: "relationship",
        text: `Check in with ${p.contact} at ${cleanName(p.name)} — ${last ? `last session ${fmtDate(last)}` : "no sessions logged"}`,
        sub: `${p.stage} · ${p.email}`, db: "partners", record: p });
    });

  // Warm contacts to invite — engaged, no upcoming session
  clients
    .filter((c) => c.status === "Engaged (2-3x)" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "inv_" + c.id, priority: 6, urgency: "low", category: "relationship",
        text: `Invite ${cleanName(c.name)} to an upcoming session — engaged but no next date scheduled`,
        sub: `Engaged · last seen: ${fmtDate(c.lastSession)} · ${c.source}`, db: "clients", record: c });
    });

  // ── DELIVERY ──────────────────────────────────────────────────────────
  // Sessions today — hide once pre-session checklist is complete
  sessions
    .filter((s) => s.date === today && !sessionPreSessionComplete(s, data))
    .forEach((s) => {
      const virtual = sessionIsVirtual(s);
      actions.push({ id: "tod_" + s.id, priority: 1, urgency: "high", category: "operational",
        text: `Session today: ${cleanName(s.name)} — confirm ${virtual ? "Zoom setup" : "room setup"} and payment link`,
        sub: `${sessionActionLocation(s, derived)} · ${today}`, db: "sessions", record: s });
    });

  // Sessions tomorrow — hide once pre-session checklist is complete
  sessions
    .filter((s) => s.date === tomorrowISO && !sessionPreSessionComplete(s, data))
    .forEach((s) => {
      const virtual = sessionIsVirtual(s);
      actions.push({ id: "tmr_" + s.id, priority: 2, urgency: "medium", category: "operational",
        text: `Session tomorrow: ${cleanName(s.name)} — run through ${virtual ? "virtual setup checklist" : "setup checklist"} today`,
        sub: `${sessionActionLocation(s, derived)} · ${fmtDate(tomorrowISO)}`, db: "sessions", record: s });
    });

  // Attended clients with no follow-up within 4 days
  clients
    .filter((c) => c.sessionsAttended > 0 && c.lastSession)
    .filter((c) => {
      const d = daysBetween(c.lastSession, today);
      return d >= 1 && d <= 4 && !followups.some((f) => f.clientId === c.id && f.lastContact >= c.lastSession);
    })
    .forEach((c) => {
      actions.push({ id: "nfu_" + c.id, priority: 2, urgency: "medium", category: "operational",
        text: `Log follow-up for ${cleanName(c.name)} — attended ${fmtDate(c.lastSession)}, no follow-up recorded`,
        sub: `${c.status} · ${c.sessionsAttended} session${c.sessionsAttended !== 1 ? "s" : ""}`, db: "clients", record: c });
    });

  const urgencyScore = { high: 0, medium: 1, low: 2 };
  // Referrals needing a thank-you
  (data.referrals || [])
    .filter(r => !r.thankYouSent && r.referrerId)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      actions.push({ id: "rty_" + r.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Send thank-you to ${cleanName(referrer?.name || "referrer")} — referred ${cleanName(r.referredName)}`,
        sub: `Referral · ${fmtDate(r.date)} · Status: ${r.status}`, db: "referrals", record: r });
    });

  // New referrals not yet contacted
  (data.referrals || [])
    .filter(r => r.status === "Referred" && daysBetween(r.date, today) >= 3)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      actions.push({ id: "rnc_" + r.id, priority: 5, urgency: "medium", category: "relationship",
        text: `Follow up with ${cleanName(r.referredName)} — referred by ${cleanName(referrer?.name || "?")} ${daysBetween(r.date, today)}d ago`,
        sub: `Not yet contacted · referred ${fmtDate(r.date)}`, db: "referrals", record: r });
    });

  return actions.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : urgencyScore[a.urgency] - urgencyScore[b.urgency]);
}

/* ── LANE SPLIT PANEL ── */
export function LaneSplitPanel({ data, today }) {
  const offers        = data.offers   || [];
  const sessions      = data.sessions || [];
  const clients       = data.clients  || [];
  const partners      = data.partners || [];
  const referrals     = data.referrals|| [];
  const registrations = data.registrations || [];
  const mo            = today.slice(0, 7);

  // Built once, shared by all three uses below (Operating profit tile Ã—2 + lane rows).
  const allRevRows    = useMemo(() => buildRevenueViewRows(data), [data]);

  // ── Shared MTD revenue rows (same source of truth as Revenue This Month tab) ──
  const allRevRowsMTD = useMemo(
    () => allRevRows.filter(r => ((r.bookedAt || r.date) || "").startsWith(mo)),
    [allRevRows, mo],
  );

  // ── B2C metrics ──
  const b2cOfferTypes = ["Single session","3-pack","6-pack","12-pack","Private session","Virtual session","Group package"];
  const b2cRevMTD = allRevRowsMTD
    .filter(r => r.channel !== "Studio session")
    .reduce((a, r) => a + (r.gross || 0), 0);
  const b2cOpenPipeline = offers.filter(o => OPEN_STATUSES.includes(o.status) && b2cOfferTypes.includes(o.offerType))
    .reduce((a, o) => a + (Number(o.price) || 0), 0);
  const activeClients = clients.filter(c => ["Member (4+)","Advocate","Engaged (2-3x)"].includes(c.status)).length;
  const refRevenue   = referrals.reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const avgLTV = clients.filter(c => Number(c.lifetimeValue) > 0).length
    ? Math.round(clients.filter(c => Number(c.lifetimeValue) > 0).reduce((a, c) => a + Number(c.lifetimeValue), 0)
        / clients.filter(c => Number(c.lifetimeValue) > 0).length)
    : 0;

  // ── B2B metrics ──
  const b2bRevMTD = allRevRowsMTD
    .filter(r => r.channel === "Studio session")
    .reduce((a, r) => a + (r.gross || 0), 0);
  const studioPipeline = partners.filter(p => p.stage !== "Lost / not a fit")
    .reduce((a, p) => a + (Number(p.revenuePotential) || 0), 0);
  const recurringP  = partners.filter(p => p.stage === "Recurring partner").length;
  const activeP     = partners.filter(p => !["Lost / not a fit","Target identified"].includes(p.stage)).length;
  const sessionsThisMonth = sessions.filter(s => sameMonth(s.date, today)).length;
  const sessionsWithRev = sessions.filter(s => sessionBookingRevenue(s.id, registrations) > 0);
  const avgSessionRev = sessionsWithRev.length
    ? Math.round(sessionsWithRev.reduce((a, s) => a + sessionBookingRevenue(s.id, registrations), 0) / sessionsWithRev.length)
    : 0;

  const b2cLane = LANE.b2c;
  const b2bLane = LANE.b2b;

  const LaneCard = ({ lane, metrics }) => (
    <div style={{ flex: 1, border: `1px solid ${lane.color}35`, borderRadius: 12, overflow: "hidden" }}>
      {/* Lane header */}
      <div style={{ padding: "11px 16px", background: lane.soft, borderBottom: `1px solid ${lane.color}30`,
        display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: lane.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13.5, color: lane.text }}>{lane.full}</span>
        <span style={{ fontSize: 11, color: lane.text, opacity: 0.65, marginLeft: "auto",
          fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{lane.label}</span>
      </div>
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: "#fff" }}>
        {metrics.map(({ label, value, sub }, i) => (
          <div key={label} style={{ padding: "13px 14px",
            borderRight: i % 2 === 0 ? `1px solid ${C.line}` : "none",
            borderBottom: i < metrics.length - 2 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontSize: 11, color: C.ink3, textTransform: "uppercase",
              letterSpacing: "0.07em", fontWeight: 600, marginBottom: 5 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700,
              color: lane.color, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600, margin: 0 }}>Revenue by Lane</h3>
        <span style={{ fontSize: 12, color: C.ink3 }}>B2C vs B2B breakdown</span>
      </div>
      <div style={{ display: "flex", gap: 14 }} className="sb-lane-split">
        <LaneCard lane={b2bLane} metrics={[
          { label: "Studio rev MTD",   value: money(b2bRevMTD),       sub: "studio session prices" },
          { label: "Studio pipeline",  value: money(studioPipeline),  sub: `${partners.filter(p=>p.stage!=="Lost / not a fit").length} active` },
          { label: "Sessions MTD",     value: sessionsThisMonth,       sub: "this calendar month" },
          { label: "Recurring",        value: recurringP,             sub: `of ${activeP} in pipeline` },
          { label: "Avg session rev",  value: money(avgSessionRev),   sub: "per session with bookings" },
          { label: "Total studios",    value: partners.length,        sub: `${recurringP} recurring` },
        ]} />
        <LaneCard lane={b2cLane} metrics={[
          { label: "Revenue MTD",      value: money(b2cRevMTD),       sub: "virtual sessions + packages" },
          { label: "Open pipeline",    value: money(b2cOpenPipeline), sub: `${offers.filter(o=>OPEN_STATUSES.includes(o.status)&&b2cOfferTypes.includes(o.offerType)).length} offers` },
          { label: "Active clients",   value: activeClients,           sub: "engaged + member + advocate" },
          { label: "Avg LTV",          value: money(avgLTV),          sub: "lifetime value" },
          { label: "Referral revenue", value: money(refRevenue),      sub: `${referrals.filter(r=>r.status==="Attended").length} converted` },
          { label: "Total clients",    value: clients.length,         sub: `${clients.filter(c=>c.status==="Lead").length} leads` },
        ]} />
      </div>
    </div>
  );
}

/* ── ALERT ENGINE ── */
const ALERT_SEVERITY = {
  critical: { color: "#C0573F", bg: "#FFF2F0", border: "#F5C4BC", label: "Critical" },
  warning:  { color: "#9B7A2E", bg: "#FFFBF0", border: "#F5E4A8", label: "Warning"  },
  info:     { color: "#2E6FB0", bg: "#F0F6FF", border: "#B8D4F5", label: "Info"     },
};

export function buildAlerts(data, today) {
  const alerts = [];
  const daysAgo  = (d) => (!d) ? 0 : Math.round((new Date(today) - new Date(d)) / 86400000);
  const daysAway = (d) => (!d) ? 999 : Math.round((new Date(d) - new Date(today)) / 86400000);
  const weekAgo  = addDaysISO(today, -7);

  const sessions      = data.sessions      || [];
  const offers        = data.offers        || [];
  const partners      = data.partners      || [];
  const clients       = data.clients       || [];
  const followups     = data.followups     || [];
  const registrations = data.registrations || [];

  // 1 — Expired offers still open
  offers.filter(o => OPEN_STATUSES.includes(o.status) && o.expireDate && o.expireDate < today)
    .forEach(o => {
      const c = clients.find(x => x.id === o.clientId);
      alerts.push({ id: "exp_" + o.id, severity: "critical", category: "revenue",
        title: `Offer expired — ${cleanName(c?.name || o.name)}`,
        detail: `${o.offerType} · ${money(o.price)} · expired ${fmtDate(o.expireDate)}`,
        db: "offers", record: o });
    });

  // 2 — No follow-up sent 24h+ after completed session
  sessions.filter(s => s.status === "Completed" && !s.followUpSent && daysAgo(s.date) >= 1)
    .forEach(s => {
      const d = daysAgo(s.date);
      alerts.push({ id: "nfu_" + s.id, severity: d >= 3 ? "critical" : "warning", category: "revenue",
        title: `No follow-up sent — ${s.name} (${d} day${d !== 1 ? "s" : ""} ago)`,
        detail: `Follow-up window closing · completed ${fmtDate(s.date)}`,
        db: "sessions", record: s });
    });

  // 3 — Session < 72 h away with < 50% registration
  sessions.filter(s => {
    const away = daysAway(s.date);
    const cap  = Number(s.capacity) || 0;
    const reg  = Number(s.registered) || 0;
    return away >= 0 && away <= 3 && cap > 0 && reg / cap < 0.5;
  }).forEach(s => {
    const away = daysAway(s.date);
    const pct  = Math.round((Number(s.registered) / Number(s.capacity)) * 100);
    alerts.push({ id: "reg_" + s.id, severity: pct < 25 ? "critical" : "warning", category: "operational",
      title: `Low registration — ${s.name} (${pct}% full, ${away === 0 ? "today" : `${away}d away`})`,
      detail: `${s.registered}/${s.capacity} registered · promote now`,
      db: "sessions", record: s });
  });

  // 4 — Waivers missing on completed sessions
  sessions.filter(s =>
    ["Completed","Follow-up pending","Closed out"].includes(s.status) &&
    Number(s.attendance) > 0 && Number(s.waivers) < Number(s.attendance)
  ).forEach(s => {
    const missing = Number(s.attendance) - Number(s.waivers);
    alerts.push({ id: "waiv_" + s.id, severity: "warning", category: "operational",
      title: `${missing} waiver${missing !== 1 ? "s" : ""} missing — ${s.name}`,
      detail: `${s.waivers}/${s.attendance} collected · ${fmtDate(s.date)}`,
      db: "sessions", record: s });
  });

  // 5 — Payment not confirmed on completed sessions with revenue
  sessions.filter(s =>
    ["Completed","Closed out","Follow-up pending"].includes(s.status) &&
    !s.paymentConfirmed && Number(s.netRevenue) > 0
  ).forEach(s => {
    alerts.push({ id: "pay_" + s.id, severity: "critical", category: "revenue",
      title: `Payment not confirmed — ${s.name}`,
      detail: `${money(s.netRevenue)} net · ${fmtDate(s.date)}`,
      db: "sessions", record: s });
  });

  // 6 — Offer open > 7 days, no follow-up date set
  offers.filter(o => OPEN_STATUSES.includes(o.status) && daysAgo(o.dateOffered) > 7 && !o.followUpDate)
    .forEach(o => {
      const c = clients.find(x => x.id === o.clientId);
      const d = daysAgo(o.dateOffered);
      alerts.push({ id: "stale_o_" + o.id, severity: "warning", category: "revenue",
        title: `Offer stale ${d} days — ${cleanName(c?.name || o.name)}`,
        detail: `${o.offerType} · ${money(o.price)} · no follow-up scheduled`,
        db: "offers", record: o });
    });

  // 7 — Studio demo done, no proposal > 7 days
  partners.filter(p => p.stage === "Demo completed" && daysAgo(p.lastTouch) > 7)
    .forEach(p => {
      const d = daysAgo(p.lastTouch);
      alerts.push({ id: "demo_" + p.id, severity: "warning", category: "revenue",
        title: `Demo done, no proposal — ${cleanName(p.name)}`,
        detail: `${d} days since last touch · ${p.stage}`,
        db: "partners", record: p });
    });

  // 8 — Room/music setup not started for session < 7 days away (studio sessions only)
  sessions.filter(s => {
    if (sessionIsVirtual(s)) return false;
    const away = daysAway(s.date);
    return away >= 0 && away <= 7 && (s.roomSetupStatus === "Not started" || s.musicSetupStatus === "Not started");
  }).forEach(s => {
    const away = daysAway(s.date);
    const items = [s.roomSetupStatus === "Not started" && "room", s.musicSetupStatus === "Not started" && "music"].filter(Boolean);
    alerts.push({ id: "setup_" + s.id, severity: away <= 2 ? "critical" : "warning", category: "operational",
      title: `Setup not started — ${s.name} (${away === 0 ? "today" : `${away}d away`})`,
      detail: `Pending: ${items.join(", ")} setup`,
      db: "sessions", record: s });
  });

  // 9 — Active partner pipeline with no activity > 14 days
  const inactiveCutoff = ["Lost / not a fit", "Recurring partner", "Target identified", "Researched"];
  partners.filter(p => !inactiveCutoff.includes(p.stage) && daysAgo(p.lastTouch) > 14)
    .forEach(p => {
      const d = daysAgo(p.lastTouch);
      alerts.push({ id: "stale_p_" + p.id, severity: "warning", category: "relationship",
        title: `${cleanName(p.name)} — no activity for ${d} days`,
        detail: `Stage: ${p.stage} · last touch: ${fmtDate(p.lastTouch)}`,
        db: "partners", record: p });
    });

  // 10 — No outreach logged this week
  const hasOutreach = followups.some(f => f.lastContact >= weekAgo) ||
                      partners.some(p => p.lastTouch >= weekAgo);
  if (!hasOutreach) {
    alerts.push({ id: "no_reach", severity: "info", category: "relationship",
      title: "No outreach activity this week",
      detail: "No follow-up or partner contact logged in the last 7 days",
      db: null, record: null });
  }

  // 12 — Breakthrough noted but no testimonial request yet
  const testimonialSessionIds = new Set((data.testimonials || []).map(t => t.sessionId).filter(Boolean));
  sessions.filter(s =>
    s.breakthroughNoted &&
    ["Completed","Follow-up pending","Closed out"].includes(s.status) &&
    !testimonialSessionIds.has(s.id)
  ).forEach(s => {
    const d = daysAgo(s.date);
    alerts.push({ id: "bkt_" + s.id, severity: d > 7 ? "warning" : "info", category: "relationship",
      title: `Testimonial not requested — breakthrough noted at ${s.name}`,
      detail: `Session was ${d} day${d !== 1 ? "s" : ""} ago · window closing`,
      db: "sessions", record: s });
  });

  // 11 — Referral thank-you overdue > 3 days
  (data.referrals || []).filter(r => !r.thankYouSent && r.referrerId && daysAgo(r.date) > 3)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      alerts.push({ id: "rty_" + r.id, severity: "info", category: "relationship",
        title: `Thank-you overdue — ${cleanName(referrer?.name || "referrer")} sent a referral`,
        detail: `Referred ${cleanName(r.referredName)} · ${daysAgo(r.date)} days ago`,
        db: "referrals", record: r });
    });

  // 13 — Active partners missing Studio Partner Agreement PDF
  partners
    .filter((p) => (p.stage === "Recurring partner" || p.stage === "First session scheduled" || p.stage === "Pilot completed") && !partnerHasAgreementPdf(p))
    .forEach((p) => {
      alerts.push({ id: "agr_" + p.id, severity: "critical", category: "operational",
        title: `Studio Partner Agreement missing — ${cleanName(p.name)}`,
        detail: "Please update the studio partner agreement.",
        db: "partners", record: p });
    });

  // 14 — Canceled booking eligible for a Stripe refund, not yet refunded
  registrations
    .filter(r => r.status === "canceled" && !r.stripeRefundId && (Number(r.amountRefunded) || 0) === 0)
    .forEach(r => {
      const elig = refundEligibility(r, data);
      if (!elig.eligible) return;
      const c = clients.find(x => x.id === r.clientId);
      const name = cleanName(c?.name || r.inviteeName || r.name || "");
      alerts.push({
        id: "refund_" + r.id,
        severity: "warning",
        category: "revenue",
        title: `Refund due — ${name}`,
        detail: `${elig.reason}${elig.flag ? " · " + elig.flag : ""} · ${money(elig.amount)}`,
        db: "registrations",
        record: r,
      });
    });

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// Collections that carry a clientId on each record.
const CLIENT_ID_COLLECTIONS = ["registrations", "offers", "followups", "revenue", "testimonials", "payments", "expenses"];

export function findOrphanedGroups(data) {
  const clientIds = new Set((data.clients || []).map(c => c.id));
  const groups = {};
  CLIENT_ID_COLLECTIONS.forEach(col => {
    (data[col] || []).forEach(rec => {
      if (rec.clientId && !clientIds.has(rec.clientId)) {
        if (!groups[rec.clientId]) groups[rec.clientId] = [];
        groups[rec.clientId].push({ col, rec });
      }
    });
  });
  return groups; // { [orphanedClientId]: [{ col, rec }, …] }
}

export function OrphanedRecordsModal({ data, setData, onClose }) {
  const groups = findOrphanedGroups(data);
  const orphanIds = Object.keys(groups);
  // assignments: { [orphanedClientId]: newClientId }
  const [assignments, setAssignments] = useState(() => Object.fromEntries(orphanIds.map(id => [id, ""])));
  const [done, setDone] = useState(false);

  const clientsSorted = [...(data.clients || [])].sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)));

  const assign = (orphanId, newClientId) => setAssignments(p => ({ ...p, [orphanId]: newClientId }));

  const apply = () => {
    setData(prev => {
      let next = { ...prev };
      CLIENT_ID_COLLECTIONS.forEach(col => {
        if (!next[col]) return;
        next[col] = next[col].map(rec => {
          const newId = rec.clientId && assignments[rec.clientId];
          return newId ? { ...rec, clientId: newId } : rec;
        });
      });
      return next;
    });
    setDone(true);
  };

  const colLabel = { registrations: "Booking", offers: "Offer", followups: "Follow-up", revenue: "Revenue row", testimonials: "Testimonial", payments: "Payment", expenses: "Expense" };
  const recSummary = ({ col, rec }) => {
    const parts = [];
    if (rec.eventName) parts.push(rec.eventName);
    if (rec.name) parts.push(cleanName(rec.name));
    if (rec.description) parts.push(rec.description);
    if (rec.date) parts.push(fmtDate(rec.date));
    if (rec.scheduledAt) parts.push(fmtDate(rec.scheduledAt?.slice(0, 10)));
    return `${colLabel[col] || col}${parts.length ? " — " + parts.join(", ") : ""}`;
  };

  const anyAssigned = orphanIds.some(id => assignments[id]);

  const ovl = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  const box = { background: C.surface, borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.18)", width: "100%", maxWidth: 640, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" };
  const hdr = { padding: "20px 24px 16px", borderBottom: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
  const body = { padding: "20px 24px", overflowY: "auto", flex: 1 };
  const ftr = { padding: "14px 24px", borderTop: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "flex-end", gap: 10 };

  return (
    <div style={ovl} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={hdr}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Re-link orphaned records</div>
            <div style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}>
              {orphanIds.length === 0 ? "No orphaned records found." : `${orphanIds.length} deleted client${orphanIds.length !== 1 ? "s" : ""} found with linked records. Assign each group to a new client.`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.ink3, lineHeight: 1 }}>Ã—</button>
        </div>

        <div style={body}>
          {orphanIds.length === 0 && (
            <div style={{ color: C.ink2, fontSize: 14 }}>All records are linked to existing clients. Nothing to fix.</div>
          )}
          {done && (
            <div style={{ background: "#EDF7ED", border: "1px solid #A8D5A8", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#2E6B2E" }}>
              Records re-linked successfully. You can close this panel.
            </div>
          )}
          {orphanIds.map(orphanId => {
            const items = groups[orphanId];
            return (
              <div key={orphanId} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontSize: 11.5, color: C.ink3, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginBottom: 6 }}>
                  Deleted client ID: {orphanId}
                </div>
                <ul style={{ margin: "0 0 10px 16px", padding: 0, fontSize: 13, color: C.ink2 }}>
                  {items.map(({ col, rec }, i) => (
                    <li key={i}>{recSummary({ col, rec })}</li>
                  ))}
                </ul>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 12.5, color: C.ink2, whiteSpace: "nowrap" }}>Assign to:</label>
                  <select
                    value={assignments[orphanId]}
                    onChange={e => assign(orphanId, e.target.value)}
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.surface, color: C.ink }}>
                    <option value="">— select a client —</option>
                    {clientsSorted.map(c => (
                      <option key={c.id} value={c.id}>{cleanName(c.name)}{c.email ? ` (${c.email})` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div style={ftr}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 18px", fontSize: 13.5, cursor: "pointer", color: C.ink2 }}>
            Close
          </button>
          {orphanIds.length > 0 && !done && (
            <button
              onClick={apply}
              disabled={!anyAssigned}
              style={{ background: anyAssigned ? C.brand : C.ink3, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13.5, fontWeight: 600, cursor: anyAssigned ? "pointer" : "default" }}>
              Re-link records
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AlertsPanel({ data, today, onOpen, compact, dismissed: dismissedProp, setDismissed: setDismissedProp }) {
  const [localDismissed, setLocalDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const dismissed    = dismissedProp    ?? localDismissed;
  const setDismissed = setDismissedProp ?? setLocalDismissed;
  const [expanded, setExpanded] = useState(false);

  const alerts  = useMemo(() => buildAlerts(data, today), [data, today]);
  const all     = alerts.filter(a => !dismissed.has(a.id));
  const critical = all.filter(a => a.severity === "critical").length;
  const warning  = all.filter(a => a.severity === "warning").length;
  const SHOW_MAX = expanded ? all.length : (compact ? all.length : 5);
  const shown    = all.slice(0, SHOW_MAX);

  if (all.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", color: "#1E5239" }}>
      <Check size={16} color="#4A8C6F" strokeWidth={1.5} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>All clear — no active alerts</span>
    </div>
  );

  return (
    <div style={compact ? {} : { border: `1px solid ${critical > 0 ? ALERT_SEVERITY.critical.border : ALERT_SEVERITY.warning.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Alert rows */}
      <div style={{ background: compact ? "transparent" : "#fff" }}>
        {shown.map((a, i) => {
          const sv = ALERT_SEVERITY[a.severity];
          const SvIcon = a.severity === "info" ? Info : AlertCircle;
          return (
            <div key={a.id} style={{
              display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 14px",
              borderBottom: i < shown.length - 1 ? `1px solid ${C.lineSoft || C.line}` : "none",
              borderLeft: `3px solid ${sv.color}`,
            }}>
              <SvIcon size={14} color={sv.color} strokeWidth={1.5} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{a.detail}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0, marginTop: 1 }}>
                {a.record && (
                  <button onClick={() => onOpen({ db: a.db, record: a.record })} style={{
                    fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                    background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`,
                  }}>View</button>
                )}
                <button onClick={() => setDismissed(prev => {
                  const next = new Set([...prev, a.id]);
                  try { localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...next])); } catch {}
                  return next;
                })} style={{
                  fontSize: 11.5, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                  background: "transparent", color: C.ink3, border: `1px solid ${C.line}`,
                }} title="Dismiss">Ã—</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / collapse */}
      {!compact && all.length > 5 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          width: "100%", padding: "9px 14px",
          background: critical > 0 ? ALERT_SEVERITY.critical.bg : ALERT_SEVERITY.warning.bg,
          border: "none",
          borderTop: `1px solid ${critical > 0 ? ALERT_SEVERITY.critical.border : ALERT_SEVERITY.warning.border}`,
          cursor: "pointer", fontSize: 12.5, fontWeight: 600,
          color: critical > 0 ? ALERT_SEVERITY.critical.color : ALERT_SEVERITY.warning.color,
          textAlign: "center",
        }}>
          {expanded ? "Show fewer ↑" : `Show ${all.length - 5} more alerts ↓`}
        </button>
      )}
    </div>
  );
}

/* ── PIPELINE SNAPSHOT ── */
export function PipelineSnapshot({ data, today }) {
  const offers        = data.offers   || [];
  const partners      = data.partners || [];
  const sessions      = data.sessions || [];
  const clients       = data.clients  || [];
  const registrations = data.registrations || [];
  const mo            = today.slice(0, 7);
  const sessionRev    = (s) => sessionBookingRevenue(s.id, registrations);

  // Open offer pipeline
  const openOffers      = offers.filter(o => OPEN_STATUSES.includes(o.status));
  const openPipelineVal = openOffers.reduce((a, o) => a + (Number(o.price) || 0), 0);
  // OFFER_PROB stores strings like "70%" — Number("70%") → NaN; parseFloat strips the % correctly.
  const openPipelineWt  = openOffers.reduce((a, o) =>
    a + (Number(o.price) || 0) * ((parseFloat(o.probability) || 50) / 100), 0);

  // Studio pipeline — non-lost partners, sum revenuePotential
  const lostStage       = "Lost / not a fit";
  const studioPartners  = partners.filter(p => p.stage !== lostStage);
  const recurringP      = partners.filter(p => p.stage === "Recurring partner");
  const studioPipeVal   = studioPartners.reduce((a, p) => a + (Number(p.revenuePotential) || 0), 0);
  const partnerConvRate = studioPartners.length > 0
    ? Math.round((recurringP.length / studioPartners.length) * 100) : 0;

  // Expected this month: upcoming sessions (not completed) + weighted open offers
  const preSessions     = sessions.filter(s =>
    sameMonth(s.date, today) && ["Planned","Booking open","Promotion active","Almost full"].includes(s.status));
  const bookedVal       = preSessions.reduce((a, s) => a + sessionRev(s), 0);
  const expected30d     = bookedVal + openPipelineWt;

  // Booked but not delivered
  const bookedNotDel    = preSessions.length;
  const bookedNotDelVal = bookedVal;

  // Delivered but unpaid — completed sessions without paymentConfirmed
  const unpaidSessions  = sessions.filter(s =>
    ["Completed","Follow-up pending","Closed out"].includes(s.status) && !s.paymentConfirmed);
  const unpaidVal       = unpaidSessions.reduce((a, s) => a + sessionRev(s), 0);

  // Offers awaiting response (Sent / Viewed)
  const awaitingOffers  = offers.filter(o => ["Sent", "Viewed"].includes(o.status));
  const awaitingVal     = awaitingOffers.reduce((a, o) => a + (Number(o.price) || 0), 0);

  // Average client value — use lifetimeValue (totalSpend doesn't exist on client schema)
  const payingClients   = clients.filter(c => Number(c.lifetimeValue) > 0);
  const avgClientVal    = payingClients.length > 0
    ? payingClients.reduce((a, c) => a + (Number(c.lifetimeValue) || 0), 0) / payingClients.length : 0;

  // Average session revenue from Calendly booking prices
  const sessionsWithRev = sessions.filter(s => sessionRev(s) > 0);
  const avgSessionRev   = sessionsWithRev.length > 0
    ? sessionsWithRev.reduce((a, s) => a + sessionRev(s), 0) / sessionsWithRev.length : 0;

  const totalPotential  = openPipelineVal + studioPipeVal;

  // Local MTD revenue rows — must not reference LaneSplitPanel's allRevRowsMTD
  // (that was a scope leak from the memoization refactor and blanked the app after unlock).
  const allRevRowsMTD = useMemo(
    () => buildRevenueViewRows(data).filter(r => ((r.bookedAt || r.date) || "").startsWith(mo)),
    [data, mo],
  );
  const opProfitMTD = useMemo(() => {
    // Exclude auto Studio Split / legacy cancellation expenses — refunds are negative revenue rows;
    // calcNet already deducts studioSplit on charge rows.
    const exp = (data.expenses || [])
      .filter(e => (e.date || "").startsWith(mo))
      .filter(e => !(isAutoExpenseRecord(e) && (
        String(e.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)
        || String(e.id || "").startsWith(AUTO_CXL_EXP_ID_PREFIX)
        || e.category === "Refunds & Cancellations"
      )))
      .reduce((s, e) => s + (+e.amount || 0), 0);
    const net = allRevRowsMTD.map(applyStudioSessionSplit(data)).reduce((s, r) => s + calcNet(r), 0);
    return net - exp;
  }, [data.expenses, allRevRowsMTD, data, mo]);

  const tiles = [
    {
      label: "Operating profit MTD",
      value: money(opProfitMTD),
      sub: "net session revenue minus expenses",
      accent: opProfitMTD >= 0 ? "#16A34A" : "#E05454",
      Icon: TrendingUp,
    },
    {
      label: "Expected 30-day revenue",
      value: money(Math.round(expected30d)),
      sub: "upcoming sessions + weighted offers",
      accent: C.gold, Icon: CalendarDays,
    },
    {
      label: "Booked, not delivered",
      value: money(bookedNotDelVal),
      sub: `${bookedNotDel} upcoming session${bookedNotDel !== 1 ? "s" : ""}`,
      accent: C.ink2, Icon: Clock,
    },
    {
      label: "Avg client value",
      value: money(Math.round(avgClientVal)),
      sub: `across ${payingClients.length} paying client${payingClients.length !== 1 ? "s" : ""}`,
      accent: C.brand, Icon: Users,
    },
    {
      label: "Avg session net revenue",
      value: money(Math.round(avgSessionRev)),
      sub: `${sessionsWithRev.length} session${sessionsWithRev.length !== 1 ? "s" : ""} with booking revenue`,
      accent: C.brand, Icon: BarChart2,
    },
    {
      label: "Partner conversion rate",
      value: `${partnerConvRate}%`,
      sub: `${recurringP.length} of ${studioPartners.length} recurring`,
      accent: "#4A8C6F", Icon: Check,
    },
    {
      label: "Open offer pipeline",
      value: money(openPipelineVal),
      sub: `${openOffers.length} offers · ${money(Math.round(openPipelineWt))} weighted`,
      accent: C.brand, Icon: TrendingUp,
    },
    {
      label: "Studio partner pipeline",
      value: money(studioPipeVal),
      sub: `${studioPartners.length} studios active`,
      accent: "#6B5CE7", Icon: Building2,
    },
    {
      label: "Offers awaiting response",
      value: money(awaitingVal),
      sub: `${awaitingOffers.length} offer${awaitingOffers.length !== 1 ? "s" : ""} sent or viewed`,
      accent: C.gold, Icon: Send,
    },
    {
      label: "Expenses MTD",
      value: money((data.expenses||[]).filter(e=>(e.date||"").startsWith(today.slice(0,7))).reduce((s,e)=>s+(+e.amount||0),0)),
      sub: "operating costs this month",
      accent: "#EF4444", Icon: Receipt,
    },
  ];

  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600 }}>Pipeline at a Glance</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: C.ink3, fontWeight: 500 }}>Total potential</span>
        <span style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: C.brand }}>
          {money(totalPotential)}
        </span>
      </div>

      {/* Tile grid */}
      <div style={{ padding: "14px 14px 14px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}
           className="sb-pipeline-grid">
        {tiles.map(({ label, value, sub, accent, Icon }) => (
          <div key={label} style={{
            padding: "13px 14px", borderRadius: 10,
            background: C.surfaceAlt, border: `1px solid ${C.line}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
              <Icon size={12} color={accent} strokeWidth={1.5} />
              <span style={{ fontSize: 11, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, lineHeight: 1.2 }}>
                {label}
              </span>
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 21, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 5, lineHeight: 1.4 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISMISSED_ACTIONS_KEY = "sb:dismissed-actions:v1";

export function ActionEmailModal({ action, data, setData, currentUser, onClose, onSent }) {
  const templates = data.templates || [];
  const clients   = data.clients   || [];
  const partners  = data.partners  || [];
  const suggested = useMemo(() => suggestEmailTemplatesForAction(action, templates), [action, templates]);

  const resolved = useMemo(() => resolveRelationshipActionRecipient(action, data), [action, data]);
  const [template, setTemplate] = useState(() => suggested[0] || templates.find(t => t.channel === "Email") || null);
  const [recipient, setRecipient] = useState(() => resolved?.recipient || null);
  const [recipientSearch, setRecipientSearch] = useState(() => {
    const r = resolved?.recipient;
    if (!r) return "";
    return r._type === "partner" ? (r.contact || r.name || "") : cleanName(r.name || "");
  });
  const initialCompose = (() => {
    const tmpl = suggested[0] || templates.find(t => t.channel === "Email") || null;
    const recip = resolved?.recipient || null;
    if (!tmpl || !recip) return { vars: {}, autoFilledKeys: new Set(), subjectEdit: tmpl?.subject || tmpl?.name || "" };
    const varKeys = extractTemplateVars(tmpl);
    const { vars: v, autoFilledKeys: k } = autoFillTemplateVars(varKeys, recip, recip._type, currentUser);
    return { vars: v, autoFilledKeys: k, subjectEdit: applyTemplateVars(tmpl.subject || tmpl.name, v) };
  })();
  const [vars, setVars] = useState(initialCompose.vars);
  const [autoFilledKeys, setAutoFilledKeys] = useState(initialCompose.autoFilledKeys);
  const [subjectEdit, setSubjectEdit] = useState(initialCompose.subjectEdit);
  const [bodyOverride, setBodyOverride] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const applyTemplateToRecipient = useCallback((tmpl, recip, type) => {
    if (!tmpl || !recip) return;
    const varKeys = extractTemplateVars(tmpl);
    const { vars: filled, autoFilledKeys: filledKeys } = autoFillTemplateVars(varKeys, recip, type, currentUser);
    setVars(filled);
    setAutoFilledKeys(filledKeys);
    setSubjectEdit(applyTemplateVars(tmpl.subject || tmpl.name, filled));
    setBodyOverride(null);
  }, [currentUser]);

  const populatedBody = template ? applyTemplateVars(template.body, vars) : "";

  const manualVars = Object.keys(vars).filter(k => !autoFilledKeys.has(k));

  const recipientResults = useMemo(() => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return [];
    const matchClients  = clients.filter(c => (c.name || "").toLowerCase().includes(q)).slice(0, 6).map(c => ({ ...c, _type: "client" }));
    const matchPartners = partners.filter(p => (p.name || "").toLowerCase().includes(q) || (p.contact || "").toLowerCase().includes(q)).slice(0, 4).map(p => ({ ...p, _type: "partner" }));
    return [...matchClients, ...matchPartners];
  }, [recipientSearch, clients, partners]);

  const selectRecipient = (r) => {
    setRecipient(r);
    setRecipientSearch(r._type === "partner" ? (r.contact || r.name || "") : cleanName(r.name || ""));
    if (template) applyTemplateToRecipient(template, r, r._type);
  };

  const selectTemplate = (tmplId) => {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    setTemplate(tmpl);
    if (recipient) applyTemplateToRecipient(tmpl, recipient, recipient._type);
    else {
      const varKeys = extractTemplateVars(tmpl);
      const emptyVars = Object.fromEntries(varKeys.map(k => [k, ""]));
      setVars(emptyVars);
      setAutoFilledKeys(new Set());
      setSubjectEdit(tmpl.subject || tmpl.name || "");
      setBodyOverride(null);
    }
  };

  const send = async () => {
    if (!template || !recipient?.email || sending) return;
    const finalSubject = subjectEdit || applyTemplateVars(template.subject || template.name, vars);
    const finalBody = bodyOverride ?? populatedBody;
    const leftover = findUnreplacedTemplateTokens(finalSubject, finalBody);
    if (leftover.length) {
      setError(unreplacedTokensMessage(leftover));
      return;
    }
    setSending(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);

    const recipientName = recipient._type === "partner"
      ? (recipient.contact || recipient.name || "")
      : cleanName(recipient.name || "");
    try {
      const logEntry = await sendCrmEmail({
        to: recipient.email, recipientName, recipientType: recipient._type,
        subject: finalSubject, body: finalBody,
        templateId: template.id, templateName: template.name, category: template.category || "",
      });

      setData(d => {
        const slim = slimHistEntry(logEntry);
        let next = { ...d, emailLog: cappedLog(d.emailLog, logEntry) };
        next.templates = (next.templates || []).map(t =>
          t.id === template.id ? { ...t, usageCount: (Number(t.usageCount) || 0) + 1 } : t
        );
        if (recipient._type === "partner") {
          next.partners = (next.partners || []).map(p => p.id === recipient.id
            ? { ...p, lastTouch: today, emailHistory: [...(p.emailHistory || []), slim] }
            : p);
        } else if (recipient._type === "client" && !recipient._pseudo) {
          next.clients = (next.clients || []).map(c => c.id === recipient.id
            ? { ...c, emailHistory: [...(c.emailHistory || []), slim] }
            : c);
        }
        if (action.id.startsWith("rty_")) {
          next.referrals = (next.referrals || []).map(r =>
            r.id === action.record.id ? { ...r, thankYouSent: true } : r
          );
        }
        if (action.id.startsWith("rnc_")) {
          next.referrals = (next.referrals || []).map(r =>
            r.id === action.record.id && r.status === "Referred" ? { ...r, status: "Contacted" } : r
          );
        }
        if (action.id.startsWith("ref_")) {
          next.followups = (next.followups || []).map(f =>
            f.id === action.record.id ? { ...f, lastContact: today, outcome: "Email sent" } : f
          );
        }
        return next;
      });

      setSent(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1500);
    } catch (err) {
      const failEntry = makeEmailFailEntry({ to: recipient?.email, recipientName, recipientType: recipient?._type, subject: finalSubject, body: finalBody, templateId: template?.id, templateName: template?.name, category: template?.category }, err);
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, failEntry) }));
      setError(err.message);
    }
    setSending(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: 720, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
          <Mail size={16} color="#2563EB" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Send email</div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{action.text}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Template picker */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message template</div>
            <select
              value={template?.id || ""}
              onChange={e => selectTemplate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff" }}
            >
              {!template && <option value="">Select a template…</option>}
              {suggested.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
              {templates.filter(t => t.channel === "Email" && !suggested.some(s => s.id === t.id)).length > 0 && (
                <optgroup label="Other templates">
                  {templates.filter(t => t.channel === "Email" && !suggested.some(s => s.id === t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Recipient */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Send to</div>
            <div style={{ position: "relative" }}>
              <Search size={14} color={C.ink3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={recipientSearch}
                onChange={e => { setRecipientSearch(e.target.value); setRecipient(null); }}
                placeholder="Search clients or studio partners…"
                style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff", boxSizing: "border-box" }}
              />
            </div>
            {recipientResults.length > 0 && !recipient && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10, marginTop: 4, overflow: "hidden" }}>
                {recipientResults.map(r => (
                  <div key={r.id} onClick={() => selectRecipient(r)}
                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.lineSoft || C.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: r._type === "partner" ? hexA("#D9892B", 0.15) : hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {r._type === "partner" ? <Building2 size={14} color="#D9892B" /> : <Users size={14} color={C.brand} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r._type === "partner" ? (r.contact || r.name) : cleanName(r.name)}</div>
                      <div style={{ fontSize: 11.5, color: C.ink3 }}>{r.email || "No email on file"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recipient && (
              <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: recipient._type === "partner" ? hexA("#D9892B", 0.1) : hexA(C.brand, 0.1), border: `1px solid ${recipient._type === "partner" ? "#F6D9A8" : hexA(C.brand, 0.3)}`, borderRadius: 20, padding: "4px 10px 4px 8px" }}>
                {recipient._type === "partner" ? <Building2 size={11} color="#D9892B" /> : <Users size={11} color={C.brand} />}
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{recipient._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient.name)}</span>
                <button onClick={() => { setRecipient(null); setRecipientSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, display: "flex" }}><X size={12} /></button>
              </div>
            )}
          </div>

          {manualVars.length > 0 && recipient && (
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#2563EB", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fill in remaining variables</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                {manualVars.map(k => (
                  <div key={k}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#3D2DA0", marginBottom: 3 }}>{`{{${k}}}`}</label>
                    <input
                      value={vars[k] || ""}
                      onChange={e => {
                        const next = { ...vars, [k]: e.target.value };
                        setVars(next);
                        if (template) setSubjectEdit(applyTemplateVars(template.subject || template.name, next));
                        setBodyOverride(null);
                      }}
                      style={{ width: "100%", padding: "6px 9px", borderRadius: 7, border: `1px solid ${C.line}`, fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {template && recipient && (
            <>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</div>
                <input
                  value={subjectEdit}
                  onChange={e => setSubjectEdit(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                  <span>Message — edit before sending</span>
                  {bodyOverride !== null && (
                    <button onClick={() => setBodyOverride(null)} style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Reset to template</button>
                  )}
                </div>
                <textarea
                  value={bodyOverride ?? populatedBody}
                  onChange={e => setBodyOverride(e.target.value)}
                  rows={10}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.7, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.line}`, resize: "vertical", fontFamily: "inherit", outline: "none" }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.line}`, background: C.surfaceAlt }}>
          {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertCircle size={13} /> {error}</div>}
          {!recipient?.email && recipient && (
            <div style={{ fontSize: 12.5, color: "#D9892B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={13} /> No email on file — add one to their record or pick a different recipient.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Cancel</button>
            <button onClick={send} disabled={sending || sent || !template || !recipient?.email}
              style={{ padding: "8px 22px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: sending || sent || !recipient?.email ? "not-allowed" : "pointer", background: sent ? "#4A8C6F" : "#2563EB", color: "#fff", display: "flex", alignItems: "center", gap: 6, opacity: !recipient?.email ? 0.5 : 1 }}>
              {sent ? <><Check size={13} /> Sent!</> : sending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : <><Send size={13} /> Send Email</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Today({ onOpen, onGo }) {
  const { data, derived, today, setData, currentUser, canEdit } = useCrm();
  const [showAll, setShowAll] = useState(null); // null | "revenue" | "relationship" | "operational"
  const [emailAction, setEmailAction] = useState(null);
  const [dismissedActions, setDismissedActions] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ACTIONS_KEY);
      if (!stored) return new Set();
      const { date, ids } = JSON.parse(stored);
      return date === today ? new Set(ids) : new Set(); // reset each day
    } catch { return new Set(); }
  });

  const dismissAction = (id) => setDismissedActions(prev => {
    const next = new Set([...prev, id]);
    try { localStorage.setItem(DISMISSED_ACTIONS_KEY, JSON.stringify({ date: today, ids: [...next] })); } catch {}
    return next;
  });

  const allActions = useMemo(() => buildActions(data, derived, today), [data, derived, today]);
  const actions = allActions.filter(a => !dismissedActions.has(a.id));
  const byCategory = {
    revenue:      actions.filter(a => a.category === "revenue"),
    relationship: actions.filter(a => a.category === "relationship"),
    operational:  actions.filter(a => a.category === "operational"),
  };

  const mtdRevenue = derived.grossRevMTD;
  const activeSeqs   = (data.sequences || []).filter(s => s.status === "active").length;
  const refRevenue   = (data.referrals || []).reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const activeMembers = (data.clients || []).length;

  const d = new Date();
  const greeting = d.getHours() < 12 ? "Good morning" : d.getHours() < 18 ? "Good afternoon" : "Good evening";

  const totalActions = actions.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Hero */}
      <div className="sb-hero">
        <BreathMark size={62} animate />
        <div>
          <div style={{ fontSize: 13, color: C.brand, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
            {fmtDate(today, true)}
          </div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 26, margin: "4px 0 0", fontWeight: 600, letterSpacing: "-0.01em" }}>
            {greeting}. Take one slow breath, then begin.
          </h2>
        </div>
      </div>

      {/* ── NEXT BEST ACTIONS (above stats) ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
            Next Best Actions
          </h3>
          {totalActions > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: URGENCY_DOT.high, color: "#fff", borderRadius: 20, padding: "2px 9px" }}>
              {totalActions} pending
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }} className="sb-nba-grid">
          {Object.entries(CAT_META).map(([cat, meta]) => {
            const all  = byCategory[cat] || [];
            const top3 = all.slice(0, 3);
            const rest = all.length - 3;
            const isExpanded = showAll === cat;
            const shown = isExpanded ? all : top3;
            const { Icon } = meta;

            return (
              <div key={cat} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Column header */}
                <div style={{ padding: "13px 15px 12px", background: meta.bg, borderBottom: `1px solid ${hexA(meta.color, 0.18)}`, display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon size={14} color={meta.color} strokeWidth={1.5} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: meta.text, flex: 1 }}>{meta.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.text, opacity: 0.65 }}>
                    {all.length} action{all.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Action list */}
                <div style={{ flex: 1 }}>
                  {shown.length === 0 ? (
                    <div style={{ padding: "22px 14px", textAlign: "center", color: C.ink3, fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>✓</span>
                      <div style={{ marginTop: 4, fontWeight: 500 }}>All clear</div>
                    </div>
                  ) : shown.map((a, i) => (
                    <div key={a.id} style={{
                        display: "flex", alignItems: "flex-start",
                        borderBottom: i < shown.length - 1 ? `1px solid ${C.lineSoft}` : "none",
                      }}>
                      <button
                        onClick={() => {
                          if (cat === "relationship" && a.record && canEdit) {
                            setEmailAction(a);
                          } else if (a.record) {
                            const target = resolveActionOpen(a, data);
                            if (target) {
                              const nav = NBA_SECTION_FOR_DB[target.db];
                              if (nav) onGo(nav);
                              const actionContact = cat === "revenue" ? resolveActionContact(a, data) : null;
                              onOpen(actionContact ? { ...target, actionContact } : target);
                            }
                          }
                        }}
                        style={{
                          flex: 1, display: "flex", alignItems: "flex-start", gap: 9,
                          padding: "11px 6px 11px 13px",
                          background: "transparent", border: "none",
                          cursor: a.record ? "pointer" : "default", textAlign: "left",
                        }}
                        className={a.record ? "sb-nba-row" : ""}
                      >
                        {/* Urgency dot + number */}
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: URGENCY_DOT[a.urgency],
                          color: "#fff", fontSize: 10, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                        }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.text}</div>
                          {a.sub && <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2, lineHeight: 1.4 }}>{a.sub}</div>}
                        </div>
                        {a.record && <ChevronRight size={13} color={C.ink3} style={{ flexShrink: 0, marginTop: 3 }} />}
                      </button>
                      <button
                        onClick={() => dismissAction(a.id)}
                        title="Dismiss for today"
                        style={{
                          padding: "11px 10px", background: "transparent", border: "none",
                          cursor: "pointer", color: C.ink3, fontSize: 14, lineHeight: 1,
                          flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "center",
                          opacity: 0.5,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                      >Ã—</button>
                    </div>
                  ))}
                </div>

                {/* Footer: expand / collapse */}
                {rest > 0 && !isExpanded && (
                  <button onClick={() => setShowAll(cat)} style={{
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderTop: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
                    fontSize: 12, fontWeight: 600, color: meta.color, textAlign: "center",
                  }}>
                    +{rest} more {meta.label.toLowerCase()} action{rest !== 1 ? "s" : ""}
                  </button>
                )}
                {isExpanded && all.length > 3 && (
                  <button onClick={() => setShowAll(null)} style={{
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderTop: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
                    fontSize: 12, fontWeight: 600, color: C.ink3, textAlign: "center",
                  }}>
                    Show less ↑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {emailAction && canEdit && (
        <ActionEmailModal
          action={emailAction}
          data={data}
          setData={setData}
          currentUser={currentUser}
          onClose={() => setEmailAction(null)}
          onSent={() => dismissAction(emailAction.id)}
        />
      )}

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Gross revenue MTD"  value={money(mtdRevenue)}  hint="virtual + studio session prices this month" onClick={() => onGo("revenue", 1)} />
        <Stat label="Referral revenue"  value={money(refRevenue)}  hint="from all referrals" accent={refRevenue > 0 ? "#4A8C6F" : C.ink3} onClick={() => onGo("referrals")} />
        <Stat label="Active clients"    value={activeMembers}      hint="total clients in system"            onClick={() => onGo("clients")} />
        <Stat label="Active sequences"  value={activeSeqs}         hint="clients in follow-up nurture"       onClick={() => onGo("engine")} />
      </div>

      {/* B2C vs B2B lane split */}
      <LaneSplitPanel data={data} today={today} />

      {/* Pipeline snapshot */}
      <PipelineSnapshot data={data} today={today} />

      {/* Charts */}
      <div className="sb-grid2">
        <Panel title="Revenue trend"><RevenueTrend data={data} /></Panel>
        <Panel title="Clients by source"><SourceBreakdown data={data} /></Panel>
      </div>
    </div>
  );
}

/* ---------- Dashboard charts ---------- */
export function RevenueTrend({ data }) {
  const months = registrationRevenueByMonth(data.registrations);
  (data.offers || []).forEach((o) => { if (o.status === "Accepted" && o.closeDate) { const k = o.closeDate.slice(0, 7); months[k] = (months[k] || 0) + (Number(o.price) || 0); } });
  const keys = Object.keys(months).sort();
  const years = new Set(keys.map((k) => k.slice(0, 4)));
  const rows = keys.map((k) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1] + (years.size > 1 ? " '" + k.slice(2, 4) : ""), value: Math.round(months[k]) }));
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!rows.length) return <Empty pad>No revenue recorded yet.</Empty>;
  return (
    <div style={{ padding: "2px 4px 8px" }}>
      <div style={{ padding: "0 12px 4px" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 600 }}>{money(total)}</span>
        <span style={{ fontSize: 12.5, color: C.ink3, marginLeft: 8 }}>Stripe revenue + closed offers, by booked month</span>
      </div>
      <ResponsiveContainer width="100%" height={208}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sbRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity={0.3} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.ink3 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: C.ink3 }} axisLine={false} tickLine={false} width={46}
            tickFormatter={(v) => (v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v)} />
          <Tooltip formatter={(v) => [money(v), "Session revenue"]} cursor={{ stroke: C.line }}
            contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}
            labelStyle={{ color: C.ink2, fontWeight: 600 }} />
          <Area type="monotone" dataKey="value" stroke={C.brand} strokeWidth={1.5} fill="url(#sbRev)" dot={{ r: 3, fill: C.brand }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SourceBreakdown({ data }) {
  const rows = SOURCE.map((s) => {
    const items = (data.clients || []).filter((c) => c.source === s);
    return { name: s, value: items.length, ltv: items.reduce((a, c) => a + (Number(c.lifetimeValue) || 0), 0), color: SOURCE_COLOR[s] };
  }).filter((r) => r.value > 0);
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <Empty pad>No clients yet.</Empty>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px 12px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 152, height: 152, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v + (v === 1 ? " client" : " clients"), n]}
              contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: C.ink3 }}>clients</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 168, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600 }}>
          <span style={{ width: 9, flexShrink: 0 }} /><span style={{ flex: 1 }}>Source</span><span>Clients</span><span style={{ width: 64, textAlign: "right" }}>LTV</span>
        </div>
        {[...rows].sort((a, b) => b.value - a.value).map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 13.5, color: C.ink2 }}>{r.value}</span>
            <span style={{ fontSize: 12.5, color: C.ink3, width: 64, textAlign: "right" }}>{money(r.ltv)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Revenue This Month — Margin Cards ── */
// "This month" tab. Gross revenue is taken directly from the Stripe amounts stored on
// records in the Revenue table (data.revenue → `gross`), and net revenue = gross − refunds −
// total expenses pulled from the Expense table (data.expenses → `amount`) for the same month.


/* ── Refunds — Revenue tab ── */
// Refund queue + audit trail. "Refunds due" lists canceled bookings that pass the
// refundEligibility policy matrix, each with a one-click (human-approved) Stripe refund.
// "Refund history" lists the auto cancellation expenses tied to an actual Stripe refund.

