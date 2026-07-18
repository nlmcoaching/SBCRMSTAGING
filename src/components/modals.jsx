import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { X, AlertCircle, KeyRound, Shield, UserCircle, CheckCircle, Save, Lock, Upload, RefreshCw, Check, LogOut, Info } from "lucide-react";
import { C, FONT, hexA } from "../lib/theme.js";
import { Sec } from "../lib/sec.js";
import { loadSecMeta, saveSecMeta } from "../lib/secMeta.js";

export class DrawerErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="sb-drawerwrap" onClick={this.props.onClose}>
          <div className="sb-drawer" onClick={(e) => e.stopPropagation()} style={{ padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 8 }}>Could not open this record</div>
            <div style={{ fontSize: 13, color: C.ink3, marginBottom: 16 }}>{this.state.error?.message || "Something went wrong loading the drawer."}</div>
            <button className="sb-primary" onClick={this.props.onClose}>Close</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Catches render errors above App so the shell degrades to a reload screen instead of a blank page. */
export class AppErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary]", error, info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, background: C.bg, fontFamily: FONT.body, color: C.ink,
        }}>
          <div style={{
            maxWidth: 420, width: "100%", background: C.surface, border: `1px solid ${C.line}`,
            borderRadius: 12, padding: "28px 24px",
          }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, marginBottom: 8, color: C.brandDeep }}>
              Something went wrong
            </div>
            <div style={{ fontSize: 14, color: C.ink2, lineHeight: 1.5, marginBottom: 12 }}>
              The app hit an unexpected error and could not keep rendering. Your data in this browser is unchanged — reload to try again.
            </div>
            {this.state.error?.message ? (
              <div style={{
                fontSize: 12, color: C.ink3, background: C.surfaceAlt, borderRadius: 8,
                padding: "10px 12px", marginBottom: 16, wordBreak: "break-word",
              }}>
                {this.state.error.message}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: C.brand, color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AVATAR_COLORS = ["#2E6FB0","#6B5CE7","#D9892B","#4A8C6F","#2A9D8F","#C0392B","#8E44AD","#16A085","#E67E22","#2980B9"];

export function EditProfileModal({ user, masterKeyRaw, onSave, onClose }) {
  const [name,        setName]        = useState(user?.name  || "");
  const [title,       setTitle]       = useState(user?.title || "");
  const [email,       setEmail]       = useState(user?.email || "");
  const [phone,       setPhone]       = useState(user?.phone || "");
  const [color,       setColor]       = useState(user?.color || AVATAR_COLORS[0]);
  const [avatar,      setAvatar]      = useState(user?.avatar || "");
  const [tab,         setTab]         = useState("profile"); // profile | security
  const [curPin,        setCurPin]        = useState("");
  const [newPin,        setNewPin]        = useState("");
  const [confirmPin,    setConfirmPin]    = useState("");
  const [pinMsg,        setPinMsg]        = useState("");
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState("");
  // Recovery code state
  const [generatingRec, setGeneratingRec] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null); // shown once after generation
  const [recMsg,        setRecMsg]        = useState("");
  const fileRef = useRef();

  const initials = (name || user?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMsg("Image must be under 5 MB."); return; }
    setMsg("");
    const reader = new FileReader();
    reader.onerror = () => setMsg("Could not read the file. Please try another image.");
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => setMsg("File does not appear to be a valid image. Please try a JPEG or PNG.");
      img.onload = () => {
        const MAX = 240;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateRecoveryCode = async () => {
    if (!masterKeyRaw) { setRecMsg("Cannot generate recovery code — master key not available. Please log out and back in."); return; }
    setGeneratingRec(true); setRecMsg(""); setGeneratedCode(null);
    try {
      const code = Sec.generateRecoveryCode();
      const recoverySalt = Sec.newSalt();
      const recoveryWrappedMasterKey = await Sec.wrapKeyForUser(
        masterKeyRaw, code.replace(/-/g, ""), recoverySalt, Sec.RECOVERY_PBKDF2_ITERATIONS
      );
      await onSave({ recoveryWrappedMasterKey, recoverySalt, recoveryPbkdf2Iterations: Sec.RECOVERY_PBKDF2_ITERATIONS });
      setGeneratedCode(code);
    } catch (e) {
      setRecMsg("Failed to generate recovery code: " + (e?.message || e));
    }
    setGeneratingRec(false);
  };

  const handleClearRecoveryCode = async () => {
    if (!window.confirm("Remove your recovery code? You will not be able to recover your account without your PIN until you generate a new code.")) return;
    setGeneratingRec(true); setRecMsg("");
    try {
      await onSave({ recoveryWrappedMasterKey: null, recoverySalt: null, recoveryPbkdf2Iterations: null });
      setGeneratedCode(null);
      setRecMsg("Recovery code removed.");
    } catch (e) {
      setRecMsg("Failed to remove recovery code: " + (e?.message || e));
    }
    setGeneratingRec(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { setMsg("Name is required."); return; }
    setSaving(true); setMsg("");
    try {
      const updates = { name: name.trim(), title, email, phone, color, avatar };

      if (tab === "security" && (curPin || newPin || confirmPin)) {
        if (!curPin)              { setPinMsg("Enter your current PIN."); setSaving(false); return; }
        {
          const check = Sec.validatePassphrase(newPin);
          if (!check.ok) { setPinMsg(check.error); setSaving(false); return; }
        }
        if (newPin !== confirmPin){ setPinMsg("New passphrases don't match."); setSaving(false); return; }
        // Verify current PIN using the stored iteration count (may be legacy 100k)
        const storedIter = user.pbkdf2Iterations ?? 100_000;
        try { await Sec.unwrapKeyForUser(user.wrappedMasterKey, curPin, user.pinSalt, storedIter); }
        catch (_) { setPinMsg("Current PIN is incorrect."); setSaving(false); return; }
        // Refuse to rewrite salt/iterations without re-wrapping — keeping the old wrap with a
        // new salt bricks the next login (unwrap uses the new salt against the old ciphertext).
        if (!masterKeyRaw) {
          setPinMsg("Cannot change PIN — master key not in memory. Log out and back in, then try again.");
          setSaving(false);
          return;
        }
        const pinSalt = Sec.newSalt();
        const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyRaw, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
        let unlockSecret = null;
        if (user.wrappedUnlockSecret) {
          try {
            unlockSecret = await Sec.unwrapUnlockSecret(user.wrappedUnlockSecret, curPin, user.pinSalt, storedIter);
          } catch (_) { unlockSecret = null; }
        }
        if (!unlockSecret) unlockSecret = Sec.generateUnlockSecret();
        const wrappedUnlockSecret = await Sec.wrapUnlockSecret(unlockSecret, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
        Object.assign(updates, { pinSalt, wrappedMasterKey, wrappedUnlockSecret, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS });
        setPinMsg(""); setCurPin(""); setNewPin(""); setConfirmPin("");
      }
      await onSave(updates);
      onClose();
    } catch (e) { setMsg("Error saving: " + (e?.message || e)); }
    setSaving(false);
  };

  const TABS = [{ id: "profile", label: "Profile" }, { id: "security", label: "Security" }];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,33,58,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: C.surface, borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 16px" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, fontFamily: FONT.display }}>Edit Profile</div>
            <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>{user?.role || "User"} · {user?.createdAt ? `Member since ${user.createdAt}` : "Simply Breathe OS"}</div>
          </div>
          <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink2 }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 28px 16px", borderBottom: `1px solid ${C.line}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.id ? C.brandSoft : "transparent", color: tab === t.id ? C.brandDeep : C.ink3 }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

          {tab === "profile" && (
            <>
              {/* Avatar section */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
                {/* Avatar preview */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", background: color, overflow: "hidden", cursor: "pointer", border: `3px solid ${C.line}` }}
                    onClick={() => fileRef.current?.click()}>
                    {avatar
                      ? <img src={avatar} alt="avatar" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#fff" }}>{initials}</span>
                    }
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s", borderRadius: "50%" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <Upload size={20} color="#fff" />
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ fontSize: 11, padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surfaceAlt, cursor: "pointer", color: C.ink2, fontWeight: 600 }}>
                      Upload photo
                    </button>
                    {avatar && (
                      <button onClick={() => setAvatar("")}
                        style={{ fontSize: 11, color: C.ink3, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Color swatches (visible only when no photo) */}
                {!avatar && (
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.ink2, marginBottom: 10 }}>Avatar color</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 28px)", gap: 7 }}>
                      {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                          style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? `3px solid ${C.ink}` : "2px solid transparent", cursor: "pointer", transition: "transform .1s" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Title / Role</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lead Facilitator"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Role</label>
                  <div style={{ padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink3, background: C.surfaceAlt }}>{user?.role || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </>
          )}

          {tab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Change PIN */}
              <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <Shield size={18} color={C.brand} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Change passphrase</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Your passphrase encrypts and protects your data. Use {Sec.PASSPHRASE_HINT}.</div>
                </div>
              </div>
              {[
                { label: "Current PIN", val: curPin, set: setCurPin },
                { label: "New passphrase",     val: newPin, set: setNewPin },
                { label: "Confirm new passphrase", val: confirmPin, set: setConfirmPin },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>{label}</label>
                  <input type="password" value={val} onChange={e => set(e.target.value)} placeholder="••••••••••••"
                    autoComplete="off"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${pinMsg ? "#EF4444" : C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              {pinMsg && <div style={{ fontSize: 12, color: "#EF4444", padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>{pinMsg}</div>}

              {/* Recovery Code */}
              <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <KeyRound size={15} color={C.brand} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Recovery Code</div>
                    <div style={{ fontSize: 12, color: C.ink3, marginTop: 1 }}>
                      {user?.recoveryWrappedMasterKey
                        ? "A recovery code is active. Keep it somewhere safe — it lets you reset your PIN if you forget it."
                        : "No recovery code set. Generate one to protect against being locked out."}
                    </div>
                  </div>
                </div>

                {/* Show generated code once */}
                {generatedCode && (
                  <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
                      ✓ Recovery code generated — save this now
                    </div>
                    <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, color: "#15803d", letterSpacing: ".12em", marginBottom: 10, wordBreak: "break-all" }}>
                      {generatedCode}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#166534", lineHeight: 1.6, marginBottom: 10 }}>
                      This code will not be shown again. Store it in your password manager, print it, or save it somewhere safe. Anyone with this code can reset your PIN and access your data.
                    </div>
                    <button onClick={() => { navigator.clipboard?.writeText(generatedCode); }}
                      style={{ fontSize: 12, fontWeight: 600, color: "#166534", background: "#dcfce7", border: "1px solid #86efac", borderRadius: 7, padding: "6px 14px", cursor: "pointer" }}>
                      Copy to clipboard
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={handleGenerateRecoveryCode} disabled={generatingRec}
                    style={{ flex: 1, padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.brand}`, background: C.brandSoft, color: C.brandDeep, fontSize: 13, fontWeight: 600, cursor: generatingRec ? "not-allowed" : "pointer", opacity: generatingRec ? 0.6 : 1 }}>
                    {generatingRec ? "Generating…" : user?.recoveryWrappedMasterKey ? "Regenerate Code" : "Generate Recovery Code"}
                  </button>
                  {user?.recoveryWrappedMasterKey && !generatedCode && (
                    <button onClick={handleClearRecoveryCode} disabled={generatingRec}
                      style={{ padding: "9px 14px", borderRadius: 9, border: `1px solid ${C.line}`, background: "transparent", color: "#C0392B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      Remove
                    </button>
                  )}
                </div>
                {recMsg && (
                  <div style={{ fontSize: 12, color: recMsg.startsWith("Failed") ? "#EF4444" : "#166534", padding: "8px 12px", background: recMsg.startsWith("Failed") ? "#FEF2F2" : "#f0fdf4", borderRadius: 8 }}>
                    {recMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {msg && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "#FEF2F2", borderRadius: 10 }}>{msg}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 28px 24px", borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent", fontSize: 14, cursor: "pointer", color: C.ink2, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "10px 26px", borderRadius: 10, border: "none", background: C.brand, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
            {saving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : <><Check size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmModal({ message, okLabel = "OK", danger = false, onOk, onCancel }) {
  // Busy guard: prevents double-submit on money actions (e.g. refund) where onOk is async.
  const [busy, setBusy] = useState(false);
  const handleOk = async () => {
    if (busy) return;
    setBusy(true);
    try { await onOk(); } finally { setBusy(false); }
  };
  return (
    <div className="sb-drawerwrap" onMouseDown={onCancel} style={{ zIndex: 80 }}>
      <div onMouseDown={e => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 18, padding: "32px 32px 24px",
        width: 380, maxWidth: "92vw", textAlign: "center",
        boxShadow: `0 24px 80px ${hexA(C.brandDeep, 0.28)}, 0 4px 16px ${hexA(C.brandDeep, 0.1)}`,
        animation: "sb-pop .2s cubic-bezier(.22,.68,0,1.2)",
      }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.brandSoft,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {danger
            ? <LogOut size={22} color={C.brand} strokeWidth={1.5} />
            : <Info size={22} color={C.brand} strokeWidth={1.5} />}
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
          {okLabel}?
        </div>
        <div style={{ fontSize: 14, color: C.ink3, lineHeight: 1.6, marginBottom: 28, fontWeight: 700 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} disabled={busy} className="sb-ghost" style={{ minWidth: 100, justifyContent: "center" }}>
            Cancel
          </button>
          <button onClick={handleOk} disabled={busy} style={{
            minWidth: 120, padding: "9px 20px", borderRadius: 10, border: "none",
            cursor: busy ? "default" : "pointer",
            fontWeight: 700, fontSize: 14, justifyContent: "center",
            background: busy ? C.ink3 : C.brand, color: "#fff",
            boxShadow: `0 2px 8px ${hexA(C.brand, 0.35)}`,
          }}>
            {busy ? "…" : okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


export function CancelCalendlyModal({ isStudio, activeCount, busy: parentBusy, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const isBusy = busy || parentBusy;
  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && !isBusy && !success;

  const warning = isStudio
    ? `This cancels the entire session in Calendly for all ${activeCount} registered participant${activeCount === 1 ? "" : "s"} and emails each of them.`
    : "This cancels the booking in Calendly and emails the client.";

  const handleOk = async () => {
    if (!canSubmit) return;
    setError("");
    setBusy(true);
    try {
      const result = await onConfirm(trimmed.slice(0, 500));
      if (result?.alreadyCanceled) {
        setSuccess("Already canceled in Calendly");
      } else {
        setSuccess("Canceled in Calendly — syncing bookings…");
      }
    } catch (err) {
      setError(err?.message || "Cancel failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="sb-drawerwrap"
      onMouseDown={() => { if (!isBusy) onCancel(); }}
      onClick={(e) => e.stopPropagation()}
      style={{ zIndex: 90 }}
    >
      <div onMouseDown={e => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 18, padding: "28px 28px 22px",
        width: 440, maxWidth: "92vw", textAlign: "left",
        boxShadow: `0 24px 80px ${hexA(C.brandDeep, 0.28)}, 0 4px 16px ${hexA(C.brandDeep, 0.1)}`,
        animation: "sb-pop .2s cubic-bezier(.22,.68,0,1.2)",
      }}>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
          Cancel session in Calendly?
        </div>
        <div style={{ fontSize: 13, color: "#9A3B2A", lineHeight: 1.55, marginBottom: 14, fontWeight: 600 }}>
          {warning}
        </div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: C.ink2, marginBottom: 6 }}>
          Reason for canceling (sent to Calendly and included in the cancellation email)
        </label>
        <textarea
          value={reason}
          maxLength={500}
          disabled={isBusy || !!success}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Required — e.g. facilitator illness, studio closed…"
          style={{
            width: "100%", boxSizing: "border-box", borderRadius: 10,
            border: `1px solid ${C.line}`, padding: "10px 12px", fontSize: 13.5,
            color: C.ink, background: C.surfaceAlt || C.surface, resize: "vertical",
            fontFamily: "inherit", lineHeight: 1.45, marginBottom: 6,
          }}
        />
        <div style={{ fontSize: 11, color: C.ink3, marginBottom: 12, textAlign: "right" }}>
          {trimmed.length}/500
        </div>
        {error && (
          <div style={{
            fontSize: 12.5, color: "#C0392B", background: hexA("#C0392B", 0.07),
            border: `1px solid ${hexA("#C0392B", 0.2)}`, borderRadius: 8,
            padding: "8px 12px", marginBottom: 12, lineHeight: 1.45,
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            fontSize: 12.5, color: "#4A8C6F", background: hexA("#4A8C6F", 0.08),
            border: `1px solid ${hexA("#4A8C6F", 0.25)}`, borderRadius: 8,
            padding: "8px 12px", marginBottom: 12, lineHeight: 1.45,
          }}>
            {success}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={isBusy} className="sb-ghost" style={{ minWidth: 100, justifyContent: "center" }}>
            {success ? "Close" : "Keep session"}
          </button>
          {!success && (
            <button onClick={handleOk} disabled={!canSubmit} style={{
              minWidth: 180, padding: "9px 18px", borderRadius: 10, border: "none",
              cursor: canSubmit ? "pointer" : "default",
              fontWeight: 700, fontSize: 13.5, justifyContent: "center",
              background: canSubmit ? "#C0573F" : C.ink3, color: "#fff",
            }}>
              {isBusy ? "Canceling…" : "Cancel session in Calendly"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
