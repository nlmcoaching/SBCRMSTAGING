# Code Review #2: simply-breathe-app (follow-up)

**Date:** 2026-07-17 · **Prior review:** 2026-07-10 · **Scope:** full codebase after the fix pass + module refactor (~24k LOC)
**Method:** three parallel re-review passes (backend, core libs, frontend), each verifying prior findings and hunting new ones; all Critical items below re-verified line-by-line against source.

## Headline

The domain-logic fixes from the last review are real and well done — money math, refunds, the stale-closure sync loop, auth hardening, and restore gating are all genuinely fixed, most with new regression tests. **But the refactor that split the 10k-line App.jsx into modules shipped ~40 missing imports across 7 files, several of which stop the app from booting, saving, or opening records. As committed, this build does not run.** Separately, the backend still has a privilege-escalation path (self-assigned "Owner" role) that survived the previous fix.

Net: excellent progress on logic, but the build is currently broken and must not deploy until the import pass lands. Prior findings: 16 of 18 frontend and 13 of 15 backend fully fixed.

---

## P0 — Blockers (app is broken / privilege escalation) — fix before anything else

| # | File:Line | Issue | Verified |
|---|-----------|-------|----------|
| 1 | src/styles/appCss.js:1,86 | **App white-screens at load.** `${FONT.display}` used but only `{ C, hexA }` imported. `buildAppCss()` runs at module scope (App.jsx), so the ReferenceError fires during bundle eval — nothing renders. Fix: add `FONT` to the import. | ✅ confirmed |
| 2 | src/App.jsx:967,1024 | **Nothing ever saves.** `persistAllAgreementBlobs` is called in the persist + migration effects but is not imported and not exported from the drawer module (drawer/index.js only exports RecordDrawer, dataForEncryptedStore, stripAgreementForStore). Every debounced save throws → permanent "Save failed" banner, zero persistence. Fix: export it from the drawer (or move agreement helpers to lib/agreements.js) and import in App. | ✅ confirmed |
| 3 | src/components/modals.jsx:2,189,342,369 | **ConfirmModal/EditProfileModal crash the app.** `Upload, RefreshCw, Check, LogOut, Info` used but not imported. ConfirmModal renders at App level with no error boundary, so any confirm (logout, delete, refund) unmounts the React root → white screen. Fix: add the icons to the lucide-react import. | ✅ confirmed |
| 4 | src/components/tables.jsx:2,32,132,165 | **Every table crashes.** `ChevronRight` and `calcNet` used but not imported (imported `ChevronDown, Plus` are unused). Breaks Revenue Table, Expense Table, This-Month lists. Fix: import both. | ✅ confirmed |
| 5 | src/features/drawer/drawer.jsx | **Record drawer broken for all record types.** Missing imports: `LANE` (runs on every drawer render → "Could not open this record"), `emptyChecklist`, `formatRegistrationAmount`, `registrationPaymentForLtv`, `resolveSessionListPrice`, `backfillRegistrationPaymentsForRegs`, plus `CLIENT_TYPE_COLOR`/`OPEN_STATUSES`/`CLOSE_PROB_COLOR` omitted from the constants destructure. | reported |
| 6 | src/features/today/today.jsx | **Command Center dashboard broken.** Missing: `virtualEquipPhaseItems`, `buildRevenueViewRows`, `sessionBookingRevenue`, `partnerHasAgreementPdf` (crashes buildAlerts → bell badge + alerts panel), `DISMISSED_ALERTS_KEY`, `isAutoExpenseRecord`/`AUTO_SPLIT_EXP_ID_PREFIX`/`AUTO_CXL_EXP_ID_PREFIX`/`applyStudioSessionSplit`/`calcNet`, `registrationRevenueByMonth`, `SOURCE`/`SOURCE_COLOR`. | reported |
| 7 | src/features/section/section.jsx:463,584 | Sessions **Calendar** view crashes — `registrationSessionAmount` and `LANE` not imported. | reported |
| 8 | src/lib/schema/views.jsx:24-31,577-625 | All Follow-Ups views and Testimonials "Action needed"/"By theme" crash — `FUTYPE`, `FUTYPE_COLOR`, `TESTIMONIAL_ACTION_STATUSES`, `TESTIMONIAL_THEMES` missing from destructure, and `FollowUpSendButton` never imported. (When fixing, prefer passing FollowUpSendButton via ctx/column factory over a lib→features import.) | reported |
| 9 | backend/routes/auth.js:96 (+55,143) | **Privilege escalation — self-assigned Owner role.** The prior fix forces `canEdit:false` on self-registration but still honors a client-supplied `role` for a new userId — including `"Owner"`. Attack with only FRONTEND_SECRET (browser-held): register `role:"Owner"` → mint an Owner session → re-register self with `canEdit:true`, or overwrite the real Owner's unlockSecret (account takeover) → full refund/cancel/clear-queues/send-email access. Fix: force `nextRole="Viewer"` in the self-registration branch; only an authenticated Owner (or bootstrap) may assign Owner. | ✅ confirmed |

