# Simply Breathe OS — CRM Documentation

> **Version:** 9.2 (June 2026)
> **Stack:** React 18 · Vite · Recharts · Lucide React · PapaParse · Node.js/Express (backend)
> **Storage:** Browser **IndexedDB** (encrypted) + Cursor canvas `window.storage`, with `localStorage` as a last-resort fallback
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

> **Deployment model:** Simply Breathe OS is a **single-operator local app** by default. Additional user accounts are disabled until an Owner enables **Multi-user access** in Admin → Settings. Even then, roles are **not a data boundary**: all PIN users share one AES master key and can decrypt the full CRM after unlock. What *is* enforced server-side: refund and send-email APIs require a PIN-minted session whose `canEdit` bit was registered with the backend (Viewers cannot call those endpoints). Do not expose the CRM or backend to untrusted users or the public internet without additional hardening.

### PIN-Based Lock Screen

- The app launches into a full-screen lock screen on every visit.
- Users select their name tile then enter their personal PIN.
- Single-user installs auto-select the user and go straight to PIN entry.
- The heart-wave Simply Breathe logo is displayed prominently on the login screen.

### Session Persistence

After a successful PIN login, the master key, user ID, and a per-login restore token are saved to **`sessionStorage`** (`sb:session:v1`). On the next page load (e.g. browser refresh), the app validates the token (see Session Token Integrity below), re-imports the master key, decrypts the data, and restores the session automatically — no PIN re-entry required.

- `sessionStorage` is scoped to the browser tab; closing the tab or window clears the session, requiring PIN entry on next open.
- The last-visited section and tab view are also saved to `sessionStorage` (`sb:nav:v1`) while the user is logged in, so a refresh returns to the same page rather than the Command Center.
- Both keys are cleared on explicit logout and on idle auto-lock.
- Idle auto-lock (15 minutes) calls the same wipe as logout: clears `cryptoKey`, `masterKeyRaw`, decrypted CRM `data`, refund session token, and `sessionStorage` session/nav keys — so neither the master key nor the dataset remain in React state after lock.

#### Session Token Integrity (per-user restore token)

Because the CRM uses **one shared master key** (envelope-wrapped per user), the master key cannot prove *which* user authenticated — so the session is bound with a per-login bearer token instead.

On each unlock the app mints a fresh random 256-bit **restore token** and stores it only in that tab's `sessionStorage` (`sb:session:v1`, alongside `userId` and `masterKeyRaw`). Only the token's **SHA-256 hash** (`sessionTokenHash`, salted with the constant `sb-session-v3:`) is persisted on that user's record in the user list.

On session restore the app re-hashes the token from `sessionStorage` and rejects it if:
- the `token` field is missing (legacy/upgraded tokens — forces one PIN entry after upgrade), or
- the user has no stored `sessionTokenHash`, or
- the re-hashed token does not match the restored user's stored `sessionTokenHash`.

A rejected token is removed from `sessionStorage` and the user must re-enter their PIN. Because the raw token never leaves the tab that minted it and the stored value is a one-way hash, a lower-privilege user **cannot** forge a session for another `userId` (e.g. Owner) — they would need the other user's raw token, which is not recoverable from the hash. This closes the prior escalation where the HMAC was keyed by the shared master key and could be recomputed by anyone who had logged in. A new token is issued on every unlock, invalidating any previous one for that user.

### Encryption

| Layer | Detail |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2 · SHA-256 · 600,000 iterations |
| Salt | 16-byte random per user |
| Master key | Generated once, envelope-encrypted per user |
| Storage key | `simplybreathe:data:v5:enc` |
| Security metadata (encrypted) | `sb:security:v1:enc` |
| Security device key (IDB) | `sb:security:device-key:v1` |
| Legacy plaintext meta (migrated away) | `sb:security:v1` |

- All CRM data is encrypted at rest using the master key.
- Each user's copy of the master key is wrapped with their individual PIN-derived key.
- Adding a new user re-wraps the master key for them using their PIN.
- Security metadata (user list, salts, wrapped keys, session hashes) is AES-GCM encrypted with a browser-local device key stored in IndexedDB (not dual-written to localStorage). Legacy plaintext `sb:security:v1` is migrated on first load and removed.
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

After 5 consecutive failed PIN attempts, the lock screen displays a lockout message and disables further attempts for 5 minutes. The lockout is enforced on two independent layers:

| Layer | Storage | Survives |
|---|---|---|
| Client-side | **IndexedDB** (`sb:pin-lockout:v2`) | Page refresh, tab close, `localStorage.clear()` |
| Server-side | In-memory Map in `backend/server.js` | XSS-based JS injection, DevTools IDB deletion |

`handleUnlock` reads the IDB counter and calls `GET /api/auth/pin-status` **before** attempting PIN verification. A failure is recorded in both stores via `POST /api/auth/pin-attempt`. The server counter resets on server restart (acceptable for local deployment); the IDB counter persists until the 5-minute TTL expires. Stale entries are pruned automatically on IDB read.

### Recovery Code

Users can generate a **recovery code** from **Profile → Security → Recovery Code**. The code is a cryptographically random 30-character string displayed in 6 groups of 5 (e.g. `A3K9M-...`). It is shown **once** at generation and never stored in plaintext.

**How it works:** The master key is wrapped with a PBKDF2-derived key from the recovery code (100k iterations, random salt) and stored as `recoveryWrappedMasterKey` + `recoverySalt` + `recoveryPbkdf2Iterations` on the user's security record — alongside the PIN-wrapped copy. The underlying master key is the same; only the wrapping differs.

**Recovery flow (lock screen):** If a recovery code has been set, a **"Forgot your PIN? Use recovery code"** link appears on the PIN entry form. Clicking it opens a two-step flow:
1. Enter the recovery code → verified by attempting to unwrap the master key; data is decrypted and loaded.
2. Set a new PIN → master key is re-wrapped with the new PIN; the recovery code fields are cleared (code is consumed); the user is logged in.

After recovery, the user should generate a new recovery code from Profile settings. The old code is permanently invalidated.

**Security properties:**
- The recovery code itself never leaves the browser — only the wrapped master key is stored.
- Clearing or regenerating the code immediately invalidates the old one.
- `Sec.generateRecoveryCode()` uses `crypto.getRandomValues` with a 32-character alphabet that excludes visually ambiguous characters (I, O, 0, 1).

### Cross-Tab Data Integrity (Stale-Write Guard)

The app uses a **stale-write guard** to prevent one browser tab from silently overwriting another tab's newer data — the most common cause of lost edits.

**How it works:**
- After every successful save to IndexedDB, a timestamp is written to `localStorage` under the key `sb:data:v5:save-ts`.
- Every tab records `dataLoadedAtRef` — the timestamp of the last data it loaded or saved.
- Before each IndexedDB write, the persist effect compares the current `localStorage` save timestamp with `dataLoadedAtRef`. If the saved timestamp is more than 2 seconds newer, this tab's data is considered stale and the write is **blocked**.
- A yellow **"Another window has newer data"** banner appears with a **Refresh Now** button so the user can reload before continuing.
- A `storage` event listener detects when another tab saves and immediately surfaces the banner.

**Scenario this prevents:**
1. Tab A makes edits (e.g. sets `studioSharePct: 30`, adds session notes) and saves → IndexedDB updated.
2. Tab B was opened before Tab A's edits — its in-memory state is stale.
3. Tab B's 15-minute auto-sync fires and tries to write its stale state to IndexedDB.
4. **The guard blocks Tab B's write.** The banner appears on Tab B. Tab A's data is preserved.

**Single-tab usage:** There is no performance or UX impact. On single-tab sessions, `dataLoadedAtRef` is always current after each save, so the check is a no-op.

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

### Reset to Production — Owner-only, 3-Step PIN Re-Challenge

The **Reset to Production** admin feature is **Owner-only** (tab hidden for other roles; execute path re-checks `role === "Owner"`). It uses a 3-step confirmation flow to prevent accidental data wipes from an unattended session:

1. **Review** — displays record counts across all wipe tables and what will be preserved.
2. **Confirm** — user must type `RESET` exactly.
3. **PIN challenge** — Owner must re-enter their PIN (verified via PBKDF2 `unwrapKeyForUser`, same cryptographic path as login). Only on successful PIN verification is the wipe executed.

On success, the CRM also calls `POST /api/integration/clear-queues` to empty Calendly and Stripe webhook pending queues so test events cannot re-import. Server-side integration configuration (webhook URLs, API keys, Resend) is not modified.

**Email Logs → Clear log** is likewise Owner-only; other roles can view and refresh delivery status but cannot wipe the audit trail.

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

