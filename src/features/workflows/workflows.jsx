import { useState, useMemo } from "react";
import { ChevronRight, Zap, AlertCircle } from "lucide-react";
import { C, FONT, hexA } from "../../lib/theme.js";
import { money } from "../../lib/format.js";
import { _c } from "../../lib/revenue.js";
import { Stat } from "../../components/primitives.jsx";
import {
  CLIENT_TYPE_LEAD, CLIENT_TYPE_FIRST, CLIENT_TYPE_REPEAT, CLIENT_TYPE_ADVOCATE, CLIENT_TYPE_DORMANT,
  PARTNER_STAGE_TARGET, PARTNER_STAGE_DEMO, PARTNER_STAGE_PILOT, PARTNER_STAGE_ACTIVE,
  SESSION_STATUS_PROMOTED, OPEN_STATUSES, WON_STATUSES, LOST_STATUSES,
} from "../../lib/constants.js";

const sum = (rows, k) => rows.reduce((a, r) => a + _c(r[k]), 0) / 100;

export function buildWorkflows(data, today) {
  const clients   = data.clients   || [];
  const partners  = data.partners  || [];
  const sessions  = data.sessions  || [];
  const offers    = data.offers    || [];
  const referrals = data.referrals || [];

  const daysSince = (d) => d ? Math.round((new Date(today) - new Date(d)) / 86400000) : 999;
  const past = (d) => d && new Date(d) <= new Date(today);

  /* ── 1. Client Journey ── */
  const cLead    = clients.filter(c => CLIENT_TYPE_LEAD.includes(c.clientType) || c.status === "Lead");
  const cFirst   = clients.filter(c => CLIENT_TYPE_FIRST.includes(c.clientType) || (c.sessionsAttended === 1 && !CLIENT_TYPE_ADVOCATE.includes(c.clientType)));
  const cRepeat  = clients.filter(c => CLIENT_TYPE_REPEAT.includes(c.clientType) || c.sessionsAttended >= 3);
  const cAdvocate= clients.filter(c => CLIENT_TYPE_ADVOCATE.includes(c.clientType));
  const cLostOrDormant = clients.filter(c => c.clientType === CLIENT_TYPE_DORMANT);

  /* ── 2. Studio Pipeline ── */
  const pTarget  = partners.filter(p => PARTNER_STAGE_TARGET.includes(p.stage));
  const pDemo    = partners.filter(p => PARTNER_STAGE_DEMO.includes(p.stage));
  const pPilot   = partners.filter(p => PARTNER_STAGE_PILOT.includes(p.stage));
  const pPartner = partners.filter(p => PARTNER_STAGE_ACTIVE.includes(p.stage));

  const pStuck   = [...pTarget, ...pDemo, ...pPilot].filter(p => daysSince(p.lastTouch) > 14);
  const pPipeVal = [...pTarget, ...pDemo, ...pPilot].reduce((s, p) => s + (p.revenuePotential || 0), 0);

  /* ── 3. Session Lifecycle ── */
  const sScheduled  = sessions.filter(s => s.status === "Planned");
  const sPromoted   = sessions.filter(s => SESSION_STATUS_PROMOTED.includes(s.status));
  const sDelivered  = sessions.filter(s => s.status === "Completed");
  const sFollowedUp = sessions.filter(s => s.followUpSent || s.status === "Follow-up pending");
  const sClosed     = sessions.filter(s => s.status === "Closed out");
  const sStuck      = sScheduled.filter(s => past(s.date));  // session date passed but still "Planned"
  const sRevTotal   = sDelivered.reduce((sum, s) => sum + (s.netRevenue || s.revenue || 0), 0);

  /* ── 4. Offer Pipeline ── */
  const oMade    = offers.filter(o => OPEN_STATUSES.includes(o.status) && o.status !== "Follow-up due");
  const oFollowUp= offers.filter(o => o.status === "Follow-up due");
  const oWon     = offers.filter(o => WON_STATUSES.includes(o.status));
  const oLost    = offers.filter(o => LOST_STATUSES.includes(o.status));
  const oStuck   = oMade.filter(o => past(o.followUpDate));
  const oPipeVal = [...oMade, ...oFollowUp].reduce((s, o) => s + (o.price || 0), 0);
  const oWonVal  = oWon.reduce((s, o) => s + (o.price || 0), 0);

  /* ── 5. Referral Pipeline ── */
  const rfReferred  = referrals.filter(r => r.status === "Referred");
  const rfContacted = referrals.filter(r => r.status === "Contacted");
  const rfAttended  = referrals.filter(r => r.status === "Attended");
  const rfPurchased = referrals.filter(r => r.status === "Purchased");
  const rfThanked   = referrals.filter(r => r.thankYouSent);
  const rfStuck     = rfReferred.filter(r => daysSince(r.date) > 14);
  const rfRevenue   = rfPurchased.reduce((s, r) => s + (r.revenue || 0), 0);

  const conversion = (a, b) => a + b === 0 ? null : Math.round((b / (a + b)) * 100);

  return [
    {
      id: "client_journey",
      label: "Client Journey",
      subtitle: "Lead → Client → Repeat → Advocate",
      lane: "b2c",
      color: C.brand,
      bg: C.brandSoft,
      stuckCount: cLead.filter(c => !c.nextSession || past(c.nextSession)).length,
      stuckLabel: "leads with no upcoming session",
      stages: [
        { id: "lead",     label: "Lead",          color: "#D9892B", count: cLead.length,     value: null,       records: cLead,     tip: "Not yet attended any session" },
        { id: "first",    label: "First Session", color: C.brand,   count: cFirst.length,    value: null,       records: cFirst,    tip: "Attended exactly one session" },
        { id: "repeat",   label: "Repeat Client", color: "#2E6FB0", count: cRepeat.length,   value: cRepeat.reduce((s,c)=>s+(c.lifetimeValue||0),0), records: cRepeat,  tip: "3+ sessions or package purchased" },
        { id: "advocate", label: "Advocate",      color: "#4A8C6F", count: cAdvocate.length, value: cAdvocate.reduce((s,c)=>s+(c.lifetimeValue||0),0), records: cAdvocate, tip: "Actively referring others" },
      ],
      kpis: [
        { label: "Total in pipeline", value: clients.length },
        { label: "Dormant / reactivate", value: cLostOrDormant.length },
        { label: "Referrals from advocates", value: referrals.filter(r => cAdvocate.find(c => c.id === r.referrerId)).length },
      ],
      nextAction: cLead.length > 0 ? `Follow up with ${cLead.length} lead${cLead.length > 1 ? "s" : ""} not yet booked` : null,
    },
    {
      id: "studio_pipeline",
      label: "Studio Pipeline",
      subtitle: "Target → Demo → Pilot → Recurring Partner",
      lane: "b2b",
      color: "#6B5CE7",
      bg: "#EEEAFF",
      stuckCount: pStuck.length,
      stuckLabel: "studios with no contact in 14+ days",
      stages: [
        { id: "target",  label: "Target / Outreach", color: "#9E9E9E",  count: pTarget.length,  value: pTarget.reduce((s,p)=>s+(p.revenuePotential||0),0),  records: pTarget,  tip: "Identified but not yet in demo stage" },
        { id: "demo",    label: "Demo",              color: "#6B5CE7",  count: pDemo.length,    value: pDemo.reduce((s,p)=>s+(p.revenuePotential||0),0),    records: pDemo,    tip: "Discovery call through demo completed" },
        { id: "pilot",   label: "Pilot / Agreement", color: "#2E6FB0",  count: pPilot.length,   value: pPilot.reduce((s,p)=>s+(p.revenuePotential||0),0),   records: pPilot,   tip: "Proposal to agreement signed" },
        { id: "partner", label: "Recurring Partner", color: "#4A8C6F",  count: pPartner.length, value: pPartner.reduce((s,p)=>s+(p.revenuePotential||0),0), records: pPartner, tip: "Active recurring studio" },
      ],
      kpis: [
        { label: "Pipeline value", value: money(pPipeVal) },
        { label: "Stuck / overdue", value: pStuck.length },
        { label: "Active partners", value: pPartner.length },
      ],
      nextAction: pStuck.length > 0 ? `Re-engage ${pStuck.length} studio${pStuck.length > 1 ? "s" : ""} — no contact in 14+ days` : pDemo.length > 0 ? `Send pilot proposal to ${pDemo.length} demo-stage studio${pDemo.length > 1 ? "s" : ""}` : null,
    },
    {
      id: "session_lifecycle",
      label: "Session Lifecycle",
      subtitle: "Scheduled → Promoted → Delivered → Followed Up → Rebooked",
      lane: "core",
      color: C.gold,
      bg: hexA(C.gold, 0.12),
      stuckCount: sStuck.length,
      stuckLabel: "sessions past their date still marked Planned",
      stages: [
        { id: "sched",  label: "Scheduled",    color: "#9E9E9E",  count: sScheduled.length,  value: null, records: sScheduled,  tip: "Planned, not yet promoted" },
        { id: "promo",  label: "Promoted",     color: C.gold,     count: sPromoted.length,   value: null, records: sPromoted,   tip: "Booking open through almost full" },
        { id: "deliv",  label: "Delivered",    color: C.brand,    count: sDelivered.length,  value: sRevTotal, records: sDelivered,  tip: "Session completed" },
        { id: "fup",    label: "Followed Up",  color: "#6B5CE7",  count: sFollowedUp.length, value: null, records: sFollowedUp, tip: "Follow-up email sent" },
        { id: "closed", label: "Closed Out",   color: "#4A8C6F",  count: sClosed.length,     value: null, records: sClosed,     tip: "Revenue reconciled and closed" },
      ],
      kpis: [
        { label: "Revenue delivered", value: money(sRevTotal) },
        { label: "Needing follow-up", value: sDelivered.filter(s => !s.followUpSent).length },
        { label: "Sessions past date, stuck", value: sStuck.length },
      ],
      nextAction: sDelivered.filter(s => !s.followUpSent).length > 0
        ? `Send follow-up for ${sDelivered.filter(s => !s.followUpSent).length} completed session${sDelivered.filter(s => !s.followUpSent).length > 1 ? "s" : ""}`
        : sStuck.length > 0 ? `Update status on ${sStuck.length} overdue session${sStuck.length > 1 ? "s" : ""}` : null,
    },
    {
      id: "offer_pipeline",
      label: "Offer Pipeline",
      subtitle: "Offer Made → Followed Up → Closed / Won / Lost",
      lane: "b2c",
      color: C.brand,
      bg: C.brandSoft,
      stuckCount: oStuck.length,
      stuckLabel: "offers past follow-up date with no action",
      stages: [
        { id: "made",    label: "Made / Sent",   color: "#D9892B",  count: oMade.length,     value: oPipeVal, records: oMade,     tip: "Drafted, sent, or viewed" },
        { id: "followup",label: "Follow-up Due", color: C.gold,     count: oFollowUp.length, value: oFollowUp.reduce((s,o)=>s+(o.price||0),0), records: oFollowUp, tip: "Waiting on response" },
        { id: "won",     label: "Won / Paid",    color: "#4A8C6F",  count: oWon.length,      value: oWonVal,  records: oWon,      tip: "Accepted or fully paid" },
        { id: "lost",    label: "Declined / Lost",color: "#C0392B", count: oLost.length,     value: oLost.reduce((s,o)=>s+(o.price||0),0), records: oLost, tip: "Declined or expired" },
      ],
      kpis: [
        { label: "Open pipeline", value: money(oPipeVal) },
        { label: "Won revenue", value: money(oWonVal) },
        { label: "Conversion rate", value: (oWon.length + oLost.length) > 0 ? Math.round(oWon.length / (oWon.length + oLost.length) * 100) + "%" : "—" },
      ],
      nextAction: oStuck.length > 0 ? `Follow up on ${oStuck.length} overdue offer${oStuck.length > 1 ? "s" : ""}` : oFollowUp.length > 0 ? `${oFollowUp.length} offer${oFollowUp.length > 1 ? "s" : ""} need follow-up today` : null,
    },
    {
      id: "referral_pipeline",
      label: "Referral Pipeline",
      subtitle: "Referred → Booked → Thanked → Tracked",
      lane: "b2c",
      color: "#4A8C6F",
      bg: hexA("#4A8C6F", 0.1),
      stuckCount: rfStuck.length,
      stuckLabel: "referrals not yet contacted in 14+ days",
      stages: [
        { id: "referred",  label: "Referred",   color: "#9E9E9E",  count: rfReferred.length,  value: null,     records: rfReferred,  tip: "Referred but not yet booked" },
        { id: "contacted", label: "Contacted",  color: "#D9892B",  count: rfContacted.length, value: null,     records: rfContacted, tip: "In conversation, not yet attended" },
        { id: "attended",  label: "Attended",   color: C.brand,    count: rfAttended.length,  value: null,     records: rfAttended,  tip: "Attended at least one session" },
        { id: "purchased", label: "Purchased",  color: "#4A8C6F",  count: rfPurchased.length, value: rfRevenue, records: rfPurchased, tip: "Purchased a session or package" },
      ],
      kpis: [
        { label: "Referral revenue", value: money(rfRevenue) },
        { label: "Awaiting thank-you", value: referrals.filter(r => !r.thankYouSent && r.status !== "Referred").length },
        { label: "Conversion rate", value: referrals.length > 0 ? Math.round(rfPurchased.length / referrals.length * 100) + "%" : "—" },
      ],
      nextAction: rfStuck.length > 0 ? `Follow up on ${rfStuck.length} stale referral${rfStuck.length > 1 ? "s" : ""}` : referrals.filter(r => !r.thankYouSent && ["Attended","Purchased"].includes(r.status)).length > 0 ? `Send thank-you to ${referrals.filter(r => !r.thankYouSent && ["Attended","Purchased"].includes(r.status)).length} referrer${referrals.filter(r => !r.thankYouSent && ["Attended","Purchased"].includes(r.status)).length > 1 ? "s" : ""}` : null,
    },
  ];
}

