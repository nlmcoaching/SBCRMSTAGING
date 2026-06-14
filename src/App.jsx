import { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
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
const STAGE = ["Prospect", "Demo Completed", "Pilot Scheduled", "Active Weekly Partner", "Scaled Partner"];
const STAGE_COLOR = {
  "Prospect": "#9FB2CC", "Demo Completed": "#6FA8E8", "Pilot Scheduled": "#3F87DC",
  "Active Weekly Partner": "#2F6FD0", "Scaled Partner": "#13245C",
};
const FUTYPE = ["24h", "72h", "Referral", "Reactivation"];
const FUTYPE_COLOR = { "24h": "#3F87DC", "72h": "#2F6FD0", "Referral": "#D9892B", "Reactivation": "#9FB2CC" };
const SOURCE = ["Studio", "IG", "Referral", "Ads"];
const SOURCE_COLOR = { Studio: "#13245C", IG: "#2F6FD0", Referral: "#5FB0F2", Ads: "#D9892B" };
const PACKAGE = ["None", "Drop-in", "3-pack", "5-pack", "Membership"];
const REFERRAL = ["Low", "Medium", "High"];
const REFERRAL_COLOR = { Low: "#9FB2CC", Medium: "#3F87DC", High: "#D9892B" };
const OFFER_TYPE = ["Drop-in", "3-pack", "5-pack", "Membership"];
const OFFER_STATUS = ["Offered", "Accepted", "Declined"];
const OFFER_STATUS_COLOR = { Offered: "#5FB0F2", Accepted: "#2F6FD0", Declined: "#9FB2CC" };
const CONTENT_TYPE = ["Transformation", "Education", "Invite", "Testimonial"];
const PLATFORM = ["IG", "TikTok", "Email"];

/* ---------- Seed data (from the six source files, relations wired) ---------- */
const SEED = {
  partners: [
    { id: "sp1", name: "Sample - YogaSix Walnut Creek", location: "Walnut Creek, CA", contact: "Alyssa Tran", role: "Manager", email: "alyssa@example.com", phone: "555-0201", stage: "Active Weekly Partner", revShare: "70/30 split (us/studio)", avgAttendance: 14, sessionsPerMonth: 4, notes: "Thursday Reset is the anchor class; strong word of mouth" },
    { id: "sp2", name: "Sample - CorePower Lafayette", location: "Lafayette, CA", contact: "Mike Donnelly", role: "Owner", email: "mike@example.com", phone: "555-0202", stage: "Demo Completed", revShare: "Flat room fee $75", avgAttendance: 0, sessionsPerMonth: 0, notes: "Demo went well 6/3; waiting on pilot dates" },
    { id: "sp3", name: "Sample - The Still Point", location: "Pleasant Hill, CA", contact: "Renee Park", role: "Director", email: "renee@example.com", phone: "555-0203", stage: "Pilot Scheduled", revShare: "80/20 split (us/studio)", avgAttendance: 0, sessionsPerMonth: 0, notes: "4-week pilot starts July; Sunday evenings" },
    { id: "sp4", name: "Sample - Flow State Studio", location: "Concord, CA", contact: "Tara Iverson", role: "Owner", email: "tara@example.com", phone: "555-0204", stage: "Prospect", revShare: "TBD", avgAttendance: 0, sessionsPerMonth: 0, notes: "Warm intro from Dana; reach out week of 6/16" },
    { id: "sp5", name: "Sample - Lotus & Pine", location: "Danville, CA", contact: "Geoff Adams", role: "Manager", email: "geoff@example.com", phone: "555-0205", stage: "Scaled Partner", revShare: "60/40 split (us/studio)", avgAttendance: 18, sessionsPerMonth: 8, notes: "Two weekly slots plus monthly workshop; best earner" },
  ],
  clients: [
    { id: "c1", name: "Sample - Jordan Lee", phone: "555-0101", email: "jordan@example.com", source: "Studio", status: "Lead", firstSession: "", sessionsAttended: 0, lastSession: "", nextSession: "2026-06-12", packageType: "None", lifetimeValue: 0, notes: "Found us via YogaSix flyer; anxious about first session, wants calm intro", referral: "Low" },
    { id: "c2", name: "Sample - Maya Chen", phone: "555-0102", email: "maya@example.com", source: "IG", status: "Booked", firstSession: "", sessionsAttended: 0, lastSession: "", nextSession: "2026-06-14", packageType: "None", lifetimeValue: 0, notes: "DM'd after breathwork reel; dealing with work burnout", referral: "Medium" },
    { id: "c3", name: "Sample - Chris Okafor", phone: "555-0103", email: "chris@example.com", source: "Referral", status: "Attended 1x", firstSession: "2026-06-01", sessionsAttended: 1, lastSession: "2026-06-01", nextSession: "2026-06-15", packageType: "Drop-in", lifetimeValue: 35, notes: "Big emotional release in first session; referred by Maya", referral: "High" },
    { id: "c4", name: "Sample - Priya Nair", phone: "555-0104", email: "priya@example.com", source: "Ads", status: "Engaged (2-3x)", firstSession: "2026-05-10", sessionsAttended: 3, lastSession: "2026-06-07", nextSession: "2026-06-13", packageType: "3-pack", lifetimeValue: 105, notes: "Sleep issues improving; mentioned wanting partner to join", referral: "Medium" },
    { id: "c5", name: "Sample - Sam Rivera", phone: "555-0105", email: "sam@example.com", source: "Studio", status: "Member (4+)", firstSession: "2026-04-02", sessionsAttended: 9, lastSession: "2026-06-09", nextSession: "2026-06-16", packageType: "Membership", lifetimeValue: 540, notes: "Core regular; grief processing journey, very committed", referral: "High" },
    { id: "c6", name: "Sample - Dana Wolfe", phone: "555-0106", email: "dana@example.com", source: "Referral", status: "Advocate", firstSession: "2026-03-15", sessionsAttended: 12, lastSession: "2026-06-10", nextSession: "2026-06-17", packageType: "5-pack", lifetimeValue: 610, notes: "Has referred 3 friends; natural community builder", referral: "High" },
  ],
  sessions: [
    { id: "se1", name: "Sample - YogaSix Thursday Reset 6/4", studioId: "sp1", date: "2026-06-04", attendance: 13, revenue: 455, netRevenue: 318.5, conversion: 0.31, packagesSold: 2, referralsGenerated: 1, notes: "Sound bath close landed well; 2 three-packs sold at door" },
    { id: "se2", name: "Sample - YogaSix Thursday Reset 6/11", studioId: "sp1", date: "2026-06-11", attendance: 16, revenue: 560, netRevenue: 392, conversion: 0.38, packagesSold: 3, referralsGenerated: 2, notes: "Best turnout yet; Priya brought a friend" },
    { id: "se3", name: "Sample - Lotus & Pine Sunday Slow Down 6/7", studioId: "sp5", date: "2026-06-07", attendance: 19, revenue: 665, netRevenue: 399, conversion: 0.26, packagesSold: 2, referralsGenerated: 0, notes: "Room near capacity; pitch membership earlier next time" },
    { id: "se4", name: "Sample - Lotus & Pine New Moon Workshop 6/9", studioId: "sp5", date: "2026-06-09", attendance: 22, revenue: 1100, netRevenue: 660, conversion: 0.18, packagesSold: 1, referralsGenerated: 3, notes: "Workshop format converts slower but generates referrals" },
  ],
  offers: [
    { id: "o1", name: "Sample - Chris Okafor / 3-pack", clientId: "c3", offerType: "3-pack", price: 105, status: "Offered", dateOffered: "2026-06-01", closeDate: "" },
    { id: "o2", name: "Sample - Priya Nair / 3-pack", clientId: "c4", offerType: "3-pack", price: 105, status: "Accepted", dateOffered: "2026-05-10", closeDate: "2026-05-10" },
    { id: "o3", name: "Sample - Sam Rivera / Membership", clientId: "c5", offerType: "Membership", price: 120, status: "Accepted", dateOffered: "2026-04-20", closeDate: "2026-04-22" },
    { id: "o4", name: "Sample - Maya Chen / Drop-in", clientId: "c2", offerType: "Drop-in", price: 35, status: "Offered", dateOffered: "2026-06-10", closeDate: "" },
    { id: "o5", name: "Sample - Dana Wolfe / 5-pack", clientId: "c6", offerType: "5-pack", price: 160, status: "Accepted", dateOffered: "2026-05-28", closeDate: "2026-05-28" },
    { id: "o6", name: "Sample - Jordan Lee / Drop-in", clientId: "c1", offerType: "Drop-in", price: 35, status: "Declined", dateOffered: "2026-06-05", closeDate: "2026-06-08" },
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

  const sections = [
    { id: "today", label: "Simply Breathe OS", Icon: LayoutGrid },
    { id: "clients", label: "Clients", Icon: Users },
    { id: "partners", label: "Studio Partners", Icon: Building2 },
    { id: "sessions", label: "Sessions", Icon: CalendarDays },
    { id: "offers", label: "Offers & Sales", Icon: DollarSign },
    { id: "content", label: "Content & Referral", Icon: Megaphone },
    { id: "followups", label: "Follow-Ups", Icon: RefreshCw },
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
              const count = s.id === "today" ? null : (data[s.id] || []).length;
              return (
                <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                  style={{ background: active ? C.brandSoft : "transparent", color: active ? C.brandDeep : C.ink2, fontWeight: active ? 600 : 500 }}>
                  <s.Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
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
              : <Section section={section} data={data} derived={derived} today={today}
                  view={view} setView={setView} query={query} onOpen={setOpen} />}
          </div>
        </main>
      </div>

      {open && (
        <RecordDrawer db={open.db} record={open.record} data={data} derived={derived} today={today}
          onClose={() => setOpen(null)} onSave={(rec) => { saveRecord(open.db, rec); setOpen(null); }}
          onDelete={(id) => deleteRecord(open.db, id)} onOpenRelated={setOpen} />
      )}

      {importing && <ImportModal data={data} setData={setData} onClose={() => setImporting(false)} />}
    </div>
  );
}

/* ---------- New blank record per db ---------- */
function newRecord(db) {
  const base = { id: uid(db) };
  const m = {
    clients: { name: "", phone: "", email: "", source: "Studio", status: "Lead", firstSession: "", sessionsAttended: 0, lastSession: "", nextSession: "", packageType: "None", lifetimeValue: 0, notes: "", referral: "Low" },
    partners: { name: "", location: "", contact: "", role: "Manager", email: "", phone: "", stage: "Prospect", revShare: "", avgAttendance: 0, sessionsPerMonth: 0, notes: "" },
    sessions: { name: "", studioId: "", date: todayISO(), attendance: 0, revenue: 0, netRevenue: 0, conversion: 0, packagesSold: 0, referralsGenerated: 0, notes: "" },
    offers: { name: "", clientId: "", offerType: "Drop-in", price: 0, status: "Offered", dateOffered: todayISO(), closeDate: "" },
    content: { name: "", type: "Education", platform: "IG", datePosted: todayISO(), engagement: 0, leads: 0, booked: 0 },
    followups: { name: "", clientId: "", stage: "Lead", lastContact: todayISO(), futype: "24h", nextAction: "", outcome: "" },
  };
  return { ...base, ...m[db] };
}

/* ============================================================
   TODAY DASHBOARD
   ============================================================ */
function Today({ data, derived, today, onOpen, onGo }) {
  const due = data.followups
    .filter((f) => onOrBefore(f.nextAction, today) && !f.outcome)
    .sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || ""));
  const sessionsToday = data.sessions.filter((s) => s.date === today);
  const upcoming = data.sessions
    .filter((s) => s.date > today)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const leads = data.clients.filter((c) => c.status === "Lead");
  const openOffers = data.offers.filter((o) => o.status === "Offered");

  const mtdSessions = data.sessions.filter((s) => sameMonth(s.date, today)).reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const mtdOffers = data.offers.filter((o) => o.status === "Accepted" && sameMonth(o.closeDate, today)).reduce((a, o) => a + (Number(o.price) || 0), 0);
  const activeMembers = data.clients.filter((c) => c.status === "Member (4+)" || c.status === "Advocate").length;

  const d = new Date();
  const greeting = d.getHours() < 12 ? "Good morning" : d.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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

      <div className="sb-stats">
        <Stat label="Revenue this month" value={money(mtdSessions + mtdOffers)} hint="sessions + offers closed" />
        <Stat label="Follow-ups due" value={due.length} hint="today & overdue" accent={due.length ? C.gold : C.brand} />
        <Stat label="Open offers" value={openOffers.length} hint="awaiting a yes" />
        <Stat label="Active members" value={activeMembers} hint="Member & Advocate" />
      </div>

      <div className="sb-grid2">
        <Panel title="Follow-ups due" badge={due.length} onAll={() => onGo("followups")}>
          {due.length === 0 ? <Empty>All caught up. Nothing waiting on you.</Empty> :
            due.map((f) => (
              <Row key={f.id} onClick={() => onOpen({ db: "followups", record: f })}>
                <Dot color={FUTYPE_COLOR[f.futype]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-rowtitle">{cleanName(f.name)}</div>
                  <div className="sb-rowsub">{derived.clientName[f.clientId] ? clientShort(derived.clientName[f.clientId]) : "—"} · {f.futype}</div>
                </div>
                <DateChip iso={f.nextAction} today={today} />
              </Row>
            ))}
        </Panel>

        <Panel title="Today's sessions" badge={sessionsToday.length} onAll={() => onGo("sessions")}>
          {sessionsToday.length > 0 ? sessionsToday.map((s) => (
            <Row key={s.id} onClick={() => onOpen({ db: "sessions", record: s })}>
              <Dot color={C.brand} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sb-rowtitle">{cleanName(s.name)}</div>
                <div className="sb-rowsub">{clientShort(derived.partnerName[s.studioId] || "")}</div>
              </div>
              <span className="sb-rowval">{s.attendance} in room</span>
            </Row>
          )) : (
            <>
              <Empty>No sessions on the schedule today.</Empty>
              {upcoming.length > 0 && <div className="sb-mininote">Next up</div>}
              {upcoming.map((s) => (
                <Row key={s.id} onClick={() => onOpen({ db: "sessions", record: s })}>
                  <Dot color={C.ink3} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sb-rowtitle">{cleanName(s.name)}</div>
                    <div className="sb-rowsub">{clientShort(derived.partnerName[s.studioId] || "")}</div>
                  </div>
                  <DateChip iso={s.date} today={today} />
                </Row>
              ))}
            </>
          )}
        </Panel>

        <Panel title="Leads to convert" badge={leads.length} onAll={() => onGo("clients")}>
          {leads.length === 0 ? <Empty>No open leads right now.</Empty> :
            leads.map((c) => (
              <Row key={c.id} onClick={() => onOpen({ db: "clients", record: c })}>
                <Dot color={STATUS_COLOR[c.status]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-rowtitle">{cleanName(c.name)}</div>
                  <div className="sb-rowsub">{c.source} · {c.referral} referral potential</div>
                </div>
                {c.nextSession && <DateChip iso={c.nextSession} today={today} />}
              </Row>
            ))}
        </Panel>

        <Panel title="Open offers" badge={openOffers.length} onAll={() => onGo("offers")}>
          {openOffers.length === 0 ? <Empty>No offers waiting on a decision.</Empty> :
            openOffers.sort((a, b) => (a.dateOffered || "").localeCompare(b.dateOffered || "")).map((o) => (
              <Row key={o.id} onClick={() => onOpen({ db: "offers", record: o })}>
                <Dot color={OFFER_STATUS_COLOR[o.status]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="sb-rowtitle">{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                  <div className="sb-rowsub">{o.offerType} · offered {fmtDate(o.dateOffered)}</div>
                </div>
                <span className="sb-rowval">{money(o.price)}</span>
              </Row>
            ))}
        </Panel>
      </div>

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
        : v.layout === "calendar"
        ? <CalendarView rows={processed.rows} today={today} derived={derived} onOpen={(r) => onOpen({ db: section, record: r })} />
        : <TableView columns={v.columns} rows={processed.rows} footer={processed.footer} onOpen={(r) => onOpen({ db: section, record: r })} ctx={{ data, derived, today }} />}
    </div>
  );
}

/* ---------- View configs ---------- */
const col = (key, label, render, opts = {}) => ({ key, label, render, ...opts });

const clientCell = {
  name: (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>,
  status: (r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>,
};

const VIEWS = {
  clients: {
    views: [
      { name: "Pipeline", layout: "board", card: ["nextSession", "packageType", "referral"],
        run: (rows) => ({ groups: STATUS.map((s) => ({ key: s, label: s, color: STATUS_COLOR[s], cards: rows.filter((r) => r.status === s) })) }) },
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
          col("packageType", "Package", (r) => r.packageType),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "Lifetime value", (r) => <strong>{money(r.lifetimeValue)}</strong>, { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter((r) => Number(r.lifetimeValue) > 0).sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
      { name: "All clients", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("source", "Source", (r) => r.source),
          col("packageType", "Package", (r) => r.packageType),
          col("referral", "Referral", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("lifetimeValue", "LTV", (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows }) },
    ],
  },
  partners: {
    views: [
      { name: "Pipeline", layout: "board", card: ["location", "contact", "stage"],
        run: (rows) => ({ groups: STAGE.map((s) => ({ key: s, label: s, color: STAGE_COLOR[s], cards: rows.filter((r) => r.stage === s) })) }) },
      { name: "Active partners", layout: "table",
        columns: partnerCols(),
        run: (rows) => ({ rows: rows.filter((r) => r.stage === "Active Weekly Partner" || r.stage === "Scaled Partner") }) },
      { name: "Revenue-producing", layout: "table",
        columns: partnerCols(),
        run: (rows) => ({ rows: rows.filter((r) => Number(r.sessionsPerMonth) > 0).sort((a, b) => Number(b.sessionsPerMonth) - Number(a.sessionsPerMonth)) }) },
      { name: "All partners", layout: "table", columns: partnerCols(), run: (rows) => ({ rows }) },
    ],
  },
  sessions: {
    views: [
      { name: "Calendar", layout: "calendar", run: (rows) => ({ rows }) },
      { name: "Revenue leaderboard", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId", "Studio", (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("date", "Date", (r) => fmtDate(r.date)),
          col("revenue", "Revenue", (r) => money(r.revenue), { align: "right" }),
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
          col("packagesSold", "Packages", (r) => r.packagesSold, { align: "right" }),
          col("referralsGenerated", "Referrals", (r) => r.referralsGenerated, { align: "right" }),
          col("conversion", "Conversion", (r) => <Tag color={r.conversion >= 0.3 ? "#2F6FD0" : r.conversion >= 0.2 ? "#3F87DC" : "#9FB2CC"} soft>{pct(r.conversion)}</Tag>, { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => Number(b.conversion) - Number(a.conversion)) }) },
    ],
  },
  offers: {
    views: [
      { name: "Open offers", layout: "table",
        columns: offerCols(),
        run: (rows) => ({ rows: rows.filter((r) => r.status === "Offered").sort((a, b) => (a.dateOffered || "").localeCompare(b.dateOffered || "")) }) },
      { name: "Won this month", layout: "table",
        columns: offerCols(),
        run: (rows, c) => {
          const r = rows.filter((x) => x.status === "Accepted" && sameMonth(x.closeDate, c.today));
          return { rows: r, footer: { price: money(sum(r, "price")), label: "Closed this month" } };
        } },
      { name: "All offers", layout: "table", columns: offerCols(), run: (rows) => ({ rows }) },
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
    col("location", "Location", (r) => <span style={{ color: C.ink2 }}>{r.location}</span>),
    col("contact", "Contact", (r) => `${r.contact} · ${r.role}`),
    col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]}>{r.stage}</Tag>),
    col("avgAttendance", "Avg att.", (r) => r.avgAttendance, { align: "right" }),
    col("sessionsPerMonth", "Sess/mo", (r) => r.sessionsPerMonth, { align: "right" }),
  ];
}
function offerCols() {
  return [
    col("clientId", "Client", (r, c) => <span style={{ fontWeight: 600 }}>{clientShort(c.derived.clientName[r.clientId] || cleanName(r.name))}</span>),
    col("offerType", "Offer", (r) => r.offerType),
    col("price", "Price", (r) => money(r.price), { align: "right", sum: "price" }),
    col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("dateOffered", "Offered", (r) => fmtDate(r.dateOffered)),
    col("closeDate", "Closed", (r) => fmtDate(r.closeDate)),
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
  if (k === "nextSession" && r.nextSession) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextSession)}</MiniChip>;
  if (k === "nextAction" && r.nextAction) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextAction)}</MiniChip>;
  if (k === "packageType" && r.packageType && r.packageType !== "None") return <MiniChip key={k}>{r.packageType}</MiniChip>;
  if (k === "referral" && r.referral) return <MiniChip key={k} color={REFERRAL_COLOR[r.referral]}>{r.referral} referral</MiniChip>;
  if (k === "location" && r.location) return <MiniChip key={k}>{r.location}</MiniChip>;
  if (k === "contact" && r.contact) return <MiniChip key={k}>{r.contact}</MiniChip>;
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
    f("source", "Source", "select", { options: SOURCE }), f("referral", "Referral potential", "select", { options: REFERRAL }),
    f("phone", "Phone", "phone"), f("email", "Email", "email"),
    f("packageType", "Package type", "select", { options: PACKAGE }), f("sessionsAttended", "Sessions attended", "number"),
    f("firstSession", "First session", "date"), f("lastSession", "Last session", "date"),
    f("nextSession", "Next session", "date"), f("lifetimeValue", "Lifetime value", "currency"),
    f("notes", "Emotional notes", "textarea"),
  ],
  partners: [
    f("name", "Studio name", "text", { title: true }), f("stage", "Partnership stage", "select", { options: STAGE }),
    f("location", "Location", "text"), f("contact", "Contact name", "text"),
    f("role", "Role", "select", { options: ["Owner", "Manager", "Director"] }), f("email", "Email", "email"), f("phone", "Phone", "phone"),
    f("revShare", "Revenue share model", "text"), f("avgAttendance", "Avg attendance", "number"),
    f("sessionsPerMonth", "Sessions per month", "number"), f("notes", "Notes", "textarea"),
  ],
  sessions: [
    f("name", "Session name", "text", { title: true }), f("studioId", "Studio", "relation", { target: "partners" }),
    f("date", "Date", "date"), f("attendance", "Attendance count", "number"),
    f("revenue", "Revenue", "currency"), f("netRevenue", "Your net revenue", "currency"),
    f("conversion", "Conversion rate", "percent"), f("packagesSold", "Packages sold", "number"),
    f("referralsGenerated", "Referrals generated", "number"), f("notes", "Notes", "textarea"),
  ],
  offers: [
    f("name", "Offer", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("offerType", "Offer type", "select", { options: OFFER_TYPE }), f("price", "Price", "currency"),
    f("status", "Status", "select", { options: OFFER_STATUS }), f("dateOffered", "Date offered", "date"), f("closeDate", "Close date", "date"),
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

function RecordDrawer({ db, record, data, derived, today, onClose, onSave, onDelete, onOpenRelated }) {
  const [draft, setDraft] = useState(record);
  useEffect(() => setDraft(record), [record]);
  const fields = FIELDS[db];
  const titleField = fields.find((x) => x.title);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const isNew = !data[db].some((r) => r.id === record.id);

  // related records
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
      <div className="sb-drawer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sb-drawerhead">
          <span className="sb-eyebrow">{isNew ? "New" : "Edit"} · {sectionLabel(db)}</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="sb-drawerbody">
          <input className="sb-titleinput" value={draft[titleField.key] || ""} placeholder="Untitled"
            onChange={(e) => set(titleField.key, e.target.value)} />

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
        </div>

        <div className="sb-drawerfoot">
          {!isNew && <button className="sb-danger" onClick={() => onDelete(draft.id)}><Trash2 size={15} /> Delete</button>}
          <div style={{ flex: 1 }} />
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          <button className="sb-primary" onClick={() => onSave(draft)}>Save</button>
        </div>
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
