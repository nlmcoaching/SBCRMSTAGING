import { useState, useEffect } from "react";
import { Check, AlertCircle, Shield } from "lucide-react";
import { LOGO } from "../../assets/logo.js";
import { C, FONT, hexA } from "../../lib/theme.js";
import { USER_ROLE_COLOR } from "../../lib/constants.js";

export function FirstRunSetup({ onSetup, error }) {
  const [name, setName]         = useState("");
  const [pin, setPin]           = useState("");
  const [confirm, setConfirm]   = useState("");
  const [msg, setMsg]           = useState("");
  const [busy, setBusy]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())        { setMsg("Please enter your name."); return; }
    if (pin.length < 6)      { setMsg("PIN must be at least 6 characters."); return; }
    if (pin !== confirm)     { setMsg("PINs don't match."); return; }
    setBusy(true);
    setMsg("");
    await onSetup(name, pin);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body }}>
      <div style={{ background: C.surface, borderRadius: 22, padding: "40px 40px 36px", width: 420, maxWidth: "92vw",
        boxShadow: `0 24px 80px ${hexA(C.brandDeep, 0.18)}`, textAlign: "center" }}>
        <img src={LOGO} alt="Simply Breathe" style={{ height: 64, marginBottom: 20 }} />
        <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Welcome to Simply Breathe OS</div>
        <div style={{ fontSize: 14, color: C.ink3, marginBottom: 28, lineHeight: 1.6 }}>
          Let's set up your owner account. You'll use this name and PIN every time you log in.
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 5 }}>Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Johnson"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.body }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 5 }}>Create PIN <span style={{ color: C.ink3, fontWeight: 400 }}>(min. 6 characters)</span></label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Choose a strong PIN"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.body }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 5 }}>Confirm PIN</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your PIN"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.body }} />
          </div>
          {(msg || error) && <div style={{ fontSize: 13, color: "#C0573F", fontWeight: 600 }}>{msg || error}</div>}
          <button type="submit" disabled={busy}
            style={{ marginTop: 4, padding: "12px", borderRadius: 10, border: "none", background: C.brand, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: FONT.body }}>
            {busy ? "Setting up…" : "Create Account & Enter"}
          </button>
        </form>
        <div style={{ marginTop: 20, fontSize: 12, color: C.ink3, lineHeight: 1.6 }}>
          Your PIN encrypts all data stored in this browser. Store it somewhere safe — it cannot be recovered if lost.
        </div>
      </div>
    </div>
  );
}