**Why P0 gates everything:** items 1–8 mean the current build can't boot, persist, or render core screens; item 9 defeats the entire role model. No other work should ship on top of this build.

**Root cause for 1–8:** the mechanical half of the extraction was never lint-checked. The repo's own `npm run lint` (`no-undef`) catches all of these. Add lint to CI and this class of bug can't recur. There is also no error boundary above App-level UI, which turns each missing import into a full white screen rather than a contained failure.

---

## P1 — High (data integrity / correctness, ship next)

| # | File:Line | Issue |
|---|-----------|-------|
| 10 | src/lib/revenue/ledger.js:157,196 | **"Unknown"-status priced bookings shown as $0 free rows.** The exclusion list omits `"unknown"`, so a priced booking not yet through a Stripe sync is emitted as a $0 `isFree` revenue row — the same "silently free" symptom last review removed from *matching*, reintroduced at the *reporting* layer. Self-heals after a reconcile, but understates revenue until then. Fix: add `"unknown"` to the skip list (when `paymentAmount > 0 && !stripeVerified`). |
| 11 | src/lib/calendlySync.js:207-211 | **Pending queue never drains for rebooked-after-cancel invitees.** An `invitee.created` matching a canceled/rescheduled registration returns without acking the event id, so it's refetched and re-skipped every sync forever — unbounded queue growth. Codified by the test, so the leak is now spec. Fix: ack (`processedIds.push`) before returning; update the test. |
| 12 | backend/lib/calendly.js:453-455,325 | Enrichment overwrites webhook-supplied payment data with nulls: `fetchInviteePayment` returns a truthy object with null fields when nothing is found, and the `!= null` guard is always true, so `paidAmount:null`/`paymentSuccessful:false` clobber values the webhook already provided. Fix: return null when nothing found, or only patch when `paidAmount != null`. |
| 13 | src/features/revenue/revenue.jsx:348 | RefundsView "Total refunded" always $0 — sums a nonexistent `amount` field on refund rows (they carry negative `gross`). Fix: `sum` of `Math.abs(gross)`. |

---

## P2 — Medium (harden before calling it production-ready)

| # | File:Line | Issue |
|---|-----------|-------|
| 14 | backend/routes/stripe.js:183,195; lib/refundPolicy.js | Refund policy gate is fully client-attested — an Edit session can send `cancelerType:"host"` to bypass the 24h policy. Cross-check against the backend's own stored Calendly cancellation record; treat body fields as hints. |
| 15 | backend/lib/queue.js:148-157; routes/stripe.js:152-162 | Webhook log + refund audit still fail open (`catch → []`) and write non-atomically — a transient error or mid-write crash destroys the financial audit trail. Apply the same quarantine + `atomicWriteUtf8` the queues got. |
| 16 | src/App.jsx:713-739; drawer.jsx:479-500 | Ack ids / status harvested by mutating closure vars *inside* the `setData` updater, then read right after. React only runs the updater synchronously via an optimization that's skipped when an update is already queued — then the ack fires with empty ids (events reprocessed next sync). Compute ack ids outside the updater from a latest-data ref. |
| 17 | src/lib/revenue/stripeSync.js:30-51 | Full reset→re-match→patch→LTV pipeline runs twice per Stripe sync (inner + outer `applyPaymentReconciliation`). Idempotent but doubles the heaviest work. Drop one call. |
| 18 | src/lib/domainActions.js:42; revenue/ltv.js:95 | Studio `registered` recount excludes only `canceled` while sync excludes `canceled` + `rescheduled` — a reschedule then a domainActions helper inflates `session.registered`. Use one shared `isInactiveRegistration` predicate. |
| 19 | backend/routes/calendly.js:47-61; lib/calendly.js:89 | `invitee_no_show.*` webhooks accepted as supported but always skipped (invitee arrives as a URI string, fails the email gate) — no-show tracking is silently dead. Resolve invitee via URI for these events. |
| 20 | backend/stripe-handlers.js:51,55 | Stripe dedup collision when `event.id` absent → `stripe_undefined` / `""` match drops the second event. Limited to unsigned dev mode, but reject id-less events. |
| 21 | src/App.jsx:62,1174; per-row find() in views.jsx:258-304 | Search `query` still lives at App root and `crmValue` is a fresh object each render → whole tree re-renders per keystroke, and registration/followup columns still do per-row `clients.find()`. Move query into the header, memoize `crmValue`, build a clientsById map once. |
| 22 | src/App.jsx:110-113,657 | Nav persistence is write-only — `sb:nav:v1` is written and cleared but never read (every unlock hard-resets to "today"), so the "returns to same page" comment describes a nonexistent feature. Implement the restore or delete the effect. |

