import { ClipboardList, FileSignature, CalendarCheck, CheckCircle } from "lucide-react";
import { C } from "./theme.js";
import { fmtDate } from "./format.js";

export const STATUS = ["Lead", "Booked", "Attended 1x", "Engaged (2-3x)", "Member (4+)", "Advocate"];
export const STATUS_COLOR = {
  "Lead": "#9FB2CC", "Booked": "#6FA8E8", "Attended 1x": "#3F87DC",
  "Engaged (2-3x)": "#2F6FD0", "Member (4+)": "#234E9E", "Advocate": "#13245C",
};

/* ---------- Client segmentation ---------- */
export const CLIENT_TYPE = [
  "First-time attendee", "Repeat attendee", "Member", "Advocate",
  "Referral source", "Private client", "Studio attendee", "Virtual attendee",
  "Corporate attendee", "High-value lead", "Past client — reactivate",
];
export const CLIENT_TYPE_COLOR = {
  "First-time attendee":       "#9FB2CC",
  "Repeat attendee":           "#5FB0F2",
  "Member":                    "#2F6FD0",
  "Advocate":                  "#4A8C6F",
  "Referral source":           "#D9892B",
  "Private client":            C.brand,
  "Studio attendee":           "#7B68EE",
  "Virtual attendee":          "#6BB8A0",
  "Corporate attendee":        "#13245C",
  "High-value lead":           "#E1A020",
  "Past client — reactivate":  "#C0573F",
};
export const INTENT_TAGS = [
  "Stress relief", "Anxiety", "Burnout", "Performance", "Grief",
  "Letting go", "Self-confidence", "Nervous system reset",
  "Transformation seeker", "Spiritual growth", "Corporate wellness",
];
export const TAG_COLOR = {
  "Stress relief":        "#3A8BCD",
  "Anxiety":              "#5FB0F2",
  "Burnout":              "#D9892B",
  "Performance":          "#4A8C6F",
  "Grief":                "#7B68EE",
  "Letting go":           "#9B7EC8",
  "Self-confidence":      "#E1A020",
  "Nervous system reset": "#2F6FD0",
  "Transformation seeker":"#C0573F",
  "Spiritual growth":     "#8B4E9E",
  "Corporate wellness":   "#13245C",
};
export const STAGE = [
  "Target identified", "Researched", "Initial outreach sent", "Follow-up needed",
  "Discovery call booked", "Demo session offered", "Demo completed",
  "Pilot proposed", "Agreement sent", "Agreement signed",
  "First session scheduled", "Pilot completed", "Recurring partner", "Lost / not a fit",
  "Nurture later",
];
export const STAGE_COLOR = {
  "Target identified":       "#C5D5E8",
  "Researched":              "#A8BFDA",
  "Initial outreach sent":   "#8AAFD0",
  "Follow-up needed":        "#D9892B",
  "Discovery call booked":   "#6FA8E8",
  "Demo session offered":    "#5B9FE0",
  "Demo completed":          "#4A90D9",
  "Pilot proposed":          "#3A7FCC",
  "Agreement sent":          "#2F6FD0",
  "Agreement signed":        "#2661BE",
  "First session scheduled": "#1E52AC",
  "Pilot completed":         "#16429A",
  "Recurring partner":       "#13245C",
  "Lost / not a fit":        "#9FB2CC",
  "Nurture later":           "#B0A0CC",
};
export const STUDIO_TYPE = ["Yoga", "Gym", "Pilates", "Meditation", "Wellness", "Corporate", "CrossFit", "Dance", "Other"];
// studioType may be a legacy string or a new array — always display as a string

export const CLOSE_PROB = ["Low", "Medium", "High", "Closed Won", "Closed Lost"];
export const CLOSE_PROB_COLOR = { Low: "#9FB2CC", Medium: C.gold, High: "#4A8C6F", "Closed Won": "#13245C", "Closed Lost": "#C0573F" };
export const CONTRACT_STATUS = ["None", "Drafted", "Sent", "Signed"];

