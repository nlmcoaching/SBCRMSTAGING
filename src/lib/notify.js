/**
 * Shared user-visible notification channel.
 *
 * Use for ephemeral feedback (errors, successes, warnings).
 * Keep persistent sync/status UI (Calendly/Stripe status, save banner) separate.
 *
 * Works outside React (e.g. openAgreementFile) via a tiny pub/sub.
 */

const listeners = new Set();
let seq = 0;

/** @typedef {'error'|'success'|'warning'|'info'} NotifyType */

/**
 * @param {(toast: { id: number, message: string, type: NotifyType, duration: number }) => void} fn
 * @returns {() => void} unsubscribe
 */
export function subscribeNotify(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Push a toast to the shared channel.
 * @param {string} message
 * @param {{ type?: NotifyType, duration?: number }} [opts]
 */
export function notify(message, opts = {}) {
  const type = opts.type || "error";
  const duration = opts.duration ?? (type === "error" ? 6500 : type === "warning" ? 5000 : 3200);
  const toast = {
    id: ++seq,
    message: String(message ?? ""),
    type,
    duration,
  };
  listeners.forEach((fn) => {
    try { fn(toast); } catch { /* host must not break callers */ }
  });
  return toast.id;
}

notify.error = (message, opts) => notify(message, { ...opts, type: "error" });
notify.success = (message, opts) => notify(message, { ...opts, type: "success" });
notify.warning = (message, opts) => notify(message, { ...opts, type: "warning" });
notify.info = (message, opts) => notify(message, { ...opts, type: "info" });
