import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, ChevronDown, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
  Zap, Copy, Clock, TrendingUp, BarChart2, AlertCircle, Activity, Send, Info, BellRing, Milestone,
  LogOut, UserCircle, Shield, KeyRound, Receipt, ClipboardList, FileSignature, CalendarCheck, CheckCircle, Save, Scale, Lock,
} from "lucide-react";
import { C, FONT, hexA } from "../../lib/theme.js";
import { uid, todayISO, addDaysISO, addMonthsISO, MONTHS, fmtDate, money, pct, onOrBefore, sameMonth, num, bool, norm, cleanName, preferLongerText, clientShort, sectionLabel, fmtStudioType, isValidISODate } from "../../lib/format.js";
import { getS } from "../../lib/crmSettings.js";
import * as constants from "../../lib/constants.js";
import { SESSION_CHECKLIST, EQUIP_CHECKLIST_PHASES, EQUIP_CHECKLIST, emptyEquipChecklist, VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS, virtualEquipPhaseItems, SESSION_CHECKLIST_PHASES, SESSION_PHASE_COLOR, emptySessionChecklist } from "../../lib/checklists.js";
import { AGREEMENT_BLOB_PREFIX, fetchCalendlyDescriptionForSession, isTruncatedPreview, resolveCalendlyDescription, cancelCalendlyEvent } from "../../lib/api.js";
import { store } from "../../lib/store.js";
import { Sec } from "../../lib/sec.js";
import {
  studioSessionFinance,
  buildRegistrationRevenueRows,
  issueStripeRefund,
  calendlyBookingAmount,
  formatBookingAmount,
  resolveActualBookingAmount,
  formatActualBookingAmount,
} from "../../lib/revenue/index.js";
import { sum } from "../../lib/aggregate.js";
import { FIELDS } from "../../lib/schema/fields.js";
import {
  agreementExt,
  stripAgreementForStore,
  dataForEncryptedStore,
  agreementMimeForExt,
  dataUrlToBytes,
  isPdfBytes,
  isDocxBytes,
  isDocBytes,
  bytesMatchExt,
  agreementRecordIsPdf,
} from "../../lib/agreements.js";
import { notify } from "../../lib/notify.js";
import { BreathMark, Stat, Panel, Row, Dot, Tag, MiniChip, DateChip, Empty } from "../../components/primitives.jsx";
import { CancelCalendlyModal } from "../../components/modals.jsx";
import { PARTNER_CHECKLIST_PHASES, PARTNER_CHECKLIST } from "../../lib/constants.js";
const { STATUS, STATUS_COLOR, CLIENT_TYPE, INTENT_TAGS, TAG_COLOR, STAGE, STAGE_COLOR, STUDIO_TYPE, CLOSE_PROB, CONTRACT_STATUS, SESSION_STATUS, SESSION_STATUS_COLOR, SETUP_STATUS, OFFER_STATUS, OFFER_STATUS_COLOR, SOURCE, REFERRAL, REFERRAL_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, OUTREACH_TARGET_TYPE, OUTREACH_RESPONSE, OUTREACH_PRIORITY, OUTREACH_PRIORITY_COLOR, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TESTIMONIAL_TYPE, TESTIMONIAL_THEMES, TMPL_CATEGORY, TMPL_CATEGORY_COLOR, TMPL_CHANNEL, TMPL_CHANNEL_COLOR, TMPL_LINKED_TO, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, EXPENSE_PAYMENT_METHOD, EXPENSE_RECUR_FREQ, REV_CHANNEL, REV_CHANNEL_COLOR, COST_CENTER, CONTENT_TYPE, PLATFORM, PLATFORM_COLOR, CONTENT_STATUS, CONTENT_STATUS_COLOR, CONTENT_CATEGORY, CONTENT_CAT_COLOR, CONTENT_CTA, FUTYPE, PACKAGE, JOURNEY_TYPES } = constants;

export function resolveDrawerTab(preferred, { db, isNew, hasTimeline, hasSessionTabs, hasChecklist }) {
  if (!preferred || preferred === "details") return "details";
  if (preferred === "timeline" && hasTimeline) return "timeline";
  if (preferred === "checklist" && (hasChecklist || hasSessionTabs)) return "checklist";
  if (hasSessionTabs && ["session-checklist", "bookings", "performance"].includes(preferred)) return preferred;
  return "details";
}