export const PARTNER_CHECKLIST_PHASES = [
  {
    id: "pre_sign",
    label: "Before Signing",
    color: "#2E6FB0",
    bg: "#EEF4FF",
    Icon: ClipboardList,
    items: [
      { id: "discovery_call",   label: "Discovery call completed"   },
      { id: "revenue_discussed",label: "Revenue split discussed"    },
      { id: "capacity_confirmed",label: "Capacity confirmed"        },
      { id: "insurance_answered",label: "Insurance question answered"},
      { id: "decision_maker",   label: "Decision maker identified"  },
    ],
  },
  {
    id: "post_sign",
    label: "After Signing",
    color: "#6B5CE7",
    bg: "#EEEAFF",
    Icon: FileSignature,
    items: [
      { id: "agreement_uploaded",label: "Agreement uploaded"        },
      { id: "booking_page",      label: "Booking page created"      },
      { id: "qr_code",           label: "QR code created"           },
      { id: "event_flyer",       label: "Event flyer created"       },
      { id: "studio_email",      label: "Studio email copy sent"    },
      { id: "social_posts",      label: "Social posts sent"         },
      { id: "waiver_link",       label: "Waiver link confirmed"     },
      { id: "payment_flow",      label: "Payment flow tested"       },
    ],
  },
  {
    id: "pre_event",
    label: "Before Event",
    color: "#D9892B",
    bg: "#FFF8ED",
    Icon: CalendarCheck,
    items: [
      { id: "registration_checked",label: "Registration count checked"},
      { id: "reminder_email",    label: "Reminder email sent"       },
      { id: "room_setup",        label: "Room setup confirmed"      },
      { id: "equipment_packed",  label: "Equipment packed"          },
      { id: "arrival_confirmed", label: "Arrival time confirmed"    },
    ],
  },
  {
    id: "post_event",
    label: "After Event",
    color: "#4A8C6F",
    bg: "#E2F0EA",
    Icon: CheckCircle,
    items: [
      { id: "revenue_reconciled",label: "Revenue reconciled"        },
      { id: "studio_paid",       label: "Studio paid"               },
      { id: "followup_sent",     label: "Follow-up sent to attendees"},
      { id: "testimonials_requested", label: "Testimonials requested"},
      { id: "next_date",         label: "Next date proposed"        },
    ],
  },
];
export const PARTNER_CHECKLIST = PARTNER_CHECKLIST_PHASES.flatMap(p => p.items.map(i => ({ ...i, phase: p.id })));
export const emptyChecklist = () => Object.fromEntries(PARTNER_CHECKLIST.map(i => [i.id, false]));
export const FUTYPE = ["24h", "72h", "Referral", "Reactivation"];
export const FUTYPE_COLOR = { "24h": "#3F87DC", "72h": "#2F6FD0", "Referral": "#D9892B", "Reactivation": "#9FB2CC" };

export const SOURCE = ["Post-session", "Referral", "Studio partner", "Calendly", "Instagram", "TikTok", "Email", "LinkedIn", "Direct outreach", "Walk-in", "Other"];
export const SOURCE_COLOR = { "Post-session": C.brand, "Referral": "#4A8C6F", "Studio partner": "#2F6FD0", "Calendly": "#00A2FF", "Instagram": "#E1306C", "TikTok": "#010101", "Email": "#D9892B", "LinkedIn": "#0077B5", "Direct outreach": "#7B68EE", "Walk-in": "#9FB2CC", "Other": C.ink3 };
export const PACKAGE = ["None", "Drop-in", "3-pack", "5-pack", "Membership"];
export const REFERRAL = ["Low", "Medium", "High"];
export const REFERRAL_COLOR = { Low: "#9FB2CC", Medium: "#3F87DC", High: "#D9892B" };
export const OFFER_TYPE = [
  "Single session", "3-pack", "6-pack", "12-pack",
  "Private session", "Studio pilot", "Studio recurring agreement",
  "Corporate event", "Group event", "Referral partner offer",
];
export const OFFER_STATUS = ["Drafted", "Sent", "Viewed", "Follow-up due", "Accepted", "Paid", "Declined", "Expired"];
export const OFFER_STATUS_COLOR = {
  "Drafted":        "#9FB2CC",
  "Sent":           "#5FB0F2",
  "Viewed":         "#7B68EE",
  "Follow-up due":  "#D9892B",
  "Accepted":       "#4A8C6F",
  "Paid":           "#2F6FD0",
  "Declined":       "#C0573F",
  "Expired":        "#B0B8C1",
};
export const OFFER_PROB = ["10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"];
export const OPEN_STATUSES = ["Drafted", "Sent", "Viewed", "Follow-up due"];
export const WON_STATUSES  = ["Accepted", "Paid"];
export const LOST_STATUSES = ["Declined", "Expired"];
/** Terminal offer statuses — not "still open" for expiry / pipeline alerts. */
export const CLOSED_OFFER_STATUSES = [...WON_STATUSES, ...LOST_STATUSES];

