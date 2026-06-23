# Simply Breathe OS — User Guide

> **Version:** 9.2 (June 2026)
> **Your daily operating system for a thriving breathwork practice.**
> This guide is written for anyone using the CRM day-to-day — no technical background needed.

---

## Table of Contents

1. [What Is Simply Breathe OS?](#what-is-simply-breathe-os)
2. [Logging In](#logging-in)
3. [Finding Your Way Around](#finding-your-way-around)
4. [Your Daily Starting Point — Today](#your-daily-starting-point--today)
5. [Managing Your Clients](#managing-your-clients)
6. [Managing Studio Partners](#managing-studio-partners)
7. [Running Sessions](#running-sessions)
8. [Calendly Bookings](#calendly-bookings)
9. [Offers & Sales](#offers--sales)
10. [Follow-Up Engine](#follow-up-engine)
11. [Outreach Hub](#outreach-hub)
12. [Tracking Revenue](#tracking-revenue)
13. [Content Calendar](#content-calendar)
14. [Testimonial Library](#testimonial-library)
15. [Email & SMS Templates](#email--sms-templates)
16. [Referral Tracking](#referral-tracking)
17. [Workflows — Seeing the Big Picture](#workflows--seeing-the-big-picture)
18. [Tracking Expenses](#tracking-expenses)
19. [Admin Settings](#admin-settings)
20. [Your Profile](#your-profile)
21. [Logging Out](#logging-out)
22. [Tips for Daily Use](#tips-for-daily-use)
23. [Frequently Asked Questions](#frequently-asked-questions)

---

## What Is Simply Breathe OS?

Simply Breathe OS is your all-in-one business tool for running a breathwork practice. Think of it as your business brain — it keeps track of every client, every studio relationship, every session, every offer, and every dollar, so you don't have to hold all of that in your head.

It is built around two types of relationships you manage every day:

- **Personal Clients (B2C)** — Individuals who attend your sessions, buy packages, or work with you privately.
- **Studio Partners (B2B)** — Yoga studios, gyms, and wellness spaces that host your events.

Everything in the system connects back to these two lanes. The color coding and layout throughout the app reflect this split so you always know which side of your business you're working in.

---

## Logging In

When you open Simply Breathe OS, you'll see the login screen with the Simply Breathe heart-wave logo.

**Step 1 — Select your name**
If more than one person uses the system, you'll see a tile for each user. Tap or click your name.

**Step 2 — Enter your PIN**
Type your PIN in the box and press Enter (or tap the arrow button).

If your PIN is correct, you'll go straight to the **Today — Command Center** dashboard. This happens every time you log in, so your daily action list is always the first thing you see. If you forget your PIN, an Owner or Admin can reset it for you in User Management.

If you see **"Data integrity check failed"**, hard-refresh the page and try again — the app can usually repair missing table structure automatically. If it still fails, restore from a JSON backup (Admin → Storage & Backup → Download Backup).

> **Note:** Your PIN protects your data. Don't share it with others.

> **Stay logged in on refresh:** If you hit the browser refresh button, the app will restore your session automatically — you won't need to re-enter your PIN. It will also return you to the exact page you were on. This session is tied to the browser tab; opening a new tab or a new browser window will require PIN entry again.

> **Auto-lock:** The app locks itself after 15 minutes with no activity. Simply re-enter your PIN to continue. When the auto-lock fires (even if you were active earlier), the session is fully cleared — the next login returns you to the Command Center, not your previous page. This is intentional: the auto-lock resets your session as a security measure.

> **Security upgrade banner:** If you see a yellow banner saying "Security upgrade required", simply log in as usual — the app will automatically upgrade your account to the latest security standard in the background. You only need to do this once.

---

## Finding Your Way Around

### The Sidebar

The left sidebar is your main navigation. At the top:

| Section | What It's For |
|---|---|
| Command Center | Your daily dashboard and action list |
| Sessions | Every breathwork session you've run or planned |

**Studio Partners (B2B)**
Everything related to studios and business-to-business relationships.

| Section | What It's For |
|---|---|
| Studio Partners | Your full studio pipeline — from first contact to recurring partner |
| Outreach Hub | Your proactive outreach list for new studios and referral sources |

**Personal Clients (B2C)**
Everything related to individual clients and leads.

| Section | What It's For |
|---|---|
| Clients | All your individual clients and leads |
| Follow-Ups | Manual follow-up records |
| Follow-up Engine | Automated post-session follow-up sequences |

**Core — Operations**
System-wide tools that support everything else.

| Section | What It's For |
|---|---|
| Testimonials | Client testimonials and social proof |
| Referrals | Who's referring who and the value they generate |
| Offers & Sales | Packages and proposals you've made to clients |
| Revenue | Revenue tracking and attribution |
| Expenses | Business expense tracking and P&L |
| Workflows | A visual view of your five core business pipelines |
| Calendly Bookings | Bookings synced automatically from Calendly |
| Content Calendar | Your content calendar and social post planning |
| Templates | Pre-written email and SMS templates ready to use |
| Admin | System health, database info, and backup tools |
| ↳ User Management | Nested under Admin — add or manage system users |

> **Tip:** User Management lives inside the Admin section. Click **Admin** in the sidebar to expand it and reveal the User Management sub-item.

### The Header

At the top of every page you'll find:
- The name of the section you're in
- A **search bar** to filter records on that page
- A **New** button to add a new record (if you have edit access)
- A **bell icon** (blue) showing your alert count — click it to see all active alerts in a popup
- Your **profile avatar** in the top-right corner

### Opening a Record

Click any row in a table to open the full record in a **centered modal popup**. From there you can:
- Read all the details
- Edit any field
- Switch between tabs (e.g. Timeline, Checklist, Equipment)
- Save your changes or delete the record (if you have permission)
- Click anywhere outside the modal (on the dark backdrop) to close without saving

---

## Your Daily Starting Point — Today

**Navigate to:** Sidebar → Today

Start every working day here. The Today dashboard is designed to answer one question immediately:

> *"What do I need to do today to move the business forward?"*

### Stats Row

Four numbers at the top give you an instant health check:
- **Gross Revenue MTD** — Total gross session prices for the current month (virtual + studio, before any splits are deducted). Click to open Revenue → **This month**.
- **Referral Revenue** — Revenue that came from referrals
- **Active Clients** — Total number of clients in the system
- **Active Sequences** — Clients currently in a follow-up sequence

### B2C vs B2B Split

A side-by-side panel shows your two business lanes at a glance — **studio session booking prices** (B2B) vs **virtual session prices + packages** (B2C), plus pipeline value and active relationships.

### Pipeline Snapshot

Key business metrics (tiles appear in this order):
1. Operating profit MTD — net revenue minus expenses for the month
2. Expected 30-day revenue — open offers probability-weighted
3. Booked, not delivered — upcoming session value
4. Avg client value — average lifetime value of active clients
5. Avg session net revenue — average net per session
6. Partner conversion rate
7. Open offer pipeline
8. Studio partner pipeline
9. Offers awaiting response
10. Expenses MTD

> **Removed:** “Delivered, unpaid” is no longer shown.

### Smart Alerts

Alerts live in a **popup panel** accessible via the **blue bell icon** in the top-right header. A red badge shows the number of active (undismissed) alerts.

Examples of alerts:
- An offer is expiring in the next 3 days
- A session was completed but no follow-up was sent
- A session is coming up in 72 hours with low registration
- No outreach activity this week

Each alert shows a severity level and a **View** link to jump straight to the relevant record. Click the **× button** on any alert to dismiss it — dismissed alerts won't appear again (even after a page refresh). The badge count updates immediately.

### Next Best Actions

Your three most important actions for today, organized into three columns:

- **Revenue** — Follow up on expiring offers, chase unpaid sessions, re-engage clients who haven't rebooked
- **Relationship** — Thank referral sources, check in with studios, request testimonials
- **Operational** — Sessions happening today or tomorrow (auto-clear when the session **Virtual Setup** checklist is complete), missing waivers, setup checklists not started

These are ranked automatically based on urgency and due dates. **Relationship** actions open an email compose window when clicked — the person is pre-selected, you pick a message template from the dropdown, edit the subject and body if needed, then send. **Revenue** actions open the related record with a **Call** banner at the top showing the person's phone number (tap to dial on your phone). **Operational** actions open the related record as before. Use the **× button** on the right side of each action to dismiss it for the day — dismissed actions reset automatically at midnight.

For **virtual sessions today or tomorrow**, the action clears when the **Virtual Setup** section on the Session Checklist is fully ticked (Zoom audio/video tested + headset charged and tested) and no linked booking is marked unpaid. Other Pre-Session items (space, camera, playlist, etc.) are separate and do not block this action. Click **Save** after ticking items.

---

## Managing Your Clients

**Navigate to:** Sidebar → Clients

### Client List — Default Sort

The **All Clients** view is sorted **A–Z by client name** automatically when you open it. The table shows client name, email, phone, status, segment, referral potential, and lifetime value (LTV).

**LTV updates automatically** when Calendly bookings sync in — it adds up each booking’s **session price** (from the event type amount in Calendly), plus any revenue or accepted offers linked to that client. Click the refresh icon on Calendly Bookings if amounts or LTV look stale.

### Adding a New Client

1. Click **New** in the top-right of the header.
2. Fill in the fields — at minimum, add a name. Email and phone are optional but highly recommended.
3. Set their **Source** (how they found you) and **Type** (e.g. First-time attendee, Member, Advocate).
4. Add **Intent Tags** if relevant — these help you personalize your messaging (e.g. Anxiety, Burnout, Performance).
5. Click **Save**.

### Understanding Client Types

| Type | When to Use |
|---|---|
| First-time attendee | Just attended or just reached out for the first time |
| Repeat attendee | Has been to more than one session |
| Member | On an active package or recurring plan |
| Advocate | Refers others, shares posts, actively promotes you |
| High-value lead | Strong interest but hasn't bought yet |
| Past client – reactivate | Someone you worked with before who went quiet |

### Opening a Client Record

Click any client row to open the record. The main tab is called **Details** — it shows contact information, session history, and key metrics at the top (phone, email, sessions attended, first/last/next session, emotional notes, lifetime value), followed by status, type, source, and tags below.

### Sessions Attended Tab

Each client record has a **Sessions Attended** tab — a complete list of every session the client has registered for. For each session you'll see:
- Session name, date, time, and journey used
- **Amount** — the session price from their Calendly booking (same as Calendly Bookings → All Bookings)

A **Total Revenue** figure at the top shows the sum of session prices across all their bookings (excluding canceled and unpaid).

### The Client Timeline

Open any client record and click the **Timeline** tab. You'll see everything that has happened with this person in chronological order — sessions attended, offers made, payments received, follow-ups sent, referrals they've made, and testimonials given.

This is the single most important tab for staying on top of relationships. Before a follow-up call or message, check the timeline so you know exactly where things stand.

### Setting a Next Follow-Up

Every client should have a **Next Follow-Up** date. When this date arrives, the client will appear in your Next Best Actions on the dashboard. Set this date any time you have a conversation or interaction.

### Relationship Status

Use the **Relationship Status** field to track where each person is in your world:

| Status | Meaning |
|---|---|
| New lead | Just came in, not yet engaged |
| Active | Engaged, attending, or recently purchased |
| Warm | Interested but not yet committed |
| VIP | High-value, long-term, or high-touch relationship |
| Advocate | Actively sending you referrals |
| Inactive | No activity in a while |
| Lost | Unsubscribed, disengaged, or chose not to work with you |

---

## Managing Studio Partners

**Navigate to:** Sidebar → Studio Partners

### The Studio Pipeline

Every studio goes through a set of stages from first awareness to long-term partnership. You can see all your studios organized by stage on the **Pipeline** view.

The stages are:

> Target Identified → Researched → Initial Outreach Sent → Follow-Up Needed → Discovery Call Booked → Demo Session Offered → Demo Completed → Pilot Proposed → Agreement Sent → Agreement Signed → First Session Scheduled → Pilot Completed → **Recurring Partner**

Move a studio to the next stage by opening their record and updating the **Stage** field.

### Adding a New Studio

1. Click **New**.
2. Enter the studio name, owner/manager name, contact details, and location.
3. Set the **Stage** to where you are in the relationship.
4. Add your **Revenue Potential** estimate and **Probability** of closing.
5. Note any **Insurance Requirements** or **Promotion Commitments** upfront.
6. Click **Save**.

### The Studio Launch Checklist

Once you've signed a studio, open their record and go to the **Checklist** tab. You'll find a 4-phase checklist that walks you through everything needed to launch successfully.

**Phase 1 — Before Signing** (5 items)
Complete these before you send any agreement.

**Phase 2 — After Signing** (8 items)
Operational setup — booking page, QR code, flyers, payment flow.

**Phase 3 — Before the Event** (5 items)
Confirm registration, send reminder, pack equipment.

**Phase 4 — After the Event** (5 items)
Reconcile revenue, pay the studio, send follow-up, propose the next date.

Check items off as you complete them. The checklist shows overall progress and per-phase completion so nothing falls through the cracks.

### The Studio Timeline

Just like clients, every studio has a **Timeline** tab showing the full history of your relationship — calls, emails, sessions, agreements, revenue, and next steps.

### All Partners Tab

The **All Partners** tab (to the right of Revenue Forecast) gives you a complete alphabetical directory of every studio in the system. Each row shows:
- Studio name, address, contact name, phone, and email
- Revenue share percentage, contract status, and last touch date

Use this tab when you need to quickly look up a studio's contact details or export a full partner list.

### Partner Sessions Tab

Open any studio partner record and click the **Sessions** tab. You'll see every session you've run at that studio, with:
- Date, attendance count, and journey used
- **Gross Revenue · Studio Split · Net Revenue** per session
- A **total summary** row at the top showing cumulative gross, split, and net across all sessions

This is the tab to open when you're preparing a partner revenue report or deciding whether to continue with a studio.

### Active Partners — Default View

When you open Studio Partners, the **Active Partners** tab loads first (studios at Recurring Partner, First Session Scheduled, or Pilot Completed stage), sorted A–Z. This is your fastest path to the studios you're actively working with.

**Missing agreement alerts:** If an active partner does not have a PDF uploaded on their **Agreements** tab, you'll see:
1. A **critical alert** in the **Alerts bell** (next to your profile picture) — click the bell to see which studio(s) need an agreement and tap **View** to open their record.
2. A **red alert icon** next to that studio's name on the **Active Partners** tab. Hover over the icon to see: *"Please upload Studio Partner Agreement."*

To fix it, open the studio's record → **Agreements** tab → **Upload Agreement** (PDF).

### Studio Partner Agreements

Open any active studio partner and click the **Agreements** tab to upload their signed Studio Partner Agreement (PDF or Word). Keep this current for every active partner. **Uploads save automatically** — you do not need to click Save on the drawer for the file to stick.

**What you can upload:** PDF or Word only (`.pdf`, `.doc`, `.docx`), up to 5 MB. The app checks that each file is a real document — renamed or invalid files are rejected with an error message.

**Opening a file:** Click **Open** on any uploaded agreement. PDFs open in a new tab; Word files download to your computer.

If you open a partner record in view-only mode, you can still open existing agreements but cannot upload or remove files.

---

## Running Sessions

**Navigate to:** Sidebar → Sessions

### Creating a Session

1. Click **New**.
2. Set the **Date**, **Studio / Location**, and **Journey Used**.
3. Set the **Status** to **Planned** when you first create it.
4. Add **Capacity** so the system can calculate your registration rate.
5. Click **Save**.

### Updating a Session as It Progresses

Move the **Status** forward as things happen:

| Status | When to Set It |
|---|---|
| Planned | Session is created |
| Booking Open | You've opened registration |
| Promotion Active | You're actively promoting it |
| Almost Full | Less than 20% capacity remaining |
| Completed | The session happened |
| Follow-Up Pending | Session done, follow-up not yet sent |
| Closed Out | Follow-up sent, revenue reconciled |

### After a Session — What to Record

Once a session is complete, update:
- **Paid Attendees** and **Waivers Completed**
- **Gross Revenue**, **Studio Split**, and **Net Revenue**
- Check **Follow-Up Sent** once you've sent the follow-up
- Check **Breakthrough Noted** if a client had a powerful experience — this will create a reminder to request a testimonial

### Equipment Checklist

Before every session, open the **Equipment** tab. You'll find a checklist organized into three phases:

- **Audio & Tech** — Headsets, backup headset, chargers, speaker, playlist downloaded, Wi-Fi confirmed
- **Room & Supplies** — Eye masks, mats/blankets, lighting, water, tissues, emergency contact process
- **Admin & Check-In** — Waiver QR code, check-in list, arrival time, integration script

Check items off before you leave for the venue. This ensures you never forget something important.

### Session Calendar View

The Sessions calendar shows one month at a time. Each session appears as a colored pill. On days with multiple sessions, pills are listed **earliest start time first**. The color tells you the session type at a glance — a **legend in the top-right corner** of the calendar explains it:

- **Purple pill — Studio session:** hover shows `Studio Name — Journey Name — x of x spots remaining`
  - The left edge of the pill turns **red** when only 3 or fewer spots remain
- **Blue pill — Virtual or Private session:** hover shows `Client Name — Journey Name`
  - Booking platform prefixes (e.g. "9D Breathwork Virtual - ") are automatically stripped

Click any pill to open that session's record drawer.

> **Note:** Studio sessions booked through Calendly are automatically linked to the correct studio partner by matching the studio name in the event name. If no matching partner exists, one is created automatically. The calendar also recognizes a studio booking by the studio name in the session name or address, so it shows the purple studio styling even if the studio link hasn't been saved yet. Any previously synced sessions without a studio link are corrected on the next sync.

### All Sessions Tab

The **All Sessions** tab shows every session as a flat list sorted by **when it was booked** (most recent bookings at the top). This lets you quickly see what's been scheduled recently. Columns:
- **Booked Date & Time** — when the first registration for that session was created
- **Session Date** — the actual date of the session
- Journey, Studio, Status, Registered, Capacity

### Session Details Tab

When you open a session record, the first tab is **Session Details**. The layout adapts based on session type:

**Virtual sessions** show in this order:
- Client name and email (from registration), with **session price** on the right
- Date, time, and duration on one row
- The Zoom / Join Link as a clickable card
- **Room Setup Status** and **Music/Headset Status** side-by-side on the same line (below the Zoom link)
- Session Notes, Breakthrough Noted, Journey Used, Status

**Studio sessions** show in this order:
- Date, time, and duration on one row
- Studio address (from Calendly)
- Studio contact card — name, role, email, and phone pulled live from the partner record
- **Registered Attendees** (automatically kept in sync with actual bookings — see below)
- Room Capacity
- **Room Setup Status** and **Music/Headset Status** side-by-side on the same line
- Session Notes, Breakthrough Noted, remaining fields

**Registered Attendees** on studio sessions updates automatically every time you open the session — it always reflects the real number of non-canceled bookings from the Bookings tab, so there's no need to update it manually.

**Studio event description:** Click the **ⓘ icon** next to the session name at the top of the drawer to expand the studio event description below the title. The full text loads from Calendly when you open the panel (replacing any short preview). Long descriptions scroll inside the panel — swipe or scroll to read the full text.

### Journey Description Popup (Virtual Sessions)

On virtual session cards in the sessions list, a small **ⓘ button** appears in the corner of the session name. Click it to see the full journey description for that session.

- The description comes from **Admin → Journey Descriptions**, where you can add and manage descriptions for each journey.
- The system is smart about matching: if the Calendly event is named something like "9D Breathwork Virtual - The Architect Journey", it will find a description called "The Architect Journey" automatically.
- If no description has been added yet, the popup will prompt you to add one in Admin → Journey Descriptions.
- This button only appears on **virtual sessions** — not on studio sessions.

### Bookings Tab — Download Participant List (Studio Sessions)

The **Bookings** tab on a studio session shows all registered attendees. At the top-right of the tab you'll find a **"Participant List"** button. Click it to generate a PDF showing:
- Session name, studio name, date, and time
- Full list of non-canceled registrants including name, email, phone, **amount**, booking status, waiver status, and payment status
- Color-coded waiver and payment columns so you can spot missing items at a glance

This is useful for handing to the studio ahead of the event or printing as a sign-in sheet. Cancelled bookings are automatically excluded.

> **Tip:** If your browser blocks the pop-up, look for a notification in the address bar and choose "Always allow pop-ups from this site."

### Session Checklist Tab

Both virtual and studio session cards have a single **Session Checklist** tab that combines equipment setup and the run checklist into one view. **Critical items appear at the top of each section** so the most important tasks are always visible first.

**Virtual session checklist** covers:
- **Session price** in the checklist header (from the linked Calendly booking)
- Pre-Session: camera, phone on DND, playlist, internet connection, zoom tested, headset, safety items, water nearby
- During Session: facilitation and safety items
- Post-Session: testimonials, follow-up, rebook offer, referrals, notes

**Studio session checklist** covers:
- Pack & Equipment: headsets, backup headset, chargers, extension cords, eye masks, mats
- Content & Tech: playlist, Wi-Fi, waiver QR code, check-in list
- Venue & Day-Of: arrival time, room lighting, water & tissues
- Pre-Session: room booking, capacity, **Technical room setup complete — music and headsets tested**, room setup, safety items
- Post-Session: attendance, revenue, studio split, testimonials, follow-up, notes

### Performance Tab — Download PDF (Studio Sessions)

On studio session records, the **Performance** tab includes a **"Download PDF"** button. Click it to generate a clean, shareable PDF showing:
- Session name, date, time, studio, and journey
- Key metrics (attendance, capacity utilization)
- Revenue breakdown: **Gross Revenue** and **Studio Split** (no internal net revenue figures)
- Session notes

This is designed to share with your studio partners as a post-event revenue summary. The PDF excludes post-session action checklists and any internal comparison data, keeping it professional and partner-appropriate.

> **Tip:** If nothing happens when you click Download PDF, check that your browser isn't blocking pop-ups for this site. You can allow pop-ups in your browser settings.

### Session Bookings Tab

When you open a session record and click the **Bookings** tab, you'll see everyone who has registered for that session via Calendly:
- **Studio sessions** show a badge like `2/15` (booked / capacity) — a quick view of how full the session is
- **Virtual sessions** show the booked count only
- **Amount on each card** — the session price for that booking (e.g. $55), matching Calendly Bookings. Amounts load automatically when you open the tab (from Calendly event type pricing).
- **Total session revenue** — summary at the top when bookings have amounts

- **Status badges** — booked, attended, canceled, rescheduled, no-show
- **Waiver warnings** — yellow warning if a waiver hasn't been signed yet
- **Payment status** — green checkmark for paid, red for unpaid
- **Contact details** — email, phone, Zoom link (for virtual sessions)
- **Health concerns** — shown in red if the client noted any concerns at booking
- **Arrow button** — jump straight to the client's record

---

## Calendly Bookings

**Navigate to:** Sidebar → Calendly Bookings

When a client books through your Calendly link, the CRM automatically:
1. Creates or updates their **client record** (matched by email address)
2. Creates or updates the **session record** for that event
3. **Creates a new Studio Partner** if the event is in-person and the studio isn't already in your system — no manual setup needed
4. Creates a **booking record** under Calendly Bookings with the **waiver pre-marked as signed** (since clients accept it during booking)
5. Queues **3 follow-up tasks** for that client (same-day confirmation, 24-hour follow-up, 72-hour rebooking offer)

### Staying in Sync

At the bottom of the sidebar you'll see a **Calendly sync status indicator**. The CRM syncs automatically every **5 minutes** in the background — no action needed.

Each sync also **pulls recent bookings directly from Calendly** (not just webhooks), so new bookings appear even if a webhook was missed while ngrok or the backend was offline.

On the **Calendly Bookings** page, click the **refresh icon** (↻) in the top bar to pull in new bookings right away instead of waiting for the next automatic sync.

The indicator shows:
- **Spinning icon + "Syncing Calendly…"** — sync is running
- **"3 records synced · Last sync 9:45 AM"** — new bookings were just imported
- **"Calendly up to date · Last sync 9:45 AM"** — sync ran, nothing new
- **"2 bookings pending…"** — bookings are queued and will be imported on the next cycle

**Hover over the indicator** to see the exact date and time bookings were last received from Calendly, plus how many were synced. The timestamp only updates when actual bookings come in — so if you hover and see a time, that's when real data last arrived, not just the last time the sync ran and found nothing.

### New Studio Partners from Calendly
When a booking arrives for a studio that isn't in your CRM yet, the system reads the Calendly event name (e.g. "Indiga Yoga - Walnut Creek, CA"), extracts the studio name and location, and creates a new Studio Partner record automatically. You can find and edit it under **Studio Partners** in the sidebar — fill in the contact details, revenue share, and other information when you're ready.

### Waivers
All bookings that come through Calendly are automatically marked as **waiver signed**, since clients accept your waiver during the booking process. The "Pending Waivers" view and waiver warning badges will only show for bookings you create manually.

### Calendly Bookings Views

| View | What it shows |
|---|---|
| All Bookings | Scrollable list of every registration (newest booking first). Columns: Calendly Amount, Client, Session, Session Date/Time, Status, Payment Status. **Click any row to expand** it to see full booking details: client email, session info, journey, location, intake answers, payment status, and booking date. The Waiver and Booked Amount columns have been removed. |
| Pending Waivers | Manually-created registrations without a signed waiver, newest session first |
| Unpaid | Clients who haven't paid, newest session first |
| Cancellations | Canceled and rescheduled bookings, newest session first |

### Session Descriptions from Calendly

When a booking arrives, the system automatically fetches the event type description from Calendly and stores it on the session record. This description powers the **ⓘ popup** on virtual session cards.

Payment amounts show the event type’s configured **session price** (Internal Note in Calendly). When someone books a paid session, **payment status** starts as **Pending verification** until Stripe confirms the charge (see the Stripe sidebar item).

> **Setup required:** Descriptions and session prices need a Calendly Personal Access Token. Stripe payment matching needs a Stripe webhook — ask your administrator to configure both (see Tracking Revenue).

### Booking Record Fields

Each booking record captures everything from the Calendly confirmation:
- When the booking was created (**Scheduled On**) and session date/time
- **Amount paid** — Stripe-verified amount once matched; **Expected price** is the Calendly session price until then
- Status (booked, attended, canceled, rescheduled, no-show)
- Waiver status (auto-signed for Calendly bookings) and payment status (`Pending verification` → `Paid` after Stripe match)
- Location type and Zoom link (for virtual sessions)
- Custom question answers: how they heard about you, health concerns, prior breathwork experience, referral source

---

## Offers & Sales

**Navigate to:** Sidebar → Offers

### Making a New Offer

1. Click **New**.
2. Enter the **Client** name and select an **Offer Type** (e.g. 3-pack, Studio pilot, Private session).
3. Set the **Amount**, **Date Offered**, and **Expiration Date**.
4. Set the **Status** to **Sent**.
5. Add a **Follow-Up Date** so the system reminds you when to check in.
6. Set a **Probability** — your honest estimate of whether this will close.
7. Click **Save**.

### Offer Statuses Explained

| Status | What It Means |
|---|---|
| Drafted | Written but not yet sent |
| Sent | Client has received the offer |
| Viewed | Client has opened or acknowledged it |
| Follow-Up Due | Your follow-up date has arrived |
| Accepted | Client said yes |
| Paid | Payment received |
| Declined | Client said no |
| Expired | Expiration date passed without response |

### Keeping Offers Moving

Check the **Expiring Soon** view regularly — it shows offers expiring within 7 days. The Smart Alerts on the dashboard will also flag any offer that's been sitting in "Sent" or "Viewed" for more than 5 days without movement.

When an offer is won, change the status to **Accepted**, then **Paid** once payment arrives. If it's lost, set **Declined** and fill in the **Reason Lost** — this data helps you understand patterns over time.

---

## Follow-Up Engine

**Navigate to:** Sidebar → Follow-Up Engine

This is one of the most valuable features in the system. After someone attends a session, there is a short window — usually 72 hours — when they are most emotionally open and most likely to buy. The Follow-Up Engine helps you protect that window.

### How It Works

When a session is completed, you can attach a follow-up sequence to any client who attended. The sequence creates a series of timed tasks:

| Timing | Action |
|---|---|
| Same day | Thank-you message, integration reminder, link to next session |
| 24 hours | Check-in message — ask how they're feeling |
| 72 hours | Offer next step: 3-pack, private session, or upcoming event |
| 7 days | Testimonial request and referral ask |
| 14–21 days | Re-engagement if no response |

### Message Queue

The **Message Queue** tab shows every pending follow-up across all active sequences, sorted by due date. Work through this list daily — it ensures no one falls through the cracks.

Overdue follow-ups are flagged in the Smart Alerts on the dashboard.

Each item in the queue has a **Send Email** button (all steps are sent by email until in-app texting is enabled). Clicking it opens an inline compose area:

1. Choose a template from the dropdown — all templates from your **Template Library** plus the Follow-Up Engine's own sequence templates are listed.
2. The subject and body are pre-filled and interpolated with the client's name and session details.
3. Edit the body if needed, then click **Send Email** to dispatch immediately.
4. The step is marked complete and logged to the client's timeline.

### Message Templates Tab — Managing Sequence Templates

On the **Message Templates** tab of the Follow-Up Engine, each template has three buttons:

| Button | What it does |
|---|---|
| **Email** | Opens a compose window — search for a recipient (client or studio partner), review the pre-filled message, and send. |
| **Edit** | Edit the template body inline. Your changes are saved as a personal override. A "Reset to default" link restores the original. |
| **Add Template** | Create a new custom message template from scratch — give it a name and write the body. |

Custom templates you've added also have a **Delete** button to remove them.

---

## Sending Emails from the Follow-Ups Section

**Navigate to:** Sidebar → Follow-Ups → Due Today or All Follow-Ups

The **Due Today** and **All Follow-Ups** tabs both show your follow-up items as a table. Each row has a **Send Email** button on the right.

**How to send an email from a follow-up:**

1. Click **Send Email** on any follow-up item.
2. A compose window opens showing the client's name and email.
3. Pick a template from the dropdown — your full Template Library and the Follow-Up Engine sequence templates are both listed.
4. The subject and body are pre-filled. Edit them freely before sending.
5. Click **Send Email** to dispatch.

**After sending:**
- The compose window closes automatically after a brief "✓ Sent!" confirmation (~1 second).
- The **Send Email** button is replaced by a green **"✓ Email sent"** badge.
- The follow-up item is marked as completed in `data.followups`.
- The email is logged to the client's Contact Timeline and the Admin → Email Logs tab.

> **Tip:** Items you've emailed stay visible in the **Due Today** list with the green badge so you can see at a glance what's been handled vs what's still pending.

---

## Outreach Hub

**Navigate to:** Sidebar → Outreach Hub

The Outreach Hub is where you manage proactive studio prospecting and new partnership development. It's separate from the Studio Partners section because it's focused on targets you haven't yet converted into active partners.

### Using the Outreach Hub

Think of this as your prospecting list. Every studio or individual you're considering reaching out to lives here.

1. Click **New** to add a target.
2. Set **Target Type**, **Source** (how you found them), and **Priority** (1–5).
3. Add your **Outreach Message** or note which template you used.
4. Set **Last Contact Date** and **Next Follow-Up Date** after each touch.
5. Track **Response Status** — No response, Positive, Neutral, Negative.
6. Set **Relationship Warmth** — Cold, Warm, Hot.

### Useful Filters

Use the view filters to focus on:
- **Overdue follow-up** — Follow-up date has passed
- **Hot leads** — Warmth set to Hot
- **No response** — First message sent, nothing back
- **Demo offered** — Studio has agreed to try a session
- **High revenue potential** — Top prospects by estimated value

When a target converts to an active partner, link them to a Studio Partner record using the **Partner ID** field.

---

## Tracking Revenue

**Navigate to:** Sidebar → Revenue

### Stripe payment reconciliation

**Navigate to:** Sidebar → **Stripe**

**How it works:**

1. A participant books a Calendly session and pays. Stripe creates the charge at that moment.
2. Click **Sync Stripe now** → the CRM pulls the charge and ties it to the session booked at the same time (same participant, closest booking time). The Stripe amount becomes that session's amount.
3. The **Stripe charges** list shows every charge with: **Name, Session, Booked, Expected, Stripe, Session amount.**

This is fully automatic — there is no manual matching to do.

**The Payment reconciliation page has:**

1. **Unmatched Stripe transactions** (only appears when there are any) — Stripe charges that could not be tied to a Calendly booking (no booking within 2 days for that participant). These are usually test charges, duplicate payments, or a charge made under a different email than the Calendly booking.
2. **Stripe charges** — every matched Stripe payment, tied to its Calendly session, with the amounts above. **Free sessions** (a booking made in the last 24 hours with no Stripe charge) show here automatically as a **$0.00** row with a **Free** badge, so every recent booking is accounted for. If a payment later comes in for that session, the row turns into a normal charge on the next sync. **Click any row** to expand it and see the full charge details (session date & time, status, paid date, payment method, refund amount, Stripe IDs, a link to the Stripe receipt, and notes).
3. **Bookings awaiting a Stripe charge** — sessions booked but with no charge pulled yet (they appear here until the next sync ties a charge to them).
4. **Refunded payments** — any refunds.

**Important:** Calendly email and Stripe checkout email must match. A booking under `jeff@simplybreathe.ai` will not match a Stripe payment for `jeffreywmason@yahoo.com`.

Click **Sync Stripe now** to pull new payments immediately (the CRM also checks every 5 minutes). Sync reloads the full Stripe ledger from the backend so payments are not lost after a refresh.

**Administrator setup:** In Stripe Dashboard → Developers → Webhooks, add endpoint `https://YOUR-BACKEND-URL/api/webhooks/stripe` and subscribe to: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.refund.updated`. Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in `backend/.env`. For production, also set `FRONTEND_SECRET` and `TRUST_PROXY=1` when the backend sits behind ngrok or your reverse proxy.

### Adding a Revenue Entry

Every session or payment should have a revenue record. Click **New** and enter:
- **Date** of the transaction
- **Client** name (who paid)
- **Channel** — where this revenue came from (Studio session, Private client, Virtual session, etc.)
- **Gross Revenue** — what the client paid
- **Studio Split** — what you paid the studio (if applicable)
- **Stripe Fee** — payment processing fee
- **Net Revenue** — what you actually keep

### Reading the Revenue Table

The **Revenue attribution**, **Payment reconciliation**, **This month**, and **All transactions** tabs are built from **Stripe-verified booking amounts** (when matched) or **Calendly session prices**, plus **accepted/paid offers**. Bookings still in **Pending verification** do not appear in revenue totals until Stripe confirms payment.

The footer on **This month** and **All transactions** shows gross (full session prices) and **net** after a **70/30 split** on studio sessions (you keep 70%, studio 30%). Virtual sessions and packages show full amount as net.

**Revenue Attribution tab (first tab)** gives you a full MTD breakdown:
- **Gross revenue MTD** — total gross session revenue for the month
- **Net revenue MTD** — gross minus studio splits for the month
- **Total Session Revenue** — all-time gross
- **Total Net Session Revenue** — all-time net after splits
- **Revenue waterfall — month to date**: shows how gross revenue flows down through fees, studio splits, and refunds to arrive at net.
- **P&L by channel — MTD**: gross, fees, splits, and net broken down by session type for the current month.
- **Recently Charged Sessions**: shows all Stripe charges processed, sorted newest first — this mirrors the Stripe page.

Both **This month** and **All transactions** now include a **Booked Date & Time** column (when the booking was made) as the first column, and **All transactions** is sorted by that date (newest first). The Facilitator and Source columns have been removed from these views.

> **Session price vs net:** Right now each booking row shows the **session price** from Calendly (gross = net until you record studio splits and processing fees separately). Focus on these figures for actual booking revenue; fee/split columns show "—" until entered manually.

### Why This Matters

Over time, the Revenue section will tell you which channels are actually profitable. For example:
- Studio A might generate $1,200 gross but only $500 net after the split.
- Virtual sessions might generate less gross but much higher margin.
- Referral clients might have the highest lifetime value.

Tracking this detail makes those answers visible.

---

## Content Calendar

**Navigate to:** Sidebar → Content

> **No content yet?** If your pipeline is empty, you'll see a green **"Load sample content"** prompt at the top of the Pipeline view. Click it to load 12 ready-to-use example posts across Instagram, TikTok, and Email — a quick way to see how the calendar works and get inspired. You can edit or delete any of them. Your content calendar posts are never deleted when you Reset to Production.

### Adding a Post Idea

1. Click **New**.
2. Give it a **Title** (working title is fine).
3. Set the **Platform** (Instagram, Email, etc.) and **Category** (e.g. Client transformation, Breathwork education).
4. Set **Status** to **Idea**.
5. Add your **Caption / Body** when you're ready to write it.
6. Set a **Scheduled Date** and move status to **Scheduled** when it's ready to go.

### Content Statuses

| Status | What It Means |
|---|---|
| Idea | Concept noted, not written |
| Draft | Being written or designed |
| Scheduled | Ready, set to go out on a specific date |
| Published | Live |
| Archived | Old content saved for reference or repurposing |

### Tracking Results

After a post goes live, come back and update:
- **Reach, Likes, Comments, Shares, Saves**
- **Leads Generated** and **Bookings** that came from the post
- **Revenue Attributed** if you can trace a booking back to this content

Over time, the **Analytics** view will show you which platforms, categories, and post types are actually driving your business.

### Tying Content to Sessions and Studios

Use **Session Promoted** to note which upcoming event a post was promoting, and **Studio Tagged** if you featured a partner. This helps you understand what's working for your B2B partnerships too.

---

## Testimonial Library

**Navigate to:** Sidebar → Testimonials

Testimonials are one of your most powerful sales tools. This section helps you collect them systematically and use them strategically.

### Requesting a Testimonial

The best time to ask is within 5–7 days of a powerful session. When you check **Breakthrough Noted** on a session record, the system will create a reminder on your dashboard to request a testimonial from that client.

### Adding a Testimonial

1. Click **New**.
2. Enter the **Client** name and **Session Attended**.
3. Paste in the **Written Testimonial** text.
4. If you have a video, add the **Video URL**.
5. Set **Permission Received** to true.
6. Note exactly what you're allowed to use: **Website**, **Social**, **First Name Only**.
7. Select a **Theme** (e.g. Clarity, Emotional breakthrough, Nervous system).
8. Pull out the **Best Quote** — one sentence you could use as a standalone pull-quote.
9. Add a **Before/After Summary** to capture the transformation story.

### Moving a Testimonial Through the Process

| Status | What It Means |
|---|---|
| Requested | You've asked the client |
| Received | They've sent you something |
| Approved | You've reviewed and it's ready to use |
| Published | It's live on your website or socials |
| Archived | No longer in active use |

> **Important:** Never publish a testimonial without setting **Permission Received** to true first. The Data Integrity check in Admin will flag any that are approved without permission.

---

## Email & SMS Templates

**Navigate to:** Sidebar → Templates

Templates save you from writing the same messages over and over. The system comes with 14 pre-written templates covering the most common situations.

### Three Buttons on Every Template

Each template card has three equal-width buttons:

- **Copy** — Copies the raw template text (with unfilled `{{placeholders}}`) to your clipboard instantly.
- **Email** — Opens the Email Compose modal (see below) where a recipient is selected, variables are auto-populated, and you can send directly from the CRM.
- **Edit** — Opens the full edit drawer to change the name, subject, body, notes, variables, category, and channel. The message body field is extra tall so you can read the full message without scrolling.

### Email Compose Modal — Sending Directly from the CRM

Clicking **Email** opens a compose window that sends the email without leaving Simply Breathe OS:

1. A search box appears — type a client or studio partner name.
2. Select the recipient from the dropdown. For studio partners, the **Send To** field shows the contact person's name (e.g. "Mary Smith"), not the studio name.
3. The system automatically fills in every variable it can from their record — things like their name, email, studio name, contact name, location, revenue split, and your own first name.
4. Any variables that can't be auto-filled (like `{{bookingLink}}` or `{{proposedDate}}`) appear as text fields below the search so you can fill them in manually. These fields stay visible while you type.
5. A live preview shows the complete, personalized message. **The body is fully editable** — make any last-minute tweaks directly in the preview before sending. A "Reset to template" link restores the original text if needed.
6. Click **Send Email** to dispatch the message immediately via the CRM's email system. A green "✓ Sent!" confirmation appears in the button.
7. Click **Copy message** to copy the fully populated text and paste it into an external email app instead.

> **After sending:** The email is automatically logged to the recipient's Contact Timeline and to the Admin → Email Logs tab. If the recipient is a studio partner, their Last Touch date updates. You can check delivery status (delivered, bounced, etc.) in the Email Logs tab.

### Template Variables

Templates use `{{placeholders}}` that are highlighted in the preview so you can spot them easily. The Email button auto-fills most of them — you only need to manually enter things like specific dates, links, or offer details that the system can't know in advance.

### Available Templates

| Template | Channel | Best Used For |
|---|---|---|
| Studio Outreach | Email | First contact with a new studio |
| Studio Follow-Up | Email | Second touch after no response |
| Demo Invitation | Email | Inviting a studio to host a demo session |
| Pilot Proposal | Email | Sending a formal pilot proposal |
| Agreement Follow-Up | Email | Following up on an unsigned agreement |
| Event Reminder | SMS | Reminder to registered attendees |
| Thank-You After Session | Email | Same-day post-session thank you |
| 24-Hour Check-In | SMS | Checking in the day after a session |
| 72-Hour Offer Follow-Up | Email | Sending a next-step offer 3 days after session |
| Testimonial Request | Email | Asking for a written testimonial |
| Referral Request | Email | Asking a client to refer a friend |
| Rebooking Invitation | Email | Inviting a past attendee to rebook |
| Private Session Offer | Email | Offering a private 1:1 session |
| Corporate Inquiry Response | Email | Responding to a corporate wellness inquiry |

---

## Referral Tracking

**Navigate to:** Sidebar → Referrals

Referrals are your highest-value growth channel. This section helps you track every referral, follow through on thank-yous, and understand who your best advocates are.

### Adding a Referral

When someone tells you a friend referred them, create a record:
1. Click **New**.
2. Enter the **Referrer** (the person who sent them) and the **Referred** person's name.
3. Set the **Date** and **Status** (start at "Received").
4. As things progress, update whether they **Attended** and **Purchased**.
5. Track the **Revenue** that came from this referral.
6. Mark **Thank-You Sent** once you've acknowledged the referrer.

### The Referral Tree

The **Referral Tree** view shows visual chains — Dana referred Maya, Maya referred someone else — so you can see who your most powerful advocates are and how much business they've generated.

If any referrals still need follow-up, a yellow **Action needed** banner appears at the top. The number matches the **Action needed** tab — it disappears once you've marked every pending referral as completed there.

### Action Needed Tab

Open **Action needed** to see referrals that still need a thank-you, follow-up, or reward. Click **Mark Completed** on each row when you're done. When the tab is empty, the banner on the Referral Tree view clears too.

### Referral Lifecycle

| Status | What It Means |
|---|---|
| Received | Someone mentioned they were referred |
| Contacted | You've reached out to the referred person |
| Attended | They came to a session |
| Purchased | They bought a package or offer |
| Thanked | You've thanked the referrer |
| Closed | Complete |

> **Tip:** Always send a thank-you within 48 hours of learning about a referral. The Smart Alerts panel will remind you if you haven't.

---

## Workflows — Seeing the Big Picture

**Navigate to:** Sidebar → Workflows

The Workflows section shows your five core business processes as visual pipelines. Instead of looking at individual records, here you can see the health of each process at a glance.

### The Five Workflows

**1. Client Journey**
Lead → First Session → Repeat Attendee → Package Holder → Advocate

Answers: How many people are at each stage? Where are they getting stuck? What's the conversion rate from first session to package?

**2. Studio Pipeline**
Target → Outreach → Discovery Call → Demo → Pilot → Recurring Partner

Answers: How full is your partnership pipeline? Which studios have been stuck at the same stage for too long?

**3. Session Lifecycle**
Planned → Booking Open → Promoted → Delivered → Followed Up → Rebooked

Answers: Are sessions being followed up on? Is rebook rate healthy?

**4. Offer Pipeline**
Drafted → Sent → Viewed → Follow-Up → Closed (Won / Lost)

Answers: How many open offers are there? What's the win rate? Where do deals stall?

**5. Referral Pipeline**
Received → Attended → Purchased → Thanked → Tracked

Answers: Are referrals converting? Are referrers being acknowledged?

### What to Look For

- **High counts at an early stage** — something is blocking progress
- **"Stuck" indicators** — records that haven't moved in more than 7 days are flagged
- **Low conversion rates between stages** — a sign the handoff needs attention

---

## Tracking Expenses

Keeping tabs on what you spend is just as important as tracking what you earn. The Expenses section helps you record, categorize, and analyze every business cost — and automatically shows you your true operating profit.

### Getting to Expenses
Click **Expenses** in the left sidebar (under the B2C section).

### The Summary Dashboard
When you open Expenses, you land on the **Summary** tab which gives you an instant financial health check:

**Five key numbers at the top:**
- **Expenses MTD** — how much you've spent so far this month
- **Expenses YTD** — your total spending since January 1
- **Tax Deductible YTD** — the portion you can likely claim as a business deduction
- **Recurring / mo** — your fixed committed monthly costs (software, insurance, etc.)
- **Operating Margin** — the percentage of your net revenue left after expenses

**Spend by Category** — a visual bar chart showing where your money goes (equipment, software, marketing, etc.)

**Monthly Trend** — a 6-month chart so you can see if spending is creeping up

**Top Vendors** — your biggest suppliers ranked by annual spend

**Profitability Panel:**
This is the most important section. It shows you the full picture:
- Gross Revenue this month (from completed sessions)
- Minus studio splits
- = Net Revenue
- Minus your expenses
- = **Operating Profit** (green when positive, red when you're in the red)

### Adding an Expense Manually
1. Click **New Record** in the top bar while in any Expenses view
2. Fill in:
   - **Date** — when was the purchase made?
   - **Vendor** — who did you pay?
   - **Description** — what was it for?
   - **Amount** — the cost (just the number, no $)
   - **Category** — pick from the 10 business categories
   - **Payment Method** — how did you pay?
   - **Tax Deductible** — check the box if this is a deductible business expense
   - **Recurring** — check if this happens monthly/annually; set the frequency
   - **Notes** — any additional context
3. Click **Save**

### Importing a Month of Expenses via CSV
This is the fastest way to add expenses — export from your bank or accounting app and import in seconds.

1. Export your expenses from your bank, credit card portal, QuickBooks, Wave, or Xero as a CSV file
2. Rename the columns to match these headers: `date, vendor, description, amount, category, paymentMethod, taxDeductible, recurring, recurringFreq, notes`
3. In Simply Breathe OS, click **Import CSVs** in the sidebar
4. Choose **Expenses** as the section
5. Upload your file

**Important format notes:**
- Dates must be in YYYY-MM-DD format (e.g. 2026-06-15)
- Amount should be a number only — no $ sign
- Category must exactly match one of: Equipment & Supplies, Software & Subscriptions, Marketing & Advertising, Travel & Transport, Education & Training, Professional Services, Insurance, Administrative, Studio & Venue, Other
- Tax deductible and recurring should be `true` or `false`

### Expense Categories Explained
| Category | What goes here |
|---|---|
| Equipment & Supplies | Headsets, eye masks, mats, session consumables, extension cords |
| Software & Subscriptions | Booking platforms, Spotify, Canva, this CRM |
| Marketing & Advertising | Instagram ads, flyer printing, graphic design |
| Travel & Transport | Mileage to studios, parking, transit costs |
| Education & Training | Breathwork certifications, workshops, CPD |
| Professional Services | Your accountant, lawyer, or business coach |
| Insurance | General liability and professional indemnity |
| Administrative | Website hosting, domain name, bank fees |
| Studio & Venue | Room hire, venue deposits (separate from revenue splits) |
| Other | Anything that doesn't fit above |

### How Expenses Affect Your Numbers
The system automatically uses your expense data in:
- **Pipeline Snapshot** on the Today dashboard — shows "Expenses MTD" and "Operating Profit MTD"
- **Profitability Panel** in Expenses Summary — full P&L breakdown for the month
- **Operating Margin** — so you always know if you're actually making money after costs

> **Tip:** Even if a session generates $500 gross, once you factor in the studio split, mileage, supplies, and your software costs, the real number might be $280. The Expenses section makes that visible.

---

## Admin Settings

**Navigate to:** Sidebar → Admin

The Admin section has several tabs. Here are the ones you'll use most often:

### Settings Tab

System-wide options for Owners and Admins. (The Breathwork Journeys list is no longer managed here — see Journey Descriptions below.)

### Email Logs Tab

**Navigate to:** Sidebar → Admin → Email Logs tab

A complete log of every email attempted from the CRM — including successful sends and failures. Use this to confirm that emails reached their recipients and to investigate any send errors. The log is never deleted, even when you Reset to Production.

**What you can see:**
- Date sent, recipient name and email, template name
- **Send Status** — whether the CRM successfully handed the email to the email service (green = sent, red = failed)
- **Delivery Status** — whether the email was actually delivered, bounced, opened, or clicked

**Delivery status checks:**
- When you open the Email Logs tab, the system automatically checks the delivery status of any emails that haven't been confirmed yet — no action needed.
- You can also click **Refresh all statuses** to manually trigger a check on everything.

**Viewing the email content:**
- Click any row in the table to expand it and see the full subject line and message body that was sent, along with the send timestamp and Resend message ID.

**Clearing the log:**
- Click **Clear log** to remove all entries. This does not unsend any emails — it only clears the history display.

### Journey Descriptions Tab

**Navigate to:** Sidebar → Admin → Journey Descriptions tab

This is where you manage the list of breathwork journeys available in session dropdowns, and add a full description for each one.

**To add a new journey:**
1. Click **Add** to create a new row.
2. Enter the **journey name** (this is what appears in session dropdowns).
3. Type the full **description** in the text area — you can write as much as you like.
4. Click **Save** when done.

**To edit an existing journey:**
- Click into the name or description field and make your changes, then click **Save**.

**To remove a journey:**
- Click **Remove** on the row you want to delete, then **Save**.

> **Why this matters:** The journey descriptions you add here power the **ⓘ popup** on virtual session cards. When a client books a virtual session, you can tap the ⓘ on that session card to instantly see the full description of the journey — useful for preparing notes or refreshing your memory before the session.

### Reset to Production Tab

**Navigate to:** Sidebar → Admin → Reset to Production tab

This is a one-time action used to wipe all test and sample data before going live with real clients, sessions, and studio partners.

> **Warning:** This permanently deletes data. Export a backup from the Storage & Backup tab first.

**What gets wiped:** Clients, studio partners, sessions, Calendly bookings, Stripe payments, offers, referrals, follow-ups, follow-up sequences, expenses, and revenue records. Stored partner agreement files are removed too.

**What is kept:** Message templates, follow-up template customisations, Content Calendar posts, Testimonials, Outreach Hub records, CRM settings and dropdown lists, journey descriptions, user accounts and PINs, and the email log (permanent audit trail).

**Integrations are not disconnected:** Your Calendly and Stripe webhook URLs, API keys, and Resend email setup stay as they are. The reset also clears pending webhook queues on the backend so old test bookings and payments do not come back on the next sync.

**The process has three confirmation steps to prevent accidents:**

1. **Review** — You'll see exactly how many records will be deleted and what will be preserved. Click "I understand — continue to reset".
2. **Confirm** — Type the word `RESET` in the text field, then click "Continue →".
3. **Enter your PIN** — Re-enter your admin PIN to authorize the wipe. Click "Wipe records — go live".

Only after all three steps are completed will any data be deleted.

---

## Your Profile

### Editing Your Profile

Click your **avatar circle** in the top-right corner of any page, then select **Edit Profile**.

**Profile tab — what you can update:**
- **Profile photo** — Click the avatar circle or the "Upload photo" button. Your photo will be resized automatically. It fills the entire avatar circle edge-to-edge and appears on the login screen and in the header.
- **Avatar color** — If you don't have a photo, choose a color for your initials circle.
- **Full Name**
- **Title** — e.g. "Lead Facilitator", "Studio Manager"
- **Email** and **Phone**

**Security tab — changing your PIN:**
1. Enter your **Current PIN**.
2. Enter a **New PIN** (minimum 4 characters).
3. Confirm the new PIN.
4. Click **Save Changes**.

> If you forget your current PIN, you cannot change it yourself. Ask an Owner or Admin to reset it for you in User Management.

---

## Logging Out

Click your **avatar circle** in the top-right corner, then click **Log Out**. You'll be asked to confirm before the session ends.

After logging out, the login screen is shown and your data is locked until the correct PIN is entered.

> **Good practice:** Log out any time you're stepping away from the computer, especially on a shared device.

---

## Tips for Daily Use

**Start your computer session by double-clicking `start.bat`.**
This launches the backend, frontend, and ngrok tunnel all at once. Everything the CRM needs will be running before you open your browser.

**Start every day on the Today dashboard.**
The Next Best Actions list is ranked automatically. Work through it top to bottom and your most important business tasks are handled.

**Update records immediately after interactions.**
The system is only as useful as the data in it. After a call, a session, or a message exchange, spend 2 minutes updating the relevant record.

**Use the Timeline before every follow-up.**
Before calling or emailing someone, open their record and check the Timeline tab. You'll know exactly where things stand and won't ask questions you should already know the answers to.

**Keep the Pipeline Snapshot honest.**
The numbers on the dashboard are only accurate if offer statuses, session statuses, and payment fields are kept up to date. A weekly review of open offers and sessions takes about 10 minutes and keeps everything current.

**Check Smart Alerts daily.**
The alerts panel is your safety net. If something is slipping — an expiring offer, a missing follow-up, low session registration — it will appear there. Don't ignore high-severity alerts.

**Use templates as your default.**
Every time you write an email or SMS from scratch, check the Templates section first. Most situations are already covered. Copy, personalize the placeholders, and send.

**Mark breakthroughs in session records.**
If a client has a powerful session experience, check **Breakthrough Noted** on the session record. This creates a reminder to request a testimonial at exactly the right time.

---

## Frequently Asked Questions

**Can I use the system on multiple devices?**
Yes, as long as you use the same browser and have not cleared your browser storage. The data is stored locally in your browser. For the most reliable experience, use one primary device.

**What happens if I clear my browser cache?**
Your encrypted data could be lost. Always use the **Admin → Storage & Backup → Download Backup** option regularly to keep a safe copy of your data.

**Is my data secure?**
Yes. All data is encrypted with AES-256-GCM — the same standard used by banks. Your PIN is never stored; only a cryptographic hash is kept. Even if someone accessed your browser storage directly, they could not read your data without your PIN.

**Someone else needs to access the system. What do I do?**
Go to **User Management** (Owner or Admin access required) and create a new user account with a unique name and PIN. Assign the appropriate role based on what they need to do.

**I made a mistake and entered wrong information. Can I fix it?**
Yes. Click any record to open it, make your changes, and click Save. There is no version history, so take care when making bulk changes.

**An alert says an offer is expiring but I already closed it. What do I do?**
Open the offer record and update the **Status** to Accepted, Paid, or Declined as appropriate. The alert will disappear automatically on your next visit.

**How do I know if a session's equipment checklist is complete?**
Open the session record and go to the **Equipment** tab. Completed items have a checkmark. The session list also shows a setup status indicator.

**I can't see the New button or Save button on some pages. Why?**
Your account may have Viewer or Editor permissions that restrict certain actions. Viewers can still browse records and view details (including fetched Calendly session descriptions), but changes are not saved to shared data. Contact your Owner or Admin to update your permissions if you need more access.

**How do I back up my data?**
Go to **Admin** in the sidebar, click the **Storage & Backup** tab, and click **Download Backup**. This saves a JSON file to your computer. Keep it somewhere safe.

**The app is showing old data or not updating. What should I do?**
Try refreshing the page. If the problem persists, log out and log back in. If you continue to see issues, contact your system administrator.

**A new Calendly booking isn't appearing in the CRM. What should I do?**
The CRM syncs every 5 minutes automatically — wait a moment and check again. If it still doesn't appear, check that the backend server is running (double-click `start.bat` or run `.\start.ps1` from the project folder). If using ngrok for local testing, make sure the ngrok tunnel is still active — ngrok sessions expire after a few hours on the free plan.

**Can I manually create a booking without Calendly?**
Yes. Go to **Calendly Bookings** and click **New** to create a registration record manually. You'll need to link it to an existing client and session.

**A client booked twice and I have a duplicate. How do I fix it?**
The system matches clients by email address. If a duplicate client was created (e.g. the client used two different email addresses), open the older record and merge the information into the primary record manually, then delete the duplicate.

**The Registered Attendees number on a studio session looks wrong. How do I fix it?**
Registered Attendees is automatically synced from the actual bookings when you open the session drawer — you don't need to edit it manually. If the number looks off, check the Bookings tab first: the count reflects non-canceled registrations only. Open the session drawer to trigger a refresh.

**Nothing happened when I clicked "Download PDF". Why?**
Your browser may be blocking pop-ups. Look for a pop-up blocked notification in the browser address bar, click it, and allow pop-ups from this site. Then try the Download PDF button again.

**The Sessions Attended tab shows a revenue figure — how is it calculated?**
Each row shows the **session price** from that client’s Calendly booking. The total is the sum of those prices across all non-canceled bookings (unpaid bookings are excluded). This matches how **LTV** is calculated until live payment data comes through from Calendly.

**I clicked Send Email on a template but nothing was sent. What happened?**
Check the Admin → Email Logs tab. If the row shows a red "Failed" status, the email service may have rejected the send — this usually means the recipient email address is invalid or the email service configuration needs attention. Contact your system administrator if the issue persists.

**The Send Email button shows "✓ Email sent" but I'm not sure the email arrived. How do I check?**
Go to Admin → Email Logs. Find the email in the list — the **Delivery Status** column shows whether Resend confirmed delivery. If it shows "unknown", click **Refresh all statuses** — the system will check the current delivery state from Resend's records.

**I sent an email from a follow-up item but it still shows in my Due Today list. Is that normal?**
Yes — completed items stay visible in the Due Today list with a green "✓ Email sent" badge rather than disappearing. This lets you see at a glance what has been handled vs what still needs attention. Items marked complete won't re-trigger reminders.

**I want to start using the CRM with real clients and clear out the test data. How?**
First, download a backup from Admin → Storage & Backup → Download Backup. Then go to Admin → Reset to Production and follow the three-step confirmation process (review, type RESET, enter your PIN). This wipes all test client/session/payment records while preserving templates, content calendar posts, testimonials, outreach records, settings, and user accounts, and clears Calendly/Stripe webhook queues so test data does not re-import.

**My email shows in the Email Logs but the delivery status is still "unknown". What does that mean?**
It means the system hasn't received a delivery confirmation from the email service yet. This can happen if the check ran too soon after sending. Open Admin → Email Logs and click **Refresh all statuses** to pull the latest delivery information.

---

*Simply Breathe OS User Guide — updated June 2026 (v9.2)*
*For technical documentation, see DOCUMENTATION.md*