export function RecordDrawer({ db, record, data, derived, today, crmSettings, onClose, onSave, onDelete, onOpenRelated, sequences, onStartSequence, initialTab, setData, cryptoKey, actionContact, onSync, refundToken }) {
  const isNew = !(data[db] || []).some((r) => r.id === record.id);
  const hasTimeline = (db === "clients" || db === "partners") && !isNew;
  const hasChecklist = db === "partners" && !isNew;
  const hasSessionTabs = db === "sessions" && !isNew;
  const tabCtx = { db, isNew, hasTimeline, hasSessionTabs, hasChecklist };
  const pickTab = (t) => resolveDrawerTab(t, tabCtx);

  const [draft, setDraft] = useState(record);
  const [tab, setTab] = useState(() => pickTab(initialTab));
  const [perfSyncing, setPerfSyncing] = useState(false);
  const [showJourneyDesc, setShowJourneyDesc]       = useState(false);
  const [showCalendlyDesc, setShowCalendlyDesc]     = useState(false);
  const [fetchedCalendlyDesc, setFetchedCalendlyDesc] = useState(null); // null = not yet fetched
  const [fetchingCalendlyDesc, setFetchingCalendlyDesc] = useState(false);
  const [calendlyDescFetchError, setCalendlyDescFetchError] = useState("");
  const [showCancelCalendly, setShowCancelCalendly] = useState(false);
  const [cancelCalendlyBusy, setCancelCalendlyBusy] = useState(false);
  // Derived counts computed from live registrations — read-only display values,
  // never written back to draft after the initial open (see reset effect below).
  const isStudioSession = db === "sessions" && !!record.studioId;
  const actualRegistered = isStudioSession
    ? (data.registrations || []).filter(r => r.sessionId === record.id && r.status !== "canceled").length
    : null;
  const actualSessionsAttended = db === "clients"
    ? (data.registrations || []).filter(r => r.clientId === record.id && r.status !== "canceled").length
    : null;

  useEffect(() => {
    // Seed computed-from-registrations fields at open time so the drawer shows
    // accurate counts. NOT in the dep array — we must NOT re-run when registrations
    // change mid-edit or a Calendly sync mid-edit would overwrite what the user typed.
    setDraft({
      ...record,
      ...(isStudioSession && actualRegistered != null ? { registered: actualRegistered } : {}),
      ...(db === "clients" && actualSessionsAttended != null ? { sessionsAttended: actualSessionsAttended } : {}),
    });
    setTab(pickTab(initialTab));
    setShowJourneyDesc(false);
    setShowCalendlyDesc(false);
    setFetchedCalendlyDesc(null);
    setFetchingCalendlyDesc(false);
    setCalendlyDescFetchError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, initialTab, db, isNew]);

  const isVirtualDrawer = db === "sessions" && !record.studioId && (record.locationType === "zoom" || record.locationType === "custom" || !record.locationType);

  // Always fetch the full event-type description when the panel opens.
  useEffect(() => {
    if (!showCalendlyDesc || !isStudioSession) return;
    let cancelled = false;
    setFetchingCalendlyDesc(true);
    setCalendlyDescFetchError("");
    fetchCalendlyDescriptionForSession(draft, data.registrations)
      .then(({ description: desc, error }) => {
        if (cancelled) return;
        setFetchedCalendlyDesc(desc);
        if (error) {
          setCalendlyDescFetchError(error);
          return;
        }
        if (!desc) {
          setCalendlyDescFetchError("Calendly returned no description for this event type");
          return;
        }
        setDraft(d => {
          const merged = resolveCalendlyDescription(d.calendlyDescription, desc);
          return merged === d.calendlyDescription ? d : { ...d, calendlyDescription: merged };
        });
        // NOTE: do NOT call applyCalendlyDescriptionToSessions here — it would
        // persist the description to global data (and trigger a save) while the
        // user still has unsaved edits in the drawer.  The description is merged
        // into draft above and will be persisted when the user clicks Save.
      })
      .catch(err => {
        if (cancelled) return;
        setFetchedCalendlyDesc("");
        setCalendlyDescFetchError(err.message || "Could not load full description from Calendly");
      })
      .finally(() => { if (!cancelled) setFetchingCalendlyDesc(false); });
    return () => { cancelled = true; };
  }, [showCalendlyDesc, isStudioSession, draft.id, draft.calendlyEventUri, draft.calendlyEventTypeUri, draft.journey, draft.name, data.registrations]);

  const fields = FIELDS[db];
  if (!fields) {
    return (
      <div className="sb-drawerwrap" onClick={onClose}>
        <div className="sb-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="sb-drawerhead">
            <span className="sb-eyebrow">Record</span>
            <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="sb-drawerbody"><Empty pad>Unknown record type: {db}</Empty></div>
        </div>
      </div>
    );
  }
  const titleField = fields.find((x) => x.title) || fields[0] || { key: "name", label: "Name" };
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleAgreementsChange = async (nextAgreements) => {
    const prev = draft.agreements || [];
    const removed = prev.filter(a => !nextAgreements.some(n => n.id === a.id));
    set("agreements", nextAgreements);
    if (!cryptoKey) return;
    try {
      for (const a of removed) await deleteAgreementBlob(a.id);
      for (const a of nextAgreements) {
        if (a.dataUrl) await persistAgreementBlob(cryptoKey, a.id, a.dataUrl);
      }
      const stored = stripAgreementForStore(nextAgreements);
      if (setData) {
        setData(prevData => ({
          ...prevData,
          partners: (prevData.partners || []).map(p => p.id === record.id ? { ...p, agreements: stored } : p),
        }));
      }
    } catch (e) {
      console.error("Agreement save failed:", e);
      notify.error("Could not save the agreement file. Try a smaller PDF (under 5 MB) or free up browser storage.");
    }
  };
  // related records (used in details tab)
  const related = [];
  if (db === "clients") {
    related.push({ label: "Offers", items: (data.offers || []).filter((o) => o.clientId === draft.id), dbk: "offers", render: (o) => `${o.offerType} · ${money(o.price)} · ${o.status}` });
    related.push({ label: "Follow-ups", items: (data.followups || []).filter((x) => x.clientId === draft.id), dbk: "followups", render: (x) => `${x.futype} · ${fmtDate(x.nextAction)}${x.outcome ? " · done" : ""}` });
    const acc = derived.acceptedByClient[draft.id] || 0;
    related.unshift({ label: "Accepted offers total", note: money(acc) });
  }
  if (db === "partners") {
    const ses = derived.sessionsByStudio[draft.id] || [];
    related.push({ label: "Sessions", items: ses, dbk: "sessions", render: (s) => `${fmtDate(s.date)} · ${s.attendance} in room · ${money(s.netRevenue)} net` });
    if (ses.length) related.unshift({ label: "Logged", note: `${ses.length} sessions · avg ${Math.round(sum(ses, "attendance") / ses.length)} attending` });
  }
  const isVirtualSession = hasSessionTabs && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);

  return (
    <div className="sb-drawerwrap" onClick={onClose}>
      <div className={"sb-drawer" + (hasTimeline && tab === "timeline" ? " sb-drawer-wide" : "")}
        onClick={(e) => e.stopPropagation()}>

        {/* Accent stripe */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDeep})`, flexShrink: 0 }} />

        <div className="sb-drawerhead">
          <span className="sb-eyebrow">{isNew ? "New" : "Edit"} · {sectionLabel(db)}</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>

        {actionContact?.phone && (
          <div style={{
            padding: "12px 22px", background: C.brandMist, borderBottom: `1px solid ${C.line}`,
            display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: C.brand,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Phone size={16} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {actionContact.name ? `Call ${actionContact.name}` : "Phone"}
              </div>
              <a href={`tel:${String(actionContact.phone).replace(/[^\d+]/g, "")}`}
                style={{ fontSize: 16, fontWeight: 700, color: C.ink, textDecoration: "none", letterSpacing: 0.3 }}>
                {actionContact.phone}
              </a>
            </div>
          </div>
        )}

        {/* Title + tab switcher */}
        <div style={{ padding: "14px 22px 0", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
          {/* Session: show studio + cleaned session name as formatted header */}
          {hasSessionTabs && derived.partnerName[draft.studioId] && (() => {
            const studioName = cleanName(derived.partnerName[draft.studioId]);
            const rawName = cleanName(draft.name || "");
            // Strip known prefixes ("") and date suffixes (" 6/9", " 6/11" etc.)
            const stripped = rawName
              .replace(/^sample\s*[-–]\s*/i, "")
              .replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/i, "")
              .replace(new RegExp(`^${studioName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*`, "i"), "")
              .trim();
            return (
              <div style={{ fontSize: 13, color: C.ink2, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.brand }}>{studioName}</span>
                <span style={{ color: C.ink3 }}>—</span>
                <span>{stripped}</span>
              </div>
            );
          })()}
          <div style={{ marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <input className="sb-titleinput" style={{ width: "100%", paddingRight: (isVirtualDrawer || isStudioSession) ? 32 : undefined }}
                value={draft[titleField.key] || ""} placeholder="Untitled"
                onChange={(e) => set(titleField.key, e.target.value)} />
              {isVirtualDrawer && (
                <button
                  onClick={() => setShowJourneyDesc(d => !d)}
                  title={draft.journey ? `View description for: ${draft.journey}` : "No journey selected"}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: showJourneyDesc ? C.brand : "transparent",
                    border: `1.5px solid ${showJourneyDesc ? C.brand : C.line}`,
                    borderRadius: 6, cursor: "pointer", padding: "2px 6px",
                    color: showJourneyDesc ? "#fff" : C.ink3,
                    fontSize: 12, fontWeight: 700, lineHeight: 1.4, transition: "all 0.15s",
                  }}>
                  {"\u24D8"}
                </button>
              )}
              {isStudioSession && (
                <button
                  onClick={() => setShowCalendlyDesc(d => !d)}
                  title="View studio event description"
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: showCalendlyDesc ? C.brand : "transparent",
                    border: `1.5px solid ${showCalendlyDesc ? C.brand : C.line}`,
                    borderRadius: 6, cursor: "pointer", padding: "2px 6px",
                    color: showCalendlyDesc ? "#fff" : C.ink3,
                    fontSize: 12, fontWeight: 700, lineHeight: 1.4, transition: "all 0.15s",
                  }}>
                  {"\u24D8"}
                </button>
              )}
            </div>
            {isVirtualDrawer && showJourneyDesc && (() => {
              const journeyDescs = (crmSettings?.journeyDescriptions || []);
              // Match by exact name first, then by partial containment to handle
              // Calendly event names like "9D Breathwork Virtual - The Architect Journey"
              // where the journey description is just "The Architect Journey".
              const sessionJourney = (draft.journey || "").toLowerCase();
              const match = journeyDescs.find(j => j.name && j.name.toLowerCase() === sessionJourney)
                || journeyDescs
                    .filter(j => j.name && sessionJourney.includes(j.name.toLowerCase()))
                    .sort((a, b) => b.name.length - a.name.length)[0]; // prefer longest/most-specific match
              return (
                <div style={{
                  marginTop: 8, borderRadius: 12,
                  border: `1px solid ${C.line}`,
                  background: C.surface,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderBottom: `1px solid ${C.line}`,
                    background: hexA(C.brand, 0.06), flexShrink: 0,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>Journey Description</div>
                      {match?.name && <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginTop: 2 }}>{match.name}</div>}
                    </div>
                    <button onClick={() => setShowJourneyDesc(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>
                      &times;
                    </button>
                  </div>
                  <div
                    style={{ ...DESC_PANEL_BODY_STYLE, color: C.ink }}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {match?.description
                      ? match.description
                      : <span style={{ color: C.ink3, fontStyle: "italic" }}>
                          {draft.journey
                            ? `No description has been added for "${match?.name || draft.journey}" yet. Go to Admin \u2192 Journey Descriptions to add one.`
                            : "No journey selected for this session."}
                        </span>
                    }
                  </div>
                </div>
              );
            })()}
          {isStudioSession && showCalendlyDesc && (
            <div style={{
              marginTop: 8, borderRadius: 12,
              border: `1px solid ${C.line}`,
              background: C.surface,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderBottom: `1px solid ${C.line}`,
                background: hexA(C.brand, 0.06), flexShrink: 0,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Studio Event Description
                </div>
                <button onClick={() => setShowCalendlyDesc(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>
                  &times;
                </button>
              </div>
              <div
                style={{ ...DESC_PANEL_BODY_STYLE, color: C.ink }}
                onWheel={(e) => e.stopPropagation()}
              >
                {fetchingCalendlyDesc
                  ? <span style={{ color: C.ink3, fontStyle: "italic" }}>Fetching description from Calendly…</span>
                  : (() => {
                      const stored = String(draft.calendlyDescription || "").trim();
                      const desc = resolveCalendlyDescription(stored, fetchedCalendlyDesc);
                      const showFull = desc && !isTruncatedPreview(desc);
                      if (showFull) return <span style={{ color: C.ink }}>{desc}</span>;
                      if (calendlyDescFetchError) {
                        return (
                          <span style={{ color: "#B4513B", fontStyle: "italic", lineHeight: 1.6 }}>
                            {calendlyDescFetchError}
                            {isTruncatedPreview(stored) && (
                              <span style={{ display: "block", marginTop: 8, color: C.ink3 }}>
                                The stored preview is incomplete. Set CALENDLY_API_TOKEN in backend/.env and restart the backend.
                              </span>
                            )}
                          </span>
                        );
                      }
                      if (fetchedCalendlyDesc === "") {
                        return <span style={{ color: C.ink3, fontStyle: "italic" }}>No description found in Calendly for this event type.</span>;
                      }
                      return <span style={{ color: C.ink3, fontStyle: "italic" }}>Loading description from Calendly…</span>;
                    })()
                }
              </div>
            </div>
          )}
          </div>
          {(hasTimeline || hasSessionTabs) && (
            <div style={{ display: "flex", gap: 2 }}>
              {(hasSessionTabs ? [
                ["details", "Session Details"],
                ["bookings", "Bookings"],
                ["session-checklist", "Session Checklist"],
                ["performance", "Performance"],
              ] : [
                ["details", "Details"],
                ...(db === "clients" && !isNew ? [["sessions-attended", "Sessions Attended"]] : []),
                ...(db === "partners" && !isNew ? [["partner-sessions", "Sessions"]] : []),
                ...(db === "partners" && !isNew ? [["agreements", "Agreements"]] : []),
                ...(hasChecklist ? [["checklist", "Launch Checklist"]] : []),
                ["timeline", "Contact Timeline"],
              ]).map(([t, label]) => {
                const sessionBookings = t === "bookings" ? (data.registrations || []).filter(r => r.sessionId === draft.id && r.status !== "canceled") : null;
                const clientSessionCount = t === "sessions-attended" ? (data.registrations || []).filter(r => r.clientId === draft.id && r.status !== "canceled").length : null;
                const partnerSessionCount = t === "partner-sessions" ? (data.sessions || []).filter(s => s.studioId === draft.id).length : null;
                const isVirtualSession = db === "sessions" && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);
                const activeSessionChecklist = SESSION_CHECKLIST.filter(i => isVirtualSession ? i.virtual : !i.virtual);
                const activeEquipPhases = EQUIP_CHECKLIST_PHASES.map(p => ({ ...p, items: p.items.filter(i => isVirtualSession ? i.virtual : !i.virtual) })).filter(p => p.items.length);
                const activeEquipItems = activeEquipPhases.flatMap(p => p.items);
                const isStudioBookings = t === "bookings" && db === "sessions" && !!draft.studioId;
                const done = (t === "agreements") ? (draft.agreements || []).length
                           : (t === "partner-sessions") ? partnerSessionCount
                           : (t === "sessions-attended") ? clientSessionCount
                           : (t === "checklist" && db === "partners") ? Object.values(draft.checklist || {}).filter(Boolean).length
                           : (t === "session-checklist") ? activeEquipItems.filter(i => draft.equipChecklist?.[i.id]).length + activeSessionChecklist.filter(i => draft.checklist?.[i.id]).length
                           : (t === "bookings") ? sessionBookings.length : null;
                const total = (t === "checklist" && db === "partners") ? PARTNER_CHECKLIST.length
                            : (t === "session-checklist") ? activeEquipItems.length + activeSessionChecklist.length
                            : isStudioBookings ? (Number(draft.capacity) || null)
                            : (t === "bookings") ? (data.registrations || []).filter(r => r.sessionId === draft.id).length : null;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "7px 14px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", background: tab === t ? C.brand : "transparent",
                    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {label}
                    {done != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                        background: done === total ? "#4A8C6F" : tab === t ? "rgba(255,255,255,0.25)" : C.brandSoft,
                        color: done === total ? "#fff" : tab === t ? "#fff" : C.brandDeep,
                      }}>{done}{total != null ? `/${total}` : ""}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sb-drawerbody" style={{ paddingTop: 16 }}>
          {db === "clients" && tab === "sessions-attended"
            ? <ClientSessionsTab record={draft} data={data} onOpenRelated={onOpenRelated} today={today} />
            : db === "partners" && tab === "agreements"
            ? <PartnerAgreementsTab agreements={draft.agreements || []} onChange={handleAgreementsChange} cryptoKey={cryptoKey} partnerName={cleanName(draft.name)} canEdit={!!onSave} />
            : db === "partners" && tab === "partner-sessions"
            ? <PartnerSessionsTab record={draft} data={data} onOpenRelated={onOpenRelated} today={today} />
            : hasTimeline && tab === "timeline"
            ? <ContactTimeline db={db} record={draft} data={data} derived={derived} today={today} onOpenRelated={onOpenRelated} />
            : (hasChecklist || hasSessionTabs) && tab === "checklist"
            ? <PartnerLaunchChecklist checklist={draft.checklist || emptyChecklist()} onChange={(cl) => set("checklist", cl)} partnerName={cleanName(draft.name)} />
            : hasSessionTabs && tab === "bookings"
            ? <SessionBookingsTab record={draft} data={data} onOpenRelated={onOpenRelated} setData={setData} />
            : hasSessionTabs && tab === "session-checklist"
            ? <SessionChecklistPanel
                isVirtual={isVirtualSession}
                equipChecklist={draft.equipChecklist || emptyEquipChecklist()}
                onEquipChange={(cl) => set("equipChecklist", cl)}
                checklist={draft.checklist || emptySessionChecklist()}
                onChecklistChange={(cl) => set("checklist", cl)}
                sessionName={cleanName(draft.name)}
                sessionDate={draft.date}
                status={draft.status}
                sessionAmount={isVirtualSession ? (() => {
                  const reg = (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled");
                  return formatActualBookingAmount(reg, null) ?? formatRegistrationAmount(reg);
                })() : undefined}
              />
            : hasSessionTabs && tab === "performance"
            ? <div>
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 4px 10px" }}>
                  <button
                    onClick={async () => {
                      setPerfSyncing(true);
                      try {
                        // Pull the latest Calendly bookings + Stripe payments.
                        if (onSync) await onSync();
                      } catch { /* sync errors surface via the sidebar sync status */ }
                      // For studio sessions: write the Stripe-computed revenue/split/net back
                      // to the stored session record and the drawer draft so that Session Details
                      // stays consistent with what the Performance tab shows.
                      if (draft.studioId && setData) {
                        let computed = null;
                        setData(prev => {
                          const idx = (prev.sessions || []).findIndex(s => s.id === draft.id);
                          if (idx < 0) return prev;
                          const sess = prev.sessions[idx];
                          const fin = studioSessionFinance(sess, prev, { revenueRows: buildRegistrationRevenueRows(prev) });
                          computed = { revenue: fin.gross, studioSplit: fin.studioSplit, netRevenue: fin.net };
                          // Skip the write when nothing changed to avoid a spurious save.
                          if (Math.abs((Number(sess.revenue) || 0) - fin.gross) < 0.005
                            && Math.abs((Number(sess.studioSplit) || 0) - fin.studioSplit) < 0.005
                            && Math.abs((Number(sess.netRevenue) || 0) - fin.net) < 0.005) {
                            return prev;
                          }
                          const sessions = [...prev.sessions];
                          sessions[idx] = { ...sess, ...computed };
                          return { ...prev, sessions };
                        });
                        // React's functional-update callback runs synchronously, so `computed`
                        // is guaranteed to be set here. Sync it into draft so Session Details
                        // shows the updated figures without the drawer needing to be reopened.
                        if (computed) setDraft(d => ({ ...d, ...computed }));
                      }
                      setPerfSyncing(false);
                    }}
                    disabled={perfSyncing}
                    title="Pull latest Calendly & Stripe data and recalculate"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: perfSyncing ? "#6b7a99" : "#2E6FB0", background: "transparent", border: `1px solid ${perfSyncing ? "#d1d5db" : "#2E6FB0"}`, borderRadius: 8, cursor: perfSyncing ? "default" : "pointer", transition: "all 0.15s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: perfSyncing ? "spin 1s linear infinite" : "none" }}>
                      <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    {perfSyncing ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {/* Render the LIVE stored session (not the drawer's draft snapshot) so every
                    metric — attendance, paid attendees, waivers, revenue — reflects the data
                    that just synced, without requiring the drawer to be closed and reopened. */}
                <SessionPerformance
                  record={(data.sessions || []).find(s => s.id === draft.id) || draft}
                  derived={derived} data={data} />
              </div>
            : (
              <>
                {(() => {
                  const isVirtual = db === "sessions" && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);
                  const isStudioSession = db === "sessions" && !!draft.studioId;
                  const zoomUrl = draft.locationJoinUrl;
                  const virtualHidden = new Set(["studioId", "locationAddress", "equipmentNeeded", "locationType", "locationJoinUrl", "calendlyEventUri", "roomSetupStatus", "musicSetupStatus"]);
                  const studioHidden  = new Set(["studioId", "equipmentNeeded", "capacity", "registered", "notes", "breakthroughNoted", "roomSetupStatus", "musicSetupStatus", "locationJoinUrl", "calendlyEventUri"]);
                  const baseFields = fields.filter((x) => !x.title
                    && !(isVirtual     && virtualHidden.has(x.key))
                    && !(isStudioSession && studioHidden.has(x.key)));
                  const topKeys = isStudioSession
                    ? ["date", "time", "durationMins", "locationAddress"]
                    : ["date", "time", "durationMins"];
                  const virtualOrderFirst = ["date", "time", "durationMins", "notes", "breakthroughNoted", "journey", "status"];
                  const virtualPinned = ["notes", "breakthroughNoted", "journey", "status"];
                  const visibleFields = (isVirtual || isStudioSession)
                    ? [
                        ...baseFields.filter(x => topKeys.includes(x.key)),
                        ...(isVirtual
                          ? [
                              ...baseFields.filter(x => virtualPinned.includes(x.key)).sort((a,b) => virtualOrderFirst.indexOf(a.key) - virtualOrderFirst.indexOf(b.key)),
                              ...baseFields.filter(x => !topKeys.includes(x.key) && !virtualPinned.includes(x.key)),
                            ]
                          : baseFields.filter(x => !topKeys.includes(x.key))
                        ),
                      ]
                    : baseFields;
                  const sessionClient = isVirtual
                    ? (() => {
                        const reg = (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled");
                        return reg ? (data.clients || []).find(c => c.id === reg.clientId) : null;
                      })()
                    : null;
                  const sessionReg = isVirtual
                    ? (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled")
                    : null;
                  const sessionAmountLabel = formatActualBookingAmount(sessionReg, null);
                  const studioColor = LANE.b2b.color;
                  return (
                    <div className="sb-fields">
                      {/* Virtual: show client card */}
                      {isVirtual && sessionClient && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {(sessionClient.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{cleanName(sessionClient.name)}</div>
                            {sessionClient.email && <div style={{ fontSize: 12, color: C.ink3 }}>{sessionClient.email}</div>}
                          </div>
                          {sessionAmountLabel && (
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>Session</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: sessionAmountLabel === "Free" ? C.ink3 : "#4A8C6F" }}>{sessionAmountLabel}</div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Studio: Date + Time + Duration on one line */}
                      {isStudioSession && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
                          {["date","time","durationMins"].map(k => {
                            const fld = fields.find(x => x.key === k);
                            if (!fld) return null;
                            return (
                              <div key={k} style={{ flex: k === "date" ? 2 : 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{fld.label}</div>
                                <input
                                  type={k === "date" ? "date" : "text"}
                                  value={draft[k] || ""}
                                  onChange={e => set(k, k === "durationMins" ? Number(e.target.value) : e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.surface, color: C.ink, outline: "none" }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {visibleFields.map((fld) => {
                        if (isStudioSession && (fld.key === "date" || fld.key === "time" || fld.key === "durationMins")) return null;
                        return (
                        <React.Fragment key={fld.key}>
                          <FieldInput fld={fld} value={draft[fld.key]} onChange={(v) => set(fld.key, v)} data={data} />
                          {isStudioSession && fld.key === "locationAddress" && (() => {
                            const partner = (data.partners || []).find(p => p.id === draft.studioId);
                            const contactCard = partner && (partner.contact || partner.email || partner.phone) ? (
                              <div key="studio-contact" style={{ gridColumn: "1 / -1", background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Studio Contact</div>
                                {partner.contact && <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{partner.contact}{partner.role ? <span style={{ fontWeight: 400, color: C.ink3 }}> · {partner.role}</span> : ""}</div>}
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 2 }}>
                                  {partner.email && <a href={`mailto:${partner.email}`} style={{ fontSize: 12, color: C.brand }}>{partner.email}</a>}
                                  {partner.phone && <span style={{ fontSize: 12, color: C.ink3 }}>{partner.phone}</span>}
                                </div>
                              </div>
                            ) : null;
                            const capacityFld        = fields.find(x => x.key === "capacity");
                            const registeredFld      = fields.find(x => x.key === "registered");
                            const notesFld           = fields.find(x => x.key === "notes");
                            const breakthroughFld    = fields.find(x => x.key === "breakthroughNoted");
                            const roomSetupFld       = fields.find(x => x.key === "roomSetupStatus");
                            const musicSetupFld      = fields.find(x => x.key === "musicSetupStatus");
                            return (
                              <>
                                {contactCard}
                                {registeredFld    && <FieldInput key="reg"   fld={registeredFld}    value={draft.registered}        onChange={v => set("registered", v)}        data={data} />}
                                {capacityFld      && <FieldInput key="cap"   fld={capacityFld}      value={draft.capacity}          onChange={v => set("capacity", v)}          data={data} />}
                                <div key="setup-row" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                                  {[
                                    { label: "Room setup status", key: "roomSetupStatus", val: draft.roomSetupStatus },
                                    { label: "Music/headset status", key: "musicSetupStatus", val: draft.musicSetupStatus },
                                  ].map(({ label, key, val }) => (
                                    <div key={key} style={{ flex: 1 }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                                      <div className="sb-chiprow">
                                        {SETUP_STATUS.map(o => (
                                          <button key={o} className="sb-selchip" onClick={() => set(key, o)}
                                            style={{ background: val === o ? C.brand : C.surface, color: val === o ? "#fff" : C.ink2, borderColor: val === o ? C.brand : C.line }}>
                                            {o}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {notesFld         && <FieldInput key="notes" fld={notesFld}         value={draft.notes}             onChange={v => set("notes", v)}             data={data} />}
                                {breakthroughFld  && <FieldInput key="bk"   fld={breakthroughFld}  value={draft.breakthroughNoted} onChange={v => set("breakthroughNoted", v)} data={data} />}
                              </>
                            );
                          })()}
                          {isVirtual && fld.key === "durationMins" && (
                            <>
                              <div key="zoom-card" style={{ gridColumn: "1 / -1", background: C.brandMist, border: `1px solid ${C.brand}`, borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Zoom / Join Link</div>
                                {zoomUrl && zoomUrl.startsWith("https://") ? (
                                  <a href={zoomUrl} target="_blank" rel="noreferrer noopener"
                                    style={{ fontSize: 13, color: C.brand, fontWeight: 600, wordBreak: "break-all" }}>{zoomUrl}</a>
                                ) : (
                                  <div style={{ fontSize: 13, color: C.ink3 }}>{zoomUrl || "No Zoom link on file"}</div>
                                )}
                              </div>
                              <div key="virtual-setup-row" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                                {[
                                  { label: "Room setup status", key: "roomSetupStatus", val: draft.roomSetupStatus },
                                  { label: "Music/headset status", key: "musicSetupStatus", val: draft.musicSetupStatus },
                                ].map(({ label, key, val }) => (
                                  <div key={key} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                                    <div className="sb-chiprow">
                                      {SETUP_STATUS.map(o => (
                                        <button key={o} className="sb-selchip" onClick={() => set(key, o)}
                                          style={{ background: val === o ? C.brand : C.surface, color: val === o ? "#fff" : C.ink2, borderColor: val === o ? C.brand : C.line }}>
                                          {o}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}

                {related.length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    {related.map((rel, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div className="sb-rellabel"><Link2 size={13} /> {rel.label}{rel.note ? <span style={{ marginLeft: "auto", color: C.brand, fontWeight: 700 }}>{rel.note}</span> : null}</div>
                        {rel.items && (rel.items.length === 0
                          ? <div style={{ fontSize: 12.5, color: C.ink3, padding: "6px 2px" }}>None yet.</div>
                          : rel.items.map((it) => (
                            <button key={it.id} className="sb-relrow" onClick={() => onOpenRelated({ db: rel.dbk, record: it })}>
                              <span style={{ flex: 1, textAlign: "left" }}>{cleanName(it.name)}</span>
                              <span style={{ color: C.ink2, fontSize: 12 }}>{rel.render(it)}</span>
                              <ArrowUpRight size={13} color={C.ink3} />
                            </button>
                          )))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          {/* Email history lives in the Contact Timeline tab for both clients and partners */}
        </div>

        <div className="sb-drawerfoot">
          {!isNew && onDelete && <button className="sb-danger" onClick={() => onDelete(draft.id)}><Trash2 size={15} /> Delete</button>}
          {db === "clients" && !isNew && (() => {
            const activeSeq = (sequences || []).find(s => s.clientId === draft.id && s.status === "active");
            const completed  = (sequences || []).some(s => s.clientId === draft.id && s.status === "completed");
            if (activeSeq) return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.brand, fontWeight: 600 }}>
                <Zap size={13} /> Sequence active · step {activeSeq.steps.filter(s=>s.sent).length}/{activeSeq.steps.length}
              </div>
            );
            return onStartSequence ? (
              <button onClick={() => onStartSequence(draft)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`,
                color: C.brandDeep, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
              }}>
                <Zap size={13} /> {completed ? "Restart Sequence" : "Start Follow-up Sequence"}
              </button>
            ) : null;
          })()}
          <div style={{ flex: 1 }} />
          {db === "sessions" && !isNew && onSave && (() => {
            const linkedRegs = (data.registrations || []).filter(r => r.sessionId === draft.id);
            const eventUri = linkedRegs.find(r => r.calendlyEventUri)?.calendlyEventUri || "";
            if (!eventUri) return null;
            const allCanceled = linkedRegs.length > 0 && linkedRegs.every(r => r.status === "canceled");
            const busy = cancelCalendlyBusy;
            return (
              <button
                type="button"
                disabled={allCanceled || busy}
                title={allCanceled ? "Already canceled" : "Cancel this session in Calendly"}
                onClick={() => setShowCancelCalendly(true)}
                style={{
                  background: allCanceled || busy ? C.ink3 : "#C0573F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: "7px 14px",
                  cursor: allCanceled || busy ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  marginRight: 8,
                }}
              >
                {busy ? "Canceling…" : "Cancel in Calendly"}
              </button>
            );
          })()}
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          {tab !== "timeline" && onSave && <button className="sb-primary" onClick={() => onSave(draft)}>Save</button>}        </div>
      </div>
      {showCancelCalendly && db === "sessions" && onSave && (() => {
        const linkedRegs = (data.registrations || []).filter(r => r.sessionId === draft.id);
        const eventUri = linkedRegs.find(r => r.calendlyEventUri)?.calendlyEventUri || "";
        const activeCount = linkedRegs.filter(r => r.status !== "canceled" && r.status !== "rescheduled").length;
        return (
          <CancelCalendlyModal
            isStudio={!!draft.studioId}
            activeCount={activeCount}
            busy={cancelCalendlyBusy}
            onCancel={() => { if (!cancelCalendlyBusy) setShowCancelCalendly(false); }}
            onConfirm={async (reason) => {
              if (cancelCalendlyBusy) return;
              setCancelCalendlyBusy(true);
              try {
                const result = await cancelCalendlyEvent(eventUri, reason, refundToken);
                if (onSync) await onSync();
                return { ok: true, alreadyCanceled: !!result?.alreadyCanceled };
              } catch (err) {
                const msg = err?.status === 401
                  ? "Your unlock session expired — log out and back in, then retry."
                  : err?.status === 403
                    ? "Edit permission required to cancel sessions in Calendly."
                    : (err?.message || "Cancel failed.");
                throw Object.assign(new Error(msg), { status: err?.status });
              } finally {
                setCancelCalendlyBusy(false);
              }
            }}
          />
        );
      })()}
    </div>
  );
}