/* ---------- Referral tracking constants ---------- */
export const REF_STATUS = ["Referred", "Contacted", "Attended", "Purchased", "Inactive"];
export const REF_STATUS_COLOR = {
  "Referred":  "#9FB2CC",
  "Contacted": "#5FB0F2",
  "Attended":  "#3F87DC",
  "Purchased": "#4A8C6F",
  "Inactive":  "#C0573F",
};

/* ── OUTREACH HUB ── */
export const OUTREACH_STATUS = ["Not contacted","Messaged","Responded","Demo offered","Demo scheduled","Agreement pending","Won","Declined","Inactive"];
export const OUTREACH_STATUS_COLOR = {
  "Not contacted":     "#9E9E9E",
  "Messaged":          "#5FB0F2",
  "Responded":         "#3F87DC",
  "Demo offered":      "#6B5CE7",
  "Demo scheduled":    "#2E6FB0",
  "Agreement pending": "#E07020",
  "Won":               "#4A8C6F",
  "Declined":          "#C0573F",
  "Inactive":          "#AAAAAA",
};
export const OUTREACH_CLOSED_STATUSES = ["Won", "Declined", "Inactive"];
export const OUTREACH_NO_RESPONSE = ["No response", "Ghosted"];
export const OUTREACH_WARMTH       = ["Cold","Warm","Hot"];
export const OUTREACH_WARMTH_COLOR = { Cold: "#9E9E9E", Warm: "#E09040", Hot: "#C0573F" };
export const OUTREACH_TARGET_TYPE  = ["Studio","Referral Partner","Corporate","Gym","Wellness Center","Media","Influencer","Other"];
export const OUTREACH_RESPONSE     = ["Pending","Responded","No response","Ghosted","Interested","Not interested"];
export const OUTREACH_SOURCE       = ["Instagram DM","Email","Cold outreach","Referral","In person","LinkedIn","Event","Google","Other"];
export const OUTREACH_PRIORITY     = ["High","Medium","Low"];
export const OUTREACH_PRIORITY_COLOR = { High: "#C0573F", Medium: "#E09040", Low: "#9E9E9E" };

/* ── TESTIMONIALS ── */
export const TESTIMONIAL_STATUS = ["Breakthrough noted","Request sent","Received","Approved","Published","Declined"];
export const TESTIMONIAL_STATUS_COLOR = {
  "Breakthrough noted": "#D9892B",
  "Request sent":       "#5FB0F2",
  "Received":           "#3F87DC",
  "Approved":           "#6B5CE7",
  "Published":          "#4A8C6F",
  "Declined":           "#C0573F",
};
export const TESTIMONIAL_ACTION_STATUSES = ["Breakthrough noted", "Request sent"];
export const TESTIMONIAL_TYPE   = ["Written","Video","Audio","Quote only"];
export const TESTIMONIAL_THEMES = [
  "Stress relief","Emotional release","Mental clarity","Emotional breakthrough",
  "Improved sleep","Performance","Grief processing","Anxiety relief",
  "Confidence","Spiritual growth","Nervous system reset","Physical release",
];

/* ── Workflow pipeline stage groupings (must match STAGE / CLIENT_TYPE / SESSION_STATUS / OFFER_STATUS) ── */
export const CLIENT_TYPE_LEAD = ["High-value lead"];
export const CLIENT_TYPE_FIRST = ["First-time attendee"];
export const CLIENT_TYPE_REPEAT = ["Repeat attendee", "Member", "Private client", "Corporate attendee", "Virtual attendee", "Studio attendee"];
export const CLIENT_TYPE_ADVOCATE = ["Advocate", "Referral source"];
export const CLIENT_TYPE_DORMANT = "Past client — reactivate";