All user-supplied strings (session name, studio name, notes, time, journey) interpolated into the `document.write` PDF template are HTML-escaped via an `esc()` helper. The generated print window also has a strict `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'` when an inline print script is used (participant list); the Performance PDF report uses `style-src` only and calls `w.print()` from the opener.

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

- **Prerequisite:** Owner must enable **Multi-user access** in Admin → Settings. Default is off because every PIN user can decrypt the full CRM (shared master key).
- Fields: Full Name · PIN · Role (Admin / Editor / Viewer).
- Individual permissions for View / Edit / Delete can be overridden per user.
- A new user's copy of the master key is wrapped with their PIN on creation.
- A per-user **unlock secret** is also PIN-wrapped and registered with the backend so Edit permission is enforced on refund/email APIs.

### Editing a User

- Update role and individual permission toggles (synced to the backend auth registry for API `canEdit`).
- Reset PIN for any user (requires the master key to re-wrap; also rotates the unlock secret).

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
| Gross Revenue MTD | Total gross session revenue for the current calendar month (virtual + studio, before any splits). Calculated using `buildRevenueViewRows` → sum of `gross`, where each booking's `gross` is its **actual matched Stripe charge** (`amountGross`) — exactly the value shown on the Stripe page. Bookings with no Stripe charge (free / 100%-off coupon) count as **$0**; the Calendly list price is no longer used. Excludes `unpaid`, `pending_verification`, `unmatched`, `failed`. Clicking the card navigates to Revenue → **This month**. |
| Referral Revenue | Revenue from clients whose source is "Referral" |
| Active Clients | Total number of clients in the system |
| Active Sequences | Follow-up sequences with pending steps |

### Lane Split Panel

Side-by-side view of studio vs client revenue, with **Studio Revenue (B2B) on the left card** and **Client Revenue (B2C) on the right card**. The **Lane Split Panel appears above the Pipeline Snapshot** on the dashboard.
- **B2B (left):** Studio session **Stripe revenue** MTD (actual charges only — `pending_verification`/`unmatched`/free bookings count as $0) · Open partner pipeline value · Active partners · Avg session rev
- **B2C (right):** Virtual session booking prices MTD + closed offer revenue · Open offers value · Active clients

### Clients by Source Chart

Pie/bar chart breaking down clients by their `source` field. Tracked sources include: Referral, Instagram, Studio, Website, Direct, Event, Corporate, **Calendly**, Other. Clients auto-created from Calendly bookings are tagged with `source: "Calendly"` and appear in this chart.

### Revenue Trend Chart

Area chart of monthly revenue (`RevenueTrend` → `registrationRevenueByMonth`). Each booking's **actual Stripe charge** (free/uncharged = $0) is bucketed by the **booked month** — the booking's `createdAt` ("Scheduled On" date), falling back to `scheduledAt` — **not** the session date. Accepted offers are added on top by their `closeDate`. Caption: "Stripe revenue + closed offers, by booked month".

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
| **Refund due** | Canceled booking that passes the refund-eligibility matrix (host-canceled anytime; client-canceled >24 h before session) with a Stripe payment on file and no refund yet issued. Severity: **warning**. "View" opens the registration record. |

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

Target Identified → Researched → Initial Outreach Sent → Follow-Up Needed → Discovery Call Booked → Demo Session Offered → Demo Completed → Pilot Proposed → Agreement Sent → Agreement Signed → First Session Scheduled → Pilot Completed → Recurring Partner → Lost / Not a Fit → Nurture Later

### Fields Tracked

Studio name · Owner/Manager name · Email · Phone · Location · Type (yoga, gym, meditation, wellness, Pilates, corporate, etc.) · **Lead source (`source`)** — how the studio was found (Instagram DM, Referral, Cold outreach, etc.) · **Pain point (`painPoint`)** — the studio's key challenge or need · **Proposed package (`proposedPackage`)** — the offer or programme proposed · Estimated community size · Best-fit journey · Revenue potential · **Studio revenue share % (`studioSharePct`)** — the studio's cut, used to compute each studio session's split · Last touch date · Next action · Probability of closing · Notes · Contract status · Insurance requirements · Promotion commitments

> The legacy free-text "Revenue share model" field has been replaced by the numeric **Studio revenue share %** (`studioSharePct`). Partner lists, the partner PDF, and the `{{revSplit}}` email token now show this percentage.

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
| **Active Partners** | Studios at Recurring Partner, First Session Scheduled, or Pilot Completed stage, **plus any studio that has an uploaded agreement (PDF or Word) on the Agreements tab, or has at least one studio session on the session calendar** (any session linked via `studioId`) — sorted A–Z. **Default first tab.** Per-row alert icon when no PDF is on the **Agreements** tab; full alert also appears in the header **Alerts** bell. |
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
| Price per attendee | Currency — studio sessions; what each attendee pays (`pricePerSeat`). Displayed for reference only — the split is calculated from actual Stripe revenue, not this field |
| Gross Revenue | Currency — virtual sessions: sum of Stripe charges from bookings. Studio sessions: sum of actual Stripe charges received for that session (see *Studio split tracking*) |
| Studio Split | Currency — studio sessions only; actual received gross × the partner's revenue share %, mirrored to an auto `Studio Split` expense |
| Net Revenue | Currency — Gross Revenue − Studio Split |
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

- Per-session metric row: **In room** (attendance/capacity), **Price/seat**, **Gross**, **Studio split**, **Net profit**, **Conversion**
- Attendance rate vs capacity
- Net vs gross comparison (Net profit = Gross − Studio split, where Gross = actual Stripe revenue received for the session)
- Conversion rate (attended → purchased follow-on offer)
- A **Refresh** button (circular arrow icon) in the tab header pulls the latest Calendly bookings and Stripe payments (same as a full sync) and re-renders every metric from the **live stored session record** — so Gross, Studio split, Net, attendance, paid attendees, and waivers all update in place without closing and reopening the drawer. Useful after a new payment comes in or after editing attendee counts, price per seat, or the studio's revenue share %

#### Paid Attendees Display

`paidAttendees` is stored as an explicit number on the session record. When it is set to `0`, the Performance tab and PDF export display `0` (not the attendance figure). The display logic uses a strict `typeof r.paidAttendees === "number"` check so that an intentional zero is never confused with a missing value.

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
Shows the **active** client registrations linked to this session (synced from Calendly or manually linked). Canceled and rescheduled registrations are **not** shown here — when a participant cancels, their booking is removed from this tab so the spot is freed for someone else, and the cancellation remains visible on the Calendly Bookings → Cancellations and Reschedules tab. The status-count chips and the session-revenue figure therefore reflect active bookings only.

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

Each item in the **Message Queue** has a **Send Email** button. All sequence steps use the email channel (SMS/text dispatch is not yet enabled). Clicking **Send Email** opens an inline compose area pre-filled from `data.fuTemplates` overrides when present, otherwise the hardcoded `FU_TEMPLATES` default for that step:

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

**Navigation:** Sidebar → P&L → Revenue

Revenue views derive each booking's amount from its **actual matched Stripe charge** (`amountGross`, via `bookingStripeCharge` / `buildPaidPaymentsByBooking`) — the same number shown on the Stripe reconciliation page. A booking with **no Stripe charge** (free / coupon) is **$0**; the Calendly list price is never substituted. Bookings in `pending_verification`, `unmatched`, `unpaid`, and `failed` are excluded until Stripe confirms payment. Accepted/paid **offers** are added on top.

### Stripe (Payment Reconciliation) View

**Navigation:** Sidebar → **Stripe** (a top-level sidebar item; renders the `payment-reconciliation` layout from the `stripe` section)

| Section | Purpose |
|---|---|
| Unmatched Stripe transactions | Shown **above Stripe charges** only when present. Stripe charges (`status: "paid"`) that no Calendly booking matched (no booking within the match window for that participant). Columns: **Name, Paid, Description, Stripe amount**; rows expand to the same `ChargeDetails` panel. Common causes: test charges, duplicate payments, or a different email between Stripe and Calendly. |
| Payment exceptions | Shown when a booking looks paid/unmatched/failed with an expected amount but has **no Stripe charge**. Not auto-forgiven as free (a missing charge can look like a comp). Expand a non-failed row → enter the **free coupon code** → **Confirm free coupon** (`confirmRegistrationFreeCoupon`). Sets `couponCode`, `paidAmount: 0`, and `lastAmountMismatch.reason: "free"`; the row leaves exceptions and appears under Stripe charges as a **Free** row. Requires Edit permission. |
| Stripe charges | One row per **matched** Stripe charge (`status: "paid"`), tied to the Calendly session it paid for. Columns: **Booked**, **Name**, Session, Expected, Stripe, Session amount (sorted by booked date, most recent first). **Free sessions** — any active booking with no paid Stripe charge that is not a payment exception (including operator-confirmed coupons) — appear as synthetic **$0.00** rows with a **Free** badge; confirmed coupon codes show in `ChargeDetails`. They self-correct to a real charge row if a payment arrives later. |
| Bookings awaiting a Stripe charge | Calendly bookings still in `pending_verification` (booked but no charge tied yet). |
| Refunds | Stripe refund events affecting revenue. |

