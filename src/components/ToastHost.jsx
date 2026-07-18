import { useEffect, useState } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { C, hexA } from "../lib/theme.js";
import { subscribeNotify } from "../lib/notify.js";

const MAX_TOASTS = 4;

const STYLES = {
  error:   { fg: "#8B3A2F", bg: hexA("#C0573F", 0.12), border: hexA("#C0573F", 0.35), Icon: AlertCircle },
  success: { fg: "#2D6A50", bg: hexA("#4A8C6F", 0.12), border: hexA("#4A8C6F", 0.35), Icon: CheckCircle },
  warning: { fg: "#92400E", bg: "#FFFBEB", border: "#FDE68A", Icon: AlertCircle },
  info:    { fg: C.brandDeep, bg: C.brandMist, border: hexA(C.brand, 0.35), Icon: Info },
};

/**
 * Fixed toast stack — mount once at app root (main.jsx).
 * Sync status panels and form-field errors stay local; this is for global user-visible feedback.
 */
export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribeNotify((toast) => {
      setToasts((prev) => [...prev, toast].slice(-MAX_TOASTS));
      if (toast.duration > 0) {
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    });
  }, []);

  if (!toasts.length) return null;

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 4000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: "min(400px, calc(100vw - 32px))",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const s = STYLES[t.type] || STYLES.info;
        const Icon = s.Icon;
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 10,
              background: s.bg,
              border: `1px solid ${s.border}`,
              boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
              color: s.fg,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.45,
              whiteSpace: "pre-wrap",
            }}
          >
            <Icon size={16} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>{t.message}</div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                padding: 2,
                cursor: "pointer",
                color: s.fg,
                opacity: 0.7,
                lineHeight: 0,
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