---

## P3 — Low / cleanup

- **Mojibake in UI strings** — "Ã—" instead of "×" on close/dismiss buttons (App.jsx:1326,1415; drawer.jsx:2403; today.jsx:681,797,1430). Encoding damage from the file split; replace with `&times;`/"✕".
- Report generators still interpolate numeric fields raw (drawer.jsx:1670-1683) — low residual from prior finding; escape everything through `esc()`.
- `renderWithVars(t.body)` throws on undefined body (templates.jsx:209,477); crash risk on missing `name` in a couple of spots.
- Backend: destructive queue clears bypass the mutex (server.js:223; routes/calendly.js:320; routes/stripe.js:319); CORS rejection returns HTML 500 (no error/404 middleware); Calendly webhooks no longer written to the audit log; `routing_form_submission` events have no dedup key; sequential upstream fan-out with no overall deadline (up to 50 serial calls).
- Frontend: `getDbSchema()` rebuilt every AdminView render (memoize); dead `[ePerm,setEPerm]` in a `.map`; `handleUpdatePerms`/`handleResetPin` rely on component-level early-return rather than an internal role guard; `secMeta.js` device-key TOCTOU race; `sendCrmEmail` posts to a relative URL instead of via `calendlyApiUrl()`.
- Residual from prior review, accepted: vault protection still bounded by passphrase entropy + co-located device key (now 12-char alnum policy, 600k PBKDF2 — much improved); legacy `hashPin` still exported but used only for v1→v2 migration.

---

## What genuinely improved since 2026-07-10

- **All four money-critical bugs fixed with regression tests:** refunded payments survive re-sync (full + partial), the `_centsFormat` unit mixing is gone (new `revenue/money.js` boundary), unmatched paid bookings are `"unmatched"` not silently free, and amount is now a first-class matching tiebreaker.
- **The Critical stale-closure sync loop is properly eliminated** — sync logic extracted to pure, tested `lib/calendlySync.js` and applied via updater-form `setData(prev => …)`.
- **Backend hardened:** CORS lets webhooks through, cancel-booking now requires Edit, auth store fails closed with a 503, constant-time secret comparisons, encryption key format-validated at startup, queues get atomic writes + quarantine-on-corruption + a shared mutex, webhook handling is queue-first/enrich-later with dedup, PII out of logs, `engines` set.
- **Frontend logic fixes:** CSV booleans coerced, refund double-deduction removed, status/field constants centralized, unreplaced-`{{token}}` send guard, role-filtered navigation, backup restore behind typed-confirm + Owner PIN, 12-char passphrase policy.
- **Real test suites added** — money paths, refund-through-reset, sync engine, LTV side effects, store migration, crypto round-trips.

## Verdict

**Request Changes — build broken.** The thinking and the domain fixes are excellent; the mechanical extraction was shipped without running the repo's own linter. Land the P0 import pass (items 1–8) plus the auth role clamp (item 9), add `npm run lint` to CI, then address P1 data-integrity items before trusting reported numbers. After that this is a solid, well-tested codebase.

## Verification Plan

1. **P0 build:** `npm run lint` must report zero `no-undef` (note: it wouldn't run in my sandbox due to a truncated package.json on the mount — run it locally). Then load the app, unlock, edit a client, confirm "✓ Saved" persists across reload; open one record of each type, the bell panel, Sessions→Calendar, Follow-Ups→Due today, Revenue→Refunds, and a confirm dialog (logout) — all previously-crashing paths.
2. **Item 9 (auth):** with only the frontend secret, POST `/api/auth/register-unlock` with a new userId and `role:"Owner"`; after the fix the stored role must be "Viewer".
3. **Item 10:** create a priced booking with status `"unknown"` (no Stripe sync) and confirm it does not appear as a $0 free row in revenue.
4. Add an error boundary above App-level UI so a future missing import degrades gracefully instead of white-screening.
