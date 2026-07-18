# Security Audit — simply-breathe-app

**Date:** 2026-07-17 · **Trigger:** confirm the recent refactor + fixes introduced no new vulnerabilities
**Method:** three adversarial audits (backend, frontend + client crypto, config/deps/secret hygiene) via complete-file reads; all HIGH findings re-verified firsthand. Secret values redacted throughout.
**Note on tooling:** `npm audit` could not run here (no registry) and the sandbox git index is unreadable, so history was inspected via the object store. Run the local commands at the end to close those gaps.

## Bottom line

**The refactor did not introduce new code-level vulnerabilities, and the previously-fixed items hold up under adversarial review** — the register-unlock privilege-escalation is genuinely closed, webhooks fail closed with timing-safe HMAC + replay windows, AES-256-GCM at rest is correct, SSRF/injection defenses are solid, and no secret is baked into the client bundle.

The real exposures are **operational, not new code bugs**, and two are serious:

1. **Customer/financial PII files remain in pushed git history** (HIGH) — removed from HEAD, still recoverable from history on both remotes.
2. **Live Stripe/Calendly/Resend production credentials sit unencrypted on disk** in `backend/.env` (HIGH) — never committed, but plaintext live keys with `NODE_ENV=development` means refunds run against live Stripe.

Neither was caused by the refactor. Below, sorted by priority.

---

## HIGH

**H1 — Customer/financial PII files are in git history (both remotes).** ✅ verified
`backend/data/stripe-pending-events.json` and `webhook-events-log.json` were committed in `50aed4f` and only later removed by the gitignore rule in `7e90624`. They're gone from HEAD but recoverable via `git show` from history on origin (SBCRM) and staging (SBCRMSTAGING). The repo's own `.gitignore` comment states these files hold "customer/financial PII."
*Impact:* anyone with repo access — or the public, if the repo is ever opened — can recover customer names, emails, phone numbers, and payment data.
*Fix:* scrub with `git filter-repo --path backend/data --invert-paths`, force-push both remotes, re-clone everywhere, and treat the PII in those blobs as disclosed (assess breach-notification obligations under CCPA/CPRA — see Compliance note).

**H2 — Live production secrets unencrypted on disk in `backend/.env`.** ✅ verified (prefixes only; values never read/printed)
The file contains live-key prefixes `sk_live` **and** `rk_live` (Stripe — note both a full secret key and a restricted key are present), `whsec` (Stripe webhook secret), `re_` (Resend), plus real `CALENDLY_API_TOKEN`, `QUEUE_ENCRYPTION_KEY`, `FRONTEND_SECRET`, and `ADMIN_SECRET`. The file is **not** in git and **not** in the bundle — this is a hygiene issue, not a leak. But live keys in plaintext on a workstation are exposed to backups, folder sync/zip, and malware, and `NODE_ENV=development` means refund/write operations hit **live** Stripe/Calendly.
*Fix:* if this folder was ever shared, zipped, synced, or on a machine that isn't solely yours, **rotate all of them now** (commands at end). For any shared/prod host, move secrets to a vault (HashiCorp / AWS Secrets Manager, per your standing preference). The full `sk_live` key in particular should be replaced with a refund-scoped restricted key if the backend only issues refunds.

**H3 — Customer PII + payment ledger readable with a single shared secret.** (access-control design)
`GET /api/calendly/pending`, `/api/stripe/pending`, `/api/stripe/ledger` return full PII (name, email, phone, intake answers, UTM, amounts) gated by `requireFrontendSecret` **only** — no session, no role check, no read auditing. The frontend secret is one long-lived value injected into every CRM request, so any single leak (devtools, proxy misconfig, one compromised operator machine) dumps the entire ledger with one header.
*Fix:* require a valid session token on PII-bearing GETs, scope results to the caller's role, add read auditing, and rotate `FRONTEND_SECRET` on a schedule.

---

## MEDIUM

**M1 — Refund policy fails OPEN.** `backend/lib/refundPolicy.js` returns `eligible:true` when no stored Calendly cancellation record exists or timing is unknown (which also happens when the queue is empty/corrupt, or >7 days post-cancel once the record is purged). An Edit operator can get a policy pass on any charge by omitting the invitee URI / timing, bypassing the 24h late-cancel rule without needing the Owner override. *Fix:* fail closed — no attested record ⇒ deny, require explicit Owner override.

**M2 — Global error handler reflects internal messages.** `backend/server.js:243-247` returns `err.message` verbatim; Express 5 auto-forwards async throws here, leaking file paths, library internals, and decrypt/lock errors for recon. *Fix:* log server-side, return generic `{error:"Internal server error"}`, expose messages only for errors you explicitly mark `expose:true`.

**M3 — Passphrase policy has no weak-password blocklist.** `src/lib/sec.js:12-25` requires 12 chars + a letter + a digit, so `"password1234"` passes. Because the vault's only real protection against an offline IndexedDB dump is passphrase entropy × PBKDF2-600k (both otherwise good), a weak-but-compliant passphrase is the whole ballgame. *Fix:* add a common-password blocklist (zxcvbn or a small list), consider a higher floor for the Owner account.

**M4 — Participant-list PDF popup: `script-src 'unsafe-inline'` + retained `window.opener`.** `src/features/drawer/drawer.jsx:~1470,1505` opens an `about:blank` window (same origin), writes HTML with an inline script, and doesn't null `window.opener`. Not currently exploitable — every interpolated field is HTML-escaped — but fields come from Calendly sync, so one escaping regression becomes same-origin XSS that can reach the decrypted vault. *Fix:* match the safer Session Report generator (no `script-src`, call `window.print()` from the parent) and set `w.opener = null`.

