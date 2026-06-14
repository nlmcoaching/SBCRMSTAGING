# Simply Breathe OS — CRM Documentation

> **Version:** 5.0 (June 2026)
> **Stack:** React 18 · Vite · Recharts · Lucide React · PapaParse
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
17. [Navigation & Layout](#navigation--layout)
18. [Data Import / Export](#data-import--export)
19. [Profile & Account](#profile--account)
20. [Seed Data](#seed-data)
21. [Technical Architecture](#technical-architecture)

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

**Navigation:** Sidebar → User Management (Core section)

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
| Net Revenue MTD | Sessions this calendar month, net of studio split |
| Referral Revenue | Revenue from clients whose source is "Referral" |
| Active Members | Clients with type "Member" |
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

Automatically generated warnings when something is slipping. Each alert has a severity level (high / medium / low) and a "View" action.

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

**Navigation:** Sidebar → Clients (B2C lane)

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

**Navigation:** Sidebar → Sessions (B2C lane)

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

- **All Sessions** — Full table
- **Upcoming** — Future sessions
- **Completed** — Past sessions with performance data
- **Session Performance** — Analytics view

---

## Offers & Sales Pipeline

**Navigation:** Sidebar → Offers (B2C lane)

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

**Navigation:** Sidebar → Revenue (B2C lane)

### Revenue Channels Tracked

Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner

### Per-Record Fields

Gross revenue · Stripe/processing fee · Studio split · Facilitator cost · Refunds · Net revenue · Cost center · Source · Campaign · Linked session · Linked client

### Analytics Views

- Revenue by channel (bar chart)
- Gross vs net comparison
- Month-over-month trend (area chart)
- Top revenue sources ranked

---

## Content Calendar

**Navigation:** Sidebar → Content (B2C lane)

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

## Navigation & Layout

### Sidebar Structure

Sections are grouped into three visual lanes:

**B2C — Personal Clients** (left border accent)
- Today (Dashboard)
- Clients
- Sessions
- Offers
- Follow-Up Engine
- Revenue
- Content
- Testimonials
- Referrals

**B2B — Studio Partners** (teal left border accent)
- Studio Partners
- Outreach Hub

**Core — Operations** (no accent)
- Templates
- Workflows
- User Management

### Header

Each page has a sticky header with:
- Page title
- Lane badge (B2C / B2B) if applicable
- Search bar
- "New" button (permission-gated)
- Profile avatar (top-right)

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

- Available for: Clients, Studio Partners, Sessions, Offers, Referrals, Content, Outreach
- Drag-and-drop or file picker
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
├── public/
│   ├── sb logo.png          # Sidebar logo
│   ├── sb-heart-wave.png    # Lock screen logo
│   └── favicon.ico
├── src/
│   ├── App.jsx              # All components, logic, styles (single-file architecture)
│   └── index.css            # Global CSS + responsive rules
├── vite.config.js           # CSP headers, server config
├── package.json
└── DOCUMENTATION.md
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

*Documentation generated June 2026. Simply Breathe OS is a living system — update this document as features are added.*