/* ============================================================
   SESSION CHECKLIST
   ============================================================ */

// Sort items so critical ones appear first within any section
export function sortCriticalFirst(items, criticalIds) {
  return [...items].sort((a, b) => {
    const aC = criticalIds.includes(a.id) ? 0 : 1;
    const bC = criticalIds.includes(b.id) ? 0 : 1;
    return aC - bC;
  });
}

/* ── SESSION CHECKLIST PANEL (virtual + studio merged) ──────────────────────
   Props identical to the old VirtualSessionChecklist / StudioSessionChecklist;
   the `isVirtual` boolean selects which item set and behaviour to use.
   sessionAmount is only shown for virtual sessions.
   ──────────────────────────────────────────────────────────────────────────── */
export function SessionChecklistPanel({ equipChecklist, onEquipChange, checklist, onChecklistChange, sessionName, sessionDate, status, sessionAmount, isVirtual }) {
  const [showCritical, setShowCritical] = useState(false);
  const toggleEquip = (id) => onEquipChange({ ...equipChecklist, [id]: !equipChecklist[id] });
  const toggleRun   = (id) => onChecklistChange({ ...checklist, [id]: !checklist[id] });

  // Studio has a fixed exclusion list; virtual uses the .virtual flag on each item.
  const studioExcludeIds = isVirtual ? null : new Set([
    "eq_speaker", "eq_space_v", "eq_lighting_v", "promo_sent", "equipment_packed", "audio_tested",
  ]);
  const itemFilter = isVirtual
    ? (i) => i.virtual
    : (i) => !i.virtual && !studioExcludeIds.has(i.id);

  const activeEquipPhases = EQUIP_CHECKLIST_PHASES
    .map(p => ({ ...p, items: p.items.filter(itemFilter) }))
    .filter(p => p.items.length > 0);
  const equipItems = activeEquipPhases.flatMap(p => p.items);
  const runItems   = SESSION_CHECKLIST.filter(itemFilter);

  const equipDone  = equipItems.filter(i => equipChecklist[i.id]).length;
  const runDone    = runItems.filter(i => checklist[i.id]).length;
  const totalDone  = equipDone + runDone;
  const total      = equipItems.length + runItems.length;
  const pct        = total ? Math.round((totalDone / total) * 100) : 0;

  // Virtual only: some equip items are pulled into the merged Pre-Session block.
  const virtualPreSessionEquipIds = isVirtual ? VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS : new Set();

  const criticalIds     = isVirtual
    ? ["eq_zoom_tested", "eq_headset_v", "eq_do_not_disturb", "eq_contraindication"]
    : ["eq_headsets", "eq_backup_headset", "eq_playlist", "eq_waiver_qr", "eq_emergency", "eq_contraindication"];
  const criticalMissing = criticalIds.filter(id => !equipChecklist[id]);
  const isCompleted     = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  const renderItem = (item, checked, onToggle, color, isCritical, disabled) => (
    <button key={item.id} onClick={() => !disabled && onToggle(item.id)} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      background: checked ? hexA(color, 0.07) : "transparent",
      border: "none", borderRadius: 8, padding: "9px 10px",
      cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, transition: "all .12s",
        border: `2px solid ${checked ? color : isCritical && !checked ? "#D9892B" : C.line}`,
        background: checked ? color : C.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <Check size={12} color="#fff" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 13.5, flex: 1, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
        {item.label}
      </span>
      {isCritical && !checked && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.12), borderRadius: 4, padding: "1px 6px" }}>CRITICAL</span>
      )}
    </button>
  );

  const renderPhaseHeader = (label, phColor, done, phTotal, extra) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: hexA(phColor, 0.07) }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: phColor, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: phColor, flex: 1 }}>{label}</span>
      {extra}
      {done === phTotal
        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#4A8C6F" }}>✓ All done</span>
        : <span style={{ fontSize: 11, color: C.ink3 }}>{done}/{phTotal}</span>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress header with critical badge */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — {isVirtual ? "Virtual" : "Studio"} Setup</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {sessionDate ? `Session: ${sessionDate}  ·  ` : ""}{totalDone} of {total} items complete
            </div>
            {criticalMissing.length > 0 && (
              <button onClick={() => setShowCritical(v => !v)} style={{
                marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                background: showCritical ? "#D9892B" : hexA("#D9892B", 0.12),
                border: `1px solid ${hexA("#D9892B", 0.4)}`,
                borderRadius: 20, padding: "3px 10px", cursor: "pointer",
                fontSize: 11.5, fontWeight: 700, color: showCritical ? "#fff" : "#9A5D10",
                transition: "all .15s",
              }}>
                ⚠️ {criticalMissing.length} critical item{criticalMissing.length > 1 ? "s" : ""} not checked
                <span style={{ fontSize: 10 }}>{showCritical ? "▲" : "▼"}</span>
              </button>
            )}
          </div>
          {sessionAmount && (
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>Session</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: sessionAmount === "Free" ? C.ink3 : "#4A8C6F" }}>{sessionAmount}</div>
            </div>
          )}
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold, marginLeft: 12 }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold }} />
        </div>
        {showCritical && criticalMissing.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${hexA("#D9892B", 0.25)}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {criticalMissing.map(id => {
                const item = equipItems.find(i => i.id === id);
                return item ? <span key={id} style={{ fontSize: 11.5, background: "#fff", border: `1px solid ${hexA("#D9892B", 0.4)}`, borderRadius: 6, padding: "3px 10px", color: "#9A5D10", fontWeight: 600 }}>{item.label}</span> : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Equipment phases — except Safety & Facilitation and items moved to Pre-Session */}
      {activeEquipPhases
        .filter(p => p.id !== "safety")
        .map(phase => ({ ...phase, items: phase.items.filter(i => !virtualPreSessionEquipIds.has(i.id)) }))
        .filter(phase => phase.items.length > 0)
        .map(phase => {
          const phaseDone = phase.items.filter(i => equipChecklist[i.id]).length;
          return (
            <div key={phase.id}>
              {renderPhaseHeader(phase.label, phase.color, phaseDone, phase.items.length, null)}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {sortCriticalFirst(phase.items, criticalIds).map(item => renderItem(item, !!equipChecklist[item.id], toggleEquip, phase.color, criticalIds.includes(item.id), false))}
              </div>
            </div>
          );
        })}

      {/* Pre-Session — run items + moved equip items + Safety & Facilitation merged */}
      {(() => {
        const safetyPhase = activeEquipPhases.find(p => p.id === "safety");
        const safetyItems = safetyPhase ? safetyPhase.items : [];
        const movedEquipItems = equipItems.filter(i => virtualPreSessionEquipIds.has(i.id));
        const preItems = runItems.filter(i => i.phase === "Pre-Session");
        const allPreItems = [...preItems, ...movedEquipItems, ...safetyItems];
        if (!allPreItems.length) return null;
        const phColor = SESSION_PHASE_COLOR["Pre-Session"];
        const done = preItems.filter(i => checklist[i.id]).length
                   + movedEquipItems.filter(i => equipChecklist[i.id]).length
                   + safetyItems.filter(i => equipChecklist[i.id]).length;
        const allSorted = sortCriticalFirst(
          [
            ...preItems.map(i => ({ ...i, _src: "run" })),
            ...movedEquipItems.map(i => ({ ...i, _src: "equip" })),
            ...safetyItems.map(i => ({ ...i, _src: "equip" })),
          ],
          criticalIds
        );
        return (
          <div>
            {renderPhaseHeader("Pre-Session", phColor, done, allPreItems.length, null)}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {allSorted.map(item =>
                item._src === "run"
                  ? renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), false)
                  : renderItem(item, !!equipChecklist[item.id], toggleEquip, phColor, criticalIds.includes(item.id), false)
              )}
            </div>
          </div>
        );
      })()}

      {/* Post-Session */}
      {(() => {
        const items = sortCriticalFirst(runItems.filter(i => i.phase === "Post-Session"), criticalIds);
        if (!items.length) return null;
        const phaseDone = items.filter(i => checklist[i.id]).length;
        const phColor = SESSION_PHASE_COLOR["Post-Session"];
        const disabled = !isCompleted;
        return (
          <div style={{ opacity: disabled ? 0.55 : 1 }}>
            {renderPhaseHeader("Post-Session", phColor, phaseDone, items.length,
              disabled ? <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span> : null
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map(item => renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), disabled))}
            </div>
          </div>
        );
      })()}

      {pct === 100 && (
        <div style={{ background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}><CheckCircle size={28} color="#4A8C6F" strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D6A50" }}>You're fully set up</div>
          <div style={{ fontSize: 12, color: "#4A8C6F", marginTop: 3 }}>All setup and session items confirmed. Go hold space. 🌿</div>
        </div>
      )}
    </div>
  );
}

