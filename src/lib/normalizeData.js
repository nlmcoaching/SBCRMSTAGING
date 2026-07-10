import { cleanName, uid } from "./format.js";
import { emptyChecklist } from "./constants.js";

export const CRM_REQUIRED_ARRAY_KEYS = ["clients", "partners", "sessions", "offers"];
export const CRM_ARRAY_KEYS = [
  ...CRM_REQUIRED_ARRAY_KEYS,
  "registrations", "payments", "revenue", "content", "followups", "referrals",
  "sequences", "outreach", "testimonials", "templates", "expenses", "emailLog", "fuTemplates",
];

// Sample/seed revenue records that shipped with early builds. They are stripped from any
// existing dataset so reports reflect only real bookings, offers, and user-entered revenue.
export const SAMPLE_SEED_REVENUE_IDS = new Set(
  Array.from({ length: 12 }, (_, i) => `rv${i + 1}`),
);

/** Ensure CRM tables exist as arrays (repairs partial saves) and purge legacy sample data. */
export function normalizeCrmData(d) {
  if (!d || typeof d !== "object") return null;
  const out = { ...d };
  for (const k of CRM_ARRAY_KEYS) {
    if (!Array.isArray(out[k])) out[k] = [];
  }
  if (out.revenue.some(r => SAMPLE_SEED_REVENUE_IDS.has(r?.id))) {
    out.revenue = out.revenue.filter(r => !SAMPLE_SEED_REVENUE_IDS.has(r?.id));
  }
  // Every studio partner must carry a numeric studio revenue share % so the value is never lost
  // to a missing/stringified field on save or reload (drives studio split + net calculations).
  out.partners = out.partners.map(p =>
    p && typeof p === "object" && typeof p.studioSharePct === "number"
      ? p
      : { ...p, studioSharePct: Number(p?.studioSharePct) || 0 });
  return out;
}

/**
 * Self-healing for studio partners. Recreates a partner record when a session references a
 * studio (by a "Studio - Location" name or a dangling studioId) but the partner is missing —
 * restoring links lost to a data wipe/delete. Virtual 1:1 sessions are never turned into
 * studio partners. Returns { sessions, partners, changed }.
 */
export function healStudioPartners(sessionsIn, partnersIn) {
  const sessions = (sessionsIn || []).map(s => ({ ...s }));
  const partners = [...(partnersIn || [])];
  const byId = new Map(partners.map(p => [p.id, p]));
  const byName = new Map(partners.filter(p => p.name).map(p => [cleanName(p.name).toLowerCase(), p]));
  let changed = false;

  const looksVirtual = (s) =>
    s.locationType === "zoom" || s.locationType === "custom" || /\b(virtual|zoom|online)\b/i.test(s.name || "");
  // Studio sessions are stored as "Studio Name - Location"; pull the studio name + location.
  const parseStudio = (s) => {
    const name = cleanName(s.name || "");
    const parts = name.split(/\s[–-]\s/);
    if (parts.length >= 2 && parts[0].trim().length > 2) {
      return { name: parts[0].trim(), location: parts.slice(1).join(" - ").trim() || s.locationAddress || "" };
    }
    return null;
  };
  const makePartner = (id, name, location, inferredSharePct = 0) => ({
    id, name, location: location || "", studioType: "Yoga",
    contact: "", role: "", email: "", phone: "",
    stage: "Recurring partner",
    estimatedCommunitySize: 0, bestFitJourney: "", revenuePotential: 0,
    closeProbability: "Closed Won", revShare: "", studioSharePct: inferredSharePct,
    contractStatus: "None", outreachDate: "", lastTouch: "",
    nextAction: "", avgAttendance: 0, sessionsPerMonth: 0,
    insuranceReqs: "", promotionCommitments: "",
    notes: "Re-created automatically from existing session data (studio partner record was missing).",
    checklist: emptyChecklist(),
  });

  // Infer studio revenue share % from a session's stored gross/split when reconstituting a lost partner.
  const inferSharePct = (session) => {
    const gross = Number(session.revenue) || 0;
    const split = Number(session.studioSplit) || 0;
    if (gross > 0 && split > 0) return Math.round((split / gross) * 100);
    return 0;
  };

  for (const s of sessions) {
    // Case A: studioId set but the partner is gone — recreate it with the SAME id so every
    // session sharing that studioId re-links at once.
    if (s.studioId && !byId.has(s.studioId)) {
      const parsed = parseStudio(s);
      if (parsed?.name) {
        const existing = byName.get(parsed.name.toLowerCase());
        if (existing) {
          if (s.studioId !== existing.id) { s.studioId = existing.id; changed = true; }
        } else {
          const np = makePartner(s.studioId, parsed.name, parsed.location, inferSharePct(s));
          partners.push(np); byId.set(np.id, np); byName.set(parsed.name.toLowerCase(), np);
          changed = true;
        }
      }
      continue;
    }
    // Case B: no studioId, but the session is clearly an in-person studio booking
    // (physical location + a "Studio - Location" name). Never matches virtual 1:1s.
    if (!s.studioId && !looksVirtual(s)) {
      const physical = s.locationType === "physical"
        || (!!s.locationAddress && s.locationType !== "zoom" && s.locationType !== "custom");
      const parsed = parseStudio(s);
      if (parsed?.name && physical) {
        const existing = byName.get(parsed.name.toLowerCase());
        if (existing) { s.studioId = existing.id; changed = true; }
        else {
          const np = makePartner(uid("sp"), parsed.name, parsed.location);
          partners.push(np); byId.set(np.id, np); byName.set(parsed.name.toLowerCase(), np);
          s.studioId = np.id; changed = true;
        }
      }
    }
  }
  return { sessions: changed ? sessions : sessionsIn, partners: changed ? partners : partnersIn, changed };
}

/** Apply studio-partner self-healing to a full CRM data object (no-op if nothing changed). */
export function healStudioPartnersData(d) {
  if (!d || typeof d !== "object") return d;
  const { sessions, partners, changed } = healStudioPartners(d.sessions, d.partners);
  return changed ? { ...d, sessions, partners } : d;
}
