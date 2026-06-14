import { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
  Zap, Copy, Clock, TrendingUp, BarChart2,
} from "lucide-react";

/* ============================================================
   Simply Breathe OS — CRM
   Calm, breath-themed operating system for a breathwork practice.
   Data is seeded from the six source files and pre-wired:
     Sessions  -> Studio Partners
     Offers    -> Clients
     Follow-Ups-> Clients
   ============================================================ */

const C = {
  bg: "#ECF1F8", surface: "#FFFFFF", surfaceAlt: "#F4F7FC",
  ink: "#16213A", ink2: "#55627B", ink3: "#8A96AC",
  line: "#E0E7F1", lineSoft: "#ECF1F7",
  brand: "#2F6FD0", brandDeep: "#13245C", brandSoft: "#DBE8FB", brandMist: "#EDF3FE",
  gold: "#D9892B", goldSoft: "#F6EAD6",
};

const LOGO = "data:image/png;base64,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";
const STATUS = ["Lead", "Booked", "Attended 1x", "Engaged (2-3x)", "Member (4+)", "Advocate"];
const STATUS_COLOR = {
  "Lead": "#9FB2CC", "Booked": "#6FA8E8", "Attended 1x": "#3F87DC",
  "Engaged (2-3x)": "#2F6FD0", "Member (4+)": "#234E9E", "Advocate": "#13245C",
};