export function ClientSessionsTab({ record, data, onOpenRelated, today }) {
  const registrations = (data.registrations || [])
    .filter(r => r.clientId === record.id && r.status !== "canceled")
    .sort((a, b) => (b.date || b.sessionDate || "").localeCompare(a.date || a.sessionDate || ""));

  const sessions = registrations.map(reg => {
    const session = (data.sessions || []).find(s => s.id === reg.sessionId);
    return { reg, session };
  }).filter(({ session }) => session);

  const STATUS_COLOR = { Completed: "#4A8C6F", Planned: C.brand, "Booking open": C.brand, "Follow-up pending": C.gold, Canceled: "#C0573F" };

  // Recognised revenue per booking — actual Stripe charge only (matches LTV and the Revenue tab).
  const sessionRevenue = ({ reg }) => registrationPaymentForLtv(reg);
  const totalRevenue = sessions.reduce((sum, s) => sum + sessionRevenue(s), 0);

  if (!sessions.length) {
    return <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13 }}>No sessions found for this client.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Summary row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.ink3 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(totalRevenue)} total revenue</span>
      </div>
      {sessions.map((item) => {
        const { reg, session } = item;
        const isVirtual = !session.studioId && (session.locationType === "zoom" || session.locationType === "custom" || !session.locationType);
        const partner = session.studioId ? (data.partners || []).find(p => p.id === session.studioId) : null;
        const statusColor = STATUS_COLOR[session.status] || C.ink3;
        const rev = sessionRevenue(item);
        return (
          <button key={session.id} onClick={() => onOpenRelated({ db: "sessions", record: session })}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}
            className="sb-relrow">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: isVirtual ? C.brand : LANE.b2b.color, flexShrink: 0, marginTop: 3 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cleanName(session.name)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                {session.date && <span style={{ fontSize: 12, color: C.ink3 }}>{fmtDate(session.date)}{session.time ? ` · ${session.time}` : ""}</span>}
                {session.durationMins ? <span style={{ fontSize: 12, color: C.ink3 }}>{session.durationMins} min</span> : null}
                {partner && <span style={{ fontSize: 12, color: LANE.b2b.color, fontWeight: 600 }}>{cleanName(partner.name)}</span>}
                {session.journey && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: hexA(C.brand, 0.1), color: C.brand, fontWeight: 600 }}>{session.journey}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: rev > 0 ? "#4A8C6F" : C.ink3 }}>{rev > 0 ? money(rev) : "Free"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: hexA(statusColor, 0.12), color: statusColor }}>
                {session.status || "Planned"}
              </span>
              {session.breakthroughNoted && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4A8C6F", padding: "1px 6px", borderRadius: 8, background: hexA("#4A8C6F", 0.1) }}>Breakthrough</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export {
  agreementExt,
  stripAgreementForStore,
  dataForEncryptedStore,
  agreementMimeForExt,
  dataUrlToBytes,
  isPdfBytes,
  isDocxBytes,
  isDocBytes,
  bytesMatchExt,
  agreementRecordIsPdf,
};

