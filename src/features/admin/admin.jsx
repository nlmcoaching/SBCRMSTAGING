import { useState, useEffect, useMemo, useRef } from "react";
import { RefreshCw, Plus, Upload, Download, ChevronDown, Check, AlertCircle, Activity, Send, CheckCircle, Save, Lock } from "lucide-react";
import { C, FONT, hexA } from "../../lib/theme.js";
import { todayISO, fmtDate } from "../../lib/format.js";
import { USER_ROLES, USER_ROLE_COLOR, USER_COLORS, ROLE_PERMISSIONS } from "../../lib/constants.js";
import { AGREEMENT_BLOB_PREFIX, SEC_META_KEY, apiHeaders, calendlyApiUrl, safeResJSON } from "../../lib/api.js";
import { store } from "../../lib/store.js";
import { Sec } from "../../lib/sec.js";
import { DEFAULT_CRM_SETTINGS } from "../../lib/crmSettings.js";
import { Stat } from "../../components/primitives.jsx";
import { AppComponent } from "../../components/appBridge.jsx";

const LAST_BACKUP_KEY      = "sb:last-backup:v1";

function f(key, label, type, opts = {}) { return { key, label, type, ...opts }; }

async function deleteAgreementBlob(agreementId) {
  if (!agreementId) return;
  await store.remove(AGREEMENT_BLOB_PREFIX + agreementId);
}