export const PARTNER_STAGE_TARGET  = ["Target identified", "Researched", "Initial outreach sent", "Follow-up needed"];
export const PARTNER_STAGE_DEMO    = ["Discovery call booked", "Demo session offered", "Demo completed"];
export const PARTNER_STAGE_PILOT   = ["Pilot proposed", "Agreement sent", "Agreement signed", "First session scheduled", "Pilot completed"];
export const PARTNER_STAGE_ACTIVE  = ["Recurring partner"];
export const PARTNER_STAGE_HOT     = ["Demo completed", "Pilot proposed", "Agreement sent", "Discovery call booked", "Demo session offered"];

export const SESSION_STATUS_PROMOTED = ["Booking open", "Promotion active", "Almost full"];

/** Join option arrays for admin schema `values` strings (middle-dot separator). */
export const schemaValues = (arr) => (arr || []).join(" · ");

/**
 * Canonical CRM field names (runtime store / FIELDS / seed).
 * Admin schema docs and integrity checks must use these — not legacy aliases
 * like offers.amount, offers.client, testimonials.permissionRec, referrals.referrer.
 */
export const FIELD = {
  clientType: "clientType",
  offerClientId: "clientId",
  offerType: "offerType",
  offerPrice: "price",
  offerExpireDate: "expireDate",
  testimonialClientId: "clientId",
  permissionReceived: "permissionReceived",
  useOnWebsite: "useOnWebsite",
  useOnSocial: "useOnSocial",
  referrerId: "referrerId",
  referredName: "referredName",
  sessionRevenue: "revenue",
  sessionNetRevenue: "netRevenue",
  sessionStudioId: "studioId",
};

/* ── MESSAGE TEMPLATES ── */
export const TMPL_CATEGORY = ["Studio Outreach","Studio Sales","Post-Session","Sales & Offers","Engagement","Operations"];
export const TMPL_CATEGORY_COLOR = {
  "Studio Outreach": "#6B5CE7",
  "Studio Sales":    "#2E6FB0",
  "Post-Session":    "#4A8C6F",
  "Sales & Offers":  C.brand,
  "Engagement":      "#D9892B",
  "Operations":      "#9E9E9E",
};
export const TMPL_CHANNEL       = ["Email","SMS","DM"];
export const TMPL_CHANNEL_COLOR = { Email:"#D9892B", SMS:"#4A8C6F", DM:"#E1306C" };
export const TMPL_LINKED_TO     = ["clients","partners","sessions","any"];

export const EXPENSE_CATEGORY = [
  "Equipment & Supplies","Software & Subscriptions","Marketing & Advertising",
  "Travel & Transport","Education & Training","Professional Services",
  "Insurance","Administrative","Studio & Venue","Studio Split","Refunds & Cancellations","Other",
];
export const EXPENSE_CATEGORY_COLOR = {
  "Equipment & Supplies":    "#2E6FB0",
  "Software & Subscriptions":"#6B5CE7",
  "Marketing & Advertising": "#D9892B",
  "Travel & Transport":      "#2A9D8F",
  "Education & Training":    "#4A8C6F",
  "Professional Services":   "#8E44AD",
  "Insurance":               "#C0392B",
  "Administrative":          "#55627B",
  "Studio & Venue":          "#16A085",
  "Studio Split":            "#C99A2E",
  "Refunds & Cancellations": "#B0413E",
  "Other":                   "#8A96AC",
};
export const EXPENSE_PAYMENT_METHOD = ["Credit Card","Bank Transfer","Cash","Check","Other"];
export const EXPENSE_RECUR_FREQ     = ["One-time","Monthly","Quarterly","Annual"];


