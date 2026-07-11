export const STORE_KEY     = "simplybreathe:data:v4";           // legacy (unencrypted)
export const STORE_KEY_ENC = "simplybreathe:data:v5:enc";       // encrypted storage
export const AGREEMENT_BLOB_PREFIX = "sb:agreement:v1:";      // per-file encrypted blobs (kept out of main CRM payload)
export const SEC_META_KEY  = "sb:security:v1";                  // legacy plaintext (migrated → sb:security:v1:enc)

// Centralized API headers — x-frontend-secret is injected server-side by the Vite proxy
// (dev) or a production reverse proxy. It must never appear in the browser bundle;
// VITE_FRONTEND_SECRET fallback removed to prevent accidental secret exposure.
export const apiHeaders = (json = true) => {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  return h;
};
export const CALENDLY_BACKEND = import.meta.env.VITE_CALENDLY_BACKEND || "";
export const calendlyApiUrl = (path) => `${CALENDLY_BACKEND}${path}`;

// fetch with an abort timeout so a slow/hung backend can't stall a sync forever.
export async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
// Parse a fetch Response body safely regardless of Content-Type.
// Always call this AFTER you have the Response object — never call res.json()
// directly before checking res.ok, because a 502 HTML page throws
// "Unexpected token '<'" and hides the real status code.
export async function safeResJSON(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json().catch(() => ({}));
  const text = await res.text().catch(() => "");
  return { error: (text.trim().slice(0, 300)) || `HTTP ${res.status}` };
}

export function isTruncatedPreview(text) {
  const t = String(text || "").trim();
  return t.endsWith("...") || t.endsWith("…");
}
export function resolveCalendlyDescription(stored, fetched) {
  const s = String(stored || "").trim();
  if (fetched == null) return s;
  const f = String(fetched || "").trim();
  if (f && (!s || isTruncatedPreview(s) || f.length > s.length)) return f;
  return s || f;
}
export function sessionCalendlyLookupName(session, registrations) {
  const strip = (v) => String(v || "").replace(/^Sample\s*-\s*/i, "").trim();
  const journey = strip(session?.journey);
  if (journey) return journey;
  const reg = (registrations || []).find(r => r.sessionId === session?.id && r.eventName);
  if (reg?.eventName) return strip(reg.eventName);
  const name = strip(session?.name);
  const parts = name.split(/\s*[-–]\s*/);
  if (parts.length >= 2) return parts.slice(1).join(" - ").trim();
  return name;
}
export async function fetchCalendlyDescriptionForSession(session, registrations) {
  const eventUri = session?.calendlyEventUri
    || (registrations || []).find(r => r.sessionId === session?.id && r.calendlyEventUri)?.calendlyEventUri
    || "";
  const eventTypeUri = session?.calendlyEventTypeUri || "";
  const eventName = sessionCalendlyLookupName(session, registrations);
  const params = new URLSearchParams();
  if (eventTypeUri) params.set("eventTypeUri", eventTypeUri);
  else if (eventUri) params.set("eventUri", eventUri);
  if (eventName) params.set("eventName", eventName);
  if (!params.toString()) return { description: "", error: "No Calendly link or event name on this session" };
  const res = await fetchWithTimeout(calendlyApiUrl(`/api/calendly/event-description?${params}`), { headers: apiHeaders() });
  const j = await safeResJSON(res);
  if (!res.ok) return { description: "", error: j.error || `Request failed (${res.status})` };
  return { description: (j.description || "").trim(), error: "" };
}

// Cancel an entire Calendly scheduled event as the host. Requires the refund session
// token (x-session-token) minted at PIN unlock — same auth pattern as issueStripeRefund.
// 404 is treated as soft success (event already canceled in Calendly).
export async function cancelCalendlyEvent(eventUri, reason, sessionToken) {
  const res = await fetchWithTimeout(calendlyApiUrl("/api/calendly/cancel-booking"), {
    method: "POST",
    headers: { ...apiHeaders(), "x-session-token": sessionToken },
    body: JSON.stringify({ eventUri, reason }),
  });
  const j = await safeResJSON(res);
  if (res.status === 404) {
    return { status: "already_canceled", eventUuid: String(eventUri || "").split("/").pop() || "", alreadyCanceled: true };
  }
  if (!res.ok) {
    const err = new Error(j.error || `Cancel failed (${res.status}).`);
    err.status = res.status;
    throw err;
  }
  return j; // { status: "canceled", eventUuid }
}
export function applyCalendlyDescriptionToSessions(setData, sessionId, desc, onSave) {
  if (!desc || !setData) return;
  setData(prev => ({
    ...prev,
    sessions: (prev.sessions || []).map(s => {
      if (s.id !== sessionId) return s;
      const merged = resolveCalendlyDescription(s.calendlyDescription, desc);
      return merged === s.calendlyDescription ? s : { ...s, calendlyDescription: merged };
    }),
  }));
}
