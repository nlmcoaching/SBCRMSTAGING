import { useState, useMemo } from "react";
import { Users, Building2, RefreshCw, X, Search, Mail, Check, Copy, AlertCircle, Send } from "lucide-react";
import { C, hexA } from "../../lib/theme.js";
import { uid, fmtDate, cleanName } from "../../lib/format.js";
import { TMPL_CATEGORY, TMPL_CATEGORY_COLOR, TMPL_CHANNEL_COLOR } from "../../lib/constants.js";
import { slimHistEntry, cappedLog, sendCrmEmail, makeEmailFailEntry } from "../../lib/email.js";
import { findUnreplacedTemplateTokens, unreplacedTokensMessage } from "../../lib/templates.js";
import { Stat, Tag, Empty } from "../../components/primitives.jsx";

const STARTER_TEMPLATES = [
  {
    name: "Session Booking Confirmation",
    category: "Session",
    channel: "Email",
    linkedTo: "Client",
    subject: "You're booked! Your breathwork session on {{sessionDate}}",
    body: `Hi {{firstName}},

You're all set! Here are your booking details:

📅 Date & Time: {{sessionDate}}
📍 Location / Link: {{sessionLink}}

A few things to help you prepare:
- Wear comfortable, loose-fitting clothing
- Avoid heavy meals for 2 hours before the session
- Have a blanket and pillow nearby if you're joining virtually
- Come with an open mind and willingness to breathe deeply

If you have any questions or need to reschedule, just reply to this email.

Looking forward to breathing with you soon.

Warm regards,
{{yourName}}`,
    notes: "Sent immediately after a new booking is confirmed.",
  },
  {
    name: "Pre-Session Reminder (24-Hour)",
    category: "Session",
    channel: "Email",
    linkedTo: "Client",
    subject: "Your breathwork session is tomorrow — a few reminders",
    body: `Hi {{firstName}},

Just a friendly reminder that your breathwork session is tomorrow at {{sessionTime}}.

Here's what to expect:
- The session typically runs {{sessionDuration}} minutes
- You may experience tingling, emotional releases, or deep relaxation — all normal
- Have water nearby and plan to rest quietly for 10–15 minutes after

📍 Location / Link: {{sessionLink}}

If anything comes up and you need to reschedule, please let me know as soon as possible so I can open the spot for someone else.

See you tomorrow!

{{yourName}}`,
    notes: "Send the day before the session.",
  },
  {
    name: "Post-Session Check-In (Same Day)",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "How are you feeling after today's session?",
    body: `Hi {{firstName}},

Thank you so much for showing up and doing the work today — it was a honour to hold space for you.

Breathwork can continue working in your body and mind for the next 24–72 hours. Here are a few suggestions:
- Drink plenty of water
- Rest if you feel tired
- Journal anything that came up for you
- Be gentle with yourself

I'd love to hear how you're feeling — just hit reply and let me know. Your feedback helps me tailor future sessions to serve you better.

Looking forward to hearing from you.

With gratitude,
{{yourName}}`,
    notes: "Send within a few hours of the session ending.",
  },
  {
    name: "72-Hour Rebooking Offer",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "Ready for your next session, {{firstName}}?",
    body: `Hi {{firstName}},

I hope the past few days have been good to you since our session together.

Many clients find the most powerful shifts happen when they practice consistently. I'd love to support you in building that momentum.

Here are a few ways we can continue:

🌿 Single Session — Book at your own pace
📦 Package — Save when you commit to a journey (ask me about current options)
🏢 Studio Group — Join an upcoming group session for a shared experience

If you're ready to book your next session, you can do so here: {{bookingLink}}

If you have any questions or want to chat about what's right for you, just reply to this email.

Looking forward to our next session together.

{{yourName}}`,
    notes: "Send 72 hours after session. Personalize the package section if relevant.",
  },
  {
    name: "Package / Offer Proposal",
    category: "Offer",
    channel: "Email",
    linkedTo: "Client",
    subject: "A personalised offer for you, {{firstName}}",
    body: `Hi {{firstName}},

Based on our work together, I wanted to reach out with a personalised offer I think would be a great fit for where you are right now.

{{offerDetails}}

This offer is available until {{offerExpiry}}.

Here's what's included:
- {{packageItem1}}
- {{packageItem2}}
- {{packageItem3}}

Investment: {{offerPrice}}

If you have questions or want to talk it through, I'm happy to jump on a quick call. Just reply to this email or book a call here: {{bookingLink}}

I believe in this work and I believe in your capacity to transform. I'd love to support you further.

Warmly,
{{yourName}}`,
    notes: "Personalise the offerDetails and package items before sending.",
  },
  {
    name: "New Client Welcome",
    category: "Session",
    channel: "Email",
    linkedTo: "Client",
    subject: "Welcome to Simply Breathe — so glad you're here",
    body: `Hi {{firstName}},

Welcome! I'm so glad you found your way here.

Simply Breathe is a space for you to slow down, reconnect with your breath, and access the deep healing and clarity that lives inside you. Whether you're here to manage stress, process emotions, or simply explore — you're in the right place.

Here's what to expect as a new client:
- Your first session is about building trust and finding your rhythm
- There's no right or wrong way to breathe — just show up as you are
- I'll guide you through everything; you just need to follow the breath

Your first session is booked for {{sessionDate}} at {{sessionTime}}.
📍 Location / Link: {{sessionLink}}

If you have any questions before we meet, please don't hesitate to reach out. I read every reply personally.

Looking forward to breathing with you soon.

With warmth,
{{yourName}}`,
    notes: "Send to brand new clients after their first booking.",
  },
  {
    name: "Studio Partner — Initial Outreach",
    category: "B2B Outreach",
    channel: "Email",
    linkedTo: "Studio Partner",
    subject: "Partnering to bring transformative breathwork to {{studioName}}",
    body: `Hi {{contactName}},

My name is {{yourName}} and I run Simply Breathe — a breathwork practice focused on helping people manage stress, process emotions, and access deep physical and mental renewal.

I've been following {{studioName}} and I think your community would genuinely benefit from what we offer. Breathwork is a natural complement to yoga, mindfulness, and wellness practices, and it tends to attract exactly the kind of client your studio already serves.

I'd love to explore hosting a session at your studio on a revenue-share basis — low risk for you, high value for your members.

Here's a quick overview of what a partnership looks like:
- I bring everything needed to run the session
- We split revenue based on attendance
- Your community gets an experience they'll talk about

Would you be open to a short call this week to see if it's a fit? I'm flexible on timing.

Looking forward to connecting.

{{yourName}}`,
    notes: "First outreach to a potential studio partner.",
  },
  {
    name: "Studio Partner — Follow-Up After No Reply",
    category: "B2B Outreach",
    channel: "Email",
    linkedTo: "Studio Partner",
    subject: "Following up — breathwork at {{studioName}}",
    body: `Hi {{contactName}},

I wanted to follow up on my previous email about bringing breathwork sessions to {{studioName}}.

I know things get busy, so I'll keep this short — I genuinely believe your community would love this experience, and I'd love to make it easy for you to say yes.

If now isn't the right time, no problem at all — just let me know and I'll check back in a few months. If you're curious, I'm happy to answer any questions or send over more details.

Either way, thanks for the work you do at {{studioName}}.

{{yourName}}`,
    notes: "Send 5–7 days after no reply to the initial outreach.",
  },
  {
    name: "Testimonial Request",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "Would you share your experience, {{firstName}}?",
    body: `Hi {{firstName}},

I hope you're continuing to feel the effects of our work together.

I have a small favour to ask. If your experience with Simply Breathe has meant something to you, I'd be so grateful if you'd share a short testimonial. It helps other people who are searching for this kind of support find their way here.

You could share:
- What you were feeling before your session
- What shifted or what you noticed during / after
- What you'd say to someone thinking about trying breathwork

You can reply directly to this email, or if it's easier, write a quick Google review here: {{reviewLink}}

Even just two or three sentences would mean a lot. Thank you for trusting me with your journey.

With gratitude,
{{yourName}}`,
    notes: "Send 1–2 weeks after a completed session or package.",
  },
  {
    name: "Re-Engagement (Lapsed Client)",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "Checking in — how have you been, {{firstName}}?",
    body: `Hi {{firstName}},

It's been a while since we last connected and I've been thinking about you.

Life gets full, and it's easy to let the practices that support us slip. I just wanted to reach out and say — there's no judgment here. The breath is always waiting for you when you're ready.

If you're feeling the pull to reconnect — whether it's stress, a transition you're navigating, or just a desire to feel more like yourself — I'd love to hold space for you again.

I have a few spots open over the next couple of weeks. If you'd like to book, you can do so here: {{bookingLink}}

Or if you just want to chat about where you're at, hit reply. I read every message personally.

Either way, I hope you're well.

Warmly,
{{yourName}}`,
    notes: "For clients who haven't booked in 60+ days. Personalise as needed.",
  },
];