/* ---------- Revenue constants ---------- */
export const REV_CHANNEL = [
  "Studio session", "Virtual session", "Private client", "Group package",
  "Corporate event", "Referral partner", "Paid ad", "Organic Instagram",
  "Email list", "Studio partner",
];
export const REV_CHANNEL_COLOR = {
  "Studio session":    "#2F6FD0",
  "Virtual session":   "#4A8C6F",
  "Private client":    C.brand,
  "Group package":     "#7B68EE",
  "Corporate event":   "#D9892B",
  "Referral partner":  "#E1306C",
  "Paid ad":           "#C0573F",
  "Organic Instagram": "#E4405F",
  "Email list":        "#D9892B",
  "Studio partner":    "#13245C",
};
export const COST_CENTER = [
  "Studio sessions", "Virtual sessions", "Private sessions",
  "Packages", "Corporate", "Referral", "Marketing",
];
// Convert a dollar float to the nearest integer cent to avoid IEEE-754 drift when accumulating.

export const CONTENT_TYPE = ["Transformation", "Education", "Invite", "Testimonial"]; // legacy compat
export const PLATFORM = ["Instagram","TikTok","Email","YouTube","LinkedIn","Facebook","Threads","Other"];
export const PLATFORM_COLOR = { Instagram:"#E1306C", TikTok:"#010101", Email:"#D9892B", YouTube:"#FF0000", LinkedIn:"#0077B5", Facebook:"#1877F2", Threads:"#000000", Other: C.ink3 };
export const CONTENT_STATUS = ["Idea","Draft","Scheduled","Published","Archived"];
export const CONTENT_STATUS_COLOR = { "Idea":"#9E9E9E","Draft":"#5FB0F2","Scheduled":"#6B5CE7","Published":"#4A8C6F","Archived":"#CCCCCC" };
export const CONTENT_CATEGORY = [
  "Client transformation","Breathwork education","Nervous system regulation",
  "Behind the scenes","Studio partner promotion","Founder story",
  "Testimonials","FAQs","Safety & contraindications","Upcoming sessions",
];
export const CONTENT_CAT_COLOR = {
  "Client transformation":      "#C0573F",
  "Breathwork education":       "#3F87DC",
  "Nervous system regulation":  "#4A8C6F",
  "Behind the scenes":          "#9B7A2E",
  "Studio partner promotion":   "#6B5CE7",
  "Founder story":              "#D9892B",
  "Testimonials":               "#2E6FB0",
  "FAQs":                       "#7B68EE",
  "Safety & contraindications": "#9E9E9E",
  "Upcoming sessions":          C.brand,
};
export const CONTENT_CTA = ["Book a session","DM me","Link in bio","Sign up","Comment below","Save this","Share with a friend","None"];

export const SESSION_STATUS = ["Planned", "Booking open", "Promotion active", "Almost full", "Completed", "Follow-up pending", "Closed out"];
export const SESSION_STATUS_COLOR = {
  "Planned":           "#9FB2CC",
  "Booking open":      "#6FA8E8",
  "Promotion active":  "#D9892B",
  "Almost full":       "#4A8C6F",
  "Completed":         C.brand,
  "Follow-up pending": "#C0573F",
  "Closed out":        C.brandDeep,
};
export const JOURNEY_TYPES = ["Reset & Release", "Letting Go & Rebirth", "Nervous System Reset", "Breathwork Basics", "Deep Surrender", "Heart Opening", "Energy Activation", "Grief & Healing", "New Moon Ceremony", "Custom"];
export const SETUP_STATUS = ["Not started", "In progress", "Ready"];

export const FU_STEPS = [
  { id: "same_day", label: "Same Day",    delayDays: 0,  channel: "email", accent: "#3A8BCD" },
  { id: "h24",      label: "24 Hours",    delayDays: 1,  channel: "email", accent: "#7B68EE" },
  { id: "h72",      label: "48–72 Hours", delayDays: 3,  channel: "email", accent: "#D9892B" },
  { id: "d5",       label: "5–7 Days",    delayDays: 6,  channel: "email", accent: "#4A8C6F" },
  { id: "d14",      label: "14–21 Days",  delayDays: 14, channel: "email", accent: "#9B7EC8" },
];

