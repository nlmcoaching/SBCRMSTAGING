# Simply Breathe OS — CRM Documentation

> **Version:** 9.2 (June 2026)
> **Stack:** React 18 · Vite · Recharts · Lucide React · PapaParse · Node.js/Express (backend)
> **Storage:** Browser `localStorage` (encrypted) + Cursor canvas `window.storage`
> **Security:** AES-256-GCM encryption · PBKDF2 key derivation · PIN-based auth

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Security](#authentication--security)
3. [User Management](#user-management)
4. [Dashboard — Today's Command Center](#dashboard--todays-command-center)
5. [Clients (B2C)](#clients-b2c)
6. [Studio Partners (B2B)](#studio-partners-b2b)
7. [Sessions](#sessions)
8. [Offers & Sales Pipeline](#offers--sales-pipeline)
9. [Follow-Up Engine](#follow-up-engine)
10. [Outreach Hub](#outreach-hub)
11. [Revenue Attribution](#revenue-attribution)
12. [Content Calendar](#content-calendar)
13. [Testimonial Library](#testimonial-library)
14. [Email / SMS Templates](#email--sms-templates)
15. [Referral Tracking](#referral-tracking)
16. [Workflows](#workflows)
17. [Expenses](#expenses)
18. [Calendly Integration](#calendly-integration)
19. [Admin](#admin)
20. [Navigation & Layout](#navigation--layout)
21. [Data Import / Export](#data-import--export)
22. [Profile & Account](#profile--account)
23. [Seed Data](#seed-data)
24. [Staging Environment](#staging-environment)
25. [Technical Architecture](#technical-architecture)

---

## Overview

Simply Breathe OS is a purpose-built CRM and operating system for a breathwork practice. It manages the full lifecycle of two distinct business lanes:

- **B2C — Personal Clients:** Individual clients who attend studio sessions, virtual sessions, or private work.
- **B2B — Studio Partners:** Yoga studios, gyms, and wellness spaces that host breathwork events.

The system is designed to answer three core daily questions:
1. What do I need to do today to move the business forward?
2. Where does every client and studio relationship stand?
3. What is actually driving revenue?

---

## Authentication & Security

### PIN-Based Lock Screen

- The app launches into a full-screen lock screen on every visit.
- Users select their name tile then enter their personal PIN.
- Single-user installs auto-select the user and go straight to PIN entry.
- The heart-wave Simply Breathe logo is displayed prominently on the login screen.

### Session Persistence

After a successful PIN login, the master key and user ID are saved to **`sessionStorage`** (`sb:session:v1`). On the next page load (e.g. browser refresh), the app reads this token, re-imports the master key, decrypts the data, and restores the session automatically — no PIN re-entry required.

- `sessionStorage` is scoped to the browser tab; closing the tab or window clears the session, requiring PIN entry on next open.
- The last-visited section and tab view are also saved to `sessionStorage` (`sb:nav:v1`) while the user is logged in, so a refresh returns to the same page rather than the Command Center.
- Both keys are cleared on explicit logout and on idle auto-lock.

#### Session Token Integrity (HMAC binding)

Every session token stored in `sb:session:v1` includes a `sig` field: an HMAC-SHA256 digest computed over `"sb-session-v2:" + userId + ":" + masterKeyRaw`, using the master key itself as the HMAC key.

On session restore, the app re-computes the expected HMAC and rejects the token if:
- the `sig` field is missing (legacy unsigned tokens), or
- the computed digest does not match the stored `sig` (tampered `userId` or `masterKeyRaw`).

A rejected token is removed from `sessionStorage`, and the user must re-enter their PIN. This prevents a lower-privilege user from editing `userId` in DevTools to claim another user's role while reusing a valid master key.

### Encryption

| Layer | Detail |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2 · SHA-256 · 600,000 iterations |
| Salt | 16-byte random per user |
| Master key | Generated once, envelope-encrypted per user |
| Storage key | `simplybreathe:data:v5:enc` |
| Security metadata key | `sb:security:v1` |

- All CRM data is encrypted at rest using the master key.
- Each user's copy of the master key is wrapped with their individual PIN-derived key.
- Adding a new user re-wraps the master key for them using their PIN.
- If the browser storage API is unavailable, the app falls back to unencrypted seed data mode.
- PBKDF2 iterations are automatically upgraded to 600,000 on next login for any account created before v7.0. The upgrade is silent and transparent.

### CSV Sanitization

- Formula injection (cells starting with `=`, `+`, `-`, `@`) is stripped on import.
- HTML tags are stripped from all imported values.

### Content Security Policy

Vite dev server sets the following headers:
- `Content-Security-Policy` — restricts scripts, styles, and connections to same-origin.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Storage Schema Validation

On load, the decrypted data is validated against the expected schema (all required top-level arrays present) before being applied to state. Missing CRM tables are auto-repaired as empty arrays when possible; if validation still fails, login is blocked with a message to restore from a JSON backup. After a successful repair, the corrected structure is saved on the next auto-save.

### PIN Lockout

After 5 consecutive failed PIN attempts, the lock screen displays a lockout message and disables further attempts for 5 minutes. The lockout counter is stored in **`localStorage`** with TTL-based expiry — it persists across tabs, page refreshes, and browser restarts until the lockout window expires. Stale entries are pruned automatically on read.

### Legacy Account Upgrade Banner

If the app detects a v1 PIN account (pre-PBKDF2, unsalted SHA-256 hash), a yellow banner is displayed on the lock screen: **"Security upgrade required — please log in to automatically upgrade to enhanced security (PBKDF2)."** Logging in once completes the migration silently; the old hash is permanently removed.

### Idle Auto-Lock

The app automatically locks after **15 minutes of inactivity** (no mouse movement, keypress, touch, or scroll). The timer resets on any user interaction. When the idle lock fires — whether from the initial inactivity countdown **or** from a reset countdown after user activity — both `sb:session:v1` and `sb:nav:v1` are removed from `sessionStorage`, so the next page load requires PIN entry and lands on the Command Center.

### Delete Confirmation

Deleting any CRM record requires confirmation via a modal dialog ("Delete this record? This cannot be undone."). This prevents accidental data loss from misclicks.

### File Upload Limits

- CSV imports: 10 MB maximum file size.
- Avatar/profile photos: 5 MB maximum; browser validates the file is a real image before processing.

### Backup Export Warning

Downloading a JSON backup displays a security reminder that the file is unencrypted plain text containing sensitive client and financial data. The user must confirm before the download proceeds.

### Backend Startup Validation

On startup, the Express backend validates that required environment variables are present:

| Variable | Behaviour if missing |
|---|---|
| `CALENDLY_WEBHOOK_SIGNING_KEY` | **Production:** server exits with code 1. **Dev:** loud console warning, server continues. |
| `QUEUE_ENCRYPTION_KEY` | **Production:** server exits with code 1. **Dev:** loud console warning, server continues. |
| `STRIPE_WEBHOOK_SECRET` | **Production:** server exits with code 1. **Dev:** loud console warning; unsigned Stripe webhooks accepted only in dev. |
| `FRONTEND_SECRET` | **Production:** server exits with code 1. **Dev:** loud console warning; `/pending` and `/acknowledge` unauthenticated. |

This prevents accidentally running an unprotected production instance.

### Reverse Proxy — `TRUST_PROXY`

Set `TRUST_PROXY=1` in `backend/.env` only when the Express app sits behind ngrok, nginx, or Caddy. This enables correct client IP detection for rate limiting. Do **not** set it when port 3001 is directly exposed to the internet — spoofed `X-Forwarded-For` headers could bypass rate limits.

### Calendly Webhook Field Sanitization

All string fields extracted from incoming Calendly webhook payloads are passed through `Sec.sanitize()` before being written to the queue or applied to CRM records. This strips HTML tags and formula-injection characters (`=`, `+`, `-`, `@` at the start of a value).

### Frontend Secret — Proxy Injection and `apiHeaders()` Helper

`FRONTEND_SECRET` is injected as an HTTP header server-side by the Vite proxy (dev) or a reverse proxy such as Nginx (production). It is never compiled into the browser JS bundle when deployed correctly.

All five API call sites (`/api/send-email` × 4, `/api/email-status/:id` × 1) are centralized through a single `apiHeaders()` module-level helper:

```js
const apiHeaders = (json = true) => {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  const s = import.meta.env.VITE_FRONTEND_SECRET;
  if (s) h["x-frontend-secret"] = s;
  return h;
};
```

The proxy injects the header without needing `VITE_FRONTEND_SECRET`. `VITE_FRONTEND_SECRET` is retained as a fallback only for deployments that serve the frontend without a secret-injecting proxy.

### Reset to Production — 3-Step PIN Re-Challenge

The **Reset to Production** admin feature uses a 3-step confirmation flow to prevent accidental data wipes from an unattended session:

1. **Review** — displays record counts across all wipe tables and what will be preserved.
2. **Confirm** — user must type `RESET` exactly.
3. **PIN challenge** — user must re-enter their admin PIN (verified via PBKDF2 `unwrapKeyForUser`, same cryptographic path as login). Only on successful PIN verification is the wipe executed.

On success, the CRM also calls `POST /api/integration/clear-queues` to empty Calendly and Stripe webhook pending queues so test events cannot re-import. Server-side integration configuration (webhook URLs, API keys, Resend) is not modified.

### Helmet — Explicit CSP

`helmet()` is called with an explicit configuration rather than defaults:

| Setting | Value |
|---|---|
| `contentSecurityPolicy` | `defaultSrc: 'self'`, `scriptSrc: 'self'`, `objectSrc: 'none'`, `frameAncestors: 'none'`, `formAction: 'self'`, `baseUri: 'self'` |
| `hsts` | Production only: `maxAge: 31536000`, `includeSubDomains: true`, `preload: true` |
| `crossOriginOpenerPolicy` | `same-origin` |
| `crossOriginResourcePolicy` | `same-origin` |

### CRM Settings — Encrypted at Rest

Application configuration (journey descriptions, package types, lead sources, etc.) stored under `sb:crm-settings:v1` is now also written into the AES-256-GCM encrypted data store on every save. On login, the encrypted version takes precedence over the localStorage cache, protecting business configuration metadata from unencrypted exposure.

### CORS — Null-Origin Blocked in Production

The backend CORS handler now rejects requests with no `Origin` header in `NODE_ENV=production`. Null-origin pass-through is only allowed in dev mode (where the Vite proxy may omit the header).

### Webhook Signature Parsing

The `Calendly-Webhook-Signature` header is parsed using explicit `indexOf`-based splitting with duplicate-key rejection. Crafted headers with repeated `t=` or `v1=` keys that could manipulate replay-protection timestamp checks are rejected outright.

### GCM Tamper Detection — Fail Closed

`_decryptQueue` now distinguishes format errors (old plaintext file before encryption was enabled → safe fallback) from GCM authentication failures (integrity check failed → possible tampering). A tampered queue file causes `readQueue()` to return an empty array rather than accepting the attacker's content.

### Async Queue Mutex

All queue read-modify-write operations (webhook receipt and `/acknowledge`) are serialised through an in-process promise-chain lock. Concurrent Calendly webhook bursts no longer race and overwrite each other.

### Acknowledge Endpoint — Array Cap and Element Validation

`POST /api/calendly/acknowledge` rejects `ids` arrays longer than 500 elements, preventing O(n×m) DoS via oversized payloads. Each element is also validated to be a non-empty string (max 100 characters) — non-string values (null, objects, etc.) are rejected with a 400 response before any queue operations run.

### PDF Export — XSS Prevention

All user-supplied strings (session name, studio name, notes, time, journey) interpolated into the `document.write` PDF template are HTML-escaped via an `esc()` helper. The generated print window also has a strict `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` applied.

### SSRF Guard

`fetchEventTypeDescription` in the backend rejects any `event_type` URI that does not begin with `https://api.calendly.com/`. This prevents server-side request forgery via crafted webhook payloads.

---

## User Management

**Navigation:** Sidebar → Admin → User Management (nested sub-item; expands when Admin is active)

### Features

- View all active users with name, role, color badge, and last login.
- Summary stats: Total Users · Owner count · Editor/Admin count · Viewer count.

### Roles & Permissions

| Role | View | Edit | Delete | Manage Users |
|---|---|---|---|---|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | — |
| Editor | ✓ | ✓ | — | — |
| Viewer | ✓ | — | — | — |

Viewers can open session records and view the studio event description (ⓘ), but auto-saving a fetched description to shared CRM data requires **Edit** permission (`onSave` must be present — same gate as agreement uploads, the NBA email compose flow, and the background Calendly description backfill during sync).

### Adding a User

- Fields: Full Name · PIN · Role (Owner / Admin / Editor / Viewer).
- Individual permissions for View / Edit / Delete can be overridden per user.
- A new user's copy of the master key is wrapped with their PIN on creation.

### Editing a User

- Update role and individual permission toggles.
- Reset PIN for any user (requires the master key to re-wrap).

### Deactivating a User

- Soft-delete: user is marked `active: false` and hidden from the lock screen.
- Cannot deactivate yourself.

---

## Dashboard — Today's Command Center

**Navigation:** Sidebar → Today (home screen)

The dashboard is the daily starting point. It surfaces the most important information without requiring navigation.

### Stats Row

| Metric | Source |
|---|---|
| Gross Revenue MTD | Total gross session prices for the current calendar month (virtual + studio, before any splits). Calculated using `buildRevenueViewRows` → sum of `gross`. Includes registrations with `pending_verification`, `unmatched`, and `unknown` payment statuses (at Calendly list price); excludes `unpaid`, `failed`, `refunded`. Clicking the card navigates to Revenue → **This month**. |
| Referral Revenue | Revenue from clients whose source is "Referral" |
| Active Clients | Total number of clients in the system |
| Active Sequences | Follow-up sequences with pending steps |

### Lane Split Panel

Side-by-side view of studio vs client revenue, with **Studio Revenue (B2B) on the left card** and **Client Revenue (B2C) on the right card**. The **Lane Split Panel appears above the Pipeline Snapshot** on the dashboard.
- **B2B (left):** Studio session booking prices MTD (includes `pending_verification` and `unmatched` bookings at list price) · Open partner pipeline value · Active partners · Avg session rev
- **B2C (right):** Virtual session booking prices MTD + closed offer revenue · Open offers value · Active clients

### Clients by Source Chart

Pie/bar chart breaking down clients by their `source` field. Tracked sources include: Referral, Instagram, Studio, Website, Direct, Event, Corporate, **Calendly**, Other. Clients auto-created from Calendly bookings are tagged with `source: "Calendly"` and appear in this chart.

### Pipeline Snapshot

Appears **below the Lane Split Panel**. Key business metrics displayed in order:

1. Operating Profit MTD — net revenue MTD minus expenses MTD
2. Expected 30-day revenue — probability-weighted open offer pipeline
3. Booked, not delivered — upcoming sessions with confirmed bookings
4. Avg client value — mean `lifetimeValue` across active clients with at least one session
5. Avg session net revenue — mean net booking price across sessions with registrations
6. Partner conversion rate — studio demo-to-pilot conversion rate
7. Open offer pipeline — total value of open offers
8. Studio partner pipeline — total open studio partner deal value
9. Offers awaiting response — count of sent/viewed offers
10. Expenses MTD — total operating costs for the current month

> **Removed:** "Delivered, unpaid" card has been removed from this section.

### Smart Alerts Panel

Automatically generated warnings when something is slipping. Alerts are accessed via the **bell icon** (blue, with a red badge showing the unread count) in the top-right header, next to the profile avatar. Clicking the icon opens a popup panel. Each alert has a severity level (critical / warning / info) and a "View" action to jump directly to the related record.

- **Dismiss button (×):** Each alert can be individually dismissed. Dismissed alerts do not reappear (persisted to `localStorage`).
- **Badge count:** Updates immediately when alerts are dismissed — reflects only undismissed alerts.

| Alert | Trigger |
|---|---|
| Offer expiring soon | Offer expiration date within 3 days |
| No follow-up after session | Session completed >24 hours ago with no follow-up sent |
| Low session registration | Session within 72 hours with registered < 50% of capacity |
| Waivers missing | Session within 48 hours with incomplete waivers |
| Unpaid completed session | Session completed with payment status not "Paid" |
| Stale open offer | Offer in "Sent" or "Viewed" status for >5 days |
| No proposal after demo | Studio demo completed >3 days ago with no pilot proposed |
| Setup not started | Session within 48 hours with setup status not started |
| Inactive studio pipeline | Studio partner with no activity in >14 days |
| No outreach this week | No outreach activity logged in the past 7 days |
| Referral thank-you overdue | Referral received >3 days ago with no thank-you sent |
| Testimonial not requested | Session with "Breakthrough Noted" >5 days ago, no testimonial request sent |

### Next Best Actions

Three-column ranked action list (Revenue · Relationship · Operational), showing the top 3 items per category with the contact name, action description, and urgency context. Expand/collapse per column.

Each action row has a **× dismiss button** (right side, fades in on hover). Dismissed actions are hidden for the rest of the day and automatically reset at midnight. Dismissals are persisted to `localStorage` under `sb:dismissed-actions:v1`.

**Relationship actions:** Clicking a row opens the **Send email** compose modal (not the record drawer). The recipient is pre-filled from the action (client or studio contact). Choose a **Message template** from the dropdown (Engagement / Studio Outreach templates suggested first), edit the subject and body, then send. On successful send, the action is dismissed for the day and related records are updated (e.g. referral thank-you marked sent, partner `lastTouch` updated, email logged to contact timeline).

**Revenue and Operational actions:** Clicking a row opens the related record in the drawer. **Revenue actions** also show a **Call** banner at the top of the drawer with the contact's phone number (tap-to-call on mobile) when a phone is on file — resolved from the linked client for follow-ups/offers, or from the client/partner record directly. The phone also appears in the action sub-line in the Revenue column list when available.

**Revenue actions include:**
- Follow up on expiring open offers
- Chase unpaid completed sessions
- Re-engage past clients who haven't rebooked
- Convert high-value leads with no offer sent

**Relationship actions include:**
- Thank new referral sources
- Check in with studio owners
- Request testimonials from breakthrough sessions
- Invite warm contacts to upcoming sessions

**Operational actions include:**
- Sessions happening today / tomorrow (virtual sessions show **Virtual** and Zoom/setup wording; studio sessions show the studio name). These **auto-clear** when the session **Virtual Setup** checklist phase is complete (Zoom + headset tested) and no linked booking is **unpaid**. Pre-Session items below that (space, camera, playlist, etc.) do not block the action.
- Missing waivers
- Setup checklist not started (studio sessions only)
- Follow-up emails not yet scheduled

---

## Clients (B2C)

**Navigation:** Sidebar → Clients (B2C lane, first item)

### Fields Tracked

| Field | Type |
|---|---|
| Name | Text |
| Email | Email |
| Phone | Phone |
| Source | Dropdown: Referral, Instagram, Studio, Website, Direct, Event, Corporate, Other |
| Client Type | Dropdown: First-time attendee, Repeat attendee, Member, Advocate, Referral source, Private client, Studio attendee, Virtual attendee, Corporate attendee, High-value lead, Past client – reactivate |
| Intent Tags | Multi-select: Stress relief, Anxiety, Burnout, Performance, Grief, Letting go, Self-confidence, Nervous system reset, Transformation seeker, Spiritual growth, Corporate wellness |
| First Contact Date | Date |
| Last Session | Date |
| Next Follow-Up | Date |
| Relationship Status | Dropdown: New lead, Active, Warm, VIP, Advocate, Inactive, Lost |
| Notes | Textarea |
| Referral Source | Text (name of referrer) |
| Referral Potential | Dropdown: High, Medium, Low |
| Lifetime Value (LTV) | Currency — auto-calculated for clients with Calendly bookings (see Calendly Integration); also includes linked revenue records and accepted/paid offers |

### Contact Timeline

Each client record includes a full chronological timeline tab showing:
- First contact date and source
- Sessions attended (with journey, date, revenue)
- Offers made and their outcomes
- Payments received
- Follow-ups sent
- Testimonials given
- Referrals made
- Next scheduled action

### Views Available

- **All Clients** — Full table (Client, Email, Phone, Status, Segment, Referral, LTV), sorted **A–Z by client name** by default (no user action required)
- **New Leads** — Filtered to relationship status "New lead"
- **Active Members** — Filtered to type "Member"
- **VIP & Advocates** — High-value clients
- **Needs Follow-Up** — Next follow-up date overdue or today

### Client Record Drawer

Opening a client record displays a drawer with multiple tabs. The primary tab is named **Details** (previously "Details & Edit").

**Fields order in the Details tab** — the following fields appear at the top of the form, directly below the client name:

1. Phone
2. Email
3. Sessions Attended
4. First Session
5. Last Session
6. Next Session
7. Emotional Notes
8. Lifetime Value

Followed by:

9. Status
10. Client Type
11. Source
12. Referral Potential
13. Package Type
14. Intent Tags

### Sessions Attended Tab

Client records include a **Sessions Attended** tab (badge shows the count). It lists every session the client has been registered for, with:
- Session name · Date · Time · Journey
- **Amount** — the Calendly session price on that booking (`paymentAmount` from the event type Internal Note), same value shown on Calendly Bookings → All Bookings
- A **Total Revenue** summary at the bottom showing the sum of session prices across all non-canceled bookings (excludes unpaid)

---

## Studio Partners (B2B)

**Navigation:** Sidebar → Studio Partners (B2B lane)

### Pipeline Stages

Target Identified → Researched → Initial Outreach Sent → Follow-Up Needed → Discovery Call Booked → Demo Session Offered → Demo Completed → Pilot Proposed → Agreement Sent → Agreement Signed → First Session Scheduled → Pilot Completed → Recurring Partner → Lost / Not a Fit

### Fields Tracked

Studio name · Owner/Manager name · Email · Phone · Location · Type (yoga, gym, meditation, wellness, Pilates, corporate, etc.) · Estimated community size · Best-fit journey · Revenue potential · Last touch date · Next action · Probability of closing · Notes · Contract status · Insurance requirements · Promotion commitments

### Partner Pipeline View

Kanban-style board grouped by pipeline stage with:
- Count of studios per stage
- Total revenue potential per stage
- Days since last contact indicator
- Color-coded probability badges

### Studio Launch Checklist

A 4-phase repeatable checklist attached to each studio partner record:

**Phase 1 — Before Signing (5 items)**
- Discovery call completed
- Revenue split discussed
- Capacity confirmed
- Insurance question answered
- Decision maker identified

**Phase 2 — After Signing (8 items)**
- Agreement uploaded
- Booking page created
- QR code created
- Event flyer created
- Studio email copy sent
- Social posts sent
- Waiver link confirmed
- Payment flow tested

**Phase 3 — Before Event (5 items)**
- Registration count checked
- Reminder email sent
- Room setup confirmed
- Equipment packed
- Arrival time confirmed

**Phase 4 — After Event (5 items)**
- Revenue reconciled
- Studio paid
- Follow-up sent
- Testimonials requested
- Next date proposed

Overall and per-phase progress bars are shown. Completed phases are visually distinct.

### Partner Views

| Tab | Description |
|---|---|
| **Active Partners** | Studios at Recurring Partner, First Session Scheduled, or Pilot Completed stage — sorted A–Z. **Default first tab.** Per-row alert icon when no PDF is on the **Agreements** tab; full alert also appears in the header **Alerts** bell. |
| **Pipeline** | Kanban board grouped by pipeline stage |
| **In Outreach** | Studios being actively pursued, sorted by next action date |
| **Revenue Forecast** | All non-lost studios ranked by revenue potential with pipeline total |
| **All Partners** | Every studio sorted A–Z with address, contact name, phone, email, rev share, contract status, and last touch date |

### Partner Record — Agreements Tab

Each studio partner record includes an **Agreements** tab for uploading Studio Partner Agreement PDFs (also accepts Word documents). File metadata is stored on the partner record; the file bytes are kept in separate encrypted storage keys so large PDFs do not blow the main CRM storage quota.

**Upload validation:** Only `.pdf`, `.doc`, and `.docx` files are accepted (max 5 MB). The file extension, browser-reported MIME type, and file header (magic bytes) must all match — mismatched or disguised files are rejected. Browsers that report `application/octet-stream` are accepted when magic bytes match.

**Persistence:** Agreements **save automatically** when uploaded (no separate Save click required). Each file is encrypted and stored under `sb:agreement:v1:{id}`; the partner record stores metadata only (`isPdf`, name, size, upload date).

**Opening files:** PDFs open in a new browser tab via a verified blob URL (not inline HTML). Word documents download instead. Stored files are re-checked before open; files that fail validation cannot be opened.

**View-only mode:** When a partner record is opened read-only (no save handler), upload and remove controls are hidden; existing files can still be opened.

**Missing-agreement alerts:**
- Active partners (Recurring Partner, First Session Scheduled, or Pilot Completed) with **no PDF** on the Agreements tab trigger a **critical alert** in the header **Alerts** bell (next to your profile picture). Each studio is listed separately with a **View** button to open their record.
- A red **AlertCircle** icon also appears next to the studio name on the **Active Partners** tab; hover text: *"Please upload Studio Partner Agreement"*.

### Partner Record — Sessions Tab

Each studio partner record now includes a **Sessions** tab (with a count badge) listing all sessions run at that studio. Each row shows:
- Session name, date, time, attendance count, journey
- Gross Revenue · Studio Split · Net Revenue per session (right-aligned)

A summary bar at the top shows **Total Gross / Studio Split / Total Net** across all sessions for that partner.

### Contact Timeline

Partners have a Contact Timeline tab matching the client timeline's presentation and information richness:

- **email_sent** events from `partner.emailHistory` — shown with blue `Send` icon, displays subject, body preview, and send timestamp.
- Summary items: Emails sent (count), Promotion commitments, Insurance requirements, Notes.
- Fully chronological, same visual design as the client timeline.

The "Emails Sent from CRM" summary card has been removed from the partner **Details** tab — all email history is surfaced exclusively in the Contact Timeline.

---

## Sessions

**Navigation:** Sidebar → Sessions (directly below Command Center, above B2B · Studios)

### Fields Tracked

| Field | Type |
|---|---|
| Session Date | Date |
| Studio / Location | Text |
| Journey Used | Text |
| Status | Planned · Booking Open · Promotion Active · Almost Full · Completed · Follow-Up Pending · Closed Out |
| Capacity | Number |
| Registered | Number |
| Paid Attendees | Number |
| Waivers Completed | Number |
| No-Shows | Number |
| Gross Revenue | Currency |
| Studio Split | Currency |
| Net Revenue | Currency |
| Room Setup Status | Dropdown |
| Music / Headset Setup | Dropdown |
| Testimonials Captured | Checkbox |
| Follow-Up Email Sent | Checkbox |
| Rebook Offer Sent | Checkbox |
| Referrals Requested | Checkbox |
| Breakthrough Noted | Checkbox — triggers testimonial request alert |
| Conversion Result | Text |
| Notes | Textarea |

### Session Checklist Tab

Equipment setup and run checklist items are combined into a single **Session Checklist** tab. Critical items (marked internally) float to the top of each phase section so the most important tasks are always visible first.

#### Virtual Session Checklist Phases

| Phase | Key Items |
|---|---|
| Pre-Session | Camera positioned · Phone on DND · Playlist ready & queued · Strong internet confirmed · Contraindication reminder · Closing script reviewed · Zoom audio/video/screen share tested · Headset charged and tested · Water nearby |
| During Session | Safety monitoring · Facilitation cues |
| Post-Session | Testimonials captured · 24h follow-up sent · Rebook offer made · Referrals requested · Session notes written |

#### Studio Session Checklist Phases

| Phase | Key Items |
|---|---|
| Pack & Equipment | Primary headsets packed & charged · Backup headset · Chargers & power banks · Extension cords · Eye masks · Mats/blankets confirmed |
| Content & Tech | Playlist/journey downloaded offline · Wi-Fi confirmed · Waiver QR code · Check-in list |
| Venue & Day-Of | Arrival time confirmed (45–60 min early) · Room lighting tested · Water & tissues |
| Pre-Session | Room booking confirmed · Capacity communicated · **Technical room setup complete, music and headsets tested** · Room setup confirmed · Emergency contact process · Contraindication reminder |
| Post-Session | Attendance count logged · Revenue recorded · Studio split paid · Testimonials captured · Follow-up sent · Rebook offered · Referrals asked · Notes written |

### Session Performance View

- Revenue per session bar chart
- Attendance rate vs capacity
- Net vs gross comparison
- Conversion rate (attended → purchased follow-on offer)

#### PDF Export — Studio Session Performance

Studio session record drawers include a **"Download PDF"** button on the Performance tab. Clicking it opens a print-friendly page containing:
- Session name, date, time, studio, journey
- Key metrics: attendance, capacity utilization, gross revenue, studio split
- Revenue Breakdown table: **Gross Revenue** and **Studio Split** only (net revenue is excluded to keep the partner-facing view clean)
- Session Notes

The Post-Session Actions and "vs. Your Average" comparison sections are intentionally omitted from the export. All user-supplied values are HTML-escaped before rendering. The generated document includes a strict `Content-Security-Policy`.

#### PDF Export — Participant List (Bookings Tab)

Studio session Bookings tabs include a **"Participant List"** button. Clicking it opens a print-friendly PDF containing:
- Session name, studio name, date, time, and participant count
- Table with: #, Name, Email, Phone, Amount, Status, Waiver status, Payment status
- Cancelled registrations are excluded
- Waiver and payment columns are color-coded (green = confirmed, amber/red = action needed)
- Generation timestamp in the footer

Intended for sharing with the studio partner to show confirmed attendees. All values are HTML-escaped; the document includes an inline CSP.

### Views Available

- **Calendar** — Monthly calendar showing all sessions. **Pill hover text:**
  - *Studio sessions:* `Studio Name — Journey Name — x of x spots remaining`
  - *Virtual sessions:* `Client Name — Journey Name`

  Pills use light-purple B2B styling for studio sessions. Studio detection (`resolveStudioName`) prefers the session's `studioId`, falling back to name-matching in the session name / `locationAddress`. Within each day cell, pills are sorted by session start time (earliest first). The calendar tab has a **dedicated search bar** filtering by client name, studio name, or journey name. The global header search bar is hidden when the calendar tab is active.

- **All Sessions** — Flat list of all sessions sorted by **Booked Date & Time** (newest first, derived from the earliest registration's `createdAt`). Columns: **Booked Date & Time**, **Session Date**, Journey, Studio, Status, Registered, Capacity.
- **Performance** — Revenue and attendance analytics
- **Revenue Leaderboard** — Sessions ranked by revenue
- **Conversion** — Package and offer conversion rates

### Session Record Drawer — Tabs

| Tab | Contents |
|---|---|
| Session Details | All session fields, editable. Layout differs for virtual vs studio sessions (see below) |
| Bookings | All registrants for this session. Each card shows the **session price** paid for that booking. Badge shows `X/Y` (booked/capacity) for studio sessions; summary row shows total session revenue. Studio sessions include a **Download Participant List** PDF button (see below) |
| Session Checklist | Combined equipment + run checklist (replaces separate Equipment Setup and Run Checklist tabs). Critical items float to the top of each phase. Virtual checklist header shows linked **session price**. Virtual and studio checklists have different item sets |
| Performance | Revenue, attendance, conversion metrics |

#### Session Details Tab Layout

The layout of the Session Details tab adapts based on session type.

**Virtual Sessions** show fields in this order:
1. Client name + email card (pulled from registration) with **session price** on the right
2. Date · Time · Duration (mins) — inline row
3. Zoom / Join Link card (clickable link from Calendly)
4. **Room Setup Status · Music/Headset Status** — displayed **side-by-side** on one line, directly below the Zoom link
5. Session Notes
6. Breakthrough Noted
7. Journey Used
8. Status
9. Remaining fields

Fields hidden on virtual sessions: Studio dropdown, Studio Address, Location Type, Zoom/Join URL field, Calendly Event URI, Equipment Needed.

**Studio Sessions** show fields in this order:
1. Date · Time · Duration — inline single row
2. Studio Address (from Calendly location)
3. Studio Contact card (name, role, email, phone — pulled live from the partner record)
4. Registered Attendees (auto-synced from actual booking records — see below)
5. Room Capacity
6. **Room Setup Status · Music/Headset Status** — displayed **side-by-side** on one line
7. Session Notes
8. Breakthrough Noted
9. Remaining fields

Fields hidden on studio sessions: Studio dropdown, Equipment Needed, Zoom/Join URL, Calendly Event URI.

#### Registered Attendees — Live Sync

The **Registered Attendees** field on studio sessions is automatically kept in sync with the actual count of non-canceled registrations in the Bookings tab. Every time the session drawer opens, the field is updated to reflect the real booking count, eliminating discrepancies between manually entered numbers and actual registrations.

#### Bookings Tab
Shows every client registration linked to this session (synced from Calendly or manually linked).

- Studio session Bookings tab badge shows `booked / capacity` (e.g. `2/15`)
- Virtual session Bookings tab badge shows the booked count only

Displays per registrant:
- Name, booking status (booked / attended / canceled / no-show)
- **Session price** (same Calendly event-type amount as Calendly Bookings → All Bookings)
- Waiver status (pending / signed) with warning badges
- Payment status (paid / unpaid / unknown)
- Email, phone, attendance type (virtual / in-person)
- Zoom join link (if virtual)
- Health concerns (flagged in red)
- "How they heard about us"
- Quick-jump arrow to open the client record

#### Calendar Pill Format
- **Studio sessions:** `Studio Name · Journey · X spots left` — rendered in **purple/indigo** (B2B lane color) with a left accent border
  - Border turns **red** when ≤ 3 spots remain
- **Virtual / Private sessions:** `Client Name · Journey Name · $amount` — rendered in **brand blue**
  - Product prefixes like `"9D Breathwork Virtual - "` are automatically stripped from the journey label
- A **color legend** (Studio / Virtual & Private) is shown in the calendar header
- **Studio header in drawer:** Shows `Studio Name — Session Name` above the editable title for quick identification
- **Hover tooltip:** Full session name, studio, client name, and `X of Y spots remaining`

#### Virtual Session Cards — Journey Description ⓘ Icon

A small **ⓘ button** appears in the top-right corner of the session name on **virtual session cards only** (not studio sessions).

- Clicking it opens a clean popup card showing the journey name and full description sourced from **Admin → Journey Descriptions**.
- **Matching logic:** The system performs a partial/containment match between the Calendly event name and the journey description names. For example, the event name `"9D Breathwork Virtual - The Architect Journey"` matches a description named `"The Architect Journey"`. When multiple descriptions match, the longest match wins.
- If no description exists for the journey yet, the popup prompts the user to add one in Admin → Journey Descriptions.
- If no journey is selected on the session, the popup displays "No journey selected".
- **Popup anatomy:** branded header · scrollable body (max-height 220px) · × close button.

#### Calendly-Created Sessions
When a booking arrives via Calendly webhook, a session record is automatically created or updated:
- `name` = Calendly event name
- `journey` = Calendly event name (overrides default)
- `studioId` = auto-matched from partner list (see Studio Auto-Matching below)
- `locationType` / `locationJoinUrl` stored for virtual sessions
- `durationMins` = calculated from Calendly `start_time` and `end_time` (in minutes)
- `locationAddress` = studio address from Calendly physical location
- `calendlyDescription` = Calendly event type description; accessible via the **ⓘ icon** next to the session name in the drawer header — click to expand/collapse the **Studio Event Description** scrollable panel below the title (supports touch scrolling on iPad). On open, the CRM re-fetches the full event-type text from Calendly via `calendlyEventTypeUri` or `calendlyEventUri`, replacing any short preview ending in `...` stored on sync.
- `calendlyEventTypeUri` = Calendly event type API URI; used to fetch the full event description without resolving the scheduled event
- Zoom join URL is written to both `locationJoinUrl` and appended to `notes` for quick reference
- `registered` increments for each new invitee on the same event
- Cancellations decrement `registered`; no-shows update `noShows`
- Session date is computed using **local `Date` methods** (`getFullYear` / `getMonth` / `getDate`) rather than slicing the UTC ISO string, preventing evening bookings (e.g. 5:30 PM PDT = next calendar day in UTC) from landing on the wrong date

#### Studio Auto-Matching & Auto-Creation (`resolvePartner` / `extractStudio`)
Every sync attempt (even when there are no pending events) runs a retroactive pass to set `studioId` on any Calendly session that is missing it.

**Matching logic (`resolvePartner`):**
- Matches partner name only (with `"Sample - "` prefix stripped) — full name must appear in the event name or location address
- City-only matching is intentionally excluded to prevent false positives across studios in the same city (e.g. multiple studios in Walnut Creek)

**Auto-creation (`extractStudio`):**
When a physical in-person booking arrives and no existing partner matches, the sync automatically:
1. Parses the Calendly event name — `"Studio Name - Location"` or `"Studio Name · Journey"` formats are supported
2. Creates a new Studio Partner record with `stage: "Recurring partner"` and a note recording the auto-creation date
3. Links the session and all future bookings for that event to the new partner
4. Prevents duplicates — checks name uniqueness before creating

This means new studios are discovered and added to your CRM the moment the first booking arrives, with no manual setup required.

#### Waiver Auto-Sign
All registrations created via Calendly receive `waiverStatus: "signed"` automatically, since clients accept the waiver during the Calendly booking flow. The "Pending Waivers" view and waiver warning badges only trigger for manually-created registrations.

---

## Offers & Sales Pipeline

**Navigation:** Sidebar → Offers & Sales (Core section)

### Fields Tracked

Client/Studio name · Offer type · Amount · Date offered · Expiration date · Follow-up date · Status · Probability · Source · Notes · Reason lost (if declined)

### Offer Types

Single session · 3-pack · 6-pack · 12-pack · Private session · Studio pilot · Studio recurring agreement · Corporate event · Group event · Referral partner offer

### Statuses

Drafted → Sent → Viewed → Follow-Up Due → Accepted → Paid → Declined → Expired

### Offer Conversion View

- Total offers made vs closed
- Conversion rate by offer type
- Conversion rate by source
- Average days to close
- Revenue by offer type (pie chart)
- Won vs Lost vs Expired breakdown

### Views Available

- **All Offers** — Full table
- **Open Offers** — Active pipeline
- **Expiring Soon** — Expiring within 7 days
- **Offer Conversion** — Analytics view

---

## Follow-Up Engine

**Navigation:** Sidebar → Follow-Up Engine (B2C lane)

### Purpose

Automates post-session communication sequences so that no revenue window is missed after a powerful session experience.

### Default Sequence Timeline

| Day | Action |
|---|---|
| Same day | Thank-you message · Integration reminder · Hydration/rest reminder · Link to next session |
| +1 day | Check-in message · Invite reply |
| +3 days | Offer next step: 3-pack, private session, virtual session |
| +7 days | Testimonial request · Referral ask |
| +14–21 days | Re-engagement message |

### Features

- Sequences are attached to a client and triggered from a completed session.
- Each step shows status: Pending · Sent · Skipped.
- Message Queue view shows all pending actions sorted by due date.
- Overdue steps are highlighted in the Smart Alerts panel.

### Send Email from Message Queue

Each item in the **Message Queue** has a **Send Email** button. All sequence steps use the email channel (SMS/text dispatch is not yet enabled). Clicking **Send Email** opens an inline compose area:

- Template picker dropdown listing all **Template Library** templates (email channel) and all **Follow-Up Engine sequence templates** (custom overrides + FU_STEPS defaults).
- Editable subject and body, pre-populated from the selected template with client variables interpolated.
- On send: email is dispatched via Resend, logged to `data.emailLog`, added to the client's `emailHistory`, and the step is marked complete.

### Follow-Up Section ("Follow-Ups" in sidebar)

The **Due Today** and **All Follow-Ups** tabs display follow-up items as a table with a **Send Email** button column.

- Clicking **Send Email** opens a modal compose window with the same template picker (library + engine templates).
- On successful send: a green **"✓ Email sent"** badge replaces the button. The modal closes automatically after ~900 ms.
- The follow-up item's `outcome` field is set to `"Email sent"` in `data.followups`.
- Items remain visible in **Due Today** after completion (with the badge) rather than being removed, so the completed state is visible in context.

### Message Templates Tab — Template Management

On the **Message Templates** tab of the Follow-Up Engine:

| Action | Behaviour |
|---|---|
| **Email** | Opens `FUTemplateEmailModal` — recipient search (clients + partners), editable subject/body, sends via Resend |
| **Edit** | Inline editing of the template body. Changes saved as overrides in `data.fuTemplates`. A "Reset to default" link restores the original hardcoded text. |
| **Add Template** | Creates a new custom template stored in `data.fuTemplates` with a name and body. |
| **Delete** | Available for custom templates only (not default engine steps). |

---

## Outreach Hub

**Navigation:** Sidebar → Outreach Hub (B2B lane)

### Purpose

Manages proactive studio and referral outreach — separate from the reactive Studio Partner pipeline.

### Fields Tracked

| Field | Type |
|---|---|
| Target Name | Text |
| Target Type | Studio, Individual, Corporate, Event Space, Wellness Brand |
| Contact Status | Not contacted, Contacted, Responded, Meeting booked, Demo offered, Negotiating, Closed, Not interested |
| Outreach Message Used | Text |
| Last Contact Date | Date |
| Next Follow-Up Date | Date |
| Response Status | No response, Positive, Neutral, Negative, Bounced |
| Relationship Warmth | Cold, Warm, Hot |
| Source | Instagram, Referral, LinkedIn, Walk-in, Event, Website, Directory, Other |
| Priority Score | 1–5 |
| Revenue Potential | Currency |
| Notes | Textarea |
| Partner ID | Link to Studio Partner record |

### Smart Filters

- Overdue follow-up
- Hot leads (warmth = Hot)
- No response after first message
- Demo offered
- Agreement pending
- High revenue potential (top 25%)

---

## Revenue Attribution

**Navigation:** Sidebar → Revenue (Core section)

Revenue views are built from **Stripe-verified booking amounts** (when matched) or **Calendly session prices** (`paymentAmount`) plus **accepted/paid offers**. Bookings in `pending_verification` are excluded until Stripe confirms payment. Manual legacy revenue rows in the database are not shown here — this matches Command Center, LTV, and session booking cards.

### Stripe (Payment Reconciliation) View

**Navigation:** Sidebar → **Stripe** (a top-level sidebar item; renders the `payment-reconciliation` layout from the `stripe` section)

| Section | Purpose |
|---|---|
| Unmatched Stripe transactions | Shown **above Stripe charges** only when present. Stripe charges (`status: "paid"`) that no Calendly booking matched (no booking within the match window for that participant). Columns: **Name, Paid, Description, Stripe amount**; rows expand to the same `ChargeDetails` panel. Common causes: test charges, duplicate payments, or a different email between Stripe and Calendly. |
| Stripe charges | One row per **matched** Stripe charge (`status: "paid"`), tied to the Calendly session it paid for. Columns: **Booked**, **Name**, Session, Expected, Stripe, Session amount (sorted by booked date, most recent first). **Free sessions** — bookings created in the last 24h with no Stripe charge tied to them — appear here as synthetic **$0.00** rows with a **Free** badge (display-only; they self-correct to a real charge row if a payment arrives later). **Click a row to expand** a details panel (`ChargeDetails`) showing session date & time, status, paid-at, amount/currency, refunded amount, payment method, tied session, match status, Stripe charge / payment-intent / checkout-session / event IDs, a link to the Stripe receipt, and any notes. |
| Bookings awaiting a Stripe charge | Calendly bookings still in `pending_verification` (booked but no charge tied yet). |
| Refunds | Stripe refund events affecting revenue. |

Use **Sync Stripe now** to load charges from the backend ledger and run reconciliation (also polls every 5 minutes).

**Matching rule (time-based):** A Stripe charge is created the moment a participant books, so the charge time equals the booking time. For each participant (matched by **email**), each unlinked charge is tied to the booking whose time (`createdAt`) is **closest** to the charge time, within a window of `STRIPE_MATCH_WINDOW_MS` (2 days, to absorb webhook/sync lag). The Stripe `amountGross` becomes that booking's `paidAmount` and session amount. List price is kept as *expected*. There is **no manual override** — matching is automatic.

**Self-healing:** Each reconciliation run (on Sync Stripe and on opening the panel) first clears automatic links, then re-matches with the rule above, so a mis-tied charge corrects itself. Any link with `matchStatus: "manual"` (legacy) is preserved.

Each Stripe sync calls `GET /api/stripe/ledger` to reload processed webhook events so payments are not lost after a browser refresh.

**Calendly API backfill:** Each Calendly sync calls `POST /api/calendly/pull-recent` (requires `CALENDLY_API_TOKEN`) to fetch recent scheduled events from the Calendly API and queue any invitees missing from the webhook queue — e.g. when ngrok was down or a webhook was never delivered. The pull fetches **both active and canceled** scheduled events. Cancellations are scanned first (without payment enrichment) so they queue within ~1–2 seconds — well inside the sync's pull timeout — and are reconciled on the same sync; canceled invitees are queued as `invitee.canceled` events. This makes cancellations recover automatically even when no webhook was received, with no reliance on ngrok.

**Cancellation protection:** A re-delivered `invitee.created` event (from a webhook plus an API pull, or a re-queue) never resurrects a registration that is already `canceled` or `rescheduled` back to `booked`; the cancellation status and its `canceledAt` / `cancelReason` / `cancelerType` fields are preserved. This prevents the sync from silently undoing cancellations.

### Revenue Sources

| Source | How it appears |
|---|---|
| Calendly bookings | One row per paid/verified registration — amount = Stripe `paidAmount` when verified, else session price |
| Offers | One row per Accepted/Paid offer — amount = offer price |

Dates use the linked **session date** (bookings) or **close/offered date** (offers).

### Revenue Channels Tracked

Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner

### Per-Record Fields

Each derived booking row shows: Booked Date & Time · client + session name · session date · channel (Studio session / Virtual session) · gross = session price · net (after studio split for studio sessions). Facilitator and Source columns are not shown in this view.

Manual **Revenue** records (gross, Stripe fee, studio split, etc.) remain in the data model for future reconciliation but are not listed in Revenue tab views.

### Analytics Views

- Revenue by channel (bar chart)
- Gross vs net comparison
- Month-over-month trend (area chart)
- Top revenue sources ranked

### Views

- **Revenue Attribution** (tab 0) — stat cards and analytics:
  - Stat cards: **Gross revenue MTD**, **Net revenue MTD**, **Total Session Revenue** (all-time gross), **Total Net Session Revenue** (all-time net after splits)
  - **Revenue waterfall — month to date**: Gross → Processing fees → Studio splits → Refunds → Net. All figures limited to the current calendar month.
  - **P&L by channel — MTD**: Gross, fees, splits, net by session type/source. Data is limited to the current month.
  - **Recently Charged Sessions**: Mirrors the Stripe page — all Stripe charges sorted by `paidAt` (newest first). Columns: Booked Date & Time, Description, Stripe amount, Status.

- **This month** (tab 1) — revenue rows for the current calendar month. Columns: **Booked Date & Time**, Description, Date, Channel, Gross, Fees, Studio Split, Net. Facilitator and Source columns removed.

- **All transactions** (tab 2) — complete revenue history sorted by **Booked Date & Time** (newest first). Columns: **Booked Date & Time**, Description, Date, Channel, Gross, Fees, Studio Split, Net.

### Table Footer Totals

Both the **This month** and **All transactions** table views display footer rows showing gross and net totals for the filtered rows.

**This month** and **All transactions** apply a **70/30 revenue split** on **Studio session** rows: gross = full Calendly session price, studio split = 30%, net = 70% (Simply Breathe). Virtual sessions and offer rows are unchanged (net = gross).

---

## Content Calendar

**Navigation:** Sidebar → Content Calendar (Core section)

### Fields Tracked

| Field | Type |
|---|---|
| Title | Text |
| Body / Caption | Textarea |
| Platform | Instagram, Facebook, LinkedIn, TikTok, YouTube, Email, Blog, Other |
| Category | Client transformation, Breathwork education, Nervous system regulation, Behind the scenes, Studio partner promotion, Founder story, Testimonials, FAQs, Contraindications/safety, Upcoming sessions |
| Status | Idea, Draft, Scheduled, Published, Archived |
| Scheduled Date | Date |
| Reach | Number |
| Likes / Comments / Shares / Saves | Numbers |
| Leads Generated | Number |
| Sessions Promoted | Text |
| Studio Partner Tagged | Text |
| Reused Content | Checkbox |
| Revenue Attributed | Currency |
| Notes | Textarea |

### Views Available

- **Pipeline** — Kanban by status (Idea → Draft → Scheduled → Published)
- **Analytics** — Performance dashboard with funnel, platform breakdown, top posts
- **Calendar** — Table sorted by scheduled date
- **Top Performers** — Posts sorted by engagement or leads
- **Ideas & Drafts** — Filtered view for in-progress content

### Starter Content Prompt

When the Pipeline view is opened and `data.content` is empty, a green prompt is shown with a **"Load sample content"** button. Clicking it inserts 12 pre-built sample posts (`STARTER_CONTENT` constant) covering all status columns (Published, Draft, Scheduled, Idea) across Instagram, TikTok, and Email. Published posts include realistic reach/engagement/leads data so the Analytics view also populates immediately. Content Calendar data is preserved on Reset to Production.

### Content Analytics View

- Content funnel: Ideas → Drafts → Scheduled → Published
- Platform breakdown (reach and post count per platform)
- Category breakdown
- Engagement totals: reach, likes, comments, shares, saves
- Top 5 posts by engagement
- Revenue attribution from content

---

## Testimonial Library

**Navigation:** Sidebar → Testimonials (Core section, first item below B2B and B2C lanes)

### Purpose

Captures and manages testimonials as a long-term sales asset.

### Fields Tracked

| Field | Type |
|---|---|
| Client Name | Text |
| Session Attended | Text |
| Written Testimonial | Textarea |
| Video Testimonial URL | Text |
| Permission Received | Checkbox |
| Can Use on Website | Checkbox |
| Can Use on Social | Checkbox |
| First Name Only | Checkbox |
| Theme | Stress relief, Release, Clarity, Emotional breakthrough, Sleep, Performance, Transformation, Nervous system |
| Best Quote | Text |
| Before Summary | Textarea |
| After Summary | Textarea |
| Status | Requested, Received, Approved, Published, Archived |

### Breakthrough Noted Integration

When a session is marked **Breakthrough Noted**, the Smart Alerts panel generates a reminder to request a testimonial from that client within 5 days while the experience is still fresh.

### Views Available

- **Library** — Visual card layout of published testimonials with best quote highlighted
- **All** — Full table
- **Action Needed** — Testimonials requested but not yet received
- **By Theme** — Kanban grouped by theme

---

## Email / SMS Templates

**Navigation:** Sidebar → Templates (Core section)

### Purpose

Pre-built communication templates that can be copied and sent directly from the CRM.

### 14 Pre-Seeded Templates

| # | Template | Channel | Category |
|---|---|---|---|
| 1 | Studio Outreach | Email | B2B Outreach |
| 2 | Studio Follow-Up | Email | B2B Outreach |
| 3 | Demo Invitation | Email | B2B Outreach |
| 4 | Pilot Proposal | Email | B2B Outreach |
| 5 | Agreement Follow-Up | Email | B2B Outreach |
| 6 | Event Reminder | SMS | Session |
| 7 | Thank-You After Session | Email | Follow-Up |
| 8 | 24-Hour Check-In | SMS | Follow-Up |
| 9 | 72-Hour Offer Follow-Up | Email | Follow-Up |
| 10 | Testimonial Request | Email | Follow-Up |
| 11 | Referral Request | Email | Follow-Up |
| 12 | Rebooking Invitation | Email | Follow-Up |
| 13 | Private Session Offer | Email | Offer |
| 14 | Corporate Inquiry Response | Email | Offer |

### Features

- Filter by category and channel (Email / SMS).
- Search by name or body text.
- Variable highlighting — placeholders like `{{clientName}}`, `{{sessionDate}}`, `{{studioName}}` are highlighted in the preview.
- **Copy** — one-click copy of the raw template to clipboard.
- **Email** — opens a recipient-aware compose modal (see below).
- **Edit** — opens the record drawer to edit name, subject, body, notes, variables, category, channel, and linked-to.
- Message body textarea is expanded (9 rows) for easy reading and editing.

### Email Compose Modal

Clicking **Email** on any template opens a modal that:
1. Shows a **recipient search** box — type a name to search clients and studio partners simultaneously.
2. Selecting a recipient **auto-populates** all variables it can resolve from the record:

| Variable | Source |
|---|---|
| `{{clientName}}` | Client full name |
| `{{firstName}}` | Client first name |
| `{{studioName}}` / `{{referenceStudio}}` | Partner name |
| `{{contactName}}` | Partner contact name |
| `{{email}}` / `{{phone}}` / `{{location}}` | Respective record field |
| `{{avgAttendance}}` / `{{sessionsPerMonth}}` / `{{revSplit}}` | Partner fields |
| `{{lastContactDate}}` | Partner last touch date |
| `{{yourName}}` | Logged-in user's first name |

3. Variables that cannot be auto-filled (e.g., `{{bookingLink}}`, `{{proposedDate}}`) appear as **manual input fields** that stay visible while you type.
4. A **live preview** shows the fully populated message body and subject line. The body is **fully editable** — make last-minute changes before sending. A "Reset to template" link restores the original.
5. **Send Email** — sends the email directly from the CRM via Resend (see below).
6. **Copy message** copies the complete populated text ready to paste into an external email client.

### Direct Email Sending (Resend Integration)

Clicking **Send Email** in the compose modal sends the message immediately via the Resend API without leaving the CRM.

**How it works:**
- The frontend POSTs to `/api/send-email` (authenticated via `x-frontend-secret` injected by proxy).
- The backend validates all fields, strips CRLF from the subject, HTML-escapes the body, and calls `resendClient.emails.send`.
- The sent email is logged to `data.emailLog` (global) and `record.emailHistory` (on the client or partner record).
- For **studio partners**, relevant workflow fields are updated on send: `lastTouch` date is refreshed.
- For **clients** triggered from a session follow-up context, `followUpSent` is marked on the session.
- The **Contact Timeline** for both clients and partners shows `email_sent` events from `emailHistory`.

**Recipient display:**
- For clients, "Send To" shows the client's full name.
- For studio partners, "Send To" shows the **contact name** (e.g. "Mary Smith"), not the studio name.

**Environment variables required (backend/.env):**

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key — required; server logs 503 if missing |
| `RESEND_FROM` | Sender address (default: `jeff@simplybreathe.ai`) |
| `RESEND_REPLY_TO` | Reply-to address (defaults to `RESEND_FROM`) |

**Rate limiting:** `/api/send-email` is gated by a dedicated `emailLimiter` — 10 requests per IP per minute — separate from the general 60 req/min limit.

---

## Referral Tracking

**Navigation:** Sidebar → Referrals (Core section, directly below Testimonials)

### Fields Tracked

Referred-by (client name) · Referred person · Referral date · Status · Did they attend? · Did they buy? · Revenue generated · Thank-you sent · Reward given · Notes

### Referral Tree View

Visual tree showing referral chains — e.g., Dana → Maya → (Maya's referrals). Each node shows revenue generated from that branch.

When any referral is not yet marked completed (`rewardGiven` is false), an **Action needed** banner appears on the Referral Tree tab. The count matches the **Action needed** table view. The banner clears automatically once every pending referral has been marked completed in that view.

### Action Needed View

Table of referrals where **Action Status** is not yet completed. Click **Mark Completed** on each row when follow-up (thank-you, outreach, reward, etc.) is done. Completed rows leave this view and remove the referral from the Action needed banner count.

### Metrics

- Top referral sources ranked by revenue
- Total referral revenue
- Conversion rate (referred → attended → purchased)
- Advocates automatically flagged when referral revenue exceeds threshold

---

## Workflows

**Navigation:** Sidebar → Workflows (Core section)

### Purpose

Visualises the five core business workflows as living pipelines so the CRM runs the business, not just stores records.

### Five Core Workflows

| Workflow | Stages |
|---|---|
| **Client Journey** | Lead → First Session → Repeat Attendee → Package Holder → Advocate |
| **Studio Pipeline** | Target → Outreach → Discovery Call → Demo → Pilot → Recurring Partner |
| **Session Lifecycle** | Planned → Booking Open → Promoted → Delivered → Followed Up → Rebooked |
| **Offer Pipeline** | Drafted → Sent → Viewed → Follow-Up → Closed (Won / Lost) |
| **Referral Pipeline** | Received → Attended → Purchased → Thanked → Tracked |

### Per-Workflow Display

- Stage-by-stage count and value
- Conversion rate between stages
- "Stuck" indicators (records that haven't moved in >7 days)
- KPI summary bar (total active, total value, conversion %)
- Next action prompt for each workflow

---

## Admin

**Navigation:** Sidebar → Admin (Core section)

**Access:** Available to all roles. Owner-only destructive actions (e.g. reset) are gated separately.

The Admin section is the system health and maintenance hub. It gives administrators a live view of database state, full schema documentation, data quality scanning, and storage management — without needing to leave the CRM.

---

### Tab 1 — Overview

A real-time snapshot of the entire system.

#### Summary Stats (4-card row)

| Card | Value |
|---|---|
| Total Records | Sum of all records across all 10 tables |
| Active Users | Number of active user accounts in the security config |
| Data Size | Uncompressed JSON size of all CRM data (KB) |
| Storage Used | Size of the encrypted `localStorage` entry (KB) |

#### Database Tables Table

Full listing of every table with:

| Column | Description |
|---|---|
| Table | Display name and internal key (e.g. `clients`) |
| Lane | B2C · B2B · Core — color-coded badge |
| Records | Current record count. Zero-count tables are flagged in red |
| Fields | Number of schema fields defined for that table |
| Size | Estimated uncompressed size in KB |
| Status | "✓ Has data" (green) or "Empty" (red) |

#### Storage Keys Reference

Displays the two `localStorage` / `window.storage` keys the application uses:

| Key | Purpose |
|---|---|
| `simplybreathe:data:v5:enc` | AES-256-GCM encrypted CRM data payload |
| `sb:security:v1` | User accounts, PIN hashes, wrapped master keys |

#### Encryption Spec Panel

| Setting | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2 · SHA-256 · 600,000 iterations |
| Salt length | 16 bytes, random per user |
| Key model | Envelope encryption — master key wrapped separately per user |
| Data version | v5 |

---

### Tab 2 — Schema Browser

A full, interactive reference for every database table and field in the CRM. No external tool or documentation file is needed.

#### Table Selector

Toggle buttons for all 10 tables. Each button shows the table label and field count. The selected table is highlighted.

#### Field Listing

For each table, every field is listed in a row with:

| Column | Description |
|---|---|
| Field Name | `monospace` internal key (e.g. `grossRevenue`) |
| Type | Color-coded data type badge |
| Required / Optional | Red "Required" or muted "Optional" |
| Description | Plain-language explanation of the field's purpose |

Clicking any row that has a `select` type expands it to show all allowed values as chips.

#### Field Types

| Type | Color | Description |
|---|---|---|
| `string` | Blue | Free-text single-line value |
| `textarea` | Grey | Multi-line free-text |
| `email` | Blue | Email address |
| `number` | Orange | Integer or decimal |
| `currency` | Green | Dollar amount ($) |
| `date` | Purple | ISO 8601 date string (YYYY-MM-DD) |
| `boolean` | Teal | True / false checkbox |
| `select` | Brand green | Enumerated value — expand row for allowed values |
| `array` | Red | Multi-select array of strings |
| `object` | Violet | Nested object (e.g. checklist phases) |

#### Footer Summary

Per-table counts: total fields · required fields · dropdown fields · checkbox fields.

#### Tables Covered

| Table Key | Display Name | Lane | Fields |
|---|---|---|---|
| `clients` | Clients | B2C | 14 |
| `partners` | Studio Partners | B2B | 19 |
| `sessions` | Sessions | B2C | 23 |
| `offers` | Offers | B2C | 11 |
| `revenue` | Revenue | B2C | 15 |
| `referrals` | Referrals | B2C | 11 |
| `content` | Content Calendar | B2C | 20 |
| `outreach` | Outreach Hub | B2B | 14 |
| `testimonials` | Testimonials | Core | 15 |
| `templates` | Templates | Core | 8 |

**Total: 150 documented fields across 10 tables.**

---

### Tab 3 — Data Integrity

On-demand data quality scan across all records in all tables.

#### How to Use

Click **Run Check**. The scanner inspects every record and returns a list of issues sorted by severity. A spinner shows while running. "All Clear" is displayed if no issues are found.

#### Checks Performed

| Table | Check | Severity |
|---|---|---|
| clients | Missing `name` | High |
| clients | No email **and** no phone | Medium |
| partners | Missing `name` | High |
| partners | No `stage` set | Medium |
| sessions | Missing `date` | High |
| sessions | Gross revenue set but `netRevenue` is empty | Medium |
| sessions | Status = Completed but `followUpSent` = false | Low |
| offers | No linked `client` | High |
| offers | `amount` is zero or missing | Medium |
| offers | `expiresOn` is in the past and status is still open | Medium |
| revenue | Missing `date` | High |
| revenue | Neither `gross` nor `net` has a value | Medium |
| referrals | Missing `referrer` name | High |
| testimonials | Missing `client` name | High |
| testimonials | Status = Approved but `permissionRec` is false | High |
| templates | Missing `name` | High |
| templates | `body` is empty | Medium |

#### Results Display

- **Summary row:** Three boxes showing High / Medium / Low counts with color-coded backgrounds.
- **Issue list:** Each issue shows severity badge, table name, field name, and description.
- **Footer:** Total issues found and total records scanned.

---

### Tab 4 — Storage & Backup

#### Export Backup

Downloads a full JSON backup of all CRM data to the local machine.

- File name format: `sbcrm-backup-{today}.json`
- Content: raw unencrypted JSON of all 10 table arrays
- Pre-download summary shows record count and uncompressed size
- A "✓ Backup downloaded" confirmation is shown for 3 seconds after export

> **Security note:** The exported file is unencrypted. Store it securely.

#### Storage Details Panel

Live read of current storage state:

| Field | Value |
|---|---|
| Encrypted store size | Size of `localStorage` encrypted entry |
| Uncompressed data size | Size of all data as plain JSON |
| Total records | Count across all tables |
| Active users | Number of user accounts |
| Logged in as | Current user name |
| Current role | Current user role |

#### Storage by Table — Bar Chart

Horizontal bar chart showing each table's share of total storage:
- Table name, record count
- Size in KB and percentage of total
- Proportional bar colored with brand green

---

### Tab 5 — Settings

System-wide configuration managed by Owners and Admins.

> **Note:** The Breathwork Journeys card that previously appeared here has been removed. Journey management is now handled exclusively in **Tab 6 — Journey Descriptions**.

---

### Tab 6 — Email Logs

A system-wide log of every email attempted from the CRM via Resend — including both successful sends and failures. All five email send paths (Action Email Modal, Follow-Up record inline send, RecordDrawer/Outreach send, Follow-Up Engine step send, FUTemplateEmailModal) write to this log. Failed sends are recorded with `sendStatus: "failed"` and include an `errorMsg` field displayed as a ⚠ indicator in the Send column. The log is a permanent audit trail and is **excluded from Reset to Production**.

#### Columns

| Column | Description |
|---|---|
| Date | ISO timestamp of send |
| Recipient | Contact name and email address |
| Template | Template name and category |
| Send Status | `sent` (green) or `failed` (red) — whether the API call succeeded |
| Delivery Status | `delivered`, `bounced`, `complained`, `opened`, `clicked`, `unknown` — fetched from Resend |

#### Auto-Check on Load

When the Email Logs tab opens, any log entry with `resendId` and no confirmed `deliveryStatus` is automatically queried against `/api/email-status/:id`. Statuses are updated in `data.emailLog` without requiring any user action.

#### Manual Status Refresh

A **Refresh all statuses** button triggers a batch check of all unchecked entries.

#### Row Expansion

Clicking any log row expands it to show:
- Full **Subject** line
- Full **Body** text (as-sent)
- Meta: recipient type, template ID, Resend message ID, send timestamp

#### Controls

- **Clear log** — removes all entries from `data.emailLog`.

---

### Tab 7 — Journey Descriptions

Manages the list of breathwork journeys available in session dropdowns, along with a full description for each journey.

#### Layout

Each journey is displayed as a row with:
- **Name field** — the journey name used in session dropdowns
- **Description textarea** — a large, scrollable/resizable text area for the full journey description

#### Actions

| Action | Behaviour |
|---|---|
| **Add** | Appends a new blank journey row |
| **Edit** | Name and description are editable inline |
| **Remove** | Deletes the journey row |
| **Save** | Writes changes to both `journeyDescriptions` (name + description pairs) and the `journeys` string array used in session dropdowns |

Saving here immediately updates all "Journey Used" dropdowns across session records.

---

### Tab 8 — Reset to Production

Permanently wipes all test/seed data to prepare the app for real production use.

**What gets wiped:** `clients`, `partners`, `sessions`, `registrations`, `payments`, `offers`, `referrals`, `followups`, `sequences`, `expenses`, `revenue`. Partner agreement file blobs in IndexedDB are also removed.

**What is preserved:** `templates`, `fuTemplates` (follow-up template overrides), `content` (Content Calendar posts), `testimonials`, `outreach` (Outreach Hub records), `emailLog` (permanent audit trail), `_settings` (journey descriptions, CRM configuration, dropdown lists), and user accounts/PINs (`secUsers`).

**Integration safety:** Calendly and Stripe webhook subscriptions, backend `.env` secrets, and Resend configuration are unchanged. Pending Calendly and Stripe webhook queues are cleared via `POST /api/integration/clear-queues` so old test events do not re-import on the next sync.

**3-Step confirmation flow:**

1. **Review** — Displays a table showing the current record count in each table to be wiped and a list of what will be preserved.
2. **Type RESET** — User must type the word `RESET` exactly in the confirmation field before proceeding.
3. **Enter PIN** — User must re-enter their admin PIN, verified cryptographically via PBKDF2 `unwrapKeyForUser`. Only on success is the wipe executed.

If the backend is offline during reset, CRM data is still wiped but queue clearing must be done manually (`POST /api/integration/clear-queues` with `x-frontend-secret`, or `DELETE /api/calendly/events` and `DELETE /api/stripe/events` with `x-admin-token`).

---

### Requirements

| Requirement | Detail |
|---|---|
| Access control | All authenticated users can view Admin. Only Owners can export data or reset production. |
| Integrity checks | Non-destructive read-only scan — no data is modified |
| Schema data | Defined in the `DB_SCHEMA` constant in `App.jsx` — must be updated when new fields are added |
| Export format | JSON (not encrypted) — suitable for manual backup and disaster recovery |
| Storage calculation | Encrypted size read from `localStorage` directly; uncompressed size computed via `TextEncoder` |

---

## Expenses

### Purpose
Track all business-related expenditures, import them in bulk via CSV, and have them automatically factored into operating profit and margin calculations alongside session revenue.

### Expense Categories
| Category | Typical Use |
|---|---|
| Equipment & Supplies | Headsets, eye masks, mats, session consumables |
| Software & Subscriptions | Booking platforms, music licensing, design tools, CRM |
| Marketing & Advertising | Paid social ads, print materials, graphic design |
| Travel & Transport | Mileage, parking, transit to/from studios |
| Education & Training | Breathwork certifications, CPD courses |
| Professional Services | Accountant, legal, business coach |
| Insurance | General liability, professional indemnity |
| Administrative | Website hosting, domain, banking fees |
| Studio & Venue | Room hire fees, venue deposits (separate from revenue splits) |
| Other | Miscellaneous business costs |

### Fields Tracked
| Field | Type | Description |
|---|---|---|
| date | Date | Expense date (YYYY-MM-DD) |
| vendor | Text | Payee or vendor name |
| description | Text | What was purchased |
| amount | Number | Cost in USD (no currency symbol) |
| category | Select | One of 10 expense categories |
| paymentMethod | Select | Credit Card, Bank Transfer, Cash, Check, Other |
| taxDeductible | Checkbox | Whether deductible as a business expense |
| recurring | Checkbox | Whether this is a recurring charge |
| recurringFreq | Select | One-time, Monthly, Quarterly, Annual |
| linkedSession | Text | Session ID if attributable to a specific event |
| linkedPartner | Text | Studio partner ID if attributable to a studio |
| receiptUrl | Text | URL or reference to receipt/invoice |
| notes | Textarea | Additional context |

### Views Available
| View | Description |
|---|---|
| Summary | Full analytics dashboard: stats row, category chart, monthly trend, top vendors, profitability panel, CSV import guide |
| All Expenses | Complete table sorted by date (newest first) with footer total |
| By Category | Table sorted by category with footer total |
| Recurring | Filtered to recurring expenses only with footer total |
| Tax Deductible | Filtered to tax-deductible items only with footer total |

### Summary Dashboard
**Stats Row (5 tiles):**
- Expenses MTD — total operating costs for the current month
- Expenses YTD — year-to-date total
- Tax Deductible YTD — deductible portion with percentage
- Recurring / mo — committed monthly fixed costs
- Operating Margin — profit divided by net revenue (MTD)

**Category Breakdown:** Horizontal bar chart showing YTD spend by category with color-coded bars and record counts.

**Monthly Trend:** 6-month bar chart showing expense trajectory.

**Top Vendors:** Ranked list of top 8 vendors by YTD spend.

**Profitability Panel (MTD):**
- Gross Revenue — from completed sessions
- Studio Splits — revenue shared with partners
- Net Revenue — gross minus splits
- Total Expenses — all expenses for the month
- Operating Profit — net revenue minus expenses (red when negative)
- Operating Margin % — profit as a percentage of net revenue

### CSV Import
Expenses can be bulk-imported monthly via the **Import CSVs** sidebar button. Select **Expenses** as the target section.

**Required columns (any order):**
```
date, vendor, description, amount, category, paymentMethod, taxDeductible, recurring, recurringFreq, notes
```

**Column formats:**
- `date` — YYYY-MM-DD (e.g. `2026-06-15`)
- `amount` — number only, no $ sign (e.g. `49.99`)
- `category` — must exactly match one of the 10 allowed categories
- `taxDeductible` / `recurring` — `true` or `false`
- `recurringFreq` — `One-time`, `Monthly`, `Quarterly`, or `Annual`

Compatible with CSV exports from QuickBooks, Wave, Xero, or any bank statement with renamed headers.

### Integration with Revenue Calculations
Expenses feed into two places:
1. **Pipeline Snapshot** (Dashboard) — two new tiles: "Expenses MTD" and "Operating Profit MTD"
2. **`derived` computed values** — `expensesMTD`, `expensesYTD`, `netRevMTD`, `opProfit`, `opMargin` available throughout the app

`netRevMTD` is calculated using `buildRevenueViewRows` → `applyStudioSessionSplit` → `calcNet` for the current calendar month. This deducts the 30% studio split on studio sessions before computing net. The **Profitability Panel** on the Expenses Summary tab uses this same pipeline: Gross Revenue (session prices MTD) − Studio Splits − Total Expenses = Operating Profit. Operating Profit MTD will be negative when expenses exceed net revenue.

### Requirements
| Item | Detail |
|---|---|
| Data key | `expenses` array within the encrypted store |
| Constants | `EXPENSE_CATEGORY`, `EXPENSE_CATEGORY_COLOR`, `EXPENSE_PAYMENT_METHOD`, `EXPENSE_RECUR_FREQ` |
| Component | `ExpenseSummaryView` (inline in `App.jsx`) |
| Navigation | Listed under B2C lane in sidebar |
| Seed data | 10 example records covering common expense types |

---

## Calendly Integration

### Overview
Simply Breathe OS integrates with Calendly via a lightweight Node.js/Express webhook backend. When a client books a session in Calendly, the CRM automatically creates or updates the client record, creates a session record, creates a Calendly registration record, and queues follow-up tasks — with no manual data entry required.

### Architecture

```
Calendly → POST /api/webhooks/calendly (backend/server.js)
         → pending-events.json queue
         → React CRM polls GET /api/calendly/pending every 5 min
         → Runs retroactive studio-matching pass on all sessions
         → Processes new events → updates data state
         → POST /api/calendly/acknowledge (marks events done)

Stripe   → POST /api/webhooks/stripe (backend/server.js)
         → stripe-pending-events.json queue
         → React CRM polls GET /api/stripe/pending every 5 min
         → Matches payments to Calendly bookings (email + amount + 30 min window)
         → POST /api/stripe/acknowledge (marks events done)
```

Calendly creates bookings with **expected session price** and `paymentStatus: pending_verification`. Stripe webhooks are the **source of truth** for amount paid, payment status, refunds, and Stripe IDs once matched.

The Vite dev server proxies all `/api` requests to `http://localhost:3001`, avoiding CORS entirely.

### Backend (`backend/server.js`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/webhooks/calendly` | POST | Receives Calendly events; verifies HMAC-SHA256 signature if signing key is configured |
| `/api/calendly/pending` | GET | Returns unprocessed events for the CRM to consume |
| `/api/calendly/acknowledge` | POST | Marks event IDs as processed. Each `id` element validated as non-empty string ≤ 100 chars. |
| `/api/calendly/payment-lookup` | POST | Fetches invitee payment amounts from Calendly API for up to 25 invitee URIs (used to backfill **Amount** on existing bookings) |
| `/api/webhooks/stripe` | POST | Receives Stripe payment events; verifies HMAC-SHA256 signature if `STRIPE_WEBHOOK_SECRET` is configured |
| `/api/stripe/pending` | GET | Returns unprocessed Stripe payment events for the CRM to consume |
| `/api/stripe/acknowledge` | POST | Marks Stripe queue event IDs as processed |
| `/api/integration/clear-queues` | POST | Clears Calendly and Stripe pending webhook queues (Reset to Production; requires `x-frontend-secret`) |
| `/api/calendly/events` | GET | All events (debug/admin) |
| `/api/calendly/events` | DELETE | Clear Calendly queue (admin) |
| `/api/stripe/events` | DELETE | Clear Stripe queue (admin) |
| `/api/send-email` | POST | Sends an email via Resend. Requires `to`, `subject`, `body` (and optional `recipientName`). Rate-limited to 10 req/min. |
| `/api/email-status/:id` | GET | Fetches delivery status for a Resend message ID. `id` validated against `/^[a-zA-Z0-9_-]{1,100}$/`. |
| `/health` | GET | Returns `{ status: "ok" }` — does not expose server uptime |

**Environment variables (`backend/.env`):**
- `PORT` — server port (default 3001)
- `CALENDLY_WEBHOOK_SIGNING_KEY` — HMAC signing key from Calendly webhook subscription; **required in production** (server refuses to start without it); if blank in dev, signature verification is skipped with a loud warning
- `ALLOWED_ORIGINS` — comma-separated CORS origins (default `http://localhost:5173`)
- `FRONTEND_SECRET` — shared secret for `/pending` and `/acknowledge` endpoints. **Required in production** (server exits if missing). Generate with `openssl rand -hex 32`. Injected server-side by the Vite proxy (dev) or reverse proxy (production).
- `ADMIN_SECRET` — token required for debug endpoints (`GET/DELETE /api/calendly/events`, `GET/DELETE /api/stripe/events`). Pass as `x-admin-token` header.
- `QUEUE_ENCRYPTION_KEY` — 32-byte hex key for AES-256-GCM encryption of `pending-events.json` at rest. Generate with `openssl rand -hex 32`. **Required in production** (server refuses to start without it); if blank in dev, queue is stored as plaintext with a loud warning.
- `CALENDLY_API_TOKEN` — Calendly Personal Access Token (from Calendly → Integrations → API & Webhooks). Required for event type description fetching and payment amount backfill. See `backend/.env.example`.
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (`whsec_...`) from Stripe Dashboard → Developers → Webhooks. **Required in production** (server exits if missing).
- `TRUST_PROXY` — Set to `1` when behind ngrok/nginx/Caddy so rate limiting uses the real client IP. Omit when binding directly to port 3001 on a public interface.
- `RESEND_API_KEY` — Resend API key for direct email sending. Server logs a warning at startup if missing and returns 503 on any send attempt.
- `RESEND_FROM` — Sender address (default: `jeff@simplybreathe.ai`). Must be a verified Resend domain.
- `RESEND_REPLY_TO` — Reply-to address for outbound emails (defaults to `RESEND_FROM`).

**Frontend environment variables (`frontend/.env`):**
- `VITE_CALENDLY_BACKEND` — base URL for the backend API. Defaults to `""` (empty string) for local dev, which causes all `/api` requests to route through the Vite proxy. Set to the full backend URL in production deployments.

**Backend Security Features:**
- Rate limiting: 60 req/min on all `/api/` endpoints; 30 req/min on the webhook endpoint; **10 req/min on `/api/send-email`** (dedicated email limiter)
- Helmet middleware with explicit CSP, HSTS (production), CORP, COOP on every response
- Request body size capped at 256 KB
- Webhook HMAC-SHA256 signature verified with 5-minute timestamp replay protection
- Queue file encrypted at rest with AES-256-GCM when `QUEUE_ENCRYPTION_KEY` is set
- `/pending` and `/acknowledge` require `x-frontend-secret` header injected by Vite proxy (never sent directly from browser code)
- Webhook string fields sanitized via `Sec.sanitize()` before storage (strips HTML and formula injection)
- SSRF guard: `fetchEventTypeDescription` rejects any `event_type` URI that does not begin with `https://api.calendly.com/`
- Queue capped at **1,000 events**; processed events older than **7 days** are automatically purged on each write
- Startup validation: server exits with code 1 in production if `CALENDLY_WEBHOOK_SIGNING_KEY`, `QUEUE_ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`, or `FRONTEND_SECRET` are missing
- Stripe payment auto-match uses **email + booking time** (not amount); Stripe gross always becomes session price on match. Run `npm run test:stripe-match` to verify.

### Supported Calendly Events

| Event | CRM Action |
|---|---|
| `invitee.created` | Create/update client · upsert session · create registration · create 3 follow-up tasks |
| `invitee.canceled` | Set registration status to `canceled` (or `rescheduled` if `payload.rescheduled = true`) · decrement session registered count |
| `invitee_no_show.created` | Set registration `noShow: true`, status `no_show` · increment session noShows |
| `invitee_no_show.deleted` | Revert no-show flag · decrement noShows |

### Client Deduplication
Email address (normalized to lowercase) is the primary deduplication key. On `invitee.created`:
- **New email** → creates client with `source: "Calendly"`, `status: "Booked"`
- **Existing email** → updates name, phone, next session date, status (Lead → Booked)

**Lifetime value:** After each Calendly or Stripe sync (and payment backfill), LTV is recalculated for every client with at least one registration record. The total is the sum of:
- **Stripe-verified** booking amounts (`paidAmount` minus refunds) when `stripeVerified` is true; otherwise Calendly **session price** (`paymentAmount`) on paid registrations (excludes `pending_verification`, unpaid, failed)
- Client-linked **Revenue** records (`gross` minus `refunds`)
- **Offers** with status `Paid` or `Accepted`

Clients without any registration records keep their manually entered LTV unchanged.

### Registrations Data Table
Each individual Calendly booking is stored as a `registration` record:

| Field | Description |
|---|---|
| `clientId` | Links to the client record |
| `sessionId` | Links to the auto-created session record |
| `calendlyInviteeUri` | Unique Calendly invitee identifier (used for deduplication/upsert) |
| `calendlyEventUri` | Unique Calendly event identifier (groups bookings into one session) |
| `eventName` | Calendly event type name |
| `status` | `booked` · `attended` · `canceled` · `rescheduled` · `no_show` |
| `paymentAmount` | Session list price — the Calendly **Payment required amount** for that event type. Calendly’s API does not expose this field directly; the CRM reads it from the event type **Internal Note** (e.g. `Studio` + `$55`) via the Calendly API, matching how studio cards on the website show price |
| `paidAmount` | Actual amount paid — from **Stripe** once matched; Calendly invitee `payment.amount` is unreliable when Stripe checkout is external |
| `paymentStatus` | `paid` · `pending_verification` · `unmatched` · `unpaid` · `partial_refund` · `refunded` · `failed` · `unknown` — paid sessions start as `pending_verification` until Stripe confirms; `unmatched` when no Stripe charge exists for the client email |
| `stripeVerified` | Boolean — true when a Stripe payment has been linked to this booking |
| `stripePaymentIntentId` | Stripe PaymentIntent ID (`pi_...`) when matched |
| `stripeChargeId` | Stripe Charge ID (`ch_...`) when matched |
| `paymentId` | Links to a record in the `payments` table |
| `paidAt` | ISO timestamp from Stripe when payment succeeded |
| `amountRefunded` | Refunded amount from Stripe refund webhooks |
| `lastAmountMismatch` | When Stripe paid ≠ Calendly expected price: `{ expectedAmount, stripeAmount, correctedAt }` — `paymentAmount` is updated to Stripe |
| `waiverStatus` | `pending` · `signed` |
| `createdAt` | ISO 8601 timestamp when the booking was created (from Calendly `created_at`, webhook receipt time, or manual entry) |
| `scheduledAt` | ISO 8601 start time |
| `timezone` | Invitee's timezone |
| `locationType` | `zoom` · `physical` · `custom` · `phone` |
| `locationJoinUrl` | Zoom or virtual meeting link |
| `doneBreathworkBefore` | Custom question answer |
| `howHeard` | Custom question answer |
| `referredBy` | Custom question answer |
| `concerns` | Health/emotional concerns from custom questions |
| `reviewedContraindications` | Custom question answer |
| `attendanceType` | Virtual or in-person |
| `locationAddress` | Physical address of the studio/venue from Calendly |

### Payments Data Table

Each Stripe payment event processed by the CRM is stored as a `payment` record:

| Field | Description |
|---|---|
| `clientId` | Linked client (set on auto- or manual-match) |
| `bookingId` | Linked registration ID |
| `sessionId` | Linked session ID |
| `provider` | `stripe` |
| `stripePaymentIntentId` | Stripe PaymentIntent ID |
| `stripeChargeId` | Stripe Charge ID |
| `stripeCheckoutSessionId` | Stripe Checkout Session ID (when applicable) |
| `stripeEventId` | Stripe webhook event ID |
| `customerEmail` | Payer email from Stripe |
| `amountGross` | Amount paid (USD dollars) |
| `amountRefunded` | Cumulative refunded amount |
| `currency` | ISO currency code (default `usd`) |
| `status` | `paid` · `failed` · `refunded` · `partial_refund` |
| `matchStatus` | `auto` · `manual` · `needs_review` · `unmatched` |
| `matchScore` | Confidence score (email + booking time window) |
| `paidAt` | Payment timestamp from Stripe |
| `receiptUrl` | Stripe receipt URL when available |

### Stripe Webhook Matching (Option 1)

On `checkout.session.completed` or `payment_intent.succeeded`, the CRM auto-matches using `src/stripeMatching.js`:

1. **Email** must match the booking client email (also read from Stripe `metadata` when charge email is absent).
2. **Amount is not used for matching** — Calendly `paymentAmount` is the list price; after match, **Stripe `amountGross` replaces it** as the tracked session price and revenue.
3. **Time** — when multiple pending bookings share an email, payment must fall within **24 hours** of booking `scheduledAt` / `createdAt` (up to **7 days** fallback for closest match).
4. **Single** pending booking for an email auto-links regardless of amount (e.g. $1 test payment vs $55 Calendly list price).

Multiple candidates with equal score → **needs review**. Otherwise → **unmatched**.

Unit tests: `npm run test:stripe-match`

Refund events (`charge.refunded`, `charge.refund.updated`) update linked payment and registration refund fields.

### Event Type Description Fetching

When a webhook arrives, the backend calls `GET /event_types/{uuid}` on the Calendly API to retrieve the event type description and stores it on the session record as `calendlyDescription`. The webhook’s `scheduled_event.description` is only a short preview (often ending in `...`) — the full text always comes from the event type API.

**On-demand fetch:** `GET /api/calendly/event-description` accepts any of:
- `eventTypeUri` — direct Calendly event type URI (stored on session as `calendlyEventTypeUri`)
- `eventUri` — scheduled event URI (resolved to event type on the backend)
- `eventName` — fallback match against your Calendly event type names (e.g. `Indiga Yoga - Walnut Creek, CA`)

Requires `CALENDLY_API_TOKEN` in `backend/.env`. Restart the backend after changing env vars or deploying code changes.

| Detail | Value |
|---|---|
| Trigger | Each `invitee.created` or `invitee.canceled` webhook; also when opening the ⓘ panel in the session drawer |
| API call | `GET https://api.calendly.com/event_types/{uuid}` (or list + name match) |
| Auth | Bearer `CALENDLY_API_TOKEN` |
| Caching | In-memory per event type UUID — successful fetches only; failures are not cached |
| Env var required | `CALENDLY_API_TOKEN` in `backend/.env` (see `backend/.env.example`) |

If `CALENDLY_API_TOKEN` is not set, the description is left blank and no API call is made.

The description is surfaced in the studio session drawer as **Studio Event Description** via the **ⓘ icon** next to the session name, and also powers the **Journey Description ⓘ popup** on virtual session cards (see Virtual Session Cards section above).

### Calendly Bookings Sidebar Section
**Navigation:** Sidebar → Calendly Bookings

Views (all sorted by session date/time, newest first; uses `scheduledAt`, falling back to linked session date/time when empty — except **All Bookings**, which sorts by `createdAt`, newest first):
- **All Bookings** — Scrollable list of all registrations (most recent first). Columns: **Calendly Amount**, Client, Session, Session Date/Time, Status, Payment Status. **Click any row to expand** a detail panel showing: client email, session type, journey, location, booking source, intake answers, payment status, Calendly amount, raw payment notes, event URI, invitee URI, and created date. The Waiver and Booked Amount columns have been removed from this view. For **canceled / rescheduled** rows the panel also shows Cancelled on, Cancelled by, and Cancel reason; **rescheduled** rows additionally show **Original session time** and **Rescheduled to** (the new time, resolved from Calendly's `new_invitee` link — see Reschedule Linking below). Expanded-panel text wraps cleanly (the expanded cell overrides the table's `white-space: nowrap`).
- **Pending Waivers** — active registrations where waiver is not yet signed
- **Unpaid** — active registrations with unpaid status
- **Cancellations** — canceled and rescheduled registrations

#### Reschedule Linking
When a booking is rescheduled, Calendly cancels the original invitee (`invitee.canceled` with `rescheduled: true`) and creates a new invitee for the new time (`invitee.created`). The two are linked via Calendly's `new_invitee` (on the canceled side) and `old_invitee` (on the new booking). Both are captured into the queue event and stored on the registration as `rescheduledToInviteeUri` (on the rescheduled record) and `rescheduledFromInviteeUri` (on the new booking). The All Bookings expanded panel uses these links to show the original and new session times for a rescheduled booking; if the new booking has not synced yet it shows "Not synced yet".

### Auto-Created Follow-Up Tasks
On each new `invitee.created` event, 3 follow-up tasks are created for the client (if not already existing):
1. "Send same-day session confirmation/check-in" — due on session date
2. "Send 24-hour post-session follow-up" — due day after session
3. "Send 72-hour rebooking or package offer" — due 3 days after session

### Sync Status Indicator
A read-only status line at the bottom of the sidebar auto-syncs every **5 minutes**. Hovering it shows a tooltip with the exact record count and time of the last sync.

On the **Calendly Bookings** page header, a **refresh icon** (↻) manually pulls pending bookings from Calendly immediately. The icon spins while a sync is in progress and is disabled until the sync completes.

| State | Display | Hover tooltip |
|---|---|---|
| Syncing | Spinning icon + "Syncing Calendly…" | "Sync in progress…" |
| Synced with new data | "**N records synced**" + last sync time | "Last received: [full date/time] · N bookings received from Calendly" |
| Synced, nothing new | "Calendly up to date" + last sync time | Last-received info persists from previous non-zero sync; if none yet: "No bookings received yet this session — syncs every 5 minutes" |
| Events queued | "**N bookings pending…**" | "N bookings queued — will sync within 5 minutes" |
| Initial load | "Calendly sync active" | "Syncs automatically every 5 minutes" |

The "last received" timestamp only updates when bookings are actually received (count > 0), so it always reflects the most recent time new data came in — not the last time a sync ran.

The retroactive studio-matching pass runs on every sync cycle regardless of whether new events are pending.

### Startup Scripts
Two scripts in the project root start all services in one step:

| File | Usage |
|---|---|
| `start.bat` | **Double-click** in Windows Explorer — bypasses PowerShell execution policy |
| `start.ps1` | Run `.\start.ps1` in a PowerShell terminal |

Both scripts:
1. Check Node.js is installed; abort with instructions if not
2. Check ngrok is installed; skip tunnel gracefully if not (prints install command)
3. Auto-copy `backend/.env.example` → `backend/.env` if missing
4. Run `npm install` in both root and `backend/` if `node_modules` is absent
5. Create `backend/data/` directory if missing
6. Open three labelled terminal windows: `SB Backend :3001`, `SB Frontend :5173`, `SB ngrok tunnel`
7. Print all local URLs and remind you to register the ngrok URL in Calendly

### Setup Requirements
1. Double-click `start.bat` (or run `.\start.ps1`)
2. Register webhook URL shown in the ngrok window in Calendly Dashboard → Integrations → Webhooks
3. Add signing key from that subscription to `backend/.env` as `CALENDLY_WEBHOOK_SIGNING_KEY`

See `backend/README.md` for manual setup instructions.

---

## Navigation & Layout

### Sidebar Structure

Sections are grouped into three visual lanes rendered in this order:

- Today (Command Center) — pinned at top
- Sessions — pinned directly below Command Center, above B2B

**B2B — Studio Partners** (teal left border accent)
- Studio Partners
- Outreach Hub

**B2C — Personal Clients** (brand left border accent)
- Clients
- Follow-Ups
- Follow-up Engine

**Core — Operations** (no accent, always visible)
- Testimonials
- Referrals
- Offers & Sales
- Revenue
- Expenses
- Workflows
- Calendly Bookings
- Content Calendar
- Templates
- Admin
  - User Management *(nested sub-item, expands when Admin is active)*

> **Note:** User Management is a collapsible child of Admin. The Admin nav item shows a chevron indicator; clicking Admin or User Management automatically expands the group.

### Record Editing — Modal Popup

Clicking any record (or the **New** button) opens a **centered modal popup** rather than a side panel. The modal features:
- A gradient accent stripe at the top (brand color)
- Rounded corners (20px radius) with a rich drop shadow
- Pop-in animation (scale + fade)
- Standard width: **700px** (max 96vw); wide mode for Contact Timeline: **900px**
- Max height **90vh** — header and footer always visible; body scrolls independently
- Clicking the semi-transparent backdrop closes without saving

### Header

Each page has a sticky header with:
- Page title
- Lane badge (B2C / B2B) if applicable
- Search bar
- "New" button (permission-gated)
- Profile avatar (top-right)

### Confirmation Modal

All destructive or irreversible actions (logout, deactivate user) use a **custom confirmation modal** instead of the browser's native `confirm()` dialog. The modal:
- Displays an icon in a soft blue circle (brand color palette — consistent with the rest of the UI)
- Shows a bold action title and descriptive message
- Offers **Cancel** and a primary action button (brand blue)
### Profile Avatar Dropdown

Click the avatar in the top-right to open the dropdown:
- User name, title/role, email, last login
- **Edit Profile** — opens profile modal
- **Manage Users** — shortcut (Owner/Admin only)
- **Log Out** — with confirmation prompt

### Responsive Design

- Sidebar collapses to off-canvas on screens ≤860px wide
- Hamburger menu in header on mobile
- Grid layouts collapse from multi-column to single column
- Stats grids adapt to 2-column on medium screens

---

## Data Import / Export

### CSV Import

- Available for: Clients, Studio Partners, Sessions, Offers, Referrals, Content, Outreach, **Expenses**
- Expenses can also be imported directly via the **Upload Expense CSV** button on the Expenses → Summary page (appends rows; does not replace existing data)
- Drag-and-drop or file picker via the global **Import CSVs** sidebar button
- PapaParse used for CSV parsing
- Formula injection and HTML stripped on import
- Duplicate detection by name/email

### CSV Export

- Any table view can be exported to CSV
- Exported file is named `{section}-{date}.csv`
- All monetary values exported as plain numbers

---

## Profile & Account

### Edit Profile Modal

Accessed via the avatar dropdown → Edit Profile. Two tabs:

**Profile Tab**
- Upload profile photo (auto-resized to 240px JPEG, ~82% quality)
- Remove photo (reverts to initials)
- Avatar color picker (10 color swatches, shown when no photo)
- Full Name (required)
- Title / Role (display label, e.g. "Lead Facilitator")
- System Role (read-only display)
- Email
- Phone

**Security Tab**
- Change PIN (requires current PIN, minimum 4 characters, confirmation match)
- On PIN change, master key is re-wrapped with the new PIN

### Where Photos Appear

- Lock screen user tiles
- Lock screen "change user" back button
- Header avatar button (top-right)
- Profile dropdown header

Profile photos use `position: absolute; inset: 0; object-fit: cover` so the image fills the entire circle with no background gap or color bleed.

---

## Seed Data

The application ships with pre-populated sample data to demonstrate all features:

| Section | Records |
|---|---|
| Clients | 8 |
| Studio Partners | 6 |
| Sessions | 6 |
| Offers | 8 |
| Follow-Up Sequences | 4 |
| Outreach | 7 |
| Revenue | 8 |
| Content | 10 |
| Testimonials | 5 |
| Templates | 14 |
| Referrals | 5 |

Seed data is loaded on first run only. All subsequent loads use the encrypted stored data.

---

## Staging Environment

The app is **local-only** (not externally hosted). Staging is a **second GitHub repo** used to hold work-in-progress code before it is merged into production.

| | Production | Staging |
|---|---|---|
| GitHub | `nlmcoaching/SBCRM` (`origin`) | `nlmcoaching/SBCRMSTAGING` (`staging`) |
| Branch | `master` | `staging` |

**Workflow:** Develop on `staging` branch → test locally → `git push staging staging` → when ready, merge into `master` and `git push origin master`.

See **STAGING.md** for the full branch workflow and commands.

---

## Technical Architecture

### File Structure

```
simply-breathe-app/
├── backend/                     # Calendly webhook backend (Node.js/Express)
│   ├── server.js                # Webhook endpoint + event queue API
│   ├── package.json
│   ├── .env.example             # Environment variable template
│   ├── .env                     # Local config (gitignored)
│   ├── README.md                # Backend setup instructions
│   └── data/
│       └── pending-events.json  # Event queue (gitignored)
├── public/
│   ├── sb logo.png              # Sidebar logo
│   ├── sb-heart-wave.png        # Lock screen logo
│   └── favicon.ico
├── src/
│   ├── App.jsx                  # All components, logic, styles (single-file architecture)
│   └── index.css                # Global CSS + responsive rules
├── vite.config.js               # CSP headers, Vite proxy (/api → localhost:3001)
├── package.json
├── start.bat                    # Double-click launcher (Windows, bypasses PS execution policy)
├── start.ps1                    # PowerShell startup script (backend + frontend + ngrok)
├── DOCUMENTATION.md
└── USER_GUIDE.md
```

### Key Constants

| Constant | Purpose |
|---|---|
| `C` | Color palette (brand, surface, ink, line, etc.) |
| `FONT` | Typography (display, body) |
| `LANE` | B2C / B2B visual theme config |
| `SEED` | Default data for first run |
| `FIELDS` | Dynamic form schema per section |
| `VIEWS` | View definitions (table, kanban, custom) per section |
| `STORE_KEY_ENC` | `simplybreathe:data:v5:enc` — encrypted data key |
| `SEC_META_KEY` | `sb:security:v1` — security/user config key |
| `CALENDLY_BACKEND` | Resolved from `VITE_CALENDLY_BACKEND` env var — base URL for backend API (defaults to `""` for local dev, using Vite proxy) |

### State Management

All state is managed via React `useState` and `useMemo` in the root `App` component and passed down as props. No external state library is used.

### Key Components

| Component | Purpose |
|---|---|
| `App` | Root — auth gate, layout, data state |
| `LockScreen` | PIN login, user tile selection |
| `Today` | Dashboard with stats, alerts, NBA |
| `ActionEmailModal` | Relationship NBA email compose — template dropdown, pre-filled recipient, editable subject/body, send via Resend |
| `Section` | Dynamic view renderer for all data sections |
| `RecordDrawer` | Slide-in detail/edit panel |
| `EditProfileModal` | Profile photo + info + PIN change |
| `UserManagementView` | Multi-user CRUD and permissions |
| `AdminView` | 8-tab admin panel: overview, schema browser, integrity check, storage, settings, email logs, journey descriptions, reset to production |
| `JourneyDescriptionsTab` | Admin tab for managing journey names and descriptions (add / edit / remove) |
| `SessionBookingsTab` | Bookings tab inside session drawer — lists all Calendly registrants with session price per card |
| `WorkflowsView` | Five workflow pipeline visualizations |
| `TemplateLibraryView` | Template browsing, copy, and direct email send via Resend |
| `EmailLogsView` | Admin Email Logs tab — system-wide sent email log with delivery status auto-check and row expansion |
| `FollowUpSendButton` | Reusable Send Email button used in Due Today / All Follow-Ups table rows — opens compose modal, marks follow-up complete on send |
| `FUTemplateEmailModal` | Email compose modal for Follow-Up Engine → Message Templates tab |
| `TestimonialLibraryView` | Testimonial cards and action tracking |
| `ContentAnalyticsView` | Content funnel and performance |
| `FollowUpEngine` | Sequence management and message queue |
| `PartnerLaunchChecklist` | 4-phase studio onboarding checklist |
| `PartnerAgreementsTab` | Agreements tab in partner drawer — validated upload/view/remove of PDF or Word agreements (magic-byte checks; blob URL open for PDFs) |
| `EquipmentChecklist` | Per-session gear and setup checklist |
| `PipelineSnapshot` | 9-metric business overview panel |
| `AlertsPanel` | Smart alert list with severity and actions |
| `ImportModal` | CSV import with parsing and validation |

### Security Utilities (`Sec` object)

```js
Sec.hashPin(pin)                          // SHA-256 PIN hash
Sec.newSalt()                             // 16-byte random base64 salt
Sec.deriveKey(pin, saltB64)               // PBKDF2 (600,000 iterations) → AES-GCM CryptoKey
Sec.encrypt(data, key)                    // AES-256-GCM encrypt → base64
Sec.decrypt(b64, key)                     // AES-256-GCM decrypt → object
Sec.generateMasterKeyB64()                // Random 256-bit master key
Sec.importMasterKey(b64)                  // Import raw key as CryptoKey
Sec.wrapKeyForUser(masterKeyB64, pin, salt)   // Encrypt master key for user
Sec.unwrapKeyForUser(wrappedB64, pin, salt)   // Decrypt master key for user
Sec.hmacSession(masterKeyRaw, userId)     // HMAC-SHA256 session token sig (tamper protection)
Sec.verifySession(masterKeyRaw, userId, sig)  // Verify session token sig; returns false on mismatch
Sec.sanitize(val)                         // Strip formulas and HTML from CSV input and Calendly webhook fields
Sec.validate(data)                        // Schema validation on load
```

---

### Login Redirect

After a successful PIN login (both first-time setup and explicit logins), the app navigates to the **Today — Command Center** dashboard (`section = "today"`, `view = 0`). However, if the session is restored automatically on a browser refresh (via the `sb:session:v1` token), the app instead returns the user to the exact section and tab they were on before the refresh, as stored in `sb:nav:v1`.

---

*Documentation updated June 2026 (v9.4). Simply Breathe OS is a living system — update this document as features are added.*