async function persistAgreementBlob(cryptoKey, agreementId, dataUrl) {
  if (!cryptoKey || !agreementId || !dataUrl) return;
  const enc = await Sec.encrypt({ dataUrl }, cryptoKey);
  await store.set(AGREEMENT_BLOB_PREFIX + agreementId, enc);
}

async function loadAgreementBlob(cryptoKey, agreementId) {
  if (!cryptoKey || !agreementId) return null;
  try {
    const raw = await store.get(AGREEMENT_BLOB_PREFIX + agreementId);
    if (!raw?.value) return null;
    const dec = await Sec.decrypt(raw.value, cryptoKey);
    return dec?.dataUrl || null;
  } catch { return null; }
}

async function deleteAgreementBlob(agreementId) {
  if (!agreementId) return;
  await store.remove(AGREEMENT_BLOB_PREFIX + agreementId);
}

async function persistAllAgreementBlobs(data, cryptoKey) {
  for (const p of data.partners || []) {
    for (const a of p.agreements || []) {
      if (a.dataUrl) await persistAgreementBlob(cryptoKey, a.id, a.dataUrl);
    }
  }
}

async function validateAgreementUpload(file) {
  const ext = agreementExt(file.name);
  if (!ext) return { ok: false, error: "Only PDF or Word documents (.pdf, .doc, .docx) are allowed." };

  const expectedMime = agreementMimeForExt(ext);
  const allowedMimes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-word",
    "application/octet-stream",
  ]);
  if (file.type && !allowedMimes.has(file.type)) {
    return { ok: false, error: "File type is not allowed." };
  }

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "Could not read file. Please try again." };
  }

  if (!bytesMatchExt(bytes, ext)) {
    return { ok: false, error: `File content does not match a valid .${ext} document.` };
  }

  if (file.type && file.type !== "application/octet-stream" && file.type !== expectedMime) {
    return { ok: false, error: "File type does not match the file extension." };
  }

  return { ok: true, ext, mime: expectedMime };
}

