import { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, ChevronRight, Menu, Link2, ArrowUpRight, Check,
  Zap, Copy, TrendingUp, BarChart2, Send, BellRing, Milestone,
  LogOut, UserCircle, Shield, Receipt, CalendarCheck, Scale,
} from "lucide-react";
import { LOGO } from "./assets/logo.js";
import { C, FONT, hexA } from "./lib/theme.js";
import { uid, todayISO, fmtDate } from "./lib/format.js";
import { CRM_SETTINGS_KEY, parseCrmSettings, loadCrmSettings, setCrmSettings as setModuleCrmSettings } from "./lib/crmSettings.js";
import { makeSequenceSteps, USER_COLORS, ROLE_PERMISSIONS, canAccessSection } from "./lib/constants.js";
import { STORE_KEY, STORE_KEY_ENC, apiHeaders, calendlyApiUrl, fetchWithTimeout, isTruncatedPreview, resolveCalendlyDescription, fetchCalendlyDescriptionForSession } from "./lib/api.js";
import { setApiSessionToken, clearApiSessionToken } from "./lib/apiSession.js";
import { ensureRegisteredAndMint, ensureUnlockAndMint } from "./lib/apiAuth.js";
import { loadSecMeta, saveSecMeta } from "./lib/secMeta.js";
import { _idbGet, _idbSet, store } from "./lib/store.js";
import { Sec } from "./lib/sec.js";
import { normalizeCrmData, healStudioPartnersData } from "./lib/normalizeData.js";
import {
  calcNet,
  applyPaymentReconciliation,
  reconcileAmountMismatches,
  AUTO_CXL_EXP_ID_PREFIX,
  AUTO_SPLIT_EXP_ID_PREFIX,
  isAutoExpenseRecord,
  syncBookingLedgers,
  buildRevenueViewRows,
  applyStudioSessionSplit,
} from "./lib/revenue/index.js";
import {
  upsertRegistration,
  deleteClientCascade,
  applyPaymentLookupPatch,
} from "./lib/domainActions.js";
import { SEED } from "./lib/seed.js";
import { newRecord } from "./lib/schema/defaults.js";
import { BreathMark } from "./components/primitives.jsx";
import { DrawerErrorBoundary, ConfirmModal, EditProfileModal } from "./components/modals.jsx";
import { FirstRunSetup, LockScreen, PassphraseUpgrade } from "./features/auth";
import { OrphanedRecordsModal, findOrphanedGroups, buildAlerts, AlertsPanel, LANE } from "./features/today";
import { RecordDrawer, dataForEncryptedStore, stripAgreementForStore, persistAllAgreementBlobs } from "./features/drawer";
import { CrmProvider } from "./lib/crmContext.jsx";
import { notify } from "./lib/notify.js";
import { applyCalendlyEvents } from "./lib/calendlySync.js";
import { mergeStripeSyncEvents, applyStripeSyncEvents } from "./lib/stripeSync.js";
import { SearchScope } from "./features/shell/HeaderSearch.jsx";
import { buildAppCss } from "./styles/appCss.js";

const DISMISSED_ALERTS_KEY = "sb:dismissed-alerts:v1";
const LAST_BACKUP_KEY      = "sb:last-backup:v1";
const BACKUP_REMINDER_DAYS = 7;
const NAV_KEY = "sb:nav:v1";

const CSS = buildAppCss();

/** Restore last-visited section/view from sessionStorage (written while unlocked). */
function restoreNavFromSession() {
  try {
    const raw = sessionStorage.getItem(NAV_KEY);
    if (!raw) return { section: "today", view: 0 };
    const parsed = JSON.parse(raw);
    const section = typeof parsed?.section === "string" && parsed.section ? parsed.section : "today";
    const view = Number.isFinite(Number(parsed?.view)) ? Number(parsed.view) : 0;
    return { section, view: Math.max(0, view) };
  } catch {
    return { section: "today", view: 0 };
  }
}

function applyRestoredNav(setSection, setView) {
  const nav = restoreNavFromSession();
  setSection(nav.section);
  setView(nav.view);
}