const DB_SCHEMA = [
  {
    table: "clients", label: "Clients", lane: "B2C",
    description: "Individual clients — leads, attendees, members, and advocates.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Full name" },
      { name: "email",           type: "email",    required: false, description: "Contact email address" },
      { name: "phone",           type: "string",   required: false, description: "Phone number" },
      { name: "source",          type: "select",   required: false, description: "How the client found Simply Breathe", values: "Referral · Instagram · Studio · Website · Direct · Event · Corporate · Other" },
      { name: "type",            type: "select",   required: false, description: "Client classification", values: "First-time attendee · Repeat attendee · Member · Advocate · Referral source · Private client · Studio attendee · Virtual attendee · Corporate attendee · High-value lead · Past client – reactivate" },
      { name: "tags",            type: "array",    required: false, description: "Intent / emotional tags", values: "Stress relief · Anxiety · Burnout · Performance · Grief · Letting go · Self-confidence · Nervous system reset · Transformation seeker · Spiritual growth · Corporate wellness" },
      { name: "firstContact",    type: "date",     required: false, description: "Date of first contact (ISO 8601)" },
      { name: "lastSession",     type: "date",     required: false, description: "Date of most recent session attended" },
      { name: "nextFollowUp",    type: "date",     required: false, description: "Scheduled next follow-up date" },
      { name: "status",          type: "select",   required: false, description: "Relationship status", values: "New lead · Active · Warm · VIP · Advocate · Inactive · Lost" },
      { name: "referralSource",  type: "string",   required: false, description: "Name of the person who referred this client" },
      { name: "referralPotential", type: "select", required: false, description: "Likelihood to refer others", values: "High · Medium · Low" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "partners", label: "Studio Partners", lane: "B2B",
    description: "Studios, gyms, and wellness spaces that host breathwork events.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Studio or business name" },
      { name: "owner",           type: "string",   required: false, description: "Owner or manager name" },
      { name: "email",           type: "email",    required: false, description: "Primary contact email" },
      { name: "phone",           type: "string",   required: false, description: "Phone number" },
      { name: "location",        type: "string",   required: false, description: "City / address" },
      { name: "type",            type: "select",   required: false, description: "Studio category", values: "Yoga · Gym · Meditation · Wellness · Pilates · Corporate · Other" },
      { name: "communitySize",   type: "number",   required: false, description: "Estimated active member / follower count" },
      { name: "bestJourney",     type: "string",   required: false, description: "Best-fit breathwork journey for this audience" },
      { name: "revenuePotential",type: "currency",  required: false, description: "Estimated total revenue potential ($)" },
      { name: "stage",           type: "select",   required: false, description: "Pipeline stage", values: "Target Identified · Researched · Initial Outreach Sent · Follow-Up Needed · Discovery Call Booked · Demo Session Offered · Demo Completed · Pilot Proposed · Agreement Sent · Agreement Signed · First Session Scheduled · Pilot Completed · Recurring Partner · Lost / Not a Fit" },
      { name: "probability",     type: "number",   required: false, description: "Probability of closing (0–100%)" },
      { name: "lastTouch",       type: "date",     required: false, description: "Date of last activity or contact" },
      { name: "nextAction",      type: "string",   required: false, description: "Next required action" },
      { name: "contractStatus",  type: "select",   required: false, description: "Agreement status", values: "None · Sent · Signed · Expired" },
      { name: "insuranceReq",    type: "string",   required: false, description: "Insurance requirements noted" },
      { name: "promotionCommit", type: "string",   required: false, description: "Agreed promotion commitments" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes and conversation history" },
      { name: "checklist",       type: "object",   required: false, description: "Studio Launch Checklist — 4-phase, 23 boolean items (before_signing, after_signing, before_event, after_event)" },
    ],
  },
  {
    table: "sessions", label: "Sessions", lane: "B2C",
    description: "Individual breathwork events — studio, virtual, or private.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Session date (ISO 8601)" },
      { name: "time",            type: "string",   required: false, description: "Session start time" },
      { name: "studio",          type: "string",   required: false, description: "Studio name or 'Virtual'" },
      { name: "journey",         type: "string",   required: false, description: "Breathwork journey used" },
      { name: "status",          type: "select",   required: false, description: "Lifecycle status", values: "Planned · Booking Open · Promotion Active · Almost Full · Completed · Follow-Up Pending · Closed Out" },
      { name: "capacity",        type: "number",   required: false, description: "Maximum attendee capacity" },
      { name: "registered",      type: "number",   required: false, description: "Number registered" },
      { name: "paid",            type: "number",   required: false, description: "Number who paid" },
      { name: "waivers",         type: "number",   required: false, description: "Number of waivers completed" },
      { name: "noShows",         type: "number",   required: false, description: "Number of no-shows" },
      { name: "grossRevenue",    type: "currency",  required: false, description: "Total gross revenue collected ($)" },
      { name: "studioSplit",     type: "currency",  required: false, description: "Amount paid to studio ($)" },
      { name: "netRevenue",      type: "currency",  required: false, description: "Net revenue after studio split ($)" },
      { name: "roomSetup",       type: "select",   required: false, description: "Room setup status", values: "Not started · In progress · Complete" },
      { name: "audioSetup",      type: "select",   required: false, description: "Music / headset setup status", values: "Not started · In progress · Complete" },
      { name: "testimonialsCapt",type: "boolean",  required: false, description: "Were testimonials captured post-session?" },
      { name: "followUpSent",    type: "boolean",  required: false, description: "Was the post-session follow-up email sent?" },
      { name: "rebookOfferSent", type: "boolean",  required: false, description: "Was a rebook offer sent?" },
      { name: "referralsReq",    type: "boolean",  required: false, description: "Were referrals requested?" },
      { name: "breakthroughNoted", type: "boolean", required: false, description: "Was a client breakthrough noted? Triggers testimonial request alert." },
      { name: "equipChecklist",  type: "object",   required: false, description: "Equipment checklist — 3 phases, 17 boolean items (audio_tech, room_supplies, admin_checkin)" },
      { name: "conversionResult",type: "string",   required: false, description: "Outcome summary (e.g. '2 3-packs sold')" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "offers", label: "Offers", lane: "B2C",
    description: "Sales offers made to clients or studios.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "client",          type: "string",   required: true,  description: "Client or studio name" },
      { name: "type",            type: "select",   required: false, description: "Offer type", values: "Single session · 3-pack · 6-pack · 12-pack · Private session · Studio pilot · Studio recurring agreement · Corporate event · Group event · Referral partner offer" },
      { name: "amount",          type: "currency",  required: false, description: "Offer value ($)" },
      { name: "dateOffered",     type: "date",     required: false, description: "Date offer was sent" },
      { name: "expiresOn",       type: "date",     required: false, description: "Offer expiration date" },
      { name: "followUpDate",    type: "date",     required: false, description: "Scheduled follow-up date" },
      { name: "status",          type: "select",   required: false, description: "Offer lifecycle status", values: "Drafted · Sent · Viewed · Follow-Up Due · Accepted · Paid · Declined · Expired" },
      { name: "probability",     type: "number",   required: false, description: "Estimated close probability (0–100%)" },
      { name: "source",          type: "select",   required: false, description: "Lead source for this offer", values: "Referral · Instagram · Studio · Website · Direct · Event · Corporate · Other" },
      { name: "reasonLost",      type: "string",   required: false, description: "Reason if offer was declined or expired" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "revenue", label: "Revenue", lane: "B2C",
    description: "Individual revenue line items for attribution and profitability analysis.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Revenue date" },
      { name: "client",          type: "string",   required: false, description: "Linked client name" },
      { name: "session",         type: "string",   required: false, description: "Linked session ID or name" },
      { name: "channel",         type: "select",   required: false, description: "Revenue channel", values: "Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner" },
      { name: "gross",           type: "currency",  required: false, description: "Gross revenue ($)" },
      { name: "stripeFee",       type: "currency",  required: false, description: "Payment processing fee ($)" },
      { name: "studioSplit",     type: "currency",  required: false, description: "Studio share ($)" },
      { name: "facilitatorCost", type: "currency",  required: false, description: "Facilitator / contractor cost ($)" },
      { name: "refunds",         type: "currency",  required: false, description: "Refund amount ($)" },
      { name: "net",             type: "currency",  required: false, description: "Net revenue after all deductions ($)" },
      { name: "costCenter",      type: "string",   required: false, description: "Cost center or accounting category" },
      { name: "source",          type: "string",   required: false, description: "Marketing source or campaign" },
      { name: "campaign",        type: "string",   required: false, description: "Campaign name" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "expenses", label: "Expenses", lane: "Core",
    description: "Business expenses — manually entered, or auto-generated from studio revenue splits and canceled bookings.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Expense date (ISO 8601)" },
      { name: "vendor",          type: "string",   required: false, description: "Vendor or payee name" },
      { name: "description",     type: "string",   required: false, description: "What the expense was for" },
      { name: "amount",          type: "currency",  required: false, description: "Expense amount ($)" },
      { name: "category",        type: "select",   required: false, description: "Expense category", values: "Equipment & Supplies · Software & Subscriptions · Marketing & Advertising · Travel & Transport · Education & Training · Professional Services · Insurance · Administrative · Studio & Venue · Studio Split · Refunds & Cancellations · Other" },
      { name: "paymentMethod",   type: "select",   required: false, description: "How the expense was paid", values: "Credit Card · Bank Transfer · Cash · Check · Other" },
      { name: "taxDeductible",   type: "boolean",  required: false, description: "Is this expense tax deductible?" },
      { name: "recurring",       type: "boolean",  required: false, description: "Is this a recurring expense?" },
      { name: "recurringFreq",   type: "select",   required: false, description: "Recurrence frequency", values: "One-time · Monthly · Quarterly · Annual" },
      { name: "linkedSession",   type: "string",   required: false, description: "Linked session ID (if tied to a session)" },
      { name: "linkedPartner",   type: "string",   required: false, description: "Linked studio partner ID (if tied to a partner)" },
      { name: "receiptUrl",      type: "string",   required: false, description: "Link to a receipt or supporting document" },
      { name: "stripeRefundId",  type: "string",   required: false, description: "Stripe refund ID (re_...) when the expense reflects an actual Stripe refund" },
      { name: "refundedAt",      type: "date",     required: false, description: "When the Stripe refund was issued (ISO 8601)" },
      { name: "auto",            type: "boolean",  required: false, description: "True for auto-generated rows (studio split / canceled booking) — read-only in the UI" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "referrals", label: "Referrals", lane: "B2C",
    description: "Referral relationships — who referred whom and the resulting revenue.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "referrer",        type: "string",   required: true,  description: "Name of person who gave the referral" },
      { name: "referred",        type: "string",   required: false, description: "Name of person referred" },
      { name: "date",            type: "date",     required: false, description: "Date referral was received" },
      { name: "status",          type: "select",   required: false, description: "Referral status", values: "Received · Contacted · Attended · Purchased · Thanked · Closed" },
      { name: "attended",        type: "boolean",  required: false, description: "Did the referred person attend a session?" },
      { name: "purchased",       type: "boolean",  required: false, description: "Did they purchase an offer?" },
      { name: "revenue",         type: "currency",  required: false, description: "Revenue generated from this referral ($)" },
      { name: "thankYouSent",    type: "boolean",  required: false, description: "Was a thank-you sent to the referrer?" },
      { name: "rewardGiven",     type: "boolean",  required: false, description: "Was a referral reward given?" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "content", label: "Content Calendar", lane: "B2C",
    description: "Social media and email content — ideas, drafts, scheduled, and published.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "title",           type: "string",   required: true,  description: "Post title or working title" },
      { name: "body",            type: "textarea", required: false, description: "Caption or body copy" },
      { name: "platform",        type: "select",   required: false, description: "Publishing platform", values: "Instagram · Facebook · LinkedIn · TikTok · YouTube · Email · Blog · Other" },
      { name: "category",        type: "select",   required: false, description: "Content category", values: "Client transformation · Breathwork education · Nervous system regulation · Behind the scenes · Studio partner promotion · Founder story · Testimonials · FAQs · Contraindications/safety · Upcoming sessions" },
      { name: "status",          type: "select",   required: false, description: "Content lifecycle status", values: "Idea · Draft · Scheduled · Published · Archived" },
      { name: "scheduledDate",   type: "date",     required: false, description: "Scheduled publish date" },
      { name: "reach",           type: "number",   required: false, description: "Total accounts reached" },
      { name: "likes",           type: "number",   required: false, description: "Like count" },
      { name: "comments",        type: "number",   required: false, description: "Comment count" },
      { name: "shares",          type: "number",   required: false, description: "Share / repost count" },
      { name: "saves",           type: "number",   required: false, description: "Save count" },
      { name: "leads",           type: "number",   required: false, description: "Leads generated from this post" },
      { name: "booked",          type: "number",   required: false, description: "Bookings attributed to this post" },
      { name: "revenue",         type: "currency",  required: false, description: "Revenue attributed to this post ($)" },
      { name: "sessionPromoted", type: "string",   required: false, description: "Session name promoted in this post" },
      { name: "studioTagged",    type: "string",   required: false, description: "Studio partner tagged" },
      { name: "reused",          type: "boolean",  required: false, description: "Is this repurposed content?" },
      { name: "cta",             type: "string",   required: false, description: "Call to action text or link" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "outreach", label: "Outreach Hub", lane: "B2B",
    description: "Proactive studio and referral outreach tracking.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Target name (studio or individual)" },
      { name: "targetType",      type: "select",   required: false, description: "Type of outreach target", values: "Studio · Individual · Corporate · Event Space · Wellness Brand" },
      { name: "contactStatus",   type: "select",   required: false, description: "Contact lifecycle status", values: "Not contacted · Contacted · Responded · Meeting booked · Demo offered · Negotiating · Closed · Not interested" },
      { name: "messageUsed",     type: "textarea", required: false, description: "Outreach message or template used" },
      { name: "lastContact",     type: "date",     required: false, description: "Date of last contact" },
      { name: "nextFollowUp",    type: "date",     required: false, description: "Next scheduled follow-up date" },
      { name: "responseStatus",  type: "select",   required: false, description: "Response received", values: "No response · Positive · Neutral · Negative · Bounced" },
      { name: "warmth",          type: "select",   required: false, description: "Relationship warmth", values: "Cold · Warm · Hot" },
      { name: "source",          type: "select",   required: false, description: "How this target was found", values: "Instagram · Referral · LinkedIn · Walk-in · Event · Website · Directory · Other" },
      { name: "priority",        type: "number",   required: false, description: "Priority score (1–5)" },
      { name: "revenuePotential",type: "currency",  required: false, description: "Estimated revenue potential ($)" },
      { name: "partnerId",       type: "string",   required: false, description: "Linked Studio Partner record ID" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "testimonials", label: "Testimonials", lane: "Core",
    description: "Client testimonials — written, video, and usage permissions.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "client",          type: "string",   required: true,  description: "Client name" },
      { name: "session",         type: "string",   required: false, description: "Session or journey attended" },
      { name: "written",         type: "textarea", required: false, description: "Full written testimonial text" },
      { name: "videoUrl",        type: "string",   required: false, description: "Video testimonial URL" },
      { name: "permissionRec",   type: "boolean",  required: false, description: "Was permission received to use this testimonial?" },
      { name: "useWebsite",      type: "boolean",  required: false, description: "Permitted for website use?" },
      { name: "useSocial",       type: "boolean",  required: false, description: "Permitted for social media use?" },
      { name: "firstNameOnly",   type: "boolean",  required: false, description: "First name only permission?" },
      { name: "theme",           type: "select",   required: false, description: "Testimonial theme", values: "Stress relief · Release · Clarity · Emotional breakthrough · Sleep · Performance · Transformation · Nervous system" },
      { name: "bestQuote",       type: "string",   required: false, description: "Single best pull-quote for marketing" },
      { name: "beforeSummary",   type: "textarea", required: false, description: "Client state before the session" },
      { name: "afterSummary",    type: "textarea", required: false, description: "Client state after the session" },
      { name: "status",          type: "select",   required: false, description: "Testimonial status", values: "Requested · Received · Approved · Published · Archived" },
      { name: "date",            type: "date",     required: false, description: "Date testimonial was received" },
    ],
  },
  {
    table: "templates", label: "Templates", lane: "Core",
    description: "Email and SMS communication templates.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Template display name" },
      { name: "category",        type: "select",   required: false, description: "Template category", values: "B2B Outreach · Session · Follow-Up · Offer" },
      { name: "channel",         type: "select",   required: false, description: "Delivery channel", values: "Email · SMS" },
      { name: "subject",         type: "string",   required: false, description: "Email subject line (Email templates only)" },
      { name: "body",            type: "textarea", required: false, description: "Template body — supports {{variable}} placeholders" },
      { name: "linkedTo",        type: "select",   required: false, description: "Associated record type", values: "Client · Studio Partner · Session · Offer · General" },
      { name: "notes",           type: "textarea", required: false, description: "Usage notes or variable descriptions" },
    ],
  },
];

const EMAIL_STATUS_COLOR = {
  sent:      "#2563EB",
  failed:    "#C0392B",
  delivered: "#4A8C6F",
  bounced:   "#C0392B",
  complained:"#D9892B",
  opened:    "#4A8C6F",
  clicked:   "#4A8C6F",
  queued:    "#D9892B",
  delivery_delayed: "#D9892B",
  unknown:   C.ink3,
};