export function openAgreementFile(a, cryptoKey) {
  const openWithDataUrl = (dataUrl) => {
    if (!dataUrl) { notify.error("Could not read this file."); return; }
    const ext = agreementExt(a.name);
    const bytes = dataUrlToBytes(dataUrl);
    if (!bytes) { notify.error("Could not read this file."); return; }
    if (!bytesMatchExt(bytes, ext)) {
      notify.error("This file failed a safety check and cannot be opened.");
      return;
    }

    const blob = new Blob([bytes], { type: agreementMimeForExt(ext) || "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    if (ext === "pdf") {
      // No features string: "noreferrer" implies noopener and makes window.open
      // return null (false "Pop-up blocked"). Sever opener manually instead.
      const w = window.open(url, "_blank");
      if (!w) {
        URL.revokeObjectURL(url);
        notify.warning("Pop-up blocked. Please allow pop-ups to view this PDF.");
        return;
      }
      try { w.opener = null; } catch (_) {}
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = a.name || `agreement.${ext}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  };

  if (a.dataUrl) {
    openWithDataUrl(a.dataUrl);
    return;
  }
  if (!cryptoKey || !a.id) {
    notify.error("Could not read this file.");
    return;
  }
  loadAgreementBlob(cryptoKey, a.id).then(openWithDataUrl);
}

export function PartnerAgreementsTab({ agreements, onChange, cryptoKey, partnerName, canEdit = true }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [savedMsg, setSavedMsg]   = useState("");

  const MAX_FILE_MB = 5;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    setError("");
    setUploading(true);
    const check = await validateAgreementUpload(file);
    if (!check.ok) {
      setError(check.error);
      setUploading(false);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { setError("Could not read file. Please try again."); setUploading(false); };
    reader.onload = async (ev) => {
      const next = [...agreements, {
        id:         `agr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name:       file.name,
        size:       file.size,
        type:       check.mime,
        uploadedAt: new Date().toISOString(),
        isPdf:      check.ext === "pdf",
        dataUrl:    ev.target.result,
      }];
      try {
        await onChange(next);
        setSavedMsg("Agreement saved.");
        setTimeout(() => setSavedMsg(""), 3000);
      } catch {
        setError("Could not save the agreement. Please try again.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const remove = async (id) => {
    try {
      await onChange(agreements.filter(a => a.id !== id));
    } catch {
      setError("Could not remove the agreement. Please try again.");
    }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Upload button */}
      {canEdit && (
      <div style={{ paddingTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={handleUpload} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
          borderRadius: 9, border: "none", cursor: uploading ? "wait" : "pointer",
          background: C.brand, color: "#fff", fontSize: 13, fontWeight: 700,
        }}>
          <Upload size={14} /> {uploading ? "Uploading…" : "Upload Agreement"}
        </button>
        <span style={{ fontSize: 11.5, color: C.ink3 }}>PDF or Word only (.pdf, .doc, .docx) · max {MAX_FILE_MB} MB</span>
      </div>
      )}

      {error && (
        <div style={{ fontSize: 12.5, color: "#C0392B", background: hexA("#C0392B", 0.07), border: `1px solid ${hexA("#C0392B", 0.2)}`, borderRadius: 8, padding: "8px 12px" }}>
          {error}
        </div>
      )}
      {savedMsg && (
        <div style={{ fontSize: 12.5, color: "#4A8C6F", background: hexA("#4A8C6F", 0.08), border: `1px solid ${hexA("#4A8C6F", 0.25)}`, borderRadius: 8, padding: "8px 12px" }}>
          {savedMsg}
        </div>
      )}

      {/* Agreement list */}
      {agreements.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13.5 }}>
          <FileSignature size={32} color={C.line} style={{ display: "block", margin: "0 auto 10px" }} />
          No agreements uploaded yet for {partnerName}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agreements.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: C.surfaceAlt, border: `1px solid ${C.line}`,
              borderRadius: 10, padding: "11px 14px",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: hexA("#C0392B", 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileSignature size={17} color="#C0392B" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>
                  {fmtSize(a.size)} · Uploaded {a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <button onClick={() => openAgreementFile(a, cryptoKey)} title="Open file" style={{
                background: "#EBF3FF", border: "1px solid #BFDBFE", color: "#2563EB",
                borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}>
                <Download size={12} /> Open
              </button>
              {canEdit && (
              <button onClick={() => remove(a.id)} title="Remove" style={{
                background: "none", border: "none", cursor: "pointer", color: C.ink3,
                padding: 6, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center",
              }}>
                <Trash2 size={15} />
              </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>
        Agreements save automatically when uploaded. File bytes are kept in separate encrypted storage so large PDFs persist reliably.
      </div>
    </div>
  );
}

export function PartnerSessionsTab({ record, data, onOpenRelated, today }) {
  const sessions = (data.sessions || [])
    .filter(s => s.studioId === record.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Studio finance per session: actual Stripe revenue received Ã— this studio's share %.
  const partnersById = { [record.id]: record };
  const revenueRows = buildRegistrationRevenueRows(data);
  const finBySession = Object.fromEntries(sessions.map(s => [s.id, studioSessionFinance(s, data, { partnersById, revenueRows })]));
  const totalGross = sessions.reduce((s, x) => s + finBySession[x.id].gross, 0);
  const totalSplit = sessions.reduce((s, x) => s + finBySession[x.id].studioSplit, 0);
  const totalNet   = sessions.reduce((s, x) => s + finBySession[x.id].net, 0);

  if (!sessions.length) {
    return <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13 }}>No sessions logged for this studio yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Totals summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
        {[
          { label: "Total Gross", val: money(totalGross), color: C.ink },
          { label: "Studio Split", val: money(totalSplit), color: C.gold },
          { label: "Total Net", val: money(totalNet), color: "#4A8C6F" },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.ink3, marginBottom: 2 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>

      {sessions.map(s => {
        const fin   = finBySession[s.id];
        const net   = fin.net;
        const gross = fin.gross;
        const split = fin.studioSplit;
        const isPast = s.date && s.date < today;
        const statusColor = SESSION_STATUS_COLOR[s.status] || C.ink3;
        return (
          <button key={s.id} onClick={() => onOpenRelated({ db: "sessions", record: s })}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}
            className="sb-relrow">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cleanName(s.name)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                {s.date && <span style={{ fontSize: 12, color: C.ink3 }}>{fmtDate(s.date)}{s.time ? ` · ${s.time}` : ""}</span>}
                {s.attendance != null && <span style={{ fontSize: 12, color: C.ink3 }}>{s.attendance} attended</span>}
                {s.journey && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: hexA(C.brand, 0.1), color: C.brand, fontWeight: 600 }}>{s.journey}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
              {gross > 0 && <span style={{ fontSize: 12, color: C.ink3 }}>Gross: {money(gross)}</span>}
              {split > 0 && <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Split: {money(split)}</span>}
              {net > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(net)} net</span>}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: hexA(statusColor, 0.12), color: statusColor }}>
                {s.status || "Planned"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function SessionBookingsTab({ record, data, onOpenRelated, setData }) {
  const allRegistrations = (data.registrations || []).filter(r => r.sessionId === record.id);
  // Only active bookings occupy a spot. Canceled/rescheduled bookings are removed from this tab
  // (they free up capacity) and remain visible on the Cancellations and Reschedules tab.
  const registrations = allRegistrations.filter(r => r.status !== "canceled" && r.status !== "rescheduled");
  const sessionListPrice = resolveSessionListPrice(data.registrations, record.id);
  const REG_STATUS_COLOR = { booked: C.brand, attended: "#4A8C6F", canceled: "#C0573F", rescheduled: C.gold, no_show: "#8A96AC" };

  useEffect(() => {
    if (!setData) return;
    backfillRegistrationPaymentsForRegs(registrations, setData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id, setData]);

  const studio = (data.partners || []).find(p => p.id === record.studioId);

  const downloadParticipantList = () => {
    const esc = (v) => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    const studioName = esc(studio?.name || "—");
    const sessionName = esc(record.name || "Session");
    const sessionDate = esc(record.date ? fmtDate(record.date) : "—");
    const sessionTime = esc(record.time || "—");

    const active = registrations.filter(r => r.status !== "canceled");

    const rows = active.map((reg, i) => {
      const client = (data.clients || []).find(c => c.id === reg.clientId);
      const name   = esc(cleanName(client?.name || reg.name || "Unknown"));
      const email  = esc(client?.email || "—");
      const phone  = esc(client?.phone || "—");
      const status = esc(reg.status || "—");
      const amount = esc(formatActualBookingAmount(reg, sessionListPrice) || "—");
      const waiver = reg.waiverStatus === "signed" ? "✓ Signed" : "Pending";
      const paid   = reg.paymentStatus === "paid" ? "✓ Paid" : reg.paymentStatus === "unpaid" ? "Unpaid" : "—";
      const rowBg  = i % 2 === 0 ? "#ffffff" : "#f8f9fc";
      return `<tr style="background:${rowBg}">
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${i + 1}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;font-weight:600">${name}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${email}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${phone}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;font-weight:600">${amount}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;text-transform:capitalize">${status}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;color:${reg.waiverStatus === "signed" ? "#2D6A50" : "#9A5D10"}">${waiver}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;color:${reg.paymentStatus === "paid" ? "#2D6A50" : reg.paymentStatus === "unpaid" ? "#C0392B" : "#666"}">${paid}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
      <title>Participant List — ${sessionName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px 40px; color: #1a1d23; font-size: 13px; }
        .header { margin-bottom: 28px; border-bottom: 2px solid #2E6FB0; padding-bottom: 16px; }
        .logo { font-size: 20px; font-weight: 800; color: #2E6FB0; letter-spacing: -0.5px; margin-bottom: 6px; }
        .meta { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 10px; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a96ac; font-weight: 600; margin-bottom: 2px; }
        .meta-value { font-size: 13.5px; font-weight: 700; color: #1a1d23; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #2E6FB0; color: #fff; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 11px; color: #8a96ac; text-align: right; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        <div class="logo">Simply Breathe</div>
        <div style="font-size:18px;font-weight:800;color:#1a1d23;margin-bottom:4px">${sessionName}</div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Studio</span><span class="meta-value">${studioName}</span></div>
          <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">${sessionDate}</span></div>
          <div class="meta-item"><span class="meta-label">Time</span><span class="meta-value">${sessionTime}</span></div>
          <div class="meta-item"><span class="meta-label">Registered</span><span class="meta-value">${active.length} participant${active.length !== 1 ? "s" : ""}</span></div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Amount</th><th>Status</th><th>Waiver</th><th>Payment</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Generated ${new Date().toLocaleString()} · Simply Breathe OS</div>
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { notify.warning("Pop-up blocked. Please allow pop-ups for this site to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
  };

  if (!registrations.length) {
    return (
      <div style={{ padding: "32px 22px", textAlign: "center", color: C.ink3, fontSize: 14 }}>
        No bookings linked to this session yet.<br />
        <span style={{ fontSize: 12 }}>Bookings sync automatically from Calendly.</span>
      </div>
    );
  }

  const counts = { booked: 0, attended: 0, canceled: 0, rescheduled: 0, no_show: 0 };
  registrations.forEach(r => { if (counts[r.status] != null) counts[r.status]++; });
  const activeRegs = registrations.filter(r => r.status !== "canceled" && r.status !== "rescheduled");
  const bookingRevenue = activeRegs.reduce((sum, r) => {
    if (r.paymentStatus === "unpaid") return sum;
    const amt = resolveActualBookingAmount(r, sessionListPrice);
    if (amt == null || amt <= 0) return sum;
    return sum + amt;
  }, 0);

  return (
    <div style={{ padding: "0 22px 22px" }}>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, paddingTop: 4, alignItems: "center" }}>
        {Object.entries(counts).filter(([,n]) => n > 0).map(([status, n]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
            padding: "5px 12px", borderRadius: 20,
            background: hexA(REG_STATUS_COLOR[status] || C.ink3, 0.1),
            color: REG_STATUS_COLOR[status] || C.ink3, fontWeight: 600 }}>
            <span style={{ fontWeight: 800 }}>{n}</span> {status}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {bookingRevenue > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>
              {money(bookingRevenue)} session revenue
            </span>
          )}
          {registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length > 0 && (
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>
              ⚠ {registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length} waiver{registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length !== 1 ? "s" : ""} pending
            </span>
          )}
          {record.studioId && (
            <button onClick={downloadParticipantList} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5,
              fontWeight: 700, background: C.brand, color: "#fff",
            }}>
              <Download size={13} /> Participant List
            </button>
          )}
        </div>
      </div>

      {/* Booking rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {registrations.map(reg => {
          const client = (data.clients || []).find(c => c.id === reg.clientId);
          const statusColor = REG_STATUS_COLOR[reg.status] || C.ink3;
          const amountLabel = formatActualBookingAmount(reg, sessionListPrice);
          return (
            <div key={reg.id} style={{
              background: C.surfaceAlt, borderRadius: 12, padding: "12px 14px",
              border: `1px solid ${C.line}`, display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.brandSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: C.brand, flexShrink: 0 }}>
                {(client?.name || reg.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                    {cleanName(client?.name || "Unknown client")}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: hexA(statusColor, 0.12), color: statusColor, fontWeight: 600 }}>
                    {reg.status}
                  </span>
                  {reg.waiverStatus === "signed"
                    ? <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Waiver</span>
                    : reg.status !== "canceled" && <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>⚠ Waiver pending</span>}
                  {amountLabel && reg.status !== "canceled" && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: hexA(amountLabel === "Free" ? C.ink3 : "#4A8C6F", 0.12),
                      color: amountLabel === "Free" ? C.ink3 : "#4A8C6F",
                    }}>{amountLabel}</span>
                  )}
                  {reg.paymentStatus === "paid"
                    ? <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Paid</span>
                    : reg.paymentStatus === "unpaid" && <span style={{ fontSize: 11, color: "#C0573F", fontWeight: 600 }}>Unpaid</span>}
                </div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {client?.email && <span>{client.email}</span>}
                  {client?.phone && <span>{client.phone}</span>}
                  {reg.attendanceType && <span>{reg.attendanceType}</span>}
                  {reg.locationType === "zoom" && reg.locationJoinUrl && reg.locationJoinUrl.startsWith("https://") && (
                    <a href={reg.locationJoinUrl} target="_blank" rel="noreferrer noopener"
                      style={{ color: C.brand, fontWeight: 600 }}>Zoom link</a>
                  )}
                </div>
                {reg.concerns && (
                  <div style={{ fontSize: 11.5, color: "#C0573F", marginTop: 4, fontWeight: 500 }}>
                    ⚠ {reg.concerns}
                  </div>
                )}
                {reg.howHeard && (
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Heard via: {reg.howHeard}</div>
                )}
              </div>
              {amountLabel && reg.status !== "canceled" && (
                <div style={{ textAlign: "right", flexShrink: 0, alignSelf: "center", minWidth: 52 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>Amount</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: amountLabel === "Free" ? C.ink3 : "#4A8C6F" }}>{amountLabel}</div>
                </div>
              )}
              {client && (
                <button onClick={() => onOpenRelated({ db: "clients", record: client })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4, flexShrink: 0 }}
                  title="Open client record">
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ============================================================
   SESSION PERFORMANCE (drawer tab)
   ============================================================ */
export function SessionPerformance({ record: r, derived, data }) {
  // Studio sessions: gross/split/net derive from actual Stripe revenue received Ã— studio share %.
  const fin = r.studioId
    ? studioSessionFinance(r, data, { revenueRows: buildRegistrationRevenueRows(data) })
    : { seatPrice: 0, gross: Number(r.revenue) || 0, studioSplit: 0, net: Number(r.netRevenue) || 0, sharePct: 0 };
  const net = fin.net;
  const gross = fin.gross;
  const split = fin.studioSplit;
  const seatPrice = fin.seatPrice;
  const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
  const revPerHead = r.attendance ? (net / r.attendance).toFixed(2) : 0;
  const fillRate = r.registered ? Math.round(((r.attendance || 0) / r.registered) * 100) : null;
  const studio = clientShort(derived.partnerName[r.studioId] || "");
  const studioFull = derived.partnerName[r.studioId] || "";

  const handleDownloadPDF = () => {
    // HTML-escape all user-supplied strings interpolated into document.write to prevent stored XSS
    const esc = s => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const sessionTitle = esc(cleanName(r.name || "Session"));
    const rows = [
      ["Status",          esc(r.status || "—")],
      ["Journey",         esc(r.journey || "—")],
      ["Studio",          esc(studioFull || "—")],
      ["Date & Time",     `${esc(fmtDate(r.date))}${r.time ? " · " + esc(r.time) : ""}`],
      ["Capacity",        r.capacity || "—"],
      ["Registered",      r.registered || "—"],
      ["Attended",        `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`],
      ["Paid Attendees",  typeof r.paidAttendees === "number" ? r.paidAttendees : (r.attendance || 0)],
      ["Waivers",         r.waivers || 0],
      ["No-shows",        r.noShows || 0],
      ["Gross Revenue",   `$${Number(gross).toFixed(2)}`],
      ["Studio Split",    `$${Number(split).toFixed(2)}`],
      ["Net Revenue",     `$${Number(net).toFixed(2)}`],
      ["Rev per Head",    `$${Number(revPerHead).toFixed(2)}`],
      ["Conversion Rate", r.conversion ? `${Math.round(r.conversion * 100)}%` : "—"],
      ["Packages Sold",   r.packagesSold || 0],
      ["Testimonials",    r.testimonialsCapt || 0],
      ["Referrals",       r.referralsGenerated || 0],
    ];

    const metricsHtml = rows.map(([label, val]) => `
      <div class="metric">
        <div class="metric-label">${label}</div>
        <div class="metric-val">${val}</div>
      </div>`).join("");

    const revenueHtml = gross > 0 ? `
      <div class="section">
        <div class="section-title">Revenue Breakdown</div>
        <table class="rev-table">
          <tr><td>Gross Revenue</td><td class="amt">$${gross.toFixed(2)}</td></tr>
          <tr><td>Studio Split</td><td class="amt minus">-$${split.toFixed(2)}</td></tr>
        </table>
      </div>` : "";

    const notesHtml = r.notes ? `
      <div class="section">
        <div class="section-title">Session Notes</div>
        <div class="notes">${esc(r.notes)}</div>
      </div>` : "";

    const studioEsc = esc(studioFull);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>Session Report — ${sessionTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2340; background: #fff; padding: 32px 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2E6FB0; padding-bottom: 14px; margin-bottom: 22px; }
    .brand { font-size: 18px; font-weight: 800; color: #2E6FB0; letter-spacing: -0.3px; }
    .brand-sub { font-size: 11px; color: #6b7a99; margin-top: 2px; }
    .session-title { font-size: 20px; font-weight: 800; color: #1a2340; margin-bottom: 2px; }
    .session-sub { font-size: 12px; color: #6b7a99; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7a99; font-weight: 700; margin-bottom: 10px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; background: #f5f7fb; border-radius: 10px; padding: 14px 16px; }
    .metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7a99; font-weight: 700; }
    .metric-val { font-size: 13px; font-weight: 600; color: #1a2340; margin-top: 1px; }
    .rev-table { width: 100%; border-collapse: collapse; background: #f5f7fb; border-radius: 10px; overflow: hidden; }
    .rev-table td { padding: 10px 14px; border-bottom: 1px solid #e3e8f0; font-size: 13px; }
    .amt { text-align: right; font-weight: 700; }
    .minus { color: #D9892B; }
    .net-row td { font-weight: 800; font-size: 14px; background: #eaf4ee; }
    .net { color: #4A8C6F; }
    .notes { background: #f5f7fb; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #3a4a6b; line-height: 1.6; font-style: italic; }
    .footer { margin-top: 32px; border-top: 1px solid #e3e8f0; padding-top: 10px; font-size: 10px; color: #9aaccb; text-align: center; }
    @media print { body { padding: 20px 28px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Simply Breathe</div>
      <div class="brand-sub">Session Performance Report</div>
    </div>
    <div style="text-align:right">
      <div class="session-title">${sessionTitle}</div>
      <div class="session-sub">${studioEsc ? studioEsc + " · " : ""}${esc(fmtDate(r.date))}${r.time ? " · " + esc(r.time) : ""}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Session Metrics</div>
    <div class="metrics-grid">${metricsHtml}</div>
  </div>
  ${revenueHtml}
  ${notesHtml}
  <div class="footer">Generated by Simply Breathe OS · ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { notify.warning("Popup blocked — please allow popups for this site to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  // Benchmarks from all sessions
  const allSessions = data.sessions.filter((s) => s.id !== r.id && (Number(s.netRevenue) || 0) > 0);
  const avgNetAll = allSessions.length ? allSessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0) / allSessions.length : null;
  const avgConvAll = allSessions.filter((s) => s.conversion > 0).length
    ? allSessions.filter((s) => s.conversion > 0).reduce((a, s) => a + Number(s.conversion), 0) / allSessions.filter((s) => s.conversion > 0).length
    : null;

  const metrics = [
    { label: "Status",          val: r.status || "—", accent: SESSION_STATUS_COLOR[r.status] },
    { label: "Journey",         val: r.journey || "—" },
    { label: "Studio",          val: studio || "—" },
    { label: "Date & time",     val: `${fmtDate(r.date)}${r.time ? ` · ${r.time}` : ""}` },
    { label: "Capacity",        val: r.capacity || "—" },
    { label: "Registered",      val: r.registered || "—" },
    { label: "Attended",        val: `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : capUtil >= 90 ? "#4A8C6F" : null },
    { label: "Paid attendees",  val: typeof r.paidAttendees === "number" ? r.paidAttendees : (r.attendance || 0) },
    { label: "Waivers",         val: r.waivers || 0 },
    { label: "No-shows",        val: r.noShows || 0, accent: (r.noShows || 0) > 2 ? C.gold : null },
    ...(r.studioId ? [
      { label: "Price per seat",  val: money(seatPrice) },
      { label: "Studio share",    val: `${fin.sharePct}%`, accent: C.gold },
    ] : []),
    { label: "Gross revenue",   val: money(gross) },
    { label: "Studio split",    val: money(split), accent: C.gold },
    { label: "Your net",        val: money(net), accent: net > 0 ? "#4A8C6F" : "#C0573F" },
    { label: "Rev per head",    val: money(revPerHead) },
    { label: "Conversion rate", val: pct(r.conversion), accent: r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : C.gold },
    { label: "Packages sold",   val: r.packagesSold || 0 },
    { label: "Testimonials",    val: r.testimonialsCapt || 0, accent: (r.testimonialsCapt || 0) === 0 ? C.gold : null },
    { label: "Referrals",       val: r.referralsGenerated || 0 },
  ];

  const postItems = [
    { label: "Follow-up sent",     done: r.followUpSent },
    { label: "Rebook offer sent",  done: r.rebookOfferSent },
    { label: "Referrals requested",done: r.referralsRequested },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* PDF download — studio sessions only */}
      {r.studioId && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleDownloadPDF} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: C.brand, color: "#fff", border: "none",
          }}>
            <Download size={14} strokeWidth={2} /> Download PDF
          </button>
        </div>
      )}
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {metrics.map(({ label, val, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      {gross > 0 && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 10 }}>Revenue breakdown</div>
          <div style={{ background: C.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
            {[
              { label: "Gross revenue", amount: gross, color: C.brand, pct: 100 },
              { label: "Studio split (out)", amount: -split, color: C.gold, pct: gross ? Math.round((split / gross) * 100) : 0 },
              { label: "Your net", amount: net, color: "#4A8C6F", pct: gross ? Math.round((net / gross) * 100) : 0 },
            ].map(({ label, amount, color, pct: p }) => (
              <div key={label} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{amount < 0 ? "-" : ""}{money(Math.abs(amount))}</span>
                </div>
                <div style={{ height: 5, background: C.line, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: p + "%", background: color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* vs. average */}
      {avgNetAll !== null && (
        <div style={{ background: net >= avgNetAll ? hexA("#4A8C6F", 0.08) : hexA(C.gold, 0.08), borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>vs. your average</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>This session net</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: net >= avgNetAll ? "#4A8C6F" : C.gold }}>{money(net)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg net ({allSessions.length} sessions)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{money(Math.round(avgNetAll))}</div>
            </div>
            {avgConvAll !== null && <>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>This session conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.conversion >= avgConvAll ? "#4A8C6F" : C.gold }}>{pct(r.conversion)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{pct(avgConvAll)}</div>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* Post-session actions */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 8 }}>Post-session actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {postItems.map(({ label, done }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: done ? hexA("#4A8C6F", 0.07) : hexA(C.gold, 0.07) }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#4A8C6F" : C.line, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: done ? C.ink3 : C.ink, textDecoration: done ? "line-through" : "none" }}>{label}</span>
              {!done && <span style={{ marginLeft: "auto", fontSize: 11, color: C.gold, fontWeight: 600 }}>Pending</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment & notes */}
      {r.equipmentNeeded && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Equipment needed</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px" }}>{r.equipmentNeeded}</div>
        </div>
      )}
      {r.notes && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Session notes</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px", fontStyle: "italic", lineHeight: 1.5 }}>{r.notes}</div>
        </div>
      )}
    </div>
  );
}
/* ============================================================
   PARTNER LAUNCH CHECKLIST
   ============================================================ */
export function PartnerLaunchChecklist({ checklist, onChange, partnerName }) {
  const cl = checklist || emptyChecklist();
  const toggle = (id) => onChange({ ...cl, [id]: !cl[id] });

  const totalItems = PARTNER_CHECKLIST.length;
  const totalDone  = PARTNER_CHECKLIST.filter(i => !!cl[i.id]).length;
  const pct        = Math.round((totalDone / totalItems) * 100);

  // Determine active phase (first incomplete phase)
  const activePhaseId = PARTNER_CHECKLIST_PHASES.find(ph =>
    ph.items.some(i => !cl[i.id])
  )?.id || "post_event";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Overall progress header */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{partnerName}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {totalDone} of {totalItems} launch items complete
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 700,
            color: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .4s ease",
            width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : `linear-gradient(90deg, ${C.brand}, #6B5CE7)`,
          }} />
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: "#4A8C6F", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5 }}>
            <Check size={14} /> Fully launched — this partner is ready to run.
          </div>
        )}

        {/* Phase progress pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {PARTNER_CHECKLIST_PHASES.map(ph => {
            const done  = ph.items.filter(i => !!cl[i.id]).length;
            const total = ph.items.length;
            const complete = done === total;
            return (
              <div key={ph.id} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: complete ? ph.bg : C.surface,
                border: `1px solid ${complete ? ph.color : C.line}`,
              }}>
                <span style={{ fontSize: 12 }}>{ph.Icon ? <ph.Icon size={14} color={ph.color} strokeWidth={1.5} /> : null}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600,
                  color: complete ? ph.color : C.ink3 }}>
                  {ph.label}
                </span>
                <span style={{ fontSize: 11, color: complete ? ph.color : C.ink3, opacity: 0.7 }}>
                  {done}/{total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase sections — timeline style */}
      <div style={{ position: "relative" }}>
        {/* Vertical connecting line */}
        <div style={{
          position: "absolute", left: 19, top: 24, bottom: 24,
          width: 2, background: C.line, zIndex: 0,
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {PARTNER_CHECKLIST_PHASES.map((ph, phIdx) => {
            const phaseDone  = ph.items.filter(i => !!cl[i.id]).length;
            const phaseTotal = ph.items.length;
            const phaseComplete = phaseDone === phaseTotal;
            const isActive = ph.id === activePhaseId;
            const isPast   = PARTNER_CHECKLIST_PHASES.findIndex(p => p.id === activePhaseId) > phIdx;

            return (
              <div key={ph.id} style={{ position: "relative", zIndex: 1 }}>
                {/* Phase header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  {/* Phase dot */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: phaseComplete ? ph.color : isActive ? ph.bg : C.surface,
                    border: `2px solid ${phaseComplete || isActive ? ph.color : C.line}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, boxShadow: isActive ? `0 0 0 3px ${ph.color}25` : "none",
                    transition: "all .2s",
                  }}>
                    {phaseComplete ? <Check size={16} color="#fff" strokeWidth={1.5} /> : (ph.Icon ? <ph.Icon size={16} color="#fff" strokeWidth={1.5} /> : null)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isActive || phaseComplete ? ph.color : C.ink3 }}>
                        {ph.label}
                      </span>
                      {isActive && !phaseComplete && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: ph.bg, color: ph.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Current
                        </span>
                      )}
                      {phaseComplete && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: ph.color, opacity: 0.7 }}>
                          Complete ✓
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ height: 4, background: C.line, borderRadius: 4, marginTop: 5, width: 120, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4,
                        width: `${Math.round((phaseDone / phaseTotal) * 100)}%`,
                        background: ph.color, transition: "width .3s ease" }} />
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: phaseComplete ? ph.color : C.ink3, fontWeight: 600 }}>
                    {phaseDone}/{phaseTotal}
                  </span>
                </div>

                {/* Checklist items */}
                <div style={{ marginLeft: 52, display: "flex", flexDirection: "column", gap: 2 }}>
                  {ph.items.map(item => {
                    const checked = !!cl[item.id];
                    return (
                      <button key={item.id} onClick={() => toggle(item.id)} style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        textAlign: "left", padding: "8px 12px", borderRadius: 8,
                        background: checked ? hexA(ph.color, 0.07) : "transparent",
                        border: `1px solid ${checked ? hexA(ph.color, 0.2) : "transparent"}`,
                        cursor: "pointer", transition: "all .12s",
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${checked ? ph.color : C.line}`,
                          background: checked ? ph.color : C.surface,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s",
                        }}>
                          {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <span style={{
                          fontSize: 13.5, fontWeight: checked ? 400 : 500,
                          color: checked ? C.ink3 : C.ink,
                          textDecoration: checked ? "line-through" : "none",
                          flex: 1,
                        }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTACT TIMELINE
   ============================================================ */
const TL_COLORS = {
  session:    C.brand,
  offer_sent: C.gold,
  offer_won:  "#4A8C6F",
  offer_lost: "#C0573F",
  followup:   "#7B68EE",
  referral:   C.gold,
  upcoming:   C.ink3,
  milestone:  C.brandDeep,
  email_sent: "#2563EB",
};

export function tlEvent(date, type, title, detail, extra = {}) {
  return { date: date || "", type, title, detail, ...extra };
}

export function buildClientTimeline(record, data, today) {
  const events = [];
  const clientOffers = (data.offers || []).filter((o) => o.clientId === record.id);
  const clientFUs = (data.followups || []).filter((f) => f.clientId === record.id);

  // First contact / lead added
  const firstDate = record.firstSession || record.nextSession || "";
  if (firstDate) {
    events.push(tlEvent(record.firstSession || "", "milestone",
      "First session attended",
      [record.source && `Source: ${record.source}`, record.packageType !== "None" && record.packageType && `Package: ${record.packageType}`].filter(Boolean).join(" · ") || "No package yet",
      { sub: record.notes || "" }));
  } else {
    events.push(tlEvent("", "milestone", "Lead added", `Source: ${record.source || "—"} · Status: ${record.status}`, { sub: record.notes || "" }));
  }

  // All sessions (we use firstSession as start, lastSession as most recent)
  if (record.lastSession && record.lastSession !== record.firstSession) {
    const count = Number(record.sessionsAttended) || 0;
    events.push(tlEvent(record.lastSession, "session",
      `Most recent session — session #${count}`,
      `${count} total session${count !== 1 ? "s" : ""} attended · LTV: ${money(record.lifetimeValue)}`));
  }

  // Offers
  clientOffers.forEach((o) => {
    events.push(tlEvent(o.dateOffered, "offer_sent",
      `${o.offerType} offer sent`,
      `${money(o.price)} · status: ${o.status}`,
      { offerId: o.id }));
    if (o.closeDate && o.status !== "Offered") {
      events.push(tlEvent(o.closeDate,
        o.status === "Accepted" ? "offer_won" : "offer_lost",
        `${o.offerType} ${o.status.toLowerCase()}`,
        o.status === "Accepted" ? `Payment received: ${money(o.price)}` : `Declined on ${fmtDate(o.closeDate)}`,
        { offerId: o.id }));
    }
  });

  // Follow-ups
  clientFUs.forEach((f) => {
    events.push(tlEvent(f.lastContact, "followup",
      `${f.futype} follow-up`,
      f.outcome || "Pending response",
      { pending: !f.outcome, nextAction: f.nextAction }));
  });

  // Emails sent from CRM
  (record.emailHistory || []).forEach(entry => {
    const dateStr = entry.date ? entry.date.slice(0, 10) : "";
    events.push(tlEvent(dateStr, "email_sent",
      `Email sent: ${entry.templateName}`,
      `To: ${entry.to}`));
  });

  // Next session (future)
  if (record.nextSession && record.nextSession >= today) {
    events.push(tlEvent(record.nextSession, "upcoming",
      "Next session scheduled",
      fmtDate(record.nextSession, true),
      { future: true }));
  }

  // Referral status
  const pendingFU = clientFUs.find((f) => !f.outcome && f.nextAction);
  const highReferral = record.referral === "High";
  const isAdvocate = record.status === "Advocate";

  return {
    events: events.filter((e) => e.date || e.type === "milestone").sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Status",        value: record.status },
      { label: "Segment",       value: record.clientType || "—", accent: CLIENT_TYPE_COLOR[record.clientType] },
      { label: "Source",        value: record.source || "—" },
      { label: "First session", value: fmtDate(record.firstSession) || "Not yet" },
      { label: "Sessions",      value: `${record.sessionsAttended || 0} attended` },
      { label: "Package",       value: record.packageType || "None" },
      { label: "Lifetime value",value: money(record.lifetimeValue || 0) },
      { label: "Referral",      value: (record.referral || "—") + " potential", accent: REFERRAL_COLOR[record.referral] },
      { label: "Open offers",   value: clientOffers.filter((o) => OPEN_STATUSES.includes(o.status)).length + " pending" },
      { label: "Intent tags",   value: (record.tags || []).join(", ") || "None set" },
      { label: "Testimonial",   value: isAdvocate ? "Advocate — request now" : highReferral ? "High potential — not yet requested" : "Not yet requested" },
      { label: "Next follow-up",value: pendingFU ? fmtDate(pendingFU.nextAction) : "None scheduled", accent: pendingFU && pendingFU.nextAction <= today ? "#C0573F" : null },
    ],
  };
}

export function buildPartnerTimeline(record, data, derived, today) {
  const sessions = [...(derived.sessionsByStudio[record.id] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalNet = sessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const totalAttend = sessions.reduce((a, s) => a + (Number(s.attendance) || 0), 0);
  const avgAttend = sessions.length ? Math.round(totalAttend / sessions.length) : 0;

  const events = [];

  // Partnership milestone
  events.push(tlEvent(record.outreachDate || sessions[0]?.date || "", "milestone",
    `Partnership: ${record.stage}`,
    `${record.studioSharePct ? `${record.studioSharePct}% to studio` : (record.revShare || "Revenue share TBD")} · Contact: ${record.contact} (${record.role})`));

  // Outreach date (if different from first session)
  if (record.outreachDate) {
    events.push(tlEvent(record.outreachDate, "followup",
      "First outreach sent",
      `Initial contact with ${record.contact} · ${fmtStudioType(record.studioType)}`));
  }

  // Last touch
  if (record.lastTouch && record.lastTouch !== record.outreachDate) {
    events.push(tlEvent(record.lastTouch, "followup",
      "Last touchpoint",
      record.notes ? record.notes.slice(0, 100) : "Check notes for details"));
  };

  // All sessions as events
  sessions.forEach((s, i) => {
    events.push(tlEvent(s.date, "session",
      `Session ${i + 1}: ${cleanName(s.name)}`,
      `${s.attendance} in room · ${money(s.netRevenue)} net · ${pct(s.conversion)} conversion · ${s.packagesSold} pkg sold`,
      { notes: s.notes, sessionId: s.id }));
  });

  // Upcoming sessions
  const upcomingSessions = data.sessions.filter((s) => s.studioId === record.id && s.date >= today);
  upcomingSessions.forEach((s) => {
    if (!sessions.find((x) => x.id === s.id)) {
      events.push(tlEvent(s.date, "upcoming", `Upcoming: ${cleanName(s.name)}`, fmtDate(s.date, true), { future: true }));
    }
  });

  // Emails sent from CRM
  (record.emailHistory || []).forEach(entry => {
    const dateStr = entry.date ? entry.date.slice(0, 10) : "";
    events.push(tlEvent(dateStr, "email_sent",
      `Email sent: ${entry.templateName}`,
      `To: ${entry.to}`));
  });

  // Next action
  if (record.nextAction) {
    events.push(tlEvent(record.nextAction, "upcoming",
      `Next action scheduled`,
      `Follow up with ${record.contact}`,
      { future: record.nextAction >= today, pending: record.nextAction < today, nextAction: record.nextAction }));
  }

  return {
    events: events.sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Stage",             value: record.stage, accent: STAGE_COLOR[record.stage] },
      { label: "Studio type",       value: fmtStudioType(record.studioType) },
      { label: "Location",          value: record.location || "—" },
      { label: "Contact",           value: `${record.contact || "—"} (${record.role || "—"})` },
      { label: "Email",             value: record.email || "—" },
      { label: "Est. community",    value: record.estimatedCommunitySize ? Number(record.estimatedCommunitySize).toLocaleString() + " people" : "—" },
      { label: "Revenue potential", value: money(record.revenuePotential || 0), accent: C.brand },
      { label: "Close probability", value: record.closeProbability || "—", accent: CLOSE_PROB_COLOR[record.closeProbability] },
      { label: "Studio revenue share", value: record.studioSharePct ? `${record.studioSharePct}% to studio` : (record.revShare || "TBD") },
      { label: "Contract status",   value: record.contractStatus || "None" },
      { label: "First outreach",    value: fmtDate(record.outreachDate) || "—" },
      { label: "Last touch",        value: fmtDate(record.lastTouch) || "—" },
      { label: "Next action",       value: fmtDate(record.nextAction) || "None scheduled", accent: record.nextAction && record.nextAction <= today ? "#C0573F" : null },
      { label: "Total sessions",    value: sessions.length + " logged" },
      { label: "Avg attendance",    value: avgAttend + " per session" },
      { label: "Total net revenue", value: money(totalNet), accent: C.brand },
      { label: "Emails sent",       value: (record.emailHistory || []).length + " from CRM" },
      { label: "Promotion",         value: record.promotionCommitments || "None noted" },
      { label: "Insurance",         value: record.insuranceReqs || "None noted" },
      { label: "Notes",             value: record.notes ? record.notes.slice(0, 80) + (record.notes.length > 80 ? "…" : "") : "—" },
    ],
  };
}

export function ContactTimeline({ db, record, data, derived, today, onOpenRelated }) {
  const { events, summary } = db === "clients"
    ? buildClientTimeline(record, data, today)
    : buildPartnerTimeline(record, data, derived, today);

  const TL_ICON = {
    session:    <Wind size={13} />,
    offer_sent: <DollarSign size={13} />,
    offer_won:  <Check size={13} />,
    offer_lost: <X size={13} />,
    followup:   <Phone size={13} />,
    referral:   <Users size={13} />,
    upcoming:   <CalendarDays size={13} />,
    milestone:  <ArrowUpRight size={13} />,
    email_sent: <Send size={13} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {summary.map(({ label, value, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 12 }}>
          Timeline · {events.length} event{events.length !== 1 ? "s" : ""}
        </div>

        {events.length === 0
          ? <Empty pad>No events logged yet — add sessions, offers, and follow-ups to build this timeline.</Empty>
          : (
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: C.line, borderRadius: 2 }} />

              {events.map((ev, i) => {
                const color = TL_COLORS[ev.type] || C.ink3;
                const isFuture = ev.future || (ev.date && ev.date > today);
                return (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, opacity: isFuture ? 0.7 : 1 }}>
                    {/* Dot */}
                    <div style={{ flexShrink: 0, width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: isFuture ? C.surfaceAlt : color,
                        border: `2px solid ${isFuture ? C.line : color}`, display: "flex", alignItems: "center",
                        justifyContent: "center", color: isFuture ? C.ink3 : "#fff", zIndex: 1, position: "relative",
                      }}>
                        {TL_ICON[ev.type]}
                      </div>
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, background: isFuture ? "transparent" : C.surface,
                      border: `1px solid ${isFuture ? C.lineSoft : C.line}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 2,
                      borderLeft: isFuture ? undefined : `3px solid ${color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{ev.title}</div>
                        {ev.date && (
                          <span style={{ fontSize: 11, color: isFuture ? C.ink3 : C.brand, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {isFuture ? "📅 " : ""}{fmtDate(ev.date)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{ev.detail}</div>
                      {ev.sub && ev.sub.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.sub.length > 180 ? ev.sub.slice(0, 180) + "…" : ev.sub}
                        </div>
                      )}
                      {ev.notes && ev.notes.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.notes.length > 180 ? ev.notes.slice(0, 180) + "…" : ev.notes}
                        </div>
                      )}
                      {ev.pending && ev.nextAction && (
                        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                          color: ev.nextAction <= today ? "#C0573F" : C.gold, background: ev.nextAction <= today ? hexA("#C0573F", 0.1) : C.goldSoft,
                          padding: "2px 8px", borderRadius: 6 }}>
                          <CalendarDays size={11} />
                          Next action: {fmtDate(ev.nextAction)}{ev.nextAction <= today ? " · overdue" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

// Standalone component so useState/useRef/useEffect are always called unconditionally.
// FieldInput previously called these hooks inside an `else if (type === "tagselector")`
// branch, violating the Rules of Hooks and risking state corruption on type change.
export function TagSelectorInput({ fld, value, onChange }) {
  const resolvedOptions = typeof fld.options === "function" ? fld.options() : (fld.options || []);
  const selected  = Array.isArray(value) ? value : (value ? [value] : []);
  const available = resolvedOptions.filter(o => !selected.includes(o));
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {selected.map(tag => (
        <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px 4px 12px", borderRadius: 20, background: C.brandSoft, color: C.brandDeep, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.brand}` }}>
          {tag}
          <button onClick={() => onChange(selected.filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: C.brand, fontSize: 13, marginLeft: 2 }}>Ã—</button>
        </span>
      ))}
      {available.length > 0 && (
        <div ref={ref} style={{ position: "relative" }}>
          <button onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.surface, color: C.ink2, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.line}`, cursor: "pointer" }}>
            <Plus size={12} /> Add type
          </button>
          {open && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 999, minWidth: 150, padding: "4px 0", overflow: "hidden" }}>
              {available.map(opt => (
                <button key={opt} onClick={() => { onChange([...selected, opt]); setOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.ink }}
                  onMouseEnter={e => e.currentTarget.style.background = C.brandSoft}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {selected.length === 0 && available.length === 0 && <span style={{ fontSize: 12.5, color: C.ink3 }}>—</span>}
    </div>
  );
}

export function FieldInput({ fld, value, onChange, data }) {
  const { type } = fld;
  const resolvedOptions = typeof fld.options === "function" ? fld.options() : (fld.options || []);
  let control;
  if (type === "dropdown") {
    control = (
      <div style={{ position: "relative" }}>
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", appearance: "none", WebkitAppearance: "none",
            padding: "8px 34px 8px 12px", borderRadius: 9,
            border: `1px solid ${C.line}`, background: C.surface,
            fontSize: 13.5, color: value ? C.ink : C.ink3,
            cursor: "pointer", outline: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          }}
        >
          <option value="">— select —</option>
          {resolvedOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} color={C.ink3} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      </div>
    );
  } else if (type === "select") {
    control = (
      <div className="sb-chiprow">
        {resolvedOptions.map((o) => {
          const on = value === o;
          const cl = fld.key === "status" || fld.key === "stage" ? (STATUS_COLOR[o] || STAGE_COLOR[o]) : C.brand;
          return <button key={o} className="sb-selchip" onClick={() => onChange(o)}
            style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>{o}</button>;
        })}
      </div>
    );
  } else if (type === "multiselect") {
    const vals = Array.isArray(value) ? value : [];
    control = (
      <div className="sb-chiprow" style={{ flexWrap: "wrap" }}>
        {resolvedOptions.map((o) => {
          const on = vals.includes(o);
          const cl = fld.colorMap ? (fld.colorMap[o] || C.brand) : C.brand;
          return (
            <button key={o} className="sb-selchip" onClick={() => onChange(on ? vals.filter(v => v !== o) : [...vals, o])}
              style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (type === "tagselector") {
    control = <TagSelectorInput fld={fld} value={value} onChange={onChange} />;
  } else if (type === "relation") {
    control = (
      <select className="sb-input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— none —</option>
        {data[fld.target].map((r) => <option key={r.id} value={r.id}>{cleanName(r.name)}</option>)}
      </select>
    );
  } else if (type === "textarea") {
    control = <textarea className="sb-input" rows={fld.rows || 3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "checkbox") {
    control = (
      <div style={{ display: "flex", gap: 8 }}>
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => onChange(v)} style={{
            padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
            background: value === v ? (v ? "#4A8C6F" : C.ink3) : C.surface,
            color: value === v ? "#fff" : C.ink2,
            border: `1px solid ${value === v ? (v ? "#4A8C6F" : C.ink3) : C.line}`,
          }}>{v ? "Yes ✓" : "No"}</button>
        ))}
      </div>
    );
  } else if (type === "date") {
    control = <input className="sb-input" type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "number" || type === "currency" || type === "percent") {
    control = (
      <div style={{ position: "relative" }}>
        {type === "currency" && <span className="sb-affix" style={{ left: 10 }}>$</span>}
        <input className="sb-input" type="number" step={type === "percent" ? "0.01" : "any"}
          style={{ paddingLeft: type === "currency" ? 22 : 12 }}
          value={value === "" || value == null ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        {type === "percent" && <span className="sb-affix" style={{ right: 10 }}>{value !== "" && value != null ? pct(value) : "0–1"}</span>}
      </div>
    );
  } else {
    control = <input className="sb-input" type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
      value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className={"sb-field" + (type === "textarea" || type === "select" || type === "tagselector" || fld.wide ? " sb-field-wide" : "")}>
      <span className="sb-flabel">{fld.label}</span>
      {control}
    </label>
  );
}

export const DESC_PANEL_BODY_STYLE = {
  padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word",
  overflowX: "hidden", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
  touchAction: "pan-y", height: "min(240px, 38vh)", boxSizing: "border-box",
};
