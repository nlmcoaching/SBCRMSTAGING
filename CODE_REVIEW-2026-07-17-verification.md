# Code Review #3 — Verification Pass

**Date:** 2026-07-17 (post-fix) · **Scope:** confirm the fixes from review #2 landed; catch regressions
**Method:** two authoritative sweeps via the file-Read path (the sandbox bash mount truncates files at EOF, so `eslint`/tests can't be trusted here — this pass reads complete files instead). All Critical/prior-"fixed" items re-verified line-by-line.

## Bottom line

**The build is no longer broken, and every P0–P3 item from the prior review is fixed.** The ~40 missing imports are all resolved, the Critical backend privilege-escalation is genuinely closed, and all data-integrity items check out. What remains is six Low-severity cosmetic/perf items and one Medium test-coverage gap — none block build, startup, or deploy.

## Missing-import sweep (the class that broke the build): **PASS**

Every previously-unresolved identifier now resolves to an import or local definition, confirmed across App.jsx, appCss, modals, tables, drawer, today, section, views, all feature modules, and all 13 barrel files. Spot-checks I verified directly: `FONT` (appCss.js:1), `persistAllAgreementBlobs` (App.jsx:42 ← exported drawer/index.js), modals icons (modals.jsx:2), `ChevronRight`+`calcNet` (tables.jsx:2,5), `LANE` (drawer.jsx:48), `registrationSessionAmount`/`LANE` (section.jsx), and the today.jsx helper set. `FollowUpSendButton` is now injected via `ctx` rather than a lib→features import — clean.

## Prior fixes — all confirmed

| Area | Item | Status |
|------|------|--------|
| **P0 build** | ~40 missing imports across 7 files | ✅ Fixed |
| **P0 security** | Auth self-registration forces `role="Viewer"`; full 4-branch register-unlock trace shows no path lets a non-Owner obtain Owner/canEdit; existing-secret overwrite still requires Owner session or valid unlock proof | ✅ Fixed |
| P1 | Ledger skips `"unknown"` status (no more $0 free rows for priced pre-sync bookings) | ✅ Fixed |
| P1 | calendlySync acks rebooked-after-cancel events (queue drains); test added | ✅ Fixed |
| P1 | Calendly enrichment no longer clobbers webhook payment data with nulls | ✅ Fixed |
| P2 | Refund policy cross-checks the backend's own stored Calendly cancellation record; host-escalation vector closed | ✅ Fixed* |
| P2 | Queue/webhook-log/refund-audit: quarantine-on-corrupt + atomic writes | ✅ Fixed |
| P2 | `applyPaymentReconciliation` runs once per sync | ✅ Fixed |
| P2 | Shared `isInactiveRegistration` predicate (excludes canceled + rescheduled) | ✅ Fixed |
| P2 | No-show webhooks (URI-string invitee) resolved | ✅ Fixed |
| P2 | id-less Stripe events rejected (400) | ✅ Fixed |
| P3 | Queue clears under lock; CORS/404 error middleware; routing-form dedup | ✅ Fixed |
| FE fixes | Search state moved to shell/HeaderSearch; ack ids computed from `dataRef` outside the setState updater; mojibake cleaned; `renderWithVars` guards undefined; **error boundary now wraps App + drawer** | ✅ Fixed |

*Caveat on refund policy: when no stored cancellation record exists (e.g. a refund issued >7 days after cancel, once the queue entry is purged), timing fields still fall back to client hints. The host-vs-attendee escalation is closed; the timing fallback is a minor residual.

## Remaining items (none blocking)

**Medium**

- No test for the `register-unlock` authorization matrix (backend/routes/auth.js) — this was the highest-risk fix (the Critical) and is the one path without a dedicated test. Add an `auth.test.js` covering: bootstrap, non-Owner self-reg forced to Viewer, Owner-granted role/canEdit, and secret-rotation requiring a valid unlock proof.

**Low (cosmetic / perf)**

- `revenue.jsx:190,348` — "Total refunded" footer renders **blank**: the column is `sum:"gross"` but the footer object is keyed `amount`, and TableView reads `footer[c.sum]`. Per-row amounts are correct; only the total cell is empty. Fix: key the footer `gross`.
- `App.jsx:1332-1345` — Calendly sync panel uses theme keys that don't exist (`C.border`, `C.green`, `C.red`, `C.ink1`); they resolve to `undefined` so borders/status colors render wrong (non-crashing). Fix: use `C.line` and existing palette values.
- `App.jsx:1183-1187` — `crmValue` `useMemo` deps include per-render functions (`syncStripe` etc.), so the memo recomputes every render and consumers re-render on any App render. Correctness fine; perf only.
- `backend/routes/auth.js:91` — rotate branch `nextRole = existing.role || nextRole` could leak a client role if `existing.role` were ever blank (not reachable normally; requires a hand-edited record + valid unlock proof). Hard-pin to `existing.role || "Viewer"`.
- `backend/routes/stripe.js:67` — `appendWebhookLog` runs before the dedup check, so Stripe retries add duplicate audit-log rows (audit noise; no data loss).
- `backend/routes/stripe.js:74` — webhook log stores `amountGross` in cents while CRM records use dollars; harmless internally, but don't render it as dollars in any UI.

## Verdict

Ship it, with the caveat that the two Low display bugs (blank refund total, wrong sync-panel colors) are worth a five-minute cleanup and the `register-unlock` auth path deserves a test given it was the Critical. The reliable final gate is on your machine: `npm run lint` (expect zero `no-undef`) and `npm test` — I couldn't run either here because the sandbox mount serves truncated files, but the complete-file read pass shows the code is sound.