export function WorkflowsView({ data, derived, today }) {
  const [expanded, setExpanded] = useState(null);
  const workflows = useMemo(() => buildWorkflows(data, today), [data, today]);

  const totalInMotion = workflows.reduce((s, w) => s + w.stages.reduce((ss, st) => ss + st.count, 0), 0);
  const totalStuck    = workflows.reduce((s, w) => s + w.stuckCount, 0);
  const hasActions    = workflows.filter(w => w.nextAction).length;

  const LANE_META = {
    b2c:  { label: "B2C", color: C.brand,   bg: C.brandSoft  },
    b2b:  { label: "B2B", color: "#6B5CE7", bg: "#EEEAFF"    },
    core: { label: "OPS", color: C.ink2,    bg: C.surfaceAlt },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header stats */}
      <div className="sb-stats">
        <Stat label="Active workflows"       value={5}               hint="running in parallel" />
        <Stat label="Records in motion"      value={totalInMotion}   hint="across all pipelines" />
        <Stat label="Stuck / needs action"   value={totalStuck}      hint="records overdue"       accent={totalStuck > 0 ? "#D9892B" : "#4A8C6F"} />
        <Stat label="Workflows with actions" value={hasActions}      hint="requiring attention"   accent={hasActions > 0 ? C.brand : "#4A8C6F"} />
      </div>

      {/* Workflow cards */}
      {workflows.map(wf => {
        const isOpen = expanded === wf.id;
        const lane   = LANE_META[wf.lane] || LANE_META.core;

        return (
          <div key={wf.id} style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14,
            overflow: "hidden", boxShadow: isOpen ? `0 2px 12px ${hexA(wf.color, 0.12)}` : "none",
            borderLeft: `4px solid ${wf.color}`,
          }}>

            {/* Card header */}
            <div
              onClick={() => setExpanded(isOpen ? null : wf.id)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                background: isOpen ? hexA(wf.color, 0.04) : C.surface,
                borderBottom: isOpen ? `1px solid ${C.line}` : "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 14.5, color: C.ink }}>{wf.label}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                    background: lane.bg, color: lane.color }}>{lane.label}</span>
                  {wf.stuckCount > 0 && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                      background: hexA("#D9892B", 0.12), color: "#9A5D10" }}>⚠ {wf.stuckCount} stuck</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: C.ink3 }}>{wf.subtitle}</div>
              </div>

              {/* Stage summary chips */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {wf.stages.map((st, i) => (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {i > 0 && <ChevronRight size={12} color={C.ink3} />}
                    <div style={{
                      minWidth: 40, textAlign: "center", padding: "5px 10px", borderRadius: 8,
                      background: st.count > 0 ? hexA(st.color, 0.12) : C.surfaceAlt,
                      border: `1px solid ${st.count > 0 ? hexA(st.color, 0.3) : C.line}`,
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: st.count > 0 ? st.color : C.ink3, lineHeight: 1 }}>{st.count}</div>
                      <div style={{ fontSize: 9.5, color: C.ink3, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap" }}>{st.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Pipeline visualization */}
                <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
                  {wf.stages.map((st, i) => {
                    const next = wf.stages[i + 1];
                    const convRate = next ? (st.count + next.count > 0 ? Math.round(next.count / Math.max(st.count, 1) * 100) : null) : null;
                    return (
                      <div key={st.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 120 }}>
                        {/* Stage box */}
                        <div style={{
                          flex: 1, background: hexA(st.color, 0.07), border: `1px solid ${hexA(st.color, 0.25)}`,
                          borderRadius: 10, padding: "14px 14px 12px",
                        }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                            <span style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: st.count > 0 ? st.color : C.ink3, lineHeight: 1 }}>{st.count}</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{st.label}</div>
                          {st.value != null && st.value > 0 && (
                            <div style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>{money(st.value)}</div>
                          )}
                          <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 4, lineHeight: 1.4 }}>{st.tip}</div>
                        </div>

                        {/* Arrow + conversion */}
                        {i < wf.stages.length - 1 && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px", minWidth: 42, flexShrink: 0 }}>
                            <ChevronRight size={18} color={wf.color} />
                            {convRate != null && (
                              <span style={{ fontSize: 10, color: convRate > 50 ? "#4A8C6F" : convRate > 25 ? "#D9892B" : "#C0392B", fontWeight: 700, marginTop: 2 }}>
                                {convRate}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* KPIs + next action */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>

                  {/* KPIs */}
                  <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
                    {wf.kpis.map(k => (
                      <div key={k.label} style={{ background: C.surfaceAlt, borderRadius: 8, padding: "8px 14px", minWidth: 120 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: FONT.display }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: C.ink3, fontWeight: 500 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Next action */}
                  {wf.nextAction && (
                    <div style={{
                      background: hexA(wf.color, 0.08), border: `1px solid ${hexA(wf.color, 0.25)}`,
                      borderRadius: 10, padding: "12px 16px", minWidth: 220, flex: 1,
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <Zap size={16} color={wf.color} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: wf.color, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>Next action</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.4 }}>{wf.nextAction}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stuck alert */}
                {wf.stuckCount > 0 && (
                  <div style={{ background: hexA("#D9892B", 0.08), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} color="#D9892B" />
                    <span style={{ fontSize: 12.5, color: "#9A5D10" }}>
                      <strong>{wf.stuckCount} record{wf.stuckCount > 1 ? "s" : ""}</strong> — {wf.stuckLabel}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Workflow health summary */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Pipeline health</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }} className="sb-grid5">
          {workflows.map(wf => {
            const totalCount = wf.stages.reduce((s, st) => s + st.count, 0);
            const lastStage  = wf.stages[wf.stages.length - 1];
            const health = totalCount === 0 ? "empty"
              : wf.stuckCount > 1 ? "blocked"
              : wf.stuckCount === 1 ? "caution"
              : lastStage.count > 0 ? "flowing"
              : "active";
            const healthColor = { empty: C.ink3, blocked: "#C0392B", caution: "#D9892B", flowing: "#4A8C6F", active: C.brand }[health];
            const healthLabel = { empty: "Empty", blocked: "Blocked", caution: "Caution", flowing: "Flowing", active: "Active" }[health];
            return (
              <div key={wf.id} onClick={() => setExpanded(wf.id === expanded ? null : wf.id)}
                style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                  background: hexA(healthColor, 0.07), border: `1px solid ${hexA(healthColor, 0.2)}` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: healthColor, margin: "0 auto 6px" }} />
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{wf.label.split(" ")[0]}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
