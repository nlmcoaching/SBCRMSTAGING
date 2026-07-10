import { C, FONT, hexA } from "../lib/theme.js";
import { fmtDate } from "../lib/format.js";
import { ArrowUpRight, ChevronRight, Wind } from "lucide-react";

export function BreathMark({ size = 32, animate }) {
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span className={animate ? "sb-breathe" : ""} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}`, opacity: 0.35 }} />
      <span className={animate ? "sb-breathe sb-breathe2" : ""} style={{ position: "absolute", inset: size * 0.18, borderRadius: "50%", border: `1.5px solid ${C.brand}`, opacity: 0.6 }} />
      <Wind size={size * 0.42} color={C.brand} strokeWidth={1.5} />
    </span>
  );
}

export function Stat({ label, value, hint, accent = C.ink, onClick }) {
  const valStr = String(value ?? "");
  const fontSize = valStr.length > 16 ? 16 : valStr.length > 10 ? 20 : 30;
  return (
    <div className="sb-card sb-stat" onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", transition: "box-shadow .15s, transform .15s" }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = `0 6px 24px ${hexA(C.brandDeep,0.13)}`; e.currentTarget.style.transform = "translateY(-2px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
      <div style={{ fontSize: 12, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {label}
        {onClick && <ArrowUpRight size={13} color={C.ink3} strokeWidth={1.5} />}
      </div>
      <div style={{ fontFamily: FONT.display, fontSize, fontWeight: 600, color: accent, lineHeight: 1.2, margin: "6px 0 2px", wordBreak: "break-word" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.ink3 }}>{hint}</div>
    </div>
  );
}

export function Panel({ title, badge, onAll, children }) {
  return (
    <div className="sb-card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="sb-panelhead">
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600 }}>{title}</span>
        {badge != null && <span className="sb-badge">{badge}</span>}
        <div style={{ flex: 1 }} />
        {onAll && <button className="sb-link" onClick={onAll}>View all <ChevronRight size={13} /></button>}
      </div>
      <div className="sb-panelbody">{children}</div>
    </div>
  );
}

export function Row({ children, onClick }) { return <button className="sb-listrow" onClick={onClick}>{children}</button>; }

export function Dot({ color }) { return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />; }

export function Tag({ children, color, soft }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 20, color: soft ? color : "#fff", background: soft ? hexA(color, 0.14) : color, whiteSpace: "nowrap" }}>{children}</span>;
}

export function MiniChip({ children, color }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 6, color: color || C.ink2, background: color ? hexA(color, 0.12) : C.surfaceAlt, border: `1px solid ${C.lineSoft}` }}>{children}</span>;
}

export function DateChip({ iso, today }) {
  if (!iso) return <span style={{ color: C.ink3, fontSize: 12 }}>—</span>;
  const overdue = iso < today, isToday = iso === today;
  const cl = overdue ? "#C0573F" : isToday ? C.brand : C.ink2;
  return <span style={{ fontSize: 12, fontWeight: 600, color: cl, whiteSpace: "nowrap" }}>{isToday ? "Today" : overdue ? `${fmtDate(iso)} · overdue` : fmtDate(iso)}</span>;
}

export function Empty({ children, pad }) {
  return <div style={{ color: C.ink3, fontSize: 13, padding: pad ? "48px 20px" : "14px 4px", textAlign: pad ? "center" : "left" }}>{children}</div>;
}