export const FU_TEMPLATES = {
  same_day:
`Hi {first_name}! Thank you so much for breathing with me today. 💙 You showed up and that matters. Tonight: drink lots of water, take it easy, and let your body rest. Your nervous system is integrating something real. I'm honored to have shared that space with you. 🌊`,

  h24:
`Hey {first_name} — just checking in. How are you feeling today, one day after? Sometimes the shift is quiet at first, and then it lands. Anything come up for you? I'd love to hear — no pressure, just holding space. 🙏`,

  h72:
`Hi {first_name},

I've been thinking about you since our session.

If what happened in that room opened something for you, the best move right now is not to let it close. The 72-hour window after breathwork is real — this is when decisions stick.

I'd love to invite you to commit to three sessions. Clients who come three times in a row see a completely different result than those who try it once and wait.

I have a 3-pack available — three full sessions. Want me to hold a spot for you?

Just reply here and I'll take care of it. Breathing with you was an honor.`,

  d5:
`Hi {first_name},

It's been about a week since our session. I hope you've been noticing little shifts — in how you breathe when things get stressful, in how fast you come back to yourself.

Two quick asks:

1. Would you be willing to share a few words about your experience? A short testimonial helps others find this work and takes about 2 minutes. I'd be so grateful.

2. Do you know someone going through something hard — stress, grief, anxiety, burnout? A personal introduction from you means everything to them and to me.

Either way — thank you for showing up. It matters more than you know.`,

  d14:
`Hey {first_name} — it's been a couple of weeks since we breathed together. I've been thinking about you. How are things?

I have a session coming up that I think would be exactly right for where you are right now. I'd love to see you back in the room. 💙`,
};

export function interpolateTemplate(template, client, seq) {
  const fullName = (client?.name || "there").trim();
  const firstName = fullName.split(" ")[0];
  return (template || "")
    .replace(/\{name\}/g, fullName)
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{session_name\}/g, seq?.sessionName || "our session")
    .replace(/\{session_date\}/g, seq?.sessionDate ? fmtDate(seq.sessionDate) : "");
}

export function addDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function makeSequenceSteps(startDate) {
  return FU_STEPS.map(s => ({
    stepId: s.id,
    dueDate: addDays(startDate, s.delayDays),
    sent: false,
    sentAt: "",
    notes: "",
  }));
}

/* ── USER MANAGEMENT ── */
export const USER_ROLES = ["Owner", "Admin", "Editor", "Viewer"];
export const USER_ROLE_COLOR = { Owner: "#4A8C6F", Admin: "#2E6FB0", Editor: C.brand, Viewer: C.ink3 };
export const USER_COLORS = ["#2E6FB0","#6B5CE7","#D9892B","#4A8C6F",C.brand,"#C0392B","#8E44AD","#16A085"];
export const ROLE_PERMISSIONS = {
  Owner:  { view: true,  edit: true,  delete: true,  manage: true  },
  Admin:  { view: true,  edit: true,  delete: true,  manage: false },
  Editor: { view: true,  edit: true,  delete: false, manage: false },
  Viewer: { view: true,  edit: false, delete: false, manage: false },
};

/**
 * Sidebar section visibility beyond the default (all roles with view).
 * Omitted section ids are visible to every authenticated role.
 * In-view action gates (can.edit / Owner checks) remain defense-in-depth.
 */
export const SECTION_ACCESS = {
  users: { manage: true }, // User Management — Owner (or explicit manage permission)
};

/**
 * Admin tab visibility by layout id (see VIEWS.admin in App.jsx).
 * Omitted layouts are visible to every authenticated role.
 * Destructive actions inside visible tabs stay Owner-gated in AdminView.
 */
export const ADMIN_TAB_ACCESS = {
  "admin-settings": { roles: ["Owner", "Admin"] },
  "admin-reset":    { roles: ["Owner"] },
};

/** Whether a sidebar section should appear for this user. */
export function canAccessSection(sectionId, user) {
  const rule = SECTION_ACCESS[sectionId];
  if (!rule) return true;
  if (rule.manage) return user?.role === "Owner" || !!user?.permissions?.manage;
  if (rule.roles) return rule.roles.includes(user?.role);
  return true;
}

/** Whether an Admin tab layout should appear for this user. */
export function canAccessAdminTab(layout, user) {
  const rule = ADMIN_TAB_ACCESS[layout];
  if (!rule) return true;
  if (rule.roles) return rule.roles.includes(user?.role);
  return true;
}
