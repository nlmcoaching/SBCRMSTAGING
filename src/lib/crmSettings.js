export const CRM_SETTINGS_KEY = "sb:crm-settings:v1";
export const DEFAULT_CRM_SETTINGS = {
  sources:       ["Post-session", "Referral", "Studio partner", "Instagram", "TikTok", "Email", "LinkedIn", "Direct outreach", "Walk-in", "Other"],
  clientTypes:   ["First-time attendee", "Repeat attendee", "Member", "Advocate", "Referral source", "Private client", "Studio attendee", "Virtual attendee", "Corporate attendee", "High-value lead", "Past client — reactivate"],
  packageTypes:  ["None", "Drop-in", "3-pack", "5-pack", "Membership"],
  referralLevels:["Low", "Medium", "High"],
  offerTypes:    ["Single session", "3-pack", "6-pack", "12-pack", "Private session", "Studio pilot", "Studio recurring agreement", "Corporate event", "Group event", "Referral partner offer"],
  journeys:      ["Breathwork Basics", "Reset & Release", "Nervous System Reset", "Letting Go & Rebirth", "Deep Surrender", "New Moon Ceremony", "Welcome Journey", "Breakthrough Session"],
  journeyDescriptions: [
    { id: "jd1", name: "Breathwork Basics",       description: "" },
    { id: "jd2", name: "Reset & Release",         description: "" },
    { id: "jd3", name: "Nervous System Reset",    description: "" },
    { id: "jd4", name: "Letting Go & Rebirth",    description: "" },
    { id: "jd5", name: "Deep Surrender",          description: "" },
    { id: "jd6", name: "New Moon Ceremony",       description: "" },
    { id: "jd7", name: "Welcome Journey",         description: "" },
    { id: "jd8", name: "Breakthrough Session",    description: "" },
  ],
  clientStatuses:["Lead", "Booked", "Attended 1x", "Engaged (2-3x)", "Member (4+)", "Advocate", "Inactive"],
  // ISO timestamp — Calendly events whose createdAt is before this date are ignored during sync.
  // Set to the date of your production reset to prevent old test bookings from re-appearing.
  calendlySyncFromDate: "2026-07-01T00:00:00.000Z",
};
export function parseCrmSettings(parsed) {
  if (!parsed || typeof parsed !== "object") return JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS));
  const merged = Object.fromEntries(Object.keys(DEFAULT_CRM_SETTINGS).map(k => {
    // calendlySyncFromDate is a string (not array) — use nullish coalescing so empty string is preserved.
    if (k === "calendlySyncFromDate") return [k, parsed[k] != null ? parsed[k] : DEFAULT_CRM_SETTINGS[k]];
    return [k, parsed[k] || DEFAULT_CRM_SETTINGS[k]];
  }));
  if (!Array.isArray(merged.journeyDescriptions) || (merged.journeyDescriptions.length > 0 && typeof merged.journeyDescriptions[0] === "string")) {
    merged.journeyDescriptions = JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS.journeyDescriptions));
  }
  return merged;
}
export function loadCrmSettings() {
  try {
    const stored = localStorage.getItem(CRM_SETTINGS_KEY);
    if (!stored) return JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS));
    return parseCrmSettings(JSON.parse(stored));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS)); }
}
// Module-level mutable references (updated when settings load/change)
export let _crmSettings = loadCrmSettings();
export const getS = () => _crmSettings;
export const setCrmSettings = (next) => { _crmSettings = next; };
