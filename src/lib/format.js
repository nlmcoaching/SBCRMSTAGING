export const fmtStudioType = (v) => Array.isArray(v) ? (v.length ? v.join(", ") : "—") : (v || "—");

export const uid = (p) => {
  const buf = new Uint8Array(12);
  (globalThis.crypto ?? window.crypto).getRandomValues(buf);
  return `${p}_${Array.from(buf, b => b.toString(16).padStart(2, "0")).join("")}`;
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
// Safe day-offset on a local YYYY-MM-DD string.
// Avoids the toISOString() UTC-vs-local mismatch: "2026-07-09" parsed by new Date() is
// UTC midnight, so in UTC-7 getDate() returns 8 (the previous day), making +1 give today.
// Using the local Date constructor (new Date(y, m-1, d+n)) stays in wall-clock time.
export function addDaysISO(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}
// Safe month-offset on a YYYY-MM string.
// Avoids setMonth() day-overflow (e.g. Jan 31 → setMonth(-1) → Mar 2 in some engines).
export function addMonthsISO(yyyyMM, n) {
  const [y, m] = yyyyMM.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso, withYear) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}${withYear ? ", " + y : ""}`;
}
export const money = (n) =>
  n === "" || n == null || isNaN(n) ? "—" :
    "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const pct = (n) => (n === "" || n == null || isNaN(n) ? "—" : Math.round(Number(n) * 100) + "%");
export const onOrBefore = (iso, t) => !!iso && iso <= t;
export const sameMonth = (iso, ref) => !!iso && iso.slice(0, 7) === ref.slice(0, 7);
export const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? "" : n; };
/** Coerce CSV / form values to boolean. Strings like "false" must not stay truthy. */
export const bool = (v) => {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return false;
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return false;
};
export const norm = (s) => String(s || "").trim().toLowerCase();

export function cleanName(n) { return String(n || "").replace(/^Sample\s*-\s*/i, ""); }
export function preferLongerText(a, b) {
  const sa = String(a || "").trim();
  const sb = String(b || "").trim();
  if (!sa) return sb;
  if (!sb) return sa;
  return sb.length > sa.length ? sb : sa;
}

export function clientShort(n) { return cleanName(n); }
export function sectionLabel(db) { return { clients: "Clients", partners: "Studio Partners", sessions: "Sessions", offers: "Offers & Sales", content: "Content & Referral", followups: "Follow-Ups", revenue: "Revenue", expenses: "Expenses", testimonials: "Testimonials", templates: "Templates", referrals: "Referrals", outreach: "Outreach Hub", registrations: "Calendly Registrations" }[db] || db; }
