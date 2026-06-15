# Simply Breathe OS — CRM Documentation

> **Version:** 6.1 (June 2026)
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
24. [Technical Architecture](#technical-architecture)

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

### Encryption

| Layer | Detail |
|---|---|
| Algorithm | AES-256-GCM |
| Key derivation | PBKDF2 · SHA-256 · 100,000 iterations |
| Salt | 16-byte random per user |
| Master key | Generated once, envelope-encrypted per user |
| Storage key | `simplybreathe:data:v5:enc` |
| Security metadata key | `sb:security:v1` |

- All CRM data is encrypted at rest using the master key.
- Each user's copy of the master key is wrapped with their individual PIN-derived key.
- Adding a new user re-wraps the master key for them using their PIN.
- If the browser storage API is unavailable, the app falls back to unencrypted seed data mode.

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

On load, the decrypted data is validated against the expected schema (all required top-level arrays present) before being applied to state. Invalid data falls back to seed data.

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
| Net Revenue MTD | Sum of net revenue from `data.revenue` records in the current calendar month (gross − fees − splits − refunds). Clicking the card navigates directly to Revenue → **This month** tab. |
| Referral Revenue | Revenue from clients whose source is "Referral" |
| Active Clients | Total number of clients in the system |
| Active Sequences | Follow-up sequences with pending steps |

### Lane Split Panel

Side-by-side view of B2C vs B2B business:
- **B2C:** Revenue MTD · Open offers value · Active clients
- **B2B:** Revenue MTD · Open partner pipeline value · Active partners

### Pipeline Snapshot

Nine key business metrics in a 3×3 grid:
- Open pipeline value
- Studio pipeline value
- Expected revenue this month (probability-weighted open offers)
- Revenue booked but not delivered (accepted/paid offers with no completed session)
- Revenue delivered but unpaid (completed sessions, payment pending)
- Offers awaiting response
- Average client value
- Average session revenue
- Studio partner conversion rate

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
- Sessions happening today / tomorrow
- Missing waivers
- Setup checklist not started
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

- **All Clients** — Full table with search and sort
- **New Leads** — Filtered to relationship status "New lead"
- **Active Members** — Filtered to type "Member"
- **VIP & Advocates** — High-value clients
- **Needs Follow-Up** — Next follow-up date overdue or today

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

### Contact Timeline

Same as Clients — full history of all touchpoints, sessions, agreements, and communications.

---

## Sessions

**Navigation:** Sidebar → Sessions (Core section)

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

### Equipment & Setup Checklist

Per-session checklist organized into phases:

**Audio & Tech**
Headset (primary) · Backup headset · Headset charger · Extension cord · Speaker / audio backup · Playlist / journey downloaded · Wi-Fi confirmed

**Room & Supplies**
Eye masks · Mats / blankets confirmed · Room lighting set · Water & tissues · Emergency contact process reviewed · Contraindication reminder posted

**Admin & Check-In**
Waiver QR code · Check-in list printed · Arrival time confirmed · Closing / integration script ready

### Session Performance View

- Revenue per session bar chart
- Attendance rate vs capacity
- Net vs gross comparison
- Conversion rate (attended → purchased follow-on offer)

### Views Available

- **Calendar** — Monthly calendar showing all sessions. Pills display `Studio · Journey` for studio sessions and `Client · Journey` for virtual/Calendly sessions.
- **Performance** — Revenue and attendance analytics
- **Revenue Leaderboard** — Sessions ranked by revenue
- **Conversion** — Package and offer conversion rates

### Session Record Drawer — Tabs

| Tab | Contents |
|---|---|
| Details & Edit | All session fields, editable |
| Bookings | All registrants for this session (see below) |
| Equipment Setup | Per-session gear checklist |
| Run Checklist | Full pre/during/post session checklist |
| Performance | Revenue, attendance, conversion metrics |

#### Bookings Tab
Shows every client registration linked to this session (synced from Calendly or manually linked). Displays per registrant:
- Name, booking status (booked / attended / canceled / no-show)
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
- **Virtual / Private sessions:** `Client Name · Journey Name` — rendered in **brand blue**
  - Product prefixes like `"9D Breathwork Virtual - "` are automatically stripped from the journey label
- A **color legend** (Studio / Virtual & Private) is shown in the calendar header
- **Studio header in drawer:** Shows `Studio Name — Session Name` above the editable title for quick identification
- **Hover tooltip:** Full session name, studio, client name, and `X of Y spots remaining`

#### Calendly-Created Sessions
When a booking arrives via Calendly webhook, a session record is automatically created or updated:
- `name` = Calendly event name
- `journey` = Calendly event name (overrides default)
- `studioId` = auto-matched from partner list (see Studio Auto-Matching below)
- `locationType` / `locationJoinUrl` stored for virtual sessions
- `registered` increments for each new invitee on the same event
- Cancellations decrement `registered`; no-shows update `noShows`

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

### Revenue Channels Tracked

Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner

### Per-Record Fields

Gross revenue · Stripe/processing fee · Studio split · Facilitator cost · Refunds · Net revenue · Cost center · Source · Campaign · Linked session · Linked client

### Analytics Views

- Revenue by channel (bar chart)
- Gross vs net comparison
- Month-over-month trend (area chart)
- Top revenue sources ranked

### Table Footer Totals

Both the **This month** and **All transactions** table views display footer rows showing:
- **Gross** — sum of all gross revenue for the filtered rows
- **Net** — sum of all net revenue (after fees, splits, refunds) for the filtered rows

This allows quick verification that the Net Revenue MTD card on the dashboard matches the Revenue → This month view.

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

### Content Analytics View

- Content funnel: Ideas → Drafts → Scheduled → Published
- Platform breakdown (reach and post count per platform)
- Category breakdown
- Engagement totals: reach, likes, comments, shares, saves
- Top 5 posts by engagement
- Revenue attribution from content

---

## Testimonial Library

**Navigation:** Sidebar → Testimonials (B2C lane)

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
- Variable highlighting — placeholders like `{{client_name}}`, `{{session_date}}`, `{{offer_link}}` are highlighted in the preview.
- One-click copy to clipboard.

---

## Referral Tracking

**Navigation:** Sidebar → Referrals (B2C lane)

### Fields Tracked

Referred-by (client name) · Referred person · Referral date · Status · Did they attend? · Did they buy? · Revenue generated · Thank-you sent · Reward given · Notes

### Referral Tree View

Visual tree showing referral chains — e.g., Dana → Maya → (Maya's referrals). Each node shows revenue generated from that branch.

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
| Key derivation | PBKDF2 · SHA-256 · 100,000 iterations |
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
| `testimonials` | Testimonials | B2C | 15 |
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

### Requirements

| Requirement | Detail |
|---|---|
| Access control | All authenticated users can view Admin. Only Owners can export data. |
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

`netRevMTD` is calculated from `data.revenue` records in the current calendar month using `calcNet(r)` (gross − stripeFee − studioSplit − facilitatorCost − refunds). This is the same source as the Revenue → This month table, ensuring the dashboard card and the revenue table always show consistent numbers.

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
```

The Vite dev server proxies all `/api` requests to `http://localhost:3001`, avoiding CORS entirely.

### Backend (`backend/server.js`)

| Endpoint | Method | Description |
|---|---|---|
| `/api/webhooks/calendly` | POST | Receives Calendly events; verifies HMAC-SHA256 signature if signing key is configured |
| `/api/calendly/pending` | GET | Returns unprocessed events for the CRM to consume |
| `/api/calendly/acknowledge` | POST | Marks event IDs as processed |
| `/api/calendly/events` | GET | All events (debug/admin) |
| `/api/calendly/events` | DELETE | Clear queue (dev only) |
| `/health` | GET | Uptime check |

**Environment variables (`backend/.env`):**
- `PORT` — server port (default 3001)
- `CALENDLY_WEBHOOK_SIGNING_KEY` — HMAC signing key from Calendly webhook subscription; if blank, signature verification is skipped (dev mode only)
- `ALLOWED_ORIGINS` — comma-separated CORS origins (default `http://localhost:5173`)

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
| `paymentStatus` | `paid` · `unpaid` · `unknown` |
| `waiverStatus` | `pending` · `signed` |
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

### Calendly Bookings Sidebar Section
**Navigation:** Sidebar → Calendly Bookings

Views:
- **All Bookings** — all registrations sorted by session date (newest first)
- **Pending Waivers** — active registrations where waiver is not yet signed
- **Unpaid** — active registrations with unpaid status
- **Cancellations** — canceled and rescheduled registrations

### Auto-Created Follow-Up Tasks
On each new `invitee.created` event, 3 follow-up tasks are created for the client (if not already existing):
1. "Send same-day session confirmation/check-in" — due on session date
2. "Send 24-hour post-session follow-up" — due day after session
3. "Send 72-hour rebooking or package offer" — due 3 days after session

### Sync Status Indicator
A read-only status line at the bottom of the sidebar auto-syncs every **5 minutes**. Hovering it shows a tooltip with the exact record count and time of the last sync.

| State | Display | Hover tooltip |
|---|---|---|
| Syncing | Spinning icon + "Syncing Calendly…" | "Sync in progress…" |
| Synced with new data | "**N records synced**" + last sync time | "Last sync: HH:MM:SS · N records imported" |
| Synced, nothing new | "Calendly up to date" + last sync time | "Last sync: HH:MM:SS · No new bookings" |
| Events queued | "**N bookings pending…**" | "N bookings queued — will sync within 5 minutes" |
| Initial load | "Calendly sync active" | "Syncs automatically every 5 minutes" |

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

**B2B — Studio Partners** (teal left border accent)
- Studio Partners
- Outreach Hub

**B2C — Personal Clients** (brand left border accent)
- Clients
- Testimonials
- Follow-Ups
- Referrals
- Follow-up Engine

**Core — Operations** (no accent, always visible)
- Today (Command Center) — pinned at top
- Sessions
- Offers & Sales
- Revenue
- Expenses
- Calendly Bookings
- Workflows
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
| `CALENDLY_BACKEND` | `""` — base URL for backend API (empty = use Vite proxy) |

### State Management

All state is managed via React `useState` and `useMemo` in the root `App` component and passed down as props. No external state library is used.

### Key Components

| Component | Purpose |
|---|---|
| `App` | Root — auth gate, layout, data state |
| `LockScreen` | PIN login, user tile selection |
| `Today` | Dashboard with stats, alerts, NBA |
| `Section` | Dynamic view renderer for all data sections |
| `RecordDrawer` | Slide-in detail/edit panel |
| `EditProfileModal` | Profile photo + info + PIN change |
| `UserManagementView` | Multi-user CRUD and permissions |
| `AdminView` | 4-tab admin panel: overview, schema browser, integrity check, storage |
| `SessionBookingsTab` | Bookings tab inside session drawer — lists all Calendly registrants |
| `WorkflowsView` | Five workflow pipeline visualizations |
| `TemplateLibraryView` | Template browsing and copy |
| `TestimonialLibraryView` | Testimonial cards and action tracking |
| `ContentAnalyticsView` | Content funnel and performance |
| `FollowUpEngine` | Sequence management and message queue |
| `PartnerLaunchChecklist` | 4-phase studio onboarding checklist |
| `EquipmentChecklist` | Per-session gear and setup checklist |
| `PipelineSnapshot` | 9-metric business overview panel |
| `AlertsPanel` | Smart alert list with severity and actions |
| `ImportModal` | CSV import with parsing and validation |

### Security Utilities (`Sec` object)

```js
Sec.hashPin(pin)                          // SHA-256 PIN hash
Sec.newSalt()                             // 16-byte random base64 salt
Sec.deriveKey(pin, saltB64)               // PBKDF2 → AES-GCM CryptoKey
Sec.encrypt(data, key)                    // AES-256-GCM encrypt → base64
Sec.decrypt(b64, key)                     // AES-256-GCM decrypt → object
Sec.generateMasterKeyB64()                // Random 256-bit master key
Sec.importMasterKey(b64)                  // Import raw key as CryptoKey
Sec.wrapKeyForUser(masterKeyB64, pin, salt)   // Encrypt master key for user
Sec.unwrapKeyForUser(wrappedB64, pin, salt)   // Decrypt master key for user
Sec.sanitize(val)                         // Strip formulas and HTML from CSV input
Sec.validate(data)                        // Schema validation on load
```

---

*Documentation updated June 2026 (v6.0). Simply Breathe OS is a living system — update this document as features are added.*