**M5 — `/api/calendly/payment-lookup` has no aggregate timeout.** Up to ~25 URIs fetched serially, each with a 10s timeout and no overall deadline (unlike pull-recent), so an authenticated caller can tie up a request for minutes. *Fix:* add an aggregate deadline / bounded concurrency, return partial results.

---

## LOW / INFO

- **First-run bootstrap trusts client `role`/`canEdit`** (`backend/routes/auth.js:62-66`) — intended, but if the auth store is ever empty and someone holds the frontend secret, they seize Owner. Consider a one-time out-of-band bootstrap token or a server-seeded Owner. Also hard-pin the rotate-branch fallback `nextRole = existing.role || "Viewer"` (auth.js:91).
- **At-rest encryption downgrades to plaintext in dev** when `QUEUE_ENCRYPTION_KEY` is unset (prod hard-fails — good). Ensure any dev box touching real PII sets the key.
- **No Stripe idempotency key on refund creation** — full-refund-only limits impact, but add a per-registration `Idempotency-Key`.
- **Device-key layer for SEC_META is obfuscation, not protection** — the key sits in IndexedDB beside the ciphertext (honestly documented in code). Real protection is the passphrase-wrapped master key. Don't represent SEC_META-at-rest as a boundary.
- **Multi-user role checks are cosmetic for data confidentiality** — all users share one master key, so any user with their own PIN can read the full decrypted dataset regardless of view/edit flags. Correctly defaulted off (`allowMultiUser=false`) with warnings; keep it that way unless per-user key wrapping is added.
- **Plaintext CRM settings mirror in localStorage** not cleared on logout — business config only, no customer PII; consider dropping the plaintext mirror.
- **Replay-window `NaN` check, optional `x-user-id` binding, 300-char fetch-error preview** — all Info-level hardening, not exploitable.
- **Caret ranges on security-sensitive backend deps** (express 5, helmet 8, rate-limit 8) — fine with committed lockfiles; deploy with `npm ci`, not `npm install`.

---

## What's done well (verified, not assumed)

- **register-unlock is not escalatable** — self-registration forced to Viewer/no-edit; rotation requires a one-shot nonce + HMAC proof over the existing secret; roles come only from the server store.
- **Webhooks fail closed** (prod), raw-body HMAC with `timingSafeEqual`, 5-min replay window, duplicate-header rejection.
- **Crypto is correct** — AES-256-GCM, random 12-byte IV per write, 64-hex key validation, auth-tag verify, decrypt fails closed and quarantines corrupt files; envelope encryption with 600k PBKDF2-SHA256 and per-user salt; unbiased ~150-bit recovery codes; key-in-memory-only with forced PIN re-entry on refresh; idle-lock + logout wipe key and decrypted state.
- **No secret in the client bundle** — `dist` rebuilt Jul 17 has zero `VITE_*` / secret literals; the frontend secret is proxy-injected server-side; `.env` files gitignored and never committed.
- **SSRF/injection defenses** — outbound calls pinned to `https://api.calendly.com/`, Stripe IDs validated + `encodeURIComponent`'d, email CRLF-stripped + HTML-escaped, no prototype-pollution merge, no `dangerouslySetInnerHTML`/`eval`/`innerHTML` anywhere in `src`.
- **Insecure dev escape hatches** (`ALLOW_UNSIGNED_*`, `ALLOW_INSECURE_DEV_AUTH`) all fail closed when `NODE_ENV=production`; `start.ps1` refuses ngrok if any are set.
- **Helmet CSP/HSTS, four rate-limit tiers, 256 KB body cap, CORS allow-list, startup secret validation.**

---

## OWASP 2021 snapshot

| Category | Status |
|---|---|
| A01 Broken Access Control | H1/H3 shared-secret PII reads, M1 policy fail-open, bootstrap |
| A02 Cryptographic Failures | Strong; dev-plaintext + device-key caveats |
| A03 Injection | Well defended |
| A04 Insecure Design | H3, M1, multi-user shared-key model |
| A05 Misconfiguration | M2 error leakage; helmet/CORS otherwise good |
| A06 Vulnerable Components | Recent majors; run `npm audit` |
| A07 Auth Failures | Strong (nonce+HMAC, timing-safe, rate-limited) |
| A08 Integrity Failures | Webhook HMAC + GCM tags solid |
| A09 Logging/Monitoring | Refund audit good; no read auditing on PII endpoints |
| A10 SSRF | Well defended |

## Compliance note (flagging, not legal advice)

H1 (PII in git history) may constitute a data exposure under CCPA/CPRA depending on repo access and whether the data covers California residents. If this repo was ever accessible beyond the core team, this is worth escalating for a breach-obligation assessment and likely outside-counsel review before deciding whether notification is required. Document the timeline (commit `50aed4f` → removal `7e90624`) either way.

## Recommended local commands

```bash
# Confirm nothing sensitive is tracked (should return nothing)
git ls-files | grep -iE '\.env$|backend/data/.*\.json$|\.log$|dist/'
# Confirm .env never entered history (should be empty)
git log --all --oneline -- backend/.env
# Scrub PII data files from history, then force-push + re-clone
git filter-repo --path backend/data --invert-paths
git push origin --force --all && git push staging --force --all
# Dependency scan + locked deploy
npm audit && npm --prefix backend audit && npm ci
```
**Rotate if H2 exposure is possible:** Stripe keys (roll `sk_live`/`rk_live` in Dashboard → Developers → API keys), Calendly PAT (revoke + reissue), Resend key, and regenerate `FRONTEND_SECRET`/`ADMIN_SECRET`/`QUEUE_ENCRYPTION_KEY`/webhook signing secrets with `openssl rand -hex 32`.
```
```