export function EmailLogsView({ data, setData }) {
  const logs = [...(data.emailLog || [])].reverse();
  const [checking, setChecking] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const checkStatus = async (entry) => {
    if (!entry.resendId || checking[entry.id]) return;
    if (!mountedRef.current) return;
    setChecking(c => ({ ...c, [entry.id]: true }));
    try {
      // encodeURIComponent guards against any special characters in the Resend ID.
      const res  = await fetch(`/api/email-status/${encodeURIComponent(entry.resendId)}`, { headers: apiHeaders(false) });
      // Check res.ok before res.json() — a 502 HTML page otherwise throws "Unexpected token '<'".
      const json = await safeResJSON(res);
      if (mountedRef.current && res.ok && json.status) {
        setData(d => ({
          ...d,
          emailLog: (d.emailLog || []).map(e =>
            e.id === entry.id ? { ...e, deliveryStatus: json.status, statusCheckedAt: new Date().toISOString() } : e
          ),
        }));
      }
    } catch (_) {}
    if (mountedRef.current) setChecking(c => ({ ...c, [entry.id]: false }));
  };

  // Auto-check unchecked sent emails sequentially when the tab loads.
  // Sequential (not parallel forEach) to avoid flooding the backend with N simultaneous fetches.
  useEffect(() => {
    const unchecked = (data.emailLog || []).filter(e => e.resendId && e.sendStatus === "sent" && !e.deliveryStatus);
    (async () => { for (const entry of unchecked) { if (!mountedRef.current) break; await checkStatus(entry); } })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAll = async () => {
    const pending = logs.filter(e => e.resendId && e.sendStatus === "sent");
    for (const entry of pending) await checkStatus(entry);
  };

  const clearLog = () => setClearConfirm(true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{logs.length} email{logs.length !== 1 ? "s" : ""} logged</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 2 }}>All emails sent from the CRM. Delivery status pulled from Resend.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {logs.some(e => e.resendId && e.sendStatus === "sent") && (
            <button onClick={checkAll} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.brand, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} /> Refresh all statuses
            </button>
          )}
          {logs.length > 0 && (
            <button onClick={clearLog} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${hexA("#C0392B", 0.3)}`, background: hexA("#C0392B", 0.05), fontSize: 13, fontWeight: 600, color: "#C0392B", cursor: "pointer" }}>
              Clear log
            </button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.ink3 }}>
          <Send size={32} color={C.line} style={{ display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No emails sent yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Emails sent via Templates will appear here</div>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 110px 90px", gap: "0 12px", padding: "9px 16px", background: C.surfaceAlt, borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Date</span><span>Recipient</span><span>Template</span><span>Send</span><span>Delivery</span><span></span>
          </div>
          {logs.map((entry, i) => {
            const sendColor  = EMAIL_STATUS_COLOR[entry.sendStatus]     || C.ink3;
            const delivColor = EMAIL_STATUS_COLOR[entry.deliveryStatus] || C.ink3;
            const delivLabel = entry.deliveryStatus
              ? entry.deliveryStatus.replace(/_/g, " ")
              : entry.resendId ? "checking…" : "—";
            const isOpen     = expanded === entry.id;
            return (
              <div key={entry.id} style={{ borderBottom: i < logs.length - 1 ? `1px solid ${C.line}` : "none" }}>
                {/* Summary row — click to expand */}
                <div
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 110px 44px", gap: "0 12px", padding: "10px 16px", alignItems: "center", fontSize: 13, cursor: "pointer", background: isOpen ? C.surfaceAlt : "transparent", transition: "background .15s" }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = hexA(C.brand, 0.03); }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Date */}
                  <div style={{ color: C.ink2, fontSize: 12 }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    <div style={{ fontSize: 11, color: C.ink3 }}>{new Date(entry.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                  {/* Recipient */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.recipientName || entry.to}</div>
                    <div style={{ fontSize: 11.5, color: C.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.to}</div>
                  </div>
                  {/* Template */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.ink }}>{entry.templateName}</div>
                    {entry.category && <div style={{ fontSize: 11.5, color: C.ink3 }}>{entry.category}</div>}
                  </div>
                  {/* Send status */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: hexA(sendColor, 0.1), color: sendColor }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sendColor, display: "inline-block" }} />
                      {entry.sendStatus}
                      {entry.errorMsg && <span title={entry.errorMsg} style={{ cursor: "help" }}>⚠</span>}
                    </span>
                  </div>
                  {/* Delivery status */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: hexA(delivColor, 0.1), color: delivColor }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: delivColor, display: "inline-block" }} />
                      {delivLabel}
                    </span>
                  </div>
                  {/* Expand chevron */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    {entry.resendId && entry.sendStatus === "sent" && (
                      <button
                        onClick={e => { e.stopPropagation(); checkStatus(entry); }}
                        disabled={checking[entry.id]}
                        title="Re-check delivery status"
                        style={{ padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: checking[entry.id] ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                      >
                        <RefreshCw size={10} style={{ animation: checking[entry.id] ? "spin 1s linear infinite" : "none" }} />
                      </button>
                    )}
                    <ChevronDown size={14} color={C.ink3} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                  </div>
                </div>

                {/* Expanded email preview */}
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.line}`, background: C.surfaceAlt }}>
                    {/* Subject line */}
                    <div style={{ padding: "10px 14px", margin: "12px 0 0", background: hexA(C.brand, 0.05), border: `1px solid ${hexA(C.brand, 0.15)}`, borderRadius: "8px 8px 0 0", fontSize: 13, color: C.ink2 }}>
                      <span style={{ fontWeight: 700, color: C.ink3, marginRight: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Subject</span>
                      {entry.subject}
                    </div>
                    {/* Body */}
                    <div style={{ padding: "14px", background: C.surface, border: `1px solid ${hexA(C.brand, 0.15)}`, borderTop: "none", borderRadius: "0 0 8px 8px", fontSize: 13.5, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
                      {entry.body || <span style={{ color: C.ink3, fontStyle: "italic" }}>Body not recorded (sent before logging was added)</span>}
                    </div>
                    {/* Meta footer */}
                    <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11.5, color: C.ink3 }}>
                      <span>To: <strong style={{ color: C.ink2 }}>{entry.to}</strong></span>
                      {entry.resendId && <span>Resend ID: <strong style={{ color: C.ink2, fontFamily: "monospace" }}>{entry.resendId}</strong></span>}
                      {entry.statusCheckedAt && <span>Status checked: <strong style={{ color: C.ink2 }}>{new Date(entry.statusCheckedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</strong></span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {clearConfirm && (
        <AppComponent name="ConfirmModal"
          message="Clear the entire email log? This cannot be undone."
          okLabel="Clear log"
          danger
          onOk={() => { setData(d => ({ ...d, emailLog: [] })); setClearConfirm(false); }}
          onCancel={() => setClearConfirm(false)}
        />
      )}
    </div>
  );
}

const RESET_WIPE_TABLES = [
  { key: "clients",        label: "Clients" },
  { key: "partners",       label: "Studio partners" },
  { key: "sessions",       label: "Sessions" },
  { key: "registrations",  label: "Calendly bookings" },
  { key: "payments",       label: "Stripe payments" },
  { key: "offers",         label: "Offers" },
  { key: "referrals",      label: "Referrals" },
  { key: "followups",      label: "Follow-ups" },
  { key: "sequences",      label: "Follow-up sequences" },
  { key: "expenses",       label: "Expenses" },
  { key: "revenue",        label: "Revenue" },
  // Excluded (preserved on reset):
  // outreach      — real studio relationship records, not test data
  // testimonials  — real client-written content
  // content       — evergreen content calendar posts
  // emailLog      — permanent audit trail
];

const RESET_KEEP_ITEMS = [
  "Message templates",
  "Follow-up template overrides",
  "Content Calendar posts",
  "Testimonials",
  "Outreach Hub records",
  "CRM settings & dropdown lists",
  "Journey descriptions",
  "User accounts & PINs",
  "Email log (permanent audit trail)",
];

export function ResetToProductionView({ data, setData, currentUser }) {
  const [confirm, setConfirm]   = useState("");
  const [done, setDone]         = useState(null); // { queueCleared: boolean }
  const [step, setStep]         = useState(1); // 1 = info, 2 = confirm text, 3 = PIN challenge
  const [pinValue, setPinValue] = useState("");
  const [pinErr, setPinErr]     = useState("");
  const [verifying, setVerifying] = useState(false);

  const counts = RESET_WIPE_TABLES.reduce((acc, { key }) => {
    acc[key] = (data[key] || []).length;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const executeReset = async () => {
    let queueCleared = false;
    try {
      const res = await fetch(calendlyApiUrl("/api/integration/clear-queues"), {
        method: "POST",
        headers: apiHeaders(),
      });
      queueCleared = res.ok;
    } catch { /* backend offline — CRM wipe still proceeds */ }

    // Delete each agreement blob individually — a single IDB failure must not abort the rest
    let blobFailures = 0;
    for (const p of data.partners || []) {
      for (const a of p.agreements || []) {
        try { await deleteAgreementBlob(a.id); } catch { blobFailures++; }
      }
    }

    // Table wipe is the critical step — any failure here is reported to the caller
    const wipeKeys = RESET_WIPE_TABLES.map(t => t.key);
    setData(prev => {
      const clean = { ...prev };
      wipeKeys.forEach(t => { clean[t] = []; });
      return clean;
    });
    setDone({ queueCleared, blobFailures });
  };

  const handleVerifyPin = async () => {
    if (!pinValue) { setPinErr("Enter your PIN."); return; }
    setVerifying(true); setPinErr("");

    // Phase 1 — verify PIN only; wrong PIN must not reach the reset logic
    try {
      const storedIter = currentUser?.pbkdf2Iterations ?? 100_000;
      await Sec.unwrapKeyForUser(currentUser.wrappedMasterKey, pinValue, currentUser.pinSalt, storedIter);
    } catch {
      setPinErr("Incorrect PIN. Try again.");
      setVerifying(false);
      return;
    }

    // Phase 2 — execute reset; failures here are reset errors, not PIN errors
    try {
      await executeReset();
    } catch (e) {
      setPinErr(`Reset failed: ${e?.message || "unexpected error"}. The reset may be partially complete — review CRM data before retrying.`);
    } finally {
      setVerifying(false);
    }
  };

  if (done) return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <CheckCircle size={48} color="#4A8C6F" style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: "#2D6A50", marginBottom: 8 }}>Production reset complete</div>
      <div style={{ fontSize: 14, color: C.ink2, maxWidth: 520, margin: "0 auto", lineHeight: 1.6 }}>
        All test CRM data has been wiped. Your templates, settings, journey descriptions, and user accounts are intact.
        Calendly and Stripe webhook subscriptions, API keys, and Resend email configuration were not changed.
      </div>
      {done.queueCleared ? (
        <div style={{ marginTop: 20, padding: "12px 18px", background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, display: "inline-block", fontSize: 13, color: "#2D6A50", fontWeight: 600 }}>
          Calendly and Stripe webhook queues were cleared — old test events will not re-import on the next sync.
        </div>
      ) : (
        <div style={{ marginTop: 20, padding: "12px 18px", background: hexA("#D9892B", 0.1), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 10, display: "inline-block", fontSize: 13, color: "#9A5D10", fontWeight: 600 }}>
          Backend was unreachable — clear webhook queues manually: <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>POST /api/integration/clear-queues</code> (or restart the backend with empty queue files) before syncing Calendly or Stripe.
        </div>
      )}
      {done.blobFailures > 0 && (
        <div style={{ marginTop: 12, padding: "12px 18px", background: hexA("#D9892B", 0.1), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 10, display: "inline-block", fontSize: 13, color: "#9A5D10", fontWeight: 600 }}>
          {done.blobFailures} agreement file{done.blobFailures !== 1 ? "s" : ""} could not be removed from local storage (IDB error). All CRM records were wiped. Reload the app and check Admin → Storage & Backup if storage space is a concern.
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      {/* Header */}
      <div style={{ background: hexA("#C0392B", 0.06), border: `1px solid ${hexA("#C0392B", 0.2)}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <AlertCircle size={22} color="#C0392B" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#C0392B", marginBottom: 4 }}>Reset to Production</div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
            This permanently deletes all test/seed data and leaves the app clean for real clients, sessions, and studio partners.
            <strong> This cannot be undone.</strong> Export a backup first if you need to preserve anything.
          </div>
        </div>
      </div>

      {step === 1 && (
        <>
          {/* What gets wiped */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: C.surfaceAlt, borderBottom: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, color: C.ink }}>
              What will be wiped ({total} total records)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {RESET_WIPE_TABLES.map(({ key, label }, i) => (
                <div key={key} style={{ padding: "9px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < RESET_WIPE_TABLES.length - 2 ? `1px solid ${C.lineSoft || C.line}` : "none", borderRight: i % 2 === 0 ? `1px solid ${C.lineSoft || C.line}` : "none" }}>
                  <span style={{ fontSize: 13, color: C.ink }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: counts[key] > 0 ? "#C0392B" : C.ink3 }}>{counts[key]} record{counts[key] !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 12.5, color: C.ink3, lineHeight: 1.55, padding: "0 2px" }}>
            On confirm, pending Calendly and Stripe webhook queues on the backend are also cleared so test bookings and payments cannot re-import. Server-side integration setup (webhook URLs, API keys, Resend) is unchanged.
          </div>

          {/* What gets kept */}
          <div style={{ background: C.surface, border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: hexA("#4A8C6F", 0.06), borderBottom: `1px solid ${hexA("#4A8C6F", 0.2)}`, fontWeight: 700, fontSize: 13, color: "#2D6A50" }}>
              ✓ What will be preserved
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RESET_KEEP_ITEMS.map(item => (
                <span key={item} style={{ fontSize: 12.5, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: hexA("#4A8C6F", 0.1), color: "#2D6A50" }}>{item}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{
              padding: "10px 24px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "#C0392B", color: "#fff", fontWeight: 700, fontSize: 13.5,
            }}>
              I understand — continue to reset
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Type RESET to confirm</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginBottom: 14, lineHeight: 1.55 }}>
            This will permanently delete <strong>{total} records</strong> across {RESET_WIPE_TABLES.length} tables and clear Calendly/Stripe webhook queues.
            Your templates, settings, and user accounts will not be affected.
          </div>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Type RESET here"
            autoFocus
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${confirm === "RESET" ? "#4A8C6F" : C.line}`, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", color: C.ink, boxSizing: "border-box", outline: "none", marginBottom: 14 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStep(1); setConfirm(""); }} style={{
              padding: "10px 20px", borderRadius: 9, border: `1px solid ${C.line}`,
              background: "transparent", color: C.ink2, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Back</button>
            <button onClick={() => { if (confirm === "RESET") setStep(3); }} disabled={confirm !== "RESET"} style={{
              padding: "10px 24px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13.5,
              cursor: confirm === "RESET" ? "pointer" : "not-allowed",
              background: confirm === "RESET" ? "#C0392B" : C.line,
              color: confirm === "RESET" ? "#fff" : C.ink3,
              transition: "background .15s",
            }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Lock size={15} color="#C0392B" />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Confirm your PIN</div>
          </div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginBottom: 14, lineHeight: 1.55 }}>
            Enter your admin PIN to authorize this permanent wipe of <strong>{total} records</strong>.
          </div>
          <input
            type="password"
            value={pinValue}
            onChange={e => { setPinValue(e.target.value); setPinErr(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleVerifyPin(); }}
            placeholder="Your PIN"
            autoFocus
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${pinErr ? "#C0392B" : C.line}`, fontSize: 14, fontWeight: 700, letterSpacing: "0.2em", color: C.ink, boxSizing: "border-box", outline: "none", marginBottom: pinErr ? 6 : 14 }}
          />
          {pinErr && <div style={{ fontSize: 12, color: "#C0392B", marginBottom: 10 }}>{pinErr}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStep(2); setPinValue(""); setPinErr(""); }} style={{
              padding: "10px 20px", borderRadius: 9, border: `1px solid ${C.line}`,
              background: "transparent", color: C.ink2, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Back</button>
            <button onClick={handleVerifyPin} disabled={verifying || !pinValue} style={{
              padding: "10px 24px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13.5,
              cursor: verifying || !pinValue ? "not-allowed" : "pointer",
              background: !pinValue ? C.line : "#C0392B",
              color: !pinValue ? C.ink3 : "#fff",
              transition: "background .15s", display: "flex", alignItems: "center", gap: 7,
            }}>
              {verifying ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Verifying…</> : <>Wipe {total} records — go live</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminView({ tab, data, setData, secUsers, currentUser, today, crmSettings, onSaveSettings }) {
  const [integrityResults, setIntegrityResults] = useState(null);
  const [runningCheck, setRunningCheck]         = useState(false);
  const [schemaTable,  setSchemaTable]          = useState(DB_SCHEMA[0].table);
  const [exportMsg,    setExportMsg]            = useState("");
  const [expandedField, setExpandedField]       = useState(null);
  const [exportConfirm, setExportConfirm]       = useState(false);
  const [restorePreview, setRestorePreview]     = useState(null);
  const [restoreMsg,    setRestoreMsg]          = useState("");
  const [restoreError,  setRestoreError]        = useState("");
  const [restoreConfirm, setRestoreConfirm]     = useState(false);
  const restoreFileRef = useRef(null);

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMsg(""); setRestoreError(""); setRestorePreview(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);
        const normalized = normalizeCrmData(raw);
        if (!Sec.validate(normalized)) {
          setRestoreError("This file does not appear to be a valid SBCRM backup.");
          return;
        }
        setRestorePreview(normalized);
      } catch (err) {
        setRestoreError("Could not read file: " + (err.message || "invalid JSON"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const applyRestore = () => {
    if (!restorePreview) return;
    const total = CRM_ARRAY_KEYS.reduce((s, k) => s + (restorePreview[k]?.length || 0), 0);
    setData(restorePreview);
    setRestorePreview(null);
    setRestoreConfirm(false);
    setRestoreMsg(`✓ Restored — ${total} records loaded`);
    setTimeout(() => setRestoreMsg(""), 10000);
  };

  // ── record counts + sizes (memoized — JSON serialisation is expensive) ──
  const { tables, totalRecords, totalKB } = useMemo(() => {
    const enc = new TextEncoder();
    const tbls = DB_SCHEMA.map(t => {
      const rows  = data[t.table] || [];
      const bytes = enc.encode(JSON.stringify(rows)).length;
      return { ...t, count: rows.length, sizeKB: (bytes / 1024).toFixed(1) };
    });
    return {
      tables: tbls,
      totalRecords: tbls.reduce((s, t) => s + t.count, 0),
      totalKB:      tbls.reduce((s, t) => s + parseFloat(t.sizeKB), 0).toFixed(1),
    };
  }, [data]);
  const storageUsedKB = (() => {
    try {
      const raw = localStorage.getItem("simplybreathe:data:v5:enc") || "";
      return (raw.length / 1024).toFixed(1);
    } catch { return "N/A"; }
  })();

  // ── integrity checks ──
  const runIntegrity = () => {
    setRunningCheck(true);
    const issues = [];
    const warn = (table, id, field, msg, severity = "medium") =>
      issues.push({ table, id, field, msg, severity });

    // Clients
    (data.clients || []).forEach(r => {
      if (!r.name?.trim())       warn("clients",      r.id, "name",    "Missing name",                  "high");
      if (!r.email && !r.phone)  warn("clients",      r.id, "contact", "No email or phone",             "medium");
    });
    // Partners
    (data.partners || []).forEach(r => {
      if (!r.name?.trim())       warn("partners",     r.id, "name",    "Missing studio name",           "high");
      if (!r.stage)              warn("partners",     r.id, "stage",   "No pipeline stage set",         "medium");
    });
    // Sessions
    (data.sessions || []).forEach(r => {
      if (!r.date)               warn("sessions",     r.id, "date",    "Missing session date",          "high");
      if (r.grossRevenue > 0 && !r.netRevenue)
                                 warn("sessions",     r.id, "netRevenue","Gross revenue set but net missing","medium");
      if (r.status === "Completed" && !r.followUpSent)
                                 warn("sessions",     r.id, "followUpSent","Completed session — follow-up not sent","low");
    });
    // Offers
    (data.offers || []).forEach(r => {
      if (!r.client?.trim())     warn("offers",       r.id, "client",  "Offer has no linked client",    "high");
      if (!r.amount || r.amount <= 0)
                                 warn("offers",       r.id, "amount",  "Offer amount is zero or missing","medium");
      if (r.expiresOn && r.expiresOn < today && !["Accepted","Paid","Declined","Expired"].includes(r.status))
                                 warn("offers",       r.id, "expiresOn","Offer past expiry but still open","medium");
    });
    // Revenue
    (data.revenue || []).forEach(r => {
      if (!r.date)               warn("revenue",      r.id, "date",    "Missing revenue date",          "high");
      if (r.gross == null && r.net == null) warn("revenue", r.id, "gross", "No gross or net revenue value", "medium");
    });
    // Referrals
    (data.referrals || []).forEach(r => {
      if (!r.referrer?.trim())   warn("referrals",    r.id, "referrer","Missing referrer name",         "high");
    });
    // Testimonials
    (data.testimonials || []).forEach(r => {
      if (!r.client?.trim())     warn("testimonials", r.id, "client",  "Missing client name",           "high");
      if (r.status === "Approved" && !r.permissionRec)
                                 warn("testimonials", r.id, "permissionRec","Approved but no permission recorded","high");
    });
    // Templates
    (data.templates || []).forEach(r => {
      if (!r.name?.trim())       warn("templates",    r.id, "name",    "Template has no name",          "high");
      if (!r.body?.trim())       warn("templates",    r.id, "body",    "Template body is empty",        "medium");
    });

    setTimeout(() => { setIntegrityResults(issues); setRunningCheck(false); }, 300);
  };

  // ── export all data (Owner only) ──
  const doExportAll = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `sbcrm-backup-${today}.json`; a.click();
    URL.revokeObjectURL(url);
    try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch {}
    setExportMsg("✓ Backup downloaded — store it securely");
    setTimeout(() => setExportMsg(""), 5000);
  };
  const exportAll = () => {
    if (currentUser?.role !== "Owner") return;
    setExportConfirm(true);
  };

  const SEV_COLOR = { high: "#EF4444", medium: "#F59E0B", low: C.ink3 };
  const SEV_BG    = { high: "#FEF2F2", medium: "#FFFBEB", low: C.surfaceAlt };
  const TYPE_COLOR = { string: "#2E6FB0", number: "#D9892B", currency: "#4A8C6F", date: "#8E44AD", boolean: "#2A9D8F", select: C.brand, array: "#C0392B", object: "#6B5CE7", email: "#2E6FB0", textarea: "#55627B" };

  const schDef = DB_SCHEMA.find(t => t.table === schemaTable);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {tab === "overview" && (
        <>
          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Records",    value: totalRecords,                      sub: "across all tables" },
              { label: "Active Users",     value: secUsers.length,                   sub: "logged-in accounts" },
              { label: "Data Size",        value: totalKB + " KB",                   sub: "uncompressed JSON" },
              { label: "Storage Used",     value: storageUsedKB + " KB",             sub: "encrypted in localStorage" },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, borderRadius: 14, padding: "18px 20px", border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 11, color: C.ink3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: "6px 0 2px", fontFamily: FONT.display }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Table record counts */}
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Database Tables</div>
              <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Record counts and estimated size per table</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  {["Table","Lane","Records","Fields","Size","Status"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tables.map((t, i) => (
                  <tr key={t.table} style={{ borderBottom: i < tables.length - 1 ? `1px solid ${C.line}` : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>{t.table}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                        background: t.lane === "B2C" ? C.brandSoft : t.lane === "B2B" ? "#E0F5F0" : C.surfaceAlt,
                        color: t.lane === "B2C" ? C.brandDeep : t.lane === "B2B" ? "#2A9D8F" : C.ink3 }}>
                        {t.lane}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: t.count === 0 ? "#EF4444" : C.ink }}>{t.count}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: C.ink2 }}>{t.fields.length}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: C.ink3 }}>{t.sizeKB} KB</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.count > 0 ? "#16A34A" : "#EF4444" }}>
                        {t.count > 0 ? "✓ Has data" : "Empty"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* System info */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: C.surface, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 12 }}>Storage Keys</div>
              {[
                { key: "simplybreathe:data:v5:enc", desc: "Encrypted CRM data" },
                { key: "sb:security:v1",            desc: "User accounts & PIN hashes" },
              ].map(k => (
                <div key={k.key} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: C.brand, background: C.brandMist, padding: "4px 8px", borderRadius: 6, wordBreak: "break-all" }}>{k.key}</div>
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>{k.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.surface, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 12 }}>Encryption</div>
              {[
                { label: "Algorithm",      value: "AES-256-GCM" },
                { label: "Key derivation", value: `PBKDF2 · SHA-256 · ${((currentUser?.pbkdf2Iterations ?? 100_000) / 1000).toFixed(0)}k iterations` },
                { label: "Salt length",    value: "16 bytes (random per user)" },
                { label: "Key model",      value: "Envelope encryption (master key wrapped per user)" },
                { label: "Data version",   value: "v5" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12 }}>
                  <span style={{ color: C.ink3 }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: C.ink }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "schema" && (
        <>
          {/* Table selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {DB_SCHEMA.map(t => (
              <button key={t.table} onClick={() => { setSchemaTable(t.table); setExpandedField(null); }}
                style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${schemaTable === t.table ? C.brand : C.line}`,
                  background: schemaTable === t.table ? C.brandSoft : C.surface,
                  color: schemaTable === t.table ? C.brandDeep : C.ink2,
                  fontWeight: schemaTable === t.table ? 700 : 500, fontSize: 13, cursor: "pointer" }}>
                {t.label}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({t.fields.length})</span>
              </button>
            ))}
          </div>

          {schDef && (
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}`, background: C.surfaceAlt }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, background: C.brandSoft, color: C.brandDeep, padding: "4px 12px", borderRadius: 8 }}>{schDef.table}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 8,
                    background: schDef.lane === "B2C" ? C.brandSoft : schDef.lane === "B2B" ? "#E0F5F0" : C.surfaceAlt,
                    color: schDef.lane === "B2C" ? C.brandDeep : schDef.lane === "B2B" ? "#2A9D8F" : C.ink3 }}>
                    {schDef.lane}
                  </span>
                  <span style={{ fontSize: 13, color: C.ink2 }}>{schDef.description}</span>
                </div>
              </div>

              {/* Field rows */}
              {schDef.fields.map((f, i) => (
                <div key={f.name}
                  style={{ borderBottom: i < schDef.fields.length - 1 ? `1px solid ${C.line}` : "none",
                    background: expandedField === f.name ? C.surfaceAlt : "transparent", cursor: "pointer" }}
                  onClick={() => setExpandedField(expandedField === f.name ? null : f.name)}>
                  <div style={{ display: "grid", gridTemplateColumns: "200px 110px 80px 1fr", alignItems: "center", padding: "12px 22px", gap: 12 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: C.ink }}>{f.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: hexA(TYPE_COLOR[f.type] || C.ink3, 0.12), color: TYPE_COLOR[f.type] || C.ink3, display: "inline-block" }}>{f.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: f.required ? "#EF4444" : C.ink3 }}>{f.required ? "Required" : "Optional"}</span>
                    <span style={{ fontSize: 13, color: C.ink2 }}>{f.description}</span>
                  </div>
                  {expandedField === f.name && f.values && (
                    <div style={{ padding: "0 22px 14px 22px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Allowed Values</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {f.values.split(" · ").map(v => (
                          <span key={v} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: C.brandSoft, color: C.brandDeep, fontWeight: 500 }}>{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.ink3, display: "flex", gap: 16 }}>
                <span><strong>{schDef.fields.length}</strong> fields total</span>
                <span><strong>{schDef.fields.filter(f => f.required).length}</strong> required</span>
                <span><strong>{schDef.fields.filter(f => f.type === "select").length}</strong> dropdowns</span>
                <span><strong>{schDef.fields.filter(f => f.type === "boolean").length}</strong> checkboxes</span>
                <span style={{ marginLeft: "auto", fontStyle: "italic" }}>Click a row to see allowed values</span>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "integrity" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Data Integrity Check</div>
              <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>Scans all records for missing required fields, logical inconsistencies, and data quality issues.</div>
            </div>
            <button onClick={runIntegrity} disabled={runningCheck}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, border: "none", background: C.brand, color: "#fff", fontSize: 13, fontWeight: 600, cursor: runningCheck ? "not-allowed" : "pointer", opacity: runningCheck ? 0.7 : 1 }}>
              {runningCheck ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Running…</> : <><Activity size={14} /> Run Check</>}
            </button>
          </div>

          {integrityResults === null ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.ink3 }}>
              <Activity size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>Click "Run Check" to scan all records</div>
            </div>
          ) : integrityResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#16A34A" }}>
              <Check size={40} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700 }}>All Clear</div>
              <div style={{ fontSize: 13, color: C.ink3, marginTop: 6 }}>No integrity issues found across {totalRecords} records.</div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {["high","medium","low"].map(sev => {
                  const cnt = integrityResults.filter(i => i.severity === sev).length;
                  return (
                    <div key={sev} style={{ flex: 1, background: SEV_BG[sev], border: `1px solid ${SEV_COLOR[sev]}30`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: SEV_COLOR[sev] }}>{cnt}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR[sev], textTransform: "capitalize" }}>{sev} severity</div>
                    </div>
                  );
                })}
              </div>

              {/* Issue list */}
              <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden" }}>
                {["high","medium","low"].flatMap(sev =>
                  integrityResults.filter(i => i.severity === sev).map((issue, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "90px 140px 130px 1fr", gap: 12, alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.line}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background: SEV_BG[issue.severity], color: SEV_COLOR[issue.severity], textTransform: "capitalize", textAlign: "center" }}>{issue.severity}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: C.ink2 }}>{issue.table}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: C.brand }}>{issue.field}</span>
                      <span style={{ fontSize: 13, color: C.ink }}>{issue.msg}</span>
                    </div>
                  ))
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: C.ink3, textAlign: "right" }}>{integrityResults.length} issue{integrityResults.length !== 1 ? "s" : ""} found across {totalRecords} records</div>
            </>
          )}
        </>
      )}

      {tab === "storage" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Export */}
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 6 }}>Export Backup</div>
              <div style={{ fontSize: 13, color: C.ink3, marginBottom: 12, lineHeight: 1.6 }}>
                Downloads a full JSON backup of all CRM data.
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px", marginBottom: 18 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>⚠️</span>
                <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
                  <strong>Plain-text file.</strong> The downloaded file is <em>not encrypted</em>. It contains client names, emails, phone numbers, and financial records. Store it securely and do not leave it in your Downloads folder.
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.ink2, marginBottom: 16 }}>
                <strong>{totalRecords}</strong> records · <strong>{totalKB} KB</strong> uncompressed
              </div>
              {currentUser?.role === "Owner" ? (
                <button onClick={exportAll}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: C.brand, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Download size={14} /> Download Backup
                </button>
              ) : (
                <div style={{ fontSize: 12, color: C.ink3, padding: "8px 0" }}>Only the Owner account can export data.</div>
              )}
              {exportMsg && <div style={{ marginTop: 10, fontSize: 13, color: "#16A34A", fontWeight: 600 }}>{exportMsg}</div>}
            </div>

            {/* Restore */}
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 6 }}>Restore from Backup</div>
              <div style={{ fontSize: 13, color: C.ink3, marginBottom: 12, lineHeight: 1.6 }}>
                Load a previously exported <code>.json</code> backup file. All current data will be replaced.
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#FFF2F0", border: "1px solid #F5C4BC", borderRadius: 8, padding: "10px 12px", marginBottom: 18 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>🔴</span>
                <div style={{ fontSize: 12, color: "#7A2E1E", lineHeight: 1.5 }}>
                  <strong>This replaces everything.</strong> All current records will be overwritten by the backup. This cannot be undone — export a backup of the current data first if needed.
                </div>
              </div>

              {currentUser?.role === "Owner" ? (
                <>
                  <input
                    ref={restoreFileRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: "none" }}
                    onChange={handleRestoreFile}
                  />
                  <button
                    onClick={() => { setRestorePreview(null); setRestoreMsg(""); setRestoreError(""); restoreFileRef.current?.click(); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.surfaceAlt, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: restorePreview ? 14 : 0 }}>
                    <Upload size={14} /> Choose backup file…
                  </button>

                  {restoreError && (
                    <div style={{ marginTop: 12, fontSize: 13, color: "#B03030", background: "#FDECEC", border: "1px solid #F2C2C2", borderRadius: 8, padding: "10px 12px" }}>
                      {restoreError}
                    </div>
                  )}

                  {restorePreview && (
                    <div style={{ marginTop: 12, background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.line}`, padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.ink, marginBottom: 10 }}>Backup preview</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 14 }}>
                        {CRM_ARRAY_KEYS.map(k => {
                          const backupCount = restorePreview[k]?.length || 0;
                          const currentCount = (data[k] || []).length;
                          return (
                            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: `1px solid ${C.lineSoft}` }}>
                              <span style={{ color: C.ink2, textTransform: "capitalize" }}>{k}</span>
                              <span style={{ fontWeight: 600, color: backupCount !== currentCount ? "#9B7A2E" : C.ink }}>
                                {backupCount} <span style={{ color: C.ink3, fontWeight: 400 }}>({currentCount} now)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setRestoreConfirm(true)}
                        style={{ width: "100%", padding: "10px", borderRadius: 9, border: "none", background: "#C0573F", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Restore this backup
                      </button>
                    </div>
                  )}

                  {restoreMsg && <div style={{ marginTop: 12, fontSize: 13, color: "#16A34A", fontWeight: 600 }}>{restoreMsg}</div>}
                </>
              ) : (
                <div style={{ fontSize: 12, color: C.ink3, padding: "8px 0" }}>Only the Owner account can restore data.</div>
              )}
            </div>
          </div>

          {/* Storage details */}
          <div style={{ marginTop: 18, background: C.surface, borderRadius: 14, border: `1px solid ${C.line}`, padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 14 }}>Storage Details</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px 24px" }}>
              {[
                { label: "Encrypted store size",  value: storageUsedKB + " KB" },
                { label: "Uncompressed data size", value: totalKB + " KB" },
                { label: "Total records",          value: totalRecords },
                { label: "Active users",           value: secUsers.length },
                { label: "Logged in as",           value: currentUser?.name || "—" },
                { label: "Current role",           value: currentUser?.role || "—" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 }}>
                  <span style={{ color: C.ink3 }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: C.ink }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-table breakdown */}
          <div style={{ marginTop: 18, background: C.surface, borderRadius: 14, border: `1px solid ${C.line}`, padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 14 }}>Storage by Table</div>
            {tables.map(t => {
              const pct = totalKB > 0 ? (parseFloat(t.sizeKB) / parseFloat(totalKB)) * 100 : 0;
              return (
                <div key={t.table} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: C.ink, fontWeight: 600 }}>{t.label} <span style={{ color: C.ink3, fontWeight: 400 }}>({t.count} records)</span></span>
                    <span style={{ color: C.ink3 }}>{t.sizeKB} KB · {pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: C.line, borderRadius: 4 }}>
                    <div style={{ height: "100%", width: pct + "%", background: C.brand, borderRadius: 4, minWidth: pct > 0 ? 4 : 0 }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Restore confirmation modal */}
          {restoreConfirm && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
              <div style={{ background: C.surface, borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.2)", width: "100%", maxWidth: 440, padding: "28px 28px 24px" }}>
                <div style={{ fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 10 }}>Restore this backup?</div>
                <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.6, marginBottom: 20 }}>
                  This will <strong>permanently replace all current CRM data</strong> with the backup. There is no undo. Make sure you have exported a copy of the current data if you might need it.
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setRestoreConfirm(false)}
                    style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${C.line}`, background: "none", fontSize: 13.5, cursor: "pointer", color: C.ink2 }}>
                    Cancel
                  </button>
                  <button onClick={applyRestore}
                    style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#C0573F", color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
                    Yes, restore backup
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "settings" && crmSettings && (
        <CrmSettingsView settings={crmSettings} onSave={onSaveSettings} />
      )}

      {tab === "journeys" && crmSettings && (
        <JourneyDescriptionsView settings={crmSettings} onSave={onSaveSettings} />
      )}
      {tab === "email-logs" && (
        <EmailLogsView data={data} setData={setData} />
      )}
      {tab === "reset" && (
        <ResetToProductionView data={data} setData={setData} currentUser={currentUser} />
      )}
      {exportConfirm && (
        <AppComponent name="ConfirmModal"
          message="This backup file contains ALL your CRM data in plain text — client names, emails, phone numbers, and financial records. Store it in a secure location and do not share it."
          okLabel="Download backup"
          onOk={() => { doExportAll(); setExportConfirm(false); }}
          onCancel={() => setExportConfirm(false)}
        />
      )}
    </div>
  );
}

const SETTINGS_META = [
  { key: "sources",        label: "Lead Sources",        hint: "Where clients and studio leads come from. Shown in client & offer forms." },
  { key: "clientTypes",    label: "Client Types",         hint: "Client segment labels used in the client form and analytics." },
  { key: "clientStatuses", label: "Client Statuses",      hint: "Status options for a client record (e.g. Lead, Booked, Member)." },
  { key: "packageTypes",   label: "Package Types",        hint: "Package options available to clients (e.g. Drop-in, 3-pack, Membership)." },
  { key: "offerTypes",     label: "Offer Types",          hint: "Types of offers/products you can create in the Offers & Sales section." },
  { key: "referralLevels", label: "Referral Potential",   hint: "Referral strength levels used on client records (e.g. Low, Medium, High)." },
];

export function CrmSettingsView({ settings, onSave }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [saved, setSaved] = useState(false);
  const [newVal, setNewVal] = useState({});

  const addItem = (key) => {
    const v = (newVal[key] || "").trim();
    if (!v || draft[key].includes(v)) return;
    setDraft(d => ({ ...d, [key]: [...d[key], v] }));
    setNewVal(n => ({ ...n, [key]: "" }));
  };

  const removeItem = (key, item) => {
    setDraft(d => ({ ...d, [key]: d[key].filter(x => x !== item) }));
  };

  const moveItem = (key, idx, dir) => {
    setDraft(d => {
      const arr = [...d[key]];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return d;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return { ...d, [key]: arr };
    });
  };

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = (key) => {
    setDraft(d => ({ ...d, [key]: [...DEFAULT_CRM_SETTINGS[key]] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>CRM Settings</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 3 }}>Customise dropdown options throughout the CRM. Changes apply immediately after saving.</div>
        </div>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: saved ? "#4A8C6F" : C.brand, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "background 0.2s" }}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Calendly sync-from date — custom scalar field, not a string-array dropdown */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, marginBottom: 4 }}>Calendly Sync Cutoff Date</div>
        <div style={{ fontSize: 12, color: C.ink3, marginBottom: 14, lineHeight: 1.6 }}>
          Calendly bookings created <strong>before</strong> this date are ignored during sync — based on when the client booked, not the session date. Use this to prevent old test bookings from re-appearing after a production reset. Leave blank to sync all events.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="date"
            value={draft.calendlySyncFromDate ? draft.calendlySyncFromDate.slice(0, 10) : ""}
            onChange={e => setDraft(d => ({ ...d, calendlySyncFromDate: e.target.value ? e.target.value + "T00:00:00.000Z" : "" }))}
            style={{ padding: "7px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, background: C.surface }}
          />
          {draft.calendlySyncFromDate && (
            <span style={{ fontSize: 12, color: C.ink3 }}>
              Ignoring bookings created before {new Date(draft.calendlySyncFromDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} (midnight UTC)
            </span>
          )}
          {draft.calendlySyncFromDate && (
            <button onClick={() => setDraft(d => ({ ...d, calendlySyncFromDate: "" }))}
              style={{ fontSize: 11.5, color: C.ink3, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {SETTINGS_META.map(({ key, label, hint }) => (
          <div key={key} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{label}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{hint}</div>
              </div>
              <button onClick={() => handleReset(key)} title="Reset to defaults"
                style={{ fontSize: 10.5, color: C.ink3, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>
                Reset
              </button>
            </div>

            {/* Item list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {draft[key].map((item, idx) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surfaceAlt || "#F8F9FB", borderRadius: 7, padding: "5px 8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button onClick={() => moveItem(key, idx, -1)} disabled={idx === 0}
                      style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? C.line : C.ink3, padding: 0, lineHeight: 1, fontSize: 9 }}>▲</button>
                    <button onClick={() => moveItem(key, idx, 1)} disabled={idx === draft[key].length - 1}
                      style={{ background: "none", border: "none", cursor: idx === draft[key].length - 1 ? "default" : "pointer", color: idx === draft[key].length - 1 ? C.line : C.ink3, padding: 0, lineHeight: 1, fontSize: 9 }}>▼</button>
                  </div>
                  <span style={{ flex: 1, fontSize: 12.5, color: C.ink, fontWeight: 500 }}>{item}</span>
                  <button onClick={() => removeItem(key, item)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#C0573F", fontSize: 14, lineHeight: 1, padding: "0 2px", opacity: 0.7 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                    title="Remove">×</button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newVal[key] || ""}
                onChange={e => setNewVal(n => ({ ...n, [key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addItem(key)}
                placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}…`}
                style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12.5, color: C.ink }}
              />
              <button onClick={() => addItem(key)}
                style={{ padding: "6px 12px", background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`, borderRadius: 7, cursor: "pointer", color: C.brand, fontWeight: 700, fontSize: 13 }}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JourneyDescriptionsView({ settings, onSave }) {
  const [items, setItems] = useState(() => JSON.parse(JSON.stringify(settings.journeyDescriptions || [])));
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");

  const set = (id, field, val) =>
    setItems(prev => prev.map(j => j.id === id ? { ...j, [field]: val } : j));

  const addJourney = () => {
    const name = newName.trim();
    if (!name) return;
    setItems(prev => [...prev, { id: `jd_${Date.now()}`, name, description: "" }]);
    setNewName("");
  };

  const removeJourney = (id) => setItems(prev => prev.filter(j => j.id !== id));

  const handleSave = () => {
    // Save journeyDescriptions AND keep journeys string array in sync
    const next = {
      ...settings,
      journeyDescriptions: items,
      journeys: items.map(j => j.name).filter(Boolean),
    };
    onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Journey Descriptions</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 3 }}>
            Define the name and full description for each breathwork journey. Names appear in session records and calendar pills.
          </div>
        </div>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: saved ? "#4A8C6F" : C.brand, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "background 0.2s", flexShrink: 0 }}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Add new journey */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addJourney()}
          placeholder="New journey name…"
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, maxWidth: 320 }}
        />
        <button onClick={addJourney} style={{ padding: "8px 16px", background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`, borderRadius: 8, cursor: "pointer", color: C.brand, fontWeight: 700, fontSize: 13 }}>
          + Add Journey
        </button>
      </div>

      {/* Journey list */}
      {items.length === 0 && (
        <div style={{ textAlign: "center", color: C.ink3, fontSize: 13, padding: "40px 0" }}>No journeys yet. Add one above.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((j, idx) => (
          <div key={j.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "18px 20px" }}>
            {/* Journey name row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.brand, flexShrink: 0 }}>
                {idx + 1}
              </div>
              <input
                value={j.name}
                onChange={e => set(j.id, "name", e.target.value)}
                placeholder="Journey name"
                style={{ flex: 1, padding: "7px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.ink, background: C.surface }}
              />
              <button onClick={() => removeJourney(j.id)}
                title="Remove journey"
                style={{ background: "none", border: `1px solid ${hexA("#C0573F", 0.3)}`, borderRadius: 7, cursor: "pointer", color: "#C0573F", fontSize: 12, fontWeight: 600, padding: "5px 10px", flexShrink: 0 }}>
                Remove
              </button>
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Description</div>
              <textarea
                value={j.description}
                onChange={e => set(j.id, "description", e.target.value)}
                placeholder="Enter a full description of this journey — what it involves, the experience, outcomes, and anything clients should know…"
                rows={5}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, background: C.surfaceAlt || "#F8F9FB", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", minHeight: 100 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UserManagementView({ currentUser, secUsers, masterKeyRaw, onUsersUpdated, onConfirm }) {
  const [showAdd, setShowAdd]           = useState(false);
  const [editUser, setEditUser]         = useState(null);
  const [newName, setNewName]           = useState("");
  const [newRole, setNewRole]           = useState("Editor");
  const [newPin, setNewPin]             = useState("");
  const [newPerm, setNewPerm]           = useState({ ...ROLE_PERMISSIONS.Editor });
  const [showPin, setShowPin]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState("");
  const [deactivateConfirm, setDeactivateConfirm] = useState(null);

  const canManage = currentUser?.role === "Owner" || currentUser?.permissions?.manage;
  const initials  = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2800); };

  const applyRoleDefaults = (role) => {
    setNewRole(role);
    setNewPerm({ ...ROLE_PERMISSIONS[role] });
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newPin.trim()) return;
    if (newPin.length < 6) { flash("PIN must be at least 6 characters."); return; }
    if (!masterKeyRaw)    { flash("Session key unavailable — please log out and back in."); return; }
    setSaving(true);
    try {
      const pinSalt  = Sec.newSalt();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyRaw, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const color    = USER_COLORS[secUsers.length % USER_COLORS.length];
      const nu = {
        id: "u_" + Math.random().toString(36).slice(2, 9),
        name: newName.trim(), role: newRole,
        pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
        permissions: { ...newPerm },
        active: true, color, createdAt: todayISO(), lastLogin: "",
      };
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) sec.users = [];
      const updated = { ...sec, version: 2, users: [...sec.users, nu] };
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      onUsersUpdated(updated.users.filter(u => u.active !== false));
      setShowAdd(false); setNewName(""); setNewPin(""); setNewRole("Editor");
      flash(`✓ ${nu.name} added successfully`);
    } catch (e) { console.error("handleAdd error:", e); flash("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const handleUpdatePerms = async (userId, updatedPerms, updatedRole) => {
    
    setSaving(true);
    try {
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) { flash("No user config found."); setSaving(false); return; }
      const updated = { ...sec, users: sec.users.map(u =>
        u.id === userId ? { ...u, permissions: updatedPerms, role: updatedRole } : u
      )};
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      onUsersUpdated(updated.users.filter(u => u.active !== false));
      setEditUser(null);
      flash("✓ Permissions updated");
    } catch (e) { console.error("handleUpdatePerms:", e); flash("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const handleResetPin = async (userId, newPinVal) => {
    if (!newPinVal.trim() || !masterKeyRaw) return;
    if (newPinVal.length < 6) { flash("New PIN must be at least 6 characters."); return; }
    setSaving(true);
    try {
      const pinSalt  = Sec.newSalt();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyRaw, newPinVal, pinSalt, Sec.PBKDF2_ITERATIONS);
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) { flash("No user config found."); setSaving(false); return; }
      const updated = { ...sec, users: sec.users.map(u =>
        u.id === userId ? { ...u, pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS } : u
      )};
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      flash("✓ PIN reset successfully");
    } catch (e) { console.error("handleResetPin:", e); flash("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const handleDeactivate = async (userId) => {
    if (userId === currentUser?.id) return;
    const confirmPayload = { message: "Deactivate this user? They will no longer be able to log in.", okLabel: "Deactivate", danger: true, onOk: () => doDeactivate(userId) };
    if (onConfirm) { onConfirm(confirmPayload); return; }
    setDeactivateConfirm(confirmPayload);
  };

  const doDeactivate = async (userId) => {
    setSaving(true);
    try {
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) { setSaving(false); return; }
      const updated = { ...sec, users: sec.users.map(u => u.id === userId ? { ...u, active: false } : u) };
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      onUsersUpdated(updated.users.filter(u => u.active !== false));
      flash("User deactivated");
    } catch (e) { console.error("handleDeactivate:", e); }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Total users"   value={secUsers.length} hint="active accounts" />
        <Stat label="Owner"         value={secUsers.filter(u => u.role === "Owner").length}  hint="" accent="#4A8C6F" />
        <Stat label="Editor / Admin" value={secUsers.filter(u => ["Admin","Editor"].includes(u.role)).length} hint="" accent={C.brand} />
        <Stat label="Viewer"        value={secUsers.filter(u => u.role === "Viewer").length} hint="" accent={C.ink3} />
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("✓") ? hexA("#4A8C6F", 0.1) : hexA("#C0392B", 0.1),
          border: `1px solid ${hexA(msg.startsWith("✓") ? "#4A8C6F" : "#C0392B", 0.3)}`,
          borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600,
          color: msg.startsWith("✓") ? "#2D6A50" : "#C0392B" }}>{msg}</div>
      )}

      {/* Add user */}
      {canManage && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px" }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} style={{
              display: "flex", alignItems: "center", gap: 8, background: C.brand,
              color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}><Plus size={15} /> Add User</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>New User</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Full name</div>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Role</div>
                  <select value={newRole} onChange={e => applyRoleDefaults(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink }}>
                    {USER_ROLES.filter(r => r !== "Owner").map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Initial PIN</div>
                <div style={{ position: "relative" }}>
                  <input type={showPin ? "text" : "password"} value={newPin} onChange={e => setNewPin(e.target.value)}
                    placeholder="Set their login PIN"
                    style={{ width: "100%", padding: "9px 44px 9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPin(s => !s)} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: C.ink3, fontWeight: 600,
                  }}>{showPin ? "HIDE" : "SHOW"}</button>
                </div>
              </div>
              {/* Permission toggles */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 8 }}>Permissions</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["view","edit","delete"].map(p => (
                    <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                      background: newPerm[p] ? hexA(C.brand, 0.1) : C.surfaceAlt,
                      border: `1px solid ${newPerm[p] ? C.brand : C.line}`, borderRadius: 8,
                      padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
                      color: newPerm[p] ? C.brand : C.ink3 }}>
                      <input type="checkbox" checked={!!newPerm[p]}
                        onChange={e => setNewPerm(pr => ({ ...pr, [p]: e.target.checked }))}
                        style={{ display: "none" }} />
                      {newPerm[p] ? <Check size={13} /> : null} {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAdd} disabled={saving || !newName.trim() || !newPin.trim()} style={{
                  padding: "9px 20px", background: C.brand, color: "#fff",
                  border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
                }}>Create User</button>
                <button onClick={() => setShowAdd(false)} style={{
                  padding: "9px 16px", background: "transparent", border: `1px solid ${C.line}`,
                  borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.ink2,
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {secUsers.map(u => {
          const isMe   = u.id === currentUser?.id;
          const isEdit = editUser?.id === u.id;
          const [ePerm, setEPerm] = [editUser?.permissions || u.permissions, (p) => setEditUser(ev => ({ ...ev, permissions: p }))];

          return (
            <div key={u.id} style={{
              background: C.surface, border: `1px solid ${isMe ? u.color : C.line}`,
              borderRadius: 12, overflow: "hidden",
              borderLeft: `4px solid ${isMe ? u.color || C.brand : C.line}`,
            }}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.color || C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {initials(u.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{u.name}</span>
                    {isMe && <span style={{ fontSize: 10.5, background: hexA(u.color || C.brand, 0.12), color: u.color || C.brand, borderRadius: 5, padding: "1px 7px", fontWeight: 700 }}>YOU</span>}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: hexA(USER_ROLE_COLOR[u.role] || C.ink3, 0.1),
                      color: USER_ROLE_COLOR[u.role] || C.ink3 }}>{u.role}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    {["view","edit","delete"].map(p => (
                      <span key={p} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                        background: u.permissions?.[p] ? hexA("#4A8C6F", 0.1) : hexA("#C0392B", 0.08),
                        color: u.permissions?.[p] ? "#2D6A50" : "#C0392B" }}>
                        {u.permissions?.[p] ? "✓" : "✕"} {p}
                      </span>
                    ))}
                    {u.lastLogin && <span style={{ fontSize: 10.5, color: C.ink3 }}>Last login: {fmtDate(u.lastLogin)}</span>}
                  </div>
                </div>
                {canManage && u.role !== "Owner" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditUser(isEdit ? null : { ...u })} style={{
                      padding: "6px 12px", border: `1px solid ${C.line}`, borderRadius: 8,
                      cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: C.ink2,
                    }}>{isEdit ? "Cancel" : "Edit"}</button>
                    {!isMe && <button onClick={() => handleDeactivate(u.id)} style={{
                      padding: "6px 10px", border: "none", borderRadius: 8,
                      cursor: "pointer", fontSize: 12, background: hexA("#C0392B", 0.08), color: "#C0392B", fontWeight: 600,
                    }}>Remove</button>}
                  </div>
                )}
              </div>

              {/* Edit panel */}
              {isEdit && (
                <EditUserPanel
                  user={editUser}
                  masterKeyRaw={masterKeyRaw}
                  onSave={(updatedPerms, updatedRole) => handleUpdatePerms(u.id, updatedPerms, updatedRole)}
                  onResetPin={(pin) => handleResetPin(u.id, pin)}
                  saving={saving}
                />
              )}
            </div>
          );
        })}
      </div>
      {deactivateConfirm && (
        <AppComponent name="ConfirmModal"
          message={deactivateConfirm.message}
          okLabel={deactivateConfirm.okLabel}
          danger={deactivateConfirm.danger}
          onOk={() => { deactivateConfirm.onOk(); setDeactivateConfirm(null); }}
          onCancel={() => setDeactivateConfirm(null)}
        />
      )}
    </div>
  );
}

