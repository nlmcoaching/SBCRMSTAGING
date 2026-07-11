# Code Review: simply-breathe-app (full codebase)

**Date:** 2026-07-10 · **Scope:** backend (server.js, stripe-handlers.js), src/lib, src/App.jsx, src/features, tests · ~22k LOC
**Method:** four parallel review passes (backend security, core libs, App.jsx, feature modules); all Critical/High findings verified line-by-line against source.

## Summary

This is an unusually well-engineered app for its size — real HMAC webhook verification with replay windows, AES-256-GCM at rest, envelope encryption client-side, a defensively built refund flow, and zero `dangerouslySetInnerHTML` anywhere. The blockers are two Critical bugs (a CORS rule that breaks all webhooks in production, and a stale-closure sync loop that silently reverts user edits), plus a cluster of High revenue-integrity and authorization issues.

## Critical Issues

| # | File:Line | Issue | Severity |
|---|-----------|-------|----------|
| 1 | backend/server.js:182-193 | **CORS middleware rejects all Origin-less requests in production.** Calendly/Stripe webhook POSTs and health checks never send an `Origin` header, so in prod every webhook 500s; providers will retry then disable the endpoint. CORS doesn't protect server-to-server calls anyway — the HMAC signature is the auth. Fix: scope the CORS middleware to CRM-facing routes, or allow no-Origin requests through. | 🔴 Critical |
| 2 | src/App.jsx:1452-1460 (+744-751, 1383-1422) | **Stale-closure sync loop reverts user edits every 15 min.** The poll effect depends only on `[locked]`, so `setInterval` captures `syncCalendly`/`syncStripe` from the unlock-time render. Both build `let next = { ...data }` from that stale snapshot and replace whole collections via `setData(prev => ({...prev, clients: ..., registrations: ...}))` — even on zero-event ticks. Any edit after unlock is silently reverted, then persisted. Fix: apply events inside the `setData(prev => …)` updater, or hold the sync fns in a ref updated each render. | 🔴 Critical |

## High

| # | File:Line | Issue | Category |
|---|-----------|-------|----------|
| 3 | backend/server.js:1813 + 1322-1327 | **`/api/calendly/cancel-booking` is destructive but gated by `requireSessionToken`, not `requireEditSession`** (the comment says "Gate like refunds" — refunds require `canEdit`). Combined with the `register-unlock` branch that lets a caller holding only FRONTEND_SECRET self-register a fresh Viewer and mint a session, a leaked frontend secret cancels customer events. Fix: `requireEditSession`, and require Owner approval for all registrations server-side. | Security |
| 4 | src/stripeMatching.js:294-313 + 251-257 | **Every re-sync orphans refunded payments.** `resetStripeAutoMatches` clears `bookingId` on all non-manual payments, but the re-link pass only considers `status === "paid"` — refunded/partial-refund charges lose their booking link permanently, then the registration is marked free/$0. Gross revenue and the refund both vanish from LTV and revenue rows. Fix: skip `refunded`/`partial_refund` in reset (or include them in re-link). The existing test suite has no refunded-payment-through-reset case — add one. | Correctness ($) |
| 5 | src/lib/revenue.js:13-16, 173-195, 806-817 | **`_centsFormat` unit mixing on merges.** Webhook/refund merge paths write dollar values back into records that keep `_centsFormat: true`, so the next read divides by 100 again (100× undercount). Refund `j.amount` is stored with no unit assertion; a cents value drives `paid − refunded` negative, silently clamped to $0 by `Math.max`. Fix: normalize units at the ingestion boundary, drop `_centsFormat` on rewrite. | Correctness ($) |
| 6 | src/App.jsx:25 vs 135 | **Module-level `setCrmSettings` shadowed by the `useState` setter** — the duplicated `setCrmSettings(s); setCrmSettings(s);` calls (e.g. 361-363, 1683-1688) were meant to hit both; the module cache behind `getS()` is never updated, so drawer dropdowns serve stale option lists after settings changes. Fix: import the module setter under an alias. | Correctness |
| 7 | src/App.jsx:8585 + src/features/revenue/revenue.jsx:454-455 | **CSV-imported booleans stay strings; `"false"` is truthy.** Only `amount` is coerced; `taxDeductible`/`recurring` arrive as `"false"` strings and count as true — the Tax Deductible YTD figure (a tax-reporting number) is wrong for any import containing false values. Fix: coerce boolean fields in the import mapper. | Correctness ($) |
| 8 | src/lib/sec.js:11-24 + secMeta.js:8-46 | **Vault protection is bounded by PIN entropy.** A 6-digit PIN space is exhausted offline in hours even at 600k PBKDF2 iterations once someone copies IndexedDB (wrapped key, salt, ciphertext co-located; device key stored beside the ciphertext). Fix: require a longer alphanumeric passphrase for the wrapping credential, or verify unwraps server-side with rate limiting (the unlock-secret plumbing already exists). | Security |