export default function App() {
  const [data, setData] = useState(SEED);
  const [section, setSection] = useState("today");
  const [view, setView] = useState(0);
  const [open, setOpen] = useState(null);   // record drawer { db, record }
  const [navOpen, setNavOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [showProfile, setShowProfile] = useState(false);
  const [showAlerts,      setShowAlerts]      = useState(false);
  const [showOrphans,     setShowOrphans]     = useState(false);
  const [refundSessionToken, setRefundSessionToken] = useState(null);
  const [crmSettings, setCrmSettings] = useState(() => loadCrmSettings());
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [confirm, setConfirm] = useState(null); // { message, onOk, okLabel?, danger? }
  const [backupBannerDismissed, setBackupBannerDismissed] = useState(false);
  const backupOverdue = (() => {
    try {
      const last = localStorage.getItem(LAST_BACKUP_KEY);
      if (!last) return true; // never backed up
      const daysSince = (Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= BACKUP_REMINDER_DAYS;
    } catch { return false; }
  })();
  const [saved, setSaved] = useState("idle"); // idle | saving | saved | error
  const [staleDetected, setStaleDetected] = useState(false); // another tab has newer data
  // Serializes encrypted writes so concurrent/async store.set calls can never land out of order
  // (a stale write resolving after a newer one would otherwise clobber just-saved data).
  const persistRef = useRef({ seq: 0, chain: Promise.resolve() });
  const [calendlyStatus, setCalendlyStatus] = useState(null); // null | { pending: n } | { syncing: true } | { synced: n, at: time, items: [] }
  const [showSyncDetail, setShowSyncDetail] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [lastCalendlyReceived, setLastCalendlyReceived] = useState(null); // { count, atFull } — only set when bookings > 0
  const loaded = useRef(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const agreementsMigrated = useRef(false);
  // Cross-tab stale-write guard: records the localStorage timestamp at which this tab last
  // loaded or saved data. If another tab saves a newer version before we do, we skip our write
  // to prevent overwriting the other tab's changes.
  const dataLoadedAtRef = useRef(0);
  const today = todayISO();

  /* ── Auth state ── */
  const [locked,       setLocked]      = useState(true);

  // Persist navigation state so refresh returns to the same page.
  // Guarded by !locked so the initial render (section="today") doesn't overwrite
  // the saved value before the session restore has a chance to read it.
  useEffect(() => {
    if (locked) return;
    try { sessionStorage.setItem(NAV_KEY, JSON.stringify({ section, view })); } catch {}
  }, [section, view, locked]);

  const [needsSetup,   setNeedsSetup]  = useState(false); // true on first-ever launch
  const [passphraseUpgrade, setPassphraseUpgrade] = useState(null); // { userId, masterKeyRaw, unlockSecret } when weak PIN must be strengthened
  const [cryptoKey,    setCryptoKey]   = useState(null);
  const [masterKeyRaw, setMasterKeyRaw] = useState(null); // raw b64 for user mgmt
  const [currentUser,  setCurrentUser]  = useState(null); // logged-in user object
  const [pinError,     setPinError]    = useState("");
  const SESSION_KEY = "sb:session:v1"; // sessionStorage — cleared when tab/window closes
  // Cross-tab coordination: written to localStorage on every successful IndexedDB save so other
  // tabs can detect that a newer version exists and abort their stale writes.
  const SAVE_TS_KEY = "sb:data:v5:save-ts";
  // PIN lockout — source of truth is IndexedDB key "sb:pin-lockout:v2" (unlike localStorage it
  // cannot be silently cleared by a user typing localStorage.clear() in DevTools).
  // This React state mirrors it only for UI re-renders; handleUnlock reads IDB directly.
  // eslint-disable-next-line no-unused-vars
  const [_pinAttempts, setPinAttempts] = useState({});
  const [initialising, setInitialising] = useState(true);
  const [secUsers,     setSecUsers]    = useState([]);    // loaded from SEC_META_KEY

  /* ── Security initialisation (on mount) ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const parsed = await loadSecMeta();
        if (parsed) {
          // v2 multi-user format
          if (parsed.version === 2 && Array.isArray(parsed.users)) {
            const activeUsers = parsed.users.filter(u => u.active !== false);
            if (alive) setSecUsers(activeUsers);

            // masterKeyRaw is no longer persisted to sessionStorage (key-in-memory-only).
            // Clear any leftover session tile state — PIN must be re-entered to re-derive the key.
            try { sessionStorage.removeItem("sb:session:v1"); } catch (_) {}
          } else {
            // v1 single-user format — show a placeholder tile so the screen is interactive
            // handleUnlock will auto-migrate to v2 on successful PIN entry
            if (alive) setSecUsers([{
              id: "v1_migration", name: "Admin", role: "Owner",
              permissions: ROLE_PERMISSIONS.Owner, active: true, color: USER_COLORS[0],
            }]);
          }
        } else {
          // First ever run — prompt user to create their account
          if (alive) setNeedsSetup(true);
        }
      } catch (_) { /* storage unavailable */ }
      finally {
        if (alive) {
          // Only add fallback tile if not in first-run setup mode
          setSecUsers(prev => {
            if (prev.length > 0) return prev;
            return [{ id: "v1_migration", name: "Admin", role: "Owner",
              permissions: ROLE_PERMISSIONS.Owner, active: true, color: USER_COLORS[0] }];
          });
          setInitialising(false);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ── PIN unlock handler ── */
  const PIN_MAX_ATTEMPTS = 5;
  const PIN_LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

  const handleUnlock = async (userId, pin) => {
    setPinError("");

    // ── Brute-force lockout — IndexedDB primary (survives localStorage.clear()); server secondary ──
    const now = Date.now();
    let _idbLockData = {};
    try {
      const _lockRaw = await _idbGet("sb:pin-lockout:v2");
      _idbLockData = _lockRaw ? JSON.parse(_lockRaw) : {};
    } catch {}
    const rec = _idbLockData[userId] || { count: 0, lockedUntil: 0 };

    // Server-side check: blocks brute-force even if IDB is cleared via DevTools.
    // Capture the one-shot challenge so failed/success reports cannot be forged without it.
    let _pinChallenge = null;
    try {
      const _srvRes = await fetch(`/api/auth/pin-status?userId=${encodeURIComponent(userId)}`, { headers: apiHeaders(false) });
      if (_srvRes.ok) {
        const _srv = await _srvRes.json();
        _pinChallenge = _srv.challenge || null;
        if (_srv.locked) {
          const remaining = Math.ceil(Math.max(0, _srv.lockedUntil - now) / 60000);
          setPinError(`Too many failed attempts. Try again in ${remaining || 1} minute${remaining !== 1 ? "s" : ""}.`);
          return;
        }
      }
    } catch {}

    if (rec.lockedUntil > now) {
      const remaining = Math.ceil((rec.lockedUntil - now) / 60000);
      setPinError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.`);
      return;
    }

    // Helpers shared by v1 and v2 paths
    const _postPinAttempt = (failed) => {
      if (!_pinChallenge) return;
      const challenge = _pinChallenge;
      _pinChallenge = null; // one-shot
      fetch("/api/auth/pin-attempt", {
        method: "POST", headers: apiHeaders(),
        body: JSON.stringify({ userId, failed, challenge }),
      }).catch(() => {});
    };
    const _recordFail = async () => {
      const newCount = (rec.count || 0) + 1;
      const lockedUntil = newCount >= PIN_MAX_ATTEMPTS ? Date.now() + PIN_LOCKOUT_MS : 0;
      const updated = { ..._idbLockData, [userId]: { count: newCount, lockedUntil } };
      try { await _idbSet("sb:pin-lockout:v2", JSON.stringify(updated)); } catch {}
      _postPinAttempt(true);
      return { newCount, lockedUntil };
    };
    const _clearLockout = () => {
      const { [userId]: _rm, ...rest } = _idbLockData;
      _idbSet("sb:pin-lockout:v2", JSON.stringify(rest)).catch(() => {});
      _postPinAttempt(false);
    };
    try {
      const sec = await loadSecMeta();
      if (!sec) throw new Error("No security config");

      // ── Migrate v1 → v2 ──
      if (!sec.version || sec.version < 2) {
        const hash = await Sec.hashPin(pin);
        if (hash !== sec.pinHash) {
          const { newCount, lockedUntil } = await _recordFail();
          setPinError(lockedUntil ? `Too many failed attempts. Try again in 5 minutes.` : `Incorrect PIN. ${PIN_MAX_ATTEMPTS - newCount} attempt${PIN_MAX_ATTEMPTS - newCount !== 1 ? "s" : ""} remaining.`);
          return;
        }
        // Generate master key and re-wrap with this PIN
        const masterKeyB64 = await Sec.generateMasterKeyB64();
        const pinSalt      = sec.salt;
        const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyB64, pin, pinSalt, Sec.PBKDF2_ITERATIONS);
        const _migToken = Sec.randomToken();
        const owner = {
          id: "u_owner", name: "Admin", role: "Owner",
          // pinHash intentionally omitted — v2 verification uses PBKDF2 unwrap only
          pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
          permissions: ROLE_PERMISSIONS.Owner,
          active: true, color: USER_COLORS[0],
          createdAt: todayISO(), lastLogin: todayISO(),
          sessionTokenHash: await Sec.sessionTokenHash(_migToken),
        };
        const newSec = { version: 2, users: [owner] };
        await saveSecMeta(newSec);
        setSecUsers([owner]);
        const masterKey = await Sec.importMasterKey(masterKeyB64);
        // Migrate encrypted data: re-encrypt with new master key
        const encRaw = await store.get(STORE_KEY_ENC);
        if (encRaw?.value) {
          const oldKey = await Sec.deriveKey(pin, sec.salt);
          try {
            const dec = normalizeCrmData(await Sec.decrypt(encRaw.value, oldKey));
            if (Sec.validate(dec)) {
              const reenc = await Sec.encrypt(dec, masterKey);
              await store.set(STORE_KEY_ENC, reenc);
              setData(dec);
              if (dec._settings && typeof dec._settings === "object") {
                const s = parseCrmSettings(dec._settings);
                setCrmSettings(s);
                setModuleCrmSettings(s);
                try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(s)); } catch {}
              }
            }
          } catch (_) {}
        }
        _clearLockout();
        setMasterKeyRaw(masterKeyB64);
        setCryptoKey(masterKey);
        setCurrentUser(owner);
        loaded.current = true;
        if (Sec.isWeakPassphrase(pin)) {
          // Defer session mint until passphrase is strengthened
          setPassphraseUpgrade({ userId: owner.id, masterKeyRaw: masterKeyB64, unlockSecret: null, role: "Owner", canEdit: true });
          return;
        }
        try { sessionStorage.setItem("sb:session:v1", JSON.stringify({ userId, token: _migToken })); } catch (_) {}
        setLocked(false);
        applyRestoredNav(setSection, setView);
        const { token } = await ensureUnlockAndMint(owner, pin, {
          role: "Owner",
          canEdit: true,
          persist: async (wrapped) => {
            try {
              const sec2 = (await loadSecMeta()) || {};
              if (Array.isArray(sec2.users)) {
                const updated = {
                  ...sec2,
                  users: sec2.users.map(u => u.id === owner.id ? { ...u, wrappedUnlockSecret: wrapped } : u),
                };
                await saveSecMeta(updated);
                setSecUsers(updated.users.filter(u => u.active !== false));
              }
            } catch (_) {}
          },
        });
        if (token) { setRefundSessionToken(token); setApiSessionToken(token); }
        return;
      }

      // ── v2 unlock ──
      const user = sec.users.find(u => u.id === userId && u.active !== false);
      if (!user) throw new Error("User not found");

      // Verify PIN via PBKDF2 unwrap — use stored iteration count (may be legacy 100k)
      const storedIterations = user.pbkdf2Iterations ?? 100_000;
      let mkB64, masterKey;
      try {
        const result = await Sec.unwrapKeyForUser(user.wrappedMasterKey, pin, user.pinSalt, storedIterations);
        mkB64 = result.raw;
        masterKey = result.key;
      } catch (_) {
        const { newCount, lockedUntil } = await _recordFail();
        setPinError(lockedUntil ? `Too many failed attempts. Try again in 5 minutes.` : `Incorrect PIN. ${PIN_MAX_ATTEMPTS - newCount} attempt${PIN_MAX_ATTEMPTS - newCount !== 1 ? "s" : ""} remaining.`);
        return;
      }

      // Load data
      const encRaw = await store.get(STORE_KEY_ENC);
      if (encRaw?.value) {
        try {
          const dec = normalizeCrmData(await Sec.decrypt(encRaw.value, masterKey));
          if (Sec.validate(dec)) {
            setData(healStudioPartnersData(dec));
            dataLoadedAtRef.current = parseInt(localStorage.getItem(SAVE_TS_KEY) || "0") || Date.now();
            // Restore CRM settings from encrypted store — preferred over unencrypted localStorage cache
            if (dec._settings && typeof dec._settings === "object") {
              const s = parseCrmSettings(dec._settings);
              setCrmSettings(s);
              setModuleCrmSettings(s);
              try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(s)); } catch {}
            }
          } else {
            setPinError("Data integrity check failed. Please restore from a JSON backup.");
            return;
          }
        } catch (_) {
          setPinError("Data could not be decrypted. Please try again, or restore from a JSON backup.");
          return;
        }
      } else {
        // Check for legacy v4 unencrypted data
        const legacyRaw = await store.get(STORE_KEY);
        if (legacyRaw?.value) {
          try { const l = JSON.parse(legacyRaw.value); if (Sec.validate(l)) setData(l); } catch (_) {}
        }
      }

      // Silently upgrade PBKDF2 iterations if below current target (600k)
      let upgradedWrappedKey = user.wrappedMasterKey;
      let upgradedSalt       = user.pinSalt;
      if (storedIterations < Sec.PBKDF2_ITERATIONS) {
        try {
          upgradedSalt       = Sec.newSalt();
          upgradedWrappedKey = await Sec.wrapKeyForUser(mkB64, pin, upgradedSalt, Sec.PBKDF2_ITERATIONS);
        } catch (_) {
          // Non-fatal — keep old values if upgrade fails
          upgradedWrappedKey = user.wrappedMasterKey;
          upgradedSalt       = user.pinSalt;
        }
      }

      // Mint a fresh per-login restore token; persist only its hash on this user's record.
      const _sessionToken = Sec.randomToken();
      const _sessionTokenHash = await Sec.sessionTokenHash(_sessionToken);

      // Per-user unlock secret (PIN-wrapped) — used for server-verified API session mint.
      let unlockSecret = null;
      if (user.wrappedUnlockSecret) {
        try {
          unlockSecret = await Sec.unwrapUnlockSecret(user.wrappedUnlockSecret, pin, user.pinSalt, storedIterations);
        } catch (_) {
          unlockSecret = null;
        }
      }
      if (!unlockSecret) unlockSecret = Sec.generateUnlockSecret();
      const unlockWrapped = await Sec.wrapUnlockSecret(unlockSecret, pin, upgradedSalt, Sec.PBKDF2_ITERATIONS);

      const updatedUsers = sec.users.map(u => {
        const { pinHash: _dropped, ...rest } = u; // remove legacy SHA-256 hash
        if (u.id === userId) {
          return {
            ...rest,
            lastLogin: todayISO(),
            pinSalt:           upgradedSalt,
            wrappedMasterKey:  upgradedWrappedKey,
            pbkdf2Iterations:  Sec.PBKDF2_ITERATIONS,
            sessionTokenHash:  _sessionTokenHash,
            wrappedUnlockSecret: unlockWrapped,
          };
        }
        return rest;
      });
      await saveSecMeta({ ...sec, users: updatedUsers });
      setSecUsers(updatedUsers.filter(u => u.active !== false));

      setMasterKeyRaw(mkB64);
      setCryptoKey(masterKey);
      const unlockedUser = updatedUsers.find(u => u.id === userId) ?? user;
      setCurrentUser(unlockedUser);
      _clearLockout();
      // Clean up legacy unencrypted storage
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      loaded.current = true;

      if (Sec.isWeakPassphrase(pin)) {
        setPassphraseUpgrade({
          userId,
          masterKeyRaw: mkB64,
          unlockSecret,
          role: unlockedUser.role,
          canEdit: !!unlockedUser.permissions?.edit,
        });
        return;
      }

      try { sessionStorage.setItem("sb:session:v1", JSON.stringify({ userId, token: _sessionToken })); } catch (_) {}
      setLocked(false);
      applyRestoredNav(setSection, setView);
      await ensureRegisteredAndMint(userId, unlockSecret, {
        role: unlockedUser.role,
        canEdit: !!unlockedUser.permissions?.edit,
      }).then((token) => {
        if (token) { setRefundSessionToken(token); setApiSessionToken(token); }
      });
    } catch (e) {
      if (!e.message?.includes("PIN")) setPinError("Something went wrong. Please try again.");
    }
  };

  /* ── Recovery: verify code + decrypt data (step 1 of 2) ── */
  const handleRecoveryVerify = async (userId, code) => {
    try {
      const sec = await loadSecMeta();
      if (!sec) return { success: false, error: "No security config found." };
      const user = (sec.users || []).find(u => u.id === userId && u.active !== false);
      if (!user?.recoveryWrappedMasterKey) return { success: false, error: "No recovery code has been set for this account." };
      let mkB64, masterKey;
      try {
        const result = await Sec.unwrapKeyForUser(
          user.recoveryWrappedMasterKey, code.replace(/[-\s]/g, "").toUpperCase(),
          user.recoverySalt, user.recoveryPbkdf2Iterations ?? Sec.RECOVERY_PBKDF2_ITERATIONS
        );
        mkB64 = result.raw;
        masterKey = result.key;
      } catch (_) {
        return { success: false, error: "Recovery code is incorrect. Check for typos and try again." };
      }
      // Decrypt and load data — same as normal unlock
      const encRaw = await store.get(STORE_KEY_ENC);
      if (encRaw?.value) {
        try {
          const dec = normalizeCrmData(await Sec.decrypt(encRaw.value, masterKey));
          if (Sec.validate(dec)) {
            setData(healStudioPartnersData(dec));
            dataLoadedAtRef.current = parseInt(localStorage.getItem(SAVE_TS_KEY) || "0") || Date.now();
            if (dec._settings && typeof dec._settings === "object") {
              const s = parseCrmSettings(dec._settings);
              setCrmSettings(s);
              setModuleCrmSettings(s);
              try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(s)); } catch {}
            }
          }
        } catch (_) {
          return { success: false, error: "Data could not be decrypted with this recovery code." };
        }
      }
      return { success: true, masterKeyRaw: mkB64 };
    } catch (e) {
      return { success: false, error: "Something went wrong. Please try again." };
    }
  };

  /* ── Recovery: set new PIN + unlock (step 2 of 2) ── */
  const handleRecoverySetPin = async (userId, newPin, masterKeyRaw) => {
    try {
      const check = Sec.validatePassphrase(newPin);
      if (!check.ok) return { success: false, error: check.error };
      const sec = await loadSecMeta();
      if (!sec) return { success: false, error: "Security config not found." };
      // Re-wrap master key with new PIN, clear recovery code (consumed), mint session token
      const pinSalt = Sec.newSalt();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyRaw, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const unlockSecret = Sec.generateUnlockSecret();
      const wrappedUnlockSecret = await Sec.wrapUnlockSecret(unlockSecret, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const _sessionToken = Sec.randomToken();
      const _sessionTokenHash = await Sec.sessionTokenHash(_sessionToken);
      const updatedUsers = sec.users.map(u => {
        if (u.id !== userId) return u;
        const { pinHash: _d, recoveryWrappedMasterKey: _r, recoverySalt: _s, recoveryPbkdf2Iterations: _i, ...rest } = u;
        return { ...rest, pinSalt, wrappedMasterKey, wrappedUnlockSecret, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
          lastLogin: todayISO(), sessionTokenHash: _sessionTokenHash };
      });
      await saveSecMeta({ ...sec, users: updatedUsers });
      setSecUsers(updatedUsers.filter(u => u.active !== false));
      const masterKey = await Sec.importMasterKey(masterKeyRaw);
      setMasterKeyRaw(masterKeyRaw);
      setCryptoKey(masterKey);
      const recoveredUser = updatedUsers.find(u => u.id === userId);
      setCurrentUser(recoveredUser);
      // Clear lockout counter for this user in IDB + server (recovery proves identity)
      try {
        const _lRaw = await _idbGet("sb:pin-lockout:v2");
        const _lData = _lRaw ? JSON.parse(_lRaw) : {};
        const { [userId]: _rm, ...rest } = _lData;
        await _idbSet("sb:pin-lockout:v2", JSON.stringify(rest));
      } catch {}
      try {
        const _st = await fetch(`/api/auth/pin-status?userId=${encodeURIComponent(userId)}`, { headers: apiHeaders(false) });
        if (_st.ok) {
          const _sj = await _st.json();
          if (_sj.challenge) {
            await fetch("/api/auth/pin-attempt", {
              method: "POST", headers: apiHeaders(),
              body: JSON.stringify({ userId, failed: false, challenge: _sj.challenge }),
            });
          }
        }
      } catch {}
      try { sessionStorage.setItem("sb:session:v1", JSON.stringify({ userId, token: _sessionToken })); } catch (_) {}
      loaded.current = true;
      setPassphraseUpgrade(null);
      setLocked(false);
      applyRestoredNav(setSection, setView);
      const token = await ensureRegisteredAndMint(userId, unlockSecret, {
        role: recoveredUser?.role,
        canEdit: !!recoveredUser?.permissions?.edit,
      });
      if (token) { setRefundSessionToken(token); setApiSessionToken(token); }
      return { success: true };
    } catch (e) {
      return { success: false, error: "Failed to set new PIN. Please try again." };
    }
  };

  /* ── Forced passphrase strengthen after unlock with a weak (legacy) PIN ── */
  const handlePassphraseUpgrade = async (newPin) => {
    if (!passphraseUpgrade) return { success: false, error: "No upgrade in progress." };
    const check = Sec.validatePassphrase(newPin);
    if (!check.ok) return { success: false, error: check.error };
    const { userId, masterKeyRaw: mkB64, unlockSecret: existingSecret, role, canEdit } = passphraseUpgrade;
    try {
      const sec = await loadSecMeta();
      if (!sec) return { success: false, error: "Security config not found." };
      const pinSalt = Sec.newSalt();
      const wrappedMasterKey = await Sec.wrapKeyForUser(mkB64, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const unlockSecret = existingSecret || Sec.generateUnlockSecret();
      const wrappedUnlockSecret = await Sec.wrapUnlockSecret(unlockSecret, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const _sessionToken = Sec.randomToken();
      const _sessionTokenHash = await Sec.sessionTokenHash(_sessionToken);
      const updatedUsers = (sec.users || []).map(u => {
        if (u.id !== userId) return u;
        return {
          ...u,
          pinSalt,
          wrappedMasterKey,
          wrappedUnlockSecret,
          pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
          sessionTokenHash: _sessionTokenHash,
          lastLogin: todayISO(),
        };
      });
      await saveSecMeta({ ...sec, users: updatedUsers });
      setSecUsers(updatedUsers.filter(u => u.active !== false));
      const upgradedUser = updatedUsers.find(u => u.id === userId);
      setCurrentUser(upgradedUser);
      try { sessionStorage.setItem("sb:session:v1", JSON.stringify({ userId, token: _sessionToken })); } catch (_) {}
      setPassphraseUpgrade(null);
      setLocked(false);
      applyRestoredNav(setSection, setView);
      const token = await ensureRegisteredAndMint(userId, unlockSecret, {
        role: role || upgradedUser?.role,
        canEdit: canEdit ?? !!upgradedUser?.permissions?.edit,
      });
      if (token) { setRefundSessionToken(token); setApiSessionToken(token); }
      return { success: true };
    } catch (e) {
      return { success: false, error: "Failed to update passphrase. Please try again." };
    }
  };

  /* ── First-launch owner account setup ── */
  const handleSetupOwner = async (name, pin) => {
    try {
      const check = Sec.validatePassphrase(pin);
      if (!check.ok) { setPinError(check.error); return; }
      // Guard: if encrypted data already exists, refuse to overwrite without a full page reload
      const existingEnc = await store.get(STORE_KEY_ENC);
      if (existingEnc?.value) {
        setPinError("Encrypted data already exists. Reload the page and log in — or restore from a JSON backup before setting up a new account.");
        return;
      }
      const pinSalt      = Sec.newSalt();
      const masterKeyB64 = await Sec.generateMasterKeyB64();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyB64, pin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const unlockSecret = Sec.generateUnlockSecret();
      const wrappedUnlockSecret = await Sec.wrapUnlockSecret(unlockSecret, pin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const _setupToken = Sec.randomToken();
      const owner = {
        id: "u_owner", name: name.trim(), role: "Owner",
        pinSalt, wrappedMasterKey, wrappedUnlockSecret, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
        permissions: ROLE_PERMISSIONS.Owner,
        active: true, color: USER_COLORS[0],
        createdAt: todayISO(), lastLogin: todayISO(),
        sessionTokenHash: await Sec.sessionTokenHash(_setupToken),
      };
      const newSec = { version: 2, users: [owner] };
      await saveSecMeta(newSec);
      const masterKey = await Sec.importMasterKey(masterKeyB64);
      setSecUsers([owner]);
      setMasterKeyRaw(masterKeyB64);
      setCryptoKey(masterKey);
      setCurrentUser(owner);
      setData(SEED);
      try { sessionStorage.setItem("sb:session:v1", JSON.stringify({ userId: owner.id, token: _setupToken })); } catch (_) {}
      loaded.current = true;
      setNeedsSetup(false);
      setPassphraseUpgrade(null);
      setLocked(false);
      applyRestoredNav(setSection, setView);
      const token = await ensureRegisteredAndMint(owner.id, unlockSecret, { role: "Owner", canEdit: true });
      if (token) { setRefundSessionToken(token); setApiSessionToken(token); }
    } catch (e) {
      setPinError("Setup failed. Please try again.");
    }
  };

  /* ── Logout ── */
  const handleLogout = () => {
    setLocked(true);
    setPassphraseUpgrade(null);
    setCryptoKey(null);
    setMasterKeyRaw(null);
    setCurrentUser(null);
    setData({}); // clear decrypted data from memory
    setRefundSessionToken(null);
    clearApiSessionToken();
    try { sessionStorage.removeItem("sb:session:v1"); sessionStorage.removeItem(NAV_KEY); } catch (_) {}
    setOpen(null);
    loaded.current = false;
    setPinError("");
  };

  /* ── Calendly Sync ── */
  // x-frontend-secret is injected by the Vite proxy in dev and by the production
  // reverse proxy (Nginx/Caddy) at the network layer — never via VITE_* env vars,
  // as those are baked into the public JS bundle.
  const _calendlyHeaders    = () => ({});

  const syncCalendly = async () => {
    if (locked) return;
    setCalendlyStatus({ syncing: true });
    try {
      // Pull from Calendly API first — catches bookings when webhooks were missed (ngrok down, etc.).
      // Bounded by a timeout: the API scan can take ~30s; if it's slow we proceed with already-queued
      // events rather than hanging the whole sync (newly pulled events appear on the next sync).
      // Compute how many days back to pull from Calendly, anchored to the sync-from-date
      // so we never fetch events older than the configured cutoff.
      const _syncFromDate = crmSettings?.calendlySyncFromDate || "";
      const _daysBack = _syncFromDate
        ? Math.max(1, Math.min(Math.ceil((Date.now() - new Date(_syncFromDate).getTime()) / 86400000), 90))
        : 30;
      await fetchWithTimeout(calendlyApiUrl("/api/calendly/pull-recent"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ..._calendlyHeaders() },
        body: JSON.stringify({ daysBack: _daysBack }),
      }, 12000).catch(() => {});

      // Read the queue. Retry once on a transient network error (e.g. backend mid-restart) before
      // reporting the backend as unreachable.
      let res;
      try {
        res = await fetchWithTimeout(calendlyApiUrl("/api/calendly/pending"), { headers: _calendlyHeaders() }, 15000);
      } catch {
        await new Promise(r => setTimeout(r, 1000));
        res = await fetchWithTimeout(calendlyApiUrl("/api/calendly/pending"), { headers: _calendlyHeaders() }, 15000);
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Backend returned ${res.status}`);
      }
      const { events } = await res.json();

      // Compute against latest-data ref OUTSIDE the updater — React may skip running
      // the updater synchronously when another update is already queued.
      const applied = applyCalendlyEvents(dataRef.current, events || [], {
        calendlySyncFromDate: crmSettings?.calendlySyncFromDate || "",
      });
      const processed = applied.processed;
      const ids = [...applied.ids];
      const syncedItems = [...applied.syncedItems];
      const sessionsNeedingDesc = applied.sessionsNeedingDesc;
      const paymentLookupUris = applied.paymentLookupUris;
      const postSyncRegistrations = applied.data.registrations || [];
      dataRef.current = applied.data;
      setData(applied.data);

      // Acknowledge processed events
      if (ids.length) {
        await fetch(calendlyApiUrl("/api/calendly/acknowledge"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ..._calendlyHeaders() },
          body: JSON.stringify({ ids }),
        }).catch(() => {});
      }

      const now = new Date();
      setCalendlyStatus({ synced: processed, count: processed, at: now.toLocaleTimeString(), atFull: now.toLocaleString(), items: syncedItems });
      if (processed > 0) setLastCalendlyReceived({ count: processed, atFull: now.toLocaleString() });

      // New Calendly bookings may arrive after Stripe webhooks — retry payment matching.
      {
        const prev = dataRef.current;
        const reconciled = applyPaymentReconciliation(prev);
        const next = {
          ...prev,
          payments: reconciled.payments ?? prev.payments,
          registrations: reconciled.registrations ?? prev.registrations,
          sessions: reconciled.sessions ?? prev.sessions,
          clients: reconciled.clients ?? prev.clients,
        };
        const amountFix = reconcileAmountMismatches(next);
        const after = { ...next, registrations: amountFix.registrations, sessions: amountFix.sessions, clients: amountFix.clients };
        dataRef.current = after;
        setData(after);
      }

      // Backfill truncated session descriptions from Calendly event types (async, non-blocking)
      // Requires Edit — same gate as the studio event description panel (Viewers may fetch/read only).
      if (sessionsNeedingDesc.length && currentUser?.permissions?.edit) {
        Promise.all(sessionsNeedingDesc.slice(0, 10).map(async (s) => {
          try {
            const { description: desc, error } = await fetchCalendlyDescriptionForSession(s, postSyncRegistrations);
            if (error || !desc || isTruncatedPreview(desc)) return;
            setData(prev => ({
              ...prev,
              sessions: (prev.sessions || []).map(x => {
                if (x.id !== s.id) return x;
                const merged = resolveCalendlyDescription(x.calendlyDescription, desc);
                return merged === x.calendlyDescription ? x : { ...x, calendlyDescription: merged };
              }),
            }));
          } catch { /* ignore background refresh errors */ }
        })).catch(() => {});
      }

      // Backfill missing payment amounts from Calendly invitee API (async, non-blocking)
      const missingRegs = postSyncRegistrations
        .filter(r => r.paymentAmount == null || r.paymentAmount === "");
      const missingPaymentUris = [...new Set([
        ...paymentLookupUris,
        ...missingRegs.map(r => r.calendlyInviteeUri).filter(Boolean),
      ])].slice(0, 25);
      const missingEventNames = [...new Set(missingRegs.map(r => r.eventName).filter(Boolean))].slice(0, 25);
      const eventTypeByUri = {};
      missingRegs.forEach(r => {
        if (r.calendlyInviteeUri && r.calendlyEventTypeUri) {
          eventTypeByUri[r.calendlyInviteeUri] = r.calendlyEventTypeUri;
        }
      });
      if (missingPaymentUris.length || missingEventNames.length) {
        fetch(calendlyApiUrl("/api/calendly/payment-lookup"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ..._calendlyHeaders() },
          body: JSON.stringify({ uris: missingPaymentUris, eventNames: missingEventNames, eventTypeByUri }),
        })
          .then(res => res.ok ? res.json() : null)
          .then(payload => {
            if (!payload?.payments && !payload?.eventPrices) return;
            setData(prev => applyPaymentLookupPatch(prev, payload));
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("syncCalendly:", err);
      const detail = err?.message && !/abort|network|failed to fetch/i.test(err.message)
        ? err.message
        : null;
      try {
        const res = await fetch(calendlyApiUrl("/api/calendly/pending"), { headers: _calendlyHeaders() });
        if (!res.ok) {
          setCalendlyStatus({ error: detail || `Backend returned ${res.status}` });
          return;
        }
        const { total } = await res.json();
        if (total > 0) {
          setCalendlyStatus({ pending: total, error: detail || "Sync failed while processing events" });
        } else {
          setCalendlyStatus({ error: detail || "Sync failed — check the browser console" });
        }
      } catch {
        setCalendlyStatus({ error: "Cannot reach backend on port 3001 — run start.ps1" });
      }
    }
  };

  const syncStripe = async () => {
    if (locked) return;
    setStripeStatus({ syncing: true });
    try {
      const [pendingRes, ledgerRes] = await Promise.all([
        fetch(calendlyApiUrl("/api/stripe/pending"), { headers: _calendlyHeaders() }),
        fetch(calendlyApiUrl("/api/stripe/ledger?daysBack=90"), { headers: _calendlyHeaders() }),
      ]);
      if (!pendingRes.ok) throw new Error(`Backend returned ${pendingRes.status}`);
      const { events: pendingEvents, total } = await pendingRes.json();
      const ledgerJson = ledgerRes.ok ? await ledgerRes.json() : { events: [] };
      const events = mergeStripeSyncEvents(pendingEvents || [], ledgerJson.events || []);
      // Ack ids from latest-data ref — do not harvest inside the setData updater.
      const applied = applyStripeSyncEvents(dataRef.current, events, pendingEvents || []);
      const processed = applied.processed;
      const ackIds = applied.ackIds;
      dataRef.current = applied.data;
      setData(applied.data);
      if (ackIds.length) {
        await fetch(calendlyApiUrl("/api/stripe/acknowledge"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ..._calendlyHeaders() },
          body: JSON.stringify({ ids: ackIds }),
        }).catch(() => {});
      }
      const now = new Date();
      const pendingBackend = total ?? 0;
      setStripeStatus({
        syncing: false,
        synced: processed,
        count: processed,
        at: now.toLocaleTimeString(),
        reconciledAt: now.toISOString(),
        ledgerCount: ledgerJson.total ?? events.length,
        pending: total ?? 0,
      });
    } catch (err) {
      console.error("syncStripe:", err);
      try {
        const res = await fetch(calendlyApiUrl("/api/stripe/pending"), { headers: _calendlyHeaders() });
        const { total } = await res.json();
        if (total > 0) setStripeStatus({ pending: total, error: "Sync failed — retry or check backend" });
        else setStripeStatus({ error: "Cannot reach backend on port 3001" });
      } catch { setStripeStatus({ error: "Cannot reach backend on port 3001" }); }
    }
  };

  // Keep latest sync fns in refs so the poll interval (deps: [locked] only) never
  // calls unlock-time closures that rebuild from a stale `data` snapshot.
  const syncCalendlyRef = useRef(syncCalendly);
  const syncStripeRef = useRef(syncStripe);
  syncCalendlyRef.current = syncCalendly;
  syncStripeRef.current = syncStripe;

  // Poll for pending Calendly + Stripe events every 15 minutes when logged in
  useEffect(() => {
    if (locked) return;
    const tick = () => { syncCalendlyRef.current(); syncStripeRef.current(); };
    tick();
    const interval = setInterval(tick, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [locked]);

  // Auto-lock after 15 minutes of inactivity — same wipe as logout (key + decrypted data out of memory).
  useEffect(() => {
    if (locked) return;
    const IDLE_MS = 15 * 60 * 1000;
    let timer = setTimeout(handleLogout, IDLE_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(handleLogout, IDLE_MS); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  // handleLogout is stable enough for idle wipe; re-bind when lock state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  /* ── Cross-tab data-sync: detect when another window saves a newer version ──
     When the save timestamp in localStorage advances beyond what this tab loaded,
     the stale-write guard (above) will block our next save. We surface a banner so
     the user can refresh to get the latest data before continuing to edit. */
  useEffect(() => {
    if (locked) return;
    const handler = (e) => {
      if (e.key !== SAVE_TS_KEY || !e.newValue) return;
      const newTs = parseInt(e.newValue);
      if (newTs > dataLoadedAtRef.current + 2000) {
        console.log("[SBCRM] Another tab saved newer data at", new Date(newTs).toISOString());
        setStaleDetected(true);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [locked]);

  /* ── Save profile edits ── */
  const handleSaveProfile = async (updates) => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    setSecUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    
    try {
      const sec = (await loadSecMeta()) || {};
      if (!Array.isArray(sec.users)) return;
      const newSec = { ...sec, users: sec.users.map(u => u.id === currentUser.id ? updated : u) };
      await saveSecMeta(newSec);
    } catch (e) { console.error("handleSaveProfile:", e); }
  };

  /* ── Persist on change (encrypted) ──
     Writes are debounced (coalesce bursts of setData into one write) and serialized through a
     single promise chain with a monotonic sequence number. Because store.set is async (it may be
     backed by an IPC/IndexedDB layer), two writes could otherwise complete out of order and a
     stale snapshot could overwrite freshly-saved data. The seq guard discards any superseded write
     before it commits, and the chain guarantees writes never overlap. */
  useEffect(() => {
    if (!loaded.current || !cryptoKey) return;
    const seq = ++persistRef.current.seq;
    const snapshot = data;
    setSaved("saving");
    const timer = setTimeout(() => {
      // Chain is always reset to a resolved promise after each attempt so a single
      // failure can never permanently block all future saves.
      persistRef.current.chain = persistRef.current.chain
        .then(async () => {
          if (seq < persistRef.current.seq) return; // a newer change was scheduled — skip this stale write
          // ── Cross-tab stale-write guard ──
          // If another tab saved after this tab last loaded/saved, our in-memory state is behind.
          // Skipping the write prevents us from overwriting the other tab's newer changes.
          const externalSaveTs = parseInt(localStorage.getItem(SAVE_TS_KEY) || "0");
          if (externalSaveTs > dataLoadedAtRef.current + 2000) {
            console.warn("[SBCRM] Stale-write blocked — another tab saved at", new Date(externalSaveTs).toISOString(), ". This tab's data is from", new Date(dataLoadedAtRef.current).toISOString());
            setSaved("idle");
            setStaleDetected(true);
            return;
          }
          try {
            await persistAllAgreementBlobs(snapshot, cryptoKey);
            const payload = normalizeCrmData(dataForEncryptedStore(snapshot));
            if (!Sec.validate(payload)) {
              console.error("CRM persist skipped: invalid data shape");
              setSaved("error");
              return;
            }
            const enc = await Sec.encrypt(payload, cryptoKey);
            if (seq < persistRef.current.seq) return; // superseded while encrypting — don't commit
            await store.set(STORE_KEY_ENC, enc);
            // Record save timestamp so other tabs know a newer version exists
            const nowTs = Date.now();
            try { localStorage.setItem(SAVE_TS_KEY, String(nowTs)); } catch {}
            dataLoadedAtRef.current = nowTs;
            setStaleDetected(false);
            setSaved("saved");
            setTimeout(() => setSaved("idle"), 1400);
          } catch (e) {
            console.error("CRM persist failed:", e);
            setSaved("error");
            if (typeof window !== "undefined" && !window.__sbcrmPersistNotified) {
              window.__sbcrmPersistNotified = true;
              notify.error(
                "Your changes could not be saved to storage.\n\n"
                + (e && e.name === "QuotaExceededError"
                  ? "Browser storage is full. Use Admin → Storage to export a backup."
                  : ("Reason: " + (e && e.message ? e.message : e)))
                + "\n\nThe red banner stays until saving is restored — export a backup now.",
                { duration: 10000 }
              );
            }
          }
        })
        .catch(() => { /* prevent a rejected chain from blocking all future saves */ });
    }, 200);
    return () => clearTimeout(timer);
  }, [data, cryptoKey]);

  /* ── Keep the revenue + expense ledgers in sync with bookings ──
     Materialises a revenue record per active booking and an expense record per canceled booking.
     Depends only on bookings (not on revenue/expenses) so updating the ledgers never re-triggers it. */
  useEffect(() => {
    if (!loaded.current) return;
    setData(prev => {
      const { revenue, expenses, changed } = syncBookingLedgers(prev);
      return changed ? { ...prev, revenue, expenses } : prev;
    });
  }, [data.registrations, data.sessions, data.clients, data.partners, data.payments]);

  /* ── Migrate legacy inline agreement blobs to separate encrypted storage ── */
  useEffect(() => {
    if (!cryptoKey || !loaded.current || agreementsMigrated.current) return;
    const hasInline = (data.partners || []).some(p => (p.agreements || []).some(a => a.dataUrl));
    if (!hasInline) return;
    agreementsMigrated.current = true;
    (async () => {
      try {
        await persistAllAgreementBlobs(data, cryptoKey);
        setData(d => dataForEncryptedStore(d));
      } catch (e) {
        console.error("Agreement migration failed:", e);
        agreementsMigrated.current = false;
      }
    })();
  }, [cryptoKey, data]);

  /* ── Lock gate ── */
  // Memoized alerts list — used by both the bell badge count and AlertsPanel.
  const allAlerts = useMemo(() => buildAlerts(data, today), [data, today]);

  // Derived rollups — must be called unconditionally (Rules of Hooks)
  const derived = useMemo(() => {
    const partnerName = Object.fromEntries((data.partners || []).map((p) => [p.id, p.name]));
    const clientName = Object.fromEntries((data.clients || []).map((c) => [c.id, c.name]));
    const acceptedByClient = {};
    (data.offers || []).forEach((o) => {
      if (o.status === "Accepted") acceptedByClient[o.clientId] = (acceptedByClient[o.clientId] || 0) + (Number(o.price) || 0);
    });
    const sessionsByStudio = {};
    (data.sessions || []).forEach((s) => { (sessionsByStudio[s.studioId] ||= []).push(s); });

    // Expense rollups
    const mo = today.slice(0, 7);
    const yr = today.slice(0, 4);
    const expensesMTD = (data.expenses||[]).filter(e => (e.date||"").startsWith(mo)).reduce((s,e) => s + (+e.amount||0), 0);
    const expensesYTD = (data.expenses||[]).filter(e => (e.date||"").startsWith(yr)).reduce((s,e) => s + (+e.amount||0), 0);
    // Revenue MTD: filter by booking/payment date (bookedAt), matching the Revenue This Month tab.
    // applyStudioSessionSplit + calcNet already deduct studioSplit from net — so when computing
    // operating profit, exclude auto "Studio Split" expenses or the partner cut is counted twice.
    const mtdRows = buildRevenueViewRows(data)
      .filter(r => ((r.bookedAt || r.date) || "").startsWith(mo))
      .map(applyStudioSessionSplit(data));
    const grossRevMTD = mtdRows.reduce((s, r) => s + Math.max(0, Number(r.gross) || 0), 0);
    const netRevMTD   = mtdRows.reduce((s, r) => s + calcNet(r), 0);
    const expensesMTDForOp = (data.expenses || [])
      .filter(e => (e.date || "").startsWith(mo))
      .filter(e => !(isAutoExpenseRecord(e) && (
        String(e.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)
        || String(e.id || "").startsWith(AUTO_CXL_EXP_ID_PREFIX)
        || e.category === "Refunds & Cancellations"
      )))
      .reduce((s, e) => s + (+e.amount || 0), 0);
    const opProfit    = netRevMTD - expensesMTDForOp;
    const opMargin    = netRevMTD > 0 ? Math.round((opProfit / netRevMTD) * 100) : null;

    return { partnerName, clientName, acceptedByClient, sessionsByStudio, expensesMTD, expensesYTD, grossRevMTD, netRevMTD, opProfit, opMargin };
  }, [data, today]);

  // Bounce off role-restricted sections (e.g. User Management) if nav state is stale.
  // Must run before lock/setup early returns — Rules of Hooks.
  useEffect(() => {
    if (locked || needsSetup || passphraseUpgrade) return;
    if (!canAccessSection(section, currentUser)) {
      setSection("today");
      setView(0);
    }
  }, [section, currentUser, locked, needsSetup, passphraseUpgrade]);

  if (needsSetup) return <FirstRunSetup onSetup={handleSetupOwner} error={pinError} />;
  if (passphraseUpgrade) return <PassphraseUpgrade onSubmit={handlePassphraseUpgrade} error={pinError} />;
  if (locked) return <LockScreen onUnlock={handleUnlock} error={pinError} initialising={initialising} users={secUsers} onRecoveryVerify={handleRecoveryVerify} onRecoverySetPin={handleRecoverySetPin} />;

  const update = (db, fn) => setData((d) => ({ ...d, [db]: fn(d[db]) }));
  const can = {
    view:   currentUser?.permissions?.view   ?? false,
    edit:   currentUser?.permissions?.edit   ?? false,
    delete: currentUser?.permissions?.delete ?? false,
    manage: currentUser?.role === "Owner" || !!(currentUser?.permissions?.manage),
  };

  const saveRecord = (db, rec) => {
    const toSave = db === "partners" ? { ...rec, agreements: stripAgreementForStore(rec.agreements) } : rec;
    if (db === "registrations") {
      setData(d => upsertRegistration(d, toSave));
      return;
    }
    setData(d => {
      const rows = d[db] || [];
      const nextRows = rows.some(r => r.id === toSave.id)
        ? rows.map(r => (r.id === toSave.id ? toSave : r))
        : [...rows, toSave];
      return { ...d, [db]: nextRows };
    });
  };
  const deleteRecord = (db, id) => {
    if (db === "clients") {
      setData(d => deleteClientCascade(d, id));
    } else {
      update(db, (rows) => rows.filter((r) => r.id !== id));
    }
    setOpen(null);
  };

  const saveCrmSettings = (next) => {
    setCrmSettings(next);
    try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(next)); } catch {}
    setModuleCrmSettings(next);
    // Also persist inside the encrypted data store so settings are protected at rest
    setData(d => ({ ...d, _settings: next }));
  };

  const startSequence = (client) => {
    const startDate = client.lastSession || today;
    const already = (data.sequences || []).some(s => s.clientId === client.id && s.status === "active");
    if (already) return;
    const newSeq = {
      id: uid("sq"),
      clientId: client.id,
      sessionDate: startDate,
      sessionName: client.lastSession ? `Session ${fmtDate(startDate)}` : "Session",
      status: "active",
      steps: makeSequenceSteps(startDate),
    };
    setData(d => ({ ...d, sequences: [...(d.sequences || []), newSeq] }));
  };

  const sections = [
    { id: "today",    label: "Command Center",     Icon: LayoutGrid,  lane: "core" },
    // B2C — individual clients
    { id: "clients",      label: "Clients",            Icon: Users,       lane: "b2c"  },
    { id: "followups",    label: "Follow-Ups",         Icon: RefreshCw,   lane: "b2c"  },
    { id: "engine",       label: "Follow-up Engine",   Icon: Zap,         lane: "b2c"  },
    { id: "testimonials", label: "Testimonials",       Icon: ArrowUpRight, lane: "b2c" },
    { id: "referrals",    label: "Referrals",          Icon: Users,       lane: "b2c"  },
    // B2B — studio partners
    { id: "partners", label: "Studio Partners",    Icon: Building2,   lane: "b2b"  },
    { id: "outreach", label: "Outreach Hub",       Icon: Send,        lane: "b2b"  },
    // Shared — financial & ops
    { id: "sessions", label: "Sessions",           Icon: CalendarDays,lane: "core" },
    { id: "pandl",    label: "P&L",                Icon: Scale,       lane: "core", groupOnly: true },
    { id: "revenue",  label: "Revenue",            Icon: TrendingUp,  lane: "core", parent: "pandl" },
    { id: "expenses", label: "Expenses",           Icon: BarChart2,   lane: "core", parent: "pandl" },
    { id: "registrations", label: "Calendly Bookings", Icon: CalendarCheck, lane: "core" },
    { id: "stripe",    label: "Stripe",            Icon: Receipt,     lane: "core" },
    { id: "content",   label: "Content Calendar",  Icon: Megaphone,   lane: "core" },
    { id: "offers",   label: "Offers & Sales",     Icon: DollarSign,  lane: "core" },
    { id: "workflows", label: "Workflows",        Icon: Milestone,   lane: "core" },
    { id: "templates", label: "Templates",          Icon: Copy,        lane: "core" },
    { id: "admin",     label: "Admin",              Icon: Shield,      lane: "core" },
    { id: "users",     label: "User Management",    Icon: Users,       lane: "core", parent: "admin" },
  ];

  // Role-filter sidebar items; in-view Owner/edit checks remain defense-in-depth.
  const visibleSections = sections.filter(s => canAccessSection(s.id, currentUser));

  const go = (id, view = 0) => { setSection(id); setView(view); setNavOpen(false); };

  const crmValue = useMemo(() => ({
    data, setData, derived, canEdit: can.edit, currentUser, crmSettings,
    today, setConfirm, saveCrmSettings, secUsers, setSecUsers, masterKeyRaw,
    syncStripe, stripeStatus, refundToken: refundSessionToken,
  }), [data, derived, can.edit, currentUser, crmSettings, today, secUsers, masterKeyRaw, syncStripe, stripeStatus, refundSessionToken]);

  return (
    <CrmProvider value={crmValue}>
    <div style={{ background: C.bg, color: C.ink, fontFamily: FONT.body, minHeight: 600 }}>
      <style>{CSS}</style>

      <div className="sb-shell">
        {/* Sidebar */}
        <aside className={"sb-sidebar" + (navOpen ? " sb-open" : "")}>
          <div style={{ padding: "20px 18px 16px" }}>
            <img src={LOGO} alt="Simply Breathe" style={{ display: "block", width: "84%", maxWidth: 172, margin: "0 auto 14px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
              <BreathMark size={22} />
              <span style={{ fontSize: 11, color: C.ink3, letterSpacing: "0.18em", textTransform: "uppercase" }}>Operating System</span>
            </div>
          </div>
          <nav style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Command center first */}
            {visibleSections.filter(s => s.id === "today").map(s => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                  style={{ background: active ? C.brandSoft : "transparent", color: active ? C.brandDeep : C.ink2, fontWeight: active ? 600 : 500 }}>
                  <s.Icon size={17} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                </button>
              );
            })}

            {/* Sessions — pinned above B2B */}
            {visibleSections.filter(s => s.id === "sessions").map(s => {
              const active = section === s.id;
              const count = (data[s.id] || []).length;
              return (
                <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                  style={{ marginTop: 6, background: active ? C.brandSoft : "transparent", color: active ? C.brandDeep : C.ink2, fontWeight: active ? 600 : 500 }}>
                  <s.Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                  {count > 0 && <span style={{ fontSize: 11, color: active ? C.brand : C.ink3 }}>{count}</span>}
                </button>
              );
            })}

            {/* Lane groups */}
            {[{ key: "b2b", label: "B2B  ·  Studios" }, { key: "b2c", label: "B2C  ·  Clients" }].map(({ key, label }) => {
              const lane = LANE[key];
              const laneSections = visibleSections.filter(s => s.lane === key);
              if (!laneSections.length) return null;
              return (
                <div key={key} style={{ marginTop: 10 }}>
                  {/* Lane divider label */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "5px 6px 4px",
                    marginBottom: 2,
                  }}>
                    <div style={{ height: 1, flex: 1, background: `${lane.color}30` }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
                      textTransform: "uppercase", color: lane.color, opacity: 0.85,
                    }}>{label}</span>
                    <div style={{ height: 1, flex: 1, background: `${lane.color}30` }} />
                  </div>
                  {laneSections.map(s => {
                    const active = section === s.id;
                    const dueCount = s.id === "engine"
                      ? (data.sequences || []).flatMap(seq =>
                          seq.status === "active" ? seq.steps.filter(st => !st.sent && st.dueDate <= today) : []
                        ).length
                      : null;
                    const count = s.id === "engine" ? null : (data[s.id] || []).length;
                    return (
                      <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                        style={{
                          background: active ? lane.soft : "transparent",
                          color: active ? lane.text : C.ink2,
                          fontWeight: active ? 600 : 500,
                          borderLeft: active ? `2px solid ${lane.color}` : "2px solid transparent",
                          paddingLeft: 10,
                        }}>
                        <s.Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: active ? lane.color : "inherit" }} />
                        <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                        {dueCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#C0573F", color: "#fff", borderRadius: 20, padding: "1px 7px" }}>{dueCount}</span>}
                        {count != null && <span style={{ fontSize: 11, color: active ? lane.color : C.ink3 }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Shared / core at bottom */}
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 1, background: C.line, margin: "2px 6px 6px" }} />
              {visibleSections.filter(s => s.lane === "core" && s.id !== "today" && s.id !== "sessions" && !s.parent).map(s => {
                const active = section === s.id;
                const count = (data[s.id] || []).length;
                const children = visibleSections.filter(c => c.parent === s.id);
                const anyChildActive = children.some(c => c.id === section);
                // Groups expand when a child is active; clicking the parent toggles collapse.
                // collapsedGroups tracks manual overrides so the user can hide the sub-items.
                const groupExpanded = children.length > 0 && (active || anyChildActive) && !collapsedGroups.has(s.id);
                const handleParentClick = () => {
                  if (children.length === 0) { go(s.id); return; }
                  if (groupExpanded) {
                    // Collapse — add to collapsed set without navigating
                    setCollapsedGroups(prev => new Set([...prev, s.id]));
                  } else {
                    // Expand — remove from collapsed set
                    setCollapsedGroups(prev => { const n = new Set(prev); n.delete(s.id); return n; });
                    // groupOnly parents (e.g. P&L) have no own content → go to first child.
                    // Parents with own content (e.g. Admin) → navigate to themselves.
                    go(s.groupOnly ? children[0].id : s.id);
                  }
                };
                return (
                  <div key={s.id}>
                    <button onClick={handleParentClick} className="sb-navbtn"
                      style={{ background: (active || anyChildActive) ? C.brandSoft : "transparent", color: (active || anyChildActive) ? C.brandDeep : C.ink2, fontWeight: (active || anyChildActive) ? 600 : 500 }}>
                      <s.Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                      {children.length > 0
                        ? <ChevronRight size={13} style={{ color: C.ink3, transform: groupExpanded ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                        : (count > 0 && <span style={{ fontSize: 11, color: active ? C.brand : C.ink3 }}>{count}</span>)
                      }
                    </button>
                    {children.length > 0 && groupExpanded && children.map(c => {
                      const cActive = section === c.id;
                      return (
                        <button key={c.id} onClick={() => { setCollapsedGroups(prev => { const n = new Set(prev); n.delete(s.id); return n; }); go(c.id); }} className="sb-navbtn"
                          style={{ background: cActive ? C.brandSoft : "transparent", color: cActive ? C.brandDeep : C.ink2, fontWeight: cActive ? 600 : 400, paddingLeft: 30 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cActive ? C.brand : C.ink3, flexShrink: 0, marginRight: 2 }} />
                          <c.Icon size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, textAlign: "left" }}>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </nav>
          <div style={{ marginTop: "auto", padding: 12 }}>
            {/* Calendly sync detail panel */}
            {!locked && showSyncDetail && calendlyStatus?.items?.length > 0 && (
              <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, marginBottom: 8, maxHeight: 280, overflowY: "auto", fontSize: 11 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 6px", borderBottom: `1px solid ${C.line}`, fontWeight: 600, color: C.ink2 }}>
                  <span>Last sync — {calendlyStatus.items.length} event{calendlyStatus.items.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => setShowSyncDetail(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 14, lineHeight: 1, padding: "0 2px" }}>&times;</button>
                </div>
                {calendlyStatus.items.map((item, i) => {
                  const typeColor = item.type === "Booked" ? "#4A8C6F" : item.type === "Updated" ? C.brand : item.type === "Canceled" || item.type === "No-show" ? "#C0392B" : C.ink3;
                  const dtStr = item.scheduledAt ? (() => { try { return new Date(item.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; } })() : "";
                  return (
                    <div key={i} style={{ padding: "6px 10px", borderBottom: i < calendlyStatus.items.length - 1 ? `1px solid ${C.line}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ background: typeColor + "22", color: typeColor, borderRadius: 4, padding: "1px 5px", fontWeight: 600, fontSize: 10, flexShrink: 0 }}>{item.type}</span>
                        <span style={{ color: C.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.clientName || "—"}</span>
                        {item.amount != null && <span style={{ marginLeft: "auto", color: C.ink2, flexShrink: 0 }}>{item.amount === 0 ? "Free" : `$${item.amount.toFixed(2)}`}</span>}
                      </div>
                      {(item.eventName || dtStr) && (
                        <div style={{ color: C.ink3, fontSize: 10 }}>{item.eventName}{item.eventName && dtStr ? " · " : ""}{dtStr}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Calendly sync status indicator */}
            {!locked && (
              <div
                title={
                  calendlyStatus?.syncing
                    ? "Sync in progress…"
                    : calendlyStatus?.synced != null
                      ? lastCalendlyReceived
                        ? `Last received: ${lastCalendlyReceived.atFull}\n${lastCalendlyReceived.count} booking${lastCalendlyReceived.count !== 1 ? "s" : ""} received from Calendly`
                        : "No bookings received yet this session — syncs every 15 minutes"
                      : calendlyStatus?.pending > 0
                        ? `${calendlyStatus.pending} booking${calendlyStatus.pending !== 1 ? "s" : ""} queued — will sync within 15 minutes`
                        : "Syncs automatically every 15 minutes"
                }
                style={{ marginBottom: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.ink3, cursor: "default" }}>
                <RefreshCw size={11} strokeWidth={1.5}
                  style={{ flexShrink: 0, animation: calendlyStatus?.syncing ? "spin 1s linear infinite" : "none", color: calendlyStatus?.pending > 0 ? C.brand : C.ink3 }} />
                <span>
                  {calendlyStatus?.syncing && "Syncing Calendly…"}
                  {calendlyStatus?.synced != null && !calendlyStatus?.syncing && (
                    <>
                      {calendlyStatus.synced > 0
                        ? <button
                            onClick={() => setShowSyncDetail(v => !v)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.brand, fontWeight: 600, fontSize: "inherit" }}>
                            {calendlyStatus.synced} record{calendlyStatus.synced !== 1 ? "s" : ""} synced ↑
                          </button>
                        : "Calendly up to date"
                      }
                      <span style={{ display: "block", fontSize: 10, marginTop: 1 }}>Last sync {calendlyStatus.at}</span>
                    </>
                  )}
                  {calendlyStatus?.pending > 0 && !calendlyStatus?.syncing && (
                    <span style={{ color: C.brand, fontWeight: 600 }}>{calendlyStatus.pending} booking{calendlyStatus.pending !== 1 ? "s" : ""} pending…</span>
                  )}
                  {calendlyStatus?.error && !calendlyStatus?.syncing && (
                    <span style={{ color: "#C0392B", fontWeight: 600, display: "block" }}>{calendlyStatus.error}</span>
                  )}
                  {!calendlyStatus && "Calendly sync active"}
                </span>
              </div>
            )}
          </div>
        </aside>
        {navOpen && <div className="sb-scrim" onClick={() => setNavOpen(false)} />}

        {/* Main — SearchScope owns query so keystrokes skip App/sidebar re-renders */}
        <SearchScope section={section} view={view} setView={setView} onOpen={setOpen} onGo={go}>
          {({ searchInput, content, localGo }) => (
        <main className="sb-main">
          {/* Lane accent stripe */}
          {(() => {
            const cur = sections.find(s => s.id === section);
            const lane = cur?.lane && cur.lane !== "core" ? LANE[cur.lane] : null;
            return lane ? <div style={{ height: 3, background: `linear-gradient(90deg, ${lane.color}, ${lane.color}80)`, flexShrink: 0 }} /> : null;
          })()}
          {/* Backup overdue reminder banner */}
          {!locked && backupOverdue && !backupBannerDismissed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 18px", background: "#FFFBEB", borderBottom: "1px solid #FDE68A", fontSize: 12.5, color: "#92400E", flexShrink: 0 }}>
              <span style={{ fontSize: 15 }}>⚠️</span>
              <span style={{ flex: 1 }}>
                <strong>Backup overdue</strong> — your last data backup was more than {BACKUP_REMINDER_DAYS} days ago. If browser storage is cleared, your data cannot be recovered.
              </span>
              <button
                onClick={() => { setSection("admin"); setView(5); }}
                style={{ background: "#F59E0B", border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, fontSize: 12, padding: "5px 12px", cursor: "pointer", flexShrink: 0 }}>
                Back up now
              </button>
              <button
                onClick={() => setBackupBannerDismissed(true)}
                style={{ background: "none", border: "none", color: "#92400E", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }}
                title="Dismiss">&times;</button>
            </div>
          )}
          {saved === "error" && (
            <div style={{ background: "#FEE2E2", borderBottom: "1px solid #FCA5A5", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#7F1D1D" }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠ Save failed</span>
              <span style={{ flex: 1 }}>Your last change could not be saved. This may be a storage quota issue. Export a backup from <strong>Admin → Storage</strong> immediately, then reload the page.</span>
              <button onClick={() => { go("admin"); setSaved("idle"); }} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Go to Admin</button>
              <button onClick={() => setSaved("idle")} style={{ background: "none", border: "none", color: "#7F1D1D", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }} title="Dismiss">&times;</button>
            </div>
          )}
          {staleDetected && (
            <div style={{ background: "#FEF3C7", borderBottom: "1px solid #FCD34D", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#78350F" }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠ Another window has newer data</span>
              <span style={{ flex: 1 }}>This window's data is out of date — another browser tab or window has saved changes more recently. <strong>Refresh this window</strong> to get the latest data before making edits here, or your changes may overwrite the other window's saves.</span>
              <button onClick={() => window.location.reload()} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Refresh Now</button>
              <button onClick={() => setStaleDetected(false)} style={{ background: "none", border: "none", color: "#78350F", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }} title="Dismiss">&times;</button>
            </div>
          )}
          <header className="sb-header">
            <button className="sb-menu" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
                {sections.find((s) => s.id === section).label}
              </h1>
              {(() => {
                const cur = sections.find(s => s.id === section);
                const lane = cur?.lane && cur.lane !== "core" ? LANE[cur.lane] : null;
                return lane ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                    background: lane.soft, color: lane.text, letterSpacing: "0.06em",
                    textTransform: "uppercase", border: `1px solid ${lane.color}40`,
                  }}>{lane.full}</span>
                ) : null;
              })()}
              {saved === "saving" && (
                <span style={{ fontSize: 11, color: C.ink3, fontStyle: "italic" }}>Saving…</span>
              )}
              {saved === "saved" && (
                <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Saved</span>
              )}
            </div>
            {section !== "today" && (
              <>
                {searchInput}
                {section === "registrations" && (
                  <button
                    type="button"
                    className="sb-ghost"
                    onClick={syncCalendly}
                    disabled={calendlyStatus?.syncing}
                    title={calendlyStatus?.syncing ? "Syncing from Calendly…" : "Refresh list from Calendly"}
                    aria-label="Refresh list from Calendly"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 10px", minWidth: 40 }}
                  >
                    <RefreshCw size={16} strokeWidth={2} style={{ animation: calendlyStatus?.syncing ? "spin 1s linear infinite" : "none" }} />
                  </button>
                )}
                {section === "clients" && (() => {
                  const orphanCount = Object.keys(findOrphanedGroups(data)).length;
                  return orphanCount > 0 ? (
                    <button
                      type="button"
                      className="sb-ghost"
                      onClick={() => setShowOrphans(true)}
                      title="Re-link records from deleted clients"
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", color: "#9B7A2E", border: "1px solid #F5E4A8", background: "#FFFBF0", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                      <Link2 size={14} /> Re-link {orphanCount} orphaned {orphanCount === 1 ? "client" : "clients"}
                    </button>
                  ) : null;
                })()}
                {can.edit && !["users","admin","workflows","stripe"].includes(section) && !(section === "expenses" && view === 0) && (
                  <button className="sb-primary" onClick={() => setOpen({ db: section, record: newRecord(section) })}>
                    <Plus size={16} /> New
                  </button>
                )}
              </>
            )}

            {/* Alerts bell */}
            {(() => {
              const alertList = allAlerts.filter(a => !dismissedAlerts.has(a.id));
              const criticalCount = alertList.filter(a => a.severity === "critical").length;
              const warningCount  = alertList.filter(a => a.severity === "warning").length;
              const totalCount    = alertList.length;
              return (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => { setShowAlerts(p => !p); setShowProfile(false); }}
                    title={totalCount ? `${criticalCount} critical · ${warningCount} warnings` : "No alerts"}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.25)}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BellRing size={16} color={C.brand} strokeWidth={1.8} />
                  </button>
                  {totalCount > 0 && (
                    <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: "#C0573F", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${C.surface}` }}>
                      {totalCount}
                    </span>
                  )}

                  {showAlerts && (
                    <>
                      <div onClick={() => setShowAlerts(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                      <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", width: 420, maxWidth: "92vw", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        {/* Header */}
                        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <BellRing size={15} color={criticalCount > 0 ? "#C0573F" : C.ink3} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.ink, flex: 1 }}>
                            {totalCount ? `${criticalCount > 0 ? `${criticalCount} critical` : ""}${criticalCount > 0 && warningCount > 0 ? " · " : ""}${warningCount > 0 ? `${warningCount} warnings` : ""}` : "All clear"}
                          </span>
                          <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 2 }}><X size={14} /></button>
                        </div>
                        {/* Alert list */}
                        <div style={{ overflowY: "auto", flex: 1 }}>
                          <AlertsPanel data={data} today={today} onOpen={(args) => { setShowAlerts(false); setOpen(args); }} compact dismissed={dismissedAlerts} setDismissed={setDismissedAlerts} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Profile avatar + dropdown */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setShowProfile(p => !p)}
                title={currentUser?.name}
                style={{ width: 36, height: 36, borderRadius: "50%", background: currentUser?.color || C.brand, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                {currentUser?.avatar
                  ? <img src={currentUser.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      {(currentUser?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                }
              </button>

              {showProfile && (
                <>
                  <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50,
                    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 220, padding: 6,
                  }}>
                    {/* User info header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 8px" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: currentUser?.color || C.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                        {currentUser?.avatar
                          ? <img src={currentUser.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                              {(currentUser?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.name || "User"}</div>
                        <div style={{ fontSize: 11, color: C.ink3 }}>{currentUser?.title || currentUser?.role || "Viewer"}</div>
                        {currentUser?.email && <div style={{ fontSize: 11, color: C.ink3 }}>{currentUser.email}</div>}
                        {currentUser?.lastLogin && <div style={{ fontSize: 11, color: C.ink3 }}>Last login: {currentUser.lastLogin}</div>}
                      </div>
                    </div>
                    <div style={{ height: 1, background: C.line, margin: "4px 0" }} />

                    {/* Menu items */}
                    <button onClick={() => { setShowProfile(false); setShowEditProfile(true); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: C.ink, textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.brandMist}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <UserCircle size={14} color={C.ink3} /> Edit Profile
                    </button>

                    {can.manage && (
                      <button onClick={() => { localGo("users"); setShowProfile(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: C.ink, textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = C.brandMist}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <Users size={14} color={C.ink3} /> Manage Users
                      </button>
                    )}

                    <div style={{ height: 1, background: C.line, margin: "4px 0" }} />

                    <button
                      onClick={() => { setShowProfile(false); setConfirm({ message: "Log out of Simply Breathe OS?", okLabel: "Log Out", danger: true, onOk: handleLogout }); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "#B91C1C", textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          <div className="sb-content">
            {content}
          </div>
        </main>
          )}
        </SearchScope>
      </div>

      {open && (
        <DrawerErrorBoundary onClose={() => setOpen(null)}>
          <RecordDrawer
            key={`${open.db}:${open.record?.id}:${open.initialTab || "details"}`}
            db={open.db} record={open.record} data={data} derived={derived} today={today}
            crmSettings={crmSettings} initialTab={open.initialTab}
            actionContact={open.actionContact}
            setData={setData}
            cryptoKey={cryptoKey}
            refundToken={refundSessionToken}
            onSync={async () => { await Promise.all([syncCalendly(), syncStripe()]); }}
            onClose={() => setOpen(null)} onSave={can.edit ? (rec) => { saveRecord(open.db, rec); setOpen(null); } : null}
            onDelete={can.delete ? (id) => setConfirm({
              message: `Delete this record? This action cannot be undone.`,
              okLabel: "Delete", danger: true,
              onOk: () => deleteRecord(open.db, id),
            }) : null} onOpenRelated={(args) => setOpen(args)}
            sequences={data.sequences || []} onStartSequence={can.edit ? startSequence : null}
          />
        </DrawerErrorBoundary>
      )}

      {showOrphans && <OrphanedRecordsModal data={data} setData={setData} onClose={() => setShowOrphans(false)} />}
      {showEditProfile && (
        <EditProfileModal
          user={currentUser}
          masterKeyRaw={masterKeyRaw}
          onSave={handleSaveProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          okLabel={confirm.okLabel || "OK"}
          danger={confirm.danger}
          onOk={async () => { await confirm.onOk(); setConfirm(null); }}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
    </CrmProvider>
  );
}
