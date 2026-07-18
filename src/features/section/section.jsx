import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import Papa from "papaparse";
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
import {
  _c,
  calcNet,
  buildRevenueViewRows,
  openRevenueViewRow,
  calendlyBookingAmount,
  issueStripeRefund,
  studioSessionFinance,
  sessionFinanceFor,
  buildRegistrationRevenueRows,
} from "../../lib/revenue/index.js";
import {
  formatRegistrationDateTime,
  sortRegistrationsBySessionTime,
} from "../../lib/refundPolicy.js";
import { registrationCreatedTimestamp } from "../../lib/stripeMatching.js";
import { parseImportRows } from "../../lib/csvImport.js";
import { canAccessAdminTab } from "../../lib/constants.js";
import { useCrm } from "../../lib/crmContext.jsx";
import { notify } from "../../lib/notify.js";
import { VIEWS } from "../../lib/schema/views.jsx";
import { TableView, RecordTableView } from "../../components/tables.jsx";
import { Empty, Tag, MiniChip, DateChip, Dot } from "../../components/primitives.jsx";
import { ReferralTreeView } from "../referrals";
import { TestimonialLibraryView } from "../testimonials";
import { ContentAnalyticsView } from "../content";
import { WorkflowsView } from "../workflows";
import { TemplateLibraryView, STARTER_CONTENT } from "../templates";
import { OutreachHubView } from "../outreach";
import { RevenueAttributionView, RevenueThisMonthView, OfferConversionView, ExpenseSummaryView, RefundsView } from "../revenue";
import { PaymentReconciliationView } from "../stripe";
import { AdminView, UserManagementView } from "../admin";
const { STATUS, STATUS_COLOR, CLIENT_TYPE, CLIENT_TYPE_COLOR, INTENT_TAGS, TAG_COLOR, STAGE, STAGE_COLOR, STUDIO_TYPE, CLOSE_PROB, CLOSE_PROB_COLOR, CONTRACT_STATUS, REF_STATUS, REF_STATUS_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TMPL_CATEGORY, TMPL_CATEGORY_COLOR, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, REV_CHANNEL, REV_CHANNEL_COLOR, CONTENT_STATUS, CONTENT_STATUS_COLOR, CONTENT_CATEGORY, CONTENT_CAT_COLOR, PLATFORM, PLATFORM_COLOR, SESSION_STATUS, SESSION_STATUS_COLOR, OFFER_STATUS, OFFER_STATUS_COLOR, SOURCE, SOURCE_COLOR, OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, REFERRAL, REFERRAL_COLOR, PARTNER_CHECKLIST } = constants;

export {
  REFUND_POLICY_HOURS,
  registrationSessionTimestamp,
  formatRegistrationDateTime,
  sortRegistrationsBySessionTime,
  evaluateRefundPolicy,
  refundEligibility,
} from "../../lib/refundPolicy.js";

/* ============================================================
   SECTION — layout router for per-database views
   Shared CRM state comes from useCrm(); only nav/layout props remain.
   ============================================================ */