## Medium (selected)

| # | File:Line | Issue | Category |
|---|-----------|-------|----------|
| 9 | backend/server.js:248-288 | Queue decrypt/read failures return `[]` and the next write overwrites the file — a GCM auth failure (possible tampering) destroys all pending events. Quarantine (`.corrupt` rename) instead. Writes are also non-atomic (`writeFileSync` direct; use temp + rename). | Correctness |
| 10 | backend/server.js:807-820 | Calendly webhook path has no idempotency dedup (Stripe path does); ~3 sequential enrichment API calls run before the 200 response, making timeout-then-retry duplicates likely. Queue first, enrich async, dedup on invitee URI + event type. | Correctness |
| 11 | backend/server.js:1159-1169, 1292-1296 | Auth-user store fails open: any read/decrypt error yields `{users:{}}`, re-enabling Owner bootstrap for the next FRONTEND_SECRET caller. Distinguish file-absent from file-unreadable; fail closed. | Security |
| 12 | backend/server.js:1224, 1922; 209-213 | Frontend/admin secret compares are not timing-safe (rest of codebase uses `timingSafeEqual`). Encryption key validated for presence only — a malformed key silently disables at-rest encryption in prod; validate `/^[0-9a-f]{64}$/i` at startup. | Security |
| 13 | src/stripeMatching.js:192-219, 259-277 | Unmatched paid bookings auto-marked "free $0" (common when Stripe email ≠ Calendly email) — silent revenue undercount. Greedy nearest-time matching ignores amounts; `amountsMatch` is imported into revenue.js but unused in matching — use it as first-pass tiebreaker. | Correctness ($) |
| 14 | src/features/admin/admin.jsx:522-525 | `clear-queues` (destructive) posts with static API headers only — no `x-session-token` like the refund path. Add the same gate server- and client-side. | Security |
| 15 | src/features/revenue/revenue.jsx:33, 642, 718 | Refunds potentially deducted twice (revenue-row `refunds` and auto "Refunds & Cancellations" expense rows both subtracted). Pick one ledger. | Correctness ($) |
| 16 | src/features/* (workflows:25-60, testimonials:24-126, outreach:20-82) + admin.jsx:822-826 | Status/field-name drift: hardcoded status literals and field names don't match the schema (case, en/em dashes, renamed fields), so several analytics filters silently match zero rows and the integrity checker false-flags every offer. Centralize constants in lib/constants.js. | Correctness |
| 17 | src/features/followup/followup.jsx:48-53, 249-259 | Follow-up sends replace only 4 tokens; library templates use `{{sessionLink}}`, `{{offerPrice}}`, etc., which survive into sent customer emails. Scan for unreplaced `{{…}}` before send. | Correctness |
| 18 | src/features/admin/admin.jsx:742-772 | Backup restore replaces the entire dataset (including the email audit log) on one modal click with shallow validation — reuse the reset flow's typed-confirmation + PIN challenge. | Security |
| 19 | src/App.jsx:1706-1730 | Sidebar/admin tabs not permission-filtered by role (per-action checks exist but gating is scattered); filter sections by role, keep in-view checks as defense-in-depth. | Security |

## Low (grouped)

- **Backend:** PII (customer emails) in console logs; webhook/audit log appends outside the queue mutex; dead ternaries in stripe-handlers.js:65,106 (`? "paid" : "paid"`, `? null : null`); fuzzy substring price matching can cross-bind event types; no `engines` field (needs Node ≥18).
- **Frontend:** missing `await` on `window.storage.get` in store.js:66 (rejections escape the catch); `em_${Date.now()}` email ID collisions; `$$` double prefix (workflows.jsx:284); funnel % always 100 (content.jsx:81); crash on missing `name` (content.jsx:172, templates.jsx:476); `no_show.deleted` clobbers manual attendance (App.jsx:1220-1228); CSV import lacks date-format validation and dedupe; PIN inputs lack `autoComplete="off"`; test fixtures use real-looking personal emails.
- **Performance (fine at current scale):** unvirtualized tables with per-row `find()` (O(clients×rows)) re-rendered per search keystroke; hover state recomputes full revenue attribution (wrap in `useMemo`); zero `React.memo` in the 10k-line tree.
- **Dead code:** empty root `App.jsx`; `STARTER_TEMPLATES` (250 lines, superseded); unreachable `ImportModal`; `EquipmentChecklist`/`SessionChecklist`; unused `tokenValid`; duplicate `DB_SCHEMA` (App.jsx + admin.jsx) already drifted from real field names.

## What Looks Good

- **Webhook verification is genuinely solid:** HMAC-SHA256 with `timingSafeEqual`, 5-min replay windows, duplicate-header rejection, multi-`v1` Stripe key rotation, correct raw-body capture, unsigned-webhook rejection even in dev unless opted in.
- **Layered auth design:** frontend secret → one-shot challenge nonce → HMAC unlock proof → short-TTL session tokens → role/canEdit gates on money-moving endpoints; refund endpoint adds strict ID checks, Stripe-side pre-verification, policy gate with Owner override, and an audit log.
- **Crypto hygiene:** AES-256-GCM with fresh random IVs everywhere, PBKDF2 at OWASP-level iterations with silent per-user upgrades, envelope encryption, one-time recovery codes, session tokens stored only as hashes.
- **No XSS surface:** zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`; report popups escape strings and ship CSP metas; agreement uploads validated by magic bytes; CSV formula-injection neutralized; SSRF guards pin outbound calls to the Calendly API base.
- **Persistence safety:** debounced, sequence-guarded, chained encrypted writes with cross-tab stale-write detection and quota-failure guidance; secrets correctly absent from the client bundle (proxy-injected).
- **Tests that exist are good:** stripeMatching.test.js encodes real regression scenarios (manual-link survival, coupon flows). Gap: nothing covers refund-through-reset (finding #4), `_centsFormat`, sec.js round-trips, or revenue.js money paths.

## Verdict

**Request Changes.** Fix #1 and #2 before the next deploy — one breaks production webhooks outright, the other silently corrupts user data on a timer. Then work #3-#8 (authorization gap + the four revenue-integrity bugs) before trusting reported revenue numbers. The Medium list is a solid next sprint; the architecture itself is sound and the security engineering is well above typical for an app this size.

## Verification Plan

1. **#1 (CORS):** `curl -s -o /dev/null -w "%{http_code}" -X POST https://<prod-host>/api/calendly/webhook -H "Content-Type: application/json" -d '{}'` with `NODE_ENV=production` — currently returns 500 before signature validation; after the fix it should reach the HMAC check (401/400).
2. **#2 (stale closure):** unlock the app, edit a client note, wait one poll tick (or temporarily drop the interval to 30s) — the edit currently reverts; after the fix it persists.
3. **#4 (refund orphaning):** add a test to stripeMatching.test.js: refunded payment linked to a booking → `resetStripeAutoMatches` → `reconcileStripePayments` → assert the link and refund amount survive. It fails today.
4. Re-run `npm run test:stripe-match` and `npm run test:reconcile` after each money-path change.