export const STARTER_CONTENT = [
  { name: "Maya's burnout-to-calm transformation", category: "Client transformation", status: "Published", platform: "Instagram", scheduledDate: "2026-06-02", datePosted: "2026-06-02", body: "3 months ago Maya could barely slow down. Last night she stayed in savasana for 10 minutes. That's the work. ✨ #breathwork #transformation", cta: "DM me", reused: false, reach: 1840, likes: 312, comments: 28, shares: 18, saves: 41, leads: 3, booked: 1, revenue: 35, notes: "Best organic reach in June" },
  { name: "What is box breathing? (60s explainer)", category: "Breathwork education", status: "Published", platform: "TikTok", scheduledDate: "2026-06-05", datePosted: "2026-06-05", body: "4 seconds in. Hold 4. Out 4. Hold 4. Your nervous system NEEDS this. Try it right now. #breathwork #nervous system", cta: "Save this", reused: false, reach: 8400, likes: 920, comments: 62, shares: 310, saves: 205, leads: 5, booked: 2, revenue: 70, notes: "Went semi-viral. Repurpose to IG Reel" },
  { name: "Client testimonial — Sam Rivera", category: "Testimonials", status: "Published", platform: "Instagram", scheduledDate: "2026-06-09", datePosted: "2026-06-09", body: "\"I didn't know I was holding so much until it started to move.\" — Sam after her first session 🙏 Spots available — link in bio.", cta: "Book a session", reused: false, reach: 1620, likes: 242, comments: 36, shares: 24, saves: 58, leads: 2, booked: 1, revenue: 35, notes: "High save rate — strong social proof" },
  { name: "Why I started Simply Breathe (founder story)", category: "Founder story", status: "Published", platform: "Instagram", scheduledDate: "2026-06-11", datePosted: "2026-06-11", body: "The moment I realized I hadn't taken a full breath in 3 years was the moment everything changed. Here's why I do this work...", cta: "Comment below", reused: false, reach: 2100, likes: 418, comments: 52, shares: 30, saves: 22, leads: 6, booked: 2, revenue: 70, notes: "Highest engagement this month" },
  { name: "3 signs your nervous system needs a reset", category: "Nervous system regulation", status: "Published", platform: "TikTok", scheduledDate: "2026-06-12", datePosted: "2026-06-12", body: "1. You wake up already exhausted. 2. You hold your breath when stressed. 3. You can't turn your mind off at night. Sound familiar? Here's what to do.", cta: "Save this", reused: false, reach: 5200, likes: 610, comments: 48, shares: 190, saves: 310, leads: 4, booked: 1, revenue: 35, notes: "Repurpose to IG carousel" },
  { name: "Monthly newsletter: breath + sleep connection", category: "Breathwork education", status: "Published", platform: "Email", scheduledDate: "2026-06-10", datePosted: "2026-06-10", body: "How breathwork activates the parasympathetic nervous system and why that changes sleep quality. This month's deep dive...", cta: "Book a session", reused: false, reach: 340, likes: 0, comments: 0, shares: 0, saves: 0, leads: 1, booked: 1, revenue: 35, notes: "Open rate 42%. Strong CTA click" },
  { name: "Behind the scenes: how I set up a breathwork room", category: "Behind the scenes", status: "Draft", platform: "Instagram", scheduledDate: "2026-06-25", datePosted: "", body: "The mats, the diffuser, the lighting — here's everything I bring to make the space feel safe and sacred for every session.", cta: "Comment below", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, leads: 0, booked: 0, revenue: 0, notes: "Film before next studio session" },
  { name: "Is breathwork safe during pregnancy? (FAQ)", category: "FAQs", status: "Scheduled", platform: "Instagram", scheduledDate: "2026-06-27", datePosted: "", body: "Short answer: a modified practice is generally fine. Here's what to know before booking and what I adapt for expectant mamas.", cta: "DM me", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, leads: 0, booked: 0, revenue: 0, notes: "Evergreen content — schedule quarterly" },
  { name: "What to expect at your first session", category: "Breathwork education", status: "Scheduled", platform: "Instagram", scheduledDate: "2026-06-30", datePosted: "", body: "Nervous about your first breathwork session? Here's exactly what happens — from the opening circle to savasana. No experience needed.", cta: "Book a session", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, leads: 0, booked: 0, revenue: 0, notes: "Pin this post — great for link in bio" },
  { name: "Upcoming Sunday virtual session invite", category: "Upcoming sessions", status: "Idea", platform: "Instagram", scheduledDate: "", datePosted: "", body: "", cta: "Link in bio", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, leads: 0, booked: 0, revenue: 0, notes: "Draft copy once session date is confirmed" },
  { name: "What happens to your body during breathwork", category: "Nervous system regulation", status: "Idea", platform: "TikTok", scheduledDate: "", datePosted: "", body: "", cta: "Save this", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, leads: 0, booked: 0, revenue: 0, notes: "Hook idea: 'Your body already knows how to heal — it just needs permission to breathe'" },
  { name: "Client win — anxiety to clarity in 45 min", category: "Client transformation", status: "Idea", platform: "Instagram", scheduledDate: "", datePosted: "", body: "", cta: "Book a session", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, leads: 0, booked: 0, revenue: 0, notes: "Follow up with client for permission before drafting" },
];