export function Section({ section, view, setView, query, onOpen }) {
  const {
    data, setData, derived, today, canEdit, currentUser, crmSettings,
    secUsers, masterKeyRaw, setSecUsers, setConfirm, saveCrmSettings,
    syncStripe, stripeStatus, refundToken,
  } = useCrm();
  const cfg = useMemo(() => VIEWS[section], [section]);

  // Keep full VIEWS.admin indices stable (session restore / "Back up now" use setView(5)).
  // Filter tab buttons by role; bounce off restricted layouts.
  useEffect(() => {
    if (section !== "admin" || !cfg) return;
    const layout = cfg.views[view]?.layout;
    if (layout && !canAccessAdminTab(layout, currentUser)) {
      const first = cfg.views.findIndex(vv => canAccessAdminTab(vv.layout, currentUser));
      if (first >= 0) setView(first);
    }
  }, [section, view, cfg, currentUser, setView]);

  // Must run before any early return — conditional hooks white-screen the whole app.
  const revenueRows = useMemo(() => buildRevenueViewRows(data), [data]);
  if (!cfg) return null;

  let activeView = Math.min(view, cfg.views.length - 1);
  if (section === "admin") {
    const layout = cfg.views[activeView]?.layout;
    if (layout && !canAccessAdminTab(layout, currentUser)) {
      const first = cfg.views.findIndex(vv => canAccessAdminTab(vv.layout, currentUser));
      if (first >= 0) activeView = first;
    }
  }
  const v = cfg.views[activeView];
  let rows = data[section] || [];
  if (section === "revenue") rows = revenueRows;

  // search — matches a row's own fields PLUS the human names behind its relation ids
  // (client, session, studio/partner), so searching by name works on every list, not just Sessions.
  if (query.trim()) {
    const q = norm(query);
    const clientsById = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
    const sessionsById = Object.fromEntries((data.sessions || []).map(s => [s.id, s]));
    // Sessions list: also match the names of clients who booked each session.
    const sessionClientNames = {};
    if (section === "sessions") {
      (data.registrations || []).forEach(reg => {
        if (!reg.sessionId) return;
        const client = clientsById[reg.clientId];
        if (client) (sessionClientNames[reg.sessionId] ||= []).push(norm(cleanName(client.name)));
      });
    }
    const matches = (r) => {
      if (Object.values(r).some((val) => norm(val).includes(q))) return true;
      const client = r.clientId ? clientsById[r.clientId] : null;
      if (client && (norm(cleanName(client.name)).includes(q) || norm(client.email).includes(q) || norm(client.phone).includes(q))) return true;
      const session = r.sessionId ? sessionsById[r.sessionId] : null;
      if (session && norm(cleanName(session.name)).includes(q)) return true;
      const studioId = r.studioId || r.partnerId;
      if (studioId && norm(cleanName(derived?.partnerName?.[studioId] || "")).includes(q)) return true;
      if (section === "sessions" && (sessionClientNames[r.id] || []).join(" ").includes(q)) return true;
      return false;
    };
    rows = rows.filter(matches);
  }
  const processed = v.run ? v.run(rows, { data, derived, today }) : { rows };

  const handleImportExpenses = !canEdit ? null : (file) => {
    if (file.size > 10 * 1024 * 1024) { notify.error("CSV file must be under 10 MB."); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      error: (err) => { notify.error(`Could not read CSV file: ${err.message || err}`); },
      complete: (res) => {
        if (res.errors.length) {
          const msgs = res.errors.slice(0, 3).map(e => e.message).join("; ");
          notify.warning(`CSV parse warning — some rows may be skipped: ${msgs}`);
        }
        setData((d) => {
          const { rows, skippedDates, skippedDupes } = parseImportRows("expenses", res.data, {
            existing: d.expenses || [],
            idPrefix: "exp",
          });
          const valid = rows.filter((r) => r.date || r.vendor || r.amount);
          if (valid.length > 0) {
            const skipNote = [
              skippedDates ? `${skippedDates} bad date` : "",
              skippedDupes ? `${skippedDupes} duplicate` : "",
            ].filter(Boolean).join(", ");
            setTimeout(() => notify.success(
              `Imported ${valid.length} expense record${valid.length !== 1 ? "s" : ""} successfully.`
              + (skipNote ? ` Skipped ${skipNote}.` : "")
            ), 0);
            return { ...d, expenses: [...(d.expenses || []), ...valid] };
          }
          setTimeout(() => notify.warning(
            skippedDates || skippedDupes
              ? `No new rows imported (${skippedDates} bad date, ${skippedDupes} duplicate). Dates must be YYYY-MM-DD.`
              : "No valid rows found. Check that your CSV headers match the required format."
          ), 0);
          return d;
        });
      },
    });
  };

  return (
    <div>
      {cfg.views.length > 1 && (
        <div className="sb-tabs">
          {cfg.views.map((vv, i) => {
            if (section === "admin" && !canAccessAdminTab(vv.layout, currentUser)) return null;
            return (
              <button key={vv.name} className={"sb-tab" + (i === activeView ? " sb-tab-on" : "")} onClick={() => setView(i)}>{vv.name}</button>
            );
          })}
        </div>
      )}
      {v.layout === "board" && section === "content" && (data.content || []).length === 0 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#166534", marginBottom: 4 }}>No content yet</div>
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
              Load 12 sample posts across Instagram, TikTok, and Email — covering transformations, education, testimonials, FAQs, and more. Use them as a starting point or replace with your own.
            </div>
          </div>
          <button
            onClick={() => {
              const items = STARTER_CONTENT.map(c => ({ ...c, id: uid("ct"), sessionId: "", partnerId: "" }));
              setData(d => ({ ...d, content: [...(d.content || []), ...items] }));
            }}
            style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "10px 20px", cursor: "pointer", flexShrink: 0 }}>
            Load sample content
          </button>
        </div>
      )}
      {v.layout === "board"
        ? <BoardView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} cardKeys={v.card} ctx={{ data, derived, today }} section={section} />
        : v.layout === "partner-pipeline"
        ? <PartnerPipelineView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "session-perf"
        ? <SessionPerfView rows={processed.rows} derived={derived} data={data} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "offer-analytics"
        ? <OfferConversionView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "offers", record: r })} />
        : v.layout === "revenue-analytics"
        ? <RevenueAttributionView data={data} derived={derived} today={today} onOpen={(r) => openRevenueViewRow(r, data, onOpen)} />
        : v.layout === "revenue-analytics-booked"
        ? <RevenueAttributionView data={data} derived={derived} today={today} onOpen={(r) => openRevenueViewRow(r, data, onOpen)} dateMode="booked" />
        : v.layout === "payment-reconciliation"
        ? <PaymentReconciliationView data={data} derived={derived} setData={setData} onOpen={onOpen} syncStripe={syncStripe} stripeStatus={stripeStatus} canEdit={canEdit} query={query} />
        : v.layout === "referral-tree"
        ? <ReferralTreeView data={data} derived={derived} today={today} query={query} onOpen={(r) => onOpen({ db: "referrals", record: r })} />
        : v.layout === "content-analytics"
        ? <ContentAnalyticsView data={data} onOpen={onOpen} />
        : v.layout === "testimonial-library"
        ? <TestimonialLibraryView data={data} query={query} onOpen={onOpen} />
        : v.layout === "template-library"
        ? <TemplateLibraryView data={data} setData={setData} onOpen={onOpen} currentUser={currentUser} query={query} />
        : v.layout === "workflows"
        ? <WorkflowsView data={data} derived={derived} today={today} />
        : v.layout === "user-management"
        ? <UserManagementView currentUser={currentUser} secUsers={secUsers} masterKeyRaw={masterKeyRaw} onUsersUpdated={setSecUsers} onConfirm={setConfirm} crmSettings={crmSettings} apiSessionToken={refundToken} />
        : v.layout === "admin-overview"   ? <AdminView tab="overview"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-schema"     ? <AdminView tab="schema"     data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-integrity"  ? <AdminView tab="integrity"  data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-storage"    ? <AdminView tab="storage"    data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-settings"   ? <AdminView tab="settings"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-journeys"   ? <AdminView tab="journeys"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-email-logs"  ? <AdminView tab="email-logs" data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-reset"      ? <AdminView tab="reset"      data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "expense-summary"  ? <ExpenseSummaryView data={data} today={today} canEdit={canEdit} onOpen={(r) => onOpen({ db: "expenses", record: r })} onImportExpenses={handleImportExpenses} />
        : v.layout === "outreach-hub"
        ? <OutreachHubView rows={processed.rows} data={data} today={today} onOpen={(r) => onOpen({ db: "outreach", record: r })} />
        : v.layout === "calendar"
        ? <CalendarView rows={processed.rows} today={today} derived={derived} data={data} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "record-table"
        ? <RecordTableView records={data[section] || []} columns={v.columns} query={query} section={section} ctx={{ data, derived, today }} onOpen={onOpen} canEdit={canEdit} maxHeight="calc(100vh - 240px)" />
        : v.layout === "revenue-this-month"
        ? <RevenueThisMonthView data={data} today={today} query={query} onOpen={onOpen} canEdit={canEdit} />
        : v.layout === "refunds"
        ? <RefundsView data={data} setData={setData} canEdit={canEdit} setConfirm={setConfirm} onOpen={onOpen} refundToken={refundToken} />
        : <>
          <TableView columns={v.columns} rows={processed.rows} footer={processed.footer} onOpen={(r) => (
              section === "revenue" ? openRevenueViewRow(r, data, onOpen) : onOpen({ db: section, record: r })
            )}             ctx={{ data, derived, today, setData, section, setConfirm, canEdit, refundToken }}
            maxHeight={(section === "registrations" || section === "clients" || section === "revenue" || section === "sessions") ? "calc(100vh - 240px)" : undefined}
            expandRow={v.expandRow ? (r, ctx) => v.expandRow(r, ctx) : undefined} />
          </>}
    </div>
  );
}