export function LockScreen({ onUnlock, error, initialising, users, onRecoveryVerify, onRecoverySetPin }) {
  const [selectedUser,       setSelectedUser]       = useState(null);
  const [pin,                setPin]                = useState("");
  const [show,               setShow]               = useState(false);
  const [busy,               setBusy]               = useState(false);
  // Recovery flow state
  const [recoveryMode,       setRecoveryMode]       = useState("none"); // "none" | "code" | "setPin"
  const [recoveryCode,       setRecoveryCode]       = useState("");
  const [recoveryError,      setRecoveryError]      = useState("");
  const [recoveredKey,       setRecoveredKey]       = useState(null);
  const [newPinVal,          setNewPinVal]          = useState("");
  const [confirmPinVal,      setConfirmPinVal]      = useState("");
  const [newPinError,        setNewPinError]        = useState("");
  const [showNewPin,         setShowNewPin]         = useState(false);

  const needsV1Upgrade = !initialising && users.some(u => u.id === "v1_migration");
  const anyHasRecovery = !initialising && users.some(u => u.recoveryWrappedMasterKey);

  useEffect(() => {
    if (!initialising && users.length === 1) setSelectedUser(users[0]);
  }, [initialising, users]);

  const submit = async (e) => {
    e.preventDefault();
    if (!pin.trim() || busy || !selectedUser) return;
    setBusy(true);
    await onUnlock(selectedUser.id, pin);
    setBusy(false);
    setPin("");
  };

  const submitRecoveryCode = async (e) => {
    e.preventDefault();
    if (!recoveryCode.trim() || busy) return;
    const userId = selectedUser?.id || users.find(u => u.recoveryWrappedMasterKey)?.id;
    if (!userId) { setRecoveryError("No account with a recovery code found."); return; }
    setBusy(true); setRecoveryError("");
    const result = await onRecoveryVerify(userId, recoveryCode.trim());
    setBusy(false);
    if (result.success) {
      setRecoveredKey({ masterKeyRaw: result.masterKeyRaw, userId });
      setRecoveryMode("setPin");
    } else {
      setRecoveryError(result.error || "Invalid recovery code.");
    }
  };

  const submitNewPin = async (e) => {
    e.preventDefault();
    if (newPinVal.length < 6) { setNewPinError("PIN must be at least 6 characters."); return; }
    if (newPinVal !== confirmPinVal) { setNewPinError("PINs don't match."); return; }
    setBusy(true); setNewPinError("");
    const result = await onRecoverySetPin(recoveredKey.userId, newPinVal, recoveredKey.masterKeyRaw);
    setBusy(false);
    if (!result.success) setNewPinError(result.error || "Failed to set new PIN.");
  };

  const resetRecovery = () => {
    setRecoveryMode("none"); setRecoveryCode(""); setRecoveryError("");
    setRecoveredKey(null); setNewPinVal(""); setConfirmPinVal(""); setNewPinError("");
  };

  const initials = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const cardStyle = {
    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20,
    padding: "28px 40px 36px", width: "100%", maxWidth: 400, textAlign: "center",
    boxShadow: "0 8px 40px rgba(22,33,58,0.10)",
  };
  const inputStyle = (hasErr) => ({
    width: "100%", padding: "13px 16px",
    border: `1.5px solid ${hasErr ? "#C0392B" : C.line}`,
    borderRadius: 10, fontSize: 15, outline: "none",
    color: C.ink, background: C.surface, boxSizing: "border-box",
  });
  const errBox = (msg) => msg ? (
    <div style={{ fontSize: 12.5, color: "#C0392B", background: hexA("#C0392B", 0.07),
      borderRadius: 8, padding: "8px 12px", textAlign: "left", display: "flex", gap: 7, alignItems: "flex-start" }}>
      <AlertCircle size={13} color="#C0392B" style={{ marginTop: 1, flexShrink: 0 }} /> {msg}
    </div>
  ) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Recovery: enter code ── */}
      {recoveryMode === "code" && (
        <div style={cardStyle}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.brandSoft, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Shield size={22} color={C.brand} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>Account Recovery</h1>
          <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 22px", lineHeight: 1.6 }}>
            Enter your recovery code to reset your PIN. The code is case-insensitive — dashes are optional.
          </p>
          <form onSubmit={submitRecoveryCode} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <input value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)}
              placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" autoFocus
              style={{ ...inputStyle(!!recoveryError), fontFamily: "monospace", letterSpacing: ".08em", fontSize: 13, textTransform: "uppercase" }} />
            {errBox(recoveryError)}
            <button type="submit" disabled={busy || !recoveryCode.trim()} style={{
              padding: "13px", background: busy || !recoveryCode.trim() ? C.line : C.brand,
              color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: busy || !recoveryCode.trim() ? "not-allowed" : "pointer",
            }}>{busy ? "Verifying…" : "Verify Code"}</button>
            <button type="button" onClick={resetRecovery} style={{ background: "none", border: "none", fontSize: 13, color: C.ink3, cursor: "pointer", marginTop: 2 }}>← Back to login</button>
          </form>
        </div>
      )}

      {/* ── Recovery: set new PIN ── */}
      {recoveryMode === "setPin" && (
        <div style={cardStyle}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#eaf4ee", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Check size={22} color="#4A8C6F" strokeWidth={2} />
          </div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.ink, margin: "0 0 6px" }}>Set New PIN</h1>
          <p style={{ fontSize: 13, color: C.ink3, margin: "0 0 22px", lineHeight: 1.6 }}>
            Recovery code verified. Choose a new PIN — at least 6 characters. Your recovery code has been cleared; generate a new one after logging in.
          </p>
          <form onSubmit={submitNewPin} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ position: "relative" }}>
              <input type={showNewPin ? "text" : "password"} value={newPinVal} onChange={e => setNewPinVal(e.target.value)}
                placeholder="New PIN" autoFocus style={{ ...inputStyle(!!newPinError), paddingRight: 56, fontFamily: "monospace", letterSpacing: ".3em" }} />
              <button type="button" onClick={() => setShowNewPin(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.ink3, fontWeight: 600 }}>{showNewPin ? "HIDE" : "SHOW"}</button>
            </div>
            <input type={showNewPin ? "text" : "password"} value={confirmPinVal} onChange={e => setConfirmPinVal(e.target.value)}
              placeholder="Confirm new PIN" style={{ ...inputStyle(!!newPinError), fontFamily: "monospace", letterSpacing: ".3em" }} />
            {errBox(newPinError)}
            <button type="submit" disabled={busy || !newPinVal.trim()} style={{
              padding: "13px", background: busy || !newPinVal.trim() ? C.line : "#4A8C6F",
              color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: busy || !newPinVal.trim() ? "not-allowed" : "pointer",
            }}>{busy ? "Saving…" : "Set PIN & Log In"}</button>
          </form>
        </div>
      )}

      {/* ── Normal lock screen ── */}
      {recoveryMode === "none" && (
        <div style={cardStyle}>
          <div style={{ width: 162, height: 130, margin: "0 auto 0", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
            <img src="/sb-heart-wave.png" alt="Simply Breathe" style={{ width: 162, height: 162, objectFit: "contain", marginBottom: -16 }} />
          </div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 21, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>Simply Breathe OS</h1>
          <p style={{ fontSize: 13, color: C.ink3, margin: needsV1Upgrade ? "0 0 12px" : "0 0 28px" }}>
            {initialising ? "Loading…" : selectedUser ? `Welcome back, ${selectedUser.name.split(" ")[0]}` : "Who's accessing today?"}
          </p>
          {needsV1Upgrade && (
            <div style={{ margin: "0 0 18px", padding: "10px 14px", borderRadius: 10, background: "#fffbe6", border: "1.5px solid #f5c542", fontSize: 12, color: "#7a5c00", textAlign: "left", lineHeight: 1.5 }}>
              <strong>Security upgrade required</strong><br />
              Your account uses an older PIN format. Please log in to automatically upgrade to enhanced security (PBKDF2).
            </div>
          )}

          {initialising ? (
            <div style={{ fontSize: 13, color: C.ink3, padding: "20px 0" }}>Initialising security…</div>
          ) : !selectedUser ? (
            <div style={{ display: "grid", gridTemplateColumns: users.length > 2 ? "1fr 1fr" : "1fr", gap: 10 }}>
              {users.map(u => (
                <button key={u.id} onClick={() => setSelectedUser(u)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: `1.5px solid ${C.line}`, borderRadius: 12, cursor: "pointer", background: C.surfaceAlt, transition: "all .12s", textAlign: "left" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = u.color || C.brand; e.currentTarget.style.background = hexA(u.color || C.brand, 0.06); }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = C.surfaceAlt; }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.color || C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                    {u.avatar ? <img src={u.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials(u.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: USER_ROLE_COLOR[u.role] || C.ink3, fontWeight: 600 }}>{u.role}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {users.length > 1 && (
                <button type="button" onClick={() => { setSelectedUser(null); setPin(""); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 10, cursor: "pointer", background: C.surfaceAlt, width: "100%", marginBottom: 4 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: selectedUser.color || C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", overflow: "hidden", position: "relative" }}>
                    {selectedUser.avatar ? <img src={selectedUser.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : initials(selectedUser.name)}
                  </div>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{selectedUser.name}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>Change user ↩</div>
                  </div>
                </button>
              )}
              <div style={{ position: "relative" }}>
                <input type={show ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)}
                  placeholder="Enter PIN" autoFocus style={{ width: "100%", padding: "13px 44px 13px 16px", border: `1.5px solid ${error ? "#C0392B" : C.line}`, borderRadius: 10, fontSize: 16, outline: "none", fontFamily: "monospace", letterSpacing: show ? ".05em" : ".3em", color: C.ink, background: C.surface, boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = C.brand}
                  onBlur={e => e.target.style.borderColor = error ? "#C0392B" : C.line}
                />
                <button type="button" onClick={() => setShow(s => !s)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.ink3, fontWeight: 600 }}>{show ? "HIDE" : "SHOW"}</button>
              </div>
              {errBox(error)}
              <button type="submit" disabled={busy || !pin.trim()} style={{ padding: "13px", background: busy || !pin.trim() ? C.line : selectedUser.color || C.brand, color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: busy || !pin.trim() ? "not-allowed" : "pointer", transition: "background .15s" }}>{busy ? "Unlocking…" : "Unlock"}</button>
              {anyHasRecovery && (
                <button type="button" onClick={() => { setRecoveryMode("code"); setRecoveryCode(""); setRecoveryError(""); }}
                  style={{ background: "none", border: "none", fontSize: 12.5, color: C.ink3, cursor: "pointer", marginTop: 2, textDecoration: "underline" }}>
                  Forgot your PIN? Use recovery code
                </button>
              )}
            </form>
          )}
          <p style={{ fontSize: 11, color: C.ink3, marginTop: 22, lineHeight: 1.6 }}>🔒 Data encrypted with AES-256-GCM</p>
        </div>
      )}
    </div>
  );
}
