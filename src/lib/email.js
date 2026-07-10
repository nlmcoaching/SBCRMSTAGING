import { apiHeaders, safeResJSON } from "./api.js";

// ── Email log helpers ─────────────────────────────────────────────────────────
// Cap the global audit log so it never eats unbounded IndexedDB/localStorage space.
export const EMAIL_LOG_CAP = 200;

// Per-record emailHistory only needs what the timeline renders. Storing the full
// body + subject on every client/partner doubles the PII footprint for every send.
export function slimHistEntry(e) {
  return { id: e.id, date: e.date, templateName: e.templateName, to: e.to };
}

// Append a new entry and trim the oldest when the cap is exceeded.
export function cappedLog(existing, newEntry) {
  const next = [...(existing || []), newEntry];
  return next.length > EMAIL_LOG_CAP ? next.slice(-EMAIL_LOG_CAP) : next;
}

// ── Shared email send helper ──────────────────────────────────────────────────
// All five email-send flows in the CRM share the same HTTP call + log-entry
// shape.  This helper handles the fetch, the res.ok guard, and builds the
// canonical logEntry.  Call sites keep only their own setData side-effects.
//
// Returns the logEntry on success; throws on HTTP or network failure.
//
// Args:
//   to            – recipient email address
//   recipientName – display name (already cleaned by the call site)
//   recipientType – "client" | "partner"
//   subject, body – final rendered strings
//   templateId, templateName, category – template metadata (use empty strings for ad-hoc sends)
export async function sendCrmEmail({ to, recipientName, recipientType, subject, body, templateId = "", templateName = "", category = "" }) {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify({ to, recipientName, subject, body }),
  });
  if (!res.ok) {
    const e = await safeResJSON(res);
    throw new Error(e.error || `Send failed (${res.status}).`);
  }
  const json = await res.json();
  return {
    id:            `em_${Date.now()}`,
    date:          new Date().toISOString(),
    templateId,
    templateName,
    category,
    to,
    recipientName,
    recipientType,
    subject,
    body,
    resendId:      json.id || null,
    sendStatus:    "sent",
  };
}

// Build a failed-send log entry without making a network call.
// Used in catch blocks so every failure is consistently logged.
export function makeEmailFailEntry({ to = "", recipientName = "", recipientType = "client", subject = "", body = "", templateId = "", templateName = "", category = "" }, err) {
  return {
    id:            `em_${Date.now()}`,
    date:          new Date().toISOString(),
    templateId,
    templateName,
    category,
    to,
    recipientName,
    recipientType,
    subject,
    body,
    resendId:      null,
    sendStatus:    "failed",
    errorMsg:      err?.message || "Unknown error",
  };
}