Use **Sync Stripe now** to load charges from the backend ledger and run reconciliation (also polls every 5 minutes).

`reconcileAmountMismatches` / `patchAmountMismatches` correct Stripe-verified bookings whose Calendly list price (`paymentAmount`) is missing or differs from `paidAmount`. On a no-op it returns the **same** `registrations` array reference so `PaymentReconciliationView`'s identity guard can stop the effect; missing list prices are filled from Stripe (not skipped), which prevents an endless `setData` / re-encrypt loop.

The page header **search box** (the global `query`, passed into `PaymentReconciliationView`) filters every list on this page — Stripe charges, unmatched transactions, refunded payments, and bookings awaiting a charge — matching on name, email, session, and description.

**Matching rule (time-based):** A Stripe charge is created the moment a participant books, so the charge time equals the booking time. For each participant (matched by **email**), each unlinked charge is tied to the booking whose time (`createdAt`) is **closest** to the charge time, within a window of `STRIPE_MATCH_WINDOW_MS` (2 days, to absorb webhook/sync lag). The Stripe `amountGross` becomes that booking's `paidAmount` and session amount. List price is kept as *expected*. There is **no manual override** — matching is automatic.

**Self-healing:** Each reconciliation run (on Sync Stripe and on opening the panel) first clears automatic links, then re-matches with the rule above, so a mis-tied charge corrects itself. Any link with `matchStatus: "manual"` (legacy) is preserved.

Each Stripe sync calls `GET /api/stripe/ledger` to reload processed webhook events so payments are not lost after a browser refresh.

**Calendly API backfill:** Each Calendly sync calls `POST /api/calendly/pull-recent` (requires `CALENDLY_API_TOKEN`) to fetch recent scheduled events from the Calendly API and queue any invitees missing from the webhook queue — e.g. when ngrok was down or a webhook was never delivered. The pull fetches **both active and canceled** scheduled events. Cancellations are scanned first (without payment enrichment) so they queue within ~1–2 seconds — well inside the sync's pull timeout — and are reconciled on the same sync; canceled invitees are queued as `invitee.canceled` events.

**Re-queue after acknowledge (CRM heal):** Queue dedup is by `calendlyInviteeUri` + `eventType`. Unprocessed duplicates are skipped. **Processed** events are re-queued when (a) name, email, event name, or start/end time changed on Calendly, or (b) the booking was created within the last **72 hours**. That heals registrations lost after acknowledge (e.g. after a local data wipe) and picks up invitee edits without re-processing the entire history every sync.

**Synthetic TEST payloads:** Webhook and pull ignore Calendly URIs containing `/scheduled_events/TEST` or `/invitees/TEST` (signature-verification fixtures). The CRM sync also acknowledges and skips those events so they never create "Sig Test" bookings.

**Group/studio participant cancellations:** A 1:1 virtual event becomes `status = canceled` when its only invitee cancels, so it is found by the canceled-events scan. A **group/studio event stays `status = active`** even after a participant cancels — only that individual invitee's status flips to `canceled`. The pull therefore also inspects the invitees of every **active** event and queues an `invitee.canceled` for any participant whose status is `canceled` (deduped by invitee URI + event type). Without this, a participant who dropped out of a still-active studio class would never sync as a cancellation. This makes cancellations recover automatically even when no webhook was received, with no reliance on ngrok.

**Cancellation protection (CRM status always wins):** When an `invitee.created` event is processed, the sync first looks for an existing registration with the same `calendlyInviteeUri` whose status is already `canceled` or `rescheduled` — set **either** by a Calendly cancellation **or** by a manual status change in the CRM. If one is found, the booking event is **skipped entirely**: the client is not re-touched, the session is not (re)created, and the registration is not rebuilt or flipped back to `booked`. This holds even after the original booking event ages out of the queue and is re-pulled from the Calendly API (a common cause of "the cancellation came back"), because a booking that is canceled in the CRM but still **active in Calendly** would otherwise be re-pulled on every sync. The result: the automated sync can never resurrect a deleted virtual session or overwrite a manual cancel/reschedule. (Reschedules still create the new booking normally, because Calendly assigns the rescheduled session a brand-new invitee URI that does not match the old, rescheduled record.)

**Virtual session deletion on cancel:** Virtual sessions are 1:1, so when their booking is canceled or rescheduled the session record is removed from the session list and calendar entirely (rather than left as an empty "Planned" session). Studio sessions are group events and are never deleted on a single cancellation — only the `registered` count is reduced.

### Revenue Sources

| Source | How it appears |
|---|---|
| Calendly bookings | One row per paid/verified registration — amount = Stripe `paidAmount` when verified, else session price |
| Offers | One row per Accepted/Paid offer — amount = offer price |
| Manual revenue records | Any row in the **Revenue** table that isn't an auto booking record (e.g. partner agreements, corporate events, packages) now also counts toward Revenue reports |

Dates use the **booked date** for bookings — the registration's `createdAt` ("Scheduled On"), falling back to `scheduledAt`, then the session date — so revenue is recognised in the month the booking was made (matching the Command Center revenue trend and the Revenue → This month tab). Offers use their **close/offered date**.

### Automatic revenue & expense ledgers

The **Revenue** and **Expense** tables are kept in sync with bookings automatically (no manual entry needed for sessions):

- **Revenue table** — every **active** virtual or studio booking is materialised as a revenue record (`id` prefixed `regrev_`, `auto: true`, `channel` = `Virtual session` / `Studio session`). The record's `gross` is the booking's **actual matched Stripe charge** (`amountGross`), with `refunds` = `amountRefunded` and `net` = gross − refunds; a booking with **no Stripe charge** (free / coupon) is `$0` — the Calendly list price is never used, so these values match the Stripe page row-for-row. Records regenerate from the current bookings on every change, so amounts track Stripe reconciliation and canceled/rescheduled bookings drop out automatically.
- **Expense table** — every **canceled** booking is materialised as an expense record (`id` prefixed `cxlexp_`, `auto: true`, `category` = `Refunds & Cancellations`). The `amount` is the money that **actually left via Stripe** — the registration's `amountRefunded` — so a late cancel, free/coupon booking, or not-yet-refunded cancellation books a **$0** expense (the cancellation stays visible without distorting the P&L). When a Stripe refund has been issued, the record also carries `stripeRefundId` and `refundedAt`, and its `date` becomes the refund date. Reschedules are **not** expensed (the payment simply follows the booking to its new time). These records feed Expenses MTD / Operating Profit, so each refunded cancellation reduces profit by its refunded amount.
- **Studio split expenses** — every **studio session** that owes its partner a revenue share is materialised as one expense record (`id` prefixed `studiosplit_`, `auto: true`, `category` = `Studio Split`, `vendor` = the studio partner name, `linkedSession` / `linkedPartner` set). The `amount` is computed (`studioSessionFinance`) as the **sum of actual Stripe charges received for that session** (from the matching `regrev_*` revenue rows, gross minus refunds) **× the partner's revenue share %**. The split updates automatically whenever payments come in, refunds occur, or the partner's share % changes — no manual entry needed. See *Studio split tracking* below. **Preservation rule:** if a previously-recorded positive-amount studio split expense would recompute to $0 (e.g. no paid bookings yet), the record is retained rather than silently deleted. The user must manually delete stale records if needed.

Manually-entered revenue/expense rows are always preserved; only the `auto` records are regenerated. To avoid double-counting, client **Lifetime Value** and the Revenue tab exclude the `auto` revenue records (the underlying registrations/live booking rows already represent them).

### Studio split tracking

For studio (B2B) sessions, all payments go through Calendly/Stripe and are matched to individual bookings. The studio's revenue share is calculated from the **actual payments received** for that session, so it stays accurate automatically as payments come in and refunds occur — no manual entry of price-per-seat or paid-attendee counts is required to drive the split.

The economics are computed by `studioSessionFinance(session, data, ctx)`:

