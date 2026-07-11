import { useState } from "react";
import { Users, Building2, RefreshCw, Plus, X, Trash2, ChevronDown, Check, Zap, Copy, Clock, Send } from "lucide-react";
import { C, hexA } from "../../lib/theme.js";
import { fmtDate, cleanName } from "../../lib/format.js";
import { FU_STEPS, FU_TEMPLATES, interpolateTemplate } from "../../lib/constants.js";
import { slimHistEntry, cappedLog, sendCrmEmail, makeEmailFailEntry } from "../../lib/email.js";
import { findUnreplacedTemplateTokens, unreplacedTokensMessage } from "../../lib/templates.js";
import { Stat, Tag, MiniChip } from "../../components/primitives.jsx";

function f(key, label, type, opts = {}) { return { key, label, type, ...opts }; }

/** Prefer saved `data.fuTemplates` body over hardcoded FU_TEMPLATES defaults. */
function getFuStepBody(stepId, fuTemplates = []) {
  return fuTemplates.find(t => t.id === stepId)?.body ?? FU_TEMPLATES[stepId] ?? "";
}

export function FollowUpSendButton({ r, data, setData, today }) {
  const clients      = data.clients   || [];
  const libraryTmpls = data.templates || [];
  const client       = clients.find(c => c.id === r.clientId);
  const fuOverrides  = data.fuTemplates || [];

  const fuOptions = FU_STEPS.map(s => ({
    id: `fu_${s.id}`, name: s.label, category: "Follow-Up Sequence",
    channel: s.channel, body: getFuStepBody(s.id, fuOverrides), subject: `Follow-up: ${r.name}`,
  }));
  const allOptions = [...libraryTmpls, ...fuOptions];
  const firstOpt   = allOptions[0];

  // All hooks must come before any conditional return
  const [open, setOpen]             = useState(false);
  const [selectedId, setSelectedId] = useState(firstOpt?.id || "");
  const [subject, setSubject]       = useState("");
  const [body, setBody]             = useState("");
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState("");
  // Local completed flag — persists immediately after send without waiting for prop re-render
  const [completed, setCompleted]   = useState(false);

  // Show done badge if locally completed OR if r.outcome is already set (e.g. on load)
  if (completed || r.outcome) {
    return <span style={{ fontSize: 12, fontWeight: 600, color: "#4A8C6F", background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.25)}`, borderRadius: 20, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={11} /> {r.outcome || "Email sent"}</span>;
  }

  const populate = (tmpl) => {
    const full  = (client?.name || "there").trim();
    const first = full.split(" ")[0];
    const rep = (s) => (s||"")
      .replace(/\{\{ClientName\}\}/gi, full).replace(/\{\{FirstName\}\}/gi, first)
      .replace(/\{first_name\}/g, first).replace(/\{name\}/g, full)
      .replace(/\{\{Email\}\}/gi, client?.email || "")
      .replace(/\{session_name\}/g, r.name || "our session");
    return { body: rep(tmpl?.body || ""), subject: rep(tmpl?.subject || "") || `Follow-up: ${r.name}` };
  };

  const handleOpen = () => {
    const tmpl = allOptions.find(t => t.id === selectedId) || firstOpt;
    if (tmpl) { const { body: b, subject: s } = populate(tmpl); setBody(b); setSubject(s); setSelectedId(tmpl.id); }
    setOpen(true);
  };

  const applyTmpl = (id) => {
    const tmpl = allOptions.find(t => t.id === id);
    if (!tmpl) return;
    const { body: b, subject: s } = populate(tmpl);
    setBody(b); setSubject(s); setSelectedId(id);
  };

  const send = async () => {
    if (!client?.email) return;
    const leftover = findUnreplacedTemplateTokens(subject, body);
    if (leftover.length) {
      setError(unreplacedTokensMessage(leftover));
      return;
    }
    setSending(true); setError("");
    const tmpl = allOptions.find(t => t.id === selectedId);
    const emailParams = { to: client.email, recipientName: cleanName(client.name || ""), recipientType: "client", subject, body, templateId: tmpl?.id || "followup", templateName: tmpl?.name || r.name, category: tmpl?.category || "Follow-Up" };
    try {
      const logEntry = await sendCrmEmail(emailParams);
      setData(d => ({
        ...d,
        emailLog: cappedLog(d.emailLog, logEntry),
        clients: (d.clients||[]).map(c => c.id === client.id ? { ...c, emailHistory: [...(c.emailHistory||[]), slimHistEntry(logEntry)] } : c),
        followups: (d.followups||[]).map(f => f.id === r.id ? { ...f, outcome: "Email sent", lastContact: today } : f),
      }));
      setSent(true);
      // Brief "Sent!" feedback, then mark completed — this closes modal and shows green badge
      setTimeout(() => { setCompleted(true); }, 900);
    } catch (err) {
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, makeEmailFailEntry(emailParams, err)) }));
      setError(err.message);
    }
    setSending(false);
  };

  const leftoverTokens = findUnreplacedTemplateTokens(subject, body);

  if (!open) {
    return (
      <button onClick={e => { e.stopPropagation(); handleOpen(); }} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: C.brand, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
        <Send size={11} /> Send Email
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { e.stopPropagation(); if (e.target === e.currentTarget) setOpen(false); }}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 24, width: "min(520px,95vw)", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 80px rgba(0,0,0,.18)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Send Email · {cleanName(client?.name || r.name)}</div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3 }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11.5, color: C.ink3 }}>To: <strong style={{ color: C.ink2 }}>{client?.email || <span style={{ color:"#C0392B" }}>No email on file</span>}</strong></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", whiteSpace: "nowrap" }}>Template</label>
          <div style={{ position: "relative", flex: 1 }}>
            <select value={selectedId} onChange={e => applyTmpl(e.target.value)} style={{ width: "100%", padding: "6px 26px 6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12.5, color: C.ink, background: C.surfaceAlt, appearance: "none", outline: "none" }}>
              {allOptions.length === 0 && <option value="">No templates yet</option>}
              {libraryTmpls.length > 0 && (
                <optgroup label="── Template Library ──">
                  {libraryTmpls.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}{t.channel && t.channel !== "Email" ? ` [${t.channel}]` : ""}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="── Follow-Up Engine Sequences ──">
                {fuOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.name} · {t.channel === "email" ? "Email" : "Text"}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={12} color={C.ink3} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
        </div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit", outline: "none" }} />
        {leftoverTokens.length > 0 && (
          <div style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 10px" }}>
            {unreplacedTokensMessage(leftoverTokens)}
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: "#C0392B" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setOpen(false)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Close</button>
          <button onClick={send} disabled={sending || sent || !client?.email || leftoverTokens.length > 0} style={{ padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, background: sent ? "#4A8C6F" : C.brand, color: "#fff", cursor: sending || sent || leftoverTokens.length > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: leftoverTokens.length > 0 && !sent ? 0.55 : 1 }}>
            {sent ? <><Check size={13}/> Sent!</> : sending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }}/> Sending…</> : <><Send size={13}/> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FollowUpEngine({ data, setData, today, onOpen, canEdit = true }) {
  const [tab, setTab] = useState("queue");

  const sequences = data.sequences || [];

  // Build all pending steps across all active sequences
  const allItems = [];
  sequences.forEach(seq => {
    if (seq.status !== "active") return;
    const client = (data.clients || []).find(c => c.id === seq.clientId);
    if (!client) return;
    seq.steps.forEach(step => {
      if (step.sent) return;
      const stepDef = FU_STEPS.find(s => s.id === step.stepId);
      allItems.push({ seqId: seq.id, seq, clientId: seq.clientId, client, stepId: step.stepId, stepDef, dueDate: step.dueDate, sessionDate: seq.sessionDate, sessionName: seq.sessionName });
    });
  });
  allItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdueItems  = allItems.filter(i => i.dueDate < today);
  const todayItems    = allItems.filter(i => i.dueDate === today);
  const upcomingItems = allItems.filter(i => i.dueDate > today);
  const totalDue      = overdueItems.length + todayItems.length;

  const markSent = (seqId, stepId) => {
    if (!canEdit) return;
    setData(d => ({
      ...d,
      sequences: (d.sequences || []).map(seq => {
        if (seq.id !== seqId) return seq;
        const steps = seq.steps.map(s => s.stepId !== stepId ? s : { ...s, sent: true, sentAt: today });
        const status = steps.every(s => s.sent) ? "completed" : "active";
        return { ...seq, steps, status };
      }),
    }));
  };

  const togglePause = (seqId) => {
    if (!canEdit) return;
    setData(d => ({
      ...d,
      sequences: (d.sequences || []).map(seq =>
        seq.id !== seqId ? seq : { ...seq, status: seq.status === "paused" ? "active" : "paused" }
      ),
    }));
  };

  const tabStyle = (t) => ({
    padding: "8px 16px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
    cursor: "pointer", background: tab === t ? C.brand : "transparent",
    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Stats row */}
      <div className="sb-stats">
        <Stat label="Due / Overdue" value={totalDue} accent={totalDue > 0 ? "#C0573F" : C.brand} hint="need action now" />
        <Stat label="Coming up" value={upcomingItems.length} hint="within 21 days" />
        <Stat label="Active sequences" value={sequences.filter(s => s.status === "active").length} hint="clients in nurture" />
        <Stat label="Completed" value={sequences.filter(s => s.status === "completed").length} hint="full sequences sent" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${C.line}` }}>
        <button style={tabStyle("queue")} onClick={() => setTab("queue")}>
          Message Queue
          {totalDue > 0 && <span style={{ background: "#C0573F", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{totalDue}</span>}
        </button>
        <button style={tabStyle("sequences")} onClick={() => setTab("sequences")}>Active Sequences</button>
        <button style={tabStyle("templates")} onClick={() => setTab("templates")}>Message Templates</button>
      </div>

      {tab === "queue" && (
        <MessageQueue
          overdue={overdueItems} todayItems={todayItems} upcoming={upcomingItems}
          today={today} markSent={markSent}
          data={data} setData={setData}
          onOpenClient={(clientId) => {
            const c = (data.clients || []).find(x => x.id === clientId);
            if (c) onOpen({ db: "clients", record: c });
          }}
        />
      )}
      {tab === "sequences" && (
        <SequencesView sequences={sequences} clients={data.clients || []} today={today} onOpen={onOpen} togglePause={togglePause} />
      )}
      {tab === "templates" && <TemplatesView data={data} setData={setData} />}
    </div>
  );
}

