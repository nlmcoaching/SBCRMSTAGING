import { ChevronRight, BellRing } from "lucide-react";
import { C, FONT } from "../../lib/theme.js";
import { fmtDate, norm, cleanName } from "../../lib/format.js";
import { TESTIMONIAL_STATUS_COLOR } from "../../lib/constants.js";
import { Stat, Tag } from "../../components/primitives.jsx";

export function TestimonialLibraryView({ data, query, onOpen }) {
  const allTestimonials = data.testimonials || [];
  const clients         = data.clients || [];
  const q = norm(query);

  const clientName = (id) => {
    const c = clients.find(x => x.id === id);
    return c ? cleanName(c.name) : "";
  };

  const testimonials = !q ? allTestimonials : allTestimonials.filter(t =>
    [t.bestQuote, t.notes, t.category, t.status, t.type, clientName(t.clientId)]
      .some(v => norm(v).includes(q))
  );

  const published    = testimonials.filter(t => t.status === "Published");
  const approved     = testimonials.filter(t => t.status === "Approved");
  const actionNeeded = testimonials.filter(t =>
    ["Breakthrough noted","Request sent"].includes(t.status)
  );
  const withVideo    = testimonials.filter(t => t.type === "Video" && t.status === "Published");
  const readyForWeb  = published.filter(t => t.useOnWebsite);
  const readyForSocial = published.filter(t => t.useOnSocial);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Published"       value={published.length}       hint="approved + live" accent={C.brand} />
        <Stat label="Ready for web"   value={readyForWeb.length}     hint="permission confirmed" accent="#4A8C6F" />
        <Stat label="Ready for social"value={readyForSocial.length}  hint="approved to post" accent="#6B5CE7" />
        <Stat label="Action needed"   value={actionNeeded.length}    hint="request or follow-up" accent={actionNeeded.length ? C.gold : C.ink3} />
      </div>

      {/* Action needed banner */}
      {actionNeeded.length > 0 && (
        <div style={{ border: `1px solid #F5E4A8`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", background: "#FFFBF0", borderBottom: "1px solid #F5E4A8",
            display: "flex", alignItems: "center", gap: 8 }}>
            <BellRing size={14} color={C.gold} strokeWidth={1.5} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "#7A4D0F" }}>
              {actionNeeded.length} testimonial{actionNeeded.length !== 1 ? "s" : ""} need attention
            </span>
          </div>
          {actionNeeded.map((t, i) => {
            const sv = t.status === "Breakthrough noted" ? "#D9892B" : "#5FB0F2";
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                background: "#fff", borderBottom: i < actionNeeded.length - 1 ? `1px solid ${C.line}` : "none",
                borderLeft: `3px solid ${sv}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{clientName(t.clientId)}</div>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>{t.notes || t.status}</div>
                </div>
                <Tag color={TESTIMONIAL_STATUS_COLOR[t.status]} soft>{t.status}</Tag>
                <button onClick={() => onOpen({ db: "testimonials", record: t })} style={{
                  fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 7, cursor: "pointer",
                  background: C.brandSoft, color: C.brandDeep, border: `1px solid ${C.brand}40`,
                }}>View</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Published quote cards */}
      {published.length > 0 && (
        <div>
          <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
            Published Testimonials
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sb-grid2">
            {published.map(t => {
              const themeColor = TESTIMONIAL_STATUS_COLOR["Published"];
              return (
                <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {/* Colored top bar */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${C.brand}, #6B5CE7)` }} />
                  <div style={{ padding: "14px 16px", flex: 1 }}>
                    {t.bestQuote ? (
                      <blockquote style={{ margin: 0, fontFamily: FONT.display, fontSize: 14.5, fontWeight: 500,
                        color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                        "{t.bestQuote}"
                      </blockquote>
                    ) : t.content ? (
                      <blockquote style={{ margin: 0, fontFamily: FONT.display, fontSize: 13.5, fontWeight: 400,
                        color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                        "{t.content.slice(0, 160)}{t.content.length > 160 ? "…" : ""}"
                      </blockquote>
                    ) : null}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.brandSoft,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: C.brand, flexShrink: 0 }}>
                        {(clientName(t.clientId) || "?")[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                          {t.firstNameOnly ? clientName(t.clientId).split(" ")[0] : clientName(t.clientId)}
                        </div>
                        <div style={{ fontSize: 11, color: C.ink3 }}>{fmtDate(t.datePublished)}</div>
                      </div>
                    </div>
                    {t.themes?.length > 0 && (
                      <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                        {t.themes.slice(0, 3).map(th => (
                          <span key={th} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px",
                            borderRadius: 20, background: C.surfaceAlt, color: C.ink2 }}>{th}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Permission chips + edit */}
                  <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.line}`,
                    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {t.useOnWebsite && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#E2F0EA", color: "#1E5239" }}>Website ✓</span>}
                    {t.useOnSocial  && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#EEEAFF", color: "#3D2DA0" }}>Social ✓</span>}
                    {t.type === "Video" && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FFF2F0", color: "#C0573F" }}>📹 Video</span>}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => onOpen({ db: "testimonials", record: t })} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                      background: "transparent", color: C.ink3, border: `1px solid ${C.line}`,
                    }}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved not yet published */}
      {approved.length > 0 && (
        <div className="sb-card">
          <div className="sb-panelhead">
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>Approved — Ready to Publish</span>
            <span className="sb-badge">{approved.length}</span>
          </div>
          <div className="sb-panelbody">
            {approved.map(t => (
              <button key={t.id} className="sb-listrow" onClick={() => onOpen({ db: "testimonials", record: t })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{clientName(t.clientId)}</div>
                  <div style={{ fontSize: 12, color: C.ink2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    "{t.bestQuote || t.content?.slice(0, 100) || "—"}"
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                    {t.themes?.slice(0, 2).map(th => <Tag key={th} soft>{th}</Tag>)}
                    {t.useOnWebsite && <Tag color="#4A8C6F" soft>Website OK</Tag>}
                    {t.useOnSocial  && <Tag color="#6B5CE7" soft>Social OK</Tag>}
                  </div>
                </div>
                <ChevronRight size={14} color={C.ink3} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
