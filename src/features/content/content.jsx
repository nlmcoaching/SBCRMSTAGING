import { ChevronRight } from "lucide-react";
import { C, FONT, hexA } from "../../lib/theme.js";
import { money } from "../../lib/format.js";
import { PLATFORM_COLOR, CONTENT_CAT_COLOR } from "../../lib/constants.js";
import { Stat, Tag, Empty } from "../../components/primitives.jsx";

const LANE = {
  b2c:  { label: "B2C", full: "Client Revenue",  color: C.brand,   bg: C.brandSoft, text: C.brandDeep, accent: C.brand,   soft: C.brandSoft  },
  b2b:  { label: "B2B", full: "Studio Revenue",  color: "#6B5CE7", bg: "#EEEAFF",   text: "#3D2DA0",   accent: "#6B5CE7", soft: "#EEEAFF"    },
  core: { label: "",    full: "",                color: C.ink2,    bg: C.surfaceAlt, text: C.ink2,     accent: C.ink2,    soft: C.surfaceAlt },
};

export function ContentAnalyticsView({ data, onOpen }) {
  const posts    = data.content || [];
  const published = posts.filter(p => p.status === "Published");

  const totalReach   = published.reduce((a, p) => a + (Number(p.reach)    || 0), 0);
  const totalLeads   = published.reduce((a, p) => a + (Number(p.leads)    || 0), 0);
  const totalBooked  = published.reduce((a, p) => a + (Number(p.booked)   || 0), 0);
  const totalRev     = published.reduce((a, p) => a + (Number(p.revenue)  || 0), 0);
  const totalEngaged = published.reduce((a, p) => a + (Number(p.engagement)||0), 0);

  const convRate = totalLeads > 0 ? Math.round((totalBooked / totalLeads) * 100) : 0;
  const rpl      = totalLeads > 0 ? Math.round(totalRev / totalLeads) : 0;

  // Platform breakdown
  const platformMap = {};
  published.forEach(p => {
    const pl = p.platform || "Other";
    if (!platformMap[pl]) platformMap[pl] = { reach: 0, leads: 0, booked: 0, revenue: 0, count: 0 };
    platformMap[pl].reach   += Number(p.reach)   || 0;
    platformMap[pl].leads   += Number(p.leads)   || 0;
    platformMap[pl].booked  += Number(p.booked)  || 0;
    platformMap[pl].revenue += Number(p.revenue) || 0;
    platformMap[pl].count++;
  });
  const platforms = Object.entries(platformMap).sort((a, b) => b[1].revenue - a[1].revenue);

  // Category breakdown
  const catMap = {};
  published.forEach(p => {
    const cat = p.category || "Other";
    if (!catMap[cat]) catMap[cat] = { leads: 0, booked: 0, revenue: 0, count: 0 };
    catMap[cat].leads   += Number(p.leads)   || 0;
    catMap[cat].booked  += Number(p.booked)  || 0;
    catMap[cat].revenue += Number(p.revenue) || 0;
    catMap[cat].count++;
  });
  const categories = Object.entries(catMap).sort((a, b) => b[1].revenue - a[1].revenue);

  // Top posts by revenue
  const topPosts = [...published].sort((a, b) =>
    (Number(b.revenue) || 0) - (Number(a.revenue) || 0) ||
    (Number(b.leads)   || 0) - (Number(a.leads)   || 0)
  ).slice(0, 5);

  const maxRev = platforms[0]?.[1]?.revenue || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary stats */}
      <div className="sb-stats">
        <Stat label="Total reach"        value={totalReach.toLocaleString()} hint={`${published.length} published posts`} />
        <Stat label="Leads generated"    value={totalLeads}    hint="across all platforms" accent={C.gold} />
        <Stat label="Sessions booked"    value={totalBooked}   hint={`${convRate}% lead conversion`} accent="#4A8C6F" />
        <Stat label="Revenue attributed" value={money(totalRev)} hint={`${money(rpl)} per lead`} accent={C.brand} />
      </div>

      {/* Content funnel */}
      <div className="sb-card">
        <div className="sb-panelhead">
          <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>Content → Revenue Funnel</span>
        </div>
        <div style={{ padding: "8px 16px 16px", display: "flex", gap: 0, alignItems: "stretch" }}>
          {[
            { label: "Posts Published", value: published.length, color: "#9E9E9E",  pct: 100 },
            { label: "Total Reach",     value: totalReach,       color: "#5FB0F2",  pct: 100 },
            { label: "Leads",           value: totalLeads,        color: C.gold,    pct: published.length ? Math.min(100, Math.round((totalLeads / published.length) * 25)) : 0 },
            { label: "Bookings",        value: totalBooked,       color: C.brand,   pct: totalLeads ? Math.round((totalBooked / totalLeads) * 100) : 0 },
            { label: "Revenue",         value: money(totalRev),   color: "#4A8C6F", pct: totalBooked ? Math.min(100, Math.round((totalBooked / (totalBooked || 1)) * 100)) : 0 },
          ].map((step, i, arr) => (
            <div key={step.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "90%", height: 8, background: hexA(step.color, 0.15), borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: step.pct + "%", background: step.color, borderRadius: 4 }} />
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: step.color }}>{step.value}</div>
              <div style={{ fontSize: 11, color: C.ink3, textAlign: "center", fontWeight: 500 }}>{step.label}</div>
              {i < arr.length - 1 && (
                <div style={{ position: "absolute", fontSize: 16, color: C.line, marginTop: -8 }}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="sb-grid2">
        {/* Platform breakdown */}
        <div className="sb-card">
          <div className="sb-panelhead">
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>By Platform</span>
          </div>
          <div style={{ padding: "0 4px 8px" }}>
            {platforms.length === 0 ? <Empty pad>No data yet.</Empty> : platforms.map(([pl, s]) => {
              const barW = Math.round((s.revenue / maxRev) * 100);
              const plColor = PLATFORM_COLOR[pl] || C.ink3;
              return (
                <div key={pl} style={{ padding: "8px 12px", borderBottom: `1px solid ${C.lineSoft || C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: plColor, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{pl}</span>
                    <span style={{ fontSize: 11.5, color: C.ink3 }}>{s.count} post{s.count !== 1 ? "s" : ""}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: plColor }}>{money(s.revenue)}</span>
                  </div>
                  <div style={{ height: 5, background: C.line, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: barW + "%", background: plColor, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: C.ink3 }}>Reach: {(s.reach).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>Leads: {s.leads}</span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>Booked: {s.booked}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="sb-card">
          <div className="sb-panelhead">
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>By Category</span>
          </div>
          <div style={{ padding: "0 4px 8px" }}>
            {categories.length === 0 ? <Empty pad>No data yet.</Empty> : categories.map(([cat, s]) => {
              const catColor = CONTENT_CAT_COLOR[cat] || C.ink3;
              const maxCatRev = categories[0]?.[1]?.revenue || 1;
              return (
                <div key={cat} style={{ padding: "7px 12px", borderBottom: `1px solid ${C.lineSoft || C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, flex: 1, color: C.ink }}>{cat}</span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>{s.count}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: catColor }}>{money(s.revenue)}</span>
                  </div>
                  <div style={{ height: 4, background: C.line, borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.round((s.revenue / maxCatRev) * 100) + "%", background: catColor, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="sb-card">
        <div className="sb-panelhead">
          <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>Top Performing Posts</span>
        </div>
        <div className="sb-panelbody">
          {topPosts.length === 0 ? <Empty pad>No published posts yet.</Empty> : topPosts.map((p, i) => {
            const catColor = CONTENT_CAT_COLOR[p.category] || C.ink3;
            const plColor  = PLATFORM_COLOR[p.platform]   || C.ink3;
            return (
              <button key={p.id} className="sb-listrow" onClick={() => onOpen({ db: "content", record: p })}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.brandSoft, color: C.brand,
                  fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{p.name.replace("", "")}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Tag color={catColor} soft>{p.category}</Tag>
                    <Tag color={plColor} soft>{p.platform}</Tag>
                    {p.partnerId && <Tag color={LANE.b2b.color} soft>Partner tagged</Tag>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: C.brand }}>{money(p.revenue)}</span>
                  <span style={{ fontSize: 11, color: C.ink3 }}>{p.leads} leads · {p.booked} booked</span>
                  <span style={{ fontSize: 11, color: C.ink3 }}>Reach: {(Number(p.reach) || 0).toLocaleString()}</span>
                </div>
                <ChevronRight size={13} color={C.ink3} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