| Input | Source |
|---|---|
| **Actual gross received** | Sum of `gross − refunds` across all active `regrev_*` booking revenue rows for that `sessionId` (real Stripe charges, not list price). Pass `ctx.revenueRows` to reuse a pre-built set in list views. |
| **Studio revenue share %** | `studioSharePct` on the linked **Studio Partner** record (the studio's cut, e.g. `30` = studio keeps 30%). |

The calculation:

```
gross        = Σ (Stripe charge − refund) per booking for this session
studioSplit  = gross × (studioSharePct ÷ 100)     ← owed to the studio partner
net          = gross − studioSplit                ← Simply Breathe's keep
```

The values recompute whenever bookings, payments, or the partner's share % change. The `pricePerSeat` field on the session is retained for **display reference only** (shown in the Performance tab as "Price/seat") and no longer drives the split calculation.

- **Expense sync**: the computed `studioSplit` is mirrored into a single auto expense (category `Studio Split`, id prefix `studiosplit_`) linked to the session. `buildBookingLedgerRecords` builds the `regrev_*` revenue rows once and passes them to `studioSessionFinance` via `ctx.revenueRows` to avoid redundant computation. The sync is guarded by an `id | amount | date` signature so unchanged sessions produce no state updates.
- **`sessionFinanceFor(session, data)`** is the shared wrapper: studio sessions use `studioSessionFinance`; virtual sessions fall back to their booking-derived `revenue` with no split.
- **Sync protection**: `refreshCalendlySessionRevenue` still skips sessions with a `studioId`, preventing Calendly/Stripe syncs from touching session-level fields like `attendance`, `revenue`, or `studioSplit`. The `registered` count (bookings taken) is still updated when a registration is saved. The partner's `studioSharePct` is preserved by `normalizeCrmData` on every save/load.

The **Studio Session Performance** tab and the session drawer's Performance tab surface **Price/seat** (reference), **Gross**, **Studio split**, and **Net profit** per session using this model.

### Revenue Channels Tracked

Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner

### Per-Record Fields

Each derived booking row shows: Booked Date & Time · client + session name · session date · channel (Studio session / Virtual session) · gross = session price · net (after studio split for studio sessions). Facilitator and Source columns are not shown in this view.

Manual **Revenue** records (gross, Stripe fee, studio split, etc.) are part of the revenue ledger and are listed in the derived Revenue tab views alongside the auto booking rows. Auto booking records (`regrev_*`) are not shown a second time in the **Revenue Attribution** / **This month** views (the live per-booking rows already represent them), but the **Revenue Table** tab lists *every* stored record — auto and manual — for full transparency and auditing.

### Analytics Views

- Revenue by channel (bar chart)
- Gross vs net comparison
- Month-over-month trend (area chart)
- Top revenue sources ranked

### Views

- **Revenue Attribution** (tab 0) — stat cards and analytics driven directly by the **revenue and expense ledgers**, filtered by **booking/payment date** (`r.bookedAt`, falling back to `r.date`). Revenue counts in the month money was actually collected. Layout: `revenue-analytics-booked`, rendered by `<RevenueAttributionView dateMode="booked" />`:
  - Stat cards: **Gross revenue MTD**, **Net revenue MTD**, **YTD Revenue**, **YTD Net Revenue**
  - **Revenue waterfall — month to date**: Gross (sum of `data.revenue` gross) → Studio splits (sum of `data.expenses` where `category = "Studio Split"`) → Processing fees → Refunds (revenue refunds + cancellation expenses) → Net. All figures limited to the current calendar month.
  - **P&L by channel — MTD**: Gross and fees from `data.revenue` grouped by channel; studio split expenses attributed to "Studio session"; cancellation expenses routed to the channel of the linked session. Net = Gross − Fees − Split − Refunds per channel.
  - **Recently Charged Sessions**: Mirrors the Stripe page — every paid Stripe charge **plus** every active booking with no charge (free/coupon) shown as a `$0` **Free** row. Sorted newest-first by charge time. Columns: Booked, Client, Session, Channel, Amount.

- **This month** (tab 1) — rebuilt around the actual ledgers (`revenue-this-month` layout, `RevenueThisMonthView`). It no longer derives figures from registrations or applies a 70/30 split. Instead:
  - **Gross Revenue** = sum of the **Stripe amounts stored on records in the `revenue` table** (`gross`) whose `bookedAt` (booking/payment date, falling back to `date`) falls in the current month — reflects money actually collected. Includes both auto booking records (`regrev_*`) and manually-entered revenue rows.
  - **Expenses** = sum of `amount` across records in the `expenses` table dated in the current month (auto cancellation records + manual expenses).
  - **Net Revenue** = Gross Revenue − revenue refunds − Expenses. Margin % = Net ÷ Gross.
  - Three stat cards (Gross Revenue, Expenses, Net Revenue) each show a **% change vs the previous month** (the Expenses card inverts the favourable colour, since a rise in expenses is unfavourable).
  - Below the cards, two sortable/expandable `RecordTableView` listings show the month's **revenue records** (with Stripe amounts) and **expense records**. The page **search box** filters both listings (the `query` is passed through to each `RecordTableView`); the summary cards continue to reflect the full month.

- **Refunds** (tab 4, Calendly Bookings section) — the Stripe refund queue and audit trail (`refunds` layout, `RefundsView`). Moved here from Revenue so it sits alongside the Cancellations and Reschedules tab where the underlying canceled bookings live. See **Stripe Refunds for Canceled Bookings** in the Revenue Attribution section for the full policy matrix and flow. Three lists:
  - **Refunds due** — canceled bookings that pass the `refundEligibility` policy matrix. Columns: Client, Session, Session time, Canceled on, Canceled by, Paid, Policy check, and a **Refund $X** button (Edit permission required; viewers see "View only"). Eligible-but-uncertain rows (unknown initiator or missing timing data) show a ⚠ caution under the policy check. Clicking a row opens the registration record; clicking Refund opens a confirm dialog before anything is sent to Stripe. A banner above the lists shows the count of refunds due.
  - **No refund due** — canceled bookings that do **not** qualify (late cancel, free booking, no Stripe payment on file), each with the reason. Already-refunded bookings are not repeated here — they live in Refund history.
  - **Refund history** — the auto `Refunds & Cancellations` expense records that carry a `stripeRefundId`. Columns: Date, Client, Description, Refunded amount, Stripe refund ID; footer shows the total refunded.

- **Revenue Table** (tab 3) — a raw listing of **every record stored in the `revenue` table** (including auto booking records `regrev_*` and manually-entered rows), rendered with the `record-table` layout (`RecordTableView`). Unlike the derived views above, this reads `data.revenue` directly and does not apply the studio split. Behaviour:
  - **Sortable column headings** — click any header (Date, Description, Channel, Source, Gross, Refunds, Net, Type) to sort; click again to toggle ascending/descending. The active column shows a ▲/▼ indicator. Sort columns are defined by `revenueTableCols()` (each column carries a `sortVal` accessor). The **Date** column displays the record's **booked-at date** (`bookedAt`, falling back to `date`) rather than the session date. Full ISO timestamps are formatted as date **and** time via `formatRegistrationDateTime` (e.g. `Jun 23, 2026, 03:14 PM`); bare `YYYY-MM-DD` values show the date only.
  - **Expandable rows** — click a row (or its chevron) to expand an inline panel listing **all fields** stored on that record as label/value pairs (keys humanised, money fields formatted, booleans shown as Yes/No). Editors see an **Edit record** button in the expanded panel.
  - **Type column** distinguishes **Auto** (booking-generated, `auto: true`) from **Manual** records.
  - Footer shows the record count and column totals for Gross and Net.

### Stripe Refunds for Canceled Bookings

**Navigation:** Sidebar → Calendly Bookings → **Refunds** tab (after Cancellations and Reschedules)

Refunds are **one-click approved**: the CRM evaluates the cancellation policy automatically, but a human always clicks **Refund** (and confirms) before any money moves. Nothing is refunded silently.

#### Eligibility policy matrix (`refundEligibility(reg, data)`)

| Initiator (`cancelerType`) | Time window | Stripe amount | Result |
|---|---|---|---|
| `host` (Calendly host cancel or CRM **Cancel booking** button) | Any time | > $0 | **Refund due** — full refund |
| `invitee` (client canceled in Calendly) | More than **24 hours** before `scheduledAt` | > $0 | **Refund due** — full refund |
| `invitee` | **24 hours or less** before `scheduledAt` | Any | No refund (late-cancel policy) |
| Any | Any time | $0 / no Stripe payment on file | No refund — nothing to refund |
| Unknown / missing | Treated like a client cancel | > $0 | Listed with a ⚠ "review before refunding" caution |

Additional guards: a booking whose `stripeRefundId` is set, whose `paymentStatus` is `refunded`, or whose `amountRefunded` > 0 is never offered again ("Already refunded"). The 24-hour window compares `scheduledAt` (falling back to the linked session's date + time via `registrationSessionTimestamp`) against `canceledAt`; if either timestamp is missing, the row is still offered but flagged for manual review. The window is defined by the `REFUND_POLICY_HOURS` constant (24).

#### Refund flow

1. User clicks **Refund $X** (Refunds tab) or accepts the refund prompt offered immediately after a manual **Cancel booking** (see below), then confirms in a dialog.
2. Frontend `issueStripeRefund(reg, setData)` calls `POST /api/stripe/refund` with `stripePaymentIntentId` / `stripeChargeId`, required `registrationId`, and a `policy` attestation (`cancelerType`, `canceledAt`, `sessionAt`).
3. The backend (guarded by `requireFrontendSecret` + Edit session) looks up the PaymentIntent/Charge in Stripe, rejects zero-amount or already-refunded charges, rejects when Stripe `metadata.registrationId` conflicts with the request, evaluates the 24-hour policy server-side (Owner may send `policy.override: true`), then calls Stripe `POST /v1/refunds` (full refund). An encrypted audit entry is appended to `backend/data/refund-audit.json`.
4. On success the registration is stamped with `paymentStatus: "refunded"`, `amountRefunded`, `stripeRefundId` (`re_...`), and `refundedAt`; the linked `payments` record is updated the same way.
5. The next booking-ledger sync regenerates the booking's auto cancellation expense (`cxlexp_*`) with the refunded amount, the Stripe refund ID, and the refund date — this is what the **Refund history** list shows.
6. Stripe later sends the `charge.refunded` webhook, which flows through the existing webhook queue and reconciliation as confirmation (idempotent — the records are already marked refunded).

**Host-cancel prompt:** after confirming the red **Cancel booking** button in a bookings list (All Bookings / Cancellations expanded panel), if the booking has a Stripe payment and has not been refunded, a second confirm dialog immediately offers the full refund — host cancels always qualify. Declining is safe; the booking remains in **Revenue → Refunds → Refunds due**.

| Requirement | Detail |
|---|---|
| Backend endpoint | `POST /api/stripe/refund` (`backend/server.js`), `requireFrontendSecret` + Edit session + policy/Stripe binding |
| Env var | `STRIPE_SECRET_KEY` in `backend/.env` (Stripe secret API key `sk_live_...` / `sk_test_...`). Without it the endpoint returns 503 — the webhook signing secret alone cannot create refunds |
| Frontend helpers | `refundEligibility`, `issueStripeRefund` (`src/lib/revenue.js`), `REFUND_POLICY_HOURS`, `RefundsView` |
| Permissions | Issuing a refund requires **Edit** permission (`canEdit`), enforced server-side |

### Table Footer Totals

The **Revenue Table** and **Expense Table** tabs (and the revenue/expense listings on the **This month** tab) display footer rows showing the record count and column totals.

Both the **This month** tab and the **Revenue Attribution** tab now derive all figures from the stored revenue and expense ledgers. Studio splits use the actual partner `studioSharePct` (via the `studiosplit_*` expense records) rather than a hardcoded 70/30 ratio.

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
- Search by name, subject, or body text. Both the page header **search box** (the global `query`, passed into `TemplateLibraryView`) and the in-page search field filter the list; when both are set, a template must match both.
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
| Total Records | Sum of all records across all 11 tables |
| Active Users | Number of active user accounts in the security config |
| Data Size | Uncompressed JSON size of all CRM data (KB) |
| Storage Used | Size of the encrypted store entry (KB) |

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

Displays the two storage keys the application uses (persisted in IndexedDB, or `window.storage` under Cursor canvas):

| Key | Purpose |
|---|---|
| `simplybreathe:data:v5:enc` | AES-256-GCM encrypted CRM data payload |
| `sb:security:v1:enc` | Encrypted user accounts, salts, wrapped master/unlock keys |
| `sb:security:device-key:v1` | Browser-local AES key for the security vault (IndexedDB) |

These keys are stored in **IndexedDB** (object store `kv` in the `simplybreathe` database), which avoids the ~5 MB `localStorage` quota that previously caused silent save failures (`QuotaExceededError`) once the encrypted payload grew large. On first load, any existing `localStorage` value for a key is automatically migrated into IndexedDB and the stale `localStorage` copy is removed. Under the Cursor canvas, `window.storage` is used instead; `localStorage` remains only as a last-resort fallback when IndexedDB is unavailable.

#### Save Status Indicator

A real-time save status chip appears in the header bar:

| State | Display | Meaning |
|---|---|---|
| Idle | (hidden) | No pending changes |
| Saving | *Saving…* (grey italic) | Write is in progress |
| Saved | ✓ Saved (green) | Most recent change was persisted |
| Error | Red banner below nav | Last write failed — export backup immediately via Admin → Storage |

When a save error occurs a full-width red banner appears below the navigation bar with a link to Admin and a dismiss button. The banner stays visible until the next successful save or the user dismisses it. A single alert() is also shown on first failure (with quota/reason details); subsequent failures are indicated only by the banner.

#### Encryption Spec Panel

| Setting | Value |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2 · SHA-256 · 600,000 iterations |
| Salt length | 16 bytes, random per user |
| Key model | Envelope encryption — master key wrapped separately per user |
| Data version | v5 |

---

### Tab 1b — Settings

Configures dropdown options used throughout the CRM (lead sources, client types, package types, etc.) and the Calendly sync behaviour.

#### Calendly Sync Cutoff Date

| Field | Key | Default | Description |
|---|---|---|---|
| `calendlySyncFromDate` | `crmSettings.calendlySyncFromDate` | `"2026-07-01T00:00:00.000Z"` | ISO timestamp. Calendly events whose `createdAt` (booking creation date) is before this value are skipped during sync and acknowledged so they never re-queue. Leave blank to sync all events. |

**Behaviour:**
- Filtering is applied on the **booking creation date** (`evt.createdAt`), not the session scheduled date.
- `backend/api/calendly/pull-recent` `daysBack` is also capped to the number of days since the cutoff (max 90), so stale events are not re-fetched from the Calendly API.
- Old events that pass the filter check are acknowledged immediately so they do not re-appear on the next sync.

### Tab 2 — Schema Browser

A full, interactive reference for every database table and field in the CRM. No external tool or documentation file is needed.

#### Table Selector

Toggle buttons for all 11 tables. Each button shows the table label and field count. The selected table is highlighted.

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
| `expenses` | Expenses | Core | 15 |
| `referrals` | Referrals | B2C | 11 |
| `content` | Content Calendar | B2C | 20 |
| `outreach` | Outreach Hub | B2B | 14 |
| `testimonials` | Testimonials | Core | 15 |
| `templates` | Templates | Core | 8 |

**Total: 165 documented fields across 11 tables.**

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
- Content: raw unencrypted JSON of all table arrays
- Pre-download summary shows record count and uncompressed size
- A "✓ Backup downloaded" confirmation is shown for 3 seconds after export

> **Security note:** The exported file is unencrypted. Store it securely.

#### Restore from Backup

Loads a previously exported `.json` backup file and replaces all current CRM data.

- Owner-only. Non-owner users see a "View only" message.
- Clicking **Choose backup file…** opens a file picker filtered to `.json`.
- The file is parsed and validated client-side (`normalizeCrmData` + `Sec.validate`). If the file is not a valid SBCRM backup, an error is shown and nothing is changed.
- A **backup preview** is displayed showing the record count per collection in the backup vs. the current live count, highlighted in amber where they differ.
- Clicking **Restore this backup** opens a confirmation modal. Confirming calls `setData(normalized)`, which triggers the persist effect to re-encrypt and save to IndexedDB automatically.
- The restore is irreversible. Users are advised to export a backup of the current data before restoring.

#### Storage Details Panel

Live read of current storage state:

| Field | Value |
|---|---|
| Encrypted store size | Size of the encrypted store entry |
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
| Storage calculation | Encrypted size read from the encrypted store directly; uncompressed size computed via `TextEncoder` |

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
| Studio Split | Auto-recorded studio revenue share — amount = sum of actual Stripe payments received for the session (gross − refunds) × the partner's revenue share %. Updates automatically as payments come in or refunds occur. One linked record per studio session |
| Refunds & Cancellations | Auto-recorded when a Calendly booking is canceled — amount = the amount **actually refunded via Stripe** (`amountRefunded`; $0 for late cancels, free/coupon bookings, or cancellations with no refund issued). Carries `stripeRefundId` / `refundedAt` when a Stripe refund was issued from the Revenue → Refunds tab |
| Other | Miscellaneous business costs |

Auto-recorded expense records (id prefix `cxlexp_` for cancellations, `studiosplit_` for studio splits, both `auto: true`) are generated automatically and regenerate on every change; do not edit them by hand. Manually-entered expenses are always preserved.

### Fields Tracked
| Field | Type | Description |
|---|---|---|
| date | Date | Expense date (YYYY-MM-DD) |
| vendor | Text | Payee or vendor name |
| description | Text | What was purchased |
| amount | Number | Cost in USD (no currency symbol) |
| category | Select | One of 12 expense categories |
| paymentMethod | Select | Credit Card, Bank Transfer, Cash, Check, Other |
| taxDeductible | Checkbox | Whether deductible as a business expense |
| recurring | Checkbox | Whether this is a recurring charge |
| recurringFreq | Select | One-time, Monthly, Quarterly, Annual |
| linkedSession | Text | Session ID if attributable to a specific event |
| linkedPartner | Text | Studio partner ID if attributable to a studio |
| receiptUrl | Text | URL or reference to receipt/invoice |
| stripeRefundId | Text | Stripe refund ID (`re_...`) when the expense reflects an actual Stripe refund (auto cancellation records only) |
| refundedAt | Text | ISO timestamp of the Stripe refund (auto cancellation records only) |
| notes | Textarea | Additional context |

### Views Available
| View | Description |
|---|---|
| Summary | Full analytics dashboard: stats row, category chart, monthly trend, top vendors, profitability panel, CSV import guide |
| By Category | Table sorted by category with footer total |
| Recurring | Filtered to recurring expenses only with footer total |
| Tax Deductible | Filtered to tax-deductible items only with footer total |
| Expense Table | Raw listing of **every record in the `expenses` table** (`record-table` layout, `RecordTableView`). **Sortable column headings** (Date, Vendor, Description, Category, Amount, Payment, Tax Ded., Type — click to sort, click again to reverse, active column shows ▲/▼). **Expandable rows** reveal all stored fields as label/value pairs; editors get an **Edit record** button. A **Type** column flags **Auto** (cancellation-generated, `auto: true`) vs **Manual** expenses. Footer shows record count and total amount. Columns defined by `expenseTableCols()`. |

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
- Gross Revenue — from completed sessions (Stripe-backed revenue rows)
- Studio Splits — revenue shared with partners (from `studioSplit` on revenue rows)
- Net Revenue — gross minus fees/splits/refunds (`calcNet`)
- Total Expenses — month expenses **excluding** auto studio-split expense rows (`studiosplit_*`), so splits are not double-counted after Net already deducted them
- Operating Profit — Net Revenue − Total Expenses (must add: Net − Expenses = Profit)
- Operating Margin % — profit as a percentage of gross revenue

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

`netRevMTD` is calculated using `buildRevenueViewRows` → `applyStudioSessionSplit(data)` → `calcNet` for the current calendar month. `applyStudioSessionSplit` looks up the real `studioSharePct` on the matched partner (fallback **0%**, matching `studioSessionFinance` — never invents 30%). Revenue rows carry `studioId` for the lookup. Operating profit = `netRevMTD` − expenses **excluding** auto `studiosplit_*` expense rows, because `calcNet` already deducted `studioSplit` from net (counting those expenses again would double-deduct the partner cut).

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
| `/api/stripe/refund` | POST | Issues a **full Stripe refund** (`POST /v1/refunds`, `amount` omitted) for a canceled booking. Body: `paymentIntentId` (`pi_...`) or `chargeId` (`ch_...`), plus `registrationId` (stored as Stripe metadata) and optional `reason`. Requires `x-frontend-secret` and `STRIPE_SECRET_KEY`; returns the refund ID, amount (dollars), status, and timestamp |
| `/api/integration/clear-queues` | POST | Clears Calendly and Stripe pending webhook queues (Reset to Production; requires `x-frontend-secret`) |
| `/api/calendly/events` | GET | All events (debug/admin) |
| `/api/calendly/events` | DELETE | Clear Calendly queue (admin) |
| `/api/stripe/events` | DELETE | Clear Stripe queue (admin) |
| `/api/send-email` | POST | Sends an email via Resend. Requires `to`, `subject`, `body` (and optional `recipientName`). Rate-limited to 10 req/min. |
| `/api/email-status/:id` | GET | Fetches delivery status for a Resend message ID. `id` validated against `/^[a-zA-Z0-9_-]{1,100}$/`. |
| `/health` | GET | Returns `{ status: "ok" }` — does not expose server uptime |

**Environment variables (`backend/.env`):**
- `PORT` — server port (default 3001)
- `CALENDLY_WEBHOOK_SIGNING_KEY` — HMAC signing key for Calendly webhooks; **required in production** (server refuses to start without it). Generate with `openssl rand -hex 32` and pass as `signing_key` when creating the subscription via `POST /webhook_subscriptions` (PAT create responses no longer return the key). In dev, unsigned webhooks are **rejected** unless `ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true` (never enable with a public ngrok URL)
- `ALLOWED_ORIGINS` — comma-separated CORS origins (default `http://localhost:5173`)
- `FRONTEND_SECRET` — shared secret for CRM-facing endpoints. **Required** (server exits in production if missing; in dev, endpoints return 503 unless `ALLOW_INSECURE_DEV_AUTH=true`). Generate with `openssl rand -hex 32`. Injected server-side by the Vite proxy (dev) or reverse proxy (production).
- `ALLOW_INSECURE_DEV_AUTH` — local-only; allows CRM APIs without `FRONTEND_SECRET`. `start.ps1` **refuses to start ngrok** when this is true.
- `ADMIN_SECRET` — token required for debug endpoints (`GET/DELETE /api/calendly/events`, `GET/DELETE /api/stripe/events`). Pass as `x-admin-token` header.
- `QUEUE_ENCRYPTION_KEY` — 32-byte hex key for AES-256-GCM encryption of `pending-events.json` at rest. Generate with `openssl rand -hex 32`. **Required in production** (server refuses to start without it); if blank in dev, queue is stored as plaintext with a loud warning.
- `CALENDLY_API_TOKEN` — Calendly Personal Access Token (from Calendly → Integrations → API & Webhooks). Required for event type description fetching and payment amount backfill. See `backend/.env.example`.
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (`whsec_...`) from Stripe Dashboard → Developers → Webhooks. **Required in production** (server exits if missing). In dev, unsigned Stripe webhooks are **rejected** unless `ALLOW_UNSIGNED_STRIPE_WEBHOOKS=true` (never enable with a public ngrok URL; `start.ps1` refuses ngrok when set).
- `STRIPE_SECRET_KEY` — Stripe secret API key (`sk_live_...` / `sk_test_...`) from Stripe Dashboard → Developers → API keys. Used by `POST /api/stripe/refund` to issue refunds. Optional — without it the refund endpoint returns 503 and the CRM's Refund buttons report that refunds are not configured.
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
- If the encryption key is lost or rotated without decrypting first, the backend may leave `*.bak` copies next to the live queue files under `backend/data/` (e.g. `pending-events.json.bak`). Those backups are ciphertext for the **old** key and cannot be recovered without it. **Retention decision:** keep them only while you still hope to recover the old key; otherwise delete the `.bak` files after confirming the live queue (`pending-events.json`, etc.) is healthy. They are gitignored and are not used by the running server.
- `/pending` and `/acknowledge` require `x-frontend-secret` header injected by Vite proxy (never sent directly from browser code)
- Webhook string fields sanitized via `Sec.sanitize()` before storage (strips HTML and formula injection)
- SSRF guard: `fetchEventTypeDescription` rejects any `event_type` URI that does not begin with `https://api.calendly.com/`
- Queue capped at **1,000 events**; processed events older than **7 days** are automatically purged on each write
- Startup validation: server exits with code 1 in production if `CALENDLY_WEBHOOK_SIGNING_KEY`, `QUEUE_ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`, or `FRONTEND_SECRET` are missing
- Calendly webhook handler rejects unsigned requests in production when the signing key is unset (same fail-closed pattern as Stripe)
- Refund / API session mint (`POST /api/auth/session`) requires a one-shot challenge from `GET /api/auth/session-challenge` plus a **server-verified HMAC** `unlockProof` over a per-user unlock secret registered via `POST /api/auth/register-unlock`. Tokens expire in 1 hour, are bound to `userId`, and carry server-side `role` / `canEdit`.
- `POST /api/stripe/refund` and `POST /api/send-email` require an API session with `canEdit: true` (not merely `FRONTEND_SECRET`).
- Per-user unlock secrets are PIN-wrapped in security metadata (`wrappedUnlockSecret`) and stored encrypted at rest on the backend in `backend/data/auth-users.json`.
- Multi-user account creation is gated by CRM setting `allowMultiUser` (default `false`) because all users share one master encryption key.
- Server PIN lockout (`POST /api/auth/pin-attempt`) requires a one-shot challenge from `GET /api/auth/pin-status` so lockouts cannot be forged with only `FRONTEND_SECRET`
- `/api/auth/*` is rate-limited (30 requests / 15 min / IP)
- Stripe payment auto-match uses **email + booking time** (not amount); Stripe gross always becomes session price on match. Run `npm run test:stripe-match` to verify.

### Supported Calendly Events

| Event | CRM Action |
|---|---|
| `invitee.created` | **Skipped entirely** if a registration with the same invitee URI is already `canceled`/`rescheduled` in the CRM (CRM status wins — see Cancellation protection). Otherwise: create/update client · upsert session · create/update registration · create 3 follow-up tasks (new regs only). On **redelivery** of an existing invitee: preserve `checkedIn` / `attended` / `noShow` / `notes` and attendance statuses (`attended` / `no_show`); do not reset them to false/empty. Session `registered` recount excludes this invitee's own existing row before adding 1 (avoids double-count). |
| `invitee.canceled` | Set registration status to `canceled` (or `rescheduled` if `payload.rescheduled = true`). If the linked session is **virtual** (no `studioId`) and has no remaining active registrations, the session is **deleted** from the session list/calendar (the canceled registration still shows on the Cancellations and Reschedules tab). **Studio** (group) sessions are kept and only have their `registered` count decremented. |
| `invitee_no_show.created` | Set registration `noShow: true`, status `no_show` · increment session noShows |
| `invitee_no_show.deleted` | Revert no-show flag · decrement noShows |

### Client Deduplication
Email address (normalized to lowercase) is the primary deduplication key. On `invitee.created`:
- **New email** → creates client with `source: "Calendly"`, `status: "Booked"`
- **Existing email** → updates name, phone, next session date, status (Lead → Booked)

**Lifetime value:** After each Calendly or Stripe sync (and payment backfill), LTV is recalculated for every client with at least one registration record. The total is the sum of:
- **Actual Stripe charge** per booking (`paidAmount` minus refunds) — `registrationPaymentForLtv` recognises only confirmed Stripe amounts, exactly like the Revenue tab. There is **no Calendly list-price fallback**: bookings with no confirmed charge (free/coupon, `pending_verification`, `unmatched`, `unpaid`, `failed`, `refunded`) contribute **$0**
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
| `amountRefunded` | Refunded amount — from Stripe refund webhooks, or set immediately when a refund is issued from the CRM |
| `stripeRefundId` | Stripe refund ID (`re_...`) when a refund was issued from the CRM (Revenue → Refunds) |
| `refundedAt` | ISO timestamp when the CRM-issued Stripe refund was created |
| `lastAmountMismatch` | When Stripe paid ≠ Calendly expected price, or a free/coupon confirmation: `{ expectedAmount, stripeAmount, reason?, couponCode?, correctedAt }` — `reason: "free"` marks a $0 session with no Stripe charge |
| `couponCode` | Free / 100%-off coupon code confirmed by an operator on the Stripe payment-exceptions list (cleared if a real Stripe charge later matches) |
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
| `checkedIn` | Boolean — manual check-in flag; **preserved** across Calendly redelivery / API re-pull |
| `attended` | Boolean — manual attendance flag; preserved on redelivery |
| `noShow` | Boolean — no-show flag; preserved on redelivery (also set by `invitee_no_show.*` events) |
| `notes` | Free-text notes; **preserved** on redelivery (not wiped to `""`) |

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
| `amountGross` | Amount paid. **New records (after the integer-cents migration):** integer cents (e.g. `1050` = $10.50), flag `_centsFormat: true`. **Legacy records:** USD dollar float. Use `readAmt(record, "amountGross")` in the frontend to handle both. |
| `amountRefunded` | Cumulative refunded amount (same dual-format as `amountGross`). |
| `_centsFormat` | `true` on records extracted after the 2026-07 migration; absent on legacy dollar-float records. |
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

Refund events (`charge.refunded`, `charge.refund.updated`) update linked payment and registration refund fields. Refunds issued **from** the CRM (Revenue → Refunds tab, or the prompt after a manual host cancel) go through `POST /api/stripe/refund` and stamp the records immediately; the subsequent `charge.refunded` webhook is an idempotent confirmation. See **Stripe Refunds for Canceled Bookings** in the Revenue Attribution section.

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
- **All Bookings** — Scrollable list of all registrations (most recent first). Columns: **Calendly Amount**, Client, Session, Session Date/Time, Status, Payment Status. **Click any row to expand** a detail panel showing: client email, session type, journey, location, booking source, intake answers, payment status, Calendly amount, raw payment notes, event URI, invitee URI, and created date. The Waiver and Booked Amount columns have been removed from this view. For **canceled / rescheduled** rows the panel also shows Cancelled on, Cancelled by, and Cancel reason; **rescheduled** rows additionally show **Original session time** and **Rescheduled to** (the new time, resolved from Calendly's `new_invitee` link — see Reschedule Linking below). For **active** bookings (status `booked`/`attended`/`no_show`), the expanded panel shows a red **Cancel booking** button (Edit permission required); it opens a styled confirm, then marks the registration `canceled` (`cancelerType: "host"`, `canceledAt` = now), frees the session spot (deletes a now-empty virtual session or decrements a studio session's registered count), and moves the row to Cancellations and Reschedules. Because the booking is then canceled in the CRM, future Calendly syncs leave it alone (see Cancellation protection). If the booking has an unrefunded Stripe payment, a second confirm dialog immediately offers the **full Stripe refund** (host cancels always qualify — see Stripe Refunds for Canceled Bookings in the Revenue Attribution section); declining leaves it available in Revenue → Refunds. The expanded panel also shows **Stripe refund ID** and **Refunded at** once a refund has been issued. Expanded-panel text wraps cleanly (the expanded cell overrides the table's `white-space: nowrap`).
- **Pending Waivers** — active registrations where waiver is not yet signed
- **Unpaid** — active registrations with unpaid status
- **Cancellations and Reschedules** — canceled and rescheduled registrations. **Rows are expandable** and use the same detail panel as All Bookings, surfacing the cancellation/reschedule details (Cancelled on, Cancelled by, Cancel reason, and for reschedules the Original session time and Rescheduled to).

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

> **Process persistence (`start.ps1`):** `start.ps1` uses PowerShell's `Start-Process` (not `Start-Job`) so the backend, frontend, and ngrok processes are independent OS-level processes. They continue running even if the PowerShell terminal or Cursor IDE window is closed. Each run kills any process already holding ports 3001 and 5173 before starting fresh. Output is logged to `backend/backend.log` and `frontend/frontend.log` in the project root.

> **ngrok + secrets (`start.ps1`):** Before starting the tunnel, `start.ps1` reads `NODE_ENV` and insecure override flags from the environment / `backend/.env`. If `ALLOW_INSECURE_DEV_AUTH`, `ALLOW_UNSIGNED_CALENDLY_WEBHOOKS`, or `ALLOW_UNSIGNED_STRIPE_WEBHOOKS` is `true`, **ngrok is refused** (backend + frontend still run locally). If `NODE_ENV` is not `production`, a yellow warning still prints recommending production secrets before exposing a public tunnel.

### Setup Requirements
1. Double-click `start.bat` (or run `.\start.ps1`)
2. Register webhook URL shown in the ngrok window in Calendly Dashboard → Integrations → Webhooks
3. Generate a signing key (`openssl rand -hex 32`), pass it as `signing_key` when creating the subscription, and set the same value in `backend/.env` as `CALENDLY_WEBHOOK_SIGNING_KEY` (and in production env before restart)

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
- Testimonials
- Referrals

**Core — Operations** (no accent, always visible)
- Offers & Sales
- P&L *(parent nav item — clicking navigates to Revenue)*
  - Revenue *(nested sub-item)*
  - Expenses *(nested sub-item)*
- Calendly Bookings
- Stripe
- Content Calendar
- Offers & Sales
- Workflows
- Templates
- Admin
  - User Management *(nested sub-item, expands when Admin is active)*

> **Note:** Revenue and Expenses are collapsible children of the **P&L** nav item. Clicking P&L navigates to Revenue (first child) and expands the group. User Management is similarly nested under Admin. Both parent items show a chevron indicator that rotates when the group is open.

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
- Search bar — filters the current list by any of the row's own fields **plus the human names behind its relation ids**: linked client (name/email/phone), linked session name, and linked studio/partner name. This means a name search works on every list (Clients, Calendly Bookings, Offers, Revenue, etc.), not only the Sessions list. Implemented in `Section` (and mirrored in `RecordTableView` for the Revenue/Expense Table tabs).
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

- Available for: Clients, Studio Partners, Sessions, Offers, Content, Follow-Ups, **Expenses**
- **Not CSV-importable:** Calendly bookings (`registrations`) — those arrive only via Calendly sync / webhooks (`DB_ORDER` / `IMPORT_MAP` stay aligned; a missing map entry would crash Import CSVs on open)
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
- Change PIN (requires current PIN, minimum 6 characters, confirmation match)
- On PIN change, master key is re-wrapped with the new PIN (requires `masterKeyRaw` in memory — refused if missing, so a new salt is never written against the old wrap)

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
│   ├── App.jsx                  # Root state, routing, drawers, and shared views
│   ├── components/
│   │   ├── primitives.jsx       # Reusable presentational primitives
│   │   └── appBridge.jsx        # Access to App-owned shared views kept in App.jsx
│   ├── features/
│   │   ├── auth/                # First-run setup and lock screen
│   │   ├── admin/               # Admin settings and user management views
│   │   ├── content/             # Content analytics
│   │   ├── followup/            # Follow-up engine and template views
│   │   ├── outreach/            # Outreach hub
│   │   ├── referrals/           # Referral tree
│   │   ├── revenue/             # Revenue, expense, and refund views
│   │   ├── stripe/              # Payment reconciliation and charge details
│   │   ├── templates/           # Template library
│   │   ├── testimonials/        # Testimonial library
│   │   └── workflows/           # Workflow builder and views
│   ├── lib/
│   │   ├── theme.js             # Colors, fonts, hexA
│   │   ├── format.js            # money, dates, uid, cleanName
│   │   ├── constants.js         # Domain enums, RBAC, FU steps/templates
│   │   ├── crmSettings.js       # Configurable CRM lists
│   │   ├── checklists.js        # Session/equipment checklist defs
│   │   ├── templates.js         # Template var helpers, outreachScore
│   │   ├── api.js               # API headers, Calendly helpers
│   │   ├── email.js             # sendCrmEmail + email log helpers
│   │   ├── store.js             # IndexedDB / localStorage facade
│   │   ├── sec.js               # AES-GCM / PIN / session crypto
│   │   ├── normalizeData.js     # CRM shape repair + studio heal
│   │   ├── revenue.js           # Ledger, Stripe payment, LTV helpers
│   │   └── seed.js              # Default SEED dataset
│   ├── stripeMatching.js        # Stripe↔booking reconciliation
│   ├── assets/logo.js           # Brand logo (base64)
│   └── index.css                # Global CSS + responsive rules
├── vite.config.js               # CSP headers, Vite proxy (/api → localhost:3001)
├── package.json
├── start.bat                    # Double-click launcher (Windows, bypasses PS execution policy)
├── start.ps1                    # PowerShell startup script (backend + frontend + ngrok)
├── DOCUMENTATION.md
└── USER_GUIDE.md
```

### Money Arithmetic

All dollar amounts in the frontend are accumulated using **integer-cents math** to prevent IEEE-754 floating-point drift (e.g. `0.1 + 0.2 ≠ 0.3`).

| Helper | Location | Description |
|---|---|---|
| `_c(v)` | `src/lib/revenue.js` | Converts a dollar float to integer cents: `Math.round(v * 100)`. Used as a building block everywhere amounts are summed. |
| `calcNet(r)` | `src/lib/revenue.js` | Computes net for a revenue row in cents, then divides by 100: `(_c(gross) − _c(fee) − _c(split) − _c(cost) − _c(refunds)) / 100`. |
| `sum(rows, k)` | `App.jsx` (table helpers) | Sums a dollar field across an array in cents then divides: `rows.reduce((a,r) => a + _c(r[k]), 0) / 100`. |
| `readAmt(rec, field)` | `src/lib/revenue.js` | Reads `amountGross` / `amountRefunded` from a Stripe payment record. Divides by 100 when `rec._centsFormat` is `true` (new integer-cents records); passes through dollar floats on legacy records. |

**Stripe payment record format migration (2026-07):** `backend/stripe-handlers.js` `extractStripePayment` now stores `amountGross` and `amountRefunded` as **integer cents** (e.g. `1050` for $10.50) and sets `_centsFormat: true`. Older records already in the encrypted store remain as dollar floats. The `readAmt()` helper in the frontend handles both transparently; no re-migration of existing records is needed.

### Key Constants

| Constant | Purpose |
|---|---|
| `C` | Color palette (brand, surface, ink, line, etc.) — `src/lib/theme.js` |
| `FONT` | Typography (display, body) — `src/lib/theme.js` |
| `LANE` | B2C / B2B visual theme config — `App.jsx` |
| `SEED` | Default data for first run — `src/lib/seed.js` |
| `FIELDS` | Dynamic form schema per section — `App.jsx` |
| `VIEWS` | View definitions (table, kanban, custom) per section — `App.jsx` |
| `STORE_KEY_ENC` | `simplybreathe:data:v5:enc` — encrypted data key (`src/lib/api.js`) |
| `SEC_META_KEY` | Legacy plaintext key `sb:security:v1` (migrated to encrypted vault) |
| `SEC_META_ENC_KEY` | `sb:security:v1:enc` — AES-GCM encrypted user/security config (`src/lib/secMeta.js`) |
| `CALENDLY_BACKEND` | Resolved from `VITE_CALENDLY_BACKEND` env var — base URL for backend API (defaults to `""` for local dev, using Vite proxy) — `src/lib/api.js` |

### State Management

All state is managed via React `useState` and `useMemo` in the root `App` component and passed down as props. No external state library is used.

### Key Components

| Component | Purpose |
|---|---|
| `App` | Root — auth gate, layout, data state |
| `primitives.jsx` | Shared `BreathMark`, `Stat`, `Panel`, `Row`, `Dot`, `Tag`, `MiniChip`, `DateChip`, and `Empty` presentation components |
| `features/*` | Leaf feature modules re-export their public components through each folder's `index.js`; feature modules import shared code from `lib` and never import `App.jsx` |
| `LockScreen` | PIN login, user tile selection |
| `Today` | Dashboard with stats, alerts, NBA |
| `ActionEmailModal` | Relationship NBA email compose — template dropdown, pre-filled recipient, editable subject/body, send via Resend |
| `Section` | Dynamic view renderer for all data sections |
| `TableView` | Standard table layout renderer (columns + optional expandable rows / footer) |
| `RecordTableView` | Raw-table renderer for the **Revenue Table** and **Expense Table** tabs — sortable column headings and expandable rows that reveal every stored field; reads the underlying table directly. Columns supplied by `revenueTableCols()` / `expenseTableCols()` |
| `RevenueThisMonthView` | Revenue **This month** tab — computes Gross Revenue from Stripe amounts in the `revenue` table and Net Revenue = gross − refunds − expenses (from the `expenses` table), with month-over-month deltas and supporting record listings |
| `studioSessionFinance` / `sessionFinanceFor` | Compute a studio session's economics — sums actual Stripe charges (gross − refunds) across all `regrev_*` booking rows for the session, then multiplies by the partner's `studioSharePct` → `{ seatPrice, gross, studioSplit, net, sharePct, participantCount }`. `seatPrice` is display-only. Accepts `ctx.revenueRows` to reuse pre-built rows in list views. Used by the Performance views, partner Sessions tab, and the auto `Studio Split` expense |
| `RecordDrawer` | Slide-in detail/edit panel |
| `EditProfileModal` | Profile photo + info + PIN change |
| `UserManagementView` | Multi-user CRUD and permissions |
| `AdminView` | 8-tab admin panel: overview, schema browser, integrity check, storage, settings, email logs, journey descriptions, reset to production |
| `JourneyDescriptionsTab` | Admin tab for managing journey names and descriptions (add / edit / remove) |
| `SessionBookingsTab` | Bookings tab inside session drawer — lists active (non-canceled, non-rescheduled) Calendly registrants with session price per card |
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

### Security Utilities (`Sec` object in `src/lib/sec.js`)

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
Sec.generateUnlockSecret()                 // Random 32-byte hex unlock secret (API session mint)
Sec.wrapUnlockSecret(secret, pin, salt)    // PIN-wrap unlock secret for SEC_META storage
Sec.unwrapUnlockSecret(wrapped, pin, salt) // Unwrap unlock secret after PIN entry
Sec.unlockProofHmac(secret, nonce, userId) // HMAC-SHA256 proof for POST /api/auth/session
Sec.randomToken()                          // Fresh 256-bit per-login restore token (base64)
Sec.sessionTokenHash(token)                // SHA-256 hash of a restore token (stored per-user)
Sec.sanitize(val)                         // Strip formulas and HTML from CSV input and Calendly webhook fields
Sec.validate(data)                        // Schema validation on load
```

---

### Login Redirect

After a successful PIN login (both first-time setup and explicit logins), the app navigates to the **Today — Command Center** dashboard (`section = "today"`, `view = 0`). However, if the session is restored automatically on a browser refresh (via the `sb:session:v1` token), the app instead returns the user to the exact section and tab they were on before the refresh, as stored in `sb:nav:v1`.

---

*Documentation updated June 2026 (v9.4). Simply Breathe OS is a living system — update this document as features are added.*