export function MessageQueue({ overdue, todayItems, upcoming, today, markSent, onOpenClient, data, setData }) {
  const [copied, setCopied]   = useState(null);
  const [expanded, setExpanded] = useState({});
  const [composing, setComposing] = useState(null); // key of item being composed
  const [emailState, setEmailState] = useState({}); // { [key]: { subject, body, sending, sent, error } }

  const emailTemplates = (data?.templates || []).filter(t => (t.channel || "").toLowerCase() === "email");
  const fuOverrides = data?.fuTemplates || [];
  const stepBody = (stepId) => getFuStepBody(stepId, fuOverrides);

  const populateForClient = (tmplBody, tmplSubject, client, item) => {
    const fullName  = (client?.name || "there").trim();
    const firstName = fullName.split(" ")[0];
    const replace   = (str) => (str || "")
      .replace(/\{\{ClientName\}\}/gi, fullName)
      .replace(/\{\{FirstName\}\}/gi, firstName)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi, fullName)
      .replace(/\{\{Email\}\}/gi, client?.email || "")
      .replace(/\{\{Phone\}\}/gi, client?.phone || "")
      .replace(/\{first_name\}/g, firstName)
      .replace(/\{name\}/g, fullName)
      .replace(/\{session_name\}/g, item?.sessionName || "our session")
      .replace(/\{session_date\}/g, item?.sessionDate ? fmtDate(item.sessionDate) : "");
    return { body: replace(tmplBody), subject: replace(tmplSubject) };
  };

  const startCompose = (key, item, defaultBody) => {
    const subject = `Follow-up: ${item.sessionName || "your session"}`;
    setEmailState(s => ({ ...s, [key]: { subject, body: defaultBody, selectedTemplateId: "__followup__", sending: false, sent: false, error: "" } }));
    setComposing(key);
    setExpanded(e => ({ ...e, [key]: true }));
  };

  const applyTemplate = (key, tmplId, item) => {
    if (tmplId === "__followup__") {
      const msg = interpolateTemplate(stepBody(item.stepId), item.client, item);
      setEmailState(s => ({ ...s, [key]: { ...s[key], selectedTemplateId: tmplId, subject: `Follow-up: ${item.sessionName || "your session"}`, body: msg } }));
    } else {
      const tmpl = emailTemplates.find(t => t.id === tmplId);
      if (!tmpl) return;
      const { body, subject } = populateForClient(tmpl.body, tmpl.subject, item.client, item);
      setEmailState(s => ({ ...s, [key]: { ...s[key], selectedTemplateId: tmplId, subject, body } }));
    }
  };

  const sendFollowUpEmail = async (key, item) => {
    const state = emailState[key];
    if (!state || !item.client?.email) return;
    const leftover = findUnreplacedTemplateTokens(state.subject, state.body);
    if (leftover.length) {
      setEmailState(s => ({ ...s, [key]: { ...s[key], sending: false, error: unreplacedTokensMessage(leftover) } }));
      return;
    }
    setEmailState(s => ({ ...s, [key]: { ...s[key], sending: true, error: "" } }));
    const selectedTmpl = state.selectedTemplateId && state.selectedTemplateId !== "__followup__"
      ? emailTemplates.find(t => t.id === state.selectedTemplateId) : null;
    const emailParams = {
      to: item.client.email, recipientName: cleanName(item.client.name || ""), recipientType: "client",
      subject: state.subject, body: state.body,
      templateId: selectedTmpl?.id || item.stepId, templateName: selectedTmpl?.name || item.stepDef?.label || item.stepId, category: selectedTmpl?.category || "Follow-Up",
    };
    try {
      const logEntry = await sendCrmEmail(emailParams);
      setData(d => ({
        ...d,
        emailLog: cappedLog(d.emailLog, logEntry),
        clients: (d.clients || []).map(c =>
          c.id === item.clientId ? { ...c, emailHistory: [...(c.emailHistory || []), slimHistEntry(logEntry)] } : c
        ),
      }));
      setEmailState(s => ({ ...s, [key]: { ...s[key], sending: false, sent: true } }));
      markSent(item.seqId, item.stepId);
      setTimeout(() => { setComposing(null); setExpanded(e => ({ ...e, [key]: false })); }, 1500);
    } catch (err) {
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, makeEmailFailEntry(emailParams, err)) }));
      setEmailState(s => ({ ...s, [key]: { ...s[key], sending: false, error: err.message || "Send failed." } }));
    }
  };

  const copyMsg = (key, text) => {
    try { navigator.clipboard.writeText(text); } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const renderGroup = (items, label, dotColor) => {
    if (!items.length) return null;
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: dotColor, marginBottom: 10 }}>
          {label} · {items.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => {
            const key        = `${item.seqId}_${item.stepId}`;
            const isOpen     = expanded[key];
            const isEmail    = item.stepDef?.channel === "email";
            const isComposing = composing === key;
            const eState     = emailState[key] || {};
            const msg        = interpolateTemplate(stepBody(item.stepId), item.client, item);
            const wasCopied  = copied === key;
            const daysAgo    = Math.round((new Date(today) - new Date(item.sessionDate)) / 86400000);
            const composeLeftover = isComposing ? findUnreplacedTemplateTokens(eState.subject, eState.body) : [];
            return (
              <div key={key} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${item.stepDef?.accent || C.brand}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 14px" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: isOpen || isComposing ? 10 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onOpenClient(item.clientId)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.ink, textDecoration: "underline" }}>
                          {(item.client?.name || "—").trim()}
                        </button>
                        <Tag color={item.stepDef?.accent || C.brand} soft>{item.stepDef?.label}</Tag>
                        <MiniChip color={item.stepDef?.accent}>
                          {isEmail ? "Email" : "Text"}
                        </MiniChip>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>
                        {item.sessionName} · {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago ·{" "}
                        {item.dueDate < today ? <span style={{ color: "#C0573F", fontWeight: 600 }}>overdue since {fmtDate(item.dueDate)}</span>
                          : <span style={{ color: "#D9892B", fontWeight: 600 }}>due today</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      {!isComposing && (
                        <button onClick={() => toggle(key)} style={{ padding: "5px 11px", background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, cursor: "pointer", color: C.ink2 }}>
                          {isOpen ? "Hide" : "View"}
                        </button>
                      )}
                      {!isComposing && !isEmail && (
                        <button onClick={() => copyMsg(key, msg)} style={{
                          padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          background: wasCopied ? hexA("#4A8C6F", 0.12) : C.surfaceAlt,
                          color: wasCopied ? "#4A8C6F" : C.ink2, border: `1px solid ${wasCopied ? hexA("#4A8C6F", 0.35) : C.line}`,
                        }}>
                          {wasCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                        </button>
                      )}
                      {isComposing ? (
                        <button onClick={() => { setComposing(null); setExpanded(e => ({ ...e, [key]: false })); }} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink2 }}>
                          Cancel
                        </button>
                      ) : (
                        <>
                          {!isEmail && (
                            <button onClick={() => markSent(item.seqId, item.stepId)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, background: C.surfaceAlt, color: C.ink2, border: `1px solid ${C.line}` }}>
                              Mark Sent ✓
                            </button>
                          )}
                          <button onClick={() => startCompose(key, item, msg)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, background: C.brand, color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 5 }}>
                            <Send size={12} /> Send Email
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline email compose */}
                  {isComposing && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Template picker */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>Template</label>
                        <div style={{ position: "relative", flex: 1 }}>
                          <select
                            value={eState.selectedTemplateId || "__followup__"}
                            onChange={e => applyTemplate(key, e.target.value, item)}
                            style={{ width: "100%", padding: "6px 28px 6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12.5, color: C.ink, background: C.surfaceAlt, appearance: "none", cursor: "pointer", outline: "none" }}
                          >
                            <option value="__followup__">Follow-up sequence message ({item.stepDef?.label})</option>
                            {emailTemplates.length > 0 && (
                              <optgroup label="─── Template Library ───">
                                {emailTemplates.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronDown size={13} color={C.ink3} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.ink3 }}>
                        To: <strong style={{ color: C.ink2 }}>{item.client?.email || <span style={{ color: "#C0392B" }}>No email on file</span>}</strong>
                      </div>
                      <input
                        value={eState.subject || ""}
                        onChange={e => setEmailState(s => ({ ...s, [key]: { ...s[key], subject: e.target.value } }))}
                        placeholder="Subject"
                        style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, color: C.ink, background: C.surfaceAlt, outline: "none" }}
                      />
                      <textarea
                        value={eState.body || ""}
                        onChange={e => setEmailState(s => ({ ...s, [key]: { ...s[key], body: e.target.value } }))}
                        rows={8}
                        style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, color: C.ink, background: C.surfaceAlt, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit", outline: "none" }}
                      />
                      {composeLeftover.length > 0 && (
                        <div style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 10px" }}>
                          {unreplacedTokensMessage(composeLeftover)}
                        </div>
                      )}
                      {eState.error && <div style={{ fontSize: 12, color: "#C0392B" }}>{eState.error}</div>}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => applyTemplate(key, eState.selectedTemplateId || "__followup__", item)}
                          style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink3 }}
                        >
                          Reset message
                        </button>
                        <button
                          onClick={() => sendFollowUpEmail(key, item)}
                          disabled={eState.sending || eState.sent || !item.client?.email || composeLeftover.length > 0}
                          style={{ padding: "6px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: eState.sending || eState.sent || composeLeftover.length > 0 ? "not-allowed" : "pointer", background: eState.sent ? "#4A8C6F" : C.brand, color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6, opacity: composeLeftover.length > 0 && !eState.sent ? 0.55 : 1 }}
                        >
                          {eState.sent ? <><Check size={12} /> Sent!</>
                            : eState.sending ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                            : <><Send size={12} /> Send Email</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View-only message preview (non-email or before composing) */}
                  {isOpen && !isComposing && (
                    <div style={{
                      background: C.surfaceAlt, borderRadius: 8, padding: "12px 14px",
                      fontSize: 13, color: C.ink, lineHeight: 1.75, whiteSpace: "pre-wrap",
                      borderLeft: `3px solid ${item.stepDef?.accent || C.brand}`,
                    }}>
                      {msg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const total = overdue.length + todayItems.length + upcoming.length;
  if (!total) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
        <Zap size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Queue is clear</div>
        <div style={{ fontSize: 13 }}>Start a sequence from any client record after they attend a session.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {renderGroup(overdue,    "Overdue",    "#C0573F")}
      {renderGroup(todayItems, "Due Today",  "#D9892B")}
      {renderGroup(upcoming,   "Coming Up",  C.ink3)}
    </div>
  );
}

export function SequencesView({ sequences, clients, today, onOpen, togglePause }) {
  if (!sequences.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
        <Clock size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No sequences yet</div>
        <div style={{ fontSize: 13 }}>Open a client record and click "Start Follow-up Sequence" after they attend a session.</div>
      </div>
    );
  }

  const sorted = [...sequences].sort((a, b) => {
    const order = { active: 0, paused: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.sessionDate.localeCompare(a.sessionDate);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(seq => {
        const client = clients.find(c => c.id === seq.clientId);
        const sentCount = seq.steps.filter(s => s.sent).length;
        const total = seq.steps.length;
        const pctDone = Math.round((sentCount / total) * 100);
        const nextPending = seq.steps.find(s => !s.sent);
        const nextDef = nextPending ? FU_STEPS.find(f => f.id === nextPending.stepId) : null;
        const isOverdue = nextPending && nextPending.dueDate < today;
        const statusColor = seq.status === "completed" ? "#4A8C6F" : seq.status === "paused" ? C.ink3 : C.brand;

        return (
          <div key={seq.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{(client?.name || "—").trim()}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>{seq.sessionName} · started {fmtDate(seq.sessionDate)}</div>
              </div>
              <Tag color={statusColor} soft>{seq.status}</Tag>
              {seq.status !== "completed" && (
                <button onClick={() => togglePause(seq.id)} style={{
                  padding: "4px 11px", fontSize: 12, borderRadius: 7, cursor: "pointer",
                  background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink2,
                }}>
                  {seq.status === "paused" ? "Resume" : "Pause"}
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, background: C.line, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: pctDone + "%", background: seq.status === "completed" ? "#4A8C6F" : C.brand, borderRadius: 6, transition: "width .3s" }} />
            </div>
            {/* Step chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {seq.steps.map(step => {
                const def = FU_STEPS.find(f => f.id === step.stepId);
                const late = !step.sent && step.dueDate < today;
                return (
                  <div key={step.stepId} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                    background: step.sent ? hexA("#4A8C6F", 0.12) : late ? hexA("#C0573F", 0.12) : C.surfaceAlt,
                    color: step.sent ? "#4A8C6F" : late ? "#C0573F" : C.ink3,
                    border: `1px solid ${step.sent ? hexA("#4A8C6F", 0.3) : late ? hexA("#C0573F", 0.3) : C.line}`,
                  }}>
                    {step.sent ? "✓" : late ? "!" : "○"} {def?.label}
                    {step.sent && step.sentAt ? ` · ${fmtDate(step.sentAt)}` : ""}
                    {step.sent && step.notes ? ` — ${step.notes}` : ""}
                  </div>
                );
              })}
            </div>
            {nextDef && seq.status === "active" && (
              <div style={{ marginTop: 8, fontSize: 12, color: isOverdue ? "#C0573F" : C.ink3, fontWeight: isOverdue ? 600 : 400 }}>
                Next: {nextDef.label} — {isOverdue ? `overdue since ${fmtDate(nextPending.dueDate)}` : `scheduled ${fmtDate(nextPending.dueDate)}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FUTemplateEmailModal({ templateBody, templateName, data, setData, onClose }) {
  const [search, setSearch]     = useState("");
  const [recipient, setRecipient] = useState(null);
  const [subject, setSubject]   = useState(`Follow-up: ${templateName}`);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  const clients  = data.clients  || [];
  const partners = data.partners || [];
  const q = search.toLowerCase().trim();

  const populate = (recip) => {
    const full  = (recip?.name || "there").trim();
    const first = full.split(" ")[0];
    const contact = recip?._type === "partner" ? (recip.contact || full) : full;
    const rep = (s) => (s||"")
      .replace(/\{\{ClientName\}\}/gi, full).replace(/\{\{FirstName\}\}/gi, first)
      .replace(/\{first_name\}/g, contact.split(" ")[0]).replace(/\{name\}/g, contact)
      .replace(/\{\{ContactName\}\}/gi, contact).replace(/\{\{StudioName\}\}/gi, full)
      .replace(/\{\{Email\}\}/gi, recip?.email || "");
    return rep(templateBody);
  };

  const suggestions = q.length < 1 ? [] : [
    ...clients.filter(c => (c.name||"").toLowerCase().includes(q)).slice(0, 4).map(c => ({ ...c, _type: "client" })),
    ...partners.filter(p => (p.name||"").toLowerCase().includes(q) || (p.contact||"").toLowerCase().includes(q)).slice(0, 3).map(p => ({ ...p, _type: "partner" })),
  ];

  const selectRecipient = (r) => {
    setRecipient(r);
    setSearch(r._type === "partner" ? (r.contact || r.name) : cleanName(r.name));
    setBody(populate(r));
  };

  const recipientEmail = recipient?._type === "partner" ? recipient.email : recipient?.email;

  const send = async () => {
    if (!recipientEmail) return;
    const leftover = findUnreplacedTemplateTokens(subject, body);
    if (leftover.length) {
      setError(unreplacedTokensMessage(leftover));
      return;
    }
    setSending(true); setError("");
    const rName = recipient?._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient?.name || "");
    const emailParams = { to: recipientEmail, recipientName: rName, recipientType: recipient?._type, subject, body, templateId: "fu_custom", templateName, category: "Follow-Up" };
    try {
      const logEntry = await sendCrmEmail(emailParams);
      const slim5 = slimHistEntry(logEntry);
      setData(d => ({
        ...d,
        emailLog: cappedLog(d.emailLog, logEntry),
        clients:  recipient?._type === "client"  ? (d.clients  || []).map(c => c.id === recipient.id ? { ...c, emailHistory: [...(c.emailHistory||[]), slim5] } : c) : (d.clients  || []),
        partners: recipient?._type === "partner" ? (d.partners || []).map(p => p.id === recipient.id ? { ...p, lastTouch: new Date().toISOString().slice(0,10), emailHistory: [...(p.emailHistory||[]), slim5] } : p) : (d.partners || []),
      }));
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); }, 1500);
    } catch (err) {
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, makeEmailFailEntry(emailParams, err)) }));
      setError(err.message);
    }
    setSending(false);
  };

  const leftoverTokens = findUnreplacedTemplateTokens(subject, body);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 24, width: "min(560px,95vw)", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 80px rgba(0,0,0,.18)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}><Send size={14} style={{ marginRight: 6 }} />{templateName}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3 }}><X size={16} /></button>
        </div>

        {/* Recipient search */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Send To</div>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setRecipient(null); }} placeholder="Search client or studio contact…"
              style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, outline: "none" }} />
            {suggestions.length > 0 && !recipient && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1)" }}>
                {suggestions.map(r => (
                  <div key={r.id} onClick={() => selectRecipient(r)}
                    style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: r._type === "partner" ? hexA("#D9892B", 0.15) : hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {r._type === "partner" ? <Building2 size={14} color="#D9892B" /> : <Users size={14} color={C.brand} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r._type === "partner" ? (r.contact || r.name) : cleanName(r.name)}</div>
                      <div style={{ fontSize: 11.5, color: C.ink3 }}>{r._type === "partner" ? `Studio · ${r.name}` : r.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {recipient && (
            <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: recipient._type === "partner" ? hexA("#D9892B", 0.1) : hexA(C.brand, 0.1), border: `1px solid ${recipient._type === "partner" ? "#F6D9A8" : hexA(C.brand, 0.3)}`, borderRadius: 20, padding: "4px 10px 4px 8px" }}>
              {recipient._type === "partner" ? <Building2 size={11} color="#D9892B" /> : <Users size={11} color={C.brand} />}
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{recipient._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient.name)}</span>
              <button onClick={() => { setRecipient(null); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, display: "flex" }}><X size={12} /></button>
            </div>
          )}
        </div>

        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
          style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={9} placeholder={recipient ? "" : "Select a recipient to auto-populate…"}
          style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, resize: "vertical", lineHeight: 1.75, fontFamily: "inherit", outline: "none" }} />
        {leftoverTokens.length > 0 && (
          <div style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 10px" }}>
            {unreplacedTokensMessage(leftoverTokens)}
          </div>
        )}
        {error && <div style={{ fontSize: 12, color: "#C0392B" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Close</button>
          <button onClick={send} disabled={sending || sent || !recipientEmail || leftoverTokens.length > 0}
            style={{ padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, background: sent ? "#4A8C6F" : C.brand, color: "#fff", cursor: sending || sent || !recipientEmail || leftoverTokens.length > 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: (!recipientEmail || leftoverTokens.length > 0) && !sent ? 0.5 : 1 }}>
            {sent ? <><Check size={13}/> Sent!</> : sending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }}/> Sending…</> : <><Send size={13}/> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TemplatesView({ data, setData }) {
  const [copied, setCopied]     = useState(null);
  const [editing, setEditing]   = useState(null);   // id of card being edited
  const [editText, setEditText] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newTmpl, setNewTmpl]   = useState({ name: "", channel: "email", body: "" });
  const [emailModal, setEmailModal] = useState(null); // { id, body, name }

  // Overrides / custom templates stored in data.fuTemplates
  const fuOverrides = data.fuTemplates || [];
  const getBody = (stepId) => getFuStepBody(stepId, fuOverrides);
  const customTmpls = fuOverrides.filter(t => t.isCustom);

  const saveEdit = (id) => {
    setData(d => {
      const existing = (d.fuTemplates || []).find(t => t.id === id);
      if (existing) return { ...d, fuTemplates: (d.fuTemplates).map(t => t.id === id ? { ...t, body: editText } : t) };
      return { ...d, fuTemplates: [...(d.fuTemplates || []), { id, body: editText }] };
    });
    setEditing(null);
  };

  const resetToDefault = (id) => {
    setData(d => ({ ...d, fuTemplates: (d.fuTemplates || []).filter(t => t.id !== id) }));
    setEditing(null);
  };

  const saveNew = () => {
    if (!newTmpl.name.trim() || !newTmpl.body.trim()) return;
    setData(d => ({
      ...d,
      fuTemplates: [...(d.fuTemplates || []), {
        id: `fuc_${Date.now()}`, name: newTmpl.name.trim(),
        channel: newTmpl.channel, body: newTmpl.body.trim(), isCustom: true,
        accent: "#6B5CE7",
      }],
    }));
    setNewTmpl({ name: "", channel: "email", body: "" });
    setAddingNew(false);
  };

  const deleteCustom = (id) => {
    setData(d => ({ ...d, fuTemplates: (d.fuTemplates || []).filter(t => t.id !== id) }));
  };

  const copyTpl = (id, body) => {
    try { navigator.clipboard.writeText(body); } catch (e) {}
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const btnStyle = (active, color) => ({
    padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
    background: active ? hexA(color, 0.12) : C.surfaceAlt,
    color: active ? color : C.ink2, border: `1px solid ${active ? hexA(color, 0.35) : C.line}`,
  });

  const renderCard = (id, label, channel, accent, delayDays, body, isCustom = false) => {
    const isEdit = editing === id;
    const isCopied = copied === id;
    return (
      <div key={id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${accent}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Tag color={accent} soft>{label}</Tag>
            <MiniChip color={accent}>{channel === "email" ? "Email" : "Text"}</MiniChip>
            {delayDays !== undefined && (
              <span style={{ fontSize: 12, color: C.ink3, flex: 1 }}>
                {delayDays === 0 ? "Send same day as session" : `Send ~${delayDays} days after session`}
              </span>
            )}
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {!isEdit && (
                <>
                  <button onClick={() => copyTpl(id, body)} style={btnStyle(isCopied, "#4A8C6F")}>
                    {isCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button onClick={() => { setEditing(id); setEditText(body); }} style={btnStyle(false, C.brand)}>
                    Edit
                  </button>
                  <button
                    onClick={() => setEmailModal({ id, body, name: label })}
                    style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, background: C.brand, color: "#fff", border: "none", fontWeight: 600 }}
                  >
                    <Send size={12} /> Email
                  </button>
                  {isCustom && (
                    <button onClick={() => deleteCustom(id)} style={{ padding: "5px 8px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: hexA("#C0392B", 0.07), color: "#C0392B", border: `1px solid ${hexA("#C0392B", 0.2)}` }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              )}
              {isEdit && (
                <>
                  <button onClick={() => saveEdit(id)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, background: C.brand, color: "#fff", border: "none" }}>Save</button>
                  {!isCustom && <button onClick={() => resetToDefault(id)} style={btnStyle(false, C.ink3)}>Reset default</button>}
                  <button onClick={() => setEditing(null)} style={btnStyle(false, C.ink2)}>Cancel</button>
                </>
              )}
            </div>
          </div>
          {isEdit ? (
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={8}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.brand}`, borderRadius: 8, fontSize: 13, lineHeight: 1.75, fontFamily: "inherit", resize: "vertical", outline: "none", color: C.ink }} />
          ) : (
            <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: C.ink, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {body}
              {!isCustom && fuOverrides.find(t => t.id === id) && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.brand, fontWeight: 600 }}>✎ Custom edit</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: C.ink3 }}>
          Templates are auto-personalized with the client's name. Edit any template or add custom messages.
        </div>
        <button onClick={() => setAddingNew(true)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.brand, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={13} /> Add Template
        </button>
      </div>

      {/* Sequence templates */}
      {FU_STEPS.map(step => renderCard(step.id, step.label, step.channel, step.accent, step.delayDays, getBody(step.id), false))}

      {/* Custom templates */}
      {customTmpls.map(t => renderCard(t.id, t.name, t.channel, t.accent || "#6B5CE7", undefined, t.body, true))}

      {/* Add new template form */}
      {addingNew && (
        <div style={{ background: C.surface, border: `2px solid ${C.brand}`, borderRadius: 10, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>New Template</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input value={newTmpl.name} onChange={e => setNewTmpl(n => ({ ...n, name: e.target.value }))} placeholder="Template name"
              style={{ flex: 2, minWidth: 160, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
            <div style={{ position: "relative" }}>
              <select value={newTmpl.channel} onChange={e => setNewTmpl(n => ({ ...n, channel: e.target.value }))}
                style={{ padding: "7px 28px 7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, appearance: "none", outline: "none", background: C.surfaceAlt }}>
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
              <ChevronDown size={12} color={C.ink3} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>
          <textarea value={newTmpl.body} onChange={e => setNewTmpl(n => ({ ...n, body: e.target.value }))} rows={6} placeholder="Write your template… use {first_name} for auto-fill"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, lineHeight: 1.75, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => setAddingNew(false)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveNew} disabled={!newTmpl.name.trim() || !newTmpl.body.trim()}
              style={{ padding: "6px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 700, background: C.brand, color: "#fff", cursor: "pointer", opacity: (!newTmpl.name.trim() || !newTmpl.body.trim()) ? 0.5 : 1 }}>
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* Email compose modal with recipient search */}
      {emailModal && (
        <FUTemplateEmailModal
          templateBody={emailModal.body}
          templateName={emailModal.name}
          data={data} setData={setData}
          onClose={() => setEmailModal(null)}
        />
      )}
    </div>
  );
}