/* ============================================================
   PARTNER PIPELINE (14-stage horizontal kanban)
   ============================================================ */
const STAGE_GROUPS = [
  { label: "Prospecting", stages: ["Target identified", "Researched", "Initial outreach sent", "Follow-up needed"], color: "#8AAFD0" },
  { label: "Qualifying", stages: ["Discovery call booked", "Demo session offered", "Demo completed"], color: "#4A90D9" },
  { label: "Closing", stages: ["Pilot proposed", "Agreement sent", "Agreement signed", "First session scheduled"], color: C.brand },
  { label: "Active", stages: ["Pilot completed", "Recurring partner"], color: C.brandDeep },
  { label: "Closed Lost", stages: ["Lost / not a fit"], color: "#9FB2CC" },
];

export function PartnerPipelineView({ groups, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Phase headers */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, overflowX: "auto", paddingBottom: 0 }}>
        {STAGE_GROUPS.map((ph) => (
          <div key={ph.label} style={{
            minWidth: ph.stages.length * 200, flex: `${ph.stages.length} 0 ${ph.stages.length * 200}px`,
            background: hexA(ph.color, 0.12), border: `1px solid ${hexA(ph.color, 0.3)}`,
            borderRadius: "10px 10px 0 0", padding: "8px 14px", marginRight: 2,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: ph.color }}>
              {ph.label}
            </span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {groups.map((g) => {
          const totalPotential = g.cards.reduce((a, r) => a + (Number(r.revenuePotential) || 0), 0);
          return (
            <div key={g.key} style={{ minWidth: 198, width: 198, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              {/* Column head */}
              <div style={{
                padding: "10px 10px 8px",
                background: hexA(g.color, 0.08),
                borderLeft: `3px solid ${g.color}`,
                borderBottom: `1px solid ${C.line}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: g.color === "#9FB2CC" ? C.ink3 : g.color }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: C.ink3, fontWeight: 600, background: C.surface, padding: "1px 6px", borderRadius: 10 }}>{g.cards.length}</span>
                </div>
                {totalPotential > 0 && (
                  <div style={{ fontSize: 10.5, color: C.ink3 }}>{money(totalPotential)} potential</div>
                )}
              </div>

              {/* Cards */}
              <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                {g.cards.length === 0
                  ? <div style={{ border: `1px dashed ${C.line}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", color: C.ink3, fontSize: 12 }}>—</div>
                  : g.cards.map((r) => (
                    <button key={r.id} onClick={() => onOpen(r)} style={{
                      width: "100%", textAlign: "left", background: C.surface,
                      border: `1px solid ${C.line}`, borderLeft: `3px solid ${g.color}`,
                      borderRadius: 9, padding: "10px 10px 8px", cursor: "pointer",
                      transition: "box-shadow .12s, transform .12s",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 14px ${hexA(C.brandDeep, 0.1)}`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{cleanName(r.name)}</div>
                      {r.studioType && <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{fmtStudioType(r.studioType)}{r.location ? ` · ${r.location.split(",")[0]}` : ""}</div>}
                      {r.contact && <div style={{ fontSize: 11.5, color: C.ink2 }}>{r.contact}</div>}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                        {r.closeProbability && r.closeProbability !== "Low" && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                            background: hexA(CLOSE_PROB_COLOR[r.closeProbability], 0.15),
                            color: CLOSE_PROB_COLOR[r.closeProbability] }}>{r.closeProbability}</span>
                        )}
                        {r.revenuePotential > 0 && (
                          <span style={{ fontSize: 10.5, color: C.ink3 }}>{money(r.revenuePotential)}</span>
                        )}
                        {r.nextAction && (
                          <span style={{ fontSize: 10.5, color: r.nextAction <= new Date().toISOString().slice(0,10) ? "#C0573F" : C.ink3 }}>
                            → {fmtDate(r.nextAction)}
                          </span>
                        )}
                      </div>
                      {/* Checklist mini progress */}
                      {(() => {
                        const cl = r.checklist || {};
                        const d = Object.values(cl).filter(Boolean).length;
                        const t = PARTNER_CHECKLIST.length;
                        if (d === 0) return null;
                        const pct = Math.round((d / t) * 100);
                        const col = pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold;
                        return (
                          <div style={{ marginTop: 7 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 9.5, color: C.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>Launch checklist</span>
                              <span style={{ fontSize: 9.5, color: col, fontWeight: 700 }}>{d}/{t}</span>
                            </div>
                            <div style={{ height: 4, background: C.line, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })()}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BOARD
   ============================================================ */
export function BoardView({ groups, onOpen, cardKeys, ctx, section }) {
  return (
    <div className="sb-board">
      {groups.map((g) => (
        <div key={g.key} className="sb-col">
          <div className="sb-colhead">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Dot color={g.color} /> <span style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</span>
            </span>
            <span style={{ color: C.ink3, fontSize: 12 }}>{g.cards.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.cards.length === 0 && <div className="sb-emptycard">—</div>}
            {g.cards.map((r) => (
              <button key={r.id} className="sb-bcard" onClick={() => onOpen(r)} style={{ borderLeft: `3px solid ${g.color}` }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>
                  {section === "offers" || section === "followups" ? clientShort(ctx.derived.clientName[r.clientId] || cleanName(r.name)) : cleanName(r.name)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cardKeys.map((k) => cardChip(k, r, ctx)).filter(Boolean)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
export function cardChip(k, r, ctx) {
  if (k === "clientType" && r.clientType) return <MiniChip key={k} color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3}>{r.clientType}</MiniChip>;
  if (k === "tags" && r.tags && r.tags.length) return (
    <div key={k} style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {r.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: hexA(TAG_COLOR[t] || C.ink3, 0.15), color: TAG_COLOR[t] || C.ink3 }}>{t}</span>)}
      {r.tags.length > 2 && <span style={{ fontSize: 10, color: C.ink3 }}>+{r.tags.length - 2}</span>}
    </div>
  );
  if (k === "nextSession" && r.nextSession) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextSession)}</MiniChip>;
  if (k === "nextAction" && r.nextAction) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextAction)}</MiniChip>;
  if (k === "packageType" && r.packageType && r.packageType !== "None") return <MiniChip key={k}>{r.packageType}</MiniChip>;
  if (k === "referral" && r.referral) return <MiniChip key={k} color={REFERRAL_COLOR[r.referral]}>{r.referral} referral</MiniChip>;
  if (k === "location" && r.location) return <MiniChip key={k}>{r.location.split(",")[0]}</MiniChip>;
  if (k === "contact" && r.contact) return <MiniChip key={k}>{r.contact}</MiniChip>;
  if (k === "studioType" && r.studioType) return <MiniChip key={k}>{fmtStudioType(r.studioType)}</MiniChip>;
  if (k === "closeProbability" && r.closeProbability) return <MiniChip key={k} color={CLOSE_PROB_COLOR[r.closeProbability]}>{r.closeProbability}</MiniChip>;
  if (k === "stage") return null;
  if (k === "clientId") { const n = ctx.derived.clientName[r.clientId]; return n ? <MiniChip key={k}>{clientShort(n)}</MiniChip> : null; }
  if (k === "outcome") return r.outcome ? <MiniChip key={k} color={C.brand}>done</MiniChip> : <MiniChip key={k} color={C.gold}>pending</MiniChip>;
  return null;
}

/* ============================================================
   CALENDAR (month)
   ============================================================ */
export function sessionStartSortKey(session) {
  if (session.date && session.time) {
    const t = Date.parse(`${session.date} ${session.time}`);
    if (!Number.isNaN(t)) return t;
    const t24 = Date.parse(`${session.date}T${session.time.slice(0, 5)}`);
    if (!Number.isNaN(t24)) return t24;
  }
  if (session.date) {
    const t = Date.parse(`${session.date}T23:59:59`);
    if (!Number.isNaN(t)) return t;
  }
  return Number.MAX_SAFE_INTEGER;
}

export function CalendarView({ rows, today, derived, data, onOpen }) {
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [calSearch, setCalSearch] = useState("");
  const [y, m] = cursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay();
  const daysIn = new Date(y, m, 0).getDate();

  // O(1) client lookups while building session→client-names and session→amount maps.
  const clientById = useMemo(
    () => new Map((data?.clients || []).map(c => [c.id, c])),
    [data?.clients],
  );
  // Partner name lookup by lower-cased cleaned name — used by the fallback studio resolver.
  const partnerByName = useMemo(
    () => new Map((data?.partners || []).map(p => [
      (p.name || "").replace(/^sample\s*-\s*/i, "").toLowerCase(), p,
    ])),
    [data?.partners],
  );

  const sessionClientNames = useMemo(() => {
    const map = {};
    const amounts = {};
    (data?.registrations || []).forEach(reg => {
      if (!reg.sessionId) return;
      const client = clientById.get(reg.clientId);
      if (client) (map[reg.sessionId] ||= []).push(cleanName(client.name));
      if (reg.status !== "canceled" && amounts[reg.sessionId] == null) {
        const amt = registrationSessionAmount(reg);
        if (amt != null) amounts[reg.sessionId] = amt;
      }
    });
    return { names: map, amounts };
  }, [data?.registrations, clientById]);
  const sessionClientNamesMap = sessionClientNames.names;
  const sessionAmounts = sessionClientNames.amounts;

  // Filter rows by calendar search (name, studio, journey, client)
  const filteredRows = calSearch.trim()
    ? rows.filter(s => {
        const q = norm(calSearch);
        const studioName = derived.partnerName[s.studioId] ? norm(cleanName(derived.partnerName[s.studioId])) : "";
        const journey    = norm(s.journey || s.name || "");
        const sesName    = norm(s.name || "");
        const clients    = (sessionClientNamesMap[s.id] || []).map(n => norm(n)).join(" ");
        return studioName.includes(q) || journey.includes(q) || sesName.includes(q) || clients.includes(q);
      })
    : rows;

  const byDay = {};
  filteredRows.forEach((s) => { if (s.date && s.date.slice(0, 7) === cursor) (byDay[Number(s.date.slice(8, 10))] ||= []).push(s); });
  Object.values(byDay).forEach((daySessions) => daySessions.sort((a, b) => sessionStartSortKey(a) - sessionStartSortKey(b)));
  const shift = (n) => { let mm = m + n, yy = y; if (mm < 1) { mm = 12; yy--; } if (mm > 12) { mm = 1; yy++; } setCursor(`${yy}-${String(mm).padStart(2, "0")}`); };
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  // sessionClientName: first client name per session (for pill labels)
  const sessionClientName = {};
  Object.entries(sessionClientNamesMap).forEach(([sid, names]) => { sessionClientName[sid] = names[0]; });

  // Resolve the studio partner for a session. Prefer studioId, but fall back to matching a
  // partner by name in the session name / location address when studioId is missing or points
  // to a deleted/re-created partner. Keeps studio bookings styled correctly even when the
  // studioId backfill hasn't run yet. Virtual (zoom/custom or "virtual" in the name) is excluded.
  const looksVirtual = (s) =>
    s.locationType === "zoom" || s.locationType === "custom" || /\b(virtual|zoom|online)\b/i.test(s.name || "");
  // O(k) scan over partner names once per session instead of a fresh .find() call each time.
  const resolveStudioName = (s) => {
    if (s.studioId && derived.partnerName[s.studioId]) return cleanName(derived.partnerName[s.studioId]);
    if (looksVirtual(s)) return "";
    const hay = `${s.name || ""} ${s.locationAddress || ""}`.toLowerCase();
    for (const [pName, p] of partnerByName) {
      if (pName.length > 2 && hay.includes(pName)) return cleanName(p.name);
    }
    return "";
  };
  const isStudio = (s) => !!resolveStudioName(s);

  const spotsLeft = (s) => {
    const cap = Number(s.capacity) || 0;
    const reg = Number(s.registered) || 0;
    if (!cap) return null;
    return Math.max(0, cap - reg);
  };

  const stripStudioPrefix = (label, studioName) => {
    if (!studioName || !label) return label;
    // Remove "Studio Name - " or "Studio Name – " prefix (case-insensitive)
    const escaped = studioName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return label.replace(new RegExp(`^${escaped}\\s*[-–]\\s*`, "i"), "").trim() || label;
  };

  const pillLabel = (s) => {
    const partner = resolveStudioName(s);
    const clientName = sessionClientName[s.id] || "";
    const rawName = cleanName(s.name);
    let journeyLabel = partner
      ? (s.journey || rawName)
      : (rawName.includes(" - ") ? rawName.slice(rawName.indexOf(" - ") + 3) : rawName);
    // Strip the studio name prefix if it leaked into the journey/name field
    if (partner) journeyLabel = stripStudioPrefix(journeyLabel, partner);
    const spots = spotsLeft(s);
    const spotsTag = spots != null ? `${spots} spot${spots !== 1 ? "s" : ""} left` : "";
    const amountTag = sessionAmounts[s.id] != null
      ? (sessionAmounts[s.id] === 0 ? "Free" : money(sessionAmounts[s.id]))
      : "";
    // Studio: Studio · Location · spots left  |  Virtual: Client · Journey · amount
    const parts = partner
      ? [partner, journeyLabel, spotsTag, amountTag]
      : [clientName, journeyLabel, amountTag];
    return parts.filter(Boolean).join(" · ");
  };

  const pillTitle = (s) => {
    const studioName = resolveStudioName(s);
    const isVirtual = !studioName;
    if (isVirtual) {
      const clientName = sessionClientName[s.id] || "";
      const journey = s.journey || cleanName(s.name);
      return [clientName, journey].filter(Boolean).join(" - ");
    }
    const journey = s.journey || cleanName(s.name);
    const spots = spotsLeft(s);
    const spotsInfo = spots != null ? `${spots} of ${s.capacity} spots remaining` : "";
    return [studioName, journey, spotsInfo].filter(Boolean).join(" - ");
  };

  return (
    <div className="sb-card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: 480 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0, gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600 }}>{MONTHS[m - 1]} {y}</div>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 280 }}>
          <Search size={13} color={C.ink3} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={calSearch}
            onChange={e => setCalSearch(e.target.value)}
            placeholder="Search client, studio, journey…"
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: calSearch ? 26 : 10, paddingTop: 6, paddingBottom: 6, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: C.surface, outline: "none" }}
          />
          {calSearch && (
            <button onClick={() => setCalSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: C.ink3, display: "flex", alignItems: "center", gap: 10, marginRight: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: LANE.b2b.color, display: "inline-block" }} />Studio
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, display: "inline-block" }} />Virtual / Private
            </span>
          </span>
          <button className="sb-iconbtn" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <button className="sb-iconbtn" onClick={() => setCursor(today.slice(0, 7))} style={{ width: "auto", padding: "0 12px", fontSize: 13 }}>Today</button>
          <button className="sb-iconbtn" onClick={() => shift(1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Day-of-week labels — fixed row, not part of the stretching grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, flexShrink: 0, marginBottom: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="sb-caldow">{d}</div>
        ))}
      </div>

      {/* Date cells — flex:1 so rows fill remaining height */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", gap: 6, overflow: "hidden" }}>
        {cells.map((d, i) => {
          const iso = d ? `${cursor}-${String(d).padStart(2, "0")}` : null;
          const isToday = iso === today;
          return (
            <div key={i} className="sb-calcell" style={{
              background: d ? (isToday ? C.brandMist : C.surface) : "transparent",
              border: d ? `1px solid ${isToday ? C.brand : C.line}` : "none",
              minHeight: 0,
            }}>
              {d && <div style={{ fontSize: 11, color: isToday ? C.brand : C.ink3, fontWeight: isToday ? 700 : 500, marginBottom: 4 }}>{d}</div>}
              {(byDay[d] || []).map((s) => {
                const studio = isStudio(s);
                const spots = spotsLeft(s);
                const almostFull = spots != null && spots <= 3;
                return (
                  <button key={s.id}
                    onClick={() => onOpen(s)}
                    title={pillTitle(s)}
                    style={{
                      fontSize: 10.5, fontWeight: 600, border: "none", borderRadius: 5,
                      padding: "3px 5px", cursor: "pointer", textAlign: "left",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      width: "100%", display: "block",
                      background: studio ? hexA(LANE.b2b.color, 0.15) : C.brandSoft,
                      color: studio ? LANE.b2b.text : C.brandDeep,
                      borderLeft: studio ? `3px solid ${almostFull ? "#C0573F" : LANE.b2b.color}` : `3px solid ${C.brand}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = studio ? LANE.b2b.color : C.brand; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = studio ? hexA(LANE.b2b.color, 0.15) : C.brandSoft; e.currentTarget.style.color = studio ? LANE.b2b.text : C.brandDeep; }}>
                    {pillLabel(s)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ============================================================
   SESSION PERFORMANCE VIEW (list)
   ============================================================ */
export function SessionPerfView({ rows, derived, data = {}, onOpen }) {
  if (!rows.length) return <Empty pad>No sessions logged yet.</Empty>;

  // Studio sessions derive gross/split/net from actual Stripe revenue Ã— studio share %.
  // Virtual sessions keep their booking-derived figures (no studio split).
  const partnersById = Object.fromEntries((data.partners || []).map((p) => [p.id, p]));
  const revenueRows = buildRegistrationRevenueRows(data);
  const finOf = (r) => r.studioId
    ? studioSessionFinance(r, data, { partnersById, revenueRows })
    : { seatPrice: 0, gross: Number(r.revenue) || 0, studioSplit: 0, net: Number(r.netRevenue) || 0 };

  const allNet = rows.map((r) => finOf(r).net);
  const avgNet = allNet.reduce((a, b) => a + b, 0) / allNet.length;
  const allConv = rows.filter((r) => r.conversion > 0).map((r) => Number(r.conversion));
  const avgConv = allConv.length ? allConv.reduce((a, b) => a + b, 0) / allConv.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Benchmark row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 4 }}>
        {[
          { label: "Sessions", val: rows.length },
          { label: "Total net", val: money(allNet.reduce((a, b) => a + b, 0)) },
          { label: "Avg net/session", val: money(Math.round(avgNet)) },
          { label: "Avg conversion", val: pct(avgConv) },
        ].map(({ label, val }) => (
          <div key={label} className="sb-card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Per-session cards */}
      {rows.map((r) => {
        const fin = finOf(r);
        const gross = fin.gross;
        const split = fin.studioSplit;
        const net = fin.net;
        const seatPrice = fin.seatPrice;
        const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
        const above = net >= avgNet;
        const convColor = r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : r.conversion > 0 ? C.gold : C.ink3;
        const studio = clientShort(derived.partnerName[r.studioId] || "");

        // "Why" analysis
        const insights = [];
        if (r.paidAttendees && r.attendance && r.paidAttendees < r.attendance) insights.push(`${r.attendance - r.paidAttendees} unpaid attendee${r.attendance - r.paidAttendees > 1 ? "s" : ""} — tighten payment flow`);
        if (capUtil !== null && capUtil < 60) insights.push(`Room only ${capUtil}% full — boost pre-session promotion`);
        if (capUtil !== null && capUtil >= 95) insights.push(`Near/at capacity — explore larger room or add date`);
        if (!r.testimonialsCapt || r.testimonialsCapt === 0) insights.push("No testimonials captured — add ask at close");
        if (!r.followUpSent) insights.push("24h follow-up not sent yet");
        if (!r.rebookOfferSent) insights.push("Rebook offer not sent");
        if (r.referralsGenerated === 0) insights.push("No referrals generated — make the ask next time");
        if (r.noShows > 2) insights.push(`${r.noShows} no-shows — consider confirmation texts`);

        return (
          <div key={r.id} className="sb-card" style={{ borderLeft: `4px solid ${above ? "#4A8C6F" : net === 0 ? "#C0573F" : C.gold}`, cursor: "pointer" }}
            onClick={() => onOpen(r)}>
            <div style={{ padding: "14px 16px 12px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cleanName(r.name)}</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{studio} · {fmtDate(r.date)}{r.time ? ` · ${r.time}` : ""} · {r.journey || ""}</div>
                </div>
                <Tag color={SESSION_STATUS_COLOR[r.status] || C.ink3} soft>{r.status || "—"}</Tag>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: insights.length ? 12 : 0 }}>
                {[
                  { label: "In room", val: `${r.attendance || 0}${r.capacity ? `/${r.capacity}` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : null },
                  { label: "Price/seat", val: r.studioId ? money(seatPrice) : "—" },
                  { label: "Gross", val: money(gross) },
                  { label: "Studio split", val: split > 0 ? money(split) : "—", accent: split > 0 ? C.gold : null },
                  { label: "Net profit", val: money(net), accent: above ? "#4A8C6F" : net === 0 ? "#C0573F" : null },
                  { label: "Conversion", val: pct(r.conversion), accent: convColor },
                ].map(({ label, val, accent }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accent || C.ink, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div style={{ background: hexA(C.gold, 0.08), borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: C.gold, marginBottom: 2 }}>What to improve</div>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.ink2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.gold }}>›</span> {ins}
                    </div>
                  ))}
                </div>
              )}
              {insights.length === 0 && r.status === "Closed out" && (
                <div style={{ fontSize: 12, color: "#4A8C6F", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={13} /> Session fully closed out — all post-session items complete.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

