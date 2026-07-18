import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { C, FONT, hexA } from "../lib/theme.js";
import { money, cleanName, norm, fmtDate } from "../lib/format.js";
import { calcNet } from "../lib/revenue/index.js";
import { Empty } from "./primitives.jsx";

/* ============================================================
   TABLE
   ============================================================ */
export function TableView({ columns, rows, footer, onOpen, ctx, maxHeight, expandRow }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  if (!rows.length) return <Empty pad>Nothing here yet. Add a record, or adjust the view.</Empty>;
  const thStyle = maxHeight
    ? { position: "sticky", top: 0, zIndex: 1, background: C.surface }
    : null;
  const colSpan = columns.length + (expandRow ? 1 : 0);
  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto", ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}) }}>
        <table className="sb-table">
          <thead><tr>
            {expandRow && <th style={{ width: 28, ...thStyle }} />}
            {columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", ...thStyle }}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="sb-trow" onClick={() => expandRow ? toggle(r.id) : onOpen(r)} style={{ cursor: "pointer" }}>
                  {expandRow && (
                    <td style={{ textAlign: "center", color: C.ink3, padding: "0 6px" }}>
                      <ChevronRight size={14} style={{ transform: expanded[r.id] ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                    </td>
                  )}
                  {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left" }}>{c.render(r, ctx)}</td>)}
                </tr>
                {expandRow && expanded[r.id] && (
                  <tr>
                    <td />
                    <td colSpan={colSpan - 1} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: C.surfaceAlt, whiteSpace: "normal" }}>
                      {expandRow(r, ctx)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          {footer && (
            <tfoot><tr>
              {expandRow && <td />}
              {columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: c.align || "left" }}>
                  {i === 0 ? <span style={{ color: C.ink3, fontSize: 12 }}>{footer.label} · {rows.length}</span> : (footer[c.sum] != null ? <strong>{footer[c.sum]}</strong> : "")}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   RECORD TABLE  (raw table listing: sortable headers + expandable
   rows that reveal every stored field — used by Revenue Table and
   Expense Table tabs)
   ============================================================ */
const MONEY_FIELD_KEYS = new Set([
  "gross", "net", "amount", "stripeFee", "studioSplit", "facilitatorCost",
  "refunds", "price", "paidAmount", "amountRefunded",
]);
// camelCase / snake_case field key → human-readable label.
const humanizeFieldKey = (k) =>
  String(k)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b(id|url|uri|mtd|ltv)\b/gi, (m) => m.toUpperCase())
    .replace(/^./, (s) => s.toUpperCase());
export function formatRecordFieldValue(key, val) {
  if (val == null || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  if (typeof val === "object") return JSON.stringify(val);
  if (typeof val === "number") return MONEY_FIELD_KEYS.has(key) ? money(val) : String(val);
  return String(val);
}

export function RecordTableView({ records, columns, query, section, ctx, onOpen, canEdit, maxHeight }) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || null);
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  let rows = records || [];
  if (query && query.trim()) {
    const q = norm(query);
    const clientsById = Object.fromEntries(((ctx?.data?.clients) || []).map(c => [c.id, c]));
    const sessionsById = Object.fromEntries(((ctx?.data?.sessions) || []).map(s => [s.id, s]));
    rows = rows.filter((r) => {
      if (Object.values(r).some((v) => norm(v).includes(q))) return true;
      const client = r.clientId ? clientsById[r.clientId] : null;
      if (client && (norm(cleanName(client.name)).includes(q) || norm(client.email).includes(q))) return true;
      const sessId = r.sessionId || r.linkedSession;
      const session = sessId ? sessionsById[sessId] : null;
      if (session && norm(cleanName(session.name)).includes(q)) return true;
      return false;
    });
  }

  const sortCol = columns.find((c) => c.key === sortKey);
  const sorted = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const get = sortCol.sortVal || ((r) => r[sortCol.key]);
    const va = get(a), vb = get(b);
    let cmp;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Totals for any column flagged with `sum` (net is derived via calcNet).
  const totals = {};
  columns.forEach((c) => {
    if (!c.sum) return;
    totals[c.sum] = c.key === "net"
      ? rows.reduce((s, r) => s + calcNet(r), 0)
      : rows.reduce((s, r) => s + (Number(r[c.sum]) || 0), 0);
  });
  const hasTotals = Object.keys(totals).length > 0;

  if (!rows.length) return <Empty pad>No records in this table yet.</Empty>;

  const thStyle = maxHeight ? { position: "sticky", top: 0, zIndex: 1, background: C.surface } : null;
  const dl = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, marginBottom: 2 };
  const dv = { fontSize: 13, color: C.ink, wordBreak: "break-word" };

  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto", ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}) }}>
        <table className="sb-table">
          <thead><tr>
            <th style={{ width: 28, ...thStyle }} />
            {columns.map((c) => {
              const active = sortKey === c.key;
              return (
                <th key={c.key} onClick={() => onSort(c.key)}
                  style={{ textAlign: c.align || "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", color: active ? C.brand : undefined, ...thStyle }}>
                  {c.label}
                  <span style={{ marginLeft: 4, opacity: active ? 1 : 0.25, fontSize: 10 }}>{active ? (sortDir === "asc" ? "▲" : "▼") : "▲"}</span>
                </th>
              );
            })}
          </tr></thead>
          <tbody>
            {sorted.map((r) => (
              <Fragment key={r.id}>
                <tr className="sb-trow" onClick={() => toggle(r.id)} style={{ cursor: "pointer" }}>
                  <td style={{ textAlign: "center", color: C.ink3, padding: "0 6px" }}>
                    <ChevronRight size={14} style={{ transform: expanded[r.id] ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                  </td>
                  {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left" }}>{c.render(r, ctx)}</td>)}
                </tr>
                {expanded[r.id] && (
                  <tr>
                    <td />
                    <td colSpan={columns.length} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: C.surfaceAlt, whiteSpace: "normal" }}>
                      <div style={{ padding: "10px 4px 6px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px 24px" }}>
                          {Object.keys(r).map((k) => (
                            <div key={k}>
                              <div style={dl}>{humanizeFieldKey(k)}</div>
                              <div style={dv}>{formatRecordFieldValue(k, r[k])}</div>
                            </div>
                          ))}
                        </div>
                        {canEdit && onOpen && (
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpen({ db: section, record: r }); }}
                              style={{ background: C.brand, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, padding: "8px 16px", cursor: "pointer" }}>
                              Edit record
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          {hasTotals && (
            <tfoot><tr>
              <td />
              {columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: c.align || "left" }}>
                  {i === 0 ? <span style={{ color: C.ink3, fontSize: 12 }}>{rows.length} record{rows.length !== 1 ? "s" : ""}</span> : (c.sum && totals[c.sum] != null ? <strong>{money(totals[c.sum])}</strong> : "")}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

