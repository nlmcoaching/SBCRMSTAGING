# Task: "Cancel in Calendly" button on session cards (host-initiated cancellation)

## Goal

Add a host-side cancel button to every virtual and studio session card in the session calendar. When clicked, it prompts the host for a cancellation reason, then cancels the meeting in Calendly via the API (as the host), passing that reason to Calendly. Canceling a studio (group) session cancels the entire event for all participants — that is intended behavior.

## How it fits the existing architecture

- Do NOT mutate local registration/session state after a successful API cancel. Calendly fires an `invitee.canceled` webhook for each invitee, which the backend already queues and `syncCalendly()` already processes (sets registration status to `canceled`, surfaces refund prompts). After a successful cancel, just call `syncCalendly()` so the CRM converges quickly.
- The existing local-only "Cancel" flow (`cancelRegistrationManually`) stays as-is for bookings that have no Calendly URI.
- This is a destructive, customer-facing action (Calendly emails every invitee). Gate it exactly like Stripe refunds: `requireFrontendSecret` + `requireSessionToken` on the backend, and send the `x-session-token` header from the frontend (same token used by `issueStripeRefund` in `src/lib/revenue.js`).

## 1. Backend — new endpoint in `backend/server.js`

Place it next to `POST /api/stripe/refund` (same gating pattern). `CALENDLY_API_BASE`, `CALENDLY_API_TIMEOUT_MS`, `requireFrontendSecret`, and `requireSessionToken` already exist in this file — reuse them. Use this code as written:

```js
// POST /api/calendly/cancel-booking
// Cancels an ENTIRE scheduled event (all invitees). Gate like refunds: destructive + customer-facing.
// Body: { eventUri: "https://api.calendly.com/scheduled_events/<uuid>", reason?: string }
app.post("/api/calendly/cancel-booking", requireFrontendSecret, requireSessionToken, async (req, res) => {
  res.set("Cache-Control", "no-store");
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return res.status(503).json({ error: "CALENDLY_API_TOKEN not configured" });

  const { eventUri, reason } = req.body || {};
  // SSRF guard — same rule as /api/calendly/event-description
  if (typeof eventUri !== "string" || !eventUri.startsWith(CALENDLY_API_BASE) || eventUri.length > 300) {
    return res.status(400).json({ error: "eventUri must be a valid Calendly scheduled_events URI" });
  }
  const uuid = eventUri.split("/").pop();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(uuid)) {
    return res.status(400).json({ error: "Could not extract event UUID" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
  try {
    const resp = await fetch(`${CALENDLY_API_BASE}scheduled_events/${uuid}/cancellation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: String(reason || "Canceled from CRM").slice(0, 500) }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      // 403 = event not owned by this token's user; 404 = already canceled or bad UUID
      return res.status(resp.status >= 500 ? 502 : resp.status)
        .json({ error: j?.message || `Calendly returned ${resp.status}` });
    }
    console.log(`[OK] Calendly event ${uuid} canceled — invitee.canceled webhook will sync the CRM`);
    res.json({ status: "canceled", eventUuid: uuid });
  } catch (err) {
    clearTimeout(timer);
    console.error("[ERROR] Calendly cancel failed:", err.message);
    res.status(502).json({ error: "Could not reach Calendly — the booking was NOT canceled. Try again." });
  }
});
```

## 2. Frontend — API helper in `src/lib/api.js`

Add one exported function following the existing conventions in this file (`fetchWithTimeout`, `safeResJSON`, `apiHeaders`, `calendlyApiUrl`):

```js
// Cancel an entire Calendly scheduled event as the host. Requires the refund session
// token (x-session-token) minted at PIN unlock — same auth pattern as issueStripeRefund.
export async function cancelCalendlyEvent(eventUri, reason, sessionToken) {
  const res = await fetchWithTimeout(calendlyApiUrl("/api/calendly/cancel-booking"), {
    method: "POST",
    headers: { ...apiHeaders(), "x-session-token": sessionToken },
    body: JSON.stringify({ eventUri, reason }),
  });
  const j = await safeResJSON(res);
  if (!res.ok) throw new Error(j.error || `Cancel failed (${res.status}).`);
  return j; // { status: "canceled", eventUuid }
}
```

## 3. Frontend — button on the session cards

**Placement:** at the bottom of both the virtual session card and the studio session card, next to the existing Cancel button. Match the existing button styling on those cards; use a destructive/red visual treatment consistent with the refund buttons.

**Label:** `Cancel in Calendly`.

**Resolving the event URI:** the session record itself may not carry a Calendly URI — take `calendlyEventUri` from the session's linked registrations (`data.registrations.filter(r => r.sessionId === session.id)`, first entry with a non-empty `calendlyEventUri`).

**Visibility/disabled state:**
- Hide the button entirely if no linked registration has a `calendlyEventUri` (locally created sessions — the existing local Cancel flow covers those).
- Disable it (with a tooltip "Already canceled") if all linked registrations are already `status === "canceled"`.

**Click flow:**
1. Open a modal (use the existing `ConfirmModal`/modal primitives, not `window.prompt`) containing:
   - A **required** multiline text input: "Reason for canceling (sent to Calendly and included in the cancellation email)". Disable the confirm button until non-empty. Max 500 chars.
   - A warning line. For studio sessions, count the active (non-canceled) linked registrations and state explicitly: "This cancels the entire session in Calendly for all N registered participants and emails each of them." For virtual (1:1) sessions: "This cancels the booking in Calendly and emails the client."
   - Confirm button label: `Cancel session in Calendly`.
2. On confirm: set a busy state on the button (prevent double-submit — same pattern as the refund flow's `busyId`), then call `cancelCalendlyEvent(eventUri, reason, refundToken)`. The refund session token is already available in the component tree (see how the refund buttons receive `refundToken` / `ctx.refundToken`).
3. On success: show a success toast/inline confirmation, then call `syncCalendly()` so the `invitee.canceled` webhooks are pulled in and registrations flip to `canceled` (which also triggers the existing refund prompts for paid bookings). Do not set registration status directly.
4. On failure: show the server's error message inline in the modal (do not just `alert`). Special-case a 401 ("Session token required or expired") with the message "Your unlock session expired — log out and back in, then retry."

## 4. Edge cases

- Session with mixed registrations (some canceled, some active): the warning count must reflect only active ones.
- Backend 403 means the `CALENDLY_API_TOKEN` doesn't own the event — surface the error as-is.
- Backend 404 usually means the event was already canceled in Calendly — treat as soft success: show "Already canceled in Calendly", then run `syncCalendly()`.
- Reason text: trim it; it is stored by Calendly and appears in the invitee's cancellation email — no additional client-side sanitization needed beyond the 500-char limit (the backend also truncates).

## 5. Acceptance criteria

1. Virtual session card and studio session card each show `Cancel in Calendly` next to the existing Cancel button, only when a linked registration has a `calendlyEventUri`.
2. Clicking it requires a non-empty reason before the confirm button enables; studio sessions show the all-N-participants warning.
3. Confirming calls `POST /api/calendly/cancel-booking` with `x-frontend-secret` (via the Vite proxy) and `x-session-token`; the reason arrives in Calendly (visible on the Calendly event and in the cancellation email).
4. Within one sync cycle after success, the linked registrations show `status: "canceled"` via the normal webhook path, and paid bookings appear in the refund queue.
5. No direct local mutation of registration/session status in the success path; double-clicks cannot fire two cancellations; errors render in the modal with actionable text.
6. `node --test src/stripeMatching.test.js src/lib/revenue.reconcile.test.js` still passes and `npx eslint src/ backend/` introduces no new errors.