export function EditUserPanel({ user, masterKeyRaw, onSave, onResetPin, saving }) {
  const [perm, setPerm]     = useState({ ...user.permissions });
  const [role, setRole]     = useState(user.role);
  const [resetPin, setResetPin] = useState("");
  const [showPin, setShowPin]   = useState(false);

  const applyRole = (r) => { setRole(r); setPerm({ ...ROLE_PERMISSIONS[r] }); };

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "14px 16px", background: C.surfaceAlt, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Role */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink3 }}>Role:</span>
        {USER_ROLES.filter(r => r !== "Owner").map(r => (
          <button key={r} onClick={() => applyRole(r)} style={{
            padding: "5px 12px", borderRadius: 20, border: `1px solid ${role === r ? USER_ROLE_COLOR[r] : C.line}`,
            background: role === r ? hexA(USER_ROLE_COLOR[r], 0.1) : "transparent",
            color: role === r ? USER_ROLE_COLOR[r] : C.ink2, fontWeight: 600, fontSize: 12, cursor: "pointer",
          }}>{r}</button>
        ))}
      </div>
      {/* Permissions */}
      <div style={{ display: "flex", gap: 8 }}>
        {["view","edit","delete"].map(p => (
          <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            background: perm[p] ? hexA(C.brand, 0.1) : "transparent",
            border: `1px solid ${perm[p] ? C.brand : C.line}`, borderRadius: 8,
            padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
            color: perm[p] ? C.brand : C.ink3 }}>
            <input type="checkbox" checked={!!perm[p]} onChange={e => setPerm(pr => ({ ...pr, [p]: e.target.checked }))} style={{ display: "none" }} />
            {perm[p] ? <Check size={13} /> : null} {p.charAt(0).toUpperCase() + p.slice(1)}
          </label>
        ))}
      </div>
      {/* Reset PIN */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input type={showPin ? "text" : "password"} value={resetPin} onChange={e => setResetPin(e.target.value)}
            placeholder="New PIN (leave blank to keep current)"
            style={{ width: "100%", padding: "8px 44px 8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12.5, color: C.ink, boxSizing: "border-box" }} />
          <button type="button" onClick={() => setShowPin(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 10, color: C.ink3, fontWeight: 600 }}>{showPin ? "HIDE" : "SHOW"}</button>
        </div>
        {resetPin && <button onClick={() => { onResetPin(resetPin); setResetPin(""); }} style={{
          padding: "8px 14px", background: "#D9892B", color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
        }}>Reset PIN</button>}
      </div>
      <button onClick={() => onSave(perm, role)} disabled={saving} style={{
        padding: "9px 20px", background: C.brand, color: "#fff",
        border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, alignSelf: "flex-start",
      }}>Save Changes</button>
    </div>
  );
}
