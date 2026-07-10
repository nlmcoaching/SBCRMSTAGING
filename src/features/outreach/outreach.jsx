import { ChevronRight } from "lucide-react";
import { C, FONT, hexA } from "../../lib/theme.js";
import { money } from "../../lib/format.js";
import { OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH_COLOR, OUTREACH_PRIORITY_COLOR } from "../../lib/constants.js";
import { outreachScore } from "../../lib/templates.js";
import { Stat } from "../../components/primitives.jsx";

const LANE = {
  b2c:  { label: "B2C", full: "Client Revenue",  color: C.brand,   bg: C.brandSoft, text: C.brandDeep, accent: C.brand,   soft: C.brandSoft  },
  b2b:  { label: "B2B", full: "Studio Revenue",  color: "#6B5CE7", bg: "#EEEAFF",   text: "#3D2DA0",   accent: "#6B5CE7", soft: "#EEEAFF"    },
  core: { label: "",    full: "",                color: C.ink2,    bg: C.surfaceAlt, text: C.ink2,     accent: C.ink2,    soft: C.surfaceAlt },
};

export function OutreachHubView({ rows, data, today, onOpen }) {
  const daysAgo  = (d) => !d ? 0  : Math.round((new Date(today) - new Date(d)) / 86400000);
  const daysAway = (d) => !d ? 999: Math.round((new Date(d) - new Date(today)) / 86400000);

  const totalPotential = rows.reduce((a, r) => a + (Number(r.revenuePotential) || 0), 0);
  const hot       = rows.filter(r => r.warmth === "Hot").length;
  const overdue   = rows.filter(r => r.nextFollowUp && r.nextFollowUp < today && !["Won","Declined","Inactive"].includes(r.status)).length;
  const noResp    = rows.filter(r => ["No response","Ghosted"].includes(r.responseStatus)).length;
  const active    = rows.filter(r => !["Won","Declined","Inactive"].includes(r.status)).length;

  // Sort by computed priority score descending
  const scored = [...rows].map(r => ({ ...r, _score: outreachScore(r, today) }))
    .sort((a, b) => b._score - a._score);

  // Group by status for kanban-like summary strip
  const byStatus = {};
  OUTREACH_STATUS.forEach(s => { byStatus[s] = rows.filter(r => r.status === s); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Total potential"   value={money(totalPotential)} hint={`${active} active targets`} accent={LANE.b2b.color} />
        <Stat label="Hot leads"         value={hot}    hint="warmth = Hot"    accent={OUTREACH_WARMTH_COLOR.Hot} />
        <Stat label="Overdue follow-up" value={overdue} hint="next follow-up passed" accent={overdue > 0 ? "#C0573F" : C.ink3} />
        <Stat label="No response"       value={noResp} hint="ghosted or silent"     accent={noResp > 2 ? C.gold : C.ink3} />
      </div>

      {/* Pipeline strip */}
      <div className="sb-card" style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Pipeline by stage
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {OUTREACH_STATUS.filter(s => s !== "Inactive").map(s => {
            const count = (byStatus[s] || []).length;
            const color = OUTREACH_STATUS_COLOR[s];
            return (
              <div key={s} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 14px", borderRadius: 10, minWidth: 80, flex: "1 1 80px",
                background: count > 0 ? hexA(color, 0.1) : C.surfaceAlt,
                border: `1px solid ${count > 0 ? hexA(color, 0.3) : C.line}`,
              }}>
                <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: count > 0 ? color : C.ink3 }}>{count}</span>
                <span style={{ fontSize: 10.5, color: C.ink3, textAlign: "center", lineHeight: 1.3, marginTop: 2 }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target list */}
      <div className="sb-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>All targets</span>
          <span style={{ fontSize: 12, color: C.ink3 }}>ranked by priority score</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: LANE.b2b.color, fontWeight: 600 }}>{rows.length} targets</span>
        </div>

        {scored.length === 0
          ? <div style={{ padding: 24, textAlign: "center", color: C.ink3 }}>No outreach targets yet — add your first one.</div>
          : scored.map((r, i) => {
            const warmthColor  = OUTREACH_WARMTH_COLOR[r.warmth]  || C.ink3;
            const statusColor  = OUTREACH_STATUS_COLOR[r.status]  || C.ink3;
            const priorityColor= OUTREACH_PRIORITY_COLOR[r.priority] || C.ink3;
            const isOverdue    = r.nextFollowUp && r.nextFollowUp < today && !["Won","Declined","Inactive"].includes(r.status);
            const daysDue      = daysAway(r.nextFollowUp);

            return (
              <button key={r.id} onClick={() => onOpen(r)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  background: "transparent", border: "none",
                  borderBottom: i < scored.length - 1 ? `1px solid ${C.lineSoft || C.line}` : "none",
                  cursor: "pointer", textAlign: "left" }}
                className="sb-listrow"
              >
                {/* Score badge */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: hexA(LANE.b2b.color, 0.1),
                  border: `1px solid ${hexA(LANE.b2b.color, 0.25)}`, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 700, color: LANE.b2b.color, lineHeight: 1 }}>{r._score}</span>
                  <span style={{ fontSize: 8.5, color: C.ink3, lineHeight: 1.2 }}>score</span>
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{r.name}</span>
                    {/* Warmth dot */}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: warmthColor, flexShrink: 0 }} title={r.warmth} />
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: hexA(statusColor, 0.12), color: statusColor }}>{r.status}</span>
                    {isOverdue && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: "#FFF0EE", color: "#C0573F", border: "1px solid #F5C4BC" }}>
                      {r.nextFollowUp < today ? `Overdue ${daysAgo(r.nextFollowUp)}d` : "Due today"}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 3 }}>
                    {r.contactName && <span>{r.contactName} · </span>}
                    <span>{r.targetType}</span>
                    {r.location && <span> · {r.location}</span>}
                    {r.lastContact && <span> · Last contact {daysAgo(r.lastContact)}d ago</span>}
                    {r.nextFollowUp && !isOverdue && daysDue <= 7 && <span> · Follow-up in {daysDue}d</span>}
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {Number(r.revenuePotential) > 0 && (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: LANE.b2b.color }}>{money(r.revenuePotential)}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                    background: hexA(priorityColor, 0.1), color: priorityColor }}>{r.priority}</span>
                  <span style={{ fontSize: 10.5, color: C.ink3 }}>{r.source}</span>
                </div>

                <ChevronRight size={13} color={C.ink3} style={{ flexShrink: 0 }} />
              </button>
            );
          })}
      </div>
    </div>
  );
}