export function TemplateLibraryView({ data, setData, onOpen, currentUser, query }) {
  const onUpdate = (db, id, fn) => setData(d => ({ ...d, [db]: (d[db] || []).map(r => r.id === id ? fn(r) : r) }));
  const [catFilter, setCatFilter] = useState("All");
  const [chanFilter, setChanFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null); // { template, vars, recipient, recipientSearch }
  const [emailCopied, setEmailCopied]   = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);
  const [emailError, setEmailError]     = useState("");
  const [emailBodyOverride, setEmailBodyOverride] = useState(null); // user edits to the body before send

  const templates  = data.templates  || [];
  const clients    = data.clients    || [];
  const partners   = data.partners   || [];

  const matchesText = (t, term) => {
    const q = term.toLowerCase();
    return (t.name || "").toLowerCase().includes(q)
      || (t.body || "").toLowerCase().includes(q)
      || (t.subject || "").toLowerCase().includes(q);
  };
  const filtered = templates.filter(t => {
    if (catFilter !== "All" && t.category !== catFilter) return false;
    if (chanFilter !== "All" && t.channel !== chanFilter) return false;
    if (search.trim() && !matchesText(t, search.trim())) return false;
    if ((query || "").trim() && !matchesText(t, query.trim())) return false;
    return true;
  });

  const copyTemplate = (t) => {
    const full = (t.subject ? `Subject: ${t.subject}\n\n` : "") + t.body;
    navigator.clipboard?.writeText(full).catch(() => {});
    setCopied(t.id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Extract unique {{variable}} tokens from body + subject
  const extractVars = (t) => {
    const matches = [...(t.subject || "").matchAll(/\{\{([^}]+)\}\}/g),
                     ...(t.body   || "").matchAll(/\{\{([^}]+)\}\}/g)];
    return [...new Set(matches.map(m => m[1].trim()))];
  };

  // Map a recipient (client or partner) + current user → variable values
  // Returns { vars, autoFilledKeys } — autoFilledKeys tracks which were mapped from data
  const autoFillVars = (varKeys, recipient, type) => {
    const vals = {};
    const filled = new Set();
    const yourFirstName = (currentUser?.name || "").split(" ")[0] || "";

    const set = (k, v) => { vals[k] = v; filled.add(k); };

    varKeys.forEach(k => {
      const lk = k.toLowerCase();
      if (lk === "yourname") { set(k, yourFirstName); return; }

      if (type === "client") {
        const firstName = (recipient.name || "").split(" ")[0];
        if (lk === "clientname")       { set(k, cleanName(recipient.name || "")); return; }
        if (lk === "firstname")        { set(k, firstName); return; }
        if (lk === "email")            { set(k, recipient.email || ""); return; }
        if (lk === "phone")            { set(k, recipient.phone || ""); return; }
      }
      if (type === "partner") {
        if (lk === "studioname")       { set(k, recipient.name || ""); return; }
        if (lk === "contactname")      { set(k, recipient.contact || ""); return; }
        if (lk === "email")            { set(k, recipient.email || ""); return; }
        if (lk === "phone")            { set(k, recipient.phone || ""); return; }
        if (lk === "location")         { set(k, recipient.location || ""); return; }
        if (lk === "avgattendance" || lk === "avgattendan") { set(k, recipient.avgAttendance != null ? String(recipient.avgAttendance) : ""); return; }
        if (lk === "lastcontactdate")  { set(k, recipient.lastTouch ? fmtDate(recipient.lastTouch) : ""); return; }
        if (lk === "sessionspermonth") { set(k, recipient.sessionsPerMonth != null ? String(recipient.sessionsPerMonth) : ""); return; }
        if (lk === "revsplit")         { set(k, recipient.studioSharePct ? `${recipient.studioSharePct}% to studio` : (recipient.revShare || "")); return; }
        if (lk === "referencestudio")  { set(k, recipient.name || ""); return; }
      }
      vals[k] = ""; // not auto-fillable — manual entry
    });
    return { vars: vals, autoFilledKeys: filled };
  };

  const openEmailPreview = (t) => {
    const varKeys = extractVars(t);
    const vars = {};
    varKeys.forEach(k => { vars[k] = ""; });
    setEmailPreview({ template: t, vars, autoFilledKeys: new Set(), recipient: null, recipientSearch: "" });
    setEmailCopied(false);
    setEmailBodyOverride(null);
  };

  const selectRecipient = (recipient, type) => {
    if (!emailPreview) return;
    const varKeys = extractVars(emailPreview.template);
    const { vars, autoFilledKeys } = autoFillVars(varKeys, recipient, type);
    setEmailPreview(prev => ({ ...prev, recipient: { ...recipient, _type: type }, vars, autoFilledKeys, recipientSearch: cleanName(recipient.name || "") }));
    setEmailBodyOverride(null);
  };

  // Replace {{var}} tokens with filled values (highlight unfilled placeholders)
  const applyVars = (text, vars) =>
    (text || "").replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] || `{{${k.trim()}}}`);

  const emailPopulatedBody    = emailPreview ? applyVars(emailPreview.template.body, emailPreview.vars) : "";
  const emailPopulatedSubject = emailPreview ? applyVars(emailPreview.template.subject || "", emailPreview.vars) : "";

  // Recipient search results (clients + partners combined)
  const recipientResults = useMemo(() => {
    if (!emailPreview) return [];
    const q = (emailPreview.recipientSearch || "").toLowerCase().trim();
    if (!q) return [];
    const matchClients  = clients.filter(c => (c.name || "").toLowerCase().includes(q)).slice(0, 6).map(c => ({ ...c, _type: "client" }));
    const matchPartners = partners.filter(p => (p.name || "").toLowerCase().includes(q)).slice(0, 4).map(p => ({ ...p, _type: "partner" }));
    return [...matchClients, ...matchPartners];
  }, [emailPreview?.recipientSearch, clients, partners]);

  // Which vars need manual input — those NOT auto-filled from the recipient (stable, doesn't change as user types)
  const manualVars = emailPreview
    ? Object.keys(emailPreview.vars).filter(k => !emailPreview.autoFilledKeys?.has(k))
    : [];

  const copyEmailText = () => {
    const full = (emailPopulatedSubject ? `Subject: ${emailPopulatedSubject}\n\n` : "") + emailPopulatedBody;
    navigator.clipboard?.writeText(full).catch(() => {});
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  const sendEmail = async () => {
    if (!emailPreview?.recipient || emailSending) return;
    const recipientEmail = emailPreview.recipient.email;
    if (!recipientEmail) { setEmailError("Recipient has no email address on file."); return; }

    const finalSubject = emailPopulatedSubject || emailPreview.template.name;
    const finalBody = emailBodyOverride ?? emailPopulatedBody;
    const leftover = findUnreplacedTemplateTokens(finalSubject, finalBody);
    if (leftover.length) {
      setEmailError(unreplacedTokensMessage(leftover));
      return;
    }

    setEmailSending(true);
    setEmailError("");
    const tmpl  = emailPreview.template;
    const recip = emailPreview.recipient;
    const today = new Date().toISOString().slice(0, 10);
    const rName = recip._type === "partner" ? (recip.contact || recip.name || "") : cleanName(recip.name || "");
    const emailParams = {
      to: recipientEmail, recipientName: rName, recipientType: recip._type,
      subject: finalSubject, body: finalBody,
      templateId: tmpl.id, templateName: tmpl.name, category: tmpl.category || "",
    };
    try {
      const logEntry = await sendCrmEmail(emailParams);

      // ── Write to global email log (capped); slim reference to per-record history ──
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, logEntry) }));
      const slim3 = slimHistEntry(logEntry);
      if (recip._type === "partner") {
        onUpdate("partners", recip.id, p => ({ ...p, lastTouch: today, emailHistory: [...(p.emailHistory || []), slim3] }));
      } else if (recip._type === "client") {
        onUpdate("clients", recip.id, c => ({ ...c, emailHistory: [...(c.emailHistory || []), slim3] }));
        // If Post-Session or Operations template, also mark followUpSent on most-recent unactioned session for this client
        if (["Post-Session", "Operations"].includes(tmpl.category)) {
          const sessions = data.sessions || [];
          const regs = (data.registrations || []).filter(r => r.clientId === recip.id);
          const sessionIds = new Set(regs.map(r => r.sessionId));
          const target = sessions.find(s => sessionIds.has(s.id) && !s.followUpSent && s.status !== "Planned");
          if (target) onUpdate("sessions", target.id, s => ({ ...s, followUpSent: true }));
        }
      }

      setEmailSent(true);
      setTimeout(() => { setEmailSent(false); setEmailPreview(null); }, 2000);
    } catch (err) {
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, makeEmailFailEntry(emailParams, err)) }));
      setEmailError(err.message || "Failed to send. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  // Highlight {{variables}} in body preview
  const renderWithVars = (text, maxLen = 180) => {
    const snippet = text.slice(0, maxLen) + (text.length > maxLen ? "…" : "");
    const parts = snippet.split(/({{[^}]+}})/g);
    return parts.map((p, i) =>
      /^{{/.test(p)
        ? <span key={i} style={{ background: "#EEEAFF", color: "#3D2DA0", borderRadius: 3, padding: "0 3px", fontSize: "0.9em", fontWeight: 600 }}>{p}</span>
        : p
    );
  };

  const catCounts = {};
  templates.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Stats row */}
      <div className="sb-stats">
        <Stat label="Total templates"   value={templates.length}                             hint="ready to use" />
        <Stat label="Email"             value={templates.filter(t=>t.channel==="Email").length} hint="email templates" accent="#D9892B" />
        <Stat label="SMS"               value={templates.filter(t=>t.channel==="SMS").length}   hint="text message templates" accent="#4A8C6F" />
        <Stat label="Most used"         value={[...templates].sort((a,b)=>b.usageCount-a.usageCount)[0]?.name || "—"} hint="by usage count" />
      </div>

      {/* Filters */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div className="sb-search" style={{ minWidth: 180, flex: 1 }}>
          <Search size={14} color={C.ink3} />
          <input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Category tabs */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...TMPL_CATEGORY].map(cat => {
            const active = catFilter === cat;
            const color  = cat === "All" ? C.brand : TMPL_CATEGORY_COLOR[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding: "4px 11px", borderRadius: 20, border: "1px solid", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                borderColor: active ? color : C.line,
                background: active ? hexA(color, 0.12) : "transparent",
                color: active ? color : C.ink2,
              }}>{cat}{cat !== "All" && catCounts[cat] ? ` (${catCounts[cat]})` : ""}</button>
            );
          })}
        </div>
        {/* Channel tabs */}
        <div style={{ display: "flex", gap: 5 }}>
          {["All","Email","SMS","DM"].map(ch => {
            const active = chanFilter === ch;
            const color  = ch === "All" ? C.ink2 : TMPL_CHANNEL_COLOR[ch];
            return (
              <button key={ch} onClick={() => setChanFilter(ch)} style={{
                padding: "4px 11px", borderRadius: 20, border: "1px solid", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                borderColor: active ? color : C.line,
                background: active ? hexA(color, 0.12) : "transparent",
                color: active ? color : C.ink2,
              }}>{ch}</button>
            );
          })}
        </div>
      </div>

      {/* Email preview modal */}
      {emailPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailPreview(null); }}>
          <div style={{ background: C.surface, borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: 1050, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
              <Mail size={16} color="#2563EB" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{emailPreview.template.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 1 }}>Select a recipient to auto-populate the message</div>
              </div>
              <button onClick={() => setEmailPreview(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4, borderRadius: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, minHeight: 520 }}>

              {/* Recipient search */}
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Send to</div>
                <div style={{ position: "relative" }}>
                  <Search size={14} color={C.ink3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input
                    value={emailPreview.recipientSearch}
                    onChange={e => setEmailPreview(prev => ({ ...prev, recipientSearch: e.target.value, recipient: null }))}
                    placeholder="Search clients or studio partners…"
                    style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                {/* Dropdown results */}
                {recipientResults.length > 0 && !emailPreview.recipient && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10, marginTop: 4, overflow: "hidden" }}>
                    {recipientResults.map(r => (
                      <div key={r.id} onClick={() => selectRecipient(r, r._type)}
                        style={{ padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.lineSoft || C.line}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: r._type === "partner" ? hexA("#D9892B", 0.15) : hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {r._type === "partner" ? <Building2 size={15} color="#D9892B" /> : <Users size={15} color={C.brand} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{r._type === "partner" ? r.name : cleanName(r.name)}</div>
                          <div style={{ fontSize: 12, color: C.ink3 }}>{r._type === "partner" ? `Studio Partner · ${r.contact || ""}` : `Client · ${r.email || ""}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Selected recipient pill */}
                {emailPreview.recipient && (
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 7, background: emailPreview.recipient._type === "partner" ? hexA("#D9892B", 0.1) : hexA(C.brand, 0.1), border: `1px solid ${emailPreview.recipient._type === "partner" ? "#F6D9A8" : hexA(C.brand, 0.3)}`, borderRadius: 20, padding: "4px 12px 4px 8px" }}>
                    {emailPreview.recipient._type === "partner" ? <Building2 size={12} color="#D9892B" /> : <Users size={12} color={C.brand} />}
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                      {emailPreview.recipient._type === "partner"
                        ? (emailPreview.recipient.contact || emailPreview.recipient.name)
                        : cleanName(emailPreview.recipient.name)}
                    </span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>{emailPreview.recipient._type === "partner" ? "Studio Partner" : "Client"}</span>
                    <button onClick={() => setEmailPreview(prev => ({ ...prev, recipient: null, recipientSearch: "" }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, marginLeft: 2, lineHeight: 1 }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Manual fill — only vars that couldn't be auto-filled */}
              {emailPreview.recipient && manualVars.length > 0 && (
                <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#2563EB", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fill in remaining variables</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                    {manualVars.map(k => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#3D2DA0", marginBottom: 3 }}>{`{{${k}}}`}</label>
                        <input
                          value={emailPreview.vars[k]}
                          onChange={e => setEmailPreview(prev => ({ ...prev, vars: { ...prev.vars, [k]: e.target.value } }))}
                          placeholder={k}
                          style={{ width: "100%", padding: "6px 9px", borderRadius: 7, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: "#fff", boxSizing: "border-box" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Populated preview — editable */}
              {emailPreview.recipient && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Message — edit before sending</span>
                    {emailBodyOverride !== null && (
                      <button onClick={() => setEmailBodyOverride(null)} style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        Reset to template
                      </button>
                    )}
                  </div>
                  {emailPopulatedSubject && (
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink2, marginBottom: 8, padding: "7px 12px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
                      <span style={{ color: C.ink3 }}>Subject: </span>{emailPopulatedSubject}
                    </div>
                  )}
                  <textarea
                    value={emailBodyOverride ?? emailPopulatedBody}
                    onChange={e => setEmailBodyOverride(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 13, color: C.ink, lineHeight: 1.7, background: C.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.line}`, minHeight: 200, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              )}

              {/* No recipient yet — prompt */}
              {!emailPreview.recipient && !emailPreview.recipientSearch && (
                <div style={{ textAlign: "center", padding: "28px 0", color: C.ink3, fontSize: 13 }}>
                  <Users size={28} color={C.line} style={{ marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
                  Search above to select a client or studio partner
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.line}`, background: C.surfaceAlt }}>
              {emailError && (
                <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> {emailError}
                </div>
              )}
              {!emailPreview.recipient?.email && emailPreview.recipient && (
                <div style={{ fontSize: 12.5, color: "#D9892B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> This recipient has no email address on file — add one to their record first.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setEmailPreview(null); setEmailError(""); }} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Close</button>
                {emailPreview.recipient && (
                  <>
                    <button onClick={copyEmailText} style={{
                      padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: emailCopied ? hexA("#4A8C6F", 0.1) : "transparent", color: emailCopied ? "#4A8C6F" : C.ink2,
                      display: "flex", alignItems: "center", gap: 6, transition: "background .15s",
                    }}>
                      {emailCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                    </button>
                    <button onClick={sendEmail} disabled={emailSending || emailSent || !emailPreview.recipient?.email} style={{
                      padding: "8px 22px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: emailSending || emailSent || !emailPreview.recipient?.email ? "not-allowed" : "pointer",
                      background: emailSent ? "#4A8C6F" : emailSending ? C.ink3 : "#2563EB", color: "#fff",
                      display: "flex", alignItems: "center", gap: 6, transition: "background .15s", opacity: !emailPreview.recipient?.email ? 0.5 : 1,
                    }}>
                      {emailSent ? <><Check size={13} /> Sent!</> : emailSending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : <><Send size={13} /> Send Email</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Starter templates prompt */}
      {templates.length === 0 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#166534", marginBottom: 4 }}>No templates yet</div>
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
              Load 10 ready-to-use starter templates covering session confirmations, follow-ups, studio partner outreach, testimonial requests, and more.
            </div>
          </div>
          <button
            onClick={() => {
              const newTemplates = STARTER_TEMPLATES.map((t, i) => ({ ...t, id: uid("tmpl"), createdAt: new Date().toISOString(), notes: t.notes || "" }));
              setData(d => ({ ...d, templates: [...(d.templates || []), ...newTemplates] }));
            }}
            style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "10px 20px", cursor: "pointer", flexShrink: 0 }}>
            Load starter templates
          </button>
        </div>
      )}

      {/* Template grid */}
      {filtered.length === 0 && templates.length > 0 ? (
        <Empty pad>No templates match your filters.</Empty>
      ) : templates.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sb-grid2">
          {filtered.map(t => {
            const catColor = TMPL_CATEGORY_COLOR[t.category] || C.ink3;
            const chanColor = TMPL_CHANNEL_COLOR[t.channel] || C.ink3;
            const isCopied = copied === t.id;
            const vars = (t.variables || "").split(",").map(v => v.trim()).filter(Boolean);

            return (
              <div key={t.id} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                {/* Header */}
                <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, lineHeight: 1.3 }}>{t.name}</div>
                    </div>
                    <Tag color={chanColor} soft>{t.channel}</Tag>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <Tag color={catColor} soft>{t.category}</Tag>
                    {t.usageCount > 0 && (
                      <span style={{ fontSize: 10.5, color: C.ink3, fontWeight: 500, padding: "2px 6px" }}>
                        Used {t.usageCount}×
                      </span>
                    )}
                  </div>
                </div>

                {/* Body preview */}
                <div style={{ padding: "10px 14px", flex: 1 }}>
                  {t.subject && (
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>
                      Subject: <span style={{ color: C.ink }}>{t.subject}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {renderWithVars(t.body)}
                  </div>
                </div>

                {/* Variables */}
                {vars.length > 0 && (
                  <div style={{ padding: "6px 14px 8px", display: "flex", gap: 4, flexWrap: "wrap", borderTop: `1px solid ${C.lineSoft || C.line}` }}>
                    {vars.map(v => (
                      <span key={v} style={{ fontSize: 10, background: "#EEEAFF", color: "#3D2DA0", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{v}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ padding: "9px 12px", borderTop: `1px solid ${C.line}`, display: "flex", gap: 7, background: C.surfaceAlt }}>
                  <button onClick={() => copyTemplate(t)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
                    fontSize: 12.5, border: "none",
                    background: isCopied ? "#4A8C6F" : C.brand,
                    color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "background .15s",
                  }}>
                    {isCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                  <button onClick={() => openEmailPreview(t)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, background: "#EBF3FF",
                    border: `1px solid #BFDBFE`, color: "#2563EB",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <Mail size={12} /> Email
                  </button>
                  <button onClick={() => onOpen({ db: "templates", record: t })} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, background: "transparent",
                    border: `1px solid ${C.line}`, color: C.ink2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
