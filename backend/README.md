# Simply Breathe OS — Calendly Webhook Backend

A lightweight Node.js/Express server that receives Calendly webhook events and queues them for the React CRM to process.

---

## Layout

| Path | Role |
|---|---|
| `server.js` | Express bootstrap (config validation, Helmet/CORS/rate limits, mounts routers) |
| `routes/` | `calendly`, `stripe`, `auth`, `email` route modules |
| `lib/` | `queue`, `authUsers`, `calendly`, `refundPolicy` helpers (+ unit tests) |
| `stripe-handlers.js` | Stripe signature verify + payment extraction |

```bash
npm test                 # from repo root: frontend + backend node:test suites
npm test                 # from backend/: queue, refund policy, Calendly queue dedup
```

## How It Works

```
Calendly → POST /api/webhooks/calendly → backend queues event
React CRM → POST /api/calendly/pull-recent → fetches missing bookings from Calendly API
         → GET /api/calendly/pending  → fetches + processes events
React CRM → POST /api/calendly/acknowledge → marks events done
```

The React CRM polls the backend every **2 minutes** when logged in, and you can trigger a manual sync via the **"Sync Calendly"** button in the sidebar footer.

---

## Setup (First Time)

### 1. Install dependencies
Requires **Node.js 18 or newer** (`engines.node` in `package.json`).

```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- `CALENDLY_WEBHOOK_SIGNING_KEY` — generate (`openssl rand -hex 32`) and pass as `signing_key` when creating the webhook subscription; store the same value here. Required in production.
- `ALLOWED_ORIGINS` — your React dev server URL (default: `http://localhost:5173`)
- `STRIPE_SECRET_KEY` — prefer a **restricted** key with Refunds write (`rk_test_` / `rk_live_`), not a full `sk_live_` key. Use test keys for local work.

**Secret hygiene:** `backend/.env` is gitignored but still plaintext on disk. Do not zip, OneDrive/Dropbox-sync, or share a project folder that contains live keys. On shared or production hosts, inject secrets from a vault (HashiCorp Vault / AWS Secrets Manager) instead of a checked-out `.env`. If this machine was ever shared or the folder left the box, rotate every live credential (Stripe, Calendly PAT, Resend, webhook secrets, `FRONTEND_SECRET`, `ADMIN_SECRET`, `QUEUE_ENCRYPTION_KEY`).

Live Stripe keys with `NODE_ENV≠production` print a startup warning unless `ALLOW_LIVE_STRIPE_IN_DEV=true`.

```bash
node scripts/check-env-prefixes.js   # confirms key kinds by prefix only — never prints values
```

### 3. Start the backend
```bash
npm run dev       # development (auto-restarts on changes)
npm start         # production
```

The backend runs on `http://localhost:3001` by default.

---

## Register Your Webhook in Calendly

### Option A: Expose locally with ngrok (for development)
1. Install ngrok: https://ngrok.com/download
2. Run: `ngrok http 3001`
3. Copy the HTTPS URL (e.g. `https://abc123.ngrok.io`)
4. In Calendly Dashboard → Integrations → Webhooks → Add webhook
   - URL: `https://abc123.ngrok.io/api/webhooks/calendly`
   - Events: `invitee.created`, `invitee.canceled`, `invitee_no_show.created`, `invitee_no_show.deleted`

### Option B: Deploy to a server (production)
Deploy `backend/` to any Node.js host (Railway, Render, Fly.io, VPS). Update Calendly webhook URL to your production server URL.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/webhooks/calendly` | Receives Calendly events (signature-verified); queues immediately with invitee-URI dedup, enriches async |
| `POST` | `/api/calendly/pull-recent` | Fetches recent Calendly bookings via API; queues invitees missing from webhook queue |
| `GET` | `/api/calendly/pending` | Returns unprocessed events |
| `POST` | `/api/calendly/acknowledge` | Marks events as processed |
| `GET` | `/api/calendly/events` | All events (debug/admin) |
| `DELETE` | `/api/calendly/events` | Clear queue (dev only) |
| `GET` | `/health` | Health check |

---

## What Gets Created in the CRM

When `invitee.created` arrives:
- **New client** is created (if email not found), or existing client is updated
  - Source set to `Calendly`
  - Status set to `Booked`
  - Next session date updated
- **Session registration** record is created (or updated if re-booking)
  - Links to client
  - Stores Calendly URIs, event details, custom question answers
  - Waiver status: `pending`
  - Payment status: `unknown`
- **3 follow-up tasks** are queued:
  - Same-day session confirmation/check-in
  - 24-hour post-session follow-up
  - 72-hour rebooking or package offer

When `invitee.canceled` arrives:
- Session registration status → `canceled` (or `rescheduled` if `payload.rescheduled = true`)
- Client is **not** marked as lost for reschedules

When `invitee_no_show.created` arrives:
- Session registration status → `no_show`

---

## Custom Question Mapping

If you use Calendly custom questions, the backend extracts answers by normalizing question text. Mapped fields:

| Question (approximate) | CRM Field |
|------------------------|-----------|
| "Have you done breathwork before?" | `doneBreathworkBefore` |
| "How did you hear about us?" | `howHeard` |
| "Who referred you?" | `referredBy` |
| "Any physical or emotional concerns?" | `concerns` |
| "Are you attending virtually or in person?" | `attendanceType` |
| "Have you reviewed contraindications?" | `reviewedContraindications` |
| "Phone number" | `phone` |

---

## Data Storage

Events are stored as JSON in `backend/data/pending-events.json`. This file is created automatically on first webhook receipt.

> **Note:** This is a file-based queue — suitable for single-server deployments. For high-volume use, consider replacing with a database.