/* ---------- Client segmentation ---------- */
const CLIENT_TYPE = [
  "First-time attendee", "Repeat attendee", "Member", "Advocate",
  "Referral source", "Private client", "Studio attendee", "Virtual attendee",
  "Corporate attendee", "High-value lead", "Past client — reactivate",
];
const CLIENT_TYPE_COLOR = {
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
const INTENT_TAGS = [
  "Stress relief", "Anxiety", "Burnout", "Performance", "Grief",
  "Letting go", "Self-confidence", "Nervous system reset",
  "Transformation seeker", "Spiritual growth", "Corporate wellness",
];
const TAG_COLOR = {
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
const STAGE = [
  "Target identified", "Researched", "Initial outreach sent", "Follow-up needed",
  "Discovery call booked", "Demo session offered", "Demo completed",
  "Pilot proposed", "Agreement sent", "Agreement signed",
  "First session scheduled", "Pilot completed", "Recurring partner", "Lost / not a fit",
];
const STAGE_COLOR = {
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
};
const STUDIO_TYPE = ["Yoga", "Gym", "Pilates", "Meditation", "Wellness", "Corporate", "CrossFit", "Dance", "Other"];
const CLOSE_PROB = ["Low", "Medium", "High", "Closed Won", "Closed Lost"];
const CLOSE_PROB_COLOR = { Low: "#9FB2CC", Medium: C.gold, High: "#4A8C6F", "Closed Won": "#13245C", "Closed Lost": "#C0573F" };
const CONTRACT_STATUS = ["None", "Drafted", "Sent", "Signed"];

const PARTNER_CHECKLIST = [
  // Legal
  { id: "agreement_sent",      label: "Agreement sent",                    cat: "Legal & Agreement" },
  { id: "agreement_signed",    label: "Agreement signed",                  cat: "Legal & Agreement" },
  { id: "liability_waiver",    label: "Liability waiver process confirmed", cat: "Legal & Agreement" },
  { id: "insurance_requested", label: "Insurance certificate requested",   cat: "Legal & Agreement" },
  { id: "insurance_received",  label: "Insurance certificate received",    cat: "Legal & Agreement" },
  // Finance
  { id: "revenue_split",       label: "Revenue split agreed",              cat: "Finance & Pricing" },
  { id: "ticket_price",        label: "Ticket price agreed",               cat: "Finance & Pricing" },
  { id: "min_attendance",      label: "Minimum attendance agreed",         cat: "Finance & Pricing" },
  { id: "payment_terms",       label: "Payment terms confirmed",           cat: "Finance & Pricing" },
  // Marketing
  { id: "promotion_plan",      label: "Promotion plan approved",           cat: "Marketing & Assets" },
  { id: "qr_code",             label: "QR code created",                   cat: "Marketing & Assets" },
  { id: "booking_page",        label: "Booking page created",              cat: "Marketing & Assets" },
  { id: "event_assets",        label: "Event assets delivered to studio",  cat: "Marketing & Assets" },
  // Operations
  { id: "room_setup",          label: "Room setup confirmed",              cat: "Operations" },
  { id: "followup_agreed",     label: "Post-session follow-up agreed",     cat: "Operations" },
];
const CHECKLIST_CATS = ["Legal & Agreement", "Finance & Pricing", "Marketing & Assets", "Operations"];
const CHECKLIST_CAT_COLOR = {
  "Legal & Agreement": "#4A8C6F",
  "Finance & Pricing": C.gold,
  "Marketing & Assets": C.brand,
  "Operations": "#7B68EE",
};
const emptyChecklist = () => Object.fromEntries(PARTNER_CHECKLIST.map((i) => [i.id, false]));
const FUTYPE = ["24h", "72h", "Referral", "Reactivation"];
const FUTYPE_COLOR = { "24h": "#3F87DC", "72h": "#2F6FD0", "Referral": "#D9892B", "Reactivation": "#9FB2CC" };
const SOURCE = ["Post-session", "Referral", "Studio partner", "Instagram", "TikTok", "Email", "LinkedIn", "Direct outreach", "Walk-in", "Other"];
const SOURCE_COLOR = { "Post-session": C.brand, "Referral": "#4A8C6F", "Studio partner": "#2F6FD0", "Instagram": "#E1306C", "TikTok": "#010101", "Email": "#D9892B", "LinkedIn": "#0077B5", "Direct outreach": "#7B68EE", "Walk-in": "#9FB2CC", "Other": C.ink3 };
const PACKAGE = ["None", "Drop-in", "3-pack", "5-pack", "Membership"];
const REFERRAL = ["Low", "Medium", "High"];
const REFERRAL_COLOR = { Low: "#9FB2CC", Medium: "#3F87DC", High: "#D9892B" };
const OFFER_TYPE = [
  "Single session", "3-pack", "6-pack", "12-pack",
  "Private session", "Studio pilot", "Studio recurring agreement",
  "Corporate event", "Group event", "Referral partner offer",
];
const OFFER_STATUS = ["Drafted", "Sent", "Viewed", "Follow-up due", "Accepted", "Paid", "Declined", "Expired"];
const OFFER_STATUS_COLOR = {
  "Drafted":        "#9FB2CC",
  "Sent":           "#5FB0F2",
  "Viewed":         "#7B68EE",
  "Follow-up due":  "#D9892B",
  "Accepted":       "#4A8C6F",
  "Paid":           "#2F6FD0",
  "Declined":       "#C0573F",
  "Expired":        "#B0B8C1",
};
const OFFER_PROB = ["10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"];
const OPEN_STATUSES = ["Drafted", "Sent", "Viewed", "Follow-up due"];
const WON_STATUSES  = ["Accepted", "Paid"];
const LOST_STATUSES = ["Declined", "Expired"];

/* ---------- Revenue constants ---------- */
const REV_CHANNEL = [
  "Studio session", "Virtual session", "Private client", "Group package",
  "Corporate event", "Referral partner", "Paid ad", "Organic Instagram",
  "Email list", "Studio partner",
];
const REV_CHANNEL_COLOR = {
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
const COST_CENTER = [
  "Studio sessions", "Virtual sessions", "Private sessions",
  "Packages", "Corporate", "Referral", "Marketing",
];
const calcNet = (r) =>
  Number(r.gross || 0) - Number(r.stripeFee || 0) - Number(r.studioSplit || 0) -
  Number(r.facilitatorCost || 0) - Number(r.refunds || 0);
const CONTENT_TYPE = ["Transformation", "Education", "Invite", "Testimonial"];
const PLATFORM = ["IG", "TikTok", "Email"];

const SESSION_STATUS = ["Planned", "Booking open", "Promotion active", "Almost full", "Completed", "Follow-up pending", "Closed out"];
const SESSION_STATUS_COLOR = {
  "Planned":           "#9FB2CC",
  "Booking open":      "#6FA8E8",
  "Promotion active":  "#D9892B",
  "Almost full":       "#4A8C6F",
  "Completed":         C.brand,
  "Follow-up pending": "#C0573F",
  "Closed out":        C.brandDeep,
};
const JOURNEY_TYPES = ["Reset & Release", "Letting Go & Rebirth", "Nervous System Reset", "Breathwork Basics", "Deep Surrender", "Heart Opening", "Energy Activation", "Grief & Healing", "New Moon Ceremony", "Custom"];
const SETUP_STATUS = ["Not started", "In progress", "Ready"];

const SESSION_CHECKLIST = [
  // Pre-session
  { id: "room_booked",        label: "Room booking confirmed with studio",    phase: "Pre-Session" },
  { id: "capacity_set",       label: "Capacity communicated to studio",       phase: "Pre-Session" },
  { id: "booking_live",       label: "Booking page / sign-up link live",      phase: "Pre-Session" },
  { id: "promo_sent",         label: "Promotional push sent to studio list",  phase: "Pre-Session" },
  { id: "equipment_packed",   label: "Equipment packed (headset, music, props)", phase: "Pre-Session" },
  { id: "room_setup_done",    label: "Room setup confirmed",                  phase: "Pre-Session" },
  { id: "audio_tested",       label: "Music & headset tested",                phase: "Pre-Session" },
  { id: "waivers_shared",     label: "Waiver link sent to registered attendees", phase: "Pre-Session" },
  // Post-session
  { id: "attendance_logged",  label: "Attendance count logged",               phase: "Post-Session" },
  { id: "revenue_recorded",   label: "Revenue recorded & split calculated",   phase: "Post-Session" },
  { id: "studio_paid",        label: "Studio split paid or invoiced",         phase: "Post-Session" },
  { id: "testimonials_done",  label: "Testimonials captured from attendees",  phase: "Post-Session" },
  { id: "followup_sent",      label: "24h follow-up email sent to attendees", phase: "Post-Session" },
  { id: "rebook_offered",     label: "Rebook offer made to attendees",        phase: "Post-Session" },
  { id: "referrals_asked",    label: "Referrals requested from advocates",    phase: "Post-Session" },
  { id: "notes_written",      label: "Session notes & learnings written",     phase: "Post-Session" },
];
const SESSION_CHECKLIST_PHASES = ["Pre-Session", "Post-Session"];
const SESSION_PHASE_COLOR = { "Pre-Session": C.brand, "Post-Session": "#4A8C6F" };
const emptySessionChecklist = () => Object.fromEntries(SESSION_CHECKLIST.map((i) => [i.id, false]));

/* ============================================================
   FOLLOW-UP SEQUENCE ENGINE
   ============================================================ */
const FU_STEPS = [
  { id: "same_day", label: "Same Day",    delayDays: 0,  channel: "text",  accent: "#3A8BCD" },
  { id: "h24",      label: "24 Hours",    delayDays: 1,  channel: "text",  accent: "#7B68EE" },
  { id: "h72",      label: "48–72 Hours", delayDays: 3,  channel: "email", accent: "#D9892B" },
  { id: "d5",       label: "5–7 Days",    delayDays: 6,  channel: "email", accent: "#4A8C6F" },
  { id: "d14",      label: "14–21 Days",  delayDays: 14, channel: "text",  accent: "#9B7EC8" },
];

const FU_TEMPLATES = {
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

function interpolateTemplate(template, client, seq) {
  const fullName = (client?.name || "there").trim();
  const firstName = fullName.split(" ")[0];
  return (template || "")
    .replace(/\{name\}/g, fullName)
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{session_name\}/g, seq?.sessionName || "our session")
    .replace(/\{session_date\}/g, seq?.sessionDate ? fmtDate(seq.sessionDate) : "");
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function makeSequenceSteps(startDate) {
  return FU_STEPS.map(s => ({
    stepId: s.id,
    dueDate: addDays(startDate, s.delayDays),
    sent: false,
    sentAt: "",
    notes: "",
  }));
}

/* ---------- Seed data (from the six source files, relations wired) ---------- */
const SEED = {
  partners: [
    { id: "sp1", name: "Sample - YogaSix Walnut Creek", studioType: "Yoga", location: "Walnut Creek, CA", contact: "Alyssa Tran", role: "Manager", email: "alyssa@example.com", phone: "555-0201", stage: "Recurring partner", estimatedCommunitySize: 320, bestFitJourney: "Reset & Release", revenuePotential: 2400, closeProbability: "Closed Won", revShare: "70/30 split (us/studio)", contractStatus: "Signed", outreachDate: "2026-03-01", lastTouch: "2026-06-11", nextAction: "2026-06-18", avgAttendance: 14, sessionsPerMonth: 4, insuranceReqs: "COI on file", promotionCommitments: "Monthly IG story + email to list", notes: "Thursday Reset is the anchor class; strong word of mouth. Alyssa is a champion.", checklist: { agreement_sent: true, agreement_signed: true, liability_waiver: true, insurance_requested: true, insurance_received: true, revenue_split: true, ticket_price: true, min_attendance: true, payment_terms: true, promotion_plan: true, qr_code: true, booking_page: true, event_assets: true, room_setup: true, followup_agreed: true } },
    { id: "sp2", name: "Sample - CorePower Lafayette", studioType: "Yoga", location: "Lafayette, CA", contact: "Mike Donnelly", role: "Owner", email: "mike@example.com", phone: "555-0202", stage: "Demo completed", estimatedCommunitySize: 280, bestFitJourney: "Letting Go & Rebirth", revenuePotential: 1800, closeProbability: "High", revShare: "Flat room fee $75", contractStatus: "None", outreachDate: "2026-05-10", lastTouch: "2026-06-03", nextAction: "2026-06-16", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "Needs COI before pilot", promotionCommitments: "TBD — discussing newsletter feature", notes: "Demo went well 6/3. Mike is interested but cautious. Follow up with pilot proposal this week.", checklist: { agreement_sent: false, agreement_signed: false, liability_waiver: false, insurance_requested: false, insurance_received: false, revenue_split: true, ticket_price: true, min_attendance: false, payment_terms: false, promotion_plan: false, qr_code: false, booking_page: false, event_assets: false, room_setup: false, followup_agreed: false } },
    { id: "sp3", name: "Sample - The Still Point", studioType: "Meditation", location: "Pleasant Hill, CA", contact: "Renee Park", role: "Director", email: "renee@example.com", phone: "555-0203", stage: "Pilot proposed", estimatedCommunitySize: 140, bestFitJourney: "Nervous System Reset", revenuePotential: 1200, closeProbability: "Medium", revShare: "80/20 split (us/studio)", contractStatus: "Drafted", outreachDate: "2026-04-15", lastTouch: "2026-06-05", nextAction: "2026-06-14", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "COI + liability waiver required", promotionCommitments: "4-week pilot feature on their blog", notes: "4-week Sunday evening pilot proposed. Contract drafted but not returned. Renee responsive over email.", checklist: { agreement_sent: true, agreement_signed: false, liability_waiver: false, insurance_requested: true, insurance_received: false, revenue_split: true, ticket_price: true, min_attendance: true, payment_terms: false, promotion_plan: false, qr_code: false, booking_page: false, event_assets: false, room_setup: false, followup_agreed: false } },
    { id: "sp4", name: "Sample - Flow State Studio", studioType: "Wellness", location: "Concord, CA", contact: "Tara Iverson", role: "Owner", email: "tara@example.com", phone: "555-0204", stage: "Initial outreach sent", estimatedCommunitySize: 90, bestFitJourney: "Breathwork Basics", revenuePotential: 900, closeProbability: "Low", revShare: "TBD", contractStatus: "None", outreachDate: "2026-06-09", lastTouch: "2026-06-09", nextAction: "2026-06-17", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "", promotionCommitments: "", notes: "Warm intro from Dana. Sent intro email 6/9. Waiting on reply.", checklist: emptyChecklist() },
    { id: "sp5", name: "Sample - Lotus & Pine", studioType: "Yoga", location: "Danville, CA", contact: "Geoff Adams", role: "Manager", email: "geoff@example.com", phone: "555-0205", stage: "Recurring partner", estimatedCommunitySize: 500, bestFitJourney: "Deep Surrender", revenuePotential: 5200, closeProbability: "Closed Won", revShare: "60/40 split (us/studio)", contractStatus: "Signed", outreachDate: "2026-01-15", lastTouch: "2026-06-10", nextAction: "2026-06-20", avgAttendance: 18, sessionsPerMonth: 8, insuranceReqs: "COI on file + annual renewal", promotionCommitments: "Co-branded social posts + monthly email feature", notes: "Two weekly slots plus monthly workshop. Best earner. Geoff wants to add a Friday morning slot.", checklist: { agreement_sent: true, agreement_signed: true, liability_waiver: true, insurance_requested: true, insurance_received: true, revenue_split: true, ticket_price: true, min_attendance: true, payment_terms: true, promotion_plan: true, qr_code: true, booking_page: true, event_assets: true, room_setup: true, followup_agreed: true } },
  ],
  clients: [
    { id: "c1", name: "Sample - Jordan Lee",   phone: "555-0101", email: "jordan@example.com", source: "Studio partner",  status: "Lead",          clientType: "High-value lead",          tags: ["Anxiety","Stress relief"],                              firstSession: "",           sessionsAttended: 0,  lastSession: "",           nextSession: "2026-06-12", packageType: "None",       lifetimeValue: 0,   notes: "Found us via YogaSix flyer; anxious about first session, wants calm intro",      referral: "Low"    },
    { id: "c2", name: "Sample - Maya Chen",    phone: "555-0102", email: "maya@example.com",   source: "Instagram",       status: "Booked",        clientType: "First-time attendee",      tags: ["Burnout","Stress relief"],                              firstSession: "",           sessionsAttended: 0,  lastSession: "",           nextSession: "2026-06-14", packageType: "None",       lifetimeValue: 0,   notes: "DM'd after breathwork reel; dealing with work burnout",                         referral: "Medium" },
    { id: "c3", name: "Sample - Chris Okafor", phone: "555-0103", email: "chris@example.com",  source: "Referral",        status: "Attended 1x",   clientType: "Repeat attendee",          tags: ["Letting go","Transformation seeker"],                   firstSession: "2026-06-01", sessionsAttended: 1,  lastSession: "2026-06-01", nextSession: "2026-06-15", packageType: "Drop-in",    lifetimeValue: 35,  notes: "Big emotional release in first session; referred by Maya",                      referral: "High"   },
    { id: "c4", name: "Sample - Priya Nair",   phone: "555-0104", email: "priya@example.com",  source: "Post-session",    status: "Engaged (2-3x)", clientType: "Repeat attendee",         tags: ["Nervous system reset","Stress relief"],                 firstSession: "2026-05-10", sessionsAttended: 3,  lastSession: "2026-06-07", nextSession: "2026-06-13", packageType: "3-pack",     lifetimeValue: 105, notes: "Sleep issues improving; mentioned wanting partner to join",                     referral: "Medium" },
    { id: "c5", name: "Sample - Sam Rivera",   phone: "555-0105", email: "sam@example.com",    source: "Studio partner",  status: "Member (4+)",   clientType: "Member",                   tags: ["Grief","Letting go","Transformation seeker"],            firstSession: "2026-04-02", sessionsAttended: 9,  lastSession: "2026-06-09", nextSession: "2026-06-16", packageType: "Membership", lifetimeValue: 540, notes: "Core regular; grief processing journey, very committed",                        referral: "High"   },
    { id: "c6", name: "Sample - Dana Wolfe",   phone: "555-0106", email: "dana@example.com",   source: "Referral",        status: "Advocate",      clientType: "Advocate",                 tags: ["Spiritual growth","Transformation seeker"],             firstSession: "2026-03-15", sessionsAttended: 12, lastSession: "2026-06-10", nextSession: "2026-06-17", packageType: "5-pack",     lifetimeValue: 610, notes: "Has referred 3 friends; natural community builder",                            referral: "High"   },
  ],
  sessions: [
    { id: "se1", name: "Sample - YogaSix Thursday Reset 6/4", studioId: "sp1", date: "2026-06-04", time: "7:00 PM", status: "Closed out", journey: "Reset & Release", capacity: 18, registered: 15, attendance: 13, paidAttendees: 13, waivers: 12, noShows: 2, revenue: 455, studioSplit: 136.5, netRevenue: 318.5, conversion: 0.31, packagesSold: 2, referralsGenerated: 1, equipmentNeeded: "Headset, portable speaker, lavender oil", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 1, followUpSent: true, rebookOfferSent: true, referralsRequested: true, notes: "Sound bath close landed well; 2 three-packs sold at door", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: true, followup_sent: true, rebook_offered: true, referrals_asked: true, notes_written: true } },
    { id: "se2", name: "Sample - YogaSix Thursday Reset 6/11", studioId: "sp1", date: "2026-06-11", time: "7:00 PM", status: "Follow-up pending", journey: "Reset & Release", capacity: 18, registered: 18, attendance: 16, paidAttendees: 16, waivers: 15, noShows: 2, revenue: 560, studioSplit: 168, netRevenue: 392, conversion: 0.38, packagesSold: 3, referralsGenerated: 2, equipmentNeeded: "Headset, portable speaker, eye masks", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 2, followUpSent: false, rebookOfferSent: false, referralsRequested: false, notes: "Best turnout yet; Priya brought a friend. Room hit capacity — talk to Alyssa about expanding.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: false, testimonials_done: true, followup_sent: false, rebook_offered: false, referrals_asked: false, notes_written: false } },
    { id: "se3", name: "Sample - Lotus & Pine Sunday Slow Down 6/7", studioId: "sp5", date: "2026-06-07", time: "5:00 PM", status: "Closed out", journey: "Deep Surrender", capacity: 24, registered: 21, attendance: 19, paidAttendees: 19, waivers: 18, noShows: 2, revenue: 665, studioSplit: 266, netRevenue: 399, conversion: 0.26, packagesSold: 2, referralsGenerated: 0, equipmentNeeded: "Headset, speaker, singing bowl, blankets", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 0, followUpSent: true, rebookOfferSent: true, referralsRequested: false, notes: "Room near capacity; pitch membership earlier next time. No testimonials captured — add request at end.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: false, followup_sent: true, rebook_offered: true, referrals_asked: false, notes_written: true } },
    { id: "se4", name: "Sample - Lotus & Pine New Moon Workshop 6/9", studioId: "sp5", date: "2026-06-09", time: "7:30 PM", status: "Closed out", journey: "New Moon Ceremony", capacity: 30, registered: 25, attendance: 22, paidAttendees: 20, waivers: 20, noShows: 3, revenue: 1100, studioSplit: 440, netRevenue: 660, conversion: 0.18, packagesSold: 1, referralsGenerated: 3, equipmentNeeded: "Headset, speaker, candles, intention cards, journal prompts", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 3, followUpSent: true, rebookOfferSent: true, referralsRequested: true, notes: "Workshop format converts slower but generates referrals. 2 unpaid attendees — tighten payment flow.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: true, followup_sent: true, rebook_offered: true, referrals_asked: true, notes_written: true } },
  ],
  offers: [
    { id: "o1",  name: "Sample - Chris / 3-pack",                  clientId: "c3", offerType: "3-pack",                    price: 105, status: "Sent",           dateOffered: "2026-06-01", expireDate: "2026-06-15", followUpDate: "2026-06-08",  probability: "60%", source: "Post-session",    notes: "Said he'd think about it",         reasonLost: "" },
    { id: "o2",  name: "Sample - Priya / 3-pack",                  clientId: "c4", offerType: "3-pack",                    price: 105, status: "Paid",           dateOffered: "2026-05-10", expireDate: "",           followUpDate: "",           probability: "100%",source: "Post-session",    notes: "",                                 reasonLost: "" },
    { id: "o3",  name: "Sample - Sam / 6-pack",                    clientId: "c5", offerType: "6-pack",                    price: 195, status: "Accepted",       dateOffered: "2026-04-20", expireDate: "",           followUpDate: "",           probability: "90%", source: "Referral",        notes: "Loved the first session",          reasonLost: "" },
    { id: "o4",  name: "Sample - Maya / Single session",           clientId: "c2", offerType: "Single session",            price: 35,  status: "Follow-up due",  dateOffered: "2026-06-10", expireDate: "2026-06-20", followUpDate: "2026-06-13", probability: "50%", source: "Instagram",       notes: "Interested, needs nudge",          reasonLost: "" },
    { id: "o5",  name: "Sample - Dana / 6-pack",                   clientId: "c6", offerType: "6-pack",                    price: 195, status: "Paid",           dateOffered: "2026-05-28", expireDate: "",           followUpDate: "",           probability: "100%",source: "Studio partner",  notes: "",                                 reasonLost: "" },
    { id: "o6",  name: "Sample - Jordan / Single session",         clientId: "c1", offerType: "Single session",            price: 35,  status: "Declined",       dateOffered: "2026-06-05", expireDate: "",           followUpDate: "",           probability: "0%",  source: "Direct outreach", notes: "",                                 reasonLost: "Not the right time" },
    { id: "o7",  name: "Sample - CorePower Berkeley / Studio pilot",clientId: "",  offerType: "Studio pilot",              price: 300, status: "Sent",           dateOffered: "2026-06-09", expireDate: "2026-06-23", followUpDate: "2026-06-14", probability: "70%", source: "Direct outreach", notes: "Very interested, follow up Friday", reasonLost: "" },
    { id: "o8",  name: "Sample - Lotus & Pine / Recurring",        clientId: "",   offerType: "Studio recurring agreement",price: 600, status: "Accepted",       dateOffered: "2026-05-15", expireDate: "",           followUpDate: "",           probability: "100%",source: "Referral",        notes: "Signed May 20",                    reasonLost: "" },
    { id: "o9",  name: "Sample - Maya / 3-pack",                   clientId: "c2", offerType: "3-pack",                    price: 105, status: "Viewed",         dateOffered: "2026-06-12", expireDate: "2026-06-26", followUpDate: "2026-06-14", probability: "65%", source: "Post-session",    notes: "Opened the email twice",           reasonLost: "" },
    { id: "o10", name: "Sample - Corporate wellness / Group event", clientId: "",  offerType: "Group event",               price: 450, status: "Drafted",        dateOffered: "2026-06-13", expireDate: "2026-06-27", followUpDate: "2026-06-16", probability: "40%", source: "LinkedIn",        notes: "HR lead, warm intro via Sam",      reasonLost: "" },
    { id: "o11", name: "Sample - Past lead / 3-pack",              clientId: "",   offerType: "3-pack",                    price: 105, status: "Expired",        dateOffered: "2026-05-01", expireDate: "2026-05-15", followUpDate: "",           probability: "0%",  source: "Instagram",       notes: "",                                 reasonLost: "No response" },
    { id: "o12", name: "Sample - Priya / Private session",         clientId: "c4", offerType: "Private session",           price: 150, status: "Accepted",       dateOffered: "2026-06-05", expireDate: "",           followUpDate: "",           probability: "90%", source: "Post-session",    notes: "Requested after group session",    reasonLost: "" },
  ],
  revenue: [
    { id: "rv1",  name: "Sample - YogaSix Thursday Reset 6/11",      date: "2026-06-11", channel: "Studio session",   source: "Studio partner",  campaign: "",              sessionId: "s3", clientId: "",  gross: 350,  stripeFee: 10.50, studioSplit: 105,  facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "8 paid × $43.75" },
    { id: "rv2",  name: "Sample - Lotus & Pine New Moon 6/9",         date: "2026-06-09", channel: "Studio session",   source: "Studio partner",  campaign: "",              sessionId: "s2", clientId: "",  gross: 280,  stripeFee: 8.40,  studioSplit: 84,   facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "7 paid × $40" },
    { id: "rv3",  name: "Sample - Virtual Sunday Session 6/8",        date: "2026-06-08", channel: "Virtual session",  source: "Email list",      campaign: "June newsletter",sessionId: "",   clientId: "",  gross: 420,  stripeFee: 12.60, studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Virtual sessions",  notes: "12 paid × $35" },
    { id: "rv4",  name: "Sample - Priya private session 6/5",         date: "2026-06-05", channel: "Private client",   source: "Post-session",    campaign: "",              sessionId: "",   clientId: "c4",gross: 150,  stripeFee: 4.50,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Private sessions",  notes: "" },
    { id: "rv5",  name: "Sample - Dana 6-pack 5/28",                  date: "2026-05-28", channel: "Group package",    source: "Studio partner",  campaign: "",              sessionId: "",   clientId: "c6",gross: 195,  stripeFee: 5.85,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Packages",          notes: "" },
    { id: "rv6",  name: "Sample - CorePower Berkeley pilot 6/1",      date: "2026-06-01", channel: "Studio session",   source: "Direct outreach", campaign: "",              sessionId: "s1", clientId: "",  gross: 300,  stripeFee: 9.00,  studioSplit: 90,   facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "Pilot, 6 attendees" },
    { id: "rv7",  name: "Sample - Sam 6-pack 4/22",                   date: "2026-04-22", channel: "Group package",    source: "Referral",        campaign: "",              sessionId: "",   clientId: "c5",gross: 195,  stripeFee: 5.85,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Packages",          notes: "" },
    { id: "rv8",  name: "Sample - Lotus & Pine monthly agreement 5/15",date: "2026-05-15", channel: "Studio partner",  source: "Studio partner",  campaign: "",              sessionId: "",   clientId: "",  gross: 600,  stripeFee: 18.00, studioSplit: 180,  facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "Monthly partner fee" },
    { id: "rv9",  name: "Sample - Virtual Sunday Session refund 6/8", date: "2026-06-08", channel: "Virtual session",  source: "Direct outreach", campaign: "",              sessionId: "",   clientId: "c1",gross: 0,    stripeFee: 0,     studioSplit: 0,    facilitatorCost: 0,   refunds: 35, costCenter: "Virtual sessions",  notes: "Jordan requested refund" },
    { id: "rv10", name: "Sample - Priya 3-pack 5/10",                 date: "2026-05-10", channel: "Group package",    source: "Post-session",    campaign: "",              sessionId: "",   clientId: "c4",gross: 105,  stripeFee: 3.15,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Packages",          notes: "" },
    { id: "rv11", name: "Sample - Corporate wellness event 6/20",     date: "2026-06-20", channel: "Corporate event",  source: "LinkedIn",        campaign: "Corp outreach", sessionId: "",   clientId: "",  gross: 450,  stripeFee: 13.50, studioSplit: 0,    facilitatorCost: 100, refunds: 0,  costCenter: "Corporate",         notes: "Guest facilitator paid $100" },
    { id: "rv12", name: "Sample - Virtual session IG promo 5/25",     date: "2026-05-25", channel: "Virtual session",  source: "Organic Instagram",campaign: "May reel",      sessionId: "",   clientId: "",  gross: 315,  stripeFee: 9.45,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Virtual sessions",  notes: "9 paid × $35 — came from reel" },
  ],
  content: [
    { id: "ct1", name: "Sample - Maya's burnout-to-calm story", type: "Transformation", platform: "IG", datePosted: "2026-06-02", engagement: 420, leads: 3, booked: 1 },
    { id: "ct2", name: "Sample - What is box breathing (60s explainer)", type: "Education", platform: "TikTok", datePosted: "2026-06-05", engagement: 1850, leads: 5, booked: 2 },
    { id: "ct3", name: "Sample - June Thursday Reset invite", type: "Invite", platform: "IG", datePosted: "2026-06-08", engagement: 210, leads: 4, booked: 3 },
    { id: "ct4", name: "Sample - Sam testimonial clip", type: "Testimonial", platform: "IG", datePosted: "2026-06-09", engagement: 380, leads: 2, booked: 1 },
    { id: "ct5", name: "Sample - Monthly newsletter: breath + sleep", type: "Education", platform: "Email", datePosted: "2026-06-10", engagement: 95, leads: 1, booked: 1 },
  ],
  followups: [
    { id: "f1", name: "Sample - Chris 24h check-in", clientId: "c3", stage: "Attended 1x", lastContact: "2026-06-01", futype: "24h", nextAction: "2026-06-02", outcome: "Replied - booked next session" },
    { id: "f2", name: "Sample - Maya 72h nudge", clientId: "c2", stage: "Booked", lastContact: "2026-06-09", futype: "72h", nextAction: "2026-06-12", outcome: "" },
    { id: "f3", name: "Sample - Dana referral ask", clientId: "c6", stage: "Advocate", lastContact: "2026-06-10", futype: "Referral", nextAction: "2026-06-13", outcome: "" },
    { id: "f4", name: "Sample - Jordan reactivation", clientId: "c1", stage: "Lead", lastContact: "2026-06-05", futype: "Reactivation", nextAction: "2026-06-19", outcome: "" },
    { id: "f5", name: "Sample - Priya 72h post-session", clientId: "c4", stage: "Engaged (2-3x)", lastContact: "2026-06-07", futype: "72h", nextAction: "2026-06-10", outcome: "Confirmed Friday session" },
  ],
  sequences: [
    {
      id: "sq1", clientId: "c5", sessionDate: "2026-06-09",
      sessionName: "Sample - Lotus & Pine New Moon 6/9", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-09", sent: true,  sentAt: "2026-06-09", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-10", sent: true,  sentAt: "2026-06-10", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-12", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-15", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-23", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq2", clientId: "c6", sessionDate: "2026-06-10",
      sessionName: "Sample - YogaSix Thursday Reset 6/10", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-10", sent: true,  sentAt: "2026-06-10", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-11", sent: true,  sentAt: "2026-06-11", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-13", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-16", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-24", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq3", clientId: "c4", sessionDate: "2026-06-07",
      sessionName: "Sample - Lotus & Pine Sunday Slow Down 6/7", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-07", sent: true,  sentAt: "2026-06-07", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-08", sent: true,  sentAt: "2026-06-08", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-10", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-13", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-21", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq4", clientId: "c3", sessionDate: "2026-06-01",
      sessionName: "Sample - CorePower Berkeley Pilot 6/1", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-01", sent: true,  sentAt: "2026-06-01", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-02", sent: true,  sentAt: "2026-06-02", notes: "Replied — said they felt it" },
        { stepId: "h72",      dueDate: "2026-06-04", sent: true,  sentAt: "2026-06-04", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-07", sent: true,  sentAt: "2026-06-07", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-15", sent: false, sentAt: "", notes: "" },
      ],
    },
  ],
};

/* ---------- Helpers ---------- */
const STORE_KEY = "simplybreathe:data:v2";
const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso, withYear) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}${withYear ? ", " + y : ""}`;
}
const money = (n) =>
  n === "" || n == null || isNaN(n) ? "—" :
    "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const pct = (n) => (n === "" || n == null || isNaN(n) ? "—" : Math.round(Number(n) * 100) + "%");
const onOrBefore = (iso, t) => !!iso && iso <= t;
const sameMonth = (iso, ref) => !!iso && iso.slice(0, 7) === ref.slice(0, 7);
const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? "" : n; };
const norm = (s) => String(s || "").trim().toLowerCase();

/* ============================================================ */
export default function App() {
  const [data, setData] = useState(SEED);
  const [section, setSection] = useState("today");
  const [view, setView] = useState(0);
  const [open, setOpen] = useState(null);   // record drawer { db, record }
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [saved, setSaved] = useState("idle"); // idle | saving | saved
  const loaded = useRef(false);
  const today = todayISO();

  // Load persisted data
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          const r = await window.storage.get(STORE_KEY);
          if (alive && r && r.value) setData(JSON.parse(r.value));
        }
      } catch (e) { /* no saved state yet — keep seed */ }
      finally { loaded.current = true; }
    })();
    return () => { alive = false; };
  }, []);

  // Persist on change
  useEffect(() => {
    if (!loaded.current) return;
    let alive = true;
    setSaved("saving");
    (async () => {
      try {
        if (typeof window !== "undefined" && window.storage) {
          await window.storage.set(STORE_KEY, JSON.stringify(data));
        }
      } catch (e) { /* ignore */ }
      finally { if (alive) { setSaved("saved"); setTimeout(() => alive && setSaved("idle"), 1400); } }
    })();
    return () => { alive = false; };
  }, [data]);

  // Derived rollups
  const derived = useMemo(() => {
    const partnerName = Object.fromEntries(data.partners.map((p) => [p.id, p.name]));
    const clientName = Object.fromEntries(data.clients.map((c) => [c.id, c.name]));
    const acceptedByClient = {};
    data.offers.forEach((o) => {
      if (o.status === "Accepted") acceptedByClient[o.clientId] = (acceptedByClient[o.clientId] || 0) + (Number(o.price) || 0);
    });
    const sessionsByStudio = {};
    data.sessions.forEach((s) => { (sessionsByStudio[s.studioId] ||= []).push(s); });
    return { partnerName, clientName, acceptedByClient, sessionsByStudio };
  }, [data]);

  const update = (db, fn) => setData((d) => ({ ...d, [db]: fn(d[db]) }));
  const saveRecord = (db, rec) =>
    update(db, (rows) => (rows.some((r) => r.id === rec.id) ? rows.map((r) => (r.id === rec.id ? rec : r)) : [...rows, rec]));
  const deleteRecord = (db, id) => { update(db, (rows) => rows.filter((r) => r.id !== id)); setOpen(null); };

  const startSequence = (client) => {
    const startDate = client.lastSession || today;
    const already = (data.sequences || []).some(s => s.clientId === client.id && s.status === "active");
    if (already) return;
    const newSeq = {
      id: uid("sq"),
      clientId: client.id,
      sessionDate: startDate,
      sessionName: client.lastSession ? `Session ${fmtDate(startDate)}` : "Session",
      status: "active",
      steps: makeSequenceSteps(startDate),
    };
    setData(d => ({ ...d, sequences: [...(d.sequences || []), newSeq] }));
  };

  const sections = [
    { id: "today",    label: "Simply Breathe OS",   Icon: LayoutGrid },
    { id: "clients",  label: "Clients",              Icon: Users },
    { id: "partners", label: "Studio Partners",      Icon: Building2 },
    { id: "sessions", label: "Sessions",             Icon: CalendarDays },
    { id: "offers",   label: "Offers & Sales",       Icon: DollarSign },
    { id: "revenue",  label: "Revenue",              Icon: TrendingUp },
    { id: "content",  label: "Content & Referral",   Icon: Megaphone },
    { id: "followups",label: "Follow-Ups",           Icon: RefreshCw },
    { id: "engine",   label: "Follow-up Engine",     Icon: Zap },
  ];

  const go = (id) => { setSection(id); setView(0); setQuery(""); setNavOpen(false); };

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: FONT.body, minHeight: 600 }}>
      <style>{CSS}</style>

      <div className="sb-shell">
        {/* Sidebar */}
        <aside className={"sb-sidebar" + (navOpen ? " sb-open" : "")}>
          <div style={{ padding: "20px 18px 16px" }}>
            <img src={LOGO} alt="Simply Breathe" style={{ display: "block", width: "84%", maxWidth: 172, margin: "0 auto 14px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
              <BreathMark size={22} />
              <span style={{ fontSize: 11, color: C.ink3, letterSpacing: "0.18em", textTransform: "uppercase" }}>Operating System</span>
            </div>
          </div>
          <nav style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {sections.map((s) => {
              const active = section === s.id;
              const dueCount = s.id === "engine"
                ? (data.sequences || []).flatMap(seq =>
                    seq.status === "active" ? seq.steps.filter(st => !st.sent && st.dueDate <= today) : []
                  ).length
                : null;
              const count = s.id === "today" || s.id === "engine" ? null : (data[s.id] || []).length;
              return (
                <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                  style={{ background: active ? C.brandSoft : "transparent", color: active ? C.brandDeep : C.ink2, fontWeight: active ? 600 : 500 }}>
                  <s.Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                  {dueCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#C0573F", color: "#fff", borderRadius: 20, padding: "1px 7px" }}>{dueCount}</span>}
                  {count != null && <span style={{ fontSize: 11, color: active ? C.brand : C.ink3 }}>{count}</span>}
                </button>
              );
            })}
          </nav>
          <div style={{ marginTop: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button className="sb-ghost" onClick={() => setImporting(true)}><Upload size={15} /> Import CSVs</button>
            <div style={{ fontSize: 11, color: C.ink3, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {saved === "saving" ? "Saving…" : saved === "saved" ? <><Check size={12} /> Saved</> : "Auto-saved locally"}
            </div>
          </div>
        </aside>
        {navOpen && <div className="sb-scrim" onClick={() => setNavOpen(false)} />}

        {/* Main */}
        <main className="sb-main">
          <header className="sb-header">
            <button className="sb-menu" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
                {sections.find((s) => s.id === section).label}
              </h1>
            </div>
            {section !== "today" && (
              <>
                <div className="sb-search">
                  <Search size={15} color={C.ink3} />
                  <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <button className="sb-primary" onClick={() => setOpen({ db: section, record: newRecord(section) })}>
                  <Plus size={16} /> New
                </button>
              </>
            )}
          </header>

          <div className="sb-content">
            {section === "today"
              ? <Today data={data} derived={derived} today={today} onOpen={setOpen} onGo={go} />
              : section === "engine"
              ? <FollowUpEngine data={data} setData={setData} today={today} onOpen={setOpen} />
              : <Section section={section} data={data} derived={derived} today={today}
                  view={view} setView={setView} query={query} onOpen={setOpen} />}
          </div>
        </main>
      </div>

      {open && (
        <RecordDrawer db={open.db} record={open.record} data={data} derived={derived} today={today}
          onClose={() => setOpen(null)} onSave={(rec) => { saveRecord(open.db, rec); setOpen(null); }}
          onDelete={(id) => deleteRecord(open.db, id)} onOpenRelated={setOpen}
          sequences={data.sequences || []} onStartSequence={startSequence} />
      )}

      {importing && <ImportModal data={data} setData={setData} onClose={() => setImporting(false)} />}
    </div>
  );
}

/* ---------- New blank record per db ---------- */
function newRecord(db) {
  const base = { id: uid(db) };
  const m = {
    clients: { name: "", phone: "", email: "", source: "Post-session", status: "Lead", clientType: "First-time attendee", tags: [], firstSession: "", sessionsAttended: 0, lastSession: "", nextSession: "", packageType: "None", lifetimeValue: 0, notes: "", referral: "Low" },
    partners: { name: "", studioType: "Yoga", location: "", contact: "", role: "Owner", email: "", phone: "", stage: "Target identified", estimatedCommunitySize: 0, bestFitJourney: "", revenuePotential: 0, closeProbability: "Low", revShare: "", contractStatus: "None", outreachDate: "", lastTouch: todayISO(), nextAction: "", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "", promotionCommitments: "", notes: "", checklist: emptyChecklist() },
    sessions: { name: "", studioId: "", date: todayISO(), time: "", status: "Planned", journey: "Breathwork Basics", capacity: 20, registered: 0, attendance: 0, paidAttendees: 0, waivers: 0, noShows: 0, revenue: 0, studioSplit: 0, netRevenue: 0, conversion: 0, packagesSold: 0, referralsGenerated: 0, equipmentNeeded: "", roomSetupStatus: "Not started", musicSetupStatus: "Not started", testimonialsCapt: 0, followUpSent: false, rebookOfferSent: false, referralsRequested: false, notes: "", checklist: emptySessionChecklist() },
    offers:    { name: "", clientId: "", offerType: "Single session", price: 0, status: "Drafted", probability: "50%", source: "", dateOffered: todayISO(), expireDate: "", followUpDate: "", notes: "", reasonLost: "" },
    revenue:   { name: "", date: todayISO(), channel: "Studio session", source: "", campaign: "", sessionId: "", clientId: "", gross: 0, stripeFee: 0, studioSplit: 0, facilitatorCost: 0, refunds: 0, costCenter: "Studio sessions", notes: "" },
    content: { name: "", type: "Education", platform: "IG", datePosted: todayISO(), engagement: 0, leads: 0, booked: 0 },
    followups: { name: "", clientId: "", stage: "Lead", lastContact: todayISO(), futype: "24h", nextAction: "", outcome: "" },
  };
  return { ...base, ...m[db] };
}

/* ============================================================
   TODAY DASHBOARD — Command Center
   ============================================================ */

const CAT_META = {
  revenue:      { label: "Revenue",      color: C.brand,    bg: C.brandSoft,   text: C.brandDeep },
  relationship: { label: "Relationship", color: C.gold,     bg: "#F6EAD6",     text: "#7A4D0F"   },
  delivery:     { label: "Delivery",     color: "#4A8C6F",  bg: "#E2F0EA",     text: "#1E5239"   },
};
const URGENCY_DOT = { high: "#C0573F", medium: C.gold, low: C.ink3 };

function buildActions(data, derived, today) {
  const daysBetween = (a, b) => (!a || !b) ? 0 : Math.round((new Date(b) - new Date(a)) / 86400000);
  const tomorrowISO = (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const actions = [];

  // ── REVENUE ──────────────────────────────────────────────────────────
  // Overdue follow-ups (24h / 72h)
  data.followups
    .filter((f) => !f.outcome && f.nextAction && f.nextAction <= today && (f.futype === "24h" || f.futype === "72h"))
    .forEach((f) => {
      const client = data.clients.find((c) => c.id === f.clientId);
      const d = daysBetween(f.nextAction, today);
      const label = f.futype === "24h" ? "24-hour" : "72-hour";
      actions.push({ id: "fu_" + f.id, priority: d >= 2 ? 1 : 2, urgency: d >= 2 ? "high" : "medium", category: "revenue",
        text: `Call ${cleanName(client?.name || f.name)} — ${label} post-session follow-up ${d > 0 ? `${d} day${d !== 1 ? "s" : ""} overdue` : "due today"}`,
        sub: `${label} follow-up · client since ${fmtDate(client?.firstSession) || "—"}`, db: "followups", record: f });
    });

  // Open offers
  data.offers
    .filter((o) => o.status === "Offered")
    .forEach((o) => {
      const client = data.clients.find((c) => c.id === o.clientId);
      const d = daysBetween(o.dateOffered, today);
      actions.push({ id: "off_" + o.id, priority: d >= 5 ? 2 : 3, urgency: d >= 5 ? "high" : "medium", category: "revenue",
        text: `Follow up with ${cleanName(client?.name || o.name)} — open ${o.offerType} offer${d ? `, offered ${d} day${d !== 1 ? "s" : ""} ago` : ""}`,
        sub: `${o.offerType} · ${money(o.price)} · offered ${fmtDate(o.dateOffered)}`, db: "offers", record: o });
    });

  // Attended 1x — no rebook
  data.clients
    .filter((c) => c.status === "Attended 1x" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "reb_" + c.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Rebook ${cleanName(c.name)} — attended once on ${fmtDate(c.lastSession)}, no next session set`,
        sub: `Attended 1x · source: ${c.source} · ${c.referral} referral potential`, db: "clients", record: c });
    });

  // Leads with no follow-up at all
  data.clients
    .filter((c) => c.status === "Lead" && !data.followups.some((f) => f.clientId === c.id))
    .forEach((c) => {
      actions.push({ id: "ld_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Convert lead ${cleanName(c.name)} — no follow-up scheduled yet`,
        sub: `Lead · ${c.source} · next session: ${fmtDate(c.nextSession) || "none"}`, db: "clients", record: c });
    });

  // Studio partners needing next step
  data.partners
    .filter((p) => ["Demo completed", "Pilot proposed", "Agreement sent", "Discovery call booked", "Demo session offered"].includes(p.stage))
    .filter((p) => !(derived.sessionsByStudio[p.id] || []).some((s) => s.date >= today))
    .forEach((p) => {
      actions.push({ id: "sp_" + p.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Book next session with ${cleanName(p.name)} — ${p.stage.toLowerCase()}, no upcoming session`,
        sub: `${p.stage} · contact: ${p.contact} · ${p.email}`, db: "partners", record: p });
    });

  // Engaged clients (2-3x) — no package yet
  data.clients
    .filter((c) => c.status === "Engaged (2-3x)" && (!c.packageType || c.packageType === "None" || c.packageType === "Drop-in"))
    .forEach((c) => {
      actions.push({ id: "pkg_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Offer package to ${cleanName(c.name)} — ${c.sessionsAttended} sessions in, still on drop-in`,
        sub: `Engaged · LTV: ${money(c.lifetimeValue)} · last seen: ${fmtDate(c.lastSession)}`, db: "clients", record: c });
    });

  // ── RELATIONSHIP ──────────────────────────────────────────────────────
  // Referral follow-ups overdue
  data.followups
    .filter((f) => f.futype === "Referral" && !f.outcome && f.nextAction && f.nextAction <= today)
    .forEach((f) => {
      const client = data.clients.find((c) => c.id === f.clientId);
      actions.push({ id: "ref_" + f.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Thank ${cleanName(client?.name || f.name)} for the referral — follow-up due ${daysBetween(f.nextAction, today) > 0 ? "& overdue" : "today"}`,
        sub: `Referral follow-up · due ${fmtDate(f.nextAction)}`, db: "followups", record: f });
    });

  // Advocates + High-referral — request testimonial
  data.clients
    .filter((c) => c.status === "Advocate" || (c.referral === "High" && Number(c.sessionsAttended) >= 3))
    .filter((c) => !data.followups.some((f) => f.clientId === c.id && f.futype === "Referral" && f.lastContact >= (today.slice(0, 7) + "-01")))
    .slice(0, 3)
    .forEach((c) => {
      actions.push({ id: "tst_" + c.id, priority: 5, urgency: "low", category: "relationship",
        text: `Request a testimonial from ${cleanName(c.name)} — ${c.sessionsAttended} sessions, noted as ${c.referral.toLowerCase()} referral`,
        sub: `${c.status} · last session: ${fmtDate(c.lastSession)}`, db: "clients", record: c });
    });

  // Active partners — no session in 14+ days
  data.partners
    .filter((p) => p.stage === "Recurring partner" || p.stage === "Pilot completed" || p.stage === "First session scheduled")
    .filter((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      return !last || daysBetween(last, today) > 14;
    })
    .forEach((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      actions.push({ id: "pi_" + p.id, priority: 5, urgency: "low", category: "relationship",
        text: `Check in with ${p.contact} at ${cleanName(p.name)} — ${last ? `last session ${fmtDate(last)}` : "no sessions logged"}`,
        sub: `${p.stage} · ${p.email}`, db: "partners", record: p });
    });

  // Warm contacts to invite — engaged, no upcoming session
  data.clients
    .filter((c) => c.status === "Engaged (2-3x)" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "inv_" + c.id, priority: 6, urgency: "low", category: "relationship",
        text: `Invite ${cleanName(c.name)} to an upcoming session — engaged but no next date scheduled`,
        sub: `Engaged · last seen: ${fmtDate(c.lastSession)} · ${c.source}`, db: "clients", record: c });
    });

  // ── DELIVERY ──────────────────────────────────────────────────────────
  // Sessions today
  data.sessions
    .filter((s) => s.date === today)
    .forEach((s) => {
      actions.push({ id: "tod_" + s.id, priority: 1, urgency: "high", category: "delivery",
        text: `Session today: ${cleanName(s.name)} — confirm room setup and payment link`,
        sub: `${cleanName(derived.partnerName[s.studioId] || "unknown studio")} · ${today}`, db: "sessions", record: s });
    });

  // Sessions tomorrow
  data.sessions
    .filter((s) => s.date === tomorrowISO)
    .forEach((s) => {
      actions.push({ id: "tmr_" + s.id, priority: 2, urgency: "medium", category: "delivery",
        text: `Session tomorrow: ${cleanName(s.name)} — run through setup checklist today`,
        sub: `${cleanName(derived.partnerName[s.studioId] || "unknown studio")} · ${fmtDate(tomorrowISO)}`, db: "sessions", record: s });
    });

  // Attended clients with no follow-up within 4 days
  data.clients
    .filter((c) => c.sessionsAttended > 0 && c.lastSession)
    .filter((c) => {
      const d = daysBetween(c.lastSession, today);
      return d >= 1 && d <= 4 && !data.followups.some((f) => f.clientId === c.id && f.lastContact >= c.lastSession);
    })
    .forEach((c) => {
      actions.push({ id: "nfu_" + c.id, priority: 2, urgency: "medium", category: "delivery",
        text: `Log follow-up for ${cleanName(c.name)} — attended ${fmtDate(c.lastSession)}, no follow-up recorded`,
        sub: `${c.status} · ${c.sessionsAttended} session${c.sessionsAttended !== 1 ? "s" : ""}`, db: "clients", record: c });
    });

  const urgencyScore = { high: 0, medium: 1, low: 2 };
  return actions.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : urgencyScore[a.urgency] - urgencyScore[b.urgency]);
}

function Today({ data, derived, today, onOpen, onGo }) {
  const [filter, setFilter] = useState("all");

  const actions = buildActions(data, derived, today);
  const filtered = filter === "all" ? actions : actions.filter((a) => a.category === filter);
  const counts = { revenue: 0, relationship: 0, delivery: 0 };
  actions.forEach((a) => counts[a.category]++);

  const mtdSessions = data.sessions.filter((s) => sameMonth(s.date, today)).reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const mtdOffers = data.offers.filter((o) => o.status === "Accepted" && sameMonth(o.closeDate, today)).reduce((a, o) => a + (Number(o.price) || 0), 0);
  const activeMembers = data.clients.filter((c) => c.status === "Member (4+)" || c.status === "Advocate").length;
  const openOffers = data.offers.filter((o) => o.status === "Offered").length;

  const d = new Date();
  const greeting = d.getHours() < 12 ? "Good morning" : d.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Hero */}
      <div className="sb-hero">
        <BreathMark size={62} animate />
        <div>
          <div style={{ fontSize: 13, color: C.brand, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
            {fmtDate(today, true)}
          </div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 26, margin: "4px 0 0", fontWeight: 600, letterSpacing: "-0.01em" }}>
            {greeting}. Take one slow breath, then begin.
          </h2>
        </div>
      </div>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Revenue this month" value={money(mtdSessions + mtdOffers)} hint="sessions + offers closed" />
        <Stat label="Priorities today" value={actions.length} hint="ranked actions waiting" accent={actions.length ? C.gold : C.brand} />
        <Stat label="Open offers" value={openOffers} hint="awaiting a yes" />
        <Stat label="Active members" value={activeMembers} hint="Member & Advocate" />
      </div>

      {/* Command Center */}
      <div className="sb-card">
        <div className="sb-panelhead" style={{ flexWrap: "wrap", gap: 8, paddingBottom: 12 }}>
          <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600 }}>Today's Priorities</span>
          <span className="sb-badge">{actions.length}</span>
          <div style={{ flex: 1 }} />
          {/* Category filter tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["all", "revenue", "relationship", "delivery"]).map((cat) => {
              const active = filter === cat;
              const meta = cat !== "all" ? CAT_META[cat] : null;
              const label = cat === "all" ? `All (${actions.length})` : `${meta.label} (${counts[cat]})`;
              return (
                <button key={cat} onClick={() => setFilter(cat)} style={{
                  padding: "4px 13px", borderRadius: 20, border: "1px solid", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all .12s",
                  borderColor: active ? (meta ? meta.color : C.brand) : C.line,
                  background: active ? (meta ? meta.bg : C.brandSoft) : "transparent",
                  color: active ? (meta ? meta.text : C.brandDeep) : C.ink2,
                }}>{label}</button>
              );
            })}
          </div>
        </div>

        <div className="sb-panelbody">
          {filtered.length === 0
            ? <Empty pad>Nothing in this category right now — well done.</Empty>
            : filtered.map((action, i) => {
              const meta = CAT_META[action.category];
              return (
                <button key={action.id} className="sb-listrow sb-actionrow"
                  onClick={() => onOpen({ db: action.db, record: action.record })}>
                  {/* Rank badge */}
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%", background: URGENCY_DOT[action.urgency],
                    color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>{i + 1}</span>
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{action.text}</div>
                    <div className="sb-rowsub" style={{ marginTop: 2 }}>{action.sub}</div>
                  </div>
                  {/* Category chip */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
                    background: meta.bg, color: meta.text, flexShrink: 0,
                  }}>{meta.label}</span>
                  <ChevronRight size={14} color={C.ink3} style={{ flexShrink: 0 }} />
                </button>
              );
            })
          }
        </div>
      </div>

      {/* Charts */}
      <div className="sb-grid2">
        <Panel title="Revenue trend"><RevenueTrend data={data} /></Panel>
        <Panel title="Clients by source"><SourceBreakdown data={data} /></Panel>
      </div>
    </div>
  );
}

/* ---------- Dashboard charts ---------- */
function RevenueTrend({ data }) {
  const months = {};
  data.sessions.forEach((s) => { if (s.date) { const k = s.date.slice(0, 7); months[k] = (months[k] || 0) + (Number(s.netRevenue) || 0); } });
  data.offers.forEach((o) => { if (o.status === "Accepted" && o.closeDate) { const k = o.closeDate.slice(0, 7); months[k] = (months[k] || 0) + (Number(o.price) || 0); } });
  const keys = Object.keys(months).sort();
  const years = new Set(keys.map((k) => k.slice(0, 4)));
  const rows = keys.map((k) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1] + (years.size > 1 ? " '" + k.slice(2, 4) : ""), value: Math.round(months[k]) }));
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!rows.length) return <Empty pad>No revenue recorded yet.</Empty>;
  return (
    <div style={{ padding: "2px 4px 8px" }}>
      <div style={{ padding: "0 12px 4px" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 600 }}>{money(total)}</span>
        <span style={{ fontSize: 12.5, color: C.ink3, marginLeft: 8 }}>net, sessions + closed offers</span>
      </div>
      <ResponsiveContainer width="100%" height={208}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sbRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity={0.3} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.ink3 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: C.ink3 }} axisLine={false} tickLine={false} width={46}
            tickFormatter={(v) => (v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v)} />
          <Tooltip formatter={(v) => [money(v), "Net revenue"]} cursor={{ stroke: C.line }}
            contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}
            labelStyle={{ color: C.ink2, fontWeight: 600 }} />
          <Area type="monotone" dataKey="value" stroke={C.brand} strokeWidth={2.5} fill="url(#sbRev)" dot={{ r: 3, fill: C.brand }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SourceBreakdown({ data }) {
  const rows = SOURCE.map((s) => {
    const items = data.clients.filter((c) => c.source === s);
    return { name: s, value: items.length, ltv: items.reduce((a, c) => a + (Number(c.lifetimeValue) || 0), 0), color: SOURCE_COLOR[s] };
  }).filter((r) => r.value > 0);
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <Empty pad>No clients yet.</Empty>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px 12px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 152, height: 152, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v + (v === 1 ? " client" : " clients"), n]}
              contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: C.ink3 }}>clients</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 168, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600 }}>
          <span style={{ width: 9, flexShrink: 0 }} /><span style={{ flex: 1 }}>Source</span><span>Clients</span><span style={{ width: 64, textAlign: "right" }}>LTV</span>
        </div>
        {[...rows].sort((a, b) => b.value - a.value).map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 13.5, color: C.ink2 }}>{r.value}</span>
            <span style={{ fontSize: 12.5, color: C.ink3, width: 64, textAlign: "right" }}>{money(r.ltv)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SECTION (per database, with views)
   ============================================================ */
function Section({ section, data, derived, today, view, setView, query, onOpen }) {
  const cfg = VIEWS[section];
  const v = cfg.views[Math.min(view, cfg.views.length - 1)];
  let rows = data[section];

  // search
  if (query.trim()) {
    const q = norm(query);
    rows = rows.filter((r) => Object.values(r).some((val) => norm(val).includes(q)));
  }
  const processed = v.run(rows, { data, derived, today });

  return (
    <div>
      <div className="sb-tabs">
        {cfg.views.map((vv, i) => (
          <button key={vv.name} className={"sb-tab" + (i === view ? " sb-tab-on" : "")} onClick={() => setView(i)}>{vv.name}</button>
        ))}
      </div>
      {v.layout === "board"
        ? <BoardView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} cardKeys={v.card} ctx={{ data, derived, today }} section={section} />
        : v.layout === "partner-pipeline"
        ? <PartnerPipelineView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "session-perf"
        ? <SessionPerfView rows={processed.rows} derived={derived} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "offer-analytics"
        ? <OfferConversionView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "offers", record: r })} />
        : v.layout === "revenue-analytics"
        ? <RevenueAttributionView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "revenue", record: r })} />
        : v.layout === "calendar"
        ? <CalendarView rows={processed.rows} today={today} derived={derived} onOpen={(r) => onOpen({ db: section, record: r })} />
        : <TableView columns={v.columns} rows={processed.rows} footer={processed.footer} onOpen={(r) => onOpen({ db: section, record: r })} ctx={{ data, derived, today }} />}
    </div>
  );
}

/* ---------- View configs ---------- */
const col = (key, label, render, opts = {}) => ({ key, label, render, ...opts });

function TagList({ tags, max = 3 }) {
  if (!tags || !tags.length) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - max;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {shown.map(t => (
        <span key={t} style={{
          fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          background: hexA(TAG_COLOR[t] || C.ink3, 0.13),
          color: TAG_COLOR[t] || C.ink3, whiteSpace: "nowrap",
        }}>{t}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: C.ink3 }}>+{rest}</span>}
    </div>
  );
}

const clientCell = {
  name: (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>,
  status: (r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>,
  type: (r) => r.clientType ? <Tag color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3} soft>{r.clientType}</Tag> : null,
  tags: (r) => <TagList tags={r.tags} />,
};

const VIEWS = {
  clients: {
    views: [
      { name: "Pipeline", layout: "board", card: ["clientType", "tags", "nextSession", "packageType", "referral"],
        run: (rows) => ({ groups: STATUS.map((s) => ({ key: s, label: s, color: STATUS_COLOR[s], cards: rows.filter((r) => r.status === s) })) }) },
      { name: "By segment", layout: "table",
        columns: [
          col("name",        "Client",   clientCell.name),
          col("clientType",  "Segment",  clientCell.type),
          col("tags",        "Intent",   clientCell.tags),
          col("status",      "Status",   clientCell.status),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",    (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.clientType || "").localeCompare(b.clientType || "")) }) },
      { name: "Reactivation list", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("clientType","Segment",   clientCell.type),
          col("tags",      "Intent",    clientCell.tags),
          col("lastSession","Last seen", (r) => fmtDate(r.lastSession)),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
          col("notes",     "Notes",     (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
        ],
        run: (rows, c) => ({
          rows: rows.filter(r =>
            r.clientType === "Past client — reactivate" ||
            (r.lastSession && r.lastSession < addDays(c.today, -30))
          ).sort((a, b) => (a.lastSession || "").localeCompare(b.lastSession || ""))
        }) },
      { name: "Advocates & referrers", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("status",    "Status",    clientCell.status),
          col("tags",      "Intent",    clientCell.tags),
          col("referral",  "Referral potential", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.referral === "High" || r.status === "Advocate" || r.clientType === "Referral source" || r.clientType === "Advocate").sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
      { name: "Sessions due / overdue", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("nextSession", "Next session", (r, c) => <DateChip iso={r.nextSession} today={c.today} />),
          col("phone", "Phone", (r) => <span style={{ color: C.ink2 }}>{r.phone}</span>),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => onOrBefore(r.nextSession, c.today)).sort((a, b) => (a.nextSession || "").localeCompare(b.nextSession || "")) }) },
      { name: "High value", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("packageType", "Package", (r) => r.packageType),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "Lifetime value", (r) => <strong>{money(r.lifetimeValue)}</strong>, { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter((r) => Number(r.lifetimeValue) > 0).sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
      { name: "All clients", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("source", "Source", (r) => r.source),
          col("tags", "Intent", clientCell.tags),
          col("referral", "Referral", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("lifetimeValue", "LTV", (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows }) },
    ],
  },
  partners: {
    views: [
      { name: "Pipeline", layout: "partner-pipeline",
        run: (rows) => ({ groups: STAGE.map((s) => ({ key: s, label: s, color: STAGE_COLOR[s], cards: rows.filter((r) => r.stage === s) })) }) },
      { name: "Active partners", layout: "table",
        columns: partnerCols(),
        run: (rows) => ({ rows: rows.filter((r) => r.stage === "Recurring partner" || r.stage === "First session scheduled" || r.stage === "Pilot completed") }) },
      { name: "In outreach", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => r.studioType || "—"),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("contact", "Contact", (r) => r.contact),
          col("lastTouch", "Last touch", (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => ({ rows: rows.filter((r) => !["Recurring partner", "Lost / not a fit"].includes(r.stage)).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "Revenue forecast", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => r.studioType || "—"),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("estimatedCommunitySize", "Community", (r) => Number(r.estimatedCommunitySize || 0).toLocaleString(), { align: "right" }),
          col("revenuePotential", "Rev. potential", (r) => <strong>{money(r.revenuePotential)}</strong>, { align: "right", sum: "revenuePotential" }),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => {
          const sorted = [...rows].filter((r) => r.stage !== "Lost / not a fit").sort((a, b) => Number(b.revenuePotential) - Number(a.revenuePotential));
          return { rows: sorted, footer: { revenuePotential: money(sum(sorted, "revenuePotential")), label: "Total pipeline value" } };
        } },
    ],
  },
  sessions: {
    views: [
      { name: "Calendar", layout: "calendar", run: (rows) => ({ rows }) },
      { name: "Performance", layout: "session-perf", run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
      { name: "Revenue leaderboard", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId", "Studio", (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("date", "Date", (r) => fmtDate(r.date)),
          col("status", "Status", (r) => <Tag color={SESSION_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("attendance", "In room", (r) => `${r.attendance || 0}/${r.capacity || "?"}`, { align: "right" }),
          col("revenue", "Gross", (r) => money(r.revenue), { align: "right" }),
          col("studioSplit", "Studio cut", (r) => money(r.studioSplit), { align: "right" }),
          col("netRevenue", "Your net", (r) => <strong>{money(r.netRevenue)}</strong>, { align: "right", sum: "netRevenue" }),
        ],
        run: (rows) => {
          const sorted = [...rows].sort((a, b) => Number(b.netRevenue) - Number(a.netRevenue));
          return { rows: sorted, footer: { revenue: money(sum(sorted, "revenue")), netRevenue: money(sum(sorted, "netRevenue")), label: "All-time total" } };
        } },
      { name: "Conversion", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("attendance", "In room", (r) => r.attendance, { align: "right" }),
          col("paidAttendees", "Paid", (r) => r.paidAttendees || "—", { align: "right" }),
          col("waivers", "Waivers", (r) => r.waivers || "—", { align: "right" }),
          col("packagesSold", "Packages", (r) => r.packagesSold, { align: "right" }),
          col("testimonialsCapt", "Testimonials", (r) => r.testimonialsCapt || 0, { align: "right" }),
          col("referralsGenerated", "Referrals", (r) => r.referralsGenerated, { align: "right" }),
          col("conversion", "Conversion", (r) => <Tag color={r.conversion >= 0.3 ? "#2F6FD0" : r.conversion >= 0.2 ? "#3F87DC" : "#9FB2CC"} soft>{pct(r.conversion)}</Tag>, { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => Number(b.conversion) - Number(a.conversion)) }) },
    ],
  },
  offers: {
    views: [
      { name: "Open pipeline", layout: "table",
        columns: offerCols(),
        run: (rows) => ({ rows: rows.filter((r) => OPEN_STATUSES.includes(r.status)).sort((a, b) => (a.expireDate || "9999").localeCompare(b.expireDate || "9999")) }) },
      { name: "Conversion analytics", layout: "offer-analytics" },
      { name: "By offer type", layout: "table",
        columns: [
          col("offerType", "Type", (r) => r.offerType),
          col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
          col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
          col("source", "Source", (r) => r.source || "—"),
          col("notes", "Notes", (r) => <span style={{ color: C.ink2, fontSize: 12 }}>{r.notes}</span>),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => a.offerType.localeCompare(b.offerType)) }) },
      { name: "Won this month", layout: "table",
        columns: offerCols(),
        run: (rows, c) => {
          const r = rows.filter((x) => WON_STATUSES.includes(x.status) && sameMonth(x.dateOffered, c.today));
          return { rows: r, footer: { price: money(sum(r, "price")), label: "Closed this month" } };
        } },
      { name: "All offers", layout: "table", columns: offerCols(), run: (rows) => ({ rows }) },
    ],
  },
  revenue: {
    views: [
      { name: "Revenue attribution", layout: "revenue-analytics" },
      { name: "This month", layout: "table", columns: revCols(),
        run: (rows, c) => {
          const r = [...rows].filter(x => sameMonth(x.date, c.today)).sort((a, b) => b.date.localeCompare(a.date));
          return { rows: r, footer: { gross: money(sum(r, "gross")), label: "Gross this month" } };
        } },
      { name: "All transactions", layout: "table", columns: revCols(),
        run: (rows) => {
          const r = [...rows].sort((a, b) => b.date.localeCompare(a.date));
          return { rows: r, footer: { gross: money(sum(r, "gross")), label: "Total gross" } };
        } },
    ],
  },
  content: {
    views: [
      { name: "What's working", layout: "table",
        columns: contentCols(),
        run: (rows) => ({ rows: [...rows].sort((a, b) => Number(b.booked) - Number(a.booked) || Number(b.leads) - Number(a.leads)) }) },
      { name: "All content", layout: "table", columns: contentCols(), run: (rows) => ({ rows }) },
    ],
  },
  followups: {
    views: [
      { name: "Due today", layout: "table",
        columns: [
          col("name", "Follow-up", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId", "Client", (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype", "Type", (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => onOrBefore(r.nextAction, c.today) && !r.outcome).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "By type", layout: "board", card: ["clientId", "nextAction", "outcome"],
        run: (rows) => ({ groups: FUTYPE.map((t) => ({ key: t, label: t, color: FUTYPE_COLOR[t], cards: rows.filter((r) => r.futype === t) })) }) },
      { name: "All follow-ups", layout: "table",
        columns: [
          col("name", "Follow-up", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId", "Client", (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype", "Type", (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r) => fmtDate(r.nextAction)),
          col("outcome", "Outcome", (r) => r.outcome ? <span style={{ color: C.brand }}>{r.outcome}</span> : <span style={{ color: C.ink3 }}>pending</span>),
        ],
        run: (rows) => ({ rows }) },
    ],
  },
};

function partnerCols() {
  return [
    col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("studioType", "Type", (r) => r.studioType || "—"),
    col("location", "Location", (r) => <span style={{ color: C.ink2 }}>{r.location}</span>),
    col("contact", "Contact", (r) => `${r.contact} · ${r.role}`),
    col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
    col("avgAttendance", "Avg att.", (r) => r.avgAttendance || "—", { align: "right" }),
    col("sessionsPerMonth", "Sess/mo", (r) => r.sessionsPerMonth || "—", { align: "right" }),
    col("revenuePotential", "Rev. potential", (r) => money(r.revenuePotential), { align: "right" }),
  ];
}
function offerCols() {
  return [
    col("clientId", "Client / Studio", (r, c) => <span style={{ fontWeight: 600 }}>{clientShort(c.derived.clientName[r.clientId] || cleanName(r.name))}</span>),
    col("offerType", "Type", (r) => r.offerType),
    col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
    col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("probability", "Prob.", (r) => r.probability || "—", { align: "right" }),
    col("source", "Source", (r) => r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"),
    col("dateOffered", "Offered", (r) => fmtDate(r.dateOffered)),
    col("expireDate", "Expires", (r, c) => <DateChip iso={r.expireDate} today={c.today} />),
    col("followUpDate", "Follow-up", (r, c) => <DateChip iso={r.followUpDate} today={c.today} />),
  ];
}
function revCols() {
  return [
    col("name", "Description", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("channel", "Channel", (r) => <Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag>),
    col("gross", "Gross", (r) => money(r.gross), { align: "right", sum: "gross" }),
    col("studioSplit", "Studio split", (r) => r.studioSplit ? money(r.studioSplit) : "—", { align: "right" }),
    col("stripeFee", "Processing", (r) => r.stripeFee ? money(r.stripeFee) : "—", { align: "right" }),
    col("facilitatorCost", "Facilitator", (r) => r.facilitatorCost ? money(r.facilitatorCost) : "—", { align: "right" }),
    col("refunds", "Refunds", (r) => r.refunds ? <span style={{ color: "#C0573F" }}>-{money(r.refunds)}</span> : "—", { align: "right" }),
    col("net", "Net", (r) => {
      const n = calcNet(r);
      return <strong style={{ color: n > 0 ? "#4A8C6F" : n < 0 ? "#C0573F" : C.ink3 }}>{money(n)}</strong>;
    }, { align: "right" }),
    col("source", "Source", (r) => r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"),
  ];
}
function contentCols() {
  return [
    col("name", "Title", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("type", "Type", (r) => <Tag color={C.brand} soft>{r.type}</Tag>),
    col("platform", "Platform", (r) => r.platform),
    col("engagement", "Engagement", (r) => Number(r.engagement).toLocaleString(), { align: "right" }),
    col("leads", "Leads", (r) => r.leads, { align: "right" }),
    col("booked", "Booked", (r) => <strong>{r.booked}</strong>, { align: "right" }),
  ];
}
const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);

/* ============================================================
   TABLE
   ============================================================ */
function TableView({ columns, rows, footer, onOpen, ctx }) {
  if (!rows.length) return <Empty pad>Nothing here yet. Add a record, or adjust the view.</Empty>;
  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="sb-table">
          <thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left" }}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r)} className="sb-trow">
                {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left" }}>{c.render(r, ctx)}</td>)}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot><tr>
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
   PARTNER PIPELINE (14-stage horizontal kanban)
   ============================================================ */
const STAGE_GROUPS = [
  { label: "Prospecting", stages: ["Target identified", "Researched", "Initial outreach sent", "Follow-up needed"], color: "#8AAFD0" },
  { label: "Qualifying", stages: ["Discovery call booked", "Demo session offered", "Demo completed"], color: "#4A90D9" },
  { label: "Closing", stages: ["Pilot proposed", "Agreement sent", "Agreement signed", "First session scheduled"], color: C.brand },
  { label: "Active", stages: ["Pilot completed", "Recurring partner"], color: C.brandDeep },
  { label: "Closed Lost", stages: ["Lost / not a fit"], color: "#9FB2CC" },
];

function PartnerPipelineView({ groups, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Phase headers */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, overflowX: "auto", paddingBottom: 0 }}>
        {STAGE_GROUPS.map((ph) => (
          <div key={ph.label} style={{
            minWidth: ph.stages.length * 200, flex: `${ph.stages.length} 0 ${ph.stages.length * 200}px`,
            background: hexA(ph.color, 0.12), border: `1px solid ${hexA(ph.color, 0.3)}`,
            borderRadius: "10px 10px 0 0", padding: "8px 14px", marginRight: 2,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: ph.color }}>
              {ph.label}
            </span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {groups.map((g) => {
          const totalPotential = g.cards.reduce((a, r) => a + (Number(r.revenuePotential) || 0), 0);
          return (
            <div key={g.key} style={{ minWidth: 198, width: 198, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              {/* Column head */}
              <div style={{
                padding: "10px 10px 8px",
                background: hexA(g.color, 0.08),
                borderLeft: `3px solid ${g.color}`,
                borderBottom: `1px solid ${C.line}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: g.color === "#9FB2CC" ? C.ink3 : g.color }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: C.ink3, fontWeight: 600, background: C.surface, padding: "1px 6px", borderRadius: 10 }}>{g.cards.length}</span>
                </div>
                {totalPotential > 0 && (
                  <div style={{ fontSize: 10.5, color: C.ink3 }}>{money(totalPotential)} potential</div>
                )}
              </div>

              {/* Cards */}
              <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                {g.cards.length === 0
                  ? <div style={{ border: `1px dashed ${C.line}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", color: C.ink3, fontSize: 12 }}>—</div>
                  : g.cards.map((r) => (
                    <button key={r.id} onClick={() => onOpen(r)} style={{
                      width: "100%", textAlign: "left", background: C.surface,
                      border: `1px solid ${C.line}`, borderLeft: `3px solid ${g.color}`,
                      borderRadius: 9, padding: "10px 10px 8px", cursor: "pointer",
                      transition: "box-shadow .12s, transform .12s",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 14px ${hexA(C.brandDeep, 0.1)}`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{cleanName(r.name)}</div>
                      {r.studioType && <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{r.studioType}{r.location ? ` · ${r.location.split(",")[0]}` : ""}</div>}
                      {r.contact && <div style={{ fontSize: 11.5, color: C.ink2 }}>{r.contact}</div>}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                        {r.closeProbability && r.closeProbability !== "Low" && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                            background: hexA(CLOSE_PROB_COLOR[r.closeProbability], 0.15),
                            color: CLOSE_PROB_COLOR[r.closeProbability] }}>{r.closeProbability}</span>
                        )}
                        {r.revenuePotential > 0 && (
                          <span style={{ fontSize: 10.5, color: C.ink3 }}>{money(r.revenuePotential)}</span>
                        )}
                        {r.nextAction && (
                          <span style={{ fontSize: 10.5, color: r.nextAction <= new Date().toISOString().slice(0,10) ? "#C0573F" : C.ink3 }}>
                            → {fmtDate(r.nextAction)}
                          </span>
                        )}
                      </div>
                      {/* Checklist mini progress */}
                      {(() => {
                        const cl = r.checklist || {};
                        const d = Object.values(cl).filter(Boolean).length;
                        const t = PARTNER_CHECKLIST.length;
                        if (d === 0) return null;
                        const pct = Math.round((d / t) * 100);
                        const col = pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold;
                        return (
                          <div style={{ marginTop: 7 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 9.5, color: C.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>Launch checklist</span>
                              <span style={{ fontSize: 9.5, color: col, fontWeight: 700 }}>{d}/{t}</span>
                            </div>
                            <div style={{ height: 4, background: C.line, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })()}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BOARD
   ============================================================ */
function BoardView({ groups, onOpen, cardKeys, ctx, section }) {
  return (
    <div className="sb-board">
      {groups.map((g) => (
        <div key={g.key} className="sb-col">
          <div className="sb-colhead">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Dot color={g.color} /> <span style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</span>
            </span>
            <span style={{ color: C.ink3, fontSize: 12 }}>{g.cards.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.cards.length === 0 && <div className="sb-emptycard">—</div>}
            {g.cards.map((r) => (
              <button key={r.id} className="sb-bcard" onClick={() => onOpen(r)} style={{ borderLeft: `3px solid ${g.color}` }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>
                  {section === "offers" || section === "followups" ? clientShort(ctx.derived.clientName[r.clientId] || cleanName(r.name)) : cleanName(r.name)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cardKeys.map((k) => cardChip(k, r, ctx)).filter(Boolean)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function cardChip(k, r, ctx) {
  if (k === "clientType" && r.clientType) return <MiniChip key={k} color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3}>{r.clientType}</MiniChip>;
  if (k === "tags" && r.tags && r.tags.length) return (
    <div key={k} style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {r.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: hexA(TAG_COLOR[t] || C.ink3, 0.15), color: TAG_COLOR[t] || C.ink3 }}>{t}</span>)}
      {r.tags.length > 2 && <span style={{ fontSize: 10, color: C.ink3 }}>+{r.tags.length - 2}</span>}
    </div>
  );
  if (k === "nextSession" && r.nextSession) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextSession)}</MiniChip>;
  if (k === "nextAction" && r.nextAction) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextAction)}</MiniChip>;
  if (k === "packageType" && r.packageType && r.packageType !== "None") return <MiniChip key={k}>{r.packageType}</MiniChip>;
  if (k === "referral" && r.referral) return <MiniChip key={k} color={REFERRAL_COLOR[r.referral]}>{r.referral} referral</MiniChip>;
  if (k === "location" && r.location) return <MiniChip key={k}>{r.location.split(",")[0]}</MiniChip>;
  if (k === "contact" && r.contact) return <MiniChip key={k}>{r.contact}</MiniChip>;
  if (k === "studioType" && r.studioType) return <MiniChip key={k}>{r.studioType}</MiniChip>;
  if (k === "closeProbability" && r.closeProbability) return <MiniChip key={k} color={CLOSE_PROB_COLOR[r.closeProbability]}>{r.closeProbability}</MiniChip>;
  if (k === "stage") return null;
  if (k === "clientId") { const n = ctx.derived.clientName[r.clientId]; return n ? <MiniChip key={k}>{clientShort(n)}</MiniChip> : null; }
  if (k === "outcome") return r.outcome ? <MiniChip key={k} color={C.brand}>done</MiniChip> : <MiniChip key={k} color={C.gold}>pending</MiniChip>;
  return null;
}

/* ============================================================
   CALENDAR (month)
   ============================================================ */
function CalendarView({ rows, today, derived, onOpen }) {
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [y, m] = cursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay();
  const daysIn = new Date(y, m, 0).getDate();
  const byDay = {};
  rows.forEach((s) => { if (s.date && s.date.slice(0, 7) === cursor) (byDay[Number(s.date.slice(8, 10))] ||= []).push(s); });
  const shift = (n) => { let mm = m + n, yy = y; if (mm < 1) { mm = 12; yy--; } if (mm > 12) { mm = 1; yy++; } setCursor(`${yy}-${String(mm).padStart(2, "0")}`); };
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  return (
    <div className="sb-card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600 }}>{MONTHS[m - 1]} {y}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="sb-iconbtn" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <button className="sb-iconbtn" onClick={() => setCursor(today.slice(0, 7))} style={{ width: "auto", padding: "0 12px", fontSize: 13 }}>Today</button>
          <button className="sb-iconbtn" onClick={() => shift(1)}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="sb-cal">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="sb-caldow">{d}</div>)}
        {cells.map((d, i) => {
          const iso = d ? `${cursor}-${String(d).padStart(2, "0")}` : null;
          const isToday = iso === today;
          return (
            <div key={i} className="sb-calcell" style={{ background: d ? (isToday ? C.brandMist : C.surface) : "transparent", border: d ? `1px solid ${isToday ? C.brand : C.line}` : "none" }}>
              {d && <div style={{ fontSize: 11, color: isToday ? C.brand : C.ink3, fontWeight: isToday ? 700 : 500, marginBottom: 4 }}>{d}</div>}
              {(byDay[d] || []).map((s) => (
                <button key={s.id} className="sb-calev" onClick={() => onOpen(s)} title={cleanName(s.name)}>
                  {clientShort(derived.partnerName[s.studioId] || cleanName(s.name))}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   RECORD DRAWER (view / edit / create)
   ============================================================ */
const FIELDS = {
  clients: [
    f("name", "Name", "text", { title: true }), f("status", "Status", "select", { options: STATUS }),
    f("clientType", "Client type", "select", { options: CLIENT_TYPE }),
    f("source", "Source", "select", { options: SOURCE }), f("referral", "Referral potential", "select", { options: REFERRAL }),
    f("phone", "Phone", "phone"), f("email", "Email", "email"),
    f("packageType", "Package type", "select", { options: PACKAGE }), f("sessionsAttended", "Sessions attended", "number"),
    f("firstSession", "First session", "date"), f("lastSession", "Last session", "date"),
    f("nextSession", "Next session", "date"), f("lifetimeValue", "Lifetime value", "currency"),
    f("tags", "Intent tags", "multiselect", { options: INTENT_TAGS, colorMap: TAG_COLOR }),
    f("notes", "Emotional notes", "textarea"),
  ],
  partners: [
    f("name", "Studio name", "text", { title: true }), f("stage", "Pipeline stage", "select", { options: STAGE }),
    f("studioType", "Studio type", "select", { options: STUDIO_TYPE }),
    f("location", "Location", "text"), f("contact", "Contact name", "text"),
    f("role", "Role", "select", { options: ["Owner", "Manager", "Director", "GM", "Instructor"] }),
    f("email", "Email", "email"), f("phone", "Phone", "phone"),
    f("estimatedCommunitySize", "Est. community size", "number"),
    f("bestFitJourney", "Best-fit journey", "text"),
    f("revenuePotential", "Revenue potential", "currency"),
    f("closeProbability", "Close probability", "select", { options: CLOSE_PROB }),
    f("revShare", "Revenue share model", "text"),
    f("contractStatus", "Contract status", "select", { options: CONTRACT_STATUS }),
    f("outreachDate", "First outreach date", "date"),
    f("lastTouch", "Last touch date", "date"),
    f("nextAction", "Next action date", "date"),
    f("avgAttendance", "Avg attendance", "number"),
    f("sessionsPerMonth", "Sessions per month", "number"),
    f("insuranceReqs", "Insurance requirements", "textarea"),
    f("promotionCommitments", "Promotion commitments", "textarea"),
    f("notes", "Conversation notes", "textarea"),
  ],
  sessions: [
    f("name", "Session name", "text", { title: true }), f("studioId", "Studio", "relation", { target: "partners" }),
    f("status", "Status", "select", { options: SESSION_STATUS }),
    f("journey", "Journey used", "select", { options: JOURNEY_TYPES }),
    f("date", "Date", "date"), f("time", "Time", "text"),
    f("capacity", "Room capacity", "number"), f("registered", "Registered attendees", "number"),
    f("attendance", "Actual attendance", "number"), f("paidAttendees", "Paid attendees", "number"),
    f("waivers", "Waivers completed", "number"), f("noShows", "No-shows", "number"),
    f("revenue", "Gross revenue", "currency"), f("studioSplit", "Studio split (paid out)", "currency"),
    f("netRevenue", "Your net revenue", "currency"),
    f("conversion", "Package conversion rate", "percent"), f("packagesSold", "Packages sold", "number"),
    f("referralsGenerated", "Referrals generated", "number"),
    f("testimonialsCapt", "Testimonials captured", "number"),
    f("roomSetupStatus", "Room setup status", "select", { options: SETUP_STATUS }),
    f("musicSetupStatus", "Music/headset status", "select", { options: SETUP_STATUS }),
    f("equipmentNeeded", "Equipment needed", "textarea"),
    f("notes", "Session notes", "textarea"),
  ],
  offers: [
    f("name", "Offer", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("offerType", "Offer type", "select", { options: OFFER_TYPE }), f("price", "Amount", "currency"),
    f("status", "Status", "select", { options: OFFER_STATUS }),
    f("probability", "Close probability", "select", { options: OFFER_PROB }),
    f("source", "Source", "select", { options: SOURCE }),
    f("dateOffered", "Date offered", "date"), f("expireDate", "Expiration date", "date"), f("followUpDate", "Follow-up date", "date"),
    f("notes", "Notes", "textarea"), f("reasonLost", "Reason lost", "text"),
  ],
  revenue: [
    f("name", "Description", "text", { title: true }), f("date", "Date", "date"),
    f("channel", "Channel", "select", { options: REV_CHANNEL }),
    f("gross", "Gross revenue", "currency"), f("stripeFee", "Processing fee (Stripe)", "currency"),
    f("studioSplit", "Studio split", "currency"), f("facilitatorCost", "Facilitator cost", "currency"), f("refunds", "Refunds", "currency"),
    f("source", "Source", "select", { options: SOURCE }), f("campaign", "Campaign", "text"),
    f("sessionId", "Session", "relation", { target: "sessions" }), f("clientId", "Client", "relation", { target: "clients" }),
    f("costCenter", "Cost center", "select", { options: COST_CENTER }), f("notes", "Notes", "textarea"),
  ],
  content: [
    f("name", "Content title", "text", { title: true }), f("type", "Type", "select", { options: CONTENT_TYPE }),
    f("platform", "Platform", "select", { options: PLATFORM }), f("datePosted", "Date posted", "date"),
    f("engagement", "Engagement", "number"), f("leads", "Leads generated", "number"), f("booked", "Sessions booked", "number"),
  ],
  followups: [
    f("name", "Follow-up", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("stage", "Stage", "select", { options: STATUS }), f("futype", "Follow-up type", "select", { options: FUTYPE }),
    f("lastContact", "Last contact", "date"), f("nextAction", "Next action", "date"), f("outcome", "Outcome", "textarea"),
  ],
};
function f(key, label, type, opts = {}) { return { key, label, type, ...opts }; }

function RecordDrawer({ db, record, data, derived, today, onClose, onSave, onDelete, onOpenRelated, sequences, onStartSequence }) {
  const [draft, setDraft] = useState(record);
  const [tab, setTab] = useState("details");
  useEffect(() => { setDraft(record); setTab("details"); }, [record]);
  const fields = FIELDS[db];
  const titleField = fields.find((x) => x.title);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const isNew = !data[db].some((r) => r.id === record.id);
  const hasTimeline = (db === "clients" || db === "partners") && !isNew;
  const hasChecklist = db === "partners" && !isNew;
  const hasSessionTabs = db === "sessions" && !isNew;

  // related records (used in details tab)
  const related = [];
  if (db === "clients") {
    related.push({ label: "Offers", items: data.offers.filter((o) => o.clientId === draft.id), dbk: "offers", render: (o) => `${o.offerType} · ${money(o.price)} · ${o.status}` });
    related.push({ label: "Follow-ups", items: data.followups.filter((x) => x.clientId === draft.id), dbk: "followups", render: (x) => `${x.futype} · ${fmtDate(x.nextAction)}${x.outcome ? " · done" : ""}` });
    const acc = derived.acceptedByClient[draft.id] || 0;
    related.unshift({ label: "Accepted offers total", note: money(acc) });
  }
  if (db === "partners") {
    const ses = derived.sessionsByStudio[draft.id] || [];
    related.push({ label: "Sessions", items: ses, dbk: "sessions", render: (s) => `${fmtDate(s.date)} · ${s.attendance} in room · ${money(s.netRevenue)} net` });
    if (ses.length) related.unshift({ label: "Logged", note: `${ses.length} sessions · avg ${Math.round(sum(ses, "attendance") / ses.length)} attending` });
  }

  return (
    <div className="sb-drawerwrap" onMouseDown={onClose}>
      <div className={"sb-drawer" + (hasTimeline && tab === "timeline" ? " sb-drawer-wide" : "")}
        onMouseDown={(e) => e.stopPropagation()}>

        <div className="sb-drawerhead">
          <span className="sb-eyebrow">{isNew ? "New" : "Edit"} · {sectionLabel(db)}</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Title + tab switcher */}
        <div style={{ padding: "14px 20px 0", borderBottom: `1px solid ${C.line}` }}>
          <input className="sb-titleinput" style={{ marginBottom: 10 }} value={draft[titleField.key] || ""} placeholder="Untitled"
            onChange={(e) => set(titleField.key, e.target.value)} />
          {(hasTimeline || hasSessionTabs) && (
            <div style={{ display: "flex", gap: 2 }}>
              {(hasSessionTabs ? [
                ["details", "Details & Edit"],
                ["checklist", "Run Checklist"],
                ["performance", "Performance"],
              ] : [
                ["details", "Details & Edit"],
                ...(hasChecklist ? [["checklist", "Launch Checklist"]] : []),
                ["timeline", "Contact Timeline"],
              ]).map(([t, label]) => {
                const done = (t === "checklist" && db === "partners") ? Object.values(draft.checklist || {}).filter(Boolean).length
                           : (t === "checklist" && db === "sessions") ? Object.values(draft.checklist || {}).filter(Boolean).length : null;
                const total = (t === "checklist" && db === "partners") ? PARTNER_CHECKLIST.length
                            : (t === "checklist" && db === "sessions") ? SESSION_CHECKLIST.length : null;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "7px 14px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", background: tab === t ? C.brand : "transparent",
                    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {label}
                    {done != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                        background: done === total ? "#4A8C6F" : tab === t ? "rgba(255,255,255,0.25)" : C.brandSoft,
                        color: done === total ? "#fff" : tab === t ? "#fff" : C.brandDeep,
                      }}>{done}/{total}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sb-drawerbody" style={{ paddingTop: 16 }}>
          {hasTimeline && tab === "timeline"
            ? <ContactTimeline db={db} record={draft} data={data} derived={derived} today={today} onOpenRelated={onOpenRelated} />
            : (hasChecklist || hasSessionTabs) && tab === "checklist"
            ? db === "sessions"
              ? <SessionChecklist checklist={draft.checklist || emptySessionChecklist()} onChange={(cl) => set("checklist", cl)} sessionName={cleanName(draft.name)} status={draft.status} />
              : <PartnerLaunchChecklist checklist={draft.checklist || emptyChecklist()} onChange={(cl) => set("checklist", cl)} partnerName={cleanName(draft.name)} />
            : hasSessionTabs && tab === "performance"
            ? <SessionPerformance record={draft} derived={derived} data={data} />
            : (
              <>
                <div className="sb-fields">
                  {fields.filter((x) => !x.title).map((fld) => (
                    <FieldInput key={fld.key} fld={fld} value={draft[fld.key]} onChange={(v) => set(fld.key, v)} data={data} />
                  ))}
                </div>

                {related.length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    {related.map((rel, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div className="sb-rellabel"><Link2 size={13} /> {rel.label}{rel.note ? <span style={{ marginLeft: "auto", color: C.brand, fontWeight: 700 }}>{rel.note}</span> : null}</div>
                        {rel.items && (rel.items.length === 0
                          ? <div style={{ fontSize: 12.5, color: C.ink3, padding: "6px 2px" }}>None yet.</div>
                          : rel.items.map((it) => (
                            <button key={it.id} className="sb-relrow" onClick={() => onOpenRelated({ db: rel.dbk, record: it })}>
                              <span style={{ flex: 1, textAlign: "left" }}>{cleanName(it.name)}</span>
                              <span style={{ color: C.ink2, fontSize: 12 }}>{rel.render(it)}</span>
                              <ArrowUpRight size={13} color={C.ink3} />
                            </button>
                          )))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
        </div>

        <div className="sb-drawerfoot">
          {!isNew && <button className="sb-danger" onClick={() => onDelete(draft.id)}><Trash2 size={15} /> Delete</button>}
          {db === "clients" && !isNew && (() => {
            const activeSeq = (sequences || []).find(s => s.clientId === draft.id && s.status === "active");
            const completed  = (sequences || []).some(s => s.clientId === draft.id && s.status === "completed");
            if (activeSeq) return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.brand, fontWeight: 600 }}>
                <Zap size={13} /> Sequence active · step {activeSeq.steps.filter(s=>s.sent).length}/{activeSeq.steps.length}
              </div>
            );
            return (
              <button onClick={() => onStartSequence(draft)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`,
                color: C.brandDeep, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
              }}>
                <Zap size={13} /> {completed ? "Restart Sequence" : "Start Follow-up Sequence"}
              </button>
            );
          })()}
          <div style={{ flex: 1 }} />
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          {tab !== "timeline" && <button className="sb-primary" onClick={() => onSave(draft)}>Save</button>}        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SESSION PERFORMANCE VIEW (list)
   ============================================================ */
function SessionPerfView({ rows, derived, onOpen }) {
  if (!rows.length) return <Empty pad>No sessions logged yet.</Empty>;

  const allNet = rows.map((r) => Number(r.netRevenue) || 0);
  const avgNet = allNet.reduce((a, b) => a + b, 0) / allNet.length;
  const allConv = rows.filter((r) => r.conversion > 0).map((r) => Number(r.conversion));
  const avgConv = allConv.length ? allConv.reduce((a, b) => a + b, 0) / allConv.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Benchmark row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 4 }}>
        {[
          { label: "Sessions", val: rows.length },
          { label: "Total net", val: money(allNet.reduce((a, b) => a + b, 0)) },
          { label: "Avg net/session", val: money(Math.round(avgNet)) },
          { label: "Avg conversion", val: pct(avgConv) },
        ].map(({ label, val }) => (
          <div key={label} className="sb-card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Per-session cards */}
      {rows.map((r) => {
        const net = Number(r.netRevenue) || 0;
        const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
        const revPerHead = r.attendance ? Math.round(net / r.attendance) : 0;
        const above = net >= avgNet;
        const convColor = r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : r.conversion > 0 ? C.gold : C.ink3;
        const studio = clientShort(derived.partnerName[r.studioId] || "");

        // "Why" analysis
        const insights = [];
        if (r.paidAttendees && r.attendance && r.paidAttendees < r.attendance) insights.push(`${r.attendance - r.paidAttendees} unpaid attendee${r.attendance - r.paidAttendees > 1 ? "s" : ""} — tighten payment flow`);
        if (capUtil !== null && capUtil < 60) insights.push(`Room only ${capUtil}% full — boost pre-session promotion`);
        if (capUtil !== null && capUtil >= 95) insights.push(`Near/at capacity — explore larger room or add date`);
        if (!r.testimonialsCapt || r.testimonialsCapt === 0) insights.push("No testimonials captured — add ask at close");
        if (!r.followUpSent) insights.push("24h follow-up not sent yet");
        if (!r.rebookOfferSent) insights.push("Rebook offer not sent");
        if (r.referralsGenerated === 0) insights.push("No referrals generated — make the ask next time");
        if (r.noShows > 2) insights.push(`${r.noShows} no-shows — consider confirmation texts`);

        return (
          <div key={r.id} className="sb-card" style={{ borderLeft: `4px solid ${above ? "#4A8C6F" : net === 0 ? "#C0573F" : C.gold}`, cursor: "pointer" }}
            onClick={() => onOpen(r)}>
            <div style={{ padding: "14px 16px 12px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cleanName(r.name)}</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{studio} · {fmtDate(r.date)}{r.time ? ` · ${r.time}` : ""} · {r.journey || ""}</div>
                </div>
                <Tag color={SESSION_STATUS_COLOR[r.status] || C.ink3} soft>{r.status || "—"}</Tag>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: insights.length ? 12 : 0 }}>
                {[
                  { label: "In room", val: `${r.attendance || 0}${r.capacity ? `/${r.capacity}` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : null },
                  { label: "Paid", val: r.paidAttendees || r.attendance || 0 },
                  { label: "Net rev", val: money(net), accent: above ? "#4A8C6F" : net === 0 ? "#C0573F" : null },
                  { label: "Rev/head", val: money(revPerHead) },
                  { label: "Conversion", val: pct(r.conversion), accent: convColor },
                  { label: "Pkgs sold", val: r.packagesSold || 0 },
                ].map(({ label, val, accent }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accent || C.ink, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div style={{ background: hexA(C.gold, 0.08), borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: C.gold, marginBottom: 2 }}>What to improve</div>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.ink2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.gold }}>›</span> {ins}
                    </div>
                  ))}
                </div>
              )}
              {insights.length === 0 && r.status === "Closed out" && (
                <div style={{ fontSize: 12, color: "#4A8C6F", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={13} /> Session fully closed out — all post-session items complete.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SESSION CHECKLIST
   ============================================================ */
function SessionChecklist({ checklist, onChange, sessionName, status }) {
  const toggle = (id) => onChange({ ...checklist, [id]: !checklist[id] });
  const done = Object.values(checklist).filter(Boolean).length;
  const total = SESSION_CHECKLIST.length;
  const pctDone = Math.round((done / total) * 100);
  const isCompleted = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — Run Checklist</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{done} of {total} items complete</div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pctDone === 100 ? "#4A8C6F" : pctDone >= 50 ? C.brand : C.gold }}>
            {pctDone}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pctDone + "%",
            background: pctDone === 100 ? "#4A8C6F" : pctDone >= 50 ? C.brand : C.gold }} />
        </div>
      </div>

      {SESSION_CHECKLIST_PHASES.map((phase) => {
        const items = SESSION_CHECKLIST.filter((i) => i.phase === phase);
        const phaseDone = items.filter((i) => checklist[i.id]).length;
        const color = SESSION_PHASE_COLOR[phase];
        const isPost = phase === "Post-Session";
        return (
          <div key={phase} style={{ opacity: isPost && !isCompleted ? 0.55 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color }}>{phase}</span>
              {isPost && !isCompleted && <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span>}
              <span style={{ fontSize: 11, color: C.ink3, marginLeft: "auto" }}>{phaseDone}/{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map((item) => {
                const checked = !!checklist[item.id];
                const disabled = isPost && !isCompleted;
                return (
                  <button key={item.id} onClick={() => !disabled && toggle(item.id)} disabled={disabled} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: checked ? hexA(color, 0.07) : "transparent",
                    border: "none", borderRadius: 8, padding: "9px 10px",
                    cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? color : C.line}`,
                      background: checked ? color : C.surface, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, transition: "all .12s",
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SESSION PERFORMANCE (drawer tab)
   ============================================================ */
function SessionPerformance({ record: r, derived, data }) {
  const net = Number(r.netRevenue) || 0;
  const gross = Number(r.revenue) || 0;
  const split = Number(r.studioSplit) || 0;
  const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
  const revPerHead = r.attendance ? (net / r.attendance).toFixed(2) : 0;
  const fillRate = r.registered ? Math.round(((r.attendance || 0) / r.registered) * 100) : null;
  const studio = clientShort(derived.partnerName[r.studioId] || "");

  // Benchmarks from all sessions
  const allSessions = data.sessions.filter((s) => s.id !== r.id && (Number(s.netRevenue) || 0) > 0);
  const avgNetAll = allSessions.length ? allSessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0) / allSessions.length : null;
  const avgConvAll = allSessions.filter((s) => s.conversion > 0).length
    ? allSessions.filter((s) => s.conversion > 0).reduce((a, s) => a + Number(s.conversion), 0) / allSessions.filter((s) => s.conversion > 0).length
    : null;

  const metrics = [
    { label: "Status",          val: r.status || "—", accent: SESSION_STATUS_COLOR[r.status] },
    { label: "Journey",         val: r.journey || "—" },
    { label: "Studio",          val: studio || "—" },
    { label: "Date & time",     val: `${fmtDate(r.date)}${r.time ? ` · ${r.time}` : ""}` },
    { label: "Capacity",        val: r.capacity || "—" },
    { label: "Registered",      val: r.registered || "—" },
    { label: "Attended",        val: `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : capUtil >= 90 ? "#4A8C6F" : null },
    { label: "Paid attendees",  val: r.paidAttendees || r.attendance || 0 },
    { label: "Waivers",         val: r.waivers || 0 },
    { label: "No-shows",        val: r.noShows || 0, accent: (r.noShows || 0) > 2 ? C.gold : null },
    { label: "Gross revenue",   val: money(gross) },
    { label: "Studio split",    val: money(split), accent: C.gold },
    { label: "Your net",        val: money(net), accent: net > 0 ? "#4A8C6F" : "#C0573F" },
    { label: "Rev per head",    val: money(revPerHead) },
    { label: "Conversion rate", val: pct(r.conversion), accent: r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : C.gold },
    { label: "Packages sold",   val: r.packagesSold || 0 },
    { label: "Testimonials",    val: r.testimonialsCapt || 0, accent: (r.testimonialsCapt || 0) === 0 ? C.gold : null },
    { label: "Referrals",       val: r.referralsGenerated || 0 },
  ];

  const postItems = [
    { label: "Follow-up sent",     done: r.followUpSent },
    { label: "Rebook offer sent",  done: r.rebookOfferSent },
    { label: "Referrals requested",done: r.referralsRequested },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {metrics.map(({ label, val, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      {gross > 0 && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 10 }}>Revenue breakdown</div>
          <div style={{ background: C.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
            {[
              { label: "Gross revenue", amount: gross, color: C.brand, pct: 100 },
              { label: "Studio split (out)", amount: -split, color: C.gold, pct: gross ? Math.round((split / gross) * 100) : 0 },
              { label: "Your net", amount: net, color: "#4A8C6F", pct: gross ? Math.round((net / gross) * 100) : 0 },
            ].map(({ label, amount, color, pct: p }) => (
              <div key={label} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{amount < 0 ? "-" : ""}{money(Math.abs(amount))}</span>
                </div>
                <div style={{ height: 5, background: C.line, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: p + "%", background: color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* vs. average */}
      {avgNetAll !== null && (
        <div style={{ background: net >= avgNetAll ? hexA("#4A8C6F", 0.08) : hexA(C.gold, 0.08), borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>vs. your average</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>This session net</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: net >= avgNetAll ? "#4A8C6F" : C.gold }}>{money(net)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg net ({allSessions.length} sessions)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{money(Math.round(avgNetAll))}</div>
            </div>
            {avgConvAll !== null && <>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>This session conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.conversion >= avgConvAll ? "#4A8C6F" : C.gold }}>{pct(r.conversion)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{pct(avgConvAll)}</div>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* Post-session actions */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 8 }}>Post-session actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {postItems.map(({ label, done }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: done ? hexA("#4A8C6F", 0.07) : hexA(C.gold, 0.07) }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#4A8C6F" : C.line, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: done ? C.ink3 : C.ink, textDecoration: done ? "line-through" : "none" }}>{label}</span>
              {!done && <span style={{ marginLeft: "auto", fontSize: 11, color: C.gold, fontWeight: 600 }}>Pending</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment & notes */}
      {r.equipmentNeeded && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Equipment needed</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px" }}>{r.equipmentNeeded}</div>
        </div>
      )}
      {r.notes && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Session notes</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px", fontStyle: "italic", lineHeight: 1.5 }}>{r.notes}</div>
        </div>
      )}
    </div>
  );
}
/* ============================================================
   PARTNER LAUNCH CHECKLIST
   ============================================================ */
function PartnerLaunchChecklist({ checklist, onChange, partnerName }) {
  const toggle = (id) => onChange({ ...checklist, [id]: !checklist[id] });
  const done = Object.values(checklist).filter(Boolean).length;
  const total = PARTNER_CHECKLIST.length;
  const pctDone = Math.round((done / total) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Progress header */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{partnerName} — Launch Checklist</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{done} of {total} items complete</div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pctDone === 100 ? "#4A8C6F" : pctDone >= 60 ? C.brand : C.gold }}>
            {pctDone}%
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 8, transition: "width .3s ease",
            width: pctDone + "%",
            background: pctDone === 100 ? "#4A8C6F" : pctDone >= 60 ? C.brand : C.gold,
          }} />
        </div>
        {pctDone === 100 && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: "#4A8C6F", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
            <Check size={14} /> All launch items complete — this partner is fully onboarded.
          </div>
        )}
      </div>

      {/* Categories */}
      {CHECKLIST_CATS.map((cat) => {
        const items = PARTNER_CHECKLIST.filter((i) => i.cat === cat);
        const catDone = items.filter((i) => checklist[i.id]).length;
        const color = CHECKLIST_CAT_COLOR[cat];
        return (
          <div key={cat}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color }}>{cat}</span>
              <span style={{ fontSize: 11, color: C.ink3, marginLeft: "auto" }}>{catDone}/{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map((item) => {
                const checked = !!checklist[item.id];
                return (
                  <button key={item.id} onClick={() => toggle(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: checked ? hexA(color, 0.07) : "transparent",
                    border: "none", borderRadius: 8, padding: "9px 10px", cursor: "pointer",
                    transition: "background .12s",
                  }}>
                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? color : C.line}`,
                      background: checked ? color : C.surface, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, transition: "all .12s",
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{
                      fontSize: 13.5, fontWeight: checked ? 500 : 400,
                      color: checked ? C.ink3 : C.ink,
                      textDecoration: checked ? "line-through" : "none",
                    }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   CONTACT TIMELINE
   ============================================================ */
const TL_COLORS = {
  session:    C.brand,
  offer_sent: C.gold,
  offer_won:  "#4A8C6F",
  offer_lost: "#C0573F",
  followup:   "#7B68EE",
  referral:   C.gold,
  upcoming:   C.ink3,
  milestone:  C.brandDeep,
};

function tlEvent(date, type, title, detail, extra = {}) {
  return { date: date || "", type, title, detail, ...extra };
}

function buildClientTimeline(record, data, today) {
  const events = [];
  const clientOffers = data.offers.filter((o) => o.clientId === record.id);
  const clientFUs = data.followups.filter((f) => f.clientId === record.id);

  // First contact / lead added
  const firstDate = record.firstSession || record.nextSession || "";
  if (firstDate) {
    events.push(tlEvent(record.firstSession || "", "milestone",
      "First session attended",
      [record.source && `Source: ${record.source}`, record.packageType !== "None" && record.packageType && `Package: ${record.packageType}`].filter(Boolean).join(" · ") || "No package yet",
      { sub: record.notes || "" }));
  } else {
    events.push(tlEvent("", "milestone", "Lead added", `Source: ${record.source || "—"} · Status: ${record.status}`, { sub: record.notes || "" }));
  }

  // All sessions (we use firstSession as start, lastSession as most recent)
  if (record.lastSession && record.lastSession !== record.firstSession) {
    const count = Number(record.sessionsAttended) || 0;
    events.push(tlEvent(record.lastSession, "session",
      `Most recent session — session #${count}`,
      `${count} total session${count !== 1 ? "s" : ""} attended · LTV: ${money(record.lifetimeValue)}`));
  }

  // Offers
  clientOffers.forEach((o) => {
    events.push(tlEvent(o.dateOffered, "offer_sent",
      `${o.offerType} offer sent`,
      `${money(o.price)} · status: ${o.status}`,
      { offerId: o.id }));
    if (o.closeDate && o.status !== "Offered") {
      events.push(tlEvent(o.closeDate,
        o.status === "Accepted" ? "offer_won" : "offer_lost",
        `${o.offerType} ${o.status.toLowerCase()}`,
        o.status === "Accepted" ? `Payment received: ${money(o.price)}` : `Declined on ${fmtDate(o.closeDate)}`,
        { offerId: o.id }));
    }
  });

  // Follow-ups
  clientFUs.forEach((f) => {
    events.push(tlEvent(f.lastContact, "followup",
      `${f.futype} follow-up`,
      f.outcome || "Pending response",
      { pending: !f.outcome, nextAction: f.nextAction }));
  });

  // Next session (future)
  if (record.nextSession && record.nextSession >= today) {
    events.push(tlEvent(record.nextSession, "upcoming",
      "Next session scheduled",
      fmtDate(record.nextSession, true),
      { future: true }));
  }

  // Referral status
  const pendingFU = clientFUs.find((f) => !f.outcome && f.nextAction);
  const highReferral = record.referral === "High";
  const isAdvocate = record.status === "Advocate";

  return {
    events: events.filter((e) => e.date || e.type === "milestone").sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Status",        value: record.status },
      { label: "Segment",       value: record.clientType || "—", accent: CLIENT_TYPE_COLOR[record.clientType] },
      { label: "Source",        value: record.source || "—" },
      { label: "First session", value: fmtDate(record.firstSession) || "Not yet" },
      { label: "Sessions",      value: `${record.sessionsAttended || 0} attended` },
      { label: "Package",       value: record.packageType || "None" },
      { label: "Lifetime value",value: money(record.lifetimeValue || 0) },
      { label: "Referral",      value: record.referral + " potential", accent: REFERRAL_COLOR[record.referral] },
      { label: "Open offers",   value: clientOffers.filter((o) => OPEN_STATUSES.includes(o.status)).length + " pending" },
      { label: "Intent tags",   value: (record.tags || []).join(", ") || "None set" },
      { label: "Testimonial",   value: isAdvocate ? "Advocate — request now" : highReferral ? "High potential — not yet requested" : "Not yet requested" },
      { label: "Next follow-up",value: pendingFU ? fmtDate(pendingFU.nextAction) : "None scheduled", accent: pendingFU && pendingFU.nextAction <= today ? "#C0573F" : null },
    ],
  };
}

function buildPartnerTimeline(record, data, derived, today) {
  const sessions = [...(derived.sessionsByStudio[record.id] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalNet = sessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const totalAttend = sessions.reduce((a, s) => a + (Number(s.attendance) || 0), 0);
  const avgAttend = sessions.length ? Math.round(totalAttend / sessions.length) : 0;

  const events = [];

  // Partnership milestone
  events.push(tlEvent(record.outreachDate || sessions[0]?.date || "", "milestone",
    `Partnership: ${record.stage}`,
    `${record.revShare || "Revenue share TBD"} · Contact: ${record.contact} (${record.role})`));

  // Outreach date (if different from first session)
  if (record.outreachDate) {
    events.push(tlEvent(record.outreachDate, "followup",
      "First outreach sent",
      `Initial contact with ${record.contact} · ${record.studioType || "Studio"}`));
  }

  // Last touch
  if (record.lastTouch && record.lastTouch !== record.outreachDate) {
    events.push(tlEvent(record.lastTouch, "followup",
      "Last touchpoint",
      record.notes ? record.notes.slice(0, 100) : "Check notes for details"));
  };

  // All sessions as events
  sessions.forEach((s, i) => {
    events.push(tlEvent(s.date, "session",
      `Session ${i + 1}: ${cleanName(s.name)}`,
      `${s.attendance} in room · ${money(s.netRevenue)} net · ${pct(s.conversion)} conversion · ${s.packagesSold} pkg sold`,
      { notes: s.notes, sessionId: s.id }));
  });

  // Upcoming sessions
  const upcomingSessions = data.sessions.filter((s) => s.studioId === record.id && s.date >= today);
  upcomingSessions.forEach((s) => {
    if (!sessions.find((x) => x.id === s.id)) {
      events.push(tlEvent(s.date, "upcoming", `Upcoming: ${cleanName(s.name)}`, fmtDate(s.date, true), { future: true }));
    }
  });

  // Next action
  if (record.nextAction) {
    events.push(tlEvent(record.nextAction, "upcoming",
      `Next action scheduled`,
      `Follow up with ${record.contact}`,
      { future: record.nextAction >= today, pending: record.nextAction < today, nextAction: record.nextAction }));
  }

  return {
    events: events.sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Stage",             value: record.stage, accent: STAGE_COLOR[record.stage] },
      { label: "Studio type",       value: record.studioType || "—" },
      { label: "Location",          value: record.location || "—" },
      { label: "Contact",           value: `${record.contact || "—"} (${record.role || "—"})` },
      { label: "Email",             value: record.email || "—" },
      { label: "Est. community",    value: record.estimatedCommunitySize ? Number(record.estimatedCommunitySize).toLocaleString() + " people" : "—" },
      { label: "Revenue potential", value: money(record.revenuePotential || 0), accent: C.brand },
      { label: "Close probability", value: record.closeProbability || "—", accent: CLOSE_PROB_COLOR[record.closeProbability] },
      { label: "Revenue share",     value: record.revShare || "TBD" },
      { label: "Contract status",   value: record.contractStatus || "None" },
      { label: "First outreach",    value: fmtDate(record.outreachDate) || "—" },
      { label: "Last touch",        value: fmtDate(record.lastTouch) || "—" },
      { label: "Next action",       value: fmtDate(record.nextAction) || "None scheduled", accent: record.nextAction && record.nextAction <= today ? "#C0573F" : null },
      { label: "Total sessions",    value: sessions.length + " logged" },
      { label: "Avg attendance",    value: avgAttend + " per session" },
      { label: "Total net revenue", value: money(totalNet), accent: C.brand },
    ],
  };
}

function ContactTimeline({ db, record, data, derived, today, onOpenRelated }) {
  const { events, summary } = db === "clients"
    ? buildClientTimeline(record, data, today)
    : buildPartnerTimeline(record, data, derived, today);

  const TL_ICON = {
    session:    <Wind size={13} />,
    offer_sent: <DollarSign size={13} />,
    offer_won:  <Check size={13} />,
    offer_lost: <X size={13} />,
    followup:   <Phone size={13} />,
    referral:   <Users size={13} />,
    upcoming:   <CalendarDays size={13} />,
    milestone:  <ArrowUpRight size={13} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {summary.map(({ label, value, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 12 }}>
          Timeline · {events.length} event{events.length !== 1 ? "s" : ""}
        </div>

        {events.length === 0
          ? <Empty pad>No events logged yet — add sessions, offers, and follow-ups to build this timeline.</Empty>
          : (
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: C.line, borderRadius: 2 }} />

              {events.map((ev, i) => {
                const color = TL_COLORS[ev.type] || C.ink3;
                const isFuture = ev.future || (ev.date && ev.date > today);
                return (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, opacity: isFuture ? 0.7 : 1 }}>
                    {/* Dot */}
                    <div style={{ flexShrink: 0, width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: isFuture ? C.surfaceAlt : color,
                        border: `2px solid ${isFuture ? C.line : color}`, display: "flex", alignItems: "center",
                        justifyContent: "center", color: isFuture ? C.ink3 : "#fff", zIndex: 1, position: "relative",
                      }}>
                        {TL_ICON[ev.type]}
                      </div>
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, background: isFuture ? "transparent" : C.surface,
                      border: `1px solid ${isFuture ? C.lineSoft : C.line}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 2,
                      borderLeft: isFuture ? undefined : `3px solid ${color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{ev.title}</div>
                        {ev.date && (
                          <span style={{ fontSize: 11, color: isFuture ? C.ink3 : C.brand, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {isFuture ? "📅 " : ""}{fmtDate(ev.date)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{ev.detail}</div>
                      {ev.sub && ev.sub.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.sub.length > 180 ? ev.sub.slice(0, 180) + "…" : ev.sub}
                        </div>
                      )}
                      {ev.notes && ev.notes.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.notes.length > 180 ? ev.notes.slice(0, 180) + "…" : ev.notes}
                        </div>
                      )}
                      {ev.pending && ev.nextAction && (
                        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                          color: ev.nextAction <= today ? "#C0573F" : C.gold, background: ev.nextAction <= today ? hexA("#C0573F", 0.1) : C.goldSoft,
                          padding: "2px 8px", borderRadius: 6 }}>
                          <CalendarDays size={11} />
                          Next action: {fmtDate(ev.nextAction)}{ev.nextAction <= today ? " · overdue" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

function FieldInput({ fld, value, onChange, data }) {
  const { type } = fld;
  let control;
  if (type === "select") {
    control = (
      <div className="sb-chiprow">
        {fld.options.map((o) => {
          const on = value === o;
          const cl = fld.key === "status" || fld.key === "stage" ? (STATUS_COLOR[o] || STAGE_COLOR[o]) : C.brand;
          return <button key={o} className="sb-selchip" onClick={() => onChange(o)}
            style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>{o}</button>;
        })}
      </div>
    );
  } else if (type === "multiselect") {
    const vals = Array.isArray(value) ? value : [];
    control = (
      <div className="sb-chiprow" style={{ flexWrap: "wrap" }}>
        {fld.options.map((o) => {
          const on = vals.includes(o);
          const cl = fld.colorMap ? (fld.colorMap[o] || C.brand) : C.brand;
          return (
            <button key={o} className="sb-selchip" onClick={() => onChange(on ? vals.filter(v => v !== o) : [...vals, o])}
              style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (type === "relation") {
    control = (
      <select className="sb-input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— none —</option>
        {data[fld.target].map((r) => <option key={r.id} value={r.id}>{cleanName(r.name)}</option>)}
      </select>
    );
  } else if (type === "textarea") {
    control = <textarea className="sb-input" rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "date") {
    control = <input className="sb-input" type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "number" || type === "currency" || type === "percent") {
    control = (
      <div style={{ position: "relative" }}>
        {type === "currency" && <span className="sb-affix" style={{ left: 10 }}>$</span>}
        <input className="sb-input" type="number" step={type === "percent" ? "0.01" : "any"}
          style={{ paddingLeft: type === "currency" ? 22 : 12 }}
          value={value === "" || value == null ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        {type === "percent" && <span className="sb-affix" style={{ right: 10 }}>{value !== "" && value != null ? pct(value) : "0–1"}</span>}
      </div>
    );
  } else {
    control = <input className="sb-input" type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
      value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className={"sb-field" + (type === "textarea" || type === "select" ? " sb-field-wide" : "")}>
      <span className="sb-flabel">{fld.label}</span>
      {control}
    </label>
  );
}

/* ============================================================
   CSV IMPORT
   ============================================================ */
const IMPORT_MAP = {
  partners: { file: "02-Studio-Partners.csv", map: { "studio name": "name", location: "location", "contact name": "contact", role: "role", email: "email", phone: "phone", "partnership stage": "stage", "revenue share model": "revShare", "avg attendance": "avgAttendance", "sessions per month": "sessionsPerMonth", notes: "notes" }, nums: ["avgAttendance", "sessionsPerMonth"] },
  clients: { file: "01-Clients.csv", map: { name: "name", phone: "phone", email: "email", source: "source", status: "status", "first session date": "firstSession", "sessions attended": "sessionsAttended", "last session date": "lastSession", "next session date": "nextSession", "package type": "packageType", "lifetime value": "lifetimeValue", "emotional notes": "notes", "referral potential": "referral" }, nums: ["sessionsAttended", "lifetimeValue"] },
  sessions: { file: "03-Sessions.csv", map: { "session name": "name", studio: "_studio", date: "date", "attendance count": "attendance", revenue: "revenue", "your net revenue": "netRevenue", "conversion rate": "conversion", "packages sold": "packagesSold", "referrals generated": "referralsGenerated", notes: "notes" }, nums: ["attendance", "revenue", "netRevenue", "conversion", "packagesSold", "referralsGenerated"], rel: { field: "_studio", to: "partners", set: "studioId" } },
  offers: { file: "04-Offers-Sales.csv", map: { offer: "name", "client name": "_client", "offer type": "offerType", price: "price", status: "status", "date offered": "dateOffered", "close date": "closeDate" }, nums: ["price"], rel: { field: "_client", to: "clients", set: "clientId" } },
  content: { file: "05-Content-Referral.csv", map: { "content title": "name", type: "type", platform: "platform", "date posted": "datePosted", engagement: "engagement", "leads generated": "leads", "sessions booked": "booked" }, nums: ["engagement", "leads", "booked"] },
  followups: { file: "06-Follow-Ups.csv", map: { "follow-up": "name", "client name": "_client", stage: "stage", "last contact date": "lastContact", "follow-up type": "futype", "next action date": "nextAction", outcome: "outcome" }, rel: { field: "_client", to: "clients", set: "clientId" } },
};
const DB_ORDER = ["partners", "clients", "sessions", "offers", "content", "followups"];

function ImportModal({ data, setData, onClose }) {
  const [staged, setStaged] = useState({});  // db -> parsed rows
  const [busy, setBusy] = useState(false);

  const handleFile = (db, file) => {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const spec = IMPORT_MAP[db];
        const rows = res.data.map((raw) => {
          const rec = { id: uid(db) };
          const lower = {};
          Object.keys(raw).forEach((k) => { lower[norm(k)] = raw[k]; });
          Object.entries(spec.map).forEach(([csvKey, field]) => {
            let val = lower[csvKey] ?? "";
            if (spec.nums && spec.nums.includes(field)) val = num(val);
            rec[field] = val;
          });
          return rec;
        }).filter((r) => Object.values(r).some((v) => v !== "" && v !== 0 && v != null && String(v) !== r.id));
        setStaged((s) => ({ ...s, [db]: rows }));
      },
    });
  };

  const apply = () => {
    setBusy(true);
    setData((cur) => {
      const next = { ...cur };
      // import partners & clients first so relations can resolve
      DB_ORDER.forEach((db) => { if (staged[db]) next[db] = staged[db].map((r) => ({ ...r })); });
      // wire relations
      DB_ORDER.forEach((db) => {
        const spec = IMPORT_MAP[db];
        if (spec.rel && next[db]) {
          const targetRows = next[spec.rel.to];
          next[db] = next[db].map((r) => {
            const wanted = norm(r[spec.rel.field]);
            const match = targetRows.find((t) => norm(t.name) === wanted);
            const { [spec.rel.field]: _omit, ...rest } = r;
            return { ...rest, [spec.rel.set]: match ? match.id : "" };
          });
        } else if (next[db]) {
          next[db] = next[db].map((r) => { const { _studio, _client, ...rest } = r; return rest; });
        }
      });
      return next;
    });
    setTimeout(onClose, 200);
  };

  const stagedCount = Object.values(staged).reduce((a, r) => a + r.length, 0);

  return (
    <div className="sb-drawerwrap" onMouseDown={onClose}>
      <div className="sb-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sb-drawerhead">
          <span className="sb-eyebrow">Import CSVs</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: C.ink2, marginTop: 0, lineHeight: 1.5 }}>
            Drop in any of the six files to replace that table. Studio and client names are matched automatically to
            re-link Sessions, Offers, and Follow-Ups. Headers are matched by name, so the exact column order doesn't matter.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {DB_ORDER.map((db) => (
              <div key={db} className="sb-importrow">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{sectionLabel(db)}</div>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>{IMPORT_MAP[db].file}</div>
                </div>
                {staged[db] ? <span className="sb-importok"><Check size={13} /> {staged[db].length} rows ready</span> : <span style={{ fontSize: 12, color: C.ink3 }}>current: {data[db].length}</span>}
                <label className="sb-ghost" style={{ cursor: "pointer" }}>
                  <Upload size={14} /> Choose
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleFile(db, e.target.files[0])} />
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="sb-drawerfoot">
          <div style={{ flex: 1, fontSize: 12.5, color: C.ink3 }}>{stagedCount ? `${stagedCount} rows staged` : "No files chosen"}</div>
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          <button className="sb-primary" onClick={apply} disabled={!stagedCount || busy} style={{ opacity: !stagedCount ? 0.5 : 1 }}>
            Import & re-link
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */
function BreathMark({ size = 32, animate }) {
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span className={animate ? "sb-breathe" : ""} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}`, opacity: 0.35 }} />
      <span className={animate ? "sb-breathe sb-breathe2" : ""} style={{ position: "absolute", inset: size * 0.18, borderRadius: "50%", border: `1.5px solid ${C.brand}`, opacity: 0.6 }} />
      <Wind size={size * 0.42} color={C.brand} strokeWidth={2} />
    </span>
  );
}
function Stat({ label, value, hint, accent = C.ink }) {
  return (
    <div className="sb-card sb-stat">
      <div style={{ fontSize: 12, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 600, color: accent, lineHeight: 1.1, margin: "6px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.ink3 }}>{hint}</div>
    </div>
  );
}
function Panel({ title, badge, onAll, children }) {
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
function Row({ children, onClick }) { return <button className="sb-listrow" onClick={onClick}>{children}</button>; }
function Dot({ color }) { return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />; }
function Tag({ children, color, soft }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 20, color: soft ? color : "#fff", background: soft ? hexA(color, 0.14) : color, whiteSpace: "nowrap" }}>{children}</span>;
}
function MiniChip({ children, color }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 6, color: color || C.ink2, background: color ? hexA(color, 0.12) : C.surfaceAlt, border: `1px solid ${C.lineSoft}` }}>{children}</span>;
}
function DateChip({ iso, today }) {
  if (!iso) return <span style={{ color: C.ink3, fontSize: 12 }}>—</span>;
  const overdue = iso < today, isToday = iso === today;
  const cl = overdue ? "#C0573F" : isToday ? C.brand : C.ink2;
  return <span style={{ fontSize: 12, fontWeight: 600, color: cl, whiteSpace: "nowrap" }}>{isToday ? "Today" : overdue ? `${fmtDate(iso)} · overdue` : fmtDate(iso)}</span>;
}
function Empty({ children, pad }) {
  return <div style={{ color: C.ink3, fontSize: 13, padding: pad ? "48px 20px" : "14px 4px", textAlign: pad ? "center" : "left" }}>{children}</div>;
}

/* ---------- tiny utils ---------- */
function cleanName(n) { return String(n || "").replace(/^Sample\s*-\s*/i, ""); }
function clientShort(n) { return cleanName(n); }
function sectionLabel(db) { return { clients: "Clients", partners: "Studio Partners", sessions: "Sessions", offers: "Offers & Sales", content: "Content & Referral", followups: "Follow-Ups" }[db]; }
function hexA(hex, a) {
  const h = (hex || "#000").replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ============================================================
   REVENUE ATTRIBUTION VIEW
   ============================================================ */

function RevenueAttributionView({ data, derived, today, onOpen }) {
  const rows = data.revenue || [];
  const [highlight, setHighlight] = useState(null);

  // ── Core totals ─────────────────────────────────────────────
  const totalGross = sum(rows, "gross");
  const totalFees  = sum(rows, "stripeFee") + sum(rows, "facilitatorCost");
  const totalSplit = sum(rows, "studioSplit");
  const totalRef   = sum(rows, "refunds");
  const totalNet   = rows.reduce((a, r) => a + calcNet(r), 0);
  const margin     = totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 0;

  // ── By channel ──────────────────────────────────────────────
  const byChannel = {};
  rows.forEach(r => {
    const ch = r.channel || "Unknown";
    if (!byChannel[ch]) byChannel[ch] = { gross: 0, fees: 0, split: 0, facilitator: 0, refunds: 0, net: 0, count: 0 };
    byChannel[ch].gross       += Number(r.gross || 0);
    byChannel[ch].fees        += Number(r.stripeFee || 0);
    byChannel[ch].split       += Number(r.studioSplit || 0);
    byChannel[ch].facilitator += Number(r.facilitatorCost || 0);
    byChannel[ch].refunds     += Number(r.refunds || 0);
    byChannel[ch].net         += calcNet(r);
    byChannel[ch].count++;
  });
  const channelRows = Object.entries(byChannel)
    .map(([ch, d]) => ({ ch, ...d, margin: d.gross > 0 ? Math.round((d.net / d.gross) * 100) : 0 }))
    .sort((a, b) => b.net - a.net);

  // ── By source ────────────────────────────────────────────────
  const bySrc = {};
  rows.forEach(r => {
    const s = r.source || "Unknown";
    if (!bySrc[s]) bySrc[s] = { gross: 0, net: 0, count: 0 };
    bySrc[s].gross += Number(r.gross || 0);
    bySrc[s].net   += calcNet(r);
    bySrc[s].count++;
  });
  const srcRows = Object.entries(bySrc)
    .map(([src, d]) => ({ src, ...d, margin: d.gross > 0 ? Math.round((d.net / d.gross) * 100) : 0 }))
    .sort((a, b) => b.net - a.net);

  // ── By client ────────────────────────────────────────────────
  const byClient = {};
  rows.filter(r => r.clientId).forEach(r => {
    if (!byClient[r.clientId]) byClient[r.clientId] = { gross: 0, net: 0, count: 0 };
    byClient[r.clientId].gross += Number(r.gross || 0);
    byClient[r.clientId].net   += calcNet(r);
    byClient[r.clientId].count++;
  });
  const clientRows = Object.entries(byClient)
    .map(([id, d]) => ({ id, name: derived.clientName[id] || id, ...d }))
    .sort((a, b) => b.net - a.net).slice(0, 8);

  // ── Recent transactions ──────────────────────────────────────
  const recent = [...rows].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);

  const marginColor = (m) => m >= 70 ? "#4A8C6F" : m >= 45 ? C.gold : "#C0573F";
  const thS = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdS = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };
  const tdR = { ...tdS, textAlign: "right" };

  const marginBar = (m, maxM) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: C.line, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: Math.max(0, m) + "%", background: marginColor(m), borderRadius: 6, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: marginColor(m), width: 36, textAlign: "right" }}>{m}%</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Key metrics */}
      <div className="sb-stats">
        <Stat label="Net revenue"   value={money(totalNet)}   accent={C.brand} hint="after all deductions" />
        <Stat label="Gross revenue" value={money(totalGross)} accent="#2F6FD0" hint="before fees & splits" />
        <Stat label="Margin"        value={margin + "%"}      accent={marginColor(margin)} hint="net ÷ gross" />
        <Stat label="Studio splits" value={money(totalSplit)} accent={C.gold} hint="paid to partner studios" />
      </div>

      {/* Revenue waterfall: Gross → deductions → Net */}
      <Panel title="Revenue waterfall">
        <div style={{ padding: "4px 0 8px" }}>
          {[
            { label: "Gross revenue",      value: totalGross, color: "#2F6FD0", op: "base" },
            { label: "Studio splits",      value: -totalSplit,  color: C.gold,    op: "minus" },
            { label: "Processing fees",    value: -totalFees,   color: "#9FB2CC", op: "minus" },
            { label: "Refunds",            value: -totalRef,    color: "#C0573F", op: "minus" },
            { label: "Net revenue",        value: totalNet,   color: "#4A8C6F", op: "result" },
          ].map(({ label, value, color, op }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: op === "result" ? "none" : `1px solid ${C.lineSoft}` }}>
              <div style={{ width: 180, fontSize: op === "result" ? 13.5 : 13, fontWeight: op === "result" ? 700 : 500, color: op === "result" ? color : C.ink2 }}>{label}</div>
              <div style={{ flex: 1, height: op === "result" ? 10 : 7, background: C.line, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: Math.abs(totalGross) > 0 ? Math.abs(value) / totalGross * 100 + "%" : "0%", background: color, borderRadius: 6 }} />
              </div>
              <div style={{ width: 90, textAlign: "right", fontSize: op === "result" ? 15 : 13, fontWeight: op === "result" ? 700 : 500, color: color }}>
                {op === "minus" ? `-${money(Math.abs(value))}` : money(value)}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Channel P&L table */}
      <Panel title="P&L by channel — what's actually profitable">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thS}>Channel</th>
              <th style={{ ...thS, textAlign: "right" }}>Txns</th>
              <th style={{ ...thS, textAlign: "right" }}>Gross</th>
              <th style={{ ...thS, textAlign: "right" }}>Studio split</th>
              <th style={{ ...thS, textAlign: "right" }}>Fees</th>
              <th style={{ ...thS, textAlign: "right" }}>Net</th>
              <th style={{ ...thS, minWidth: 120 }}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {channelRows.map(r => (
              <tr key={r.ch}
                onMouseEnter={() => setHighlight(r.ch)} onMouseLeave={() => setHighlight(null)}
                style={{ background: highlight === r.ch ? C.surfaceAlt : "transparent", cursor: "default" }}>
                <td style={{ ...tdS }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: REV_CHANNEL_COLOR[r.ch] || C.ink3, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{r.ch}</span>
                  </div>
                </td>
                <td style={tdR}>{r.count}</td>
                <td style={tdR}>{money(r.gross)}</td>
                <td style={{ ...tdR, color: r.split > 0 ? C.gold : C.ink3 }}>{r.split > 0 ? money(r.split) : "—"}</td>
                <td style={{ ...tdR, color: C.ink2 }}>{r.fees > 0 ? money(r.fees + r.facilitator) : "—"}</td>
                <td style={{ ...tdR, fontWeight: 700, color: marginColor(r.margin) }}>{money(r.net)}</td>
                <td style={{ ...tdS, minWidth: 130 }}>{marginBar(r.margin)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: C.surfaceAlt }}>
              <td style={{ ...tdS, fontWeight: 700 }}>Total</td>
              <td style={tdR}>{rows.length}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{money(totalGross)}</td>
              <td style={{ ...tdR, color: C.gold, fontWeight: 600 }}>{money(totalSplit)}</td>
              <td style={{ ...tdR, color: C.ink2 }}>{money(totalFees)}</td>
              <td style={{ ...tdR, fontWeight: 700, color: marginColor(margin) }}>{money(totalNet)}</td>
              <td style={{ ...tdS }}>{marginBar(margin)}</td>
            </tr>
          </tfoot>
        </table>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        {/* By source */}
        <Panel title="Net revenue by source">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thS}>Source</th>
                <th style={{ ...thS, textAlign: "right" }}>Gross</th>
                <th style={{ ...thS, textAlign: "right" }}>Net</th>
                <th style={{ ...thS, minWidth: 90 }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {srcRows.map(r => (
                <tr key={r.src}>
                  <td style={tdS}><Tag color={SOURCE_COLOR[r.src] || C.ink3} soft>{r.src}</Tag></td>
                  <td style={tdR}>{money(r.gross)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: marginColor(r.margin) }}>{money(r.net)}</td>
                  <td style={{ ...tdS, minWidth: 100 }}>{marginBar(r.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* By client */}
        <Panel title="Top clients by net revenue">
          {!clientRows.length ? <Empty>No client-linked transactions yet</Empty> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clientRows.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? hexA(C.brand, 0.06) : "transparent" }}>
                  <span style={{ width: 20, fontSize: 12, fontWeight: 700, color: C.ink3, textAlign: "right" }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{(r.name || "—").trim()}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#4A8C6F", fontSize: 13 }}>{money(r.net)}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{r.count} txn{r.count !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent transactions */}
      <Panel title="Recent transactions">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thS}>Description</th>
              <th style={thS}>Date</th>
              <th style={thS}>Channel</th>
              <th style={{ ...thS, textAlign: "right" }}>Gross</th>
              <th style={{ ...thS, textAlign: "right" }}>Net</th>
              <th style={thS}>Source</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(r => (
              <tr key={r.id} onClick={() => onOpen(r)} style={{ cursor: "pointer" }} className="sb-trow">
                <td style={{ ...tdS, fontWeight: 600, maxWidth: 200 }}>{cleanName(r.name)}</td>
                <td style={tdS}>{fmtDate(r.date)}</td>
                <td style={tdS}><Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag></td>
                <td style={tdR}>{money(r.gross)}</td>
                <td style={{ ...tdR, fontWeight: 700, color: marginColor(calcNet(r) > 0 ? Math.round(calcNet(r) / Math.max(r.gross, 1) * 100) : 0) }}>{money(calcNet(r))}</td>
                <td style={tdS}>{r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ============================================================
   OFFER CONVERSION ANALYTICS
   ============================================================ */

function OfferConversionView({ data, derived, today, onOpen }) {
  const offers = data.offers || [];

  // ── Core metrics ────────────────────────────────────────────
  const won    = offers.filter(o => WON_STATUSES.includes(o.status));
  const lost   = offers.filter(o => LOST_STATUSES.includes(o.status));
  const open   = offers.filter(o => OPEN_STATUSES.includes(o.status));
  const closed = won.length + lost.length;
  const convRate  = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const wonRev    = sum(won, "price");
  const pipeline  = sum(open, "price");
  const avgDeal   = won.length > 0 ? wonRev / won.length : 0;

  // ── Pipeline stage bar ──────────────────────────────────────
  const stageCount = {};
  OFFER_STATUS.forEach(s => { stageCount[s] = offers.filter(o => o.status === s).length; });
  const maxStage = Math.max(1, ...Object.values(stageCount));

  // ── By offer type ───────────────────────────────────────────
  const byType = {};
  offers.forEach(o => {
    const t = o.offerType || "Unknown";
    if (!byType[t]) byType[t] = { sent: 0, won: 0, lost: 0, rev: 0 };
    byType[t].sent++;
    if (WON_STATUSES.includes(o.status))  { byType[t].won++; byType[t].rev += Number(o.price) || 0; }
    if (LOST_STATUSES.includes(o.status)) byType[t].lost++;
  });
  const typeRows = Object.entries(byType)
    .map(([type, d]) => ({ type, ...d, rate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : null }))
    .sort((a, b) => b.rev - a.rev);

  // ── By source ───────────────────────────────────────────────
  const bySrc = {};
  offers.forEach(o => {
    const s = o.source || "Unknown";
    if (!bySrc[s]) bySrc[s] = { sent: 0, won: 0, lost: 0, rev: 0 };
    bySrc[s].sent++;
    if (WON_STATUSES.includes(o.status))  { bySrc[s].won++; bySrc[s].rev += Number(o.price) || 0; }
    if (LOST_STATUSES.includes(o.status)) bySrc[s].lost++;
  });
  const srcRows = Object.entries(bySrc)
    .map(([source, d]) => ({ source, ...d, rate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : null }))
    .sort((a, b) => b.rev - a.rev);

  // ── Recent wins & losses ─────────────────────────────────────
  const recentWon  = [...won].sort((a, b) => (b.dateOffered || "").localeCompare(a.dateOffered || "")).slice(0, 5);
  const recentLost = [...lost].sort((a, b) => (b.dateOffered || "").localeCompare(a.dateOffered || "")).slice(0, 5);

  const rateColor = (r) => r === null ? C.ink3 : r >= 60 ? "#4A8C6F" : r >= 35 ? C.gold : "#C0573F";

  const convBar = (won, total) => {
    const p = total > 0 ? Math.round((won / total) * 100) : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: p + "%", background: rateColor(p), borderRadius: 6 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: rateColor(p), width: 32 }}>{p}%</span>
      </div>
    );
  };

  const thStyle = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdStyle = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Key metrics */}
      <div className="sb-stats">
        <Stat label="Conversion rate" value={convRate + "%"} accent={rateColor(convRate)} hint={`${won.length} won of ${closed} closed`} />
        <Stat label="Won revenue"     value={money(wonRev)}  accent={C.brand} hint="accepted + paid" />
        <Stat label="Open pipeline"   value={money(pipeline)} hint={`${open.length} open offer${open.length !== 1 ? "s" : ""}`} />
        <Stat label="Avg deal size"   value={money(avgDeal)}  hint="per closed offer" />
      </div>

      {/* Pipeline stage breakdown */}
      <Panel title="Pipeline by status">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0" }}>
          {OFFER_STATUS.map(s => {
            const n = stageCount[s] || 0;
            if (!n) return null;
            return (
              <div key={s} style={{ flex: 1, minWidth: 90, background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${OFFER_STATUS_COLOR[s]}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: OFFER_STATUS_COLOR[s] }}>{n}</div>
                <div style={{ fontSize: 11, color: C.ink2, fontWeight: 600, marginTop: 3 }}>{s}</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                  {money(sum(offers.filter(o => o.status === s), "price"))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        {/* By offer type */}
        <Panel title="Conversion by offer type">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Won</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map(r => (
                <tr key={r.type}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.type}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: C.ink2 }}>{r.sent}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#4A8C6F", fontWeight: 600 }}>{r.won}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{money(r.rev)}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{convBar(r.won, r.won + r.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* By source */}
        <Panel title="Conversion by source">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Won</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {srcRows.map(r => (
                <tr key={r.source}>
                  <td style={{ ...tdStyle }}>
                    <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: C.ink2 }}>{r.sent}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#4A8C6F", fontWeight: 600 }}>{r.won}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{money(r.rev)}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{convBar(r.won, r.won + r.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Follow-up due warning */}
      {(() => {
        const fu = offers.filter(o => o.status === "Follow-up due" || (OPEN_STATUSES.includes(o.status) && o.followUpDate && o.followUpDate <= today));
        if (!fu.length) return null;
        return (
          <Panel title={`Follow-up needed · ${fu.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fu.slice(0, 8).map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: hexA("#D9892B", 0.07), borderRadius: 8, cursor: "pointer", borderLeft: `3px solid #D9892B` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</span>
                    <span style={{ fontSize: 12, color: C.ink2, marginLeft: 8 }}>{o.offerType} · {money(o.price)}</span>
                  </div>
                  <Tag color={OFFER_STATUS_COLOR[o.status]}>{o.status}</Tag>
                  {o.followUpDate && <DateChip iso={o.followUpDate} today={today} />}
                </div>
              ))}
            </div>
          </Panel>
        );
      })()}

      {/* Recent wins & losses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        <Panel title={`Recent wins · ${won.length}`}>
          {!recentWon.length ? <Empty>No closed offers yet</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentWon.map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hexA("#4A8C6F", 0.06), borderLeft: "3px solid #4A8C6F" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                    <div style={{ fontSize: 11, color: C.ink2 }}>{o.offerType} · {fmtDate(o.dateOffered)}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: "#4A8C6F", fontSize: 13 }}>{money(o.price)}</span>
                </div>
              ))}
            </div>
          }
        </Panel>
        <Panel title={`Recent losses · ${lost.length}`}>
          {!recentLost.length ? <Empty>No lost offers yet</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentLost.map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hexA("#C0573F", 0.05), borderLeft: "3px solid #C0573F" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                    <div style={{ fontSize: 11, color: C.ink2 }}>{o.offerType} · {fmtDate(o.dateOffered)}</div>
                  </div>
                  {o.reasonLost && <span style={{ fontSize: 11, color: "#C0573F", maxWidth: 120, textAlign: "right" }}>{o.reasonLost}</span>}
                </div>
              ))}
            </div>
          }
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   FOLLOW-UP ENGINE COMPONENTS
   ============================================================ */

function FollowUpEngine({ data, setData, today, onOpen }) {
  const [tab, setTab] = useState("queue");

  const sequences = data.sequences || [];

  // Build all pending steps across all active sequences
  const allItems = [];
  sequences.forEach(seq => {
    if (seq.status !== "active") return;
    const client = (data.clients || []).find(c => c.id === seq.clientId);
    if (!client) return;
    seq.steps.forEach(step => {
      if (step.sent) return;
      const stepDef = FU_STEPS.find(s => s.id === step.stepId);
      allItems.push({ seqId: seq.id, seq, clientId: seq.clientId, client, stepId: step.stepId, stepDef, dueDate: step.dueDate, sessionDate: seq.sessionDate, sessionName: seq.sessionName });
    });
  });
  allItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdueItems  = allItems.filter(i => i.dueDate < today);
  const todayItems    = allItems.filter(i => i.dueDate === today);
  const upcomingItems = allItems.filter(i => i.dueDate > today);
  const totalDue      = overdueItems.length + todayItems.length;

  const markSent = (seqId, stepId) => {
    setData(d => ({
      ...d,
      sequences: (d.sequences || []).map(seq => {
        if (seq.id !== seqId) return seq;
        const steps = seq.steps.map(s => s.stepId !== stepId ? s : { ...s, sent: true, sentAt: today });
        const status = steps.every(s => s.sent) ? "completed" : "active";
        return { ...seq, steps, status };
      }),
    }));
  };

  const togglePause = (seqId) => {
    setData(d => ({
      ...d,
      sequences: (d.sequences || []).map(seq =>
        seq.id !== seqId ? seq : { ...seq, status: seq.status === "paused" ? "active" : "paused" }
      ),
    }));
  };

  const tabStyle = (t) => ({
    padding: "8px 16px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
    cursor: "pointer", background: tab === t ? C.brand : "transparent",
    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Stats row */}
      <div className="sb-stats">
        <Stat label="Due / Overdue" value={totalDue} accent={totalDue > 0 ? "#C0573F" : C.brand} hint="need action now" />
        <Stat label="Coming up" value={upcomingItems.length} hint="within 21 days" />
        <Stat label="Active sequences" value={sequences.filter(s => s.status === "active").length} hint="clients in nurture" />
        <Stat label="Completed" value={sequences.filter(s => s.status === "completed").length} hint="full sequences sent" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${C.line}` }}>
        <button style={tabStyle("queue")} onClick={() => setTab("queue")}>
          Message Queue
          {totalDue > 0 && <span style={{ background: "#C0573F", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{totalDue}</span>}
        </button>
        <button style={tabStyle("sequences")} onClick={() => setTab("sequences")}>Active Sequences</button>
        <button style={tabStyle("templates")} onClick={() => setTab("templates")}>Message Templates</button>
      </div>

      {tab === "queue" && (
        <MessageQueue
          overdue={overdueItems} todayItems={todayItems} upcoming={upcomingItems}
          today={today} markSent={markSent}
          onOpenClient={(clientId) => {
            const c = (data.clients || []).find(x => x.id === clientId);
            if (c) onOpen({ db: "clients", record: c });
          }}
        />
      )}
      {tab === "sequences" && (
        <SequencesView sequences={sequences} clients={data.clients || []} today={today} onOpen={onOpen} togglePause={togglePause} />
      )}
      {tab === "templates" && <TemplatesView />}
    </div>
  );
}

function MessageQueue({ overdue, todayItems, upcoming, today, markSent, onOpenClient }) {
  const [copied, setCopied] = useState(null);
  const [expanded, setExpanded] = useState({});

  const copyMsg = (key, text) => {
    try { navigator.clipboard.writeText(text); } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const renderGroup = (items, label, dotColor) => {
    if (!items.length) return null;
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: dotColor, marginBottom: 10 }}>
          {label} · {items.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => {
            const key = `${item.seqId}_${item.stepId}`;
            const isOpen = expanded[key];
            const msg = interpolateTemplate(FU_TEMPLATES[item.stepId], item.client, item);
            const wasCopied = copied === key;
            const daysAgo = Math.round((new Date(today) - new Date(item.sessionDate)) / 86400000);
            return (
              <div key={key} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${item.stepDef?.accent || C.brand}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 14px" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: isOpen ? 10 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onOpenClient(item.clientId)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.ink, textDecoration: "underline" }}>
                          {(item.client?.name || "—").trim()}
                        </button>
                        <Tag color={item.stepDef?.accent || C.brand} soft>{item.stepDef?.label}</Tag>
                        <MiniChip color={item.stepDef?.accent}>
                          {item.stepDef?.channel === "email" ? "✉ Email" : "💬 Text"}
                        </MiniChip>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>
                        {item.sessionName} · {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago ·{" "}
                        {item.dueDate < today ? <span style={{ color: "#C0573F", fontWeight: 600 }}>overdue since {fmtDate(item.dueDate)}</span>
                          : <span style={{ color: "#D9892B", fontWeight: 600 }}>due today</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      <button onClick={() => toggle(key)} style={{ padding: "5px 11px", background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, cursor: "pointer", color: C.ink2 }}>
                        {isOpen ? "Hide" : "View message"}
                      </button>
                      <button onClick={() => copyMsg(key, msg)} style={{
                        padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        background: wasCopied ? hexA("#4A8C6F", 0.12) : C.surfaceAlt,
                        color: wasCopied ? "#4A8C6F" : C.ink2, border: `1px solid ${wasCopied ? hexA("#4A8C6F", 0.35) : C.line}`,
                      }}>
                        {wasCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                      </button>
                      <button onClick={() => markSent(item.seqId, item.stepId)} style={{
                        padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600,
                        background: C.brand, color: "#fff", border: "none",
                      }}>
                        Mark Sent ✓
                      </button>
                    </div>
                  </div>
                  {/* Expanded message */}
                  {isOpen && (
                    <div style={{
                      background: C.surfaceAlt, borderRadius: 8, padding: "12px 14px",
                      fontSize: 13, color: C.ink, lineHeight: 1.75, whiteSpace: "pre-wrap",
                      borderLeft: `3px solid ${item.stepDef?.accent || C.brand}`,
                    }}>
                      {msg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const total = overdue.length + todayItems.length + upcoming.length;
  if (!total) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
        <Zap size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Queue is clear</div>
        <div style={{ fontSize: 13 }}>Start a sequence from any client record after they attend a session.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {renderGroup(overdue,    "Overdue",    "#C0573F")}
      {renderGroup(todayItems, "Due Today",  "#D9892B")}
      {renderGroup(upcoming,   "Coming Up",  C.ink3)}
    </div>
  );
}

function SequencesView({ sequences, clients, today, onOpen, togglePause }) {
  if (!sequences.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
        <Clock size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No sequences yet</div>
        <div style={{ fontSize: 13 }}>Open a client record and click "Start Follow-up Sequence" after they attend a session.</div>
      </div>
    );
  }

  const sorted = [...sequences].sort((a, b) => {
    const order = { active: 0, paused: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.sessionDate.localeCompare(a.sessionDate);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(seq => {
        const client = clients.find(c => c.id === seq.clientId);
        const sentCount = seq.steps.filter(s => s.sent).length;
        const total = seq.steps.length;
        const pctDone = Math.round((sentCount / total) * 100);
        const nextPending = seq.steps.find(s => !s.sent);
        const nextDef = nextPending ? FU_STEPS.find(f => f.id === nextPending.stepId) : null;
        const isOverdue = nextPending && nextPending.dueDate < today;
        const statusColor = seq.status === "completed" ? "#4A8C6F" : seq.status === "paused" ? C.ink3 : C.brand;

        return (
          <div key={seq.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{(client?.name || "—").trim()}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>{seq.sessionName} · started {fmtDate(seq.sessionDate)}</div>
              </div>
              <Tag color={statusColor} soft>{seq.status}</Tag>
              {seq.status !== "completed" && (
                <button onClick={() => togglePause(seq.id)} style={{
                  padding: "4px 11px", fontSize: 12, borderRadius: 7, cursor: "pointer",
                  background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink2,
                }}>
                  {seq.status === "paused" ? "Resume" : "Pause"}
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, background: C.line, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: pctDone + "%", background: seq.status === "completed" ? "#4A8C6F" : C.brand, borderRadius: 6, transition: "width .3s" }} />
            </div>
            {/* Step chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {seq.steps.map(step => {
                const def = FU_STEPS.find(f => f.id === step.stepId);
                const late = !step.sent && step.dueDate < today;
                return (
                  <div key={step.stepId} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                    background: step.sent ? hexA("#4A8C6F", 0.12) : late ? hexA("#C0573F", 0.12) : C.surfaceAlt,
                    color: step.sent ? "#4A8C6F" : late ? "#C0573F" : C.ink3,
                    border: `1px solid ${step.sent ? hexA("#4A8C6F", 0.3) : late ? hexA("#C0573F", 0.3) : C.line}`,
                  }}>
                    {step.sent ? "✓" : late ? "!" : "○"} {def?.label}
                    {step.sent && step.sentAt ? ` · ${fmtDate(step.sentAt)}` : ""}
                    {step.sent && step.notes ? ` — ${step.notes}` : ""}
                  </div>
                );
              })}
            </div>
            {nextDef && seq.status === "active" && (
              <div style={{ marginTop: 8, fontSize: 12, color: isOverdue ? "#C0573F" : C.ink3, fontWeight: isOverdue ? 600 : 400 }}>
                Next: {nextDef.label} — {isOverdue ? `overdue since ${fmtDate(nextPending.dueDate)}` : `scheduled ${fmtDate(nextPending.dueDate)}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TemplatesView() {
  const [copied, setCopied] = useState(null);

  const copyTpl = (id) => {
    try { navigator.clipboard.writeText(FU_TEMPLATES[id]); } catch (e) {}
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontSize: 13, color: C.ink3, padding: "2px 0 6px" }}>
        These templates are auto-personalized with the client's first name when you view messages in the queue. Copy any template to edit before sending.
      </div>
      {FU_STEPS.map(step => (
        <div key={step.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${step.accent}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Tag color={step.accent} soft>{step.label}</Tag>
              <MiniChip color={step.accent}>{step.channel === "email" ? "✉ Email" : "💬 Text"}</MiniChip>
              <span style={{ fontSize: 12, color: C.ink3, flex: 1 }}>
                {step.delayDays === 0 ? "Send same day as session" : `Send ~${step.delayDays} days after session`}
              </span>
              <button onClick={() => copyTpl(step.id)} style={{
                padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                background: copied === step.id ? hexA("#4A8C6F", 0.12) : C.surfaceAlt,
                color: copied === step.id ? "#4A8C6F" : C.ink2,
                border: `1px solid ${copied === step.id ? hexA("#4A8C6F", 0.35) : C.line}`,
              }}>
                {copied === step.id ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
              </button>
            </div>
            <div style={{
              background: C.surfaceAlt, borderRadius: 8, padding: "12px 14px",
              fontSize: 13, color: C.ink, lineHeight: 1.75, whiteSpace: "pre-wrap",
            }}>
              {FU_TEMPLATES[step.id]}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const FONT = {
  display: "'Iowan Old Style','Palatino Linotype','Palatino','Georgia',serif",
  body: "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',system-ui,sans-serif",
};

/* ============================================================
   CSS
   ============================================================ */
const CSS = `
* { box-sizing: border-box; }
input, textarea, select, button { font-family: inherit; }
.sb-shell { display: flex; min-height: 100vh; }
.sb-sidebar { width: 226px; flex-shrink: 0; background: ${C.surface}; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 40; }
.sb-navbtn { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; border: none; border-radius: 9px; font-size: 14px; cursor: pointer; transition: background .12s; }
.sb-navbtn:hover { background: ${C.brandMist}; }
.sb-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sb-header { display: flex; align-items: center; gap: 12px; padding: 16px 28px; border-bottom: 1px solid ${C.line}; background: ${hexA(C.bg, 0.85)}; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 20; }
.sb-content { padding: 22px 28px 60px; max-width: 1280px; width: 100%; }
.sb-menu { display: none; background: none; border: none; cursor: pointer; color: ${C.ink}; padding: 4px; }
.sb-scrim { display: none; }
.sb-search { display: flex; align-items: center; gap: 7px; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 9px; padding: 7px 11px; width: 220px; }
.sb-search input { border: none; outline: none; background: none; font-size: 13.5px; width: 100%; color: ${C.ink}; }
.sb-card { background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 14px; }
.sb-primary { display: inline-flex; align-items: center; gap: 6px; background: ${C.brand}; color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background .12s; }
.sb-primary:hover { background: ${C.brandDeep}; }
.sb-ghost { display: inline-flex; align-items: center; gap: 6px; background: ${C.surface}; color: ${C.ink2}; border: 1px solid ${C.line}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-ghost:hover { background: ${C.surfaceAlt}; }
.sb-danger { display: inline-flex; align-items: center; gap: 6px; background: none; color: #B4513B; border: 1px solid ${hexA("#B4513B", 0.3)}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-danger:hover { background: ${hexA("#B4513B", 0.07)}; }
.sb-link { display: inline-flex; align-items: center; gap: 2px; background: none; border: none; color: ${C.brand}; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-iconbtn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 8px; cursor: pointer; color: ${C.ink2}; }
.sb-iconbtn:hover { background: ${C.surfaceAlt}; }

.sb-hero { display: flex; align-items: center; gap: 20px; background: linear-gradient(120deg, ${C.brandMist}, ${C.surface}); border: 1px solid ${C.line}; border-radius: 16px; padding: 22px 26px; }
.sb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sb-stat { padding: 16px 18px; }
.sb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.sb-panelhead { display: flex; align-items: center; gap: 9px; padding: 15px 18px 10px; }
.sb-panelbody { padding: 0 8px 8px; }
.sb-badge { background: ${C.brandSoft}; color: ${C.brandDeep}; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 20px; }
.sb-listrow { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; text-align: left; }
.sb-listrow:hover { background: ${C.surfaceAlt}; }
.sb-actionrow { align-items: flex-start; padding: 12px 14px; border-bottom: 1px solid ${C.lineSoft}; border-radius: 0; }
.sb-actionrow:last-child { border-bottom: none; }
.sb-actionrow:hover { background: ${C.brandMist}; }
.sb-rowtitle { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowsub { font-size: 12px; color: ${C.ink3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowval { font-size: 13px; font-weight: 600; color: ${C.brand}; white-space: nowrap; }
.sb-mininote { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: ${C.ink3}; padding: 8px 12px 2px; }

.sb-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.sb-tab { background: none; border: none; padding: 7px 13px; border-radius: 8px; font-size: 13.5px; font-weight: 600; color: ${C.ink3}; cursor: pointer; }
.sb-tab:hover { color: ${C.ink2}; background: ${C.surfaceAlt}; }
.sb-tab-on { color: ${C.brandDeep}; background: ${C.brandSoft}; }

.sb-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sb-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid ${C.line}; white-space: nowrap; }
.sb-table td { padding: 13px 16px; border-bottom: 1px solid ${C.lineSoft}; color: ${C.ink}; white-space: nowrap; }
.sb-trow { cursor: pointer; }
.sb-trow:hover td { background: ${C.surfaceAlt}; }
.sb-table tbody tr:last-child td { border-bottom: none; }
.sb-table tfoot td { padding: 12px 16px; border-top: 2px solid ${C.line}; background: ${C.surfaceAlt}; font-size: 13.5px; }

.sb-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; }
.sb-col { min-width: 224px; width: 224px; flex-shrink: 0; }
.sb-colhead { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 10px; }
.sb-bcard { display: block; width: 100%; text-align: left; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 11px; padding: 11px 12px; cursor: pointer; transition: box-shadow .12s, transform .12s; }
.sb-bcard:hover { box-shadow: 0 4px 16px ${hexA(C.brandDeep, 0.1)}; transform: translateY(-1px); }
.sb-emptycard { border: 1px dashed ${C.line}; border-radius: 11px; padding: 14px; text-align: center; color: ${C.ink3}; font-size: 13px; }

.sb-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.sb-caldow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; text-align: center; padding-bottom: 4px; font-weight: 600; }
.sb-calcell { border-radius: 9px; min-height: 78px; padding: 6px; display: flex; flex-direction: column; gap: 3px; }
.sb-calev { font-size: 10.5px; font-weight: 600; background: ${C.brandSoft}; color: ${C.brandDeep}; border: none; border-radius: 5px; padding: 3px 5px; cursor: pointer; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-calev:hover { background: ${C.brand}; color: #fff; }

.sb-drawerwrap { position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.28)}; display: flex; justify-content: flex-end; z-index: 60; backdrop-filter: blur(2px); }
.sb-drawer { width: 460px; max-width: 94vw; background: ${C.surface}; height: 100%; display: flex; flex-direction: column; box-shadow: -8px 0 40px ${hexA(C.brandDeep, 0.2)}; animation: sb-slide .22s ease; }
.sb-drawer-wide { width: 620px; }
.sb-modal { width: 540px; max-width: 94vw; max-height: 88vh; margin: auto; background: ${C.surface}; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px ${hexA(C.brandDeep, 0.3)}; animation: sb-pop .2s ease; }
.sb-drawerwrap:has(.sb-modal) { align-items: center; justify-content: center; }
@keyframes sb-slide { from { transform: translateX(30px); opacity: .6; } to { transform: none; opacity: 1; } }
@keyframes sb-pop { from { transform: scale(.97); opacity: .6; } to { transform: none; opacity: 1; } }
.sb-drawerhead { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid ${C.line}; }
.sb-eyebrow { font-size: 11.5px; text-transform: uppercase; letter-spacing: .12em; color: ${C.ink3}; font-weight: 600; }
.sb-drawerbody { padding: 18px 20px; overflow-y: auto; flex: 1; }
.sb-drawerfoot { display: flex; align-items: center; gap: 9px; padding: 14px 20px; border-top: 1px solid ${C.line}; }
.sb-titleinput { font-family: ${FONT.display}; font-size: 22px; font-weight: 600; border: none; outline: none; width: 100%; color: ${C.ink}; padding: 0 0 14px; }
.sb-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.sb-field { display: flex; flex-direction: column; gap: 5px; }
.sb-field-wide { grid-column: 1 / -1; }
.sb-flabel { font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: ${C.ink3}; font-weight: 600; }
.sb-input { border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 11px; font-size: 13.5px; outline: none; color: ${C.ink}; background: ${C.surface}; width: 100%; }
.sb-input:focus { border-color: ${C.brand}; box-shadow: 0 0 0 3px ${hexA(C.brand, 0.12)}; }
.sb-affix { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: ${C.ink3}; }
.sb-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
.sb-selchip { border: 1px solid ${C.line}; border-radius: 20px; padding: 5px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .1s; }
.sb-rellabel { display: flex; align-items: center; gap: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 700; padding-bottom: 7px; border-bottom: 1px solid ${C.lineSoft}; margin-bottom: 6px; }
.sb-relrow { display: flex; align-items: center; gap: 9px; width: 100%; background: none; border: none; padding: 8px 6px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.sb-relrow:hover { background: ${C.surfaceAlt}; }
.sb-importrow { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid ${C.line}; border-radius: 11px; }
.sb-importok { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.brand}; }

.sb-breathe { animation: sb-breath 8s ease-in-out infinite; }
.sb-breathe2 { animation-delay: .4s; }
@keyframes sb-breath { 0%,100% { transform: scale(.82); opacity: .25; } 45% { transform: scale(1.12); opacity: .55; } }
@media (prefers-reduced-motion: reduce) { .sb-breathe { animation: none; } }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 6px; border: 2px solid ${C.bg}; }
:focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }

@media (max-width: 860px) {
  .sb-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform .22s; box-shadow: 4px 0 30px ${hexA(C.brandDeep, 0.2)}; }
  .sb-sidebar.sb-open { transform: none; }
  .sb-scrim { display: block; position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.3)}; z-index: 35; }
  .sb-menu { display: inline-flex; }
  .sb-stats { grid-template-columns: 1fr 1fr; }
  .sb-grid2 { grid-template-columns: 1fr; }
  .sb-content, .sb-header { padding-left: 16px; padding-right: 16px; }
  .sb-search { width: 130px; }
  .sb-fields { grid-template-columns: 1fr; }
  .sb-hero { flex-direction: column; text-align: center; }
}
`;
