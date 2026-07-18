import { uid, norm, num, bool, isValidISODate } from "./format.js";
import { Sec } from "./sec.js";

/* ============================================================
   CSV IMPORT
   ============================================================ */
// Expense CSV import only (Revenue → Expenses → Upload Expense CSV). Other tables are not CSV-importable.
export const IMPORT_MAP = {
  expenses: { file: "07-Expenses.csv", map: { date: "date", vendor: "vendor", description: "description", amount: "amount", category: "category", "payment method": "paymentMethod", "paymentmethod": "paymentMethod", "tax deductible": "taxDeductible", "taxdeductible": "taxDeductible", recurring: "recurring", "recurring freq": "recurringFreq", "recurringfreq": "recurringFreq", "linked session": "linkedSession", "linked partner": "linkedPartner", "receipt url": "receiptUrl", notes: "notes" }, nums: ["amount"], bools: ["taxDeductible", "recurring"], dates: ["date"], dedupe: (r) => `${r.date}|${norm(r.vendor)}|${r.amount}|${norm(r.description)}` },
};

/** Map PapaParse rows through IMPORT_MAP: sanitize, coerce, validate dates, dedupe. */
export function parseImportRows(db, rawRows, { existing = [], idPrefix } = {}) {
  const spec = IMPORT_MAP[db];
  if (!spec) return { rows: [], skippedDates: 0, skippedDupes: 0 };
  const seen = new Set();
  if (spec.dedupe) {
    for (const ex of existing) {
      const k = spec.dedupe(ex);
      if (k) seen.add(k);
    }
  }
  let skippedDates = 0, skippedDupes = 0;
  const rows = [];
  for (const raw of rawRows) {
    const rec = { id: uid(idPrefix || db) };
    const lower = {};
    Object.keys(raw).forEach((k) => { lower[norm(k)] = raw[k]; });
    Object.entries(spec.map).forEach(([csvKey, field]) => {
      let val = lower[csvKey] ?? "";
      val = Sec.sanitize(val);
      if (spec.nums && spec.nums.includes(field)) val = num(val);
      if (spec.bools && spec.bools.includes(field)) val = bool(val);
      rec[field] = val;
    });
    if (spec.dates) {
      let badDate = false;
      for (const f of spec.dates) {
        if (rec[f] != null && rec[f] !== "" && !isValidISODate(rec[f])) { badDate = true; break; }
      }
      if (badDate) { skippedDates++; continue; }
    }
    if (spec.dedupe) {
      const key = spec.dedupe(rec);
      if (key && seen.has(key)) { skippedDupes++; continue; }
      if (key) seen.add(key);
    }
    rows.push(rec);
  }
  return { rows, skippedDates, skippedDupes };
}
