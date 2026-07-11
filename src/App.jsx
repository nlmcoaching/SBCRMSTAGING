import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import Papa from "papaparse";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, ComposedChart, Bar, Line, Legend } from "recharts";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, ChevronDown, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
  Zap, Copy, Clock, TrendingUp, BarChart2, AlertCircle, Activity, Send, Info, BellRing, Milestone,
  LogOut, UserCircle, Shield, KeyRound, Receipt, ClipboardList, FileSignature, CalendarCheck, CheckCircle, Save, Scale, Lock,
} from "lucide-react";
import { LOGO } from "./assets/logo.js";
import {
  amountsMatch,
  normalizeEmail,
  registrationSessionAmount,
  registrationCreatedTimestamp,
  registrationBookingTimestamp,
  reconcileStripePayments,
  resetStripeAutoMatches,
  clearRegistrationStripeVerification,
} from "./stripeMatching.js";

import { C, FONT, hexA } from "./lib/theme.js";
import { uid, todayISO, addDaysISO, addMonthsISO, MONTHS, fmtDate, money, pct, onOrBefore, sameMonth, num, bool, norm, cleanName, preferLongerText, clientShort, sectionLabel, fmtStudioType } from "./lib/format.js";
import { CRM_SETTINGS_KEY, DEFAULT_CRM_SETTINGS, parseCrmSettings, loadCrmSettings, _crmSettings, getS, setCrmSettings as setModuleCrmSettings } from "./lib/crmSettings.js";
import * as constants from "./lib/constants.js";
import { SESSION_CHECKLIST, EQUIP_CHECKLIST_PHASES, EQUIP_CHECKLIST, emptyEquipChecklist, VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS, virtualEquipPhaseItems, SESSION_CHECKLIST_PHASES, SESSION_PHASE_COLOR, emptySessionChecklist } from "./lib/checklists.js";
import { STORE_KEY, STORE_KEY_ENC, AGREEMENT_BLOB_PREFIX, apiHeaders, CALENDLY_BACKEND, calendlyApiUrl, fetchWithTimeout, safeResJSON, isTruncatedPreview, resolveCalendlyDescription, sessionCalendlyLookupName, fetchCalendlyDescriptionForSession, applyCalendlyDescriptionToSessions, cancelCalendlyEvent } from "./lib/api.js";
import { setApiSessionToken, clearApiSessionToken } from "./lib/apiSession.js";
import { ensureRegisteredAndMint, ensureUnlockAndMint } from "./lib/apiAuth.js";
import { loadSecMeta, saveSecMeta } from "./lib/secMeta.js";
import { EMAIL_LOG_CAP, slimHistEntry, cappedLog, sendCrmEmail, makeEmailFailEntry } from "./lib/email.js";
import { _idbGet, _idbSet, _idbRemove, store } from "./lib/store.js";
import { Sec } from "./lib/sec.js";
import { CRM_REQUIRED_ARRAY_KEYS, CRM_ARRAY_KEYS, SAMPLE_SEED_REVENUE_IDS, normalizeCrmData, healStudioPartners, healStudioPartnersData } from "./lib/normalizeData.js";
import * as revenue from "./lib/revenue.js";
import { SEED } from "./lib/seed.js";
import { extractTemplateVars, autoFillTemplateVars, applyTemplateVars, resolveRelationshipActionRecipient, suggestEmailTemplatesForAction, outreachScore } from "./lib/templates.js";

import { BreathMark, Stat, Panel, Row, Dot, Tag, MiniChip, DateChip, Empty } from "./components/primitives.jsx";
import { setAppComponents } from "./components/appBridge.jsx";
import { FirstRunSetup, LockScreen, PassphraseUpgrade } from "./features/auth";
import { ReferralTreeView } from "./features/referrals";
import { TestimonialLibraryView } from "./features/testimonials";
import { ContentAnalyticsView } from "./features/content";
import { buildWorkflows, WorkflowsView } from "./features/workflows";
import { TemplateLibraryView, STARTER_CONTENT } from "./features/templates";
import { FollowUpEngine, MessageQueue, SequencesView, FUTemplateEmailModal, TemplatesView, FollowUpSendButton } from "./features/followup";
import { OutreachHubView } from "./features/outreach";
import { RevenueAttributionView, RevenueThisMonthView, OfferConversionView, ExpenseSummaryView, RefundsView } from "./features/revenue";
import { PaymentReconciliationView, ChargeDetails, paymentStatusLabel, registrationSessionMeta } from "./features/stripe";
import { AdminView, CrmSettingsView, JourneyDescriptionsView, EmailLogsView, ResetToProductionView, UserManagementView, EditUserPanel } from "./features/admin";

const { STATUS, STATUS_COLOR, CLIENT_TYPE, CLIENT_TYPE_COLOR, INTENT_TAGS, TAG_COLOR, STAGE, STAGE_COLOR, STUDIO_TYPE, CLOSE_PROB, CLOSE_PROB_COLOR, CONTRACT_STATUS, PARTNER_CHECKLIST_PHASES, PARTNER_CHECKLIST, emptyChecklist, FUTYPE, FUTYPE_COLOR, SOURCE, SOURCE_COLOR, PACKAGE, REFERRAL, REFERRAL_COLOR, OFFER_TYPE, OFFER_STATUS, OFFER_STATUS_COLOR, OFFER_PROB, OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, REF_STATUS, REF_STATUS_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, OUTREACH_TARGET_TYPE, OUTREACH_RESPONSE, OUTREACH_SOURCE, OUTREACH_PRIORITY, OUTREACH_PRIORITY_COLOR, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TESTIMONIAL_TYPE, TESTIMONIAL_THEMES, TMPL_CATEGORY, TMPL_CATEGORY_COLOR, TMPL_CHANNEL, TMPL_CHANNEL_COLOR, TMPL_LINKED_TO, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, EXPENSE_PAYMENT_METHOD, EXPENSE_RECUR_FREQ, REV_CHANNEL, REV_CHANNEL_COLOR, COST_CENTER, CONTENT_TYPE, PLATFORM, PLATFORM_COLOR, CONTENT_STATUS, CONTENT_STATUS_COLOR, CONTENT_CATEGORY, CONTENT_CAT_COLOR, CONTENT_CTA, SESSION_STATUS, SESSION_STATUS_COLOR, JOURNEY_TYPES, SETUP_STATUS, FU_STEPS, FU_TEMPLATES, interpolateTemplate, addDays, makeSequenceSteps, USER_ROLES, USER_ROLE_COLOR, USER_COLORS, ROLE_PERMISSIONS } = constants;
const { _c, readAmt, calcNet, deriveRegistrationPaymentStatus, applyRegistrationPaymentLookup, stripePaymentExists, buildStripePaymentRecord, applyStripePaymentToRegistration, stripePaymentFromRecord, applyPaymentReconciliation, reconcileAmountMismatches, processStripeWebhookEvents, LTV_OFFER_STATUSES, formatRegistrationAmount, resolveSessionListPrice, formatBookingAmount, resolveActualBookingAmount, formatActualBookingAmount, calendlyBookingAmount, backfillRegistrationPaymentsForRegs, registrationPaymentForLtv, sessionBookingRevenue, applySessionRevenueFromRegistrations, studioSessionFinance, sessionFinanceFor, refreshCalendlySessionRevenue, buildSessionMap, registrationRevenueForMonth, registrationRevenueByMonth, buildSessionListPriceMap, registrationRevenueChannel, offerRevenueChannel, buildPaidPaymentsByBooking, bookingStripeCharge, buildRegistrationRevenueRows, buildOfferRevenueRows, AUTO_REV_ID_PREFIX, AUTO_CXL_EXP_ID_PREFIX, AUTO_SPLIT_EXP_ID_PREFIX, isAutoRevenueRecord, isAutoExpenseRecord, buildBookingLedgerRecords, syncBookingLedgers, buildRevenueViewRows, applyStudioSessionSplit, openRevenueViewRow, computeClientLifetimeValue, applyRegistrationLifetimeValues, issueStripeRefund } = revenue;

/* ============================================================
   Simply Breathe OS — CRM
   Calm, breath-themed operating system for a breathwork practice.
   Data is seeded from the six source files and pre-wired:
     Sessions  -> Studio Partners
     Offers    -> Clients
     Follow-Ups-> Clients
   ============================================================ */


/* ---------- CRM Settings (configurable lists) ---------- */



/* ── Expenses ── */

/* ============================================================
   FOLLOW-UP SEQUENCE ENGINE
   ============================================================ */

/* ---------- Seed data (from the six source files, relations wired) ---------- */

/* ---------- Helpers ---------- */






// 96 bits of cryptographic randomness (24 hex chars) — replaces the old 7-char
// Math.random() base-36 (~36 bits) which had a non-trivial birthday-collision
// probability across thousands of CRM records. Collisions silently merged records.

/* ============================================================ */
/* ── FIRST-RUN SETUP SCREEN ── */


/* ============================================================ */
/* ── LOCK SCREEN ── */


const DISMISSED_ALERTS_KEY = "sb:dismissed-alerts:v1";
const LAST_BACKUP_KEY      = "sb:last-backup:v1";
const BACKUP_REMINDER_DAYS = 7;

class DrawerErrorBoundary extends React.Component {
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

export default function App() {
  setAppComponents({ Today, TableView, RecordTableView, ConfirmModal });
  const [data, setData] = useState(SEED);
  const [section, setSection] = useState("today");
  const [view, setView] = useState(0);
  const [open, setOpen] = useState(null);   // record drawer { db, record }
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
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
    try { sessionStorage.setItem("sb:nav:v1", JSON.stringify({ section, view })); } catch {}
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

            // ── Session restore: if a valid sessionStorage session exists, skip PIN ──
            try {
              const sessionRaw = sessionStorage.getItem("sb:session:v1");
              if (sessionRaw && alive) {
                const session = JSON.parse(sessionRaw);
                const restoredUser = activeUsers.find(u => u.id === session.userId);
                // Validate the restore token against THIS user's stored hash. The token is
                // bound per-user via a one-way hash, so a lower-privilege user cannot mint a
                // token that validates for a different (e.g. Owner) userId.
                const tokenValid = (session.token && restoredUser?.sessionTokenHash)
                  ? (await Sec.sessionTokenHash(session.token)) === restoredUser.sessionTokenHash
                  : false; // reject legacy/unsigned tokens — forces one PIN entry after upgrade
                // masterKeyRaw is no longer persisted to sessionStorage (key-in-memory-only policy).
                // A valid token confirms identity but the PIN must be re-entered to re-derive the
                // master key — sessionStorage holds only userId + token for user-tile pre-selection.
                sessionStorage.removeItem("sb:session:v1");
              }
            } catch (_) {
              sessionStorage.removeItem("sb:session:v1");
            }
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
        setSection("today"); setView(0);
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
      setSection("today"); setView(0);
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
      setSection("today"); setView(0);
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
      setSection("today"); setView(0);
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
      setSection("today"); setView(0);
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
    try { sessionStorage.removeItem("sb:session:v1"); sessionStorage.removeItem("sb:nav:v1"); } catch (_) {}
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

      // Match a studio partner by name only (strips "" prefix).
      // City-level matching removed — too prone to false positives across studios in the same city.
      const resolvePartner = (partnersList, ...textFields) => {
        const haystack = textFields.join(" ").toLowerCase();
        return partnersList.find(p => {
          if (!p.name) return false;
          const pName = p.name.replace(/^sample\s*-\s*/i, "").toLowerCase();
          return pName.length > 2 && haystack.includes(pName);
        });
      };

      // Extract studio name + location from a Calendly event name.
      // Handles "Studio Name - Location" and "Studio Name · Journey" formats.
      const extractStudio = (eventName, locationAddress) => {
        if (!eventName) return null;
        const dashIdx = eventName.indexOf(" - ");
        if (dashIdx > 0) return { name: eventName.slice(0, dashIdx).trim(), location: eventName.slice(dashIdx + 3).trim() || locationAddress || "" };
        const dotIdx = eventName.indexOf(" · ");
        if (dotIdx > 0) return { name: eventName.slice(0, dotIdx).trim(), location: locationAddress || "" };
        return null;
      };

      let processed = 0;
      const ids = [];
      const syncedItems = []; // summary rows shown in the sync detail modal
      const sessionsNeedingDesc = [];
      const paymentLookupUris = [];
      let postSyncRegistrations = [];
      // Apply against latest React state inside the updater — never from a closed-over
      // `data` snapshot. A poll interval that only depends on [locked] would otherwise
      // keep the unlock-time sync fn and silently revert every post-unlock edit.
      // Accumulators are reset each updater run so Strict Mode double-invoke stays safe.
      setData(prev => {
        processed = 0;
        ids.length = 0;
        syncedItems.length = 0;
        sessionsNeedingDesc.length = 0;
        paymentLookupUris.length = 0;
        let next = { ...prev };
        const clients       = [...(next.clients       || [])];
        const registrations = [...(next.registrations || [])];
        const sessions      = [...(next.sessions      || [])];
        const followups     = [...(next.followups     || [])];
        const partners      = [...(next.partners      || [])];

        const addDays = (d, n) => addDaysISO(d, n);

        // Always retroactively fix Calendly-synced sessions missing a studioId or with wrong capacity
        sessions.forEach((s, i) => {
          if (!s.calendlyEventUri) return;
          let updated = { ...s };
          let changed = false;

          // Fix missing studioId
          if (!s.studioId) {
            const linkedReg = registrations.find(r => r.sessionId === s.id);
            const match = resolvePartner(partners, s.name, s.notes || "", linkedReg?.locationAddress || "");
            if (match) { updated.studioId = match.id; changed = true; }
          }

          // Backfill Calendly event URI from a linked registration (needed for description fetch)
          if (!updated.calendlyEventUri) {
            const linkedReg = registrations.find(r => r.sessionId === s.id && r.calendlyEventUri);
            if (linkedReg?.calendlyEventUri) {
              updated.calendlyEventUri = linkedReg.calendlyEventUri;
              changed = true;
            }
          }

          // Fix capacity: all virtual Calendly 1:1 sessions should have capacity 1
          const isVirtualSession = !updated.studioId && (updated.locationType === "zoom" || updated.locationType === "custom" || !updated.locationType);
          if (isVirtualSession && s.capacity !== 1) { updated.capacity = 1; changed = true; }

          // Fix studio session names that have a duplicated studio prefix:
          // e.g. "YogoKula - YogoKula - Berkeley, CA" → "YogoKula - Berkeley, CA"
          if (updated.studioId) {
            const partnerObj = partners.find(p => p.id === updated.studioId);
            if (partnerObj) {
              const pName = cleanName(partnerObj.name || "");
              const sName = cleanName(updated.name || "");
              // Detect double-prefix: "StudioName - StudioName - ..."
              const doublePrefix = new RegExp(`^(${pName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*)\\1`, "i");
              if (doublePrefix.test(sName)) {
                updated.name = sName.replace(doublePrefix, "$1").trim();
                changed = true;
              }
            }
          }

          if (changed) sessions[i] = updated;
          if (updated.calendlyEventUri && isTruncatedPreview(updated.calendlyDescription)) {
            sessionsNeedingDesc.push({ ...updated });
          }
        });

        // Recreate any studio partners that are referenced by a session but missing from the
        // partners table (restores links lost to a wipe/delete), then re-link those sessions.
        const healed = healStudioPartners(sessions, partners);
        if (healed.changed) {
          sessions.splice(0, sessions.length, ...healed.sessions);
          partners.splice(0, partners.length, ...healed.partners);
        }

        if (!events.length) {
          const refreshedSessions = refreshCalendlySessionRevenue(sessions, registrations);
          const ltvData = { registrations, revenue: next.revenue || [], offers: next.offers || [] };
          return { ...next, clients: applyRegistrationLifetimeValues(clients, ltvData), sessions: refreshedSessions, partners };
        }

        events.forEach(rawEvt => {
          // Sanitize all string fields from external webhook data before use
          const san = (v) => Sec.sanitize(v);
          const evt = {
            ...rawEvt,
            name:            san(rawEvt.name),
            email:           san(rawEvt.email),
            phone:           san(rawEvt.phone),
            eventName:       san(rawEvt.eventName),
            description:     san(rawEvt.description),
            locationAddress: san(rawEvt.locationAddress),
            howHeard:        san(rawEvt.howHeard),
            referredBy:      san(rawEvt.referredBy),
            concerns:        san(rawEvt.concerns),
            cancelReason:    san(rawEvt.cancelReason),
            // locationJoinUrl validated separately by https:// check before use
          };

          // Invitee/client name: registration form only. Never fall back to event title,
          // description, or other calendar-sync fields (those stay on evt.eventName).
          const inviteeFormName = (() => {
            const n = String(evt.name || "").trim();
            if (!n) return "";
            const eventTitle = String(evt.eventName || "").trim();
            const eventDesc = String(evt.description || "").trim();
            if (eventTitle && n.toLowerCase() === eventTitle.toLowerCase()) return "";
            if (eventDesc && n.toLowerCase() === eventDesc.toLowerCase()) return "";
            return n;
          })();

          // Ignore synthetic signature-test payloads (…/scheduled_events/TEST/…).
          const _uri = String(evt.calendlyInviteeUri || evt.calendlyEventUri || "");
          if (/\/scheduled_events\/TEST\b/i.test(_uri) || /\/invitees\/TEST\b/i.test(_uri)) {
            ids.push(evt.id);
            return;
          }

          // ── Sync-from-date filter ──
          // Ignore events whose Calendly creation date is before the configured cutoff.
          // Uses the booking creation timestamp (when the client booked), NOT the session date.
          // Old events are acknowledged so they never re-queue.
          const _syncFrom = crmSettings?.calendlySyncFromDate || "";
          if (_syncFrom) {
            const _evtTs = evt.createdAt || evt.receivedAt || "";
            if (_evtTs && _evtTs < _syncFrom) {
              ids.push(evt.id);
              return; // skip without processing
            }
          }

          if (evt.eventType === "invitee.created") {
            // ── RULE: CRM cancellations/reschedules always win over a re-delivered booking ──
            // If this invitee already exists in the CRM with a status of "canceled" or
            // "rescheduled" (whether set by a Calendly cancellation OR a manual status change),
            // ignore the booking event entirely: do not recreate the client/session, do not
            // rebuild the registration, do not flip it back to "booked". This prevents the
            // automated sync from resurrecting or overwriting manual status changes.
            const crmCanceledReg = registrations.find(r =>
              r.calendlyInviteeUri && r.calendlyInviteeUri === evt.calendlyInviteeUri
              && (r.status === "canceled" || r.status === "rescheduled"));
            if (crmCanceledReg) return;

            // 1. Create or update client by email
            const emailNorm = (evt.email || "").toLowerCase();
            let client = clients.find(c => (c.email || "").toLowerCase() === emailNorm);
            const _startDt = evt.startTime ? new Date(evt.startTime) : null;
            const sessionDate = _startDt
              ? `${_startDt.getFullYear()}-${String(_startDt.getMonth() + 1).padStart(2, "0")}-${String(_startDt.getDate()).padStart(2, "0")}`
              : "";
            const sessionTime = _startDt ? _startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
            const durationMins = (evt.startTime && evt.endTime)
              ? Math.round((new Date(evt.endTime) - new Date(evt.startTime)) / 60000)
              : 0;

            if (!client) {
              client = {
                id: uid("c"), name: inviteeFormName, email: emailNorm,
                phone: evt.phone || "", source: "Calendly", status: "Booked",
                clientType: "First-time attendee", tags: [],
                firstSession: sessionDate, sessionsAttended: 0,
                lastSession: "", nextSession: sessionDate,
                packageType: "None", lifetimeValue: 0,
                notes: evt.doneBreathworkBefore ? `Done breathwork before: ${evt.doneBreathworkBefore}` : "",
                referral: evt.referredBy ? "High" : "Low",
              };
              clients.push(client);
            } else {
              const idx = clients.indexOf(client);
              clients[idx] = {
                ...client,
                name: inviteeFormName || client.name,
                phone: evt.phone || client.phone,
                status: client.status === "Lead" ? "Booked" : client.status,
                nextSession: sessionDate || client.nextSession,
              };
              client = clients[idx];
            }

            // 2. Upsert session record (one per unique Calendly event URI)
            // If this invitee's booking is already canceled/rescheduled in the CRM, do NOT
            // (re)create its session — a re-delivered booking event must not resurrect a
            // virtual session that was deleted on cancellation.
            const priorReg = registrations.find(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            const priorCanceled = priorReg && (priorReg.status === "canceled" || priorReg.status === "rescheduled");
            let sessionId = priorCanceled ? (priorReg.sessionId || "") : "";
            if (evt.calendlyEventUri && !priorCanceled) {
              const isPhysical = evt.locationType === "physical" || (!evt.locationType && evt.locationAddress && evt.locationType !== "zoom");
              let matchedPartner = resolvePartner(partners, evt.eventName || "", evt.locationAddress || "");

              // No match — if the event looks like a studio event, auto-create the partner
              if (!matchedPartner && isPhysical) {
                const extracted = extractStudio(evt.eventName || "", evt.locationAddress || "");
                if (extracted?.name) {
                  // Only create if no partner already has this name
                  const alreadyExists = partners.find(p => p.name.replace(/^sample\s*-\s*/i, "").toLowerCase() === extracted.name.toLowerCase());
                  if (!alreadyExists) {
                    const newPartner = {
                      id: uid("sp"),
                      name: extracted.name,
                      location: extracted.location,
                      studioType: "Yoga",
                      contact: "", role: "", email: "", phone: "",
                      stage: "Recurring partner",
                      estimatedCommunitySize: 0, bestFitJourney: "", revenuePotential: 0,
                      closeProbability: "Closed Won", revShare: "", studioSharePct: 0,
                      contractStatus: "None", outreachDate: "", lastTouch: sessionDate,
                      nextAction: "", avgAttendance: 0, sessionsPerMonth: 0,
                      insuranceReqs: "", promotionCommitments: "",
                      notes: `Auto-created from Calendly booking on ${sessionDate}`,
                      checklist: emptyChecklist(),
                    };
                    partners.push(newPartner);
                    matchedPartner = newPartner;
                  } else {
                    matchedPartner = alreadyExists;
                  }
                }
              }

              const resolvedStudioId = matchedPartner?.id || "";

              const existingSessionIdx = sessions.findIndex(s => s.calendlyEventUri === evt.calendlyEventUri);
              if (existingSessionIdx >= 0) {
                // Count other active regs for this event, then +1 for this invitee (avoid double-counting on redelivery).
                const regsForEvent = registrations.filter(r =>
                  r.calendlyEventUri === evt.calendlyEventUri
                  && r.status !== "canceled" && r.status !== "rescheduled"
                  && r.calendlyInviteeUri !== evt.calendlyInviteeUri
                ).length + 1;
                const existingSession = sessions[existingSessionIdx];
                const zoomUrl = evt.locationJoinUrl || existingSession.locationJoinUrl || "";
                sessions[existingSessionIdx] = {
                  ...existingSession,
                  registered: regsForEvent,
                  studioId: existingSession.studioId || resolvedStudioId,
                  locationJoinUrl: zoomUrl || existingSession.locationJoinUrl,
                  durationMins: existingSession.durationMins || durationMins || 0,
                  calendlyDescription: resolveCalendlyDescription(existingSession.calendlyDescription, evt.description),
                  calendlyEventTypeUri: existingSession.calendlyEventTypeUri || evt.calendlyEventTypeUri || "",
                  locationAddress: existingSession.locationAddress || evt.locationAddress || "",
                };
                sessionId = sessions[existingSessionIdx].id;
              } else {
                // Detect if virtual vs studio based on location type
                const isVirtual = !resolvedStudioId && !isPhysical;
                // For studio sessions, store "Studio Name - Location" as the canonical name.
                // extractStudio already parsed the Calendly event name into { name, location },
                // so we reconstruct a clean "StudioName - Location" without duplication.
                const extracted2 = resolvedStudioId && matchedPartner
                  ? extractStudio(evt.eventName || "", evt.locationAddress || "")
                  : null;
                const cleanSessionName = extracted2
                  ? `${cleanName(matchedPartner.name)} - ${extracted2.location || evt.locationAddress || evt.eventName}`
                  : (evt.eventName || "Calendly Session");
                const newSession = {
                  id: uid("se"),
                  name: cleanSessionName,
                  studioId: resolvedStudioId,
                  date: sessionDate,
                  time: sessionTime,
                  status: "Planned",
                  journey: evt.eventName || "Breathwork Basics",
                  capacity: isVirtual ? 1 : 20,
                  registered: 1,
                  attendance: 0, paidAttendees: 0, waivers: 0, noShows: 0,
                  revenue: 0, studioSplit: 0, netRevenue: 0,
                  conversion: 0, packagesSold: 0, referralsGenerated: 0,
                  equipmentNeeded: isVirtual ? "Headset, Zoom setup" : "Headset, portable speaker",
                  roomSetupStatus: "Not started", musicSetupStatus: "Not started",
                  testimonialsCapt: 0, followUpSent: false, rebookOfferSent: false,
                  referralsRequested: false, breakthroughNoted: false,
                  notes: "",
                  durationMins: durationMins || 0,
                  calendlyDescription: resolveCalendlyDescription("", evt.description),
                  calendlyEventTypeUri: evt.calendlyEventTypeUri || "",
                  calendlyEventUri: evt.calendlyEventUri,
                  locationType: evt.locationType,
                  locationJoinUrl: evt.locationJoinUrl,
                  locationAddress: evt.locationAddress || "",
                  checklist: emptySessionChecklist(),
                  equipChecklist: emptyEquipChecklist(),
                };
                sessions.push(newSession);
                sessionId = newSession.id;
              }
            }

            // 3. Upsert registration record (one per unique invitee URI)
            const existingRegIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            const prevReg = existingRegIdx >= 0 ? registrations[existingRegIdx] : null;
            const paymentAmount = evt.paymentAmount != null ? evt.paymentAmount : (prevReg?.paymentAmount ?? null);
            const paidAmount = evt.paidAmount != null ? evt.paidAmount : (prevReg?.paidAmount ?? null);
            let paymentStatus = prevReg?.paymentStatus || "unknown";
            if (prevReg?.stripeVerified && prevReg?.paymentId) {
              paymentStatus = prevReg.paymentStatus;
            } else if (paymentAmount != null && Number(paymentAmount) > 0) {
              paymentStatus = prevReg?.paymentStatus || "unknown";
            } else if (paymentAmount === 0) {
              paymentStatus = "paid";
            } else if (evt.paidAmount != null || evt.paymentSuccessful != null) {
              paymentStatus = deriveRegistrationPaymentStatus(
                evt.paidAmount != null ? evt.paidAmount : evt.paymentAmount,
                evt.paymentSuccessful,
              );
            }
            // Never let a (re-delivered) booking event resurrect a canceled/rescheduled
            // registration back to "booked" — this was silently undoing cancellations.
            // Also keep manual attendance statuses (attended / no_show) across redelivery.
            const preserveCancel = prevReg && (prevReg.status === "canceled" || prevReg.status === "rescheduled");
            const preserveAttendanceStatus = prevReg && (prevReg.status === "attended" || prevReg.status === "no_show");
            const regRecord = {
              id: existingRegIdx >= 0 ? registrations[existingRegIdx].id : uid("reg"),
              clientId: client.id, sessionId,
              calendlyInviteeUri: evt.calendlyInviteeUri,
              calendlyEventUri:   evt.calendlyEventUri,
              calendlyEventTypeUri: evt.calendlyEventTypeUri || prevReg?.calendlyEventTypeUri || "",
              eventName:          evt.eventName,
              status:             preserveCancel || preserveAttendanceStatus ? prevReg.status : "booked",
              paymentAmount,
              paidAmount,
              paymentStatus,
              stripeVerified: prevReg?.stripeVerified || false,
              stripePaymentIntentId: prevReg?.stripePaymentIntentId || "",
              stripeChargeId: prevReg?.stripeChargeId || "",
              paymentId: prevReg?.paymentId || "",
              paidAt: prevReg?.paidAt || "",
              amountRefunded: prevReg?.amountRefunded || 0,
              waiverStatus:       "signed", // client accepts waiver during Calendly booking
              createdAt:          existingRegIdx >= 0
                ? (registrations[existingRegIdx].createdAt || evt.createdAt || evt.receivedAt || new Date().toISOString())
                : (evt.createdAt || evt.receivedAt || new Date().toISOString()),
              calendlyReceivedAt: evt.receivedAt || prevReg?.calendlyReceivedAt || "",
              scheduledAt:        evt.startTime,
              timezone:           evt.timezone,
              locationType:       evt.locationType,
              locationJoinUrl:    evt.locationJoinUrl,
              locationAddress:    evt.locationAddress,
              attendanceType:     evt.attendanceType,
              checkedIn: prevReg?.checkedIn || false,
              attended:  prevReg?.attended  || false,
              noShow:    prevReg?.noShow    || false,
              doneBreathworkBefore: evt.doneBreathworkBefore,
              howHeard:           evt.howHeard,
              referredBy:         evt.referredBy,
              concerns:           evt.concerns,
              reviewedContraindications: evt.reviewedContraindications,
              rescheduledFromInviteeUri: evt.oldInviteeUri || prevReg?.rescheduledFromInviteeUri || "",
              notes: prevReg?.notes || "",
            };
            // Carry over cancellation metadata so a re-delivered booking doesn't wipe it.
            if (preserveCancel) {
              regRecord.canceledAt   = prevReg.canceledAt   || "";
              regRecord.cancelReason = prevReg.cancelReason || "";
              regRecord.cancelerType = prevReg.cancelerType || "";
              regRecord.rescheduledToInviteeUri = prevReg.rescheduledToInviteeUri || "";
            }
            if (existingRegIdx >= 0) registrations[existingRegIdx] = regRecord;
            else registrations.push(regRecord);

            if ((paymentAmount == null || paymentAmount === "") && evt.calendlyInviteeUri) {
              paymentLookupUris.push(evt.calendlyInviteeUri);
            }

            // 4. Create follow-up tasks (only for brand-new registrations)
            // addDays/addDaysISO expect a YYYY-MM-DD string (sessionDate), not a Date object.
            if (existingRegIdx < 0 && sessionDate) {
              [
                { label: "Send same-day session confirmation/check-in", days: 0 },
                { label: "Send 24-hour post-session follow-up",         days: 1 },
                { label: "Send 72-hour rebooking or package offer",     days: 3 },
              ].forEach(({ label, days }) => {
                if (!followups.some(f => f.clientId === client.id && f.name === label)) {
                  followups.push({ id: uid("f"), name: label, clientId: client.id, stage: client.status, lastContact: todayISO(), futype: "24h", nextAction: addDays(sessionDate, days), outcome: "" });
                }
              });
            }
            syncedItems.push({
              type: evt.eventType === "invitee.updated" ? "Updated" : "Booked",
              clientName: client.name || [client.firstName, client.lastName].filter(Boolean).join(" ") || inviteeFormName || "Unknown",
              eventName: evt.eventName || "",
              scheduledAt: evt.startTime || "",
              amount: paymentAmount != null ? Number(paymentAmount) : null,
              isNew: existingRegIdx < 0,
            });
            processed++;
            ids.push(evt.id);

          } else if (evt.eventType === "invitee.canceled") {
            const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            const cancelStatus = evt.rescheduled ? "rescheduled" : "canceled";
            const cancelFields = {
              status:       cancelStatus,
              canceledAt:   evt.canceledAt || evt.receivedAt || new Date().toISOString(),
              cancelReason: evt.cancelReason || "",
              cancelerType: evt.cancelerType || "",
              rescheduledToInviteeUri: evt.newInviteeUri || "",
            };
            if (regIdx >= 0) {
              registrations[regIdx] = { ...registrations[regIdx], ...cancelFields };
              const reg = registrations[regIdx];
              const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
              if (sessIdx >= 0) {
                const sess = sessions[sessIdx];
                const isVirtual = !sess.studioId;
                // Active registrations still attached to this session after this cancellation.
                const remainingActive = registrations.filter(
                  x => x.sessionId === sess.id && x.status !== "canceled" && x.status !== "rescheduled"
                ).length;
                if (isVirtual && remainingActive === 0) {
                  // Virtual sessions are 1:1 — once canceled/rescheduled, remove them from the
                  // session calendar and session list (the canceled registration still shows on
                  // the Cancellations and Reschedules tab).
                  sessions.splice(sessIdx, 1);
                } else if (sess.registered > 0) {
                  // Studio (group) sessions: just decrement the registered count.
                  sessions[sessIdx] = { ...sess, registered: sess.registered - 1 };
                }
              }
            } else {
              // No prior booking in CRM — create a registration so it appears in Cancellations tab
              const emailNorm = (evt.email || "").toLowerCase();
              let cancelClient = emailNorm ? clients.find(c => (c.email || "").toLowerCase() === emailNorm) : null;
              if (!cancelClient && emailNorm) {
                cancelClient = {
                  id: uid("c"), name: inviteeFormName || evt.email, email: emailNorm,
                  phone: evt.phone || "", source: "Calendly", status: "Lead",
                  clientType: "First-time attendee", tags: [], firstSession: "",
                  sessionsAttended: 0, lastSession: "", nextSession: "",
                  packageType: "None", lifetimeValue: 0, notes: "", referral: "Low",
                };
                clients.push(cancelClient);
              }
              const existingSession = evt.calendlyEventUri
                ? sessions.find(s => s.calendlyEventUri === evt.calendlyEventUri)
                : null;
              const newReg = {
                id: uid("reg"),
                clientId: cancelClient?.id || "",
                sessionId: existingSession?.id || "",
                calendlyInviteeUri: evt.calendlyInviteeUri || "",
                calendlyEventUri:   evt.calendlyEventUri   || "",
                calendlyEventTypeUri: evt.calendlyEventTypeUri || "",
                eventName:   evt.eventName   || "",
                scheduledAt: evt.startTime   || "",
                timezone:    evt.timezone    || "",
                locationType: evt.locationType || "",
                locationAddress: evt.locationAddress || "",
                attendanceType: evt.attendanceType || "",
                howHeard:   evt.howHeard    || "",
                referredBy: evt.referredBy  || "",
                concerns:   evt.concerns    || "",
                paymentAmount: evt.paymentAmount ?? null,
                paidAmount:    evt.paidAmount    ?? null,
                paymentStatus: "canceled",
                stripeVerified: false, waiverStatus: "signed",
                createdAt: evt.createdAt || evt.receivedAt || new Date().toISOString(),
                notes: "Registration created from cancellation event",
                ...cancelFields,
              };
              registrations.push(newReg);
            }
            syncedItems.push({
              type: cancelStatus === "rescheduled" ? "Rescheduled" : "Canceled",
              clientName: inviteeFormName || "",
              eventName: evt.eventName || "",
              scheduledAt: evt.startTime || "",
              amount: null,
              isNew: regIdx < 0,
            });
            processed++;
            ids.push(evt.id);

          } else if (evt.eventType === "invitee_no_show.created") {
            const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            if (regIdx >= 0) {
              registrations[regIdx] = { ...registrations[regIdx], noShow: true, status: "no_show" };
              const reg = registrations[regIdx];
              const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
              if (sessIdx >= 0) sessions[sessIdx] = { ...sessions[sessIdx], noShows: (sessions[sessIdx].noShows || 0) + 1 };
            }
            syncedItems.push({ type: "No-show", clientName: inviteeFormName || "", eventName: evt.eventName || "", scheduledAt: evt.startTime || "", amount: null, isNew: false });
            processed++;
            ids.push(evt.id);

          } else if (evt.eventType === "invitee_no_show.deleted") {
            const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            if (regIdx >= 0) {
              registrations[regIdx] = { ...registrations[regIdx], noShow: false, status: "booked" };
              const reg = registrations[regIdx];
              const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
              if (sessIdx >= 0 && sessions[sessIdx].noShows > 0) {
                sessions[sessIdx] = { ...sessions[sessIdx], noShows: sessions[sessIdx].noShows - 1 };
              }
            }
            syncedItems.push({ type: "No-show cleared", clientName: inviteeFormName || "", eventName: evt.eventName || "", scheduledAt: evt.startTime || "", amount: null, isNew: false });
            processed++;
            ids.push(evt.id);
          }
        });

        const refreshedSessions = refreshCalendlySessionRevenue(sessions, registrations);
        const ltvData = { registrations, revenue: next.revenue || [], offers: next.offers || [] };
        postSyncRegistrations = registrations;
        return { ...next, clients: applyRegistrationLifetimeValues(clients, ltvData), registrations, sessions: refreshedSessions, followups, partners };
      });

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
      setData(prev => {
        const reconciled = applyPaymentReconciliation(prev);
        const next = {
          ...prev,
          payments: reconciled.payments ?? prev.payments,
          registrations: reconciled.registrations ?? prev.registrations,
          sessions: reconciled.sessions ?? prev.sessions,
          clients: reconciled.clients ?? prev.clients,
        };
        const amountFix = reconcileAmountMismatches(next);
        return { ...next, registrations: amountFix.registrations, sessions: amountFix.sessions, clients: amountFix.clients };
      });

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
            setData(prev => {
              const registrations = (prev.registrations || []).map(r => {
                const pay = payload.payments?.[r.calendlyInviteeUri]
                  || (r.eventName ? payload.eventPrices?.[r.eventName] : null);
                return pay ? applyRegistrationPaymentLookup(r, pay) : r;
              });
              const ltvData = { registrations, revenue: prev.revenue || [], offers: prev.offers || [] };
              return {
                ...prev,
                registrations,
                sessions: refreshCalendlySessionRevenue(prev.sessions || [], registrations),
                clients: applyRegistrationLifetimeValues(prev.clients || [], ltvData),
              };
            });
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
      const seen = new Set();
      const events = [...(pendingEvents || []), ...(ledgerJson.events || [])].filter(e => {
        const key = e.stripeEventId || e.id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      let processed = 0;
      let ackIds = [];
      // Apply against latest React state inside the updater — same stale-closure
      // guard as Calendly sync (poll interval must not overwrite post-unlock edits).
      setData(prev => {
        let next = prev;
        if (events?.length) {
          const result = processStripeWebhookEvents(prev, events);
          processed = pendingEvents?.length || 0;
          ackIds = result.ackIds.filter(id => (pendingEvents || []).some(e => e.id === id));
          next = {
            ...prev,
            payments: result.payments,
            registrations: result.registrations,
            sessions: result.sessions,
            clients: result.clients,
          };
        }
        // Always re-run reconciliation so unmatched/needs_review payments retry matching
        // and recently verified / pending panels reflect the latest Stripe state.
        const reconciled = applyPaymentReconciliation(next);
        next = {
          ...next,
          payments: reconciled.payments ?? next.payments,
          registrations: reconciled.registrations ?? next.registrations,
          sessions: reconciled.sessions ?? next.sessions,
          clients: reconciled.clients ?? next.clients,
        };
        const amountFix = reconcileAmountMismatches(next);
        return {
          ...next,
          registrations: amountFix.registrations,
          sessions: amountFix.sessions,
          clients: amountFix.clients,
        };
      });
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
      // failure (including an unexpected throw from alert() in some environments)
      // can never permanently block all future saves.
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
            try {
              if (typeof window !== "undefined" && !window.__sbcrmPersistAlerted) {
                window.__sbcrmPersistAlerted = true;
                alert("Warning: your changes could NOT be saved to storage.\n\n" + (e && e.name === "QuotaExceededError"
                  ? "Browser storage is full (QuotaExceededError). Use Admin → Storage to export a backup."
                  : ("Reason: " + (e && e.message ? e.message : e))) + "\n\nThe red banner in the header will show until saving is restored. Use Admin → Storage to export a backup now.");
              }
            } catch { /* alert() can throw in some environments — suppress */ }
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
    const grossRevMTD = mtdRows.reduce((s, r) => s + (r.gross || 0), 0);
    const netRevMTD   = mtdRows.reduce((s, r) => s + calcNet(r), 0);
    const expensesMTDForOp = (data.expenses || [])
      .filter(e => (e.date || "").startsWith(mo))
      .filter(e => !(isAutoExpenseRecord(e) && String(e.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)))
      .reduce((s, e) => s + (+e.amount || 0), 0);
    const opProfit    = netRevMTD - expensesMTDForOp;
    const opMargin    = netRevMTD > 0 ? Math.round((opProfit / netRevMTD) * 100) : null;

    return { partnerName, clientName, acceptedByClient, sessionsByStudio, expensesMTD, expensesYTD, grossRevMTD, netRevMTD, opProfit, opMargin };
  }, [data, today]);

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
    setData(d => {
      const rows = d[db] || [];
      const nextRows = rows.some(r => r.id === toSave.id)
        ? rows.map(r => (r.id === toSave.id ? toSave : r))
        : [...rows, toSave];
      const next = { ...d, [db]: nextRows };
      if (db === "registrations" && toSave.clientId) {
        next.clients = applyRegistrationLifetimeValues(d.clients || [], {
          registrations: nextRows,
          revenue: d.revenue || [],
          offers: d.offers || [],
        });
        if (toSave.sessionId) {
          // refreshCalendlySessionRevenue now skips studio sessions to protect hand-entered
          // financial fields (pricePerSeat, paidAttendees, attendance). Update their registered
          // count separately so the session card stays accurate after a booking is saved.
          const refreshed = refreshCalendlySessionRevenue(d.sessions || [], nextRows);
          next.sessions = refreshed.map(s => {
            if (s.studioId && s.id === toSave.sessionId) {
              const regCount = nextRows.filter(r => r.sessionId === s.id && r.status !== "canceled").length;
              return { ...s, registered: regCount };
            }
            return s;
          });
        }
      }
      return next;
    });
  };
  const deleteRecord = (db, id) => { update(db, (rows) => rows.filter((r) => r.id !== id)); setOpen(null); };

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

  const go = (id, view = 0) => { setSection(id); setView(view); setQuery(""); setNavOpen(false); };

  return (
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
            {sections.filter(s => s.id === "today").map(s => {
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
            {sections.filter(s => s.id === "sessions").map(s => {
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
              const laneSections = sections.filter(s => s.lane === key);
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
              {sections.filter(s => s.lane === "core" && s.id !== "today" && s.id !== "sessions" && !s.parent).map(s => {
                const active = section === s.id;
                const count = (data[s.id] || []).length;
                const children = sections.filter(c => c.parent === s.id);
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
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 8, maxHeight: 280, overflowY: "auto", fontSize: 11 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 6px", borderBottom: `1px solid ${C.border}`, fontWeight: 600, color: C.ink2 }}>
                  <span>Last sync — {calendlyStatus.items.length} event{calendlyStatus.items.length !== 1 ? "s" : ""}</span>
                  <button onClick={() => setShowSyncDetail(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 14, lineHeight: 1, padding: "0 2px" }}>×</button>
                </div>
                {calendlyStatus.items.map((item, i) => {
                  const typeColor = item.type === "Booked" ? C.green : item.type === "Updated" ? C.brand : item.type === "Canceled" || item.type === "No-show" ? C.red : C.ink3;
                  const dtStr = item.scheduledAt ? (() => { try { return new Date(item.scheduledAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return ""; } })() : "";
                  return (
                    <div key={i} style={{ padding: "6px 10px", borderBottom: i < calendlyStatus.items.length - 1 ? `1px solid ${C.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ background: typeColor + "22", color: typeColor, borderRadius: 4, padding: "1px 5px", fontWeight: 600, fontSize: 10, flexShrink: 0 }}>{item.type}</span>
                        <span style={{ color: C.ink1, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.clientName || "—"}</span>
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
                    <span style={{ color: C.red, fontWeight: 600, display: "block" }}>{calendlyStatus.error}</span>
                  )}
                  {!calendlyStatus && "Calendly sync active"}
                </span>
              </div>
            )}
          </div>
        </aside>
        {navOpen && <div className="sb-scrim" onClick={() => setNavOpen(false)} />}

        {/* Main */}
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
                title="Dismiss">×</button>
            </div>
          )}
          {saved === "error" && (
            <div style={{ background: "#FEE2E2", borderBottom: "1px solid #FCA5A5", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#7F1D1D" }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠ Save failed</span>
              <span style={{ flex: 1 }}>Your last change could not be saved. This may be a storage quota issue. Export a backup from <strong>Admin → Storage</strong> immediately, then reload the page.</span>
              <button onClick={() => { go("admin"); setSaved("idle"); }} style={{ background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Go to Admin</button>
              <button onClick={() => setSaved("idle")} style={{ background: "none", border: "none", color: "#7F1D1D", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }} title="Dismiss">×</button>
            </div>
          )}
          {staleDetected && (
            <div style={{ background: "#FEF3C7", borderBottom: "1px solid #FCD34D", padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#78350F" }}>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠ Another window has newer data</span>
              <span style={{ flex: 1 }}>This window's data is out of date — another browser tab or window has saved changes more recently. <strong>Refresh this window</strong> to get the latest data before making edits here, or your changes may overwrite the other window's saves.</span>
              <button onClick={() => window.location.reload()} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>Refresh Now</button>
              <button onClick={() => setStaleDetected(false)} style={{ background: "none", border: "none", color: "#78350F", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 4px", flexShrink: 0 }} title="Dismiss">×</button>
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
                {!(section === "sessions" && view === 0) && (
                  <div className="sb-search">
                    <Search size={15} color={C.ink3} />
                    <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                )}
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
                      <button onClick={() => { go("users"); setShowProfile(false); }}
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
            {section === "today"
              ? <Today data={data} derived={derived} today={today} onOpen={setOpen} onGo={go} setData={setData} currentUser={currentUser} canEdit={can.edit} />
              : section === "engine"
              ? <FollowUpEngine data={data} setData={setData} today={today} onOpen={setOpen} canEdit={can.edit} />
              :               <Section section={section} data={data} derived={derived} today={today}
                  view={view} setView={setView} query={query} onOpen={setOpen}
                  currentUser={currentUser} secUsers={secUsers} masterKeyRaw={masterKeyRaw} setSecUsers={setSecUsers} setData={setData} canEdit={can.edit} setConfirm={setConfirm} crmSettings={crmSettings} saveCrmSettings={saveCrmSettings} syncStripe={syncStripe} stripeStatus={stripeStatus} refundToken={refundSessionToken} />}
          </div>
        </main>
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
      {importing && <ImportModal data={data} setData={setData} onClose={() => setImporting(false)} />}
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
  );
}

/* ---------- New blank record per db ---------- */
function newRecord(db) {
  const base = { id: uid(db) };
  const m = {
    clients: { name: "", phone: "", email: "", source: "Post-session", status: "Lead", clientType: "First-time attendee", tags: [], firstSession: "", sessionsAttended: 0, lastSession: "", nextSession: "", packageType: "None", lifetimeValue: 0, notes: "", referral: "Low" },
    partners: { name: "", studioType: "Yoga", location: "", contact: "", role: "Owner", email: "", phone: "", stage: "Target identified", estimatedCommunitySize: 0, bestFitJourney: "", revenuePotential: 0, closeProbability: "Low", revShare: "", studioSharePct: 0, contractStatus: "None", outreachDate: "", lastTouch: todayISO(), nextAction: "", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "", promotionCommitments: "", notes: "", checklist: emptyChecklist() },
    sessions: { name: "", studioId: "", date: todayISO(), time: "", durationMins: 0, status: "Planned", journey: "Breathwork Basics", capacity: 20, registered: 0, attendance: 0, paidAttendees: 0, waivers: 0, noShows: 0, pricePerSeat: 0, revenue: 0, studioSplit: 0, netRevenue: 0, conversion: 0, packagesSold: 0, referralsGenerated: 0, equipmentNeeded: "", roomSetupStatus: "Not started", musicSetupStatus: "Not started", testimonialsCapt: 0, followUpSent: false, rebookOfferSent: false, referralsRequested: false, breakthroughNoted: false, notes: "", calendlyEventUri: "", locationType: "", locationJoinUrl: "", locationAddress: "", checklist: emptySessionChecklist(), equipChecklist: emptyEquipChecklist() },
    offers:    { name: "", clientId: "", offerType: "Single session", price: 0, status: "Drafted", probability: "50%", source: "", dateOffered: todayISO(), expireDate: "", followUpDate: "", notes: "", reasonLost: "" },
    revenue:   { name: "", date: todayISO(), channel: "Studio session", source: "", campaign: "", sessionId: "", clientId: "", gross: 0, stripeFee: 0, studioSplit: 0, facilitatorCost: 0, refunds: 0, costCenter: "Studio sessions", notes: "" },
    content: { name: "", category: "Breathwork education", status: "Idea", platform: "Instagram", scheduledDate: "", datePosted: "", body: "", cta: "Book a session", sessionId: "", partnerId: "", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "" },
    followups: { name: "", clientId: "", stage: "Lead", lastContact: todayISO(), futype: "24h", nextAction: "", outcome: "" },
    referrals: { referrerId: "", referredName: "", referredId: "", date: todayISO(), status: "Referred", revenue: 0, thankYouSent: false, rewardGiven: false, notes: "" },
    outreach:  { name: "", targetType: "Studio", contactName: "", email: "", phone: "", location: "", source: "Cold outreach", warmth: "Cold", priority: "Medium", status: "Not contacted", responseStatus: "Pending", outreachMessage: "", lastContact: "", nextFollowUp: "", revenuePotential: 0, partnerId: "", notes: "" },
    testimonials: { name: "", clientId: "", sessionId: "", status: "Breakthrough noted", type: "Written", content: "", bestQuote: "", beforeSummary: "", afterSummary: "", themes: [], permissionReceived: false, useOnWebsite: false, useOnSocial: false, firstNameOnly: false, videoUrl: "", dateReceived: "", datePublished: "", notes: "" },
    templates:    { name: "", category: "Post-Session", channel: "Email", subject: "", body: "", variables: "", linkedTo: "clients", usageCount: 0, notes: "" },
    expenses:     { date: "", vendor: "", description: "", amount: 0, category: "Equipment & Supplies", paymentMethod: "Credit Card", taxDeductible: true, recurring: false, recurringFreq: "One-time", linkedSession: "", linkedPartner: "", receiptUrl: "", notes: "" },
    registrations: { clientId: "", sessionId: "", calendlyInviteeUri: "", calendlyEventUri: "", calendlyEventTypeUri: "", eventName: "", status: "booked", paymentAmount: null, paidAmount: null, paymentStatus: "unknown", stripeVerified: false, stripePaymentIntentId: "", stripeChargeId: "", paymentId: "", paidAt: "", amountRefunded: 0, stripeRefundId: "", refundedAt: "", refundWaived: false, refundWaivedAt: "", waiverStatus: "pending", couponCode: "", createdAt: new Date().toISOString(), scheduledAt: "", timezone: "", locationType: "", locationJoinUrl: "", locationAddress: "", attendanceType: "", checkedIn: false, attended: false, noShow: false, doneBreathworkBefore: "", howHeard: "", referredBy: "", concerns: "", reviewedContraindications: "", notes: "" },
  };
  return { ...base, ...m[db] };
}

/* ============================================================
   TODAY DASHBOARD — Command Center
   ============================================================ */

const CAT_META = {
  revenue:      { label: "Revenue",      Icon: DollarSign, color: C.brand,    bg: C.brandSoft,   text: C.brandDeep },
  relationship: { label: "Relationship", Icon: Users,      color: C.gold,     bg: "#F6EAD6",     text: "#7A4D0F"   },
  operational:  { label: "Operational",  Icon: Check,      color: "#4A8C6F",  bg: "#E2F0EA",     text: "#1E5239"   },
};
const LANE = {
  b2c:  { label: "B2C", full: "Client Revenue",  color: C.brand,   bg: C.brandSoft, text: C.brandDeep, accent: C.brand,   soft: C.brandSoft  },
  b2b:  { label: "B2B", full: "Studio Revenue",  color: "#6B5CE7", bg: "#EEEAFF",   text: "#3D2DA0",   accent: "#6B5CE7", soft: "#EEEAFF"    },
  core: { label: "",    full: "",                color: C.ink2,    bg: C.surfaceAlt, text: C.ink2,     accent: C.ink2,    soft: C.surfaceAlt },
};
const URGENCY_DOT = { high: "#C0573F", medium: C.gold, low: C.ink3 };

function sessionIsVirtual(s) {
  return !s.studioId && (s.locationType === "zoom" || s.locationType === "custom" || !s.locationType);
}

function sessionActionLocation(s, derived) {
  if (sessionIsVirtual(s)) return "Virtual";
  const studio = derived.partnerName[s.studioId];
  return studio ? cleanName(studio) : "—";
}

function sessionVirtualPreSessionComplete(s, data) {
  const equip = s.equipChecklist || {};
  // Match VirtualSessionChecklist "Virtual Setup" phase — not the merged Pre-Session block
  const virtualSetupItems = virtualEquipPhaseItems("virtual_setup");
  if (!virtualSetupItems.every((i) => equip[i.id])) return false;
  const regs = (data.registrations || []).filter(
    (r) => r.sessionId === s.id && r.status !== "cancelled" && r.status !== "canceled"
  );
  if (regs.some((r) => r.paymentStatus === "unpaid")) return false;
  return true;
}

function sessionStudioPreSessionComplete(s, data) {
  const checklist = s.checklist || {};
  const setupReady = s.roomSetupStatus === "Ready" || checklist.room_setup_done || checklist.tech_room_setup;
  const audioReady = s.musicSetupStatus === "Ready" || checklist.audio_tested;
  if (!setupReady || !audioReady) return false;
  const regs = (data.registrations || []).filter(
    (r) => r.sessionId === s.id && r.status !== "cancelled" && r.status !== "canceled"
  );
  if (regs.some((r) => r.paymentStatus === "unpaid")) return false;
  return true;
}

function sessionPreSessionComplete(s, data) {
  return sessionIsVirtual(s)
    ? sessionVirtualPreSessionComplete(s, data)
    : sessionStudioPreSessionComplete(s, data);
}

function normalizeChecklistMap(cl, emptyFn) {
  if (!cl || typeof cl !== "object" || Array.isArray(cl)) return emptyFn();
  return cl;
}

/** Resolve a Next Best Action to a live record + optional drawer tab */
function resolveActionOpen(action, data) {
  const db = action.db;
  if (!db || !action.record?.id) return null;
  const list = data[db] || [];
  let record = list.find((r) => r.id === action.record.id) || action.record;
  if (db === "sessions") {
    record = {
      ...record,
      checklist: normalizeChecklistMap(record.checklist, emptySessionChecklist),
      equipChecklist: normalizeChecklistMap(record.equipChecklist, emptyEquipChecklist),
    };
  }
  let initialTab;
  if (db === "sessions" && (action.id.startsWith("tod_") || action.id.startsWith("tmr_"))) {
    initialTab = "session-checklist";
  } else if (db === "clients" && action.id.startsWith("nfu_")) {
    initialTab = "timeline";
  }
  return { db, record, initialTab };
}

/** Client/partner phone + name for NBA revenue actions (follow-ups, offers, etc.) */
function resolveActionContact(action, data) {
  const { db, record: r } = action;
  if (!r) return null;
  const clients = data.clients || [];
  const partners = data.partners || [];
  if (db === "clients") {
    const c = clients.find((x) => x.id === r.id) || r;
    return { name: cleanName(c.name), phone: c.phone || "", email: c.email || "" };
  }
  if (db === "followups" || db === "offers") {
    const c = clients.find((x) => x.id === r.clientId);
    if (c) return { name: cleanName(c.name || r.name), phone: c.phone || "", email: c.email || "" };
  }
  if (db === "partners") {
    const p = partners.find((x) => x.id === r.id) || r;
    return { name: cleanName(p.contact || p.name), phone: p.phone || "", email: p.email || "" };
  }
  return null;
}

/** Map record db key → main nav section id (for NBA deep-links) */
const NBA_SECTION_FOR_DB = {
  sessions: "sessions", clients: "clients", partners: "partners",
  followups: "followups", offers: "offers",
};

function buildActions(data, derived, today) {
  const daysBetween = (a, b) => (!a || !b) ? 0 : Math.round((new Date(b) - new Date(a)) / 86400000);
  const tomorrowISO = addDaysISO(today, 1);
  const actions = [];
  const followups = data.followups || [];
  const clients = data.clients || [];
  const offers = data.offers || [];
  const partners = data.partners || [];
  const sessions = data.sessions || [];

  // ── REVENUE ──────────────────────────────────────────────────────────
  // Overdue follow-ups (24h / 72h)
  followups
    .filter((f) => !f.outcome && f.nextAction && f.nextAction <= today && (f.futype === "24h" || f.futype === "72h"))
    .forEach((f) => {
      const client = clients.find((c) => c.id === f.clientId);
      const d = daysBetween(f.nextAction, today);
      const label = f.futype === "24h" ? "24-hour" : "72-hour";
      actions.push({ id: "fu_" + f.id, priority: d >= 2 ? 1 : 2, urgency: d >= 2 ? "high" : "medium", category: "revenue",
        text: `Call ${cleanName(client?.name || f.name)} — ${label} post-session follow-up ${d > 0 ? `${d} day${d !== 1 ? "s" : ""} overdue` : "due today"}`,
        sub: `${label} follow-up · client since ${fmtDate(client?.firstSession) || "—"}${client?.phone ? ` · ${client.phone}` : ""}`, db: "followups", record: f });
    });

  // Open offers
  offers
    .filter((o) => o.status === "Offered")
    .forEach((o) => {
      const client = data.clients.find((c) => c.id === o.clientId);
      const d = daysBetween(o.dateOffered, today);
      actions.push({ id: "off_" + o.id, priority: d >= 5 ? 2 : 3, urgency: d >= 5 ? "high" : "medium", category: "revenue",
        text: `Follow up with ${cleanName(client?.name || o.name)} — open ${o.offerType} offer${d ? `, offered ${d} day${d !== 1 ? "s" : ""} ago` : ""}`,
        sub: `${o.offerType} · ${money(o.price)} · offered ${fmtDate(o.dateOffered)}${client?.phone ? ` · ${client.phone}` : ""}`, db: "offers", record: o });
    });

  // Attended 1x — no rebook
  clients
    .filter((c) => c.status === "Attended 1x" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "reb_" + c.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Rebook ${cleanName(c.name)} — attended once on ${fmtDate(c.lastSession)}, no next session set`,
        sub: `Attended 1x · source: ${c.source} · ${c.referral} referral potential${c.phone ? ` · ${c.phone}` : ""}`, db: "clients", record: c });
    });

  // Leads with no follow-up at all
  clients
    .filter((c) => c.status === "Lead" && !followups.some((f) => f.clientId === c.id))
    .forEach((c) => {
      actions.push({ id: "ld_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Convert lead ${cleanName(c.name)} — no follow-up scheduled yet`,
        sub: `Lead · ${c.source} · next session: ${fmtDate(c.nextSession) || "none"}${c.phone ? ` · ${c.phone}` : ""}`, db: "clients", record: c });
    });

  // Studio partners needing next step
  partners
    .filter((p) => ["Demo completed", "Pilot proposed", "Agreement sent", "Discovery call booked", "Demo session offered"].includes(p.stage))
    .filter((p) => !(derived.sessionsByStudio[p.id] || []).some((s) => s.date >= today))
    .forEach((p) => {
      actions.push({ id: "sp_" + p.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Book next session with ${cleanName(p.name)} — ${p.stage.toLowerCase()}, no upcoming session`,
        sub: `${p.stage} · contact: ${p.contact} · ${p.email}${p.phone ? ` · ${p.phone}` : ""}`, db: "partners", record: p });
    });

  // Engaged clients (2-3x) — no package yet
  clients
    .filter((c) => c.status === "Engaged (2-3x)" && (!c.packageType || c.packageType === "None" || c.packageType === "Drop-in"))
    .forEach((c) => {
      actions.push({ id: "pkg_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Offer package to ${cleanName(c.name)} — ${c.sessionsAttended} sessions in, still on drop-in`,
        sub: `Engaged · LTV: ${money(c.lifetimeValue)} · last seen: ${fmtDate(c.lastSession)}${c.phone ? ` · ${c.phone}` : ""}`, db: "clients", record: c });
    });

  // ── RELATIONSHIP ──────────────────────────────────────────────────────
  // Referral follow-ups overdue
  followups
    .filter((f) => f.futype === "Referral" && !f.outcome && f.nextAction && f.nextAction <= today)
    .forEach((f) => {
      const client = clients.find((c) => c.id === f.clientId);
      actions.push({ id: "ref_" + f.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Thank ${cleanName(client?.name || f.name)} for the referral — follow-up due ${daysBetween(f.nextAction, today) > 0 ? "& overdue" : "today"}`,
        sub: `Referral follow-up · due ${fmtDate(f.nextAction)}`, db: "followups", record: f });
    });

  // Advocates + High-referral — request testimonial
  clients
    .filter((c) => c.status === "Advocate" || (c.referral === "High" && Number(c.sessionsAttended) >= 3))
    .filter((c) => !followups.some((f) => f.clientId === c.id && f.futype === "Referral" && f.lastContact >= (today.slice(0, 7) + "-01")))
    .slice(0, 3)
    .forEach((c) => {
      actions.push({ id: "tst_" + c.id, priority: 5, urgency: "low", category: "relationship",
        text: `Request a testimonial from ${cleanName(c.name)} — ${c.sessionsAttended} sessions, noted as ${c.referral.toLowerCase()} referral`,
        sub: `${c.status} · last session: ${fmtDate(c.lastSession)}`, db: "clients", record: c });
    });

  // Active partners — no session in 14+ days
  partners
    .filter((p) => p.stage === "Recurring partner" || p.stage === "Pilot completed" || p.stage === "First session scheduled")
    .filter((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      return !last || daysBetween(last, today) > 14;
    })
    .forEach((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      actions.push({ id: "pi_" + p.id, priority: 5, urgency: "low", category: "relationship",
        text: `Check in with ${p.contact} at ${cleanName(p.name)} — ${last ? `last session ${fmtDate(last)}` : "no sessions logged"}`,
        sub: `${p.stage} · ${p.email}`, db: "partners", record: p });
    });

  // Warm contacts to invite — engaged, no upcoming session
  clients
    .filter((c) => c.status === "Engaged (2-3x)" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "inv_" + c.id, priority: 6, urgency: "low", category: "relationship",
        text: `Invite ${cleanName(c.name)} to an upcoming session — engaged but no next date scheduled`,
        sub: `Engaged · last seen: ${fmtDate(c.lastSession)} · ${c.source}`, db: "clients", record: c });
    });

  // ── DELIVERY ──────────────────────────────────────────────────────────
  // Sessions today — hide once pre-session checklist is complete
  sessions
    .filter((s) => s.date === today && !sessionPreSessionComplete(s, data))
    .forEach((s) => {
      const virtual = sessionIsVirtual(s);
      actions.push({ id: "tod_" + s.id, priority: 1, urgency: "high", category: "operational",
        text: `Session today: ${cleanName(s.name)} — confirm ${virtual ? "Zoom setup" : "room setup"} and payment link`,
        sub: `${sessionActionLocation(s, derived)} · ${today}`, db: "sessions", record: s });
    });

  // Sessions tomorrow — hide once pre-session checklist is complete
  sessions
    .filter((s) => s.date === tomorrowISO && !sessionPreSessionComplete(s, data))
    .forEach((s) => {
      const virtual = sessionIsVirtual(s);
      actions.push({ id: "tmr_" + s.id, priority: 2, urgency: "medium", category: "operational",
        text: `Session tomorrow: ${cleanName(s.name)} — run through ${virtual ? "virtual setup checklist" : "setup checklist"} today`,
        sub: `${sessionActionLocation(s, derived)} · ${fmtDate(tomorrowISO)}`, db: "sessions", record: s });
    });

  // Attended clients with no follow-up within 4 days
  clients
    .filter((c) => c.sessionsAttended > 0 && c.lastSession)
    .filter((c) => {
      const d = daysBetween(c.lastSession, today);
      return d >= 1 && d <= 4 && !followups.some((f) => f.clientId === c.id && f.lastContact >= c.lastSession);
    })
    .forEach((c) => {
      actions.push({ id: "nfu_" + c.id, priority: 2, urgency: "medium", category: "operational",
        text: `Log follow-up for ${cleanName(c.name)} — attended ${fmtDate(c.lastSession)}, no follow-up recorded`,
        sub: `${c.status} · ${c.sessionsAttended} session${c.sessionsAttended !== 1 ? "s" : ""}`, db: "clients", record: c });
    });

  const urgencyScore = { high: 0, medium: 1, low: 2 };
  // Referrals needing a thank-you
  (data.referrals || [])
    .filter(r => !r.thankYouSent && r.referrerId)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      actions.push({ id: "rty_" + r.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Send thank-you to ${cleanName(referrer?.name || "referrer")} — referred ${cleanName(r.referredName)}`,
        sub: `Referral · ${fmtDate(r.date)} · Status: ${r.status}`, db: "referrals", record: r });
    });

  // New referrals not yet contacted
  (data.referrals || [])
    .filter(r => r.status === "Referred" && daysBetween(r.date, today) >= 3)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      actions.push({ id: "rnc_" + r.id, priority: 5, urgency: "medium", category: "relationship",
        text: `Follow up with ${cleanName(r.referredName)} — referred by ${cleanName(referrer?.name || "?")} ${daysBetween(r.date, today)}d ago`,
        sub: `Not yet contacted · referred ${fmtDate(r.date)}`, db: "referrals", record: r });
    });

  return actions.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : urgencyScore[a.urgency] - urgencyScore[b.urgency]);
}

/* ── LANE SPLIT PANEL ── */
function LaneSplitPanel({ data, today }) {
  const offers        = data.offers   || [];
  const sessions      = data.sessions || [];
  const clients       = data.clients  || [];
  const partners      = data.partners || [];
  const referrals     = data.referrals|| [];
  const registrations = data.registrations || [];
  const mo            = today.slice(0, 7);

  // Built once, shared by all three uses below (Operating profit tile ×2 + lane rows).
  const allRevRows    = useMemo(() => buildRevenueViewRows(data), [data]);

  // ── Shared MTD revenue rows (same source of truth as Revenue This Month tab) ──
  const allRevRowsMTD = useMemo(
    () => allRevRows.filter(r => ((r.bookedAt || r.date) || "").startsWith(mo)),
    [allRevRows, mo],
  );

  // ── B2C metrics ──
  const b2cOfferTypes = ["Single session","3-pack","6-pack","12-pack","Private session","Virtual session","Group package"];
  const b2cRevMTD = allRevRowsMTD
    .filter(r => r.channel !== "Studio session")
    .reduce((a, r) => a + (r.gross || 0), 0);
  const b2cOpenPipeline = offers.filter(o => OPEN_STATUSES.includes(o.status) && b2cOfferTypes.includes(o.offerType))
    .reduce((a, o) => a + (Number(o.price) || 0), 0);
  const activeClients = clients.filter(c => ["Member (4+)","Advocate","Engaged (2-3x)"].includes(c.status)).length;
  const refRevenue   = referrals.reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const avgLTV = clients.filter(c => Number(c.lifetimeValue) > 0).length
    ? Math.round(clients.filter(c => Number(c.lifetimeValue) > 0).reduce((a, c) => a + Number(c.lifetimeValue), 0)
        / clients.filter(c => Number(c.lifetimeValue) > 0).length)
    : 0;

  // ── B2B metrics ──
  const b2bRevMTD = allRevRowsMTD
    .filter(r => r.channel === "Studio session")
    .reduce((a, r) => a + (r.gross || 0), 0);
  const studioPipeline = partners.filter(p => p.stage !== "Lost / not a fit")
    .reduce((a, p) => a + (Number(p.revenuePotential) || 0), 0);
  const recurringP  = partners.filter(p => p.stage === "Recurring partner").length;
  const activeP     = partners.filter(p => !["Lost / not a fit","Target identified"].includes(p.stage)).length;
  const sessionsThisMonth = sessions.filter(s => sameMonth(s.date, today)).length;
  const sessionsWithRev = sessions.filter(s => sessionBookingRevenue(s.id, registrations) > 0);
  const avgSessionRev = sessionsWithRev.length
    ? Math.round(sessionsWithRev.reduce((a, s) => a + sessionBookingRevenue(s.id, registrations), 0) / sessionsWithRev.length)
    : 0;

  const b2cLane = LANE.b2c;
  const b2bLane = LANE.b2b;

  const LaneCard = ({ lane, metrics }) => (
    <div style={{ flex: 1, border: `1px solid ${lane.color}35`, borderRadius: 12, overflow: "hidden" }}>
      {/* Lane header */}
      <div style={{ padding: "11px 16px", background: lane.soft, borderBottom: `1px solid ${lane.color}30`,
        display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: lane.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13.5, color: lane.text }}>{lane.full}</span>
        <span style={{ fontSize: 11, color: lane.text, opacity: 0.65, marginLeft: "auto",
          fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{lane.label}</span>
      </div>
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: "#fff" }}>
        {metrics.map(({ label, value, sub }, i) => (
          <div key={label} style={{ padding: "13px 14px",
            borderRight: i % 2 === 0 ? `1px solid ${C.line}` : "none",
            borderBottom: i < metrics.length - 2 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontSize: 11, color: C.ink3, textTransform: "uppercase",
              letterSpacing: "0.07em", fontWeight: 600, marginBottom: 5 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700,
              color: lane.color, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600, margin: 0 }}>Revenue by Lane</h3>
        <span style={{ fontSize: 12, color: C.ink3 }}>B2C vs B2B breakdown</span>
      </div>
      <div style={{ display: "flex", gap: 14 }} className="sb-lane-split">
        <LaneCard lane={b2bLane} metrics={[
          { label: "Studio rev MTD",   value: money(b2bRevMTD),       sub: "studio session prices" },
          { label: "Studio pipeline",  value: money(studioPipeline),  sub: `${partners.filter(p=>p.stage!=="Lost / not a fit").length} active` },
          { label: "Sessions MTD",     value: sessionsThisMonth,       sub: "this calendar month" },
          { label: "Recurring",        value: recurringP,             sub: `of ${activeP} in pipeline` },
          { label: "Avg session rev",  value: money(avgSessionRev),   sub: "per session with bookings" },
          { label: "Total studios",    value: partners.length,        sub: `${recurringP} recurring` },
        ]} />
        <LaneCard lane={b2cLane} metrics={[
          { label: "Revenue MTD",      value: money(b2cRevMTD),       sub: "virtual sessions + packages" },
          { label: "Open pipeline",    value: money(b2cOpenPipeline), sub: `${offers.filter(o=>OPEN_STATUSES.includes(o.status)&&b2cOfferTypes.includes(o.offerType)).length} offers` },
          { label: "Active clients",   value: activeClients,           sub: "engaged + member + advocate" },
          { label: "Avg LTV",          value: money(avgLTV),          sub: "lifetime value" },
          { label: "Referral revenue", value: money(refRevenue),      sub: `${referrals.filter(r=>r.status==="Attended").length} converted` },
          { label: "Total clients",    value: clients.length,         sub: `${clients.filter(c=>c.status==="Lead").length} leads` },
        ]} />
      </div>
    </div>
  );
}

/* ── ALERT ENGINE ── */
const ALERT_SEVERITY = {
  critical: { color: "#C0573F", bg: "#FFF2F0", border: "#F5C4BC", label: "Critical" },
  warning:  { color: "#9B7A2E", bg: "#FFFBF0", border: "#F5E4A8", label: "Warning"  },
  info:     { color: "#2E6FB0", bg: "#F0F6FF", border: "#B8D4F5", label: "Info"     },
};

function buildAlerts(data, today) {
  const alerts = [];
  const daysAgo  = (d) => (!d) ? 0 : Math.round((new Date(today) - new Date(d)) / 86400000);
  const daysAway = (d) => (!d) ? 999 : Math.round((new Date(d) - new Date(today)) / 86400000);
  const weekAgo  = addDaysISO(today, -7);

  const sessions      = data.sessions      || [];
  const offers        = data.offers        || [];
  const partners      = data.partners      || [];
  const clients       = data.clients       || [];
  const followups     = data.followups     || [];
  const registrations = data.registrations || [];

  // 1 — Expired offers still open
  offers.filter(o => OPEN_STATUSES.includes(o.status) && o.expireDate && o.expireDate < today)
    .forEach(o => {
      const c = clients.find(x => x.id === o.clientId);
      alerts.push({ id: "exp_" + o.id, severity: "critical", category: "revenue",
        title: `Offer expired — ${cleanName(c?.name || o.name)}`,
        detail: `${o.offerType} · ${money(o.price)} · expired ${fmtDate(o.expireDate)}`,
        db: "offers", record: o });
    });

  // 2 — No follow-up sent 24h+ after completed session
  sessions.filter(s => s.status === "Completed" && !s.followUpSent && daysAgo(s.date) >= 1)
    .forEach(s => {
      const d = daysAgo(s.date);
      alerts.push({ id: "nfu_" + s.id, severity: d >= 3 ? "critical" : "warning", category: "revenue",
        title: `No follow-up sent — ${s.name} (${d} day${d !== 1 ? "s" : ""} ago)`,
        detail: `Follow-up window closing · completed ${fmtDate(s.date)}`,
        db: "sessions", record: s });
    });

  // 3 — Session < 72 h away with < 50% registration
  sessions.filter(s => {
    const away = daysAway(s.date);
    const cap  = Number(s.capacity) || 0;
    const reg  = Number(s.registered) || 0;
    return away >= 0 && away <= 3 && cap > 0 && reg / cap < 0.5;
  }).forEach(s => {
    const away = daysAway(s.date);
    const pct  = Math.round((Number(s.registered) / Number(s.capacity)) * 100);
    alerts.push({ id: "reg_" + s.id, severity: pct < 25 ? "critical" : "warning", category: "operational",
      title: `Low registration — ${s.name} (${pct}% full, ${away === 0 ? "today" : `${away}d away`})`,
      detail: `${s.registered}/${s.capacity} registered · promote now`,
      db: "sessions", record: s });
  });

  // 4 — Waivers missing on completed sessions
  sessions.filter(s =>
    ["Completed","Follow-up pending","Closed out"].includes(s.status) &&
    Number(s.attendance) > 0 && Number(s.waivers) < Number(s.attendance)
  ).forEach(s => {
    const missing = Number(s.attendance) - Number(s.waivers);
    alerts.push({ id: "waiv_" + s.id, severity: "warning", category: "operational",
      title: `${missing} waiver${missing !== 1 ? "s" : ""} missing — ${s.name}`,
      detail: `${s.waivers}/${s.attendance} collected · ${fmtDate(s.date)}`,
      db: "sessions", record: s });
  });

  // 5 — Payment not confirmed on completed sessions with revenue
  sessions.filter(s =>
    ["Completed","Closed out","Follow-up pending"].includes(s.status) &&
    !s.paymentConfirmed && Number(s.netRevenue) > 0
  ).forEach(s => {
    alerts.push({ id: "pay_" + s.id, severity: "critical", category: "revenue",
      title: `Payment not confirmed — ${s.name}`,
      detail: `${money(s.netRevenue)} net · ${fmtDate(s.date)}`,
      db: "sessions", record: s });
  });

  // 6 — Offer open > 7 days, no follow-up date set
  offers.filter(o => OPEN_STATUSES.includes(o.status) && daysAgo(o.dateOffered) > 7 && !o.followUpDate)
    .forEach(o => {
      const c = clients.find(x => x.id === o.clientId);
      const d = daysAgo(o.dateOffered);
      alerts.push({ id: "stale_o_" + o.id, severity: "warning", category: "revenue",
        title: `Offer stale ${d} days — ${cleanName(c?.name || o.name)}`,
        detail: `${o.offerType} · ${money(o.price)} · no follow-up scheduled`,
        db: "offers", record: o });
    });

  // 7 — Studio demo done, no proposal > 7 days
  partners.filter(p => p.stage === "Demo completed" && daysAgo(p.lastTouch) > 7)
    .forEach(p => {
      const d = daysAgo(p.lastTouch);
      alerts.push({ id: "demo_" + p.id, severity: "warning", category: "revenue",
        title: `Demo done, no proposal — ${cleanName(p.name)}`,
        detail: `${d} days since last touch · ${p.stage}`,
        db: "partners", record: p });
    });

  // 8 — Room/music setup not started for session < 7 days away (studio sessions only)
  sessions.filter(s => {
    if (sessionIsVirtual(s)) return false;
    const away = daysAway(s.date);
    return away >= 0 && away <= 7 && (s.roomSetupStatus === "Not started" || s.musicSetupStatus === "Not started");
  }).forEach(s => {
    const away = daysAway(s.date);
    const items = [s.roomSetupStatus === "Not started" && "room", s.musicSetupStatus === "Not started" && "music"].filter(Boolean);
    alerts.push({ id: "setup_" + s.id, severity: away <= 2 ? "critical" : "warning", category: "operational",
      title: `Setup not started — ${s.name} (${away === 0 ? "today" : `${away}d away`})`,
      detail: `Pending: ${items.join(", ")} setup`,
      db: "sessions", record: s });
  });

  // 9 — Active partner pipeline with no activity > 14 days
  const inactiveCutoff = ["Lost / not a fit", "Recurring partner", "Target identified", "Researched"];
  partners.filter(p => !inactiveCutoff.includes(p.stage) && daysAgo(p.lastTouch) > 14)
    .forEach(p => {
      const d = daysAgo(p.lastTouch);
      alerts.push({ id: "stale_p_" + p.id, severity: "warning", category: "relationship",
        title: `${cleanName(p.name)} — no activity for ${d} days`,
        detail: `Stage: ${p.stage} · last touch: ${fmtDate(p.lastTouch)}`,
        db: "partners", record: p });
    });

  // 10 — No outreach logged this week
  const hasOutreach = followups.some(f => f.lastContact >= weekAgo) ||
                      partners.some(p => p.lastTouch >= weekAgo);
  if (!hasOutreach) {
    alerts.push({ id: "no_reach", severity: "info", category: "relationship",
      title: "No outreach activity this week",
      detail: "No follow-up or partner contact logged in the last 7 days",
      db: null, record: null });
  }

  // 12 — Breakthrough noted but no testimonial request yet
  const testimonialSessionIds = new Set((data.testimonials || []).map(t => t.sessionId).filter(Boolean));
  sessions.filter(s =>
    s.breakthroughNoted &&
    ["Completed","Follow-up pending","Closed out"].includes(s.status) &&
    !testimonialSessionIds.has(s.id)
  ).forEach(s => {
    const d = daysAgo(s.date);
    alerts.push({ id: "bkt_" + s.id, severity: d > 7 ? "warning" : "info", category: "relationship",
      title: `Testimonial not requested — breakthrough noted at ${s.name}`,
      detail: `Session was ${d} day${d !== 1 ? "s" : ""} ago · window closing`,
      db: "sessions", record: s });
  });

  // 11 — Referral thank-you overdue > 3 days
  (data.referrals || []).filter(r => !r.thankYouSent && r.referrerId && daysAgo(r.date) > 3)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      alerts.push({ id: "rty_" + r.id, severity: "info", category: "relationship",
        title: `Thank-you overdue — ${cleanName(referrer?.name || "referrer")} sent a referral`,
        detail: `Referred ${cleanName(r.referredName)} · ${daysAgo(r.date)} days ago`,
        db: "referrals", record: r });
    });

  // 13 — Active partners missing Studio Partner Agreement PDF
  partners
    .filter((p) => (p.stage === "Recurring partner" || p.stage === "First session scheduled" || p.stage === "Pilot completed") && !partnerHasAgreementPdf(p))
    .forEach((p) => {
      alerts.push({ id: "agr_" + p.id, severity: "critical", category: "operational",
        title: `Studio Partner Agreement missing — ${cleanName(p.name)}`,
        detail: "Please update the studio partner agreement.",
        db: "partners", record: p });
    });

  // 14 — Canceled booking eligible for a Stripe refund, not yet refunded
  registrations
    .filter(r => r.status === "canceled" && !r.stripeRefundId && (Number(r.amountRefunded) || 0) === 0)
    .forEach(r => {
      const elig = refundEligibility(r, data);
      if (!elig.eligible) return;
      const c = clients.find(x => x.id === r.clientId);
      const name = cleanName(c?.name || r.inviteeName || r.name || "");
      alerts.push({
        id: "refund_" + r.id,
        severity: "warning",
        category: "revenue",
        title: `Refund due — ${name}`,
        detail: `${elig.reason}${elig.flag ? " · " + elig.flag : ""} · ${money(elig.amount)}`,
        db: "registrations",
        record: r,
      });
    });

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// Collections that carry a clientId on each record.
const CLIENT_ID_COLLECTIONS = ["registrations", "offers", "followups", "revenue", "testimonials", "payments", "expenses"];

function findOrphanedGroups(data) {
  const clientIds = new Set((data.clients || []).map(c => c.id));
  const groups = {};
  CLIENT_ID_COLLECTIONS.forEach(col => {
    (data[col] || []).forEach(rec => {
      if (rec.clientId && !clientIds.has(rec.clientId)) {
        if (!groups[rec.clientId]) groups[rec.clientId] = [];
        groups[rec.clientId].push({ col, rec });
      }
    });
  });
  return groups; // { [orphanedClientId]: [{ col, rec }, …] }
}

function OrphanedRecordsModal({ data, setData, onClose }) {
  const groups = findOrphanedGroups(data);
  const orphanIds = Object.keys(groups);
  // assignments: { [orphanedClientId]: newClientId }
  const [assignments, setAssignments] = useState(() => Object.fromEntries(orphanIds.map(id => [id, ""])));
  const [done, setDone] = useState(false);

  const clientsSorted = [...(data.clients || [])].sort((a, b) => cleanName(a.name).localeCompare(cleanName(b.name)));

  const assign = (orphanId, newClientId) => setAssignments(p => ({ ...p, [orphanId]: newClientId }));

  const apply = () => {
    setData(prev => {
      let next = { ...prev };
      CLIENT_ID_COLLECTIONS.forEach(col => {
        if (!next[col]) return;
        next[col] = next[col].map(rec => {
          const newId = rec.clientId && assignments[rec.clientId];
          return newId ? { ...rec, clientId: newId } : rec;
        });
      });
      return next;
    });
    setDone(true);
  };

  const colLabel = { registrations: "Booking", offers: "Offer", followups: "Follow-up", revenue: "Revenue row", testimonials: "Testimonial", payments: "Payment", expenses: "Expense" };
  const recSummary = ({ col, rec }) => {
    const parts = [];
    if (rec.eventName) parts.push(rec.eventName);
    if (rec.name) parts.push(cleanName(rec.name));
    if (rec.description) parts.push(rec.description);
    if (rec.date) parts.push(fmtDate(rec.date));
    if (rec.scheduledAt) parts.push(fmtDate(rec.scheduledAt?.slice(0, 10)));
    return `${colLabel[col] || col}${parts.length ? " — " + parts.join(", ") : ""}`;
  };

  const anyAssigned = orphanIds.some(id => assignments[id]);

  const ovl = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
  const box = { background: C.surface, borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,.18)", width: "100%", maxWidth: 640, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" };
  const hdr = { padding: "20px 24px 16px", borderBottom: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
  const body = { padding: "20px 24px", overflowY: "auto", flex: 1 };
  const ftr = { padding: "14px 24px", borderTop: `1px solid ${C.lineSoft}`, display: "flex", justifyContent: "flex-end", gap: 10 };

  return (
    <div style={ovl} onClick={onClose}>
      <div style={box} onClick={e => e.stopPropagation()}>
        <div style={hdr}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Re-link orphaned records</div>
            <div style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}>
              {orphanIds.length === 0 ? "No orphaned records found." : `${orphanIds.length} deleted client${orphanIds.length !== 1 ? "s" : ""} found with linked records. Assign each group to a new client.`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.ink3, lineHeight: 1 }}>×</button>
        </div>

        <div style={body}>
          {orphanIds.length === 0 && (
            <div style={{ color: C.ink2, fontSize: 14 }}>All records are linked to existing clients. Nothing to fix.</div>
          )}
          {done && (
            <div style={{ background: "#EDF7ED", border: "1px solid #A8D5A8", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#2E6B2E" }}>
              Records re-linked successfully. You can close this panel.
            </div>
          )}
          {orphanIds.map(orphanId => {
            const items = groups[orphanId];
            return (
              <div key={orphanId} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.lineSoft}` }}>
                <div style={{ fontSize: 11.5, color: C.ink3, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginBottom: 6 }}>
                  Deleted client ID: {orphanId}
                </div>
                <ul style={{ margin: "0 0 10px 16px", padding: 0, fontSize: 13, color: C.ink2 }}>
                  {items.map(({ col, rec }, i) => (
                    <li key={i}>{recSummary({ col, rec })}</li>
                  ))}
                </ul>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 12.5, color: C.ink2, whiteSpace: "nowrap" }}>Assign to:</label>
                  <select
                    value={assignments[orphanId]}
                    onChange={e => assign(orphanId, e.target.value)}
                    style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.surface, color: C.ink }}>
                    <option value="">— select a client —</option>
                    {clientsSorted.map(c => (
                      <option key={c.id} value={c.id}>{cleanName(c.name)}{c.email ? ` (${c.email})` : ""}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div style={ftr}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 18px", fontSize: 13.5, cursor: "pointer", color: C.ink2 }}>
            Close
          </button>
          {orphanIds.length > 0 && !done && (
            <button
              onClick={apply}
              disabled={!anyAssigned}
              style={{ background: anyAssigned ? C.brand : C.ink3, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13.5, fontWeight: 600, cursor: anyAssigned ? "pointer" : "default" }}>
              Re-link records
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertsPanel({ data, today, onOpen, compact, dismissed: dismissedProp, setDismissed: setDismissedProp }) {
  const [localDismissed, setLocalDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const dismissed    = dismissedProp    ?? localDismissed;
  const setDismissed = setDismissedProp ?? setLocalDismissed;
  const [expanded, setExpanded] = useState(false);

  const alerts  = useMemo(() => buildAlerts(data, today), [data, today]);
  const all     = alerts.filter(a => !dismissed.has(a.id));
  const critical = all.filter(a => a.severity === "critical").length;
  const warning  = all.filter(a => a.severity === "warning").length;
  const SHOW_MAX = expanded ? all.length : (compact ? all.length : 5);
  const shown    = all.slice(0, SHOW_MAX);

  if (all.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", color: "#1E5239" }}>
      <Check size={16} color="#4A8C6F" strokeWidth={1.5} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>All clear — no active alerts</span>
    </div>
  );

  return (
    <div style={compact ? {} : { border: `1px solid ${critical > 0 ? ALERT_SEVERITY.critical.border : ALERT_SEVERITY.warning.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Alert rows */}
      <div style={{ background: compact ? "transparent" : "#fff" }}>
        {shown.map((a, i) => {
          const sv = ALERT_SEVERITY[a.severity];
          const SvIcon = a.severity === "info" ? Info : AlertCircle;
          return (
            <div key={a.id} style={{
              display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 14px",
              borderBottom: i < shown.length - 1 ? `1px solid ${C.lineSoft || C.line}` : "none",
              borderLeft: `3px solid ${sv.color}`,
            }}>
              <SvIcon size={14} color={sv.color} strokeWidth={1.5} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{a.detail}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0, marginTop: 1 }}>
                {a.record && (
                  <button onClick={() => onOpen({ db: a.db, record: a.record })} style={{
                    fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                    background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`,
                  }}>View</button>
                )}
                <button onClick={() => setDismissed(prev => {
                  const next = new Set([...prev, a.id]);
                  try { localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...next])); } catch {}
                  return next;
                })} style={{
                  fontSize: 11.5, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                  background: "transparent", color: C.ink3, border: `1px solid ${C.line}`,
                }} title="Dismiss">×</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / collapse */}
      {!compact && all.length > 5 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          width: "100%", padding: "9px 14px",
          background: critical > 0 ? ALERT_SEVERITY.critical.bg : ALERT_SEVERITY.warning.bg,
          border: "none",
          borderTop: `1px solid ${critical > 0 ? ALERT_SEVERITY.critical.border : ALERT_SEVERITY.warning.border}`,
          cursor: "pointer", fontSize: 12.5, fontWeight: 600,
          color: critical > 0 ? ALERT_SEVERITY.critical.color : ALERT_SEVERITY.warning.color,
          textAlign: "center",
        }}>
          {expanded ? "Show fewer ↑" : `Show ${all.length - 5} more alerts ↓`}
        </button>
      )}
    </div>
  );
}

/* ── PIPELINE SNAPSHOT ── */
function PipelineSnapshot({ data, today }) {
  const offers        = data.offers   || [];
  const partners      = data.partners || [];
  const sessions      = data.sessions || [];
  const clients       = data.clients  || [];
  const registrations = data.registrations || [];
  const mo            = today.slice(0, 7);
  const sessionRev    = (s) => sessionBookingRevenue(s.id, registrations);

  // Open offer pipeline
  const openOffers      = offers.filter(o => OPEN_STATUSES.includes(o.status));
  const openPipelineVal = openOffers.reduce((a, o) => a + (Number(o.price) || 0), 0);
  // OFFER_PROB stores strings like "70%" — Number("70%") → NaN; parseFloat strips the % correctly.
  const openPipelineWt  = openOffers.reduce((a, o) =>
    a + (Number(o.price) || 0) * ((parseFloat(o.probability) || 50) / 100), 0);

  // Studio pipeline — non-lost partners, sum revenuePotential
  const lostStage       = "Lost / not a fit";
  const studioPartners  = partners.filter(p => p.stage !== lostStage);
  const recurringP      = partners.filter(p => p.stage === "Recurring partner");
  const studioPipeVal   = studioPartners.reduce((a, p) => a + (Number(p.revenuePotential) || 0), 0);
  const partnerConvRate = studioPartners.length > 0
    ? Math.round((recurringP.length / studioPartners.length) * 100) : 0;

  // Expected this month: upcoming sessions (not completed) + weighted open offers
  const preSessions     = sessions.filter(s =>
    sameMonth(s.date, today) && ["Planned","Booking open","Promotion active","Almost full"].includes(s.status));
  const bookedVal       = preSessions.reduce((a, s) => a + sessionRev(s), 0);
  const expected30d     = bookedVal + openPipelineWt;

  // Booked but not delivered
  const bookedNotDel    = preSessions.length;
  const bookedNotDelVal = bookedVal;

  // Delivered but unpaid — completed sessions without paymentConfirmed
  const unpaidSessions  = sessions.filter(s =>
    ["Completed","Follow-up pending","Closed out"].includes(s.status) && !s.paymentConfirmed);
  const unpaidVal       = unpaidSessions.reduce((a, s) => a + sessionRev(s), 0);

  // Offers awaiting response (Sent / Viewed)
  const awaitingOffers  = offers.filter(o => ["Sent", "Viewed"].includes(o.status));
  const awaitingVal     = awaitingOffers.reduce((a, o) => a + (Number(o.price) || 0), 0);

  // Average client value — use lifetimeValue (totalSpend doesn't exist on client schema)
  const payingClients   = clients.filter(c => Number(c.lifetimeValue) > 0);
  const avgClientVal    = payingClients.length > 0
    ? payingClients.reduce((a, c) => a + (Number(c.lifetimeValue) || 0), 0) / payingClients.length : 0;

  // Average session revenue from Calendly booking prices
  const sessionsWithRev = sessions.filter(s => sessionRev(s) > 0);
  const avgSessionRev   = sessionsWithRev.length > 0
    ? sessionsWithRev.reduce((a, s) => a + sessionRev(s), 0) / sessionsWithRev.length : 0;

  const totalPotential  = openPipelineVal + studioPipeVal;

  // Local MTD revenue rows — must not reference LaneSplitPanel's allRevRowsMTD
  // (that was a scope leak from the memoization refactor and blanked the app after unlock).
  const allRevRowsMTD = useMemo(
    () => buildRevenueViewRows(data).filter(r => ((r.bookedAt || r.date) || "").startsWith(mo)),
    [data, mo],
  );
  const opProfitMTD = useMemo(() => {
    // Exclude auto Studio Split expenses — calcNet already deducts studioSplit from net.
    const exp = (data.expenses || [])
      .filter(e => (e.date || "").startsWith(mo))
      .filter(e => !(isAutoExpenseRecord(e) && String(e.id || "").startsWith(AUTO_SPLIT_EXP_ID_PREFIX)))
      .reduce((s, e) => s + (+e.amount || 0), 0);
    const net = allRevRowsMTD.map(applyStudioSessionSplit(data)).reduce((s, r) => s + calcNet(r), 0);
    return net - exp;
  }, [data.expenses, allRevRowsMTD, data, mo]);

  const tiles = [
    {
      label: "Operating profit MTD",
      value: money(opProfitMTD),
      sub: "net session revenue minus expenses",
      accent: opProfitMTD >= 0 ? "#16A34A" : "#E05454",
      Icon: TrendingUp,
    },
    {
      label: "Expected 30-day revenue",
      value: money(Math.round(expected30d)),
      sub: "upcoming sessions + weighted offers",
      accent: C.gold, Icon: CalendarDays,
    },
    {
      label: "Booked, not delivered",
      value: money(bookedNotDelVal),
      sub: `${bookedNotDel} upcoming session${bookedNotDel !== 1 ? "s" : ""}`,
      accent: C.ink2, Icon: Clock,
    },
    {
      label: "Avg client value",
      value: money(Math.round(avgClientVal)),
      sub: `across ${payingClients.length} paying client${payingClients.length !== 1 ? "s" : ""}`,
      accent: C.brand, Icon: Users,
    },
    {
      label: "Avg session net revenue",
      value: money(Math.round(avgSessionRev)),
      sub: `${sessionsWithRev.length} session${sessionsWithRev.length !== 1 ? "s" : ""} with booking revenue`,
      accent: C.brand, Icon: BarChart2,
    },
    {
      label: "Partner conversion rate",
      value: `${partnerConvRate}%`,
      sub: `${recurringP.length} of ${studioPartners.length} recurring`,
      accent: "#4A8C6F", Icon: Check,
    },
    {
      label: "Open offer pipeline",
      value: money(openPipelineVal),
      sub: `${openOffers.length} offers · ${money(Math.round(openPipelineWt))} weighted`,
      accent: C.brand, Icon: TrendingUp,
    },
    {
      label: "Studio partner pipeline",
      value: money(studioPipeVal),
      sub: `${studioPartners.length} studios active`,
      accent: "#6B5CE7", Icon: Building2,
    },
    {
      label: "Offers awaiting response",
      value: money(awaitingVal),
      sub: `${awaitingOffers.length} offer${awaitingOffers.length !== 1 ? "s" : ""} sent or viewed`,
      accent: C.gold, Icon: Send,
    },
    {
      label: "Expenses MTD",
      value: money((data.expenses||[]).filter(e=>(e.date||"").startsWith(today.slice(0,7))).reduce((s,e)=>s+(+e.amount||0),0)),
      sub: "operating costs this month",
      accent: "#EF4444", Icon: Receipt,
    },
  ];

  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600 }}>Pipeline at a Glance</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: C.ink3, fontWeight: 500 }}>Total potential</span>
        <span style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: C.brand }}>
          {money(totalPotential)}
        </span>
      </div>

      {/* Tile grid */}
      <div style={{ padding: "14px 14px 14px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}
           className="sb-pipeline-grid">
        {tiles.map(({ label, value, sub, accent, Icon }) => (
          <div key={label} style={{
            padding: "13px 14px", borderRadius: 10,
            background: C.surfaceAlt, border: `1px solid ${C.line}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
              <Icon size={12} color={accent} strokeWidth={1.5} />
              <span style={{ fontSize: 11, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, lineHeight: 1.2 }}>
                {label}
              </span>
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 21, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 5, lineHeight: 1.4 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISMISSED_ACTIONS_KEY = "sb:dismissed-actions:v1";

function ActionEmailModal({ action, data, setData, currentUser, onClose, onSent }) {
  const templates = data.templates || [];
  const clients   = data.clients   || [];
  const partners  = data.partners  || [];
  const suggested = useMemo(() => suggestEmailTemplatesForAction(action, templates), [action, templates]);

  const resolved = useMemo(() => resolveRelationshipActionRecipient(action, data), [action, data]);
  const [template, setTemplate] = useState(() => suggested[0] || templates.find(t => t.channel === "Email") || null);
  const [recipient, setRecipient] = useState(() => resolved?.recipient || null);
  const [recipientSearch, setRecipientSearch] = useState(() => {
    const r = resolved?.recipient;
    if (!r) return "";
    return r._type === "partner" ? (r.contact || r.name || "") : cleanName(r.name || "");
  });
  const initialCompose = (() => {
    const tmpl = suggested[0] || templates.find(t => t.channel === "Email") || null;
    const recip = resolved?.recipient || null;
    if (!tmpl || !recip) return { vars: {}, autoFilledKeys: new Set(), subjectEdit: tmpl?.subject || tmpl?.name || "" };
    const varKeys = extractTemplateVars(tmpl);
    const { vars: v, autoFilledKeys: k } = autoFillTemplateVars(varKeys, recip, recip._type, currentUser);
    return { vars: v, autoFilledKeys: k, subjectEdit: applyTemplateVars(tmpl.subject || tmpl.name, v) };
  })();
  const [vars, setVars] = useState(initialCompose.vars);
  const [autoFilledKeys, setAutoFilledKeys] = useState(initialCompose.autoFilledKeys);
  const [subjectEdit, setSubjectEdit] = useState(initialCompose.subjectEdit);
  const [bodyOverride, setBodyOverride] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const applyTemplateToRecipient = useCallback((tmpl, recip, type) => {
    if (!tmpl || !recip) return;
    const varKeys = extractTemplateVars(tmpl);
    const { vars: filled, autoFilledKeys: filledKeys } = autoFillTemplateVars(varKeys, recip, type, currentUser);
    setVars(filled);
    setAutoFilledKeys(filledKeys);
    setSubjectEdit(applyTemplateVars(tmpl.subject || tmpl.name, filled));
    setBodyOverride(null);
  }, [currentUser]);

  const populatedBody = template ? applyTemplateVars(template.body, vars) : "";

  const manualVars = Object.keys(vars).filter(k => !autoFilledKeys.has(k));

  const recipientResults = useMemo(() => {
    const q = recipientSearch.toLowerCase().trim();
    if (!q) return [];
    const matchClients  = clients.filter(c => (c.name || "").toLowerCase().includes(q)).slice(0, 6).map(c => ({ ...c, _type: "client" }));
    const matchPartners = partners.filter(p => (p.name || "").toLowerCase().includes(q) || (p.contact || "").toLowerCase().includes(q)).slice(0, 4).map(p => ({ ...p, _type: "partner" }));
    return [...matchClients, ...matchPartners];
  }, [recipientSearch, clients, partners]);

  const selectRecipient = (r) => {
    setRecipient(r);
    setRecipientSearch(r._type === "partner" ? (r.contact || r.name || "") : cleanName(r.name || ""));
    if (template) applyTemplateToRecipient(template, r, r._type);
  };

  const selectTemplate = (tmplId) => {
    const tmpl = templates.find(t => t.id === tmplId);
    if (!tmpl) return;
    setTemplate(tmpl);
    if (recipient) applyTemplateToRecipient(tmpl, recipient, recipient._type);
    else {
      const varKeys = extractTemplateVars(tmpl);
      const emptyVars = Object.fromEntries(varKeys.map(k => [k, ""]));
      setVars(emptyVars);
      setAutoFilledKeys(new Set());
      setSubjectEdit(tmpl.subject || tmpl.name || "");
      setBodyOverride(null);
    }
  };

  const send = async () => {
    if (!template || !recipient?.email || sending) return;
    setSending(true);
    setError("");
    const today = new Date().toISOString().slice(0, 10);
    const finalSubject = subjectEdit || applyTemplateVars(template.subject || template.name, vars);
    const finalBody = bodyOverride ?? populatedBody;

    const recipientName = recipient._type === "partner"
      ? (recipient.contact || recipient.name || "")
      : cleanName(recipient.name || "");
    try {
      const logEntry = await sendCrmEmail({
        to: recipient.email, recipientName, recipientType: recipient._type,
        subject: finalSubject, body: finalBody,
        templateId: template.id, templateName: template.name, category: template.category || "",
      });

      setData(d => {
        const slim = slimHistEntry(logEntry);
        let next = { ...d, emailLog: cappedLog(d.emailLog, logEntry) };
        next.templates = (next.templates || []).map(t =>
          t.id === template.id ? { ...t, usageCount: (Number(t.usageCount) || 0) + 1 } : t
        );
        if (recipient._type === "partner") {
          next.partners = (next.partners || []).map(p => p.id === recipient.id
            ? { ...p, lastTouch: today, emailHistory: [...(p.emailHistory || []), slim] }
            : p);
        } else if (recipient._type === "client" && !recipient._pseudo) {
          next.clients = (next.clients || []).map(c => c.id === recipient.id
            ? { ...c, emailHistory: [...(c.emailHistory || []), slim] }
            : c);
        }
        if (action.id.startsWith("rty_")) {
          next.referrals = (next.referrals || []).map(r =>
            r.id === action.record.id ? { ...r, thankYouSent: true } : r
          );
        }
        if (action.id.startsWith("rnc_")) {
          next.referrals = (next.referrals || []).map(r =>
            r.id === action.record.id && r.status === "Referred" ? { ...r, status: "Contacted" } : r
          );
        }
        if (action.id.startsWith("ref_")) {
          next.followups = (next.followups || []).map(f =>
            f.id === action.record.id ? { ...f, lastContact: today, outcome: "Email sent" } : f
          );
        }
        return next;
      });

      setSent(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1500);
    } catch (err) {
      const failEntry = makeEmailFailEntry({ to: recipient?.email, recipientName, recipientType: recipient?._type, subject: finalSubject, body: finalBody, templateId: template?.id, templateName: template?.name, category: template?.category }, err);
      setData(d => ({ ...d, emailLog: cappedLog(d.emailLog, failEntry) }));
      setError(err.message);
    }
    setSending(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: 720, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
          <Mail size={16} color="#2563EB" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>Send email</div>
            <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{action.text}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Template picker */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Message template</div>
            <select
              value={template?.id || ""}
              onChange={e => selectTemplate(e.target.value)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff" }}
            >
              {!template && <option value="">Select a template…</option>}
              {suggested.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
              ))}
              {templates.filter(t => t.channel === "Email" && !suggested.some(s => s.id === t.id)).length > 0 && (
                <optgroup label="Other templates">
                  {templates.filter(t => t.channel === "Email" && !suggested.some(s => s.id === t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Recipient */}
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Send to</div>
            <div style={{ position: "relative" }}>
              <Search size={14} color={C.ink3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={recipientSearch}
                onChange={e => { setRecipientSearch(e.target.value); setRecipient(null); }}
                placeholder="Search clients or studio partners…"
                style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff", boxSizing: "border-box" }}
              />
            </div>
            {recipientResults.length > 0 && !recipient && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10, marginTop: 4, overflow: "hidden" }}>
                {recipientResults.map(r => (
                  <div key={r.id} onClick={() => selectRecipient(r)}
                    style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.lineSoft || C.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: r._type === "partner" ? hexA("#D9892B", 0.15) : hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {r._type === "partner" ? <Building2 size={14} color="#D9892B" /> : <Users size={14} color={C.brand} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r._type === "partner" ? (r.contact || r.name) : cleanName(r.name)}</div>
                      <div style={{ fontSize: 11.5, color: C.ink3 }}>{r.email || "No email on file"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recipient && (
              <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, background: recipient._type === "partner" ? hexA("#D9892B", 0.1) : hexA(C.brand, 0.1), border: `1px solid ${recipient._type === "partner" ? "#F6D9A8" : hexA(C.brand, 0.3)}`, borderRadius: 20, padding: "4px 10px 4px 8px" }}>
                {recipient._type === "partner" ? <Building2 size={11} color="#D9892B" /> : <Users size={11} color={C.brand} />}
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>{recipient._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient.name)}</span>
                <button onClick={() => { setRecipient(null); setRecipientSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, display: "flex" }}><X size={12} /></button>
              </div>
            )}
          </div>

          {manualVars.length > 0 && recipient && (
            <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#2563EB", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fill in remaining variables</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
                {manualVars.map(k => (
                  <div key={k}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#3D2DA0", marginBottom: 3 }}>{`{{${k}}}`}</label>
                    <input
                      value={vars[k] || ""}
                      onChange={e => {
                        const next = { ...vars, [k]: e.target.value };
                        setVars(next);
                        if (template) setSubjectEdit(applyTemplateVars(template.subject || template.name, next));
                        setBodyOverride(null);
                      }}
                      style={{ width: "100%", padding: "6px 9px", borderRadius: 7, border: `1px solid ${C.line}`, fontSize: 12.5, boxSizing: "border-box" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {template && recipient && (
            <>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject</div>
                <input
                  value={subjectEdit}
                  onChange={e => setSubjectEdit(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
                  <span>Message — edit before sending</span>
                  {bodyOverride !== null && (
                    <button onClick={() => setBodyOverride(null)} style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Reset to template</button>
                  )}
                </div>
                <textarea
                  value={bodyOverride ?? populatedBody}
                  onChange={e => setBodyOverride(e.target.value)}
                  rows={10}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: 13, lineHeight: 1.7, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.line}`, resize: "vertical", fontFamily: "inherit", outline: "none" }}
                />
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.line}`, background: C.surfaceAlt }}>
          {error && <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><AlertCircle size={13} /> {error}</div>}
          {!recipient?.email && recipient && (
            <div style={{ fontSize: 12.5, color: "#D9892B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={13} /> No email on file — add one to their record or pick a different recipient.
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Cancel</button>
            <button onClick={send} disabled={sending || sent || !template || !recipient?.email}
              style={{ padding: "8px 22px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: sending || sent || !recipient?.email ? "not-allowed" : "pointer", background: sent ? "#4A8C6F" : "#2563EB", color: "#fff", display: "flex", alignItems: "center", gap: 6, opacity: !recipient?.email ? 0.5 : 1 }}>
              {sent ? <><Check size={13} /> Sent!</> : sending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : <><Send size={13} /> Send Email</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Today({ data, derived, today, onOpen, onGo, setData, currentUser, canEdit }) {
  const [showAll, setShowAll] = useState(null); // null | "revenue" | "relationship" | "operational"
  const [emailAction, setEmailAction] = useState(null);
  const [dismissedActions, setDismissedActions] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ACTIONS_KEY);
      if (!stored) return new Set();
      const { date, ids } = JSON.parse(stored);
      return date === today ? new Set(ids) : new Set(); // reset each day
    } catch { return new Set(); }
  });

  const dismissAction = (id) => setDismissedActions(prev => {
    const next = new Set([...prev, id]);
    try { localStorage.setItem(DISMISSED_ACTIONS_KEY, JSON.stringify({ date: today, ids: [...next] })); } catch {}
    return next;
  });

  const allActions = useMemo(() => buildActions(data, derived, today), [data, derived, today]);
  const actions = allActions.filter(a => !dismissedActions.has(a.id));
  const byCategory = {
    revenue:      actions.filter(a => a.category === "revenue"),
    relationship: actions.filter(a => a.category === "relationship"),
    operational:  actions.filter(a => a.category === "operational"),
  };

  const mtdRevenue = derived.grossRevMTD;
  const activeSeqs   = (data.sequences || []).filter(s => s.status === "active").length;
  const refRevenue   = (data.referrals || []).reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const activeMembers = (data.clients || []).length;

  const d = new Date();
  const greeting = d.getHours() < 12 ? "Good morning" : d.getHours() < 18 ? "Good afternoon" : "Good evening";

  const totalActions = actions.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Hero */}
      <div className="sb-hero">
        <BreathMark size={62} animate />
        <div>
          <div style={{ fontSize: 13, color: C.brand, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
            {fmtDate(today, true)}
          </div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 26, margin: "4px 0 0", fontWeight: 600, letterSpacing: "-0.01em" }}>
            {greeting}. Take one slow breath, then begin.
          </h2>
        </div>
      </div>

      {/* ── NEXT BEST ACTIONS (above stats) ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
            Next Best Actions
          </h3>
          {totalActions > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: URGENCY_DOT.high, color: "#fff", borderRadius: 20, padding: "2px 9px" }}>
              {totalActions} pending
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }} className="sb-nba-grid">
          {Object.entries(CAT_META).map(([cat, meta]) => {
            const all  = byCategory[cat] || [];
            const top3 = all.slice(0, 3);
            const rest = all.length - 3;
            const isExpanded = showAll === cat;
            const shown = isExpanded ? all : top3;
            const { Icon } = meta;

            return (
              <div key={cat} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Column header */}
                <div style={{ padding: "13px 15px 12px", background: meta.bg, borderBottom: `1px solid ${hexA(meta.color, 0.18)}`, display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon size={14} color={meta.color} strokeWidth={1.5} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: meta.text, flex: 1 }}>{meta.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.text, opacity: 0.65 }}>
                    {all.length} action{all.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Action list */}
                <div style={{ flex: 1 }}>
                  {shown.length === 0 ? (
                    <div style={{ padding: "22px 14px", textAlign: "center", color: C.ink3, fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>✓</span>
                      <div style={{ marginTop: 4, fontWeight: 500 }}>All clear</div>
                    </div>
                  ) : shown.map((a, i) => (
                    <div key={a.id} style={{
                        display: "flex", alignItems: "flex-start",
                        borderBottom: i < shown.length - 1 ? `1px solid ${C.lineSoft}` : "none",
                      }}>
                      <button
                        onClick={() => {
                          if (cat === "relationship" && a.record && canEdit) {
                            setEmailAction(a);
                          } else if (a.record) {
                            const target = resolveActionOpen(a, data);
                            if (target) {
                              const nav = NBA_SECTION_FOR_DB[target.db];
                              if (nav) onGo(nav);
                              const actionContact = cat === "revenue" ? resolveActionContact(a, data) : null;
                              onOpen(actionContact ? { ...target, actionContact } : target);
                            }
                          }
                        }}
                        style={{
                          flex: 1, display: "flex", alignItems: "flex-start", gap: 9,
                          padding: "11px 6px 11px 13px",
                          background: "transparent", border: "none",
                          cursor: a.record ? "pointer" : "default", textAlign: "left",
                        }}
                        className={a.record ? "sb-nba-row" : ""}
                      >
                        {/* Urgency dot + number */}
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: URGENCY_DOT[a.urgency],
                          color: "#fff", fontSize: 10, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                        }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.text}</div>
                          {a.sub && <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2, lineHeight: 1.4 }}>{a.sub}</div>}
                        </div>
                        {a.record && <ChevronRight size={13} color={C.ink3} style={{ flexShrink: 0, marginTop: 3 }} />}
                      </button>
                      <button
                        onClick={() => dismissAction(a.id)}
                        title="Dismiss for today"
                        style={{
                          padding: "11px 10px", background: "transparent", border: "none",
                          cursor: "pointer", color: C.ink3, fontSize: 14, lineHeight: 1,
                          flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "center",
                          opacity: 0.5,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                      >×</button>
                    </div>
                  ))}
                </div>

                {/* Footer: expand / collapse */}
                {rest > 0 && !isExpanded && (
                  <button onClick={() => setShowAll(cat)} style={{
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderTop: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
                    fontSize: 12, fontWeight: 600, color: meta.color, textAlign: "center",
                  }}>
                    +{rest} more {meta.label.toLowerCase()} action{rest !== 1 ? "s" : ""}
                  </button>
                )}
                {isExpanded && all.length > 3 && (
                  <button onClick={() => setShowAll(null)} style={{
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderTop: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
                    fontSize: 12, fontWeight: 600, color: C.ink3, textAlign: "center",
                  }}>
                    Show less ↑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {emailAction && canEdit && (
        <ActionEmailModal
          action={emailAction}
          data={data}
          setData={setData}
          currentUser={currentUser}
          onClose={() => setEmailAction(null)}
          onSent={() => dismissAction(emailAction.id)}
        />
      )}

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Gross revenue MTD"  value={money(mtdRevenue)}  hint="virtual + studio session prices this month" onClick={() => onGo("revenue", 1)} />
        <Stat label="Referral revenue"  value={money(refRevenue)}  hint="from all referrals" accent={refRevenue > 0 ? "#4A8C6F" : C.ink3} onClick={() => onGo("referrals")} />
        <Stat label="Active clients"    value={activeMembers}      hint="total clients in system"            onClick={() => onGo("clients")} />
        <Stat label="Active sequences"  value={activeSeqs}         hint="clients in follow-up nurture"       onClick={() => onGo("engine")} />
      </div>

      {/* B2C vs B2B lane split */}
      <LaneSplitPanel data={data} today={today} />

      {/* Pipeline snapshot */}
      <PipelineSnapshot data={data} today={today} />

      {/* Charts */}
      <div className="sb-grid2">
        <Panel title="Revenue trend"><RevenueTrend data={data} /></Panel>
        <Panel title="Clients by source"><SourceBreakdown data={data} /></Panel>
      </div>
    </div>
  );
}

/* ---------- Dashboard charts ---------- */
function RevenueTrend({ data }) {
  const months = registrationRevenueByMonth(data.registrations);
  (data.offers || []).forEach((o) => { if (o.status === "Accepted" && o.closeDate) { const k = o.closeDate.slice(0, 7); months[k] = (months[k] || 0) + (Number(o.price) || 0); } });
  const keys = Object.keys(months).sort();
  const years = new Set(keys.map((k) => k.slice(0, 4)));
  const rows = keys.map((k) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1] + (years.size > 1 ? " '" + k.slice(2, 4) : ""), value: Math.round(months[k]) }));
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!rows.length) return <Empty pad>No revenue recorded yet.</Empty>;
  return (
    <div style={{ padding: "2px 4px 8px" }}>
      <div style={{ padding: "0 12px 4px" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 600 }}>{money(total)}</span>
        <span style={{ fontSize: 12.5, color: C.ink3, marginLeft: 8 }}>Stripe revenue + closed offers, by booked month</span>
      </div>
      <ResponsiveContainer width="100%" height={208}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sbRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity={0.3} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.ink3 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: C.ink3 }} axisLine={false} tickLine={false} width={46}
            tickFormatter={(v) => (v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v)} />
          <Tooltip formatter={(v) => [money(v), "Session revenue"]} cursor={{ stroke: C.line }}
            contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}
            labelStyle={{ color: C.ink2, fontWeight: 600 }} />
          <Area type="monotone" dataKey="value" stroke={C.brand} strokeWidth={1.5} fill="url(#sbRev)" dot={{ r: 3, fill: C.brand }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SourceBreakdown({ data }) {
  const rows = SOURCE.map((s) => {
    const items = (data.clients || []).filter((c) => c.source === s);
    return { name: s, value: items.length, ltv: items.reduce((a, c) => a + (Number(c.lifetimeValue) || 0), 0), color: SOURCE_COLOR[s] };
  }).filter((r) => r.value > 0);
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <Empty pad>No clients yet.</Empty>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px 12px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 152, height: 152, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v + (v === 1 ? " client" : " clients"), n]}
              contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: C.ink3 }}>clients</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 168, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600 }}>
          <span style={{ width: 9, flexShrink: 0 }} /><span style={{ flex: 1 }}>Source</span><span>Clients</span><span style={{ width: 64, textAlign: "right" }}>LTV</span>
        </div>
        {[...rows].sort((a, b) => b.value - a.value).map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 13.5, color: C.ink2 }}>{r.value}</span>
            <span style={{ fontSize: 12.5, color: C.ink3, width: 64, textAlign: "right" }}>{money(r.ltv)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Revenue This Month — Margin Cards ── */
// "This month" tab. Gross revenue is taken directly from the Stripe amounts stored on
// records in the Revenue table (data.revenue → `gross`), and net revenue = gross − refunds −
// total expenses pulled from the Expense table (data.expenses → `amount`) for the same month.


/* ── Refunds — Revenue tab ── */
// Refund queue + audit trail. "Refunds due" lists canceled bookings that pass the
// refundEligibility policy matrix, each with a one-click (human-approved) Stripe refund.
// "Refund history" lists the auto cancellation expenses tied to an actual Stripe refund.


/* ============================================================
   SECTION (per database, with views)
   ============================================================ */
function Section({ section, data, derived, today, view, setView, query, onOpen, currentUser, secUsers, masterKeyRaw, setSecUsers, setData, canEdit, setConfirm, crmSettings, saveCrmSettings, syncStripe, stripeStatus, refundToken }) {
  const cfg = useMemo(() => {
    const base = VIEWS[section];
    if (!base) return base;
    // Hide Owner-only destructive admin tabs from non-Owners (defense in depth with view gates).
    if (section === "admin" && currentUser?.role !== "Owner") {
      return {
        ...base,
        views: base.views.filter(vv => vv.layout !== "admin-reset"),
      };
    }
    return base;
  }, [section, currentUser?.role]);
  // Must run before any early return — conditional hooks white-screen the whole app.
  const revenueRows = useMemo(() => buildRevenueViewRows(data), [data]);
  if (!cfg) return null;
  const v = cfg.views[Math.min(view, cfg.views.length - 1)];
  let rows = data[section] || [];
  if (section === "revenue") rows = revenueRows;

  // search — matches a row's own fields PLUS the human names behind its relation ids
  // (client, session, studio/partner), so searching by name works on every list, not just Sessions.
  if (query.trim()) {
    const q = norm(query);
    const clientsById = Object.fromEntries((data.clients || []).map(c => [c.id, c]));
    const sessionsById = Object.fromEntries((data.sessions || []).map(s => [s.id, s]));
    // Sessions list: also match the names of clients who booked each session.
    const sessionClientNames = {};
    if (section === "sessions") {
      (data.registrations || []).forEach(reg => {
        if (!reg.sessionId) return;
        const client = clientsById[reg.clientId];
        if (client) (sessionClientNames[reg.sessionId] ||= []).push(norm(cleanName(client.name)));
      });
    }
    const matches = (r) => {
      if (Object.values(r).some((val) => norm(val).includes(q))) return true;
      const client = r.clientId ? clientsById[r.clientId] : null;
      if (client && (norm(cleanName(client.name)).includes(q) || norm(client.email).includes(q) || norm(client.phone).includes(q))) return true;
      const session = r.sessionId ? sessionsById[r.sessionId] : null;
      if (session && norm(cleanName(session.name)).includes(q)) return true;
      const studioId = r.studioId || r.partnerId;
      if (studioId && norm(cleanName(derived?.partnerName?.[studioId] || "")).includes(q)) return true;
      if (section === "sessions" && (sessionClientNames[r.id] || []).join(" ").includes(q)) return true;
      return false;
    };
    rows = rows.filter(matches);
  }
  const processed = v.run ? v.run(rows, { data, derived, today }) : { rows };

  const handleImportExpenses = !canEdit ? null : (file) => {
    if (file.size > 10 * 1024 * 1024) { alert("CSV file must be under 10 MB."); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      error: (err) => { alert(`Could not read CSV file: ${err.message || err}`); },
      complete: (res) => {
        if (res.errors.length) {
          const msgs = res.errors.slice(0, 3).map(e => e.message).join("; ");
          alert(`CSV parse warning — some rows may be skipped: ${msgs}`);
        }
        const spec = IMPORT_MAP.expenses;
        const rows = res.data.map((raw) => {
          const rec = { id: uid("exp") };
          const lower = {};
          Object.keys(raw).forEach((k) => { lower[norm(k)] = raw[k]; });
          Object.entries(spec.map).forEach(([csvKey, field]) => {
            let val = lower[csvKey] ?? "";
            val = Sec.sanitize(val);
            if (spec.nums && spec.nums.includes(field)) val = num(val);
            if (spec.bools && spec.bools.includes(field)) val = bool(val);
            rec[field] = val;
          });
          return rec;
        }).filter((r) => r.date || r.vendor || r.amount);
        if (rows.length > 0) {
          setData((d) => ({ ...d, expenses: [...(d.expenses || []), ...rows] }));
          alert(`Imported ${rows.length} expense record${rows.length !== 1 ? "s" : ""} successfully.`);
        } else {
          alert("No valid rows found. Check that your CSV headers match the required format.");
        }
      },
    });
  };

  return (
    <div>
      {cfg.views.length > 1 && (
        <div className="sb-tabs">
          {cfg.views.map((vv, i) => (
            <button key={vv.name} className={"sb-tab" + (i === view ? " sb-tab-on" : "")} onClick={() => setView(i)}>{vv.name}</button>
          ))}
        </div>
      )}
      {v.layout === "board" && section === "content" && (data.content || []).length === 0 && (
        <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#166534", marginBottom: 4 }}>No content yet</div>
            <div style={{ fontSize: 13, color: "#166534", lineHeight: 1.5 }}>
              Load 12 sample posts across Instagram, TikTok, and Email — covering transformations, education, testimonials, FAQs, and more. Use them as a starting point or replace with your own.
            </div>
          </div>
          <button
            onClick={() => {
              const items = STARTER_CONTENT.map(c => ({ ...c, id: uid("ct"), sessionId: "", partnerId: "" }));
              setData(d => ({ ...d, content: [...(d.content || []), ...items] }));
            }}
            style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, padding: "10px 20px", cursor: "pointer", flexShrink: 0 }}>
            Load sample content
          </button>
        </div>
      )}
      {v.layout === "board"
        ? <BoardView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} cardKeys={v.card} ctx={{ data, derived, today }} section={section} />
        : v.layout === "partner-pipeline"
        ? <PartnerPipelineView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "session-perf"
        ? <SessionPerfView rows={processed.rows} derived={derived} data={data} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "offer-analytics"
        ? <OfferConversionView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "offers", record: r })} />
        : v.layout === "revenue-analytics"
        ? <RevenueAttributionView data={data} derived={derived} today={today} onOpen={(r) => openRevenueViewRow(r, data, onOpen)} />
        : v.layout === "revenue-analytics-booked"
        ? <RevenueAttributionView data={data} derived={derived} today={today} onOpen={(r) => openRevenueViewRow(r, data, onOpen)} dateMode="booked" />
        : v.layout === "payment-reconciliation"
        ? <PaymentReconciliationView data={data} derived={derived} setData={setData} onOpen={onOpen} syncStripe={syncStripe} stripeStatus={stripeStatus} canEdit={canEdit} query={query} />
        : v.layout === "referral-tree"
        ? <ReferralTreeView data={data} derived={derived} today={today} query={query} onOpen={(r) => onOpen({ db: "referrals", record: r })} />
        : v.layout === "content-analytics"
        ? <ContentAnalyticsView data={data} onOpen={onOpen} />
        : v.layout === "testimonial-library"
        ? <TestimonialLibraryView data={data} query={query} onOpen={onOpen} />
        : v.layout === "template-library"
        ? <TemplateLibraryView data={data} setData={setData} onOpen={onOpen} currentUser={currentUser} query={query} />
        : v.layout === "workflows"
        ? <WorkflowsView data={data} derived={derived} today={today} />
        : v.layout === "user-management"
        ? <UserManagementView currentUser={currentUser} secUsers={secUsers} masterKeyRaw={masterKeyRaw} onUsersUpdated={setSecUsers} onConfirm={setConfirm} crmSettings={crmSettings} apiSessionToken={refundToken} />
        : v.layout === "admin-overview"   ? <AdminView tab="overview"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-schema"     ? <AdminView tab="schema"     data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-integrity"  ? <AdminView tab="integrity"  data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-storage"    ? <AdminView tab="storage"    data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-settings"   ? <AdminView tab="settings"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-journeys"   ? <AdminView tab="journeys"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-email-logs"  ? <AdminView tab="email-logs" data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-reset"      ? <AdminView tab="reset"      data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "expense-summary"  ? <ExpenseSummaryView data={data} today={today} canEdit={canEdit} onOpen={(r) => onOpen({ db: "expenses", record: r })} onImportExpenses={handleImportExpenses} />
        : v.layout === "outreach-hub"
        ? <OutreachHubView rows={processed.rows} data={data} today={today} onOpen={(r) => onOpen({ db: "outreach", record: r })} />
        : v.layout === "calendar"
        ? <CalendarView rows={processed.rows} today={today} derived={derived} data={data} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "record-table"
        ? <RecordTableView records={data[section] || []} columns={v.columns} query={query} section={section} ctx={{ data, derived, today }} onOpen={onOpen} canEdit={canEdit} maxHeight="calc(100vh - 240px)" />
        : v.layout === "revenue-this-month"
        ? <RevenueThisMonthView data={data} today={today} query={query} onOpen={onOpen} canEdit={canEdit} />
        : v.layout === "refunds"
        ? <RefundsView data={data} setData={setData} canEdit={canEdit} setConfirm={setConfirm} onOpen={onOpen} refundToken={refundToken} />
        : <>
          <TableView columns={v.columns} rows={processed.rows} footer={processed.footer} onOpen={(r) => (
              section === "revenue" ? openRevenueViewRow(r, data, onOpen) : onOpen({ db: section, record: r })
            )}             ctx={{ data, derived, today, setData, section, setConfirm, canEdit, refundToken }}
            maxHeight={(section === "registrations" || section === "clients" || section === "revenue" || section === "sessions") ? "calc(100vh - 240px)" : undefined}
            expandRow={v.expandRow ? (r, ctx) => v.expandRow(r, ctx) : undefined} />
          </>}
    </div>
  );
}

/* ---------- View configs ---------- */
const col = (key, label, render, opts = {}) => ({ key, label, render, ...opts });

function TagList({ tags, max = 3 }) {
  if (!tags || !tags.length) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - max;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {shown.map(t => (
        <span key={t} style={{
          fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          background: hexA(TAG_COLOR[t] || C.ink3, 0.13),
          color: TAG_COLOR[t] || C.ink3, whiteSpace: "nowrap",
        }}>{t}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: C.ink3 }}>+{rest}</span>}
    </div>
  );
}

const clientCell = {
  name: (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>,
  status: (r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>,
  type: (r) => r.clientType ? <Tag color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3} soft>{r.clientType}</Tag> : null,
  tags: (r) => <TagList tags={r.tags} />,
};

function registrationSessionTimestamp(reg, data) {
  if (reg.scheduledAt) {
    const t = Date.parse(reg.scheduledAt);
    if (!Number.isNaN(t)) return t;
  }
  if (reg.sessionId && data?.sessions) {
    const s = data.sessions.find(x => x.id === reg.sessionId);
    if (s?.date) {
      const t = Date.parse(`${s.date}T${(s.time || "00:00").slice(0, 5)}`);
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

function formatRegistrationDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function registrationBookedDisplay(reg) {
  return formatRegistrationDateTime(reg.createdAt || reg.scheduledAt || reg.calendlyReceivedAt);
}

function sortRegistrationsBySessionTime(rows, data) {
  return [...rows].sort((a, b) => registrationSessionTimestamp(b, data) - registrationSessionTimestamp(a, data));
}

function sortRegistrationsByCreatedAt(rows) {
  return [...rows].sort((a, b) => registrationCreatedTimestamp(b) - registrationCreatedTimestamp(a));
}

// Manually cancel a booking from the CRM (mirrors an `invitee.canceled` sync): marks the
// registration canceled, frees the session spot (deletes a now-empty virtual session, or
// decrements a studio session's registered count). Future Calendly syncs leave it alone.
function cancelRegistrationManually(setData, regId) {
  if (!setData) return;
  setData(prev => {
    const registrations = [...(prev.registrations || [])];
    const sessions = [...(prev.sessions || [])];
    const idx = registrations.findIndex(r => r.id === regId);
    if (idx < 0) return prev;
    const reg = registrations[idx];
    if (reg.status === "canceled" || reg.status === "rescheduled") return prev;
    registrations[idx] = {
      ...reg,
      status: "canceled",
      canceledAt: new Date().toISOString(),
      cancelReason: reg.cancelReason || "Canceled in CRM",
      cancelerType: "host",
    };
    const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
    if (sessIdx >= 0) {
      const sess = sessions[sessIdx];
      // Only decrement the count — never delete the session record. Deleting on
      // last-booking cancel would orphan any revenue rows, offers, or manual notes
      // tied to this sessionId. Calendly sync (invitee.canceled) is the authoritative
      // source for session lifecycle; CRM manual cancels only affect bookings.
      if (sess.registered > 0) {
        sessions[sessIdx] = { ...sess, registered: sess.registered - 1 };
      }
    }
    return { ...prev, registrations, sessions };
  });
}

/* ── Stripe refunds for canceled bookings ── */
const REFUND_POLICY_HOURS = 24;

// Refund policy matrix for a canceled booking:
//   Host cancels    → full refund at any time.
//   Client cancels  → full refund only when canceled more than REFUND_POLICY_HOURS
//                     before the session start (late cancels keep the charge).
//   $0 / no Stripe payment / already refunded → nothing to refund.
// Returns { eligible, amount, reason, flag } — `flag` is a caution shown even when
// eligible (e.g. unknown initiator), since a human approves every refund.
function refundEligibility(reg, data) {
  if (!reg || reg.status !== "canceled") return { eligible: false, amount: 0, reason: "Not canceled" };
  const amount = Number(reg.paidAmount) || 0;
  if (reg.stripeRefundId || reg.paymentStatus === "refunded" || (Number(reg.amountRefunded) || 0) > 0) {
    return { eligible: false, amount: 0, reason: "Already refunded" };
  }
  if (reg.refundWaived) return { eligible: false, amount, reason: "Refund waived" };
  if (amount <= 0) return { eligible: false, amount: 0, reason: "Free booking — nothing to refund" };
  if (!reg.stripePaymentIntentId && !reg.stripeChargeId) {
    return { eligible: false, amount, reason: "No Stripe payment on file" };
  }

  const canceler = String(reg.cancelerType || "").toLowerCase();
  if (canceler === "host") {
    return { eligible: true, amount, reason: "Canceled by host — full refund due" };
  }

  // Client (invitee) cancel — apply the 24-hour window. Unknown initiators are treated
  // like client cancels but flagged for review before the human approves.
  const flag = canceler && canceler !== "invitee"
    ? `Canceled by "${reg.cancelerType}" — review before refunding`
    : (!canceler ? "Initiator unknown — review before refunding" : "");
  const sessionTs = registrationSessionTimestamp(reg, data);
  const canceledTs = Date.parse(reg.canceledAt || "");
  if (!sessionTs || Number.isNaN(canceledTs)) {
    return { eligible: true, amount, reason: "Client canceled", flag: flag || "Cancellation timing unknown — verify the 24-hour policy before refunding" };
  }
  const hoursBefore = (sessionTs - canceledTs) / 3600000;
  if (hoursBefore > REFUND_POLICY_HOURS) {
    return { eligible: true, amount, reason: `Client canceled ${Math.floor(hoursBefore)}h before session`, flag };
  }
  return { eligible: false, amount, reason: `Late cancel (\u2264${REFUND_POLICY_HOURS}h before session) — no refund per policy` };
}

// Shared expanded-row detail panel for registration tables (All Bookings + Cancellations).
function registrationExpandRow(r, ctx) {
  const client = (ctx.data.clients||[]).find(x => x.id === r.clientId);
  const session = (ctx.data.sessions||[]).find(x => x.id === r.sessionId);
  // For a rescheduled booking, find the new booking it was rescheduled to.
  let rescheduledToAt = null;
  if (r.status === "rescheduled") {
    const regs = ctx.data.registrations || [];
    const target = (r.rescheduledToInviteeUri && regs.find(x => x.calendlyInviteeUri === r.rescheduledToInviteeUri))
      || (r.calendlyInviteeUri && regs.find(x => x.rescheduledFromInviteeUri === r.calendlyInviteeUri));
    rescheduledToAt = target?.scheduledAt || null;
  }
  const dl = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, marginBottom: 2 };
  const dv = { fontSize: 13, color: C.ink, wordBreak: "break-word" };
  const mono = { ...dv, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11.5 };
  const field = (l, v, style) => v ? (
    <div key={l}>
      <div style={dl}>{l}</div>
      <div style={style || dv}>{v}</div>
    </div>
  ) : null;
  return (
    <div style={{ padding: "10px 4px 6px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px 24px" }}>
        {field("Client", client ? cleanName(client.name) : null)}
        {field("Email", client?.email)}
        {field("Phone", client?.phone)}
        {field("Session", session ? cleanName(session.name) : (r.eventName || null))}
        {field("Session date/time", formatRegistrationDateTime(r.scheduledAt))}
        {field("Timezone", r.timezone)}
        {field("Location type", r.locationType)}
        {field("Location address", r.locationAddress)}
        {field("Join URL", r.locationJoinUrl && r.locationJoinUrl.startsWith("https://") ? <a href={r.locationJoinUrl} target="_blank" rel="noreferrer noopener" style={{ color: C.brand, wordBreak: "break-all", fontSize: 12 }}>{r.locationJoinUrl}</a> : (r.locationJoinUrl || null))}
        {field("Attendance type", r.attendanceType)}
        {field("Payment status", r.paymentStatus)}
        {field("Coupon code", r.couponCode || null)}
        {field("Calendly amount", calendlyBookingAmount(r) != null ? money(calendlyBookingAmount(r)) : null)}
        {field("Paid amount", r.paidAmount != null ? money(r.paidAmount) : null)}
        {field("Paid at", r.paidAt ? formatRegistrationDateTime(r.paidAt) : null)}
        {field("Stripe verified", r.stripeVerified ? "✓ Yes" : null)}
        {field("Stripe charge ID", r.stripeChargeId, mono)}
        {field("Stripe payment intent", r.stripePaymentIntentId, mono)}
        {field("Amount refunded", r.amountRefunded > 0 ? money(r.amountRefunded) : null)}
        {field("Stripe refund ID", r.stripeRefundId, mono)}
        {field("Refunded at", r.refundedAt ? formatRegistrationDateTime(r.refundedAt) : null)}
        {field("Waiver", r.waiverStatus)}
        {field("Checked in", r.checkedIn ? "✓ Yes" : null)}
        {field("Attended", r.attended ? "✓ Yes" : null)}
        {field("No-show", r.noShow ? "✓ Yes" : null)}
        {(r.status === "canceled" || r.status === "rescheduled") && field("Cancelled on", r.canceledAt ? new Date(r.canceledAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : null)}
        {(r.status === "canceled" || r.status === "rescheduled") && field("Cancelled by", r.cancelerType ? r.cancelerType.replace(/_/g, " ") : null)}
        {(r.status === "canceled" || r.status === "rescheduled") && field("Cancel reason", r.cancelReason || null)}
        {r.status === "rescheduled" && field("Original session time", formatRegistrationDateTime(r.scheduledAt))}
        {r.status === "rescheduled" && field("Rescheduled to", rescheduledToAt ? formatRegistrationDateTime(rescheduledToAt) : "Not synced yet")}
        {field("Done breathwork before", r.doneBreathworkBefore)}
        {field("How heard", r.howHeard)}
        {field("Referred by", r.referredBy)}
        {field("Concerns", r.concerns)}
        {field("Reviewed contraindications", r.reviewedContraindications)}
        {field("Notes", r.notes)}
      </div>
      {r.calendlyInviteeUri && (
        <div style={{ marginTop: 10, fontSize: 11, color: C.ink3, wordBreak: "break-all" }}>
          <span style={dl}>Calendly invitee URI</span>
          <div>{r.calendlyInviteeUri}</div>
        </div>
      )}
      {ctx?.canEdit && ctx?.setData && r.status !== "canceled" && r.status !== "rescheduled" && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const who = client ? cleanName(client.name) : (r.eventName || "this booking");
              // Host cancels are always refund-eligible when Stripe money was collected —
              // offer the refund right after the cancel so it isn't forgotten.
              const refundable = (Number(r.paidAmount) || 0) > 0
                && (r.stripePaymentIntentId || r.stripeChargeId)
                && !r.stripeRefundId && r.paymentStatus !== "refunded"
                && !((Number(r.amountRefunded) || 0) > 0);
              const doCancel = () => {
                cancelRegistrationManually(ctx.setData, r.id);
                if (refundable && ctx.setConfirm) {
                  const canceledReg = { ...r, status: "canceled", cancelerType: "host" };
                  // Deferred so it opens after the cancel dialog closes (onOk → setConfirm(null)).
                  setTimeout(() => ctx.setConfirm({
                    message: `Refund ${money(Number(r.paidAmount) || 0)} to ${who} via Stripe? The full charge is refunded and this cannot be undone. (You can also do this later from Revenue → Refunds.)`,
                    okLabel: "Issue refund", danger: true,
                    // Return the Promise so ConfirmModal's busy guard covers the full fetch.
                    onOk: () => issueStripeRefund(canceledReg, ctx.setData, ctx.refundToken)
                      .catch(err => alert(`Refund failed: ${err.message || err}`)),
                  }), 0);
                }
              };
              if (ctx.setConfirm) {
                ctx.setConfirm({
                  message: `Cancel ${who}'s booking? It will move to Cancellations and Reschedules, free up the spot, and future Calendly syncs will not bring it back.`,
                  okLabel: "Cancel booking", danger: true, onOk: doCancel,
                });
              } else { doCancel(); }
            }}
            style={{ background: "#C0573F", color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, padding: "8px 16px", cursor: "pointer" }}>
            Cancel booking
          </button>
        </div>
      )}
    </div>
  );
}

const VIEWS = {
  workflows: {
    views: [{ name: "All workflows", layout: "workflows" }],
  },
  users: {
    views: [{ name: "Users & Permissions", layout: "user-management" }],
  },
  admin: {
    views: [
      { name: "Overview",        layout: "admin-overview" },
      { name: "Settings",        layout: "admin-settings" },
      { name: "Journey Descriptions", layout: "admin-journeys" },
      { name: "Schema Browser",  layout: "admin-schema" },
      { name: "Data Integrity",  layout: "admin-integrity" },
      { name: "Storage & Backup", layout: "admin-storage" },
      { name: "Email Logs", layout: "admin-email-logs" },
      { name: "Reset to Production", layout: "admin-reset" },
    ],
  },
  expenses: {
    views: [
      { name: "Summary",        layout: "expense-summary" },
      {
        name: "By Category", layout: "table",
        columns: [
          col("category",  "Category",      r => <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,0.12),color:EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,fontWeight:600}}>{r.category}</span>),
          col("vendor",    "Vendor",        r => r.vendor),
          col("date",      "Date",          r => r.date),
          col("amount",    "Amount",        r => money(r.amount), {align:"right"}),
          col("notes",     "Notes",         r => r.notes),
        ],
        run: (rows) => ({
          rows: [...rows].sort((a,b)=>(a.category||"").localeCompare(b.category||"")),
          footer: { amount: rows.reduce((s,r)=>s+(+r.amount||0),0) },
        }),
      },
      {
        name: "Recurring", layout: "table",
        columns: [
          col("vendor",        "Vendor",      r => <strong style={{color:C.ink}}>{r.vendor}</strong>),
          col("description",   "Description", r => r.description),
          col("category",      "Category",    r => r.category),
          col("amount",        "Amount",      r => money(r.amount), {align:"right"}),
          col("recurringFreq", "Frequency",   r => r.recurringFreq),
        ],
        run: (rows) => {
          const filtered = rows.filter(r => r.recurring);
          return { rows: filtered, footer: { amount: filtered.reduce((s,r)=>s+(+r.amount||0),0) } };
        },
      },
      {
        name: "Tax Deductible", layout: "table",
        columns: [
          col("date",        "Date",        r => r.date),
          col("vendor",      "Vendor",      r => r.vendor),
          col("description", "Description", r => r.description),
          col("category",    "Category",    r => r.category),
          col("amount",      "Amount",      r => money(r.amount), {align:"right"}),
        ],
        run: (rows) => {
          const filtered = rows.filter(r => r.taxDeductible);
          return { rows: filtered, footer: { amount: filtered.reduce((s,r)=>s+(+r.amount||0),0) } };
        },
      },
      { name: "Expense Table", layout: "record-table", columns: expenseTableCols() },
    ],
  },
  registrations: {
    views: [
      {
        name: "All Bookings", layout: "table",
        columns: [
          col("createdAt",   "Scheduled On",     r => formatRegistrationDateTime(r.createdAt)),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return c ? <strong style={{color:C.ink}}>{cleanName(c.name)}</strong> : <span style={{color:C.ink3}}>—</span>; }),
          col("scheduledAt", "Session Date/Time", r => formatRegistrationDateTime(r.scheduledAt)),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("calendlyAmount","Calendly Amount", r => {
            const cal = calendlyBookingAmount(r);
            if (cal === 0) return <span style={{color:C.ink3}}>Free</span>;
            return cal != null
              ? <span style={{color:C.ink2}}>{money(cal)}</span>
              : <span style={{color:C.ink3}}>—</span>;
          }, { align: "right" }),
          col("status",      "Status",       r => {
            const clr = { booked: C.brand, attended: "#4A8C6F", canceled: "#C0573F", rescheduled: C.gold, no_show: "#8A96AC" }[r.status] || C.ink3;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.status}</span>;
          }),
          col("attendanceType","Attendance", r => r.attendanceType || "—"),
        ],
        run: (rows) => ({ rows: sortRegistrationsByCreatedAt(rows) }),
        expandRow: registrationExpandRow,
      },
      {
        name: "Pending Waivers", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Status",       r => r.status),
          col("waiverStatus","Waiver",       r => <span style={{color:"#C0573F",fontWeight:600}}>⚠ Pending</span>),
          col("concerns",    "Concerns",     r => r.concerns || "—"),
        ],
        run: (rows, ctx) => ({ rows: sortRegistrationsBySessionTime(rows.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled"), ctx.data) }),
      },
      {
        name: "Unpaid", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Booking",      r => r.status),
          col("paymentStatus","Payment",     r => <span style={{color:"#C0573F",fontWeight:700}}>Unpaid</span>),
        ],
        run: (rows, ctx) => ({ rows: sortRegistrationsBySessionTime(rows.filter(r => r.paymentStatus === "unpaid" && r.status !== "canceled"), ctx.data) }),
      },
      {
        name: "Cancellations and Reschedules", layout: "table",
        columns: [
          col("canceledAt",  "Cancelled On", r => r.canceledAt ? new Date(r.canceledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + new Date(r.canceledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || r.eventName || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"),
          col("status",      "Status",       r => {
            const clr = r.status === "canceled" ? "#C0573F" : C.gold;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.status}</span>;
          }),
          col("cancelerType","Cancelled By", r => r.cancelerType ? r.cancelerType.replace(/_/g, " ") : "—"),
          col("cancelReason","Cancel Reason",r => r.cancelReason || "—"),
        ],
        run: (rows, ctx) => ({
          rows: [...rows]
            .filter(r => r.status === "canceled" || r.status === "rescheduled")
            .sort((a, b) => (b.canceledAt || b.createdAt || "").localeCompare(a.canceledAt || a.createdAt || "")),
        }),
        expandRow: registrationExpandRow,
      },
      { name: "Refunds", layout: "refunds" },
    ],
  },
  clients: {
    views: [
      { name: "All clients", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("email", "Email", (r) => r.email ? <a href={`mailto:${r.email}`} style={{ color: C.brand }} onClick={e => e.stopPropagation()}>{r.email}</a> : "—"),
          col("phone", "Phone", (r) => r.phone ? <a href={`tel:${r.phone}`} style={{ color: C.brand }} onClick={e => e.stopPropagation()}>{r.phone}</a> : "—"),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("referral", "Referral", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("lifetimeValue", "LTV", (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
      { name: "Pipeline", layout: "board", card: ["clientType", "tags", "nextSession", "packageType", "referral"],
        run: (rows) => ({ groups: STATUS.map((s) => ({ key: s, label: s, color: STATUS_COLOR[s], cards: rows.filter((r) => r.status === s) })) }) },
      { name: "By segment", layout: "table",
        columns: [
          col("name",        "Client",   clientCell.name),
          col("clientType",  "Segment",  clientCell.type),
          col("tags",        "Intent",   clientCell.tags),
          col("status",      "Status",   clientCell.status),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",    (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.clientType || "").localeCompare(b.clientType || "")) }) },
      { name: "Reactivation list", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("clientType","Segment",   clientCell.type),
          col("tags",      "Intent",    clientCell.tags),
          col("lastSession","Last seen", (r) => fmtDate(r.lastSession)),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
          col("notes",     "Notes",     (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
        ],
        run: (rows, c) => ({
          rows: rows.filter(r =>
            r.clientType === "Past client — reactivate" ||
            (r.lastSession && r.lastSession < addDays(c.today, -30))
          ).sort((a, b) => (a.lastSession || "").localeCompare(b.lastSession || ""))
        }) },
      { name: "Advocates & referrers", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("status",    "Status",    clientCell.status),
          col("tags",      "Intent",    clientCell.tags),
          col("referral",  "Referral potential", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.referral === "High" || r.status === "Advocate" || r.clientType === "Referral source" || r.clientType === "Advocate").sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
      { name: "Sessions due / overdue", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("nextSession", "Next session", (r, c) => <DateChip iso={r.nextSession} today={c.today} />),
          col("phone", "Phone", (r) => <span style={{ color: C.ink2 }}>{r.phone}</span>),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => onOrBefore(r.nextSession, c.today)).sort((a, b) => (a.nextSession || "").localeCompare(b.nextSession || "")) }) },
      { name: "High value", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("packageType", "Package", (r) => r.packageType),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "Lifetime value", (r) => <strong>{money(r.lifetimeValue)}</strong>, { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter((r) => Number(r.lifetimeValue) > 0).sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
    ],
  },
  partners: {
    views: [
      { name: "Active partners", layout: "table",
        columns: activePartnerCols(),
        run: (rows, c) => ({ rows: rows.filter((r) => partnerIsActive(r, c?.derived?.sessionsByStudio)).sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
      { name: "Pipeline", layout: "partner-pipeline",
        run: (rows) => ({ groups: STAGE.map((s) => ({ key: s, label: s, color: STAGE_COLOR[s], cards: rows.filter((r) => r.stage === s) })) }) },
      { name: "In outreach", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("contact", "Contact", (r) => r.contact),
          col("lastTouch", "Last touch", (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => ({ rows: rows.filter((r) => !["Recurring partner", "Lost / not a fit"].includes(r.stage)).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "Revenue forecast", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("estimatedCommunitySize", "Community", (r) => Number(r.estimatedCommunitySize || 0).toLocaleString(), { align: "right" }),
          col("revenuePotential", "Rev. potential", (r) => <strong>{money(r.revenuePotential)}</strong>, { align: "right", sum: "revenuePotential" }),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => {
          const sorted = [...rows].filter((r) => r.stage !== "Lost / not a fit").sort((a, b) => Number(b.revenuePotential) - Number(a.revenuePotential));
          return { rows: sorted, footer: { revenuePotential: money(sum(sorted, "revenuePotential")), label: "Total pipeline value" } };
        } },
      { name: "All partners", layout: "table",
        columns: [
          col("name",      "Studio",        (r) => <span style={{ fontWeight: 700 }}>{cleanName(r.name)}</span>),
          col("studioType","Type",          (r) => fmtStudioType(r.studioType)),
          col("stage",     "Stage",         (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("location",  "Address",       (r) => r.location || "—"),
          col("contact",   "Contact",       (r) => r.contact || "—"),
          col("phone",     "Phone",         (r) => r.phone ? <a href={`tel:${r.phone}`} style={{ color: C.brand }}>{r.phone}</a> : "—"),
          col("email",     "Email",         (r) => r.email ? <a href={`mailto:${r.email}`} style={{ color: C.brand }}>{r.email}</a> : "—"),
          col("studioSharePct", "Studio share", (r) => r.studioSharePct ? `${r.studioSharePct}%` : "—"),
          col("contractStatus", "Contract", (r) => r.contractStatus ? <Tag color={r.contractStatus === "Signed" ? "#4A8C6F" : C.gold} soft>{r.contractStatus}</Tag> : "—"),
          col("lastTouch", "Last touch",    (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
    ],
  },
  sessions: {
    views: [
      { name: "Calendar", layout: "calendar", run: (rows) => ({ rows }) },
      { name: "Performance", layout: "session-perf", run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
      { name: "Revenue leaderboard", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId", "Studio", (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("date", "Date", (r) => fmtDate(r.date)),
          col("status", "Status", (r) => <Tag color={SESSION_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("attendance", "In room", (r) => `${r.attendance || 0}/${r.capacity || "?"}`, { align: "right" }),
          col("revenue", "Gross", (r, c) => money(sessionFinanceFor(r, c.data).gross), { align: "right" }),
          col("studioSplit", "Studio cut", (r, c) => money(sessionFinanceFor(r, c.data).studioSplit), { align: "right" }),
          col("netRevenue", "Your net", (r, c) => <strong>{money(sessionFinanceFor(r, c.data).net)}</strong>, { align: "right" }),
        ],
        run: (rows, ctx) => {
          const withFin = rows.map(r => ({ r, fin: sessionFinanceFor(r, ctx.data) }));
          withFin.sort((a, b) => b.fin.net - a.fin.net);
          return {
            rows: withFin.map(x => x.r),
            footer: {
              revenue: money(withFin.reduce((s, x) => s + x.fin.gross, 0)),
              netRevenue: money(withFin.reduce((s, x) => s + x.fin.net, 0)),
              label: "All-time total",
            },
          };
        } },
      { name: "Conversion", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("attendance", "In room", (r) => r.attendance, { align: "right" }),
          col("paidAttendees", "Paid", (r) => r.paidAttendees || "—", { align: "right" }),
          col("waivers", "Waivers", (r) => r.waivers || "—", { align: "right" }),
          col("packagesSold", "Packages", (r) => r.packagesSold, { align: "right" }),
          col("testimonialsCapt", "Testimonials", (r) => r.testimonialsCapt || 0, { align: "right" }),
          col("referralsGenerated", "Referrals", (r) => r.referralsGenerated, { align: "right" }),
          col("conversion", "Conversion", (r) => <Tag color={r.conversion >= 0.3 ? "#2F6FD0" : r.conversion >= 0.2 ? "#3F87DC" : "#9FB2CC"} soft>{pct(r.conversion)}</Tag>, { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => Number(b.conversion) - Number(a.conversion)) }) },
      { name: "All Sessions", layout: "table",
        columns: [
          col("date",       "Session Date & Time", (r) => r.time ? `${fmtDate(r.date)} ${r.time}` : fmtDate(r.date)),
          col("name",       "Session",    (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId",   "Studio",     (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("status",     "Status",     (r) => <Tag color={SESSION_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("attendance", "Attendance", (r) => `${r.attendance || 0}/${r.capacity || "?"}`, { align: "right" }),
          col("netRevenue", "Gross Rev",   (r) => money(r.revenue || r.netRevenue), { align: "right" }),
          col("notes",      "Notes",      (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (b.date || "").localeCompare(a.date || "")) }) },
    ],
  },
  offers: {
    views: [
      { name: "Open pipeline", layout: "table",
        columns: offerCols(),
        run: (rows) => ({ rows: rows.filter((r) => OPEN_STATUSES.includes(r.status)).sort((a, b) => (a.expireDate || "9999").localeCompare(b.expireDate || "9999")) }) },
      { name: "Conversion analytics", layout: "offer-analytics" },
      { name: "By offer type", layout: "table",
        columns: [
          col("offerType", "Type", (r) => r.offerType),
          col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
          col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
          col("source", "Source", (r) => r.source || "—"),
          col("notes", "Notes", (r) => <span style={{ color: C.ink2, fontSize: 12 }}>{r.notes}</span>),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => a.offerType.localeCompare(b.offerType)) }) },
      { name: "Won this month", layout: "table",
        columns: offerCols(),
        run: (rows, c) => {
          const r = rows.filter((x) => WON_STATUSES.includes(x.status) && sameMonth(x.dateOffered, c.today));
          return { rows: r, footer: { price: money(sum(r, "price")), label: "Closed this month" } };
        } },
      { name: "All offers", layout: "table", columns: offerCols(), run: (rows) => ({ rows }) },
    ],
  },
  stripe: {
    views: [
      { name: "Stripe reconciliation", layout: "payment-reconciliation" },
    ],
  },
  revenue: {
    views: [
      { name: "Revenue attribution", layout: "revenue-analytics-booked" },
      { name: "This month", layout: "revenue-this-month" },
      { name: "Revenue Table", layout: "record-table", columns: revenueTableCols() },
    ],
  },
  content: {
    views: [
      { name: "Pipeline",
        layout: "board",
        card: ["category", "platform", "scheduledDate", "leads", "booked"],
        run: (rows) => ({
          groups: ["Idea","Draft","Scheduled","Published"].map(s => ({
            key: s, label: s, color: CONTENT_STATUS_COLOR[s],
            cards: rows.filter(r => r.status === s),
          })),
        }) },
      { name: "Analytics", layout: "content-analytics" },
      { name: "Calendar",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: [...rows]
            .filter(r => r.status !== "Archived")
            .sort((a, b) => (a.scheduledDate || a.datePosted || "9999").localeCompare(b.scheduledDate || b.datePosted || "9999")),
        }) },
      { name: "Top performers",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: [...rows]
            .filter(r => r.status === "Published")
            .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0) || (Number(b.leads) || 0) - (Number(a.leads) || 0)),
          footer: {
            revenue: money(rows.filter(r=>r.status==="Published").reduce((a,r)=>a+(Number(r.revenue)||0),0)),
            label: "Total attributed revenue",
          },
        }) },
      { name: "Ideas & drafts",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: rows.filter(r => ["Idea","Draft"].includes(r.status))
            .sort((a, b) => (a.scheduledDate || "9999").localeCompare(b.scheduledDate || "9999")),
        }) },
    ],
  },
  followups: {
    views: [
      { name: "Due today", layout: "table",
        columns: [
          col("name",       "Follow-up",   (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",      (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype",     "Type",        (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("_send",      "",            (r, c) => <FollowUpSendButton r={r} data={c.data} setData={c.setData} today={c.today} />),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => r.nextAction && r.nextAction <= c.today).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "All follow-ups", layout: "table",
        columns: [
          col("name",       "Follow-up",   (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",      (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype",     "Type",        (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r) => fmtDate(r.nextAction)),
          col("outcome",    "Outcome",     (r) => r.outcome ? <span style={{ color: C.brand }}>{r.outcome}</span> : <span style={{ color: C.ink3 }}>pending</span>),
          col("_send",      "",            (r, c) => <FollowUpSendButton r={r} data={c.data} setData={c.setData} today={c.today} />),
        ],
        run: (rows) => ({ rows }) },
      { name: "By type", layout: "board", card: ["clientId", "nextAction", "outcome"],
        run: (rows) => ({ groups: FUTYPE.map((t) => ({ key: t, label: t, color: FUTYPE_COLOR[t], cards: rows.filter((r) => r.futype === t) })) }) },
    ],
  },
  testimonials: {
    views: [
      { name: "Library", layout: "testimonial-library" },
      { name: "All", layout: "table",
        columns: [
          col("name",       "Testimonial",  (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",       (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("status",     "Status",       (r) => <Tag color={TESTIMONIAL_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("type",       "Type",         (r) => r.type),
          col("themes",     "Themes",       (r) => <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{(r.themes||[]).slice(0,2).map(t=><Tag key={t} soft>{t}</Tag>)}</div>),
          col("useOnWebsite","Web",         (r) => r.useOnWebsite ? <span style={{ color:"#4A8C6F" }}>✓</span> : "—", { align:"center" }),
          col("useOnSocial", "Social",      (r) => r.useOnSocial  ? <span style={{ color:"#6B5CE7" }}>✓</span> : "—", { align:"center" }),
          col("datePublished","Published",  (r) => fmtDate(r.datePublished)),
        ],
        run: (rows) => ({ rows: [...rows].sort((a,b) => {
          const ord = { Published:0, Approved:1, Received:2, "Request sent":3, "Breakthrough noted":4, Declined:5 };
          return (ord[a.status]??9) - (ord[b.status]??9);
        }) }) },
      { name: "Action needed", layout: "table",
        columns: [
          col("name",     "Testimonial",  (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId", "Client",       (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("status",   "Status",       (r) => <Tag color={TESTIMONIAL_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("notes",    "Notes",        (r) => r.notes),
        ],
        run: (rows) => ({ rows: rows.filter(r => ["Breakthrough noted","Request sent"].includes(r.status)) }) },
      { name: "By theme", layout: "board",
        card: ["clientId","status","bestQuote"],
        run: (rows) => ({
          groups: TESTIMONIAL_THEMES.map(th => ({
            key: th, label: th, color: "#6B5CE7",
            cards: rows.filter(r => (r.themes||[]).includes(th)),
          })).filter(g => g.cards.length > 0),
        }) },
    ],
  },
  templates: {
    views: [
      { name: "Library", layout: "template-library" },
      { name: "All", layout: "table",
        columns: [
          col("name",     "Template",  r => <span style={{ fontWeight: 600 }}>{r.name}</span>),
          col("category", "Category",  r => <Tag color={TMPL_CATEGORY_COLOR[r.category]||C.ink3} soft>{r.category}</Tag>),
          col("channel",  "Channel",   r => <Tag color={TMPL_CHANNEL_COLOR[r.channel]||C.ink3} soft>{r.channel}</Tag>),
          col("subject",  "Subject",   r => <span style={{ fontSize: 12, color: C.ink2 }}>{r.subject||"—"}</span>),
          col("usageCount","Used", r => r.usageCount || 0),
        ],
        run: (rows) => ({ rows }),
      },
    ],
  },
  referrals: {
    views: [
      { name: "Referral tree", layout: "referral-tree" },
      { name: "Action needed", layout: "table",
        columns: refActionCols(),
        run: (rows, c) => ({
          rows: rows.filter(referralActionPending)
                    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        }) },
      { name: "All referrals", layout: "table", columns: refCols(), run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
    ],
  },
  outreach: {
    views: [
      { name: "All targets",        layout: "outreach-hub",
        run: (rows) => ({ rows }) },
      { name: "Hot leads",          layout: "outreach-hub",
        run: (rows, { today }) => ({ rows: rows.filter(r => r.warmth === "Hot") }) },
      { name: "Overdue",            layout: "outreach-hub",
        run: (rows, { today }) => ({ rows: rows.filter(r =>
          r.nextFollowUp && r.nextFollowUp < today && !["Won","Declined","Inactive"].includes(r.status)
        )}) },
      { name: "No response",        layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => ["No response","Ghosted"].includes(r.responseStatus)) }) },
      { name: "Demo stage",          layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => ["Demo offered","Demo scheduled"].includes(r.status)) }) },
      { name: "Agreement pending",   layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => r.status === "Agreement pending") }) },
      { name: "High potential",      layout: "outreach-hub",
        run: (rows) => ({ rows: [...rows].filter(r => Number(r.revenuePotential) >= 1000).sort((a,b) => Number(b.revenuePotential) - Number(a.revenuePotential)) }) },
    ],
  },
};

function partnerHasAgreementPdf(partner) {
  return (partner.agreements || []).some((a) => {
    if (a.isPdf === false) return false;
    if (agreementExt(a.name) !== "pdf") return false;
    if (a.isPdf === true || a.id) return true;
    return agreementRecordIsPdf(a);
  });
}

// Any uploaded Studio Partner Agreement file (PDF or Word) marks a partner as a live, working partner.
function partnerHasUploadedAgreement(partner) {
  return (partner?.agreements || []).length > 0;
}

// A partner counts as "active" when their pipeline stage shows a live engagement, they have an
// uploaded agreement on file, OR they have at least one studio session on the calendar — so
// signed/working partners are never hidden by a stale stage value.
function partnerIsActive(partner, sessionsByStudio) {
  if (partner.stage === "Recurring partner"
    || partner.stage === "First session scheduled"
    || partner.stage === "Pilot completed") return true;
  if (partnerHasUploadedAgreement(partner)) return true;
  if ((sessionsByStudio?.[partner.id] || []).length > 0) return true;
  return false;
}

function partnerCols() {
  return [
    col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
    col("location", "Location", (r) => <span style={{ color: C.ink2 }}>{r.location}</span>),
    col("contact", "Contact", (r) => `${r.contact} · ${r.role}`),
    col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
    col("avgAttendance", "Avg att.", (r) => r.avgAttendance || "—", { align: "right" }),
    col("sessionsPerMonth", "Sess/mo", (r) => r.sessionsPerMonth || "—", { align: "right" }),
    col("revenuePotential", "Rev. potential", (r) => money(r.revenuePotential), { align: "right" }),
  ];
}
function activePartnerCols() {
  return [
    col("name", "Studio", (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {!partnerHasAgreementPdf(r) && (
          <span title="Please upload Studio Partner Agreement" style={{ display: "inline-flex", flexShrink: 0, cursor: "help" }}>
            <AlertCircle size={15} color="#C0392B" />
          </span>
        )}
        <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>
      </span>
    )),
    ...partnerCols().slice(1),
  ];
}
function offerCols() {
  return [
    col("clientId", "Client / Studio", (r, c) => <span style={{ fontWeight: 600 }}>{clientShort(c.derived.clientName[r.clientId] || cleanName(r.name))}</span>),
    col("offerType", "Type", (r) => r.offerType),
    col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
    col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("probability", "Prob.", (r) => r.probability || "—", { align: "right" }),
    col("source", "Source", (r) => r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"),
    col("dateOffered", "Offered", (r) => fmtDate(r.dateOffered)),
    col("expireDate", "Expires", (r, c) => <DateChip iso={r.expireDate} today={c.today} />),
    col("followUpDate", "Follow-up", (r, c) => <DateChip iso={r.followUpDate} today={c.today} />),
  ];
}
function referralActionPending(r) {
  return !r.rewardGiven;
}
function refCols() {
  return [
    col("referrerId", "Referred by", (r, c) => {
      const n = c.derived.clientName[r.referrerId];
      return n ? <span style={{ fontWeight: 600 }}>{clientShort(n)}</span> : "—";
    }),
    col("referredName", "Referred person", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.referredName)}</span>),
    col("status", "Status", (r) => <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("revenue", "Revenue", (r) => r.revenue ? <strong style={{ color: "#4A8C6F" }}>{money(r.revenue)}</strong> : "—", { align: "right" }),
    col("thankYouSent", "Thank-you", (r) => r.thankYouSent
      ? <span style={{ color: "#4A8C6F", fontWeight: 600 }}>✓ Sent</span>
      : <span style={{ color: "#D9892B", fontWeight: 600 }}>Needed</span>),
    col("rewardGiven", "Action Status", (r) => r.rewardGiven
      ? <span style={{ color: "#4A8C6F", fontWeight: 600 }}>✓ Completed</span>
      : <span style={{ color: C.ink3 }}>Pending</span>),
    col("notes", "Notes", (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
  ];
}

function refActionCols() {
  const updateRef = (c, r, patch) => {
    if (!c.setData) return;
    c.setData(d => ({
      ...d,
      referrals: d.referrals.map(x => x.id === r.id ? { ...x, ...patch } : x),
    }));
  };
  return [
    col("referrerId", "Referred by", (r, c) => {
      const n = c.derived.clientName[r.referrerId];
      return n ? <span style={{ fontWeight: 600 }}>{clientShort(n)}</span> : "—";
    }),
    col("referredName", "Referred person", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.referredName)}</span>),
    col("status", "Status", (r) => <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("date", "Date", (r, c) => <DateChip iso={r.date} today={c.today} />),
    col("rewardGiven", "Action Status", (r, c) => r.rewardGiven
      ? <span style={{ color: "#4A8C6F" }}>✓ Completed</span>
      : <button
          onClick={e => { e.stopPropagation(); updateRef(c, r, { rewardGiven: true }); }}
          style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
            background: hexA("#4A8C6F", 0.1), color: "#4A8C6F", border: `1px solid ${hexA("#4A8C6F", 0.3)}` }}>
          Mark Completed
        </button>),
    col("notes", "Notes", (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
  ];
}
function revCols() {
  return [
    col("bookedAt", "Booked Date & Time", (r) => r.bookedAt ? formatRegistrationDateTime(r.bookedAt) : "—"),
    col("name", "Description", (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>
        {r.isFree && <span style={{ fontSize: 10.5, fontWeight: 700, background: "#F0F4FF", color: "#5B6ECC", border: "1px solid #C7D0F5", borderRadius: 5, padding: "1px 6px", letterSpacing: ".04em" }}>FREE</span>}
      </span>
    )),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("channel", "Channel", (r) => <Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag>),
    col("gross", "Gross", (r) => <span style={{ color: r.isFree ? C.ink3 : "inherit" }}>{money(r.gross)}</span>, { align: "right", sum: "gross" }),
    col("studioSplit", "Studio split", (r) => r.studioSplit ? money(r.studioSplit) : "—", { align: "right" }),
    col("stripeFee", "Processing", (r) => r.stripeFee ? money(r.stripeFee) : "—", { align: "right" }),
    col("refunds", "Refunds", (r) => r.refunds ? <span style={{ color: "#C0573F" }}>-{money(r.refunds)}</span> : "—", { align: "right" }),
    col("net", "Net", (r) => {
      const n = calcNet(r);
      return <strong style={{ color: n > 0 ? "#4A8C6F" : n < 0 ? "#C0573F" : C.ink3 }}>{money(n)}</strong>;
    }, { align: "right", sum: "net" }),
  ];
}
// Collapsed columns for the raw Revenue table listing (record-table layout).
// `sortVal` returns the raw comparable value used by the sortable column headers.
function revenueTableCols() {
  return [
    col("date", "Date", (r) => {
      const v = r.bookedAt || r.date || "";
      // Full ISO timestamps (with a time component) → date + time; bare YYYY-MM-DD → date only.
      return v.includes("T") ? formatRegistrationDateTime(v) : fmtDate(v, true);
    }, { sortVal: (r) => (r.bookedAt || r.date || "") }),
    col("name", "Description", (r) => (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>{cleanName(r.name) || "—"}</span>
        {r.isFree && <span style={{ fontSize: 10.5, fontWeight: 700, background: "#F0F4FF", color: "#5B6ECC", border: "1px solid #C7D0F5", borderRadius: 5, padding: "1px 6px", letterSpacing: ".04em" }}>FREE</span>}
      </span>
    ), { sortVal: (r) => norm(r.name) }),
    col("channel", "Channel", (r) => r.channel ? <Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag> : "—", { sortVal: (r) => r.channel || "" }),
    col("source", "Source", (r) => r.source || "—", { sortVal: (r) => r.source || "" }),
    col("gross", "Gross", (r) => <span style={{ color: r.isFree ? C.ink3 : "inherit" }}>{money(r.gross)}</span>, { align: "right", sum: "gross", sortVal: (r) => Number(r.gross) || 0 }),
    col("refunds", "Refunds", (r) => r.refunds ? <span style={{ color: "#C0573F" }}>-{money(r.refunds)}</span> : "—", { align: "right", sortVal: (r) => Number(r.refunds) || 0 }),
    col("net", "Net", (r) => {
      const n = calcNet(r);
      return <strong style={{ color: n > 0 ? "#4A8C6F" : n < 0 ? "#C0573F" : C.ink3 }}>{money(n)}</strong>;
    }, { align: "right", sum: "net", sortVal: (r) => calcNet(r) }),
    col("auto", "Type", (r) => r.auto ? <Tag soft>Auto</Tag> : <Tag color={C.brand} soft>Manual</Tag>, { align: "center", sortVal: (r) => (r.auto ? 1 : 0) }),
  ];
}
// Collapsed columns for the raw Expense table listing (record-table layout).
function expenseTableCols() {
  return [
    col("date", "Date", (r) => fmtDate(r.date), { sortVal: (r) => r.date || "" }),
    col("vendor", "Vendor", (r) => <strong style={{ color: C.ink }}>{r.vendor || "—"}</strong>, { sortVal: (r) => norm(r.vendor) }),
    col("description", "Description", (r) => r.description || "—", { sortVal: (r) => norm(r.description) }),
    col("category", "Category", (r) => r.category ? <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 8, background: hexA(EXPENSE_CATEGORY_COLOR[r.category] || C.ink3, 0.12), color: EXPENSE_CATEGORY_COLOR[r.category] || C.ink3, fontWeight: 600 }}>{r.category}</span> : "—", { sortVal: (r) => r.category || "" }),
    col("amount", "Amount", (r) => <strong style={{ color: C.ink }}>{money(r.amount)}</strong>, { align: "right", sum: "amount", sortVal: (r) => Number(r.amount) || 0 }),
    col("paymentMethod", "Payment", (r) => r.paymentMethod || "—", { sortVal: (r) => r.paymentMethod || "" }),
    col("taxDeductible", "Tax Ded.", (r) => r.taxDeductible ? <span style={{ color: "#16A34A", fontWeight: 700 }}>✓ Yes</span> : <span style={{ color: C.ink3 }}>No</span>, { align: "center", sortVal: (r) => (r.taxDeductible ? 1 : 0) }),
    col("auto", "Type", (r) => r.auto ? <Tag soft>Auto</Tag> : <Tag color={C.brand} soft>Manual</Tag>, { align: "center", sortVal: (r) => (r.auto ? 1 : 0) }),
  ];
}
function contentCols() {
  return [
    col("name",      "Title",    (r) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{cleanName(r.name)}</div>
        {r.body && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{r.body}</div>}
      </div>
    )),
    col("category",  "Category",  (r) => <Tag color={CONTENT_CAT_COLOR[r.category] || C.ink3} soft>{r.category}</Tag>),
    col("status",    "Status",    (r) => <Tag color={CONTENT_STATUS_COLOR[r.status] || C.ink3} soft>{r.status}</Tag>),
    col("platform",  "Platform",  (r) => <Tag color={PLATFORM_COLOR[r.platform] || C.ink3} soft>{r.platform}</Tag>),
    col("scheduledDate","Date",   (r) => <DateChip iso={r.datePosted || r.scheduledDate} />),
    col("reach",     "Reach",     (r) => (Number(r.reach) || 0).toLocaleString(), { align: "right" }),
    col("leads",     "Leads",     (r) => Number(r.leads) || 0, { align: "right" }),
    col("booked",    "Booked",    (r) => <strong style={{ color: C.brand }}>{Number(r.booked) || 0}</strong>, { align: "right" }),
    col("revenue",   "Revenue",   (r) => money(r.revenue), { align: "right" }),
  ];
}
// Sum a dollar field in integer cents then divide once to avoid accumulation drift.
const sum = (rows, k) => rows.reduce((a, r) => a + _c(r[k]), 0) / 100;

/* ============================================================
   TABLE
   ============================================================ */
function TableView({ columns, rows, footer, onOpen, ctx, maxHeight, expandRow }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  if (!rows.length) return <Empty pad>Nothing here yet. Add a record, or adjust the view.</Empty>;
  const thStyle = maxHeight
    ? { position: "sticky", top: 0, zIndex: 1, background: C.surface }
    : null;
  const colSpan = columns.length + (expandRow ? 1 : 0);
  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto", ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}) }}>
        <table className="sb-table">
          <thead><tr>
            {expandRow && <th style={{ width: 28, ...thStyle }} />}
            {columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left", ...thStyle }}>{c.label}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className="sb-trow" onClick={() => expandRow ? toggle(r.id) : onOpen(r)} style={{ cursor: "pointer" }}>
                  {expandRow && (
                    <td style={{ textAlign: "center", color: C.ink3, padding: "0 6px" }}>
                      <ChevronRight size={14} style={{ transform: expanded[r.id] ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                    </td>
                  )}
                  {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left" }}>{c.render(r, ctx)}</td>)}
                </tr>
                {expandRow && expanded[r.id] && (
                  <tr>
                    <td />
                    <td colSpan={colSpan - 1} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: C.surfaceAlt, whiteSpace: "normal" }}>
                      {expandRow(r, ctx)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          {footer && (
            <tfoot><tr>
              {expandRow && <td />}
              {columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: c.align || "left" }}>
                  {i === 0 ? <span style={{ color: C.ink3, fontSize: 12 }}>{footer.label} · {rows.length}</span> : (footer[c.sum] != null ? <strong>{footer[c.sum]}</strong> : "")}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   RECORD TABLE  (raw table listing: sortable headers + expandable
   rows that reveal every stored field — used by Revenue Table and
   Expense Table tabs)
   ============================================================ */
const MONEY_FIELD_KEYS = new Set([
  "gross", "net", "amount", "stripeFee", "studioSplit", "facilitatorCost",
  "refunds", "price", "paidAmount", "amountRefunded",
]);
// camelCase / snake_case field key → human-readable label.
const humanizeFieldKey = (k) =>
  String(k)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b(id|url|uri|mtd|ltv)\b/gi, (m) => m.toUpperCase())
    .replace(/^./, (s) => s.toUpperCase());
function formatRecordFieldValue(key, val) {
  if (val == null || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  if (typeof val === "object") return JSON.stringify(val);
  if (typeof val === "number") return MONEY_FIELD_KEYS.has(key) ? money(val) : String(val);
  return String(val);
}

function RecordTableView({ records, columns, query, section, ctx, onOpen, canEdit, maxHeight }) {
  const [sortKey, setSortKey] = useState(columns[0]?.key || null);
  const [sortDir, setSortDir] = useState("desc");
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  let rows = records || [];
  if (query && query.trim()) {
    const q = norm(query);
    const clientsById = Object.fromEntries(((ctx?.data?.clients) || []).map(c => [c.id, c]));
    const sessionsById = Object.fromEntries(((ctx?.data?.sessions) || []).map(s => [s.id, s]));
    rows = rows.filter((r) => {
      if (Object.values(r).some((v) => norm(v).includes(q))) return true;
      const client = r.clientId ? clientsById[r.clientId] : null;
      if (client && (norm(cleanName(client.name)).includes(q) || norm(client.email).includes(q))) return true;
      const sessId = r.sessionId || r.linkedSession;
      const session = sessId ? sessionsById[sessId] : null;
      if (session && norm(cleanName(session.name)).includes(q)) return true;
      return false;
    });
  }

  const sortCol = columns.find((c) => c.key === sortKey);
  const sorted = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const get = sortCol.sortVal || ((r) => r[sortCol.key]);
    const va = get(a), vb = get(b);
    let cmp;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va ?? "").localeCompare(String(vb ?? ""));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Totals for any column flagged with `sum` (net is derived via calcNet).
  const totals = {};
  columns.forEach((c) => {
    if (!c.sum) return;
    totals[c.sum] = c.key === "net"
      ? rows.reduce((s, r) => s + calcNet(r), 0)
      : rows.reduce((s, r) => s + (Number(r[c.sum]) || 0), 0);
  });
  const hasTotals = Object.keys(totals).length > 0;

  if (!rows.length) return <Empty pad>No records in this table yet.</Empty>;

  const thStyle = maxHeight ? { position: "sticky", top: 0, zIndex: 1, background: C.surface } : null;
  const dl = { fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, marginBottom: 2 };
  const dv = { fontSize: 13, color: C.ink, wordBreak: "break-word" };

  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto", ...(maxHeight ? { maxHeight, overflowY: "auto" } : {}) }}>
        <table className="sb-table">
          <thead><tr>
            <th style={{ width: 28, ...thStyle }} />
            {columns.map((c) => {
              const active = sortKey === c.key;
              return (
                <th key={c.key} onClick={() => onSort(c.key)}
                  style={{ textAlign: c.align || "left", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", color: active ? C.brand : undefined, ...thStyle }}>
                  {c.label}
                  <span style={{ marginLeft: 4, opacity: active ? 1 : 0.25, fontSize: 10 }}>{active ? (sortDir === "asc" ? "▲" : "▼") : "▲"}</span>
                </th>
              );
            })}
          </tr></thead>
          <tbody>
            {sorted.map((r) => (
              <Fragment key={r.id}>
                <tr className="sb-trow" onClick={() => toggle(r.id)} style={{ cursor: "pointer" }}>
                  <td style={{ textAlign: "center", color: C.ink3, padding: "0 6px" }}>
                    <ChevronRight size={14} style={{ transform: expanded[r.id] ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                  </td>
                  {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left" }}>{c.render(r, ctx)}</td>)}
                </tr>
                {expanded[r.id] && (
                  <tr>
                    <td />
                    <td colSpan={columns.length} style={{ padding: "4px 12px 16px", borderBottom: `1px solid ${C.lineSoft}`, background: C.surfaceAlt, whiteSpace: "normal" }}>
                      <div style={{ padding: "10px 4px 6px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px 24px" }}>
                          {Object.keys(r).map((k) => (
                            <div key={k}>
                              <div style={dl}>{humanizeFieldKey(k)}</div>
                              <div style={dv}>{formatRecordFieldValue(k, r[k])}</div>
                            </div>
                          ))}
                        </div>
                        {canEdit && onOpen && (
                          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.lineSoft}` }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onOpen({ db: section, record: r }); }}
                              style={{ background: C.brand, color: "#fff", border: "none", borderRadius: 8, fontWeight: 600, fontSize: 12.5, padding: "8px 16px", cursor: "pointer" }}>
                              Edit record
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
          {hasTotals && (
            <tfoot><tr>
              <td />
              {columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: c.align || "left" }}>
                  {i === 0 ? <span style={{ color: C.ink3, fontSize: 12 }}>{rows.length} record{rows.length !== 1 ? "s" : ""}</span> : (c.sum && totals[c.sum] != null ? <strong>{money(totals[c.sum])}</strong> : "")}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   PARTNER PIPELINE (14-stage horizontal kanban)
   ============================================================ */
const STAGE_GROUPS = [
  { label: "Prospecting", stages: ["Target identified", "Researched", "Initial outreach sent", "Follow-up needed"], color: "#8AAFD0" },
  { label: "Qualifying", stages: ["Discovery call booked", "Demo session offered", "Demo completed"], color: "#4A90D9" },
  { label: "Closing", stages: ["Pilot proposed", "Agreement sent", "Agreement signed", "First session scheduled"], color: C.brand },
  { label: "Active", stages: ["Pilot completed", "Recurring partner"], color: C.brandDeep },
  { label: "Closed Lost", stages: ["Lost / not a fit"], color: "#9FB2CC" },
];

function PartnerPipelineView({ groups, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Phase headers */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, overflowX: "auto", paddingBottom: 0 }}>
        {STAGE_GROUPS.map((ph) => (
          <div key={ph.label} style={{
            minWidth: ph.stages.length * 200, flex: `${ph.stages.length} 0 ${ph.stages.length * 200}px`,
            background: hexA(ph.color, 0.12), border: `1px solid ${hexA(ph.color, 0.3)}`,
            borderRadius: "10px 10px 0 0", padding: "8px 14px", marginRight: 2,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: ph.color }}>
              {ph.label}
            </span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {groups.map((g) => {
          const totalPotential = g.cards.reduce((a, r) => a + (Number(r.revenuePotential) || 0), 0);
          return (
            <div key={g.key} style={{ minWidth: 198, width: 198, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              {/* Column head */}
              <div style={{
                padding: "10px 10px 8px",
                background: hexA(g.color, 0.08),
                borderLeft: `3px solid ${g.color}`,
                borderBottom: `1px solid ${C.line}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: g.color === "#9FB2CC" ? C.ink3 : g.color }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: C.ink3, fontWeight: 600, background: C.surface, padding: "1px 6px", borderRadius: 10 }}>{g.cards.length}</span>
                </div>
                {totalPotential > 0 && (
                  <div style={{ fontSize: 10.5, color: C.ink3 }}>{money(totalPotential)} potential</div>
                )}
              </div>

              {/* Cards */}
              <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                {g.cards.length === 0
                  ? <div style={{ border: `1px dashed ${C.line}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", color: C.ink3, fontSize: 12 }}>—</div>
                  : g.cards.map((r) => (
                    <button key={r.id} onClick={() => onOpen(r)} style={{
                      width: "100%", textAlign: "left", background: C.surface,
                      border: `1px solid ${C.line}`, borderLeft: `3px solid ${g.color}`,
                      borderRadius: 9, padding: "10px 10px 8px", cursor: "pointer",
                      transition: "box-shadow .12s, transform .12s",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 14px ${hexA(C.brandDeep, 0.1)}`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{cleanName(r.name)}</div>
                      {r.studioType && <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{fmtStudioType(r.studioType)}{r.location ? ` · ${r.location.split(",")[0]}` : ""}</div>}
                      {r.contact && <div style={{ fontSize: 11.5, color: C.ink2 }}>{r.contact}</div>}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                        {r.closeProbability && r.closeProbability !== "Low" && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                            background: hexA(CLOSE_PROB_COLOR[r.closeProbability], 0.15),
                            color: CLOSE_PROB_COLOR[r.closeProbability] }}>{r.closeProbability}</span>
                        )}
                        {r.revenuePotential > 0 && (
                          <span style={{ fontSize: 10.5, color: C.ink3 }}>{money(r.revenuePotential)}</span>
                        )}
                        {r.nextAction && (
                          <span style={{ fontSize: 10.5, color: r.nextAction <= new Date().toISOString().slice(0,10) ? "#C0573F" : C.ink3 }}>
                            → {fmtDate(r.nextAction)}
                          </span>
                        )}
                      </div>
                      {/* Checklist mini progress */}
                      {(() => {
                        const cl = r.checklist || {};
                        const d = Object.values(cl).filter(Boolean).length;
                        const t = PARTNER_CHECKLIST.length;
                        if (d === 0) return null;
                        const pct = Math.round((d / t) * 100);
                        const col = pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold;
                        return (
                          <div style={{ marginTop: 7 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 9.5, color: C.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>Launch checklist</span>
                              <span style={{ fontSize: 9.5, color: col, fontWeight: 700 }}>{d}/{t}</span>
                            </div>
                            <div style={{ height: 4, background: C.line, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })()}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BOARD
   ============================================================ */
function BoardView({ groups, onOpen, cardKeys, ctx, section }) {
  return (
    <div className="sb-board">
      {groups.map((g) => (
        <div key={g.key} className="sb-col">
          <div className="sb-colhead">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Dot color={g.color} /> <span style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</span>
            </span>
            <span style={{ color: C.ink3, fontSize: 12 }}>{g.cards.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.cards.length === 0 && <div className="sb-emptycard">—</div>}
            {g.cards.map((r) => (
              <button key={r.id} className="sb-bcard" onClick={() => onOpen(r)} style={{ borderLeft: `3px solid ${g.color}` }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>
                  {section === "offers" || section === "followups" ? clientShort(ctx.derived.clientName[r.clientId] || cleanName(r.name)) : cleanName(r.name)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cardKeys.map((k) => cardChip(k, r, ctx)).filter(Boolean)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function cardChip(k, r, ctx) {
  if (k === "clientType" && r.clientType) return <MiniChip key={k} color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3}>{r.clientType}</MiniChip>;
  if (k === "tags" && r.tags && r.tags.length) return (
    <div key={k} style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {r.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: hexA(TAG_COLOR[t] || C.ink3, 0.15), color: TAG_COLOR[t] || C.ink3 }}>{t}</span>)}
      {r.tags.length > 2 && <span style={{ fontSize: 10, color: C.ink3 }}>+{r.tags.length - 2}</span>}
    </div>
  );
  if (k === "nextSession" && r.nextSession) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextSession)}</MiniChip>;
  if (k === "nextAction" && r.nextAction) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextAction)}</MiniChip>;
  if (k === "packageType" && r.packageType && r.packageType !== "None") return <MiniChip key={k}>{r.packageType}</MiniChip>;
  if (k === "referral" && r.referral) return <MiniChip key={k} color={REFERRAL_COLOR[r.referral]}>{r.referral} referral</MiniChip>;
  if (k === "location" && r.location) return <MiniChip key={k}>{r.location.split(",")[0]}</MiniChip>;
  if (k === "contact" && r.contact) return <MiniChip key={k}>{r.contact}</MiniChip>;
  if (k === "studioType" && r.studioType) return <MiniChip key={k}>{fmtStudioType(r.studioType)}</MiniChip>;
  if (k === "closeProbability" && r.closeProbability) return <MiniChip key={k} color={CLOSE_PROB_COLOR[r.closeProbability]}>{r.closeProbability}</MiniChip>;
  if (k === "stage") return null;
  if (k === "clientId") { const n = ctx.derived.clientName[r.clientId]; return n ? <MiniChip key={k}>{clientShort(n)}</MiniChip> : null; }
  if (k === "outcome") return r.outcome ? <MiniChip key={k} color={C.brand}>done</MiniChip> : <MiniChip key={k} color={C.gold}>pending</MiniChip>;
  return null;
}

/* ============================================================
   CALENDAR (month)
   ============================================================ */
function sessionStartSortKey(session) {
  if (session.date && session.time) {
    const t = Date.parse(`${session.date} ${session.time}`);
    if (!Number.isNaN(t)) return t;
    const t24 = Date.parse(`${session.date}T${session.time.slice(0, 5)}`);
    if (!Number.isNaN(t24)) return t24;
  }
  if (session.date) {
    const t = Date.parse(`${session.date}T23:59:59`);
    if (!Number.isNaN(t)) return t;
  }
  return Number.MAX_SAFE_INTEGER;
}

function CalendarView({ rows, today, derived, data, onOpen }) {
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [calSearch, setCalSearch] = useState("");
  const [y, m] = cursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay();
  const daysIn = new Date(y, m, 0).getDate();

  // O(1) client lookups while building session→client-names and session→amount maps.
  const clientById = useMemo(
    () => new Map((data?.clients || []).map(c => [c.id, c])),
    [data?.clients],
  );
  // Partner name lookup by lower-cased cleaned name — used by the fallback studio resolver.
  const partnerByName = useMemo(
    () => new Map((data?.partners || []).map(p => [
      (p.name || "").replace(/^sample\s*-\s*/i, "").toLowerCase(), p,
    ])),
    [data?.partners],
  );

  const sessionClientNames = useMemo(() => {
    const map = {};
    const amounts = {};
    (data?.registrations || []).forEach(reg => {
      if (!reg.sessionId) return;
      const client = clientById.get(reg.clientId);
      if (client) (map[reg.sessionId] ||= []).push(cleanName(client.name));
      if (reg.status !== "canceled" && amounts[reg.sessionId] == null) {
        const amt = registrationSessionAmount(reg);
        if (amt != null) amounts[reg.sessionId] = amt;
      }
    });
    return { names: map, amounts };
  }, [data?.registrations, clientById]);
  const sessionClientNamesMap = sessionClientNames.names;
  const sessionAmounts = sessionClientNames.amounts;

  // Filter rows by calendar search (name, studio, journey, client)
  const filteredRows = calSearch.trim()
    ? rows.filter(s => {
        const q = norm(calSearch);
        const studioName = derived.partnerName[s.studioId] ? norm(cleanName(derived.partnerName[s.studioId])) : "";
        const journey    = norm(s.journey || s.name || "");
        const sesName    = norm(s.name || "");
        const clients    = (sessionClientNamesMap[s.id] || []).map(n => norm(n)).join(" ");
        return studioName.includes(q) || journey.includes(q) || sesName.includes(q) || clients.includes(q);
      })
    : rows;

  const byDay = {};
  filteredRows.forEach((s) => { if (s.date && s.date.slice(0, 7) === cursor) (byDay[Number(s.date.slice(8, 10))] ||= []).push(s); });
  Object.values(byDay).forEach((daySessions) => daySessions.sort((a, b) => sessionStartSortKey(a) - sessionStartSortKey(b)));
  const shift = (n) => { let mm = m + n, yy = y; if (mm < 1) { mm = 12; yy--; } if (mm > 12) { mm = 1; yy++; } setCursor(`${yy}-${String(mm).padStart(2, "0")}`); };
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  // sessionClientName: first client name per session (for pill labels)
  const sessionClientName = {};
  Object.entries(sessionClientNamesMap).forEach(([sid, names]) => { sessionClientName[sid] = names[0]; });

  // Resolve the studio partner for a session. Prefer studioId, but fall back to matching a
  // partner by name in the session name / location address when studioId is missing or points
  // to a deleted/re-created partner. Keeps studio bookings styled correctly even when the
  // studioId backfill hasn't run yet. Virtual (zoom/custom or "virtual" in the name) is excluded.
  const looksVirtual = (s) =>
    s.locationType === "zoom" || s.locationType === "custom" || /\b(virtual|zoom|online)\b/i.test(s.name || "");
  // O(k) scan over partner names once per session instead of a fresh .find() call each time.
  const resolveStudioName = (s) => {
    if (s.studioId && derived.partnerName[s.studioId]) return cleanName(derived.partnerName[s.studioId]);
    if (looksVirtual(s)) return "";
    const hay = `${s.name || ""} ${s.locationAddress || ""}`.toLowerCase();
    for (const [pName, p] of partnerByName) {
      if (pName.length > 2 && hay.includes(pName)) return cleanName(p.name);
    }
    return "";
  };
  const isStudio = (s) => !!resolveStudioName(s);

  const spotsLeft = (s) => {
    const cap = Number(s.capacity) || 0;
    const reg = Number(s.registered) || 0;
    if (!cap) return null;
    return Math.max(0, cap - reg);
  };

  const stripStudioPrefix = (label, studioName) => {
    if (!studioName || !label) return label;
    // Remove "Studio Name - " or "Studio Name – " prefix (case-insensitive)
    const escaped = studioName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return label.replace(new RegExp(`^${escaped}\\s*[-–]\\s*`, "i"), "").trim() || label;
  };

  const pillLabel = (s) => {
    const partner = resolveStudioName(s);
    const clientName = sessionClientName[s.id] || "";
    const rawName = cleanName(s.name);
    let journeyLabel = partner
      ? (s.journey || rawName)
      : (rawName.includes(" - ") ? rawName.slice(rawName.indexOf(" - ") + 3) : rawName);
    // Strip the studio name prefix if it leaked into the journey/name field
    if (partner) journeyLabel = stripStudioPrefix(journeyLabel, partner);
    const spots = spotsLeft(s);
    const spotsTag = spots != null ? `${spots} spot${spots !== 1 ? "s" : ""} left` : "";
    const amountTag = sessionAmounts[s.id] != null
      ? (sessionAmounts[s.id] === 0 ? "Free" : money(sessionAmounts[s.id]))
      : "";
    // Studio: Studio · Location · spots left  |  Virtual: Client · Journey · amount
    const parts = partner
      ? [partner, journeyLabel, spotsTag, amountTag]
      : [clientName, journeyLabel, amountTag];
    return parts.filter(Boolean).join(" · ");
  };

  const pillTitle = (s) => {
    const studioName = resolveStudioName(s);
    const isVirtual = !studioName;
    if (isVirtual) {
      const clientName = sessionClientName[s.id] || "";
      const journey = s.journey || cleanName(s.name);
      return [clientName, journey].filter(Boolean).join(" - ");
    }
    const journey = s.journey || cleanName(s.name);
    const spots = spotsLeft(s);
    const spotsInfo = spots != null ? `${spots} of ${s.capacity} spots remaining` : "";
    return [studioName, journey, spotsInfo].filter(Boolean).join(" - ");
  };

  return (
    <div className="sb-card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: 480 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0, gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600 }}>{MONTHS[m - 1]} {y}</div>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 280 }}>
          <Search size={13} color={C.ink3} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={calSearch}
            onChange={e => setCalSearch(e.target.value)}
            placeholder="Search client, studio, journey…"
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: calSearch ? 26 : 10, paddingTop: 6, paddingBottom: 6, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: C.surface, outline: "none" }}
          />
          {calSearch && (
            <button onClick={() => setCalSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: C.ink3, display: "flex", alignItems: "center", gap: 10, marginRight: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: LANE.b2b.color, display: "inline-block" }} />Studio
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, display: "inline-block" }} />Virtual / Private
            </span>
          </span>
          <button className="sb-iconbtn" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <button className="sb-iconbtn" onClick={() => setCursor(today.slice(0, 7))} style={{ width: "auto", padding: "0 12px", fontSize: 13 }}>Today</button>
          <button className="sb-iconbtn" onClick={() => shift(1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Day-of-week labels — fixed row, not part of the stretching grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, flexShrink: 0, marginBottom: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="sb-caldow">{d}</div>
        ))}
      </div>

      {/* Date cells — flex:1 so rows fill remaining height */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", gap: 6, overflow: "hidden" }}>
        {cells.map((d, i) => {
          const iso = d ? `${cursor}-${String(d).padStart(2, "0")}` : null;
          const isToday = iso === today;
          return (
            <div key={i} className="sb-calcell" style={{
              background: d ? (isToday ? C.brandMist : C.surface) : "transparent",
              border: d ? `1px solid ${isToday ? C.brand : C.line}` : "none",
              minHeight: 0,
            }}>
              {d && <div style={{ fontSize: 11, color: isToday ? C.brand : C.ink3, fontWeight: isToday ? 700 : 500, marginBottom: 4 }}>{d}</div>}
              {(byDay[d] || []).map((s) => {
                const studio = isStudio(s);
                const spots = spotsLeft(s);
                const almostFull = spots != null && spots <= 3;
                return (
                  <button key={s.id}
                    onClick={() => onOpen(s)}
                    title={pillTitle(s)}
                    style={{
                      fontSize: 10.5, fontWeight: 600, border: "none", borderRadius: 5,
                      padding: "3px 5px", cursor: "pointer", textAlign: "left",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      width: "100%", display: "block",
                      background: studio ? hexA(LANE.b2b.color, 0.15) : C.brandSoft,
                      color: studio ? LANE.b2b.text : C.brandDeep,
                      borderLeft: studio ? `3px solid ${almostFull ? "#C0573F" : LANE.b2b.color}` : `3px solid ${C.brand}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = studio ? LANE.b2b.color : C.brand; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = studio ? hexA(LANE.b2b.color, 0.15) : C.brandSoft; e.currentTarget.style.color = studio ? LANE.b2b.text : C.brandDeep; }}>
                    {pillLabel(s)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   RECORD DRAWER (view / edit / create)
   ============================================================ */
const FIELDS = {
  clients: [
    f("name", "Name", "text", { title: true }),
    f("phone", "Phone", "phone"), f("email", "Email", "email"),
    f("sessionsAttended", "Sessions attended", "number"),
    f("firstSession", "First session", "date"), f("lastSession", "Last session", "date"),
    f("nextSession", "Next session", "date"),
    f("notes", "Emotional notes", "textarea"),
    f("status", "Status", "select", { options: () => getS().clientStatuses }),
    f("clientType", "Client type", "select", { options: () => getS().clientTypes }),
    f("source", "Source", "select", { options: () => getS().sources }),
    f("referral", "Referral potential", "select", { options: () => getS().referralLevels }),
    f("packageType", "Package type", "select", { options: () => getS().packageTypes }),
    f("tags", "Intent tags", "multiselect", { options: INTENT_TAGS, colorMap: TAG_COLOR }),
    f("lifetimeValue", "Lifetime value", "currency"),
  ],
  partners: [
    f("name", "Studio name", "text", { title: true }),
    f("location", "Location", "text", { wide: true }),
    f("contact", "Contact name", "text"),
    f("role", "Role", "dropdown", { options: ["Owner", "Manager", "Director", "GM", "Instructor"] }),
    f("email", "Email", "email"), f("phone", "Phone", "phone"),
    f("source", "Lead source", "select", { options: OUTREACH_SOURCE }),
    f("painPoint", "Pain point", "textarea"),
    f("proposedPackage", "Proposed package", "text"),
    f("estimatedCommunitySize", "Est. community size", "number"),
    f("bestFitJourney", "Best-fit journey", "text"),
    f("revenuePotential", "Revenue potential", "currency"),
    f("studioType", "Studio type", "tagselector", { options: STUDIO_TYPE }),
    f("closeProbability", "Close probability", "select", { options: CLOSE_PROB }),
    f("stage", "Pipeline stage", "select", { options: STAGE }),
    f("studioSharePct", "Studio revenue share % (studio's cut)", "number"),
    f("contractStatus", "Contract status", "select", { options: CONTRACT_STATUS }),
    f("outreachDate", "First outreach date", "date"),
    f("lastTouch", "Last touch date", "date"),
    f("nextAction", "Next action date", "date"),
    f("avgAttendance", "Avg attendance", "number"),
    f("sessionsPerMonth", "Sessions per month", "number"),
    f("insuranceReqs", "Insurance requirements", "textarea"),
    f("promotionCommitments", "Promotion commitments", "textarea"),
    f("notes", "Conversation notes", "textarea"),
  ],
  sessions: [
    f("name", "Session name", "text", { title: true }), f("studioId", "Studio", "relation", { target: "partners" }),
    f("status", "Status", "select", { options: SESSION_STATUS }),
    f("journey", "Journey used", "select", { options: () => (getS().journeyDescriptions || []).map(j => j.name).filter(Boolean) }),
    f("date", "Date", "date"), f("time", "Time", "text"), f("durationMins", "Duration (mins)", "number"),
    f("capacity", "Room capacity", "number"), f("registered", "Registered attendees", "number"),
    f("attendance", "Actual attendance", "number"), f("paidAttendees", "Paid attendees", "number"),
    f("waivers", "Waivers completed", "number"), f("noShows", "No-shows", "number"),
    f("pricePerSeat", "Price per attendee (studio sessions)", "currency"),
    f("revenue", "Gross revenue", "currency"), f("studioSplit", "Studio split (paid out)", "currency"),
    f("netRevenue", "Your net revenue", "currency"),
    f("conversion", "Package conversion rate", "percent"), f("packagesSold", "Packages sold", "number"),
    f("referralsGenerated", "Referrals generated", "number"),
    f("testimonialsCapt", "Testimonials captured", "number"),
    f("roomSetupStatus", "Room setup status", "select", { options: SETUP_STATUS }),
    f("musicSetupStatus", "Music/headset status", "select", { options: SETUP_STATUS }),
    f("equipmentNeeded", "Equipment needed", "textarea"),
    f("breakthroughNoted", "Breakthrough noted?", "checkbox"),
    f("notes", "Session notes", "textarea"),
    f("locationAddress", "Studio Address", "text"),
    f("locationType",   "Location Type", "select", { options: ["zoom", "physical", "custom", "phone", "other"] }),
    f("locationJoinUrl","Zoom / Join URL", "text"),
    f("calendlyEventUri", "Calendly Event URI", "text"),
  ],
  offers: [
    f("name", "Offer", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("offerType", "Offer type", "select", { options: () => getS().offerTypes }), f("price", "Amount", "currency"),
    f("status", "Status", "select", { options: OFFER_STATUS }),
    f("probability", "Close probability", "select", { options: OFFER_PROB }),
    f("source", "Source", "select", { options: () => getS().sources }),
    f("dateOffered", "Date offered", "date"), f("expireDate", "Expiration date", "date"), f("followUpDate", "Follow-up date", "date"),
    f("notes", "Notes", "textarea"), f("reasonLost", "Reason lost", "text"),
  ],
  revenue: [
    f("name", "Description", "text", { title: true }), f("date", "Date", "date"),
    f("channel", "Channel", "select", { options: REV_CHANNEL }),
    f("gross", "Gross revenue", "currency"), f("stripeFee", "Processing fee (Stripe)", "currency"),
    f("studioSplit", "Studio split", "currency"), f("facilitatorCost", "Facilitator cost", "currency"), f("refunds", "Refunds", "currency"),
    f("source", "Source", "select", { options: SOURCE }), f("campaign", "Campaign", "text"),
    f("sessionId", "Session", "relation", { target: "sessions" }), f("clientId", "Client", "relation", { target: "clients" }),
    f("costCenter", "Cost center", "select", { options: COST_CENTER }), f("notes", "Notes", "textarea"),
  ],
  content: [
    f("name",          "Post title / idea",       "text",     { title: true }),
    f("category",      "Content category",        "select",   { options: CONTENT_CATEGORY }),
    f("status",        "Status",                  "select",   { options: CONTENT_STATUS }),
    f("platform",      "Platform",                "select",   { options: PLATFORM }),
    f("body",          "Draft / caption",         "textarea"),
    f("cta",           "Call to action",          "select",   { options: CONTENT_CTA }),
    f("scheduledDate", "Scheduled date",          "date"),
    f("datePosted",    "Published date",          "date"),
    f("sessionId",     "Session promoted",        "relation", { target: "sessions" }),
    f("partnerId",     "Studio partner tagged",   "relation", { target: "partners" }),
    f("reused",        "Repurposed content?",     "checkbox"),
    f("reach",         "Reach",                   "number"),
    f("likes",         "Likes",                   "number"),
    f("comments",      "Comments",                "number"),
    f("shares",        "Shares",                  "number"),
    f("saves",         "Saves",                   "number"),
    f("leads",         "Leads generated",         "number"),
    f("booked",        "Sessions booked",         "number"),
    f("revenue",       "Revenue attributed ($)",  "currency"),
    f("notes",         "Notes",                   "textarea"),
  ],
  followups: [
    f("name", "Follow-up", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("stage", "Stage", "select", { options: STATUS }), f("futype", "Follow-up type", "select", { options: FUTYPE }),
    f("lastContact", "Last contact", "date"), f("nextAction", "Next action", "date"), f("outcome", "Outcome", "textarea"),
  ],
  referrals: [
    f("referrerId", "Referred by (client)", "relation", { target: "clients" }),
    f("referredName", "Referred person", "text", { title: true }),
    f("referredId", "Referred client (if joined)", "relation", { target: "clients" }),
    f("date", "Referral date", "date"),
    f("status", "Status", "select", { options: REF_STATUS }),
    f("revenue", "Revenue from referral", "currency"),
    f("thankYouSent", "Thank-you sent?", "checkbox"),
    f("rewardGiven", "Reward given?", "checkbox"),
    f("notes", "Notes", "textarea"),
  ],
  outreach: [
    f("name",             "Target / org name",    "text",     { title: true }),
    f("targetType",       "Target type",          "select",   { options: OUTREACH_TARGET_TYPE }),
    f("contactName",      "Contact person",       "text"),
    f("email",            "Email",                "email"),
    f("phone",            "Phone",                "text"),
    f("location",         "Location",             "text"),
    f("source",           "How found",            "select",   { options: OUTREACH_SOURCE }),
    f("painPoint",        "Pain point",           "textarea"),
    f("proposedPackage",  "Proposed package",     "text"),
    f("warmth",           "Relationship warmth",  "select",   { options: OUTREACH_WARMTH }),
    f("priority",         "Priority",             "select",   { options: OUTREACH_PRIORITY }),
    f("status",           "Contact status",       "select",   { options: OUTREACH_STATUS }),
    f("responseStatus",   "Response status",      "select",   { options: OUTREACH_RESPONSE }),
    f("outreachMessage",  "Message / script used","textarea"),
    f("lastContact",      "Last contact date",    "date"),
    f("nextFollowUp",     "Next follow-up date",  "date"),
    f("revenuePotential", "Revenue potential",    "currency"),
    f("partnerId",        "Linked studio partner","relation",  { target: "partners" }),
    f("notes",            "Notes",                "textarea"),
  ],
  testimonials: [
    f("name",            "Testimonial title",      "text",       { title: true }),
    f("clientId",        "Client",                 "relation",   { target: "clients" }),
    f("sessionId",       "Session attended",       "relation",   { target: "sessions" }),
    f("status",          "Status",                 "select",     { options: TESTIMONIAL_STATUS }),
    f("type",            "Type",                   "select",     { options: TESTIMONIAL_TYPE }),
    f("content",         "Full testimonial",       "textarea"),
    f("bestQuote",       "Best quote",             "textarea"),
    f("beforeSummary",   "Before (client state)",  "textarea"),
    f("afterSummary",    "After (what shifted)",   "textarea"),
    f("themes",          "Themes",                 "multiselect",{ options: TESTIMONIAL_THEMES }),
    f("permissionReceived","Permission received?", "checkbox"),
    f("useOnWebsite",    "Use on website?",        "checkbox"),
    f("useOnSocial",     "Use on social?",         "checkbox"),
    f("firstNameOnly",   "First name only?",       "checkbox"),
    f("videoUrl",        "Video URL",              "text"),
    f("dateReceived",    "Date received",          "date"),
    f("datePublished",   "Date published",         "date"),
    f("notes",           "Notes",                  "textarea"),
  ],
  templates: [
    f("name",      "Template name",      "text",     { title: true }),
    f("subject",   "Email subject line", "text"),
    f("body",      "Message body",       "textarea", { rows: 9 }),
    f("notes",     "Notes / usage tips", "textarea"),
    f("variables", "Variables (e.g. {{clientName}})", "text"),
    f("category",  "Category",           "select",   { options: TMPL_CATEGORY }),
    f("channel",   "Channel",            "select",   { options: TMPL_CHANNEL }),
    f("linkedTo",  "Linked to",          "select",   { options: TMPL_LINKED_TO }),
  ],
  expenses: [
    f("date",          "Date",             "date",     { title: true }),
    f("vendor",        "Vendor / Payee",   "text"),
    f("description",   "Description",      "text"),
    f("amount",        "Amount ($)",       "number"),
    f("category",      "Category",         "select",   { options: EXPENSE_CATEGORY }),
    f("paymentMethod", "Payment Method",   "select",   { options: EXPENSE_PAYMENT_METHOD }),
    f("taxDeductible", "Tax Deductible?",  "checkbox"),
    f("recurring",     "Recurring?",       "checkbox"),
    f("recurringFreq", "Frequency",        "select",   { options: EXPENSE_RECUR_FREQ }),
    f("linkedSession", "Linked Session",   "text"),
    f("linkedPartner", "Linked Studio",    "text"),
    f("receiptUrl",    "Receipt URL",      "text"),
    f("stripeRefundId","Stripe Refund ID", "text"),
    f("notes",         "Notes",            "textarea"),
  ],
  registrations: [
    f("eventName",      "Event / Session Name",        "text",     { title: true }),
    f("clientId",       "Client",                      "relation", { target: "clients" }),
    f("status",         "Booking Status",              "select",   { options: ["booked", "attended", "canceled", "rescheduled", "no_show"] }),
    f("paymentAmount",  "Session Price ($)",           "number"),
    f("paymentStatus",  "Payment Status",              "select",   { options: ["paid", "pending_verification", "unmatched", "unpaid", "partial_refund", "refunded", "failed", "unknown"] }),
    f("paidAmount",     "Stripe Amount Paid ($)",      "number"),
    f("paidAt",         "Stripe Paid At",              "text"),
    f("stripeVerified", "Stripe Verified?",            "checkbox"),
    f("stripePaymentIntentId", "Stripe Payment Intent ID", "text"),
    f("stripeChargeId", "Stripe Charge ID",            "text"),
    f("paymentId",      "Linked Payment Record",       "text"),
    f("amountRefunded", "Amount Refunded ($)",         "number"),
    f("stripeRefundId", "Stripe Refund ID",            "text"),
    f("refundedAt",     "Refunded At",                 "text"),
    f("waiverStatus",   "Waiver Status",               "select",   { options: ["pending", "signed"] }),
    f("createdAt",      "Scheduled On",                "text"),
    f("scheduledAt",    "Session Date/Time",           "text"),
    f("timezone",       "Timezone",                    "text"),
    f("locationType",   "Location Type",               "select",   { options: ["zoom", "physical", "custom", "phone", "other"] }),
    f("locationJoinUrl","Zoom / Join URL",             "text"),
    f("locationAddress","In-Person Address",           "text"),
    f("attendanceType", "Attending Virtually or In Person", "text"),
    f("checkedIn",      "Checked In?",                 "checkbox"),
    f("attended",       "Attended?",                   "checkbox"),
    f("noShow",         "No Show?",                    "checkbox"),
    f("doneBreathworkBefore", "Done Breathwork Before?", "text"),
    f("howHeard",       "How Did They Hear About Us?", "text"),
    f("referredBy",     "Referred By",                 "text"),
    f("concerns",       "Physical / Emotional Concerns", "textarea"),
    f("reviewedContraindications", "Reviewed Contraindications?", "text"),
    f("calendlyInviteeUri", "Calendly Invitee URI",    "text"),
    f("calendlyEventUri",   "Calendly Event URI",      "text"),
    f("notes",          "Notes",                       "textarea"),
  ],
};
function f(key, label, type, opts = {}) { return { key, label, type, ...opts }; }

function resolveDrawerTab(preferred, { db, isNew, hasTimeline, hasSessionTabs, hasChecklist }) {
  if (!preferred || preferred === "details") return "details";
  if (preferred === "timeline" && hasTimeline) return "timeline";
  if (preferred === "checklist" && (hasChecklist || hasSessionTabs)) return "checklist";
  if (hasSessionTabs && ["session-checklist", "bookings", "performance"].includes(preferred)) return preferred;
  return "details";
}

function RecordDrawer({ db, record, data, derived, today, crmSettings, onClose, onSave, onDelete, onOpenRelated, sequences, onStartSequence, initialTab, setData, cryptoKey, actionContact, onSync, refundToken }) {
  const isNew = !(data[db] || []).some((r) => r.id === record.id);
  const hasTimeline = (db === "clients" || db === "partners") && !isNew;
  const hasChecklist = db === "partners" && !isNew;
  const hasSessionTabs = db === "sessions" && !isNew;
  const tabCtx = { db, isNew, hasTimeline, hasSessionTabs, hasChecklist };
  const pickTab = (t) => resolveDrawerTab(t, tabCtx);

  const [draft, setDraft] = useState(record);
  const [tab, setTab] = useState(() => pickTab(initialTab));
  const [perfSyncing, setPerfSyncing] = useState(false);
  const [showJourneyDesc, setShowJourneyDesc]       = useState(false);
  const [showCalendlyDesc, setShowCalendlyDesc]     = useState(false);
  const [fetchedCalendlyDesc, setFetchedCalendlyDesc] = useState(null); // null = not yet fetched
  const [fetchingCalendlyDesc, setFetchingCalendlyDesc] = useState(false);
  const [calendlyDescFetchError, setCalendlyDescFetchError] = useState("");
  const [showCancelCalendly, setShowCancelCalendly] = useState(false);
  const [cancelCalendlyBusy, setCancelCalendlyBusy] = useState(false);
  // Derived counts computed from live registrations — read-only display values,
  // never written back to draft after the initial open (see reset effect below).
  const isStudioSession = db === "sessions" && !!record.studioId;
  const actualRegistered = isStudioSession
    ? (data.registrations || []).filter(r => r.sessionId === record.id && r.status !== "canceled").length
    : null;
  const actualSessionsAttended = db === "clients"
    ? (data.registrations || []).filter(r => r.clientId === record.id && r.status !== "canceled").length
    : null;

  useEffect(() => {
    // Seed computed-from-registrations fields at open time so the drawer shows
    // accurate counts. NOT in the dep array — we must NOT re-run when registrations
    // change mid-edit or a Calendly sync mid-edit would overwrite what the user typed.
    setDraft({
      ...record,
      ...(isStudioSession && actualRegistered != null ? { registered: actualRegistered } : {}),
      ...(db === "clients" && actualSessionsAttended != null ? { sessionsAttended: actualSessionsAttended } : {}),
    });
    setTab(pickTab(initialTab));
    setShowJourneyDesc(false);
    setShowCalendlyDesc(false);
    setFetchedCalendlyDesc(null);
    setFetchingCalendlyDesc(false);
    setCalendlyDescFetchError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record, initialTab, db, isNew]);

  const isVirtualDrawer = db === "sessions" && !record.studioId && (record.locationType === "zoom" || record.locationType === "custom" || !record.locationType);

  // Always fetch the full event-type description when the panel opens.
  useEffect(() => {
    if (!showCalendlyDesc || !isStudioSession) return;
    let cancelled = false;
    setFetchingCalendlyDesc(true);
    setCalendlyDescFetchError("");
    fetchCalendlyDescriptionForSession(draft, data.registrations)
      .then(({ description: desc, error }) => {
        if (cancelled) return;
        setFetchedCalendlyDesc(desc);
        if (error) {
          setCalendlyDescFetchError(error);
          return;
        }
        if (!desc) {
          setCalendlyDescFetchError("Calendly returned no description for this event type");
          return;
        }
        setDraft(d => {
          const merged = resolveCalendlyDescription(d.calendlyDescription, desc);
          return merged === d.calendlyDescription ? d : { ...d, calendlyDescription: merged };
        });
        // NOTE: do NOT call applyCalendlyDescriptionToSessions here — it would
        // persist the description to global data (and trigger a save) while the
        // user still has unsaved edits in the drawer.  The description is merged
        // into draft above and will be persisted when the user clicks Save.
      })
      .catch(err => {
        if (cancelled) return;
        setFetchedCalendlyDesc("");
        setCalendlyDescFetchError(err.message || "Could not load full description from Calendly");
      })
      .finally(() => { if (!cancelled) setFetchingCalendlyDesc(false); });
    return () => { cancelled = true; };
  }, [showCalendlyDesc, isStudioSession, draft.id, draft.calendlyEventUri, draft.calendlyEventTypeUri, draft.journey, draft.name, data.registrations]);

  const fields = FIELDS[db];
  if (!fields) {
    return (
      <div className="sb-drawerwrap" onClick={onClose}>
        <div className="sb-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="sb-drawerhead">
            <span className="sb-eyebrow">Record</span>
            <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="sb-drawerbody"><Empty pad>Unknown record type: {db}</Empty></div>
        </div>
      </div>
    );
  }
  const titleField = fields.find((x) => x.title) || fields[0] || { key: "name", label: "Name" };
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const handleAgreementsChange = async (nextAgreements) => {
    const prev = draft.agreements || [];
    const removed = prev.filter(a => !nextAgreements.some(n => n.id === a.id));
    set("agreements", nextAgreements);
    if (!cryptoKey) return;
    try {
      for (const a of removed) await deleteAgreementBlob(a.id);
      for (const a of nextAgreements) {
        if (a.dataUrl) await persistAgreementBlob(cryptoKey, a.id, a.dataUrl);
      }
      const stored = stripAgreementForStore(nextAgreements);
      if (setData) {
        setData(prevData => ({
          ...prevData,
          partners: (prevData.partners || []).map(p => p.id === record.id ? { ...p, agreements: stored } : p),
        }));
      }
    } catch (e) {
      console.error("Agreement save failed:", e);
      alert("Could not save the agreement file. Try a smaller PDF (under 5 MB) or free up browser storage.");
    }
  };
  // related records (used in details tab)
  const related = [];
  if (db === "clients") {
    related.push({ label: "Offers", items: (data.offers || []).filter((o) => o.clientId === draft.id), dbk: "offers", render: (o) => `${o.offerType} · ${money(o.price)} · ${o.status}` });
    related.push({ label: "Follow-ups", items: (data.followups || []).filter((x) => x.clientId === draft.id), dbk: "followups", render: (x) => `${x.futype} · ${fmtDate(x.nextAction)}${x.outcome ? " · done" : ""}` });
    const acc = derived.acceptedByClient[draft.id] || 0;
    related.unshift({ label: "Accepted offers total", note: money(acc) });
  }
  if (db === "partners") {
    const ses = derived.sessionsByStudio[draft.id] || [];
    related.push({ label: "Sessions", items: ses, dbk: "sessions", render: (s) => `${fmtDate(s.date)} · ${s.attendance} in room · ${money(s.netRevenue)} net` });
    if (ses.length) related.unshift({ label: "Logged", note: `${ses.length} sessions · avg ${Math.round(sum(ses, "attendance") / ses.length)} attending` });
  }
  const isVirtualSession = hasSessionTabs && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);

  return (
    <div className="sb-drawerwrap" onClick={onClose}>
      <div className={"sb-drawer" + (hasTimeline && tab === "timeline" ? " sb-drawer-wide" : "")}
        onClick={(e) => e.stopPropagation()}>

        {/* Accent stripe */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDeep})`, flexShrink: 0 }} />

        <div className="sb-drawerhead">
          <span className="sb-eyebrow">{isNew ? "New" : "Edit"} · {sectionLabel(db)}</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>

        {actionContact?.phone && (
          <div style={{
            padding: "12px 22px", background: C.brandMist, borderBottom: `1px solid ${C.line}`,
            display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: C.brand,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Phone size={16} color="#fff" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {actionContact.name ? `Call ${actionContact.name}` : "Phone"}
              </div>
              <a href={`tel:${String(actionContact.phone).replace(/[^\d+]/g, "")}`}
                style={{ fontSize: 16, fontWeight: 700, color: C.ink, textDecoration: "none", letterSpacing: 0.3 }}>
                {actionContact.phone}
              </a>
            </div>
          </div>
        )}

        {/* Title + tab switcher */}
        <div style={{ padding: "14px 22px 0", borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
          {/* Session: show studio + cleaned session name as formatted header */}
          {hasSessionTabs && derived.partnerName[draft.studioId] && (() => {
            const studioName = cleanName(derived.partnerName[draft.studioId]);
            const rawName = cleanName(draft.name || "");
            // Strip known prefixes ("") and date suffixes (" 6/9", " 6/11" etc.)
            const stripped = rawName
              .replace(/^sample\s*[-–]\s*/i, "")
              .replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/i, "")
              .replace(new RegExp(`^${studioName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*`, "i"), "")
              .trim();
            return (
              <div style={{ fontSize: 13, color: C.ink2, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.brand }}>{studioName}</span>
                <span style={{ color: C.ink3 }}>—</span>
                <span>{stripped}</span>
              </div>
            );
          })()}
          <div style={{ marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <input className="sb-titleinput" style={{ width: "100%", paddingRight: (isVirtualDrawer || isStudioSession) ? 32 : undefined }}
                value={draft[titleField.key] || ""} placeholder="Untitled"
                onChange={(e) => set(titleField.key, e.target.value)} />
              {isVirtualDrawer && (
                <button
                  onClick={() => setShowJourneyDesc(d => !d)}
                  title={draft.journey ? `View description for: ${draft.journey}` : "No journey selected"}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: showJourneyDesc ? C.brand : "transparent",
                    border: `1.5px solid ${showJourneyDesc ? C.brand : C.line}`,
                    borderRadius: 6, cursor: "pointer", padding: "2px 6px",
                    color: showJourneyDesc ? "#fff" : C.ink3,
                    fontSize: 12, fontWeight: 700, lineHeight: 1.4, transition: "all 0.15s",
                  }}>
                  {"\u24D8"}
                </button>
              )}
              {isStudioSession && (
                <button
                  onClick={() => setShowCalendlyDesc(d => !d)}
                  title="View studio event description"
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: showCalendlyDesc ? C.brand : "transparent",
                    border: `1.5px solid ${showCalendlyDesc ? C.brand : C.line}`,
                    borderRadius: 6, cursor: "pointer", padding: "2px 6px",
                    color: showCalendlyDesc ? "#fff" : C.ink3,
                    fontSize: 12, fontWeight: 700, lineHeight: 1.4, transition: "all 0.15s",
                  }}>
                  {"\u24D8"}
                </button>
              )}
            </div>
            {isVirtualDrawer && showJourneyDesc && (() => {
              const journeyDescs = (crmSettings?.journeyDescriptions || []);
              // Match by exact name first, then by partial containment to handle
              // Calendly event names like "9D Breathwork Virtual - The Architect Journey"
              // where the journey description is just "The Architect Journey".
              const sessionJourney = (draft.journey || "").toLowerCase();
              const match = journeyDescs.find(j => j.name && j.name.toLowerCase() === sessionJourney)
                || journeyDescs
                    .filter(j => j.name && sessionJourney.includes(j.name.toLowerCase()))
                    .sort((a, b) => b.name.length - a.name.length)[0]; // prefer longest/most-specific match
              return (
                <div style={{
                  marginTop: 8, borderRadius: 12,
                  border: `1px solid ${C.line}`,
                  background: C.surface,
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderBottom: `1px solid ${C.line}`,
                    background: hexA(C.brand, 0.06), flexShrink: 0,
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>Journey Description</div>
                      {match?.name && <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginTop: 2 }}>{match.name}</div>}
                    </div>
                    <button onClick={() => setShowJourneyDesc(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>
                      &times;
                    </button>
                  </div>
                  <div
                    style={{ ...DESC_PANEL_BODY_STYLE, color: C.ink }}
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {match?.description
                      ? match.description
                      : <span style={{ color: C.ink3, fontStyle: "italic" }}>
                          {draft.journey
                            ? `No description has been added for "${match?.name || draft.journey}" yet. Go to Admin \u2192 Journey Descriptions to add one.`
                            : "No journey selected for this session."}
                        </span>
                    }
                  </div>
                </div>
              );
            })()}
          {isStudioSession && showCalendlyDesc && (
            <div style={{
              marginTop: 8, borderRadius: 12,
              border: `1px solid ${C.line}`,
              background: C.surface,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderBottom: `1px solid ${C.line}`,
                background: hexA(C.brand, 0.06), flexShrink: 0,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>
                  Studio Event Description
                </div>
                <button onClick={() => setShowCalendlyDesc(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>
                  &times;
                </button>
              </div>
              <div
                style={{ ...DESC_PANEL_BODY_STYLE, color: C.ink }}
                onWheel={(e) => e.stopPropagation()}
              >
                {fetchingCalendlyDesc
                  ? <span style={{ color: C.ink3, fontStyle: "italic" }}>Fetching description from Calendly…</span>
                  : (() => {
                      const stored = String(draft.calendlyDescription || "").trim();
                      const desc = resolveCalendlyDescription(stored, fetchedCalendlyDesc);
                      const showFull = desc && !isTruncatedPreview(desc);
                      if (showFull) return <span style={{ color: C.ink }}>{desc}</span>;
                      if (calendlyDescFetchError) {
                        return (
                          <span style={{ color: "#B4513B", fontStyle: "italic", lineHeight: 1.6 }}>
                            {calendlyDescFetchError}
                            {isTruncatedPreview(stored) && (
                              <span style={{ display: "block", marginTop: 8, color: C.ink3 }}>
                                The stored preview is incomplete. Set CALENDLY_API_TOKEN in backend/.env and restart the backend.
                              </span>
                            )}
                          </span>
                        );
                      }
                      if (fetchedCalendlyDesc === "") {
                        return <span style={{ color: C.ink3, fontStyle: "italic" }}>No description found in Calendly for this event type.</span>;
                      }
                      return <span style={{ color: C.ink3, fontStyle: "italic" }}>Loading description from Calendly…</span>;
                    })()
                }
              </div>
            </div>
          )}
          </div>
          {(hasTimeline || hasSessionTabs) && (
            <div style={{ display: "flex", gap: 2 }}>
              {(hasSessionTabs ? [
                ["details", "Session Details"],
                ["bookings", "Bookings"],
                ["session-checklist", "Session Checklist"],
                ["performance", "Performance"],
              ] : [
                ["details", "Details"],
                ...(db === "clients" && !isNew ? [["sessions-attended", "Sessions Attended"]] : []),
                ...(db === "partners" && !isNew ? [["partner-sessions", "Sessions"]] : []),
                ...(db === "partners" && !isNew ? [["agreements", "Agreements"]] : []),
                ...(hasChecklist ? [["checklist", "Launch Checklist"]] : []),
                ["timeline", "Contact Timeline"],
              ]).map(([t, label]) => {
                const sessionBookings = t === "bookings" ? (data.registrations || []).filter(r => r.sessionId === draft.id && r.status !== "canceled") : null;
                const clientSessionCount = t === "sessions-attended" ? (data.registrations || []).filter(r => r.clientId === draft.id && r.status !== "canceled").length : null;
                const partnerSessionCount = t === "partner-sessions" ? (data.sessions || []).filter(s => s.studioId === draft.id).length : null;
                const isVirtualSession = db === "sessions" && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);
                const activeSessionChecklist = SESSION_CHECKLIST.filter(i => isVirtualSession ? i.virtual : !i.virtual);
                const activeEquipPhases = EQUIP_CHECKLIST_PHASES.map(p => ({ ...p, items: p.items.filter(i => isVirtualSession ? i.virtual : !i.virtual) })).filter(p => p.items.length);
                const activeEquipItems = activeEquipPhases.flatMap(p => p.items);
                const isStudioBookings = t === "bookings" && db === "sessions" && !!draft.studioId;
                const done = (t === "agreements") ? (draft.agreements || []).length
                           : (t === "partner-sessions") ? partnerSessionCount
                           : (t === "sessions-attended") ? clientSessionCount
                           : (t === "checklist" && db === "partners") ? Object.values(draft.checklist || {}).filter(Boolean).length
                           : (t === "session-checklist") ? activeEquipItems.filter(i => draft.equipChecklist?.[i.id]).length + activeSessionChecklist.filter(i => draft.checklist?.[i.id]).length
                           : (t === "bookings") ? sessionBookings.length : null;
                const total = (t === "checklist" && db === "partners") ? PARTNER_CHECKLIST.length
                            : (t === "session-checklist") ? activeEquipItems.length + activeSessionChecklist.length
                            : isStudioBookings ? (Number(draft.capacity) || null)
                            : (t === "bookings") ? (data.registrations || []).filter(r => r.sessionId === draft.id).length : null;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "7px 14px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", background: tab === t ? C.brand : "transparent",
                    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {label}
                    {done != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                        background: done === total ? "#4A8C6F" : tab === t ? "rgba(255,255,255,0.25)" : C.brandSoft,
                        color: done === total ? "#fff" : tab === t ? "#fff" : C.brandDeep,
                      }}>{done}{total != null ? `/${total}` : ""}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sb-drawerbody" style={{ paddingTop: 16 }}>
          {db === "clients" && tab === "sessions-attended"
            ? <ClientSessionsTab record={draft} data={data} onOpenRelated={onOpenRelated} today={today} />
            : db === "partners" && tab === "agreements"
            ? <PartnerAgreementsTab agreements={draft.agreements || []} onChange={handleAgreementsChange} cryptoKey={cryptoKey} partnerName={cleanName(draft.name)} canEdit={!!onSave} />
            : db === "partners" && tab === "partner-sessions"
            ? <PartnerSessionsTab record={draft} data={data} onOpenRelated={onOpenRelated} today={today} />
            : hasTimeline && tab === "timeline"
            ? <ContactTimeline db={db} record={draft} data={data} derived={derived} today={today} onOpenRelated={onOpenRelated} />
            : (hasChecklist || hasSessionTabs) && tab === "checklist"
            ? <PartnerLaunchChecklist checklist={draft.checklist || emptyChecklist()} onChange={(cl) => set("checklist", cl)} partnerName={cleanName(draft.name)} />
            : hasSessionTabs && tab === "bookings"
            ? <SessionBookingsTab record={draft} data={data} onOpenRelated={onOpenRelated} setData={setData} />
            : hasSessionTabs && tab === "session-checklist"
            ? <SessionChecklistPanel
                isVirtual={isVirtualSession}
                equipChecklist={draft.equipChecklist || emptyEquipChecklist()}
                onEquipChange={(cl) => set("equipChecklist", cl)}
                checklist={draft.checklist || emptySessionChecklist()}
                onChecklistChange={(cl) => set("checklist", cl)}
                sessionName={cleanName(draft.name)}
                sessionDate={draft.date}
                status={draft.status}
                sessionAmount={isVirtualSession ? (() => {
                  const reg = (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled");
                  return formatActualBookingAmount(reg, null) ?? formatRegistrationAmount(reg);
                })() : undefined}
              />
            : hasSessionTabs && tab === "performance"
            ? <div>
                <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 4px 10px" }}>
                  <button
                    onClick={async () => {
                      setPerfSyncing(true);
                      try {
                        // Pull the latest Calendly bookings + Stripe payments.
                        if (onSync) await onSync();
                      } catch { /* sync errors surface via the sidebar sync status */ }
                      // For studio sessions: write the Stripe-computed revenue/split/net back
                      // to the stored session record and the drawer draft so that Session Details
                      // stays consistent with what the Performance tab shows.
                      if (draft.studioId && setData) {
                        let computed = null;
                        setData(prev => {
                          const idx = (prev.sessions || []).findIndex(s => s.id === draft.id);
                          if (idx < 0) return prev;
                          const sess = prev.sessions[idx];
                          const fin = studioSessionFinance(sess, prev, { revenueRows: buildRegistrationRevenueRows(prev) });
                          computed = { revenue: fin.gross, studioSplit: fin.studioSplit, netRevenue: fin.net };
                          // Skip the write when nothing changed to avoid a spurious save.
                          if (Math.abs((Number(sess.revenue) || 0) - fin.gross) < 0.005
                            && Math.abs((Number(sess.studioSplit) || 0) - fin.studioSplit) < 0.005
                            && Math.abs((Number(sess.netRevenue) || 0) - fin.net) < 0.005) {
                            return prev;
                          }
                          const sessions = [...prev.sessions];
                          sessions[idx] = { ...sess, ...computed };
                          return { ...prev, sessions };
                        });
                        // React's functional-update callback runs synchronously, so `computed`
                        // is guaranteed to be set here. Sync it into draft so Session Details
                        // shows the updated figures without the drawer needing to be reopened.
                        if (computed) setDraft(d => ({ ...d, ...computed }));
                      }
                      setPerfSyncing(false);
                    }}
                    disabled={perfSyncing}
                    title="Pull latest Calendly & Stripe data and recalculate"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: perfSyncing ? "#6b7a99" : "#2E6FB0", background: "transparent", border: `1px solid ${perfSyncing ? "#d1d5db" : "#2E6FB0"}`, borderRadius: 8, cursor: perfSyncing ? "default" : "pointer", transition: "all 0.15s" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ animation: perfSyncing ? "spin 1s linear infinite" : "none" }}>
                      <polyline points="1 4 1 10 7 10" /><polyline points="23 20 23 14 17 14" />
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 0 1 3.51 15" />
                    </svg>
                    {perfSyncing ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {/* Render the LIVE stored session (not the drawer's draft snapshot) so every
                    metric — attendance, paid attendees, waivers, revenue — reflects the data
                    that just synced, without requiring the drawer to be closed and reopened. */}
                <SessionPerformance
                  record={(data.sessions || []).find(s => s.id === draft.id) || draft}
                  derived={derived} data={data} />
              </div>
            : (
              <>
                {(() => {
                  const isVirtual = db === "sessions" && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);
                  const isStudioSession = db === "sessions" && !!draft.studioId;
                  const zoomUrl = draft.locationJoinUrl;
                  const virtualHidden = new Set(["studioId", "locationAddress", "equipmentNeeded", "locationType", "locationJoinUrl", "calendlyEventUri", "roomSetupStatus", "musicSetupStatus"]);
                  const studioHidden  = new Set(["studioId", "equipmentNeeded", "capacity", "registered", "notes", "breakthroughNoted", "roomSetupStatus", "musicSetupStatus", "locationJoinUrl", "calendlyEventUri"]);
                  const baseFields = fields.filter((x) => !x.title
                    && !(isVirtual     && virtualHidden.has(x.key))
                    && !(isStudioSession && studioHidden.has(x.key)));
                  const topKeys = isStudioSession
                    ? ["date", "time", "durationMins", "locationAddress"]
                    : ["date", "time", "durationMins"];
                  const virtualOrderFirst = ["date", "time", "durationMins", "notes", "breakthroughNoted", "journey", "status"];
                  const virtualPinned = ["notes", "breakthroughNoted", "journey", "status"];
                  const visibleFields = (isVirtual || isStudioSession)
                    ? [
                        ...baseFields.filter(x => topKeys.includes(x.key)),
                        ...(isVirtual
                          ? [
                              ...baseFields.filter(x => virtualPinned.includes(x.key)).sort((a,b) => virtualOrderFirst.indexOf(a.key) - virtualOrderFirst.indexOf(b.key)),
                              ...baseFields.filter(x => !topKeys.includes(x.key) && !virtualPinned.includes(x.key)),
                            ]
                          : baseFields.filter(x => !topKeys.includes(x.key))
                        ),
                      ]
                    : baseFields;
                  const sessionClient = isVirtual
                    ? (() => {
                        const reg = (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled");
                        return reg ? (data.clients || []).find(c => c.id === reg.clientId) : null;
                      })()
                    : null;
                  const sessionReg = isVirtual
                    ? (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled")
                    : null;
                  const sessionAmountLabel = formatActualBookingAmount(sessionReg, null);
                  const studioColor = LANE.b2b.color;
                  return (
                    <div className="sb-fields">
                      {/* Virtual: show client card */}
                      {isVirtual && sessionClient && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {(sessionClient.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{cleanName(sessionClient.name)}</div>
                            {sessionClient.email && <div style={{ fontSize: 12, color: C.ink3 }}>{sessionClient.email}</div>}
                          </div>
                          {sessionAmountLabel && (
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>Session</div>
                              <div style={{ fontSize: 16, fontWeight: 800, color: sessionAmountLabel === "Free" ? C.ink3 : "#4A8C6F" }}>{sessionAmountLabel}</div>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Studio: Date + Time + Duration on one line */}
                      {isStudioSession && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
                          {["date","time","durationMins"].map(k => {
                            const fld = fields.find(x => x.key === k);
                            if (!fld) return null;
                            return (
                              <div key={k} style={{ flex: k === "date" ? 2 : 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{fld.label}</div>
                                <input
                                  type={k === "date" ? "date" : "text"}
                                  value={draft[k] || ""}
                                  onChange={e => set(k, k === "durationMins" ? Number(e.target.value) : e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.surface, color: C.ink, outline: "none" }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {visibleFields.map((fld) => {
                        if (isStudioSession && (fld.key === "date" || fld.key === "time" || fld.key === "durationMins")) return null;
                        return (
                        <React.Fragment key={fld.key}>
                          <FieldInput fld={fld} value={draft[fld.key]} onChange={(v) => set(fld.key, v)} data={data} />
                          {isStudioSession && fld.key === "locationAddress" && (() => {
                            const partner = (data.partners || []).find(p => p.id === draft.studioId);
                            const contactCard = partner && (partner.contact || partner.email || partner.phone) ? (
                              <div key="studio-contact" style={{ gridColumn: "1 / -1", background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Studio Contact</div>
                                {partner.contact && <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{partner.contact}{partner.role ? <span style={{ fontWeight: 400, color: C.ink3 }}> · {partner.role}</span> : ""}</div>}
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 2 }}>
                                  {partner.email && <a href={`mailto:${partner.email}`} style={{ fontSize: 12, color: C.brand }}>{partner.email}</a>}
                                  {partner.phone && <span style={{ fontSize: 12, color: C.ink3 }}>{partner.phone}</span>}
                                </div>
                              </div>
                            ) : null;
                            const capacityFld        = fields.find(x => x.key === "capacity");
                            const registeredFld      = fields.find(x => x.key === "registered");
                            const notesFld           = fields.find(x => x.key === "notes");
                            const breakthroughFld    = fields.find(x => x.key === "breakthroughNoted");
                            const roomSetupFld       = fields.find(x => x.key === "roomSetupStatus");
                            const musicSetupFld      = fields.find(x => x.key === "musicSetupStatus");
                            return (
                              <>
                                {contactCard}
                                {registeredFld    && <FieldInput key="reg"   fld={registeredFld}    value={draft.registered}        onChange={v => set("registered", v)}        data={data} />}
                                {capacityFld      && <FieldInput key="cap"   fld={capacityFld}      value={draft.capacity}          onChange={v => set("capacity", v)}          data={data} />}
                                <div key="setup-row" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                                  {[
                                    { label: "Room setup status", key: "roomSetupStatus", val: draft.roomSetupStatus },
                                    { label: "Music/headset status", key: "musicSetupStatus", val: draft.musicSetupStatus },
                                  ].map(({ label, key, val }) => (
                                    <div key={key} style={{ flex: 1 }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                                      <div className="sb-chiprow">
                                        {SETUP_STATUS.map(o => (
                                          <button key={o} className="sb-selchip" onClick={() => set(key, o)}
                                            style={{ background: val === o ? C.brand : C.surface, color: val === o ? "#fff" : C.ink2, borderColor: val === o ? C.brand : C.line }}>
                                            {o}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {notesFld         && <FieldInput key="notes" fld={notesFld}         value={draft.notes}             onChange={v => set("notes", v)}             data={data} />}
                                {breakthroughFld  && <FieldInput key="bk"   fld={breakthroughFld}  value={draft.breakthroughNoted} onChange={v => set("breakthroughNoted", v)} data={data} />}
                              </>
                            );
                          })()}
                          {isVirtual && fld.key === "durationMins" && (
                            <>
                              <div key="zoom-card" style={{ gridColumn: "1 / -1", background: C.brandMist, border: `1px solid ${C.brand}`, borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Zoom / Join Link</div>
                                {zoomUrl && zoomUrl.startsWith("https://") ? (
                                  <a href={zoomUrl} target="_blank" rel="noreferrer noopener"
                                    style={{ fontSize: 13, color: C.brand, fontWeight: 600, wordBreak: "break-all" }}>{zoomUrl}</a>
                                ) : (
                                  <div style={{ fontSize: 13, color: C.ink3 }}>{zoomUrl || "No Zoom link on file"}</div>
                                )}
                              </div>
                              <div key="virtual-setup-row" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                                {[
                                  { label: "Room setup status", key: "roomSetupStatus", val: draft.roomSetupStatus },
                                  { label: "Music/headset status", key: "musicSetupStatus", val: draft.musicSetupStatus },
                                ].map(({ label, key, val }) => (
                                  <div key={key} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                                    <div className="sb-chiprow">
                                      {SETUP_STATUS.map(o => (
                                        <button key={o} className="sb-selchip" onClick={() => set(key, o)}
                                          style={{ background: val === o ? C.brand : C.surface, color: val === o ? "#fff" : C.ink2, borderColor: val === o ? C.brand : C.line }}>
                                          {o}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}

                {related.length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    {related.map((rel, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div className="sb-rellabel"><Link2 size={13} /> {rel.label}{rel.note ? <span style={{ marginLeft: "auto", color: C.brand, fontWeight: 700 }}>{rel.note}</span> : null}</div>
                        {rel.items && (rel.items.length === 0
                          ? <div style={{ fontSize: 12.5, color: C.ink3, padding: "6px 2px" }}>None yet.</div>
                          : rel.items.map((it) => (
                            <button key={it.id} className="sb-relrow" onClick={() => onOpenRelated({ db: rel.dbk, record: it })}>
                              <span style={{ flex: 1, textAlign: "left" }}>{cleanName(it.name)}</span>
                              <span style={{ color: C.ink2, fontSize: 12 }}>{rel.render(it)}</span>
                              <ArrowUpRight size={13} color={C.ink3} />
                            </button>
                          )))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          {/* Email history lives in the Contact Timeline tab for both clients and partners */}
        </div>

        <div className="sb-drawerfoot">
          {!isNew && onDelete && <button className="sb-danger" onClick={() => onDelete(draft.id)}><Trash2 size={15} /> Delete</button>}
          {db === "clients" && !isNew && (() => {
            const activeSeq = (sequences || []).find(s => s.clientId === draft.id && s.status === "active");
            const completed  = (sequences || []).some(s => s.clientId === draft.id && s.status === "completed");
            if (activeSeq) return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.brand, fontWeight: 600 }}>
                <Zap size={13} /> Sequence active · step {activeSeq.steps.filter(s=>s.sent).length}/{activeSeq.steps.length}
              </div>
            );
            return onStartSequence ? (
              <button onClick={() => onStartSequence(draft)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`,
                color: C.brandDeep, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
              }}>
                <Zap size={13} /> {completed ? "Restart Sequence" : "Start Follow-up Sequence"}
              </button>
            ) : null;
          })()}
          <div style={{ flex: 1 }} />
          {db === "sessions" && !isNew && (() => {
            const linkedRegs = (data.registrations || []).filter(r => r.sessionId === draft.id);
            const eventUri = linkedRegs.find(r => r.calendlyEventUri)?.calendlyEventUri || "";
            if (!eventUri) return null;
            const allCanceled = linkedRegs.length > 0 && linkedRegs.every(r => r.status === "canceled");
            const busy = cancelCalendlyBusy;
            return (
              <button
                type="button"
                disabled={allCanceled || busy}
                title={allCanceled ? "Already canceled" : "Cancel this session in Calendly"}
                onClick={() => setShowCancelCalendly(true)}
                style={{
                  background: allCanceled || busy ? C.ink3 : "#C0573F",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: "7px 14px",
                  cursor: allCanceled || busy ? "default" : "pointer",
                  whiteSpace: "nowrap",
                  marginRight: 8,
                }}
              >
                {busy ? "Canceling…" : "Cancel in Calendly"}
              </button>
            );
          })()}
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          {tab !== "timeline" && onSave && <button className="sb-primary" onClick={() => onSave(draft)}>Save</button>}        </div>
      </div>
      {showCancelCalendly && db === "sessions" && (() => {
        const linkedRegs = (data.registrations || []).filter(r => r.sessionId === draft.id);
        const eventUri = linkedRegs.find(r => r.calendlyEventUri)?.calendlyEventUri || "";
        const activeCount = linkedRegs.filter(r => r.status !== "canceled" && r.status !== "rescheduled").length;
        return (
          <CancelCalendlyModal
            isStudio={!!draft.studioId}
            activeCount={activeCount}
            busy={cancelCalendlyBusy}
            onCancel={() => { if (!cancelCalendlyBusy) setShowCancelCalendly(false); }}
            onConfirm={async (reason) => {
              if (cancelCalendlyBusy) return;
              setCancelCalendlyBusy(true);
              try {
                const result = await cancelCalendlyEvent(eventUri, reason, refundToken);
                if (onSync) await onSync();
                return { ok: true, alreadyCanceled: !!result?.alreadyCanceled };
              } catch (err) {
                const msg = err?.status === 401
                  ? "Your unlock session expired — log out and back in, then retry."
                  : (err?.message || "Cancel failed.");
                throw Object.assign(new Error(msg), { status: err?.status });
              } finally {
                setCancelCalendlyBusy(false);
              }
            }}
          />
        );
      })()}
    </div>
  );
}

/* ============================================================
   SESSION PERFORMANCE VIEW (list)
   ============================================================ */
function SessionPerfView({ rows, derived, data = {}, onOpen }) {
  if (!rows.length) return <Empty pad>No sessions logged yet.</Empty>;

  // Studio sessions derive gross/split/net from actual Stripe revenue × studio share %.
  // Virtual sessions keep their booking-derived figures (no studio split).
  const partnersById = Object.fromEntries((data.partners || []).map((p) => [p.id, p]));
  const revenueRows = buildRegistrationRevenueRows(data);
  const finOf = (r) => r.studioId
    ? studioSessionFinance(r, data, { partnersById, revenueRows })
    : { seatPrice: 0, gross: Number(r.revenue) || 0, studioSplit: 0, net: Number(r.netRevenue) || 0 };

  const allNet = rows.map((r) => finOf(r).net);
  const avgNet = allNet.reduce((a, b) => a + b, 0) / allNet.length;
  const allConv = rows.filter((r) => r.conversion > 0).map((r) => Number(r.conversion));
  const avgConv = allConv.length ? allConv.reduce((a, b) => a + b, 0) / allConv.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Benchmark row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 4 }}>
        {[
          { label: "Sessions", val: rows.length },
          { label: "Total net", val: money(allNet.reduce((a, b) => a + b, 0)) },
          { label: "Avg net/session", val: money(Math.round(avgNet)) },
          { label: "Avg conversion", val: pct(avgConv) },
        ].map(({ label, val }) => (
          <div key={label} className="sb-card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Per-session cards */}
      {rows.map((r) => {
        const fin = finOf(r);
        const gross = fin.gross;
        const split = fin.studioSplit;
        const net = fin.net;
        const seatPrice = fin.seatPrice;
        const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
        const above = net >= avgNet;
        const convColor = r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : r.conversion > 0 ? C.gold : C.ink3;
        const studio = clientShort(derived.partnerName[r.studioId] || "");

        // "Why" analysis
        const insights = [];
        if (r.paidAttendees && r.attendance && r.paidAttendees < r.attendance) insights.push(`${r.attendance - r.paidAttendees} unpaid attendee${r.attendance - r.paidAttendees > 1 ? "s" : ""} — tighten payment flow`);
        if (capUtil !== null && capUtil < 60) insights.push(`Room only ${capUtil}% full — boost pre-session promotion`);
        if (capUtil !== null && capUtil >= 95) insights.push(`Near/at capacity — explore larger room or add date`);
        if (!r.testimonialsCapt || r.testimonialsCapt === 0) insights.push("No testimonials captured — add ask at close");
        if (!r.followUpSent) insights.push("24h follow-up not sent yet");
        if (!r.rebookOfferSent) insights.push("Rebook offer not sent");
        if (r.referralsGenerated === 0) insights.push("No referrals generated — make the ask next time");
        if (r.noShows > 2) insights.push(`${r.noShows} no-shows — consider confirmation texts`);

        return (
          <div key={r.id} className="sb-card" style={{ borderLeft: `4px solid ${above ? "#4A8C6F" : net === 0 ? "#C0573F" : C.gold}`, cursor: "pointer" }}
            onClick={() => onOpen(r)}>
            <div style={{ padding: "14px 16px 12px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cleanName(r.name)}</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{studio} · {fmtDate(r.date)}{r.time ? ` · ${r.time}` : ""} · {r.journey || ""}</div>
                </div>
                <Tag color={SESSION_STATUS_COLOR[r.status] || C.ink3} soft>{r.status || "—"}</Tag>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: insights.length ? 12 : 0 }}>
                {[
                  { label: "In room", val: `${r.attendance || 0}${r.capacity ? `/${r.capacity}` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : null },
                  { label: "Price/seat", val: r.studioId ? money(seatPrice) : "—" },
                  { label: "Gross", val: money(gross) },
                  { label: "Studio split", val: split > 0 ? money(split) : "—", accent: split > 0 ? C.gold : null },
                  { label: "Net profit", val: money(net), accent: above ? "#4A8C6F" : net === 0 ? "#C0573F" : null },
                  { label: "Conversion", val: pct(r.conversion), accent: convColor },
                ].map(({ label, val, accent }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accent || C.ink, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div style={{ background: hexA(C.gold, 0.08), borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: C.gold, marginBottom: 2 }}>What to improve</div>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.ink2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.gold }}>›</span> {ins}
                    </div>
                  ))}
                </div>
              )}
              {insights.length === 0 && r.status === "Closed out" && (
                <div style={{ fontSize: 12, color: "#4A8C6F", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={13} /> Session fully closed out — all post-session items complete.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SESSION CHECKLIST
   ============================================================ */
/* ── EQUIPMENT & SETUP CHECKLIST COMPONENT ── */
function EquipmentChecklist({ equipChecklist, onChange, sessionName, sessionDate, isVirtual }) {
  const toggle = (id) => onChange({ ...equipChecklist, [id]: !equipChecklist[id] });

  const activePhases = EQUIP_CHECKLIST_PHASES
    .map(p => ({ ...p, items: p.items.filter(i => isVirtual ? i.virtual : !i.virtual) }))
    .filter(p => p.items.length > 0);
  const allActiveItems = activePhases.flatMap(p => p.items);

  const done  = allActiveItems.filter(i => equipChecklist[i.id]).length;
  const total = allActiveItems.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const criticalIds = isVirtual
    ? ["eq_zoom_account","eq_zoom_tested","eq_headset_v","eq_do_not_disturb","eq_contraindication"]
    : ["eq_headsets","eq_backup_headset","eq_playlist","eq_waiver_qr","eq_emergency","eq_contraindication"];
  const criticalMissing = criticalIds.filter(id => !equipChecklist[id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Progress header */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
              {sessionName} — {isVirtual ? "Virtual Setup" : "Equipment & Setup"}
            </div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {sessionDate ? `Session: ${sessionDate}  ·  ` : ""}{done} of {total} items ready
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }} />
        </div>
      </div>

      {/* Critical items alert */}
      {criticalMissing.length > 0 && (
        <div style={{ background: hexA("#D9892B", 0.1), border: `1px solid ${hexA("#D9892B", 0.35)}`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9A5D10", marginBottom: 5 }}>⚠️ Critical items not yet checked</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {criticalMissing.map(id => {
              const item = allActiveItems.find(i => i.id === id);
              return item ? <span key={id} style={{ fontSize: 11, background: "#fff", border: `1px solid ${hexA("#D9892B", 0.4)}`, borderRadius: 5, padding: "2px 8px", color: "#9A5D10", fontWeight: 600 }}>{item.label}</span> : null;
            })}
          </div>
        </div>
      )}

      {/* Phase sections */}
      {activePhases.map(phase => {
        const phaseDone = phase.items.filter(i => equipChecklist[i.id]).length;
        const allDone   = phaseDone === phase.items.length;
        return (
          <div key={phase.id}>
            {/* Phase header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: hexA(phase.color, 0.07) }}>
              <span style={{ fontSize: 16 }}>{phase.Icon ? <phase.Icon size={16} color={phase.color} strokeWidth={1.5} /> : null}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: phase.color, flex: 1 }}>{phase.label}</span>
              {allDone
                ? <span style={{ fontSize: 11, fontWeight: 700, color: "#4A8C6F" }}>✓ All done</span>
                : <span style={{ fontSize: 11, color: C.ink3 }}>{phaseDone}/{phase.items.length}</span>
              }
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {phase.items.map(item => {
                const checked   = !!equipChecklist[item.id];
                const isCritical = criticalIds.includes(item.id);
                return (
                  <button key={item.id} onClick={() => toggle(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: checked ? hexA(phase.color, 0.07) : "transparent",
                    border: "none", borderRadius: 8, padding: "9px 10px",
                    cursor: "pointer", transition: "background .12s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0, transition: "all .12s",
                      border: `2px solid ${checked ? phase.color : isCritical && !checked ? "#D9892B" : C.line}`,
                      background: checked ? phase.color : C.surface,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13.5, flex: 1, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                    {isCritical && !checked && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.12), borderRadius: 4, padding: "1px 6px" }}>CRITICAL</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* All clear state */}
      {pct === 100 && (
        <div style={{ background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}><CheckCircle size={28} color="#4A8C6F" strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D6A50" }}>You're fully set up</div>
          <div style={{ fontSize: 12, color: "#4A8C6F", marginTop: 3 }}>All equipment and setup items are confirmed. Go hold space. 🌿</div>
        </div>
      )}
    </div>
  );
}

// Sort items so critical ones appear first within any section
function sortCriticalFirst(items, criticalIds) {
  return [...items].sort((a, b) => {
    const aC = criticalIds.includes(a.id) ? 0 : 1;
    const bC = criticalIds.includes(b.id) ? 0 : 1;
    return aC - bC;
  });
}

/* ── SESSION CHECKLIST PANEL (virtual + studio merged) ──────────────────────
   Props identical to the old VirtualSessionChecklist / StudioSessionChecklist;
   the `isVirtual` boolean selects which item set and behaviour to use.
   sessionAmount is only shown for virtual sessions.
   ──────────────────────────────────────────────────────────────────────────── */
function SessionChecklistPanel({ equipChecklist, onEquipChange, checklist, onChecklistChange, sessionName, sessionDate, status, sessionAmount, isVirtual }) {
  const [showCritical, setShowCritical] = useState(false);
  const toggleEquip = (id) => onEquipChange({ ...equipChecklist, [id]: !equipChecklist[id] });
  const toggleRun   = (id) => onChecklistChange({ ...checklist, [id]: !checklist[id] });

  // Studio has a fixed exclusion list; virtual uses the .virtual flag on each item.
  const studioExcludeIds = isVirtual ? null : new Set([
    "eq_speaker", "eq_space_v", "eq_lighting_v", "promo_sent", "equipment_packed", "audio_tested",
  ]);
  const itemFilter = isVirtual
    ? (i) => i.virtual
    : (i) => !i.virtual && !studioExcludeIds.has(i.id);

  const activeEquipPhases = EQUIP_CHECKLIST_PHASES
    .map(p => ({ ...p, items: p.items.filter(itemFilter) }))
    .filter(p => p.items.length > 0);
  const equipItems = activeEquipPhases.flatMap(p => p.items);
  const runItems   = SESSION_CHECKLIST.filter(itemFilter);

  const equipDone  = equipItems.filter(i => equipChecklist[i.id]).length;
  const runDone    = runItems.filter(i => checklist[i.id]).length;
  const totalDone  = equipDone + runDone;
  const total      = equipItems.length + runItems.length;
  const pct        = total ? Math.round((totalDone / total) * 100) : 0;

  // Virtual only: some equip items are pulled into the merged Pre-Session block.
  const virtualPreSessionEquipIds = isVirtual ? VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS : new Set();

  const criticalIds     = isVirtual
    ? ["eq_zoom_tested", "eq_headset_v", "eq_do_not_disturb", "eq_contraindication"]
    : ["eq_headsets", "eq_backup_headset", "eq_playlist", "eq_waiver_qr", "eq_emergency", "eq_contraindication"];
  const criticalMissing = criticalIds.filter(id => !equipChecklist[id]);
  const isCompleted     = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  const renderItem = (item, checked, onToggle, color, isCritical, disabled) => (
    <button key={item.id} onClick={() => !disabled && onToggle(item.id)} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      background: checked ? hexA(color, 0.07) : "transparent",
      border: "none", borderRadius: 8, padding: "9px 10px",
      cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, transition: "all .12s",
        border: `2px solid ${checked ? color : isCritical && !checked ? "#D9892B" : C.line}`,
        background: checked ? color : C.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <Check size={12} color="#fff" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 13.5, flex: 1, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
        {item.label}
      </span>
      {isCritical && !checked && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.12), borderRadius: 4, padding: "1px 6px" }}>CRITICAL</span>
      )}
    </button>
  );

  const renderPhaseHeader = (label, phColor, done, phTotal, extra) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: hexA(phColor, 0.07) }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: phColor, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: phColor, flex: 1 }}>{label}</span>
      {extra}
      {done === phTotal
        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#4A8C6F" }}>✓ All done</span>
        : <span style={{ fontSize: 11, color: C.ink3 }}>{done}/{phTotal}</span>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress header with critical badge */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — {isVirtual ? "Virtual" : "Studio"} Setup</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {sessionDate ? `Session: ${sessionDate}  ·  ` : ""}{totalDone} of {total} items complete
            </div>
            {criticalMissing.length > 0 && (
              <button onClick={() => setShowCritical(v => !v)} style={{
                marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                background: showCritical ? "#D9892B" : hexA("#D9892B", 0.12),
                border: `1px solid ${hexA("#D9892B", 0.4)}`,
                borderRadius: 20, padding: "3px 10px", cursor: "pointer",
                fontSize: 11.5, fontWeight: 700, color: showCritical ? "#fff" : "#9A5D10",
                transition: "all .15s",
              }}>
                ⚠️ {criticalMissing.length} critical item{criticalMissing.length > 1 ? "s" : ""} not checked
                <span style={{ fontSize: 10 }}>{showCritical ? "▲" : "▼"}</span>
              </button>
            )}
          </div>
          {sessionAmount && (
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>Session</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: sessionAmount === "Free" ? C.ink3 : "#4A8C6F" }}>{sessionAmount}</div>
            </div>
          )}
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold, marginLeft: 12 }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold }} />
        </div>
        {showCritical && criticalMissing.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${hexA("#D9892B", 0.25)}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {criticalMissing.map(id => {
                const item = equipItems.find(i => i.id === id);
                return item ? <span key={id} style={{ fontSize: 11.5, background: "#fff", border: `1px solid ${hexA("#D9892B", 0.4)}`, borderRadius: 6, padding: "3px 10px", color: "#9A5D10", fontWeight: 600 }}>{item.label}</span> : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Equipment phases — except Safety & Facilitation and items moved to Pre-Session */}
      {activeEquipPhases
        .filter(p => p.id !== "safety")
        .map(phase => ({ ...phase, items: phase.items.filter(i => !virtualPreSessionEquipIds.has(i.id)) }))
        .filter(phase => phase.items.length > 0)
        .map(phase => {
          const phaseDone = phase.items.filter(i => equipChecklist[i.id]).length;
          return (
            <div key={phase.id}>
              {renderPhaseHeader(phase.label, phase.color, phaseDone, phase.items.length, null)}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {sortCriticalFirst(phase.items, criticalIds).map(item => renderItem(item, !!equipChecklist[item.id], toggleEquip, phase.color, criticalIds.includes(item.id), false))}
              </div>
            </div>
          );
        })}

      {/* Pre-Session — run items + moved equip items + Safety & Facilitation merged */}
      {(() => {
        const safetyPhase = activeEquipPhases.find(p => p.id === "safety");
        const safetyItems = safetyPhase ? safetyPhase.items : [];
        const movedEquipItems = equipItems.filter(i => virtualPreSessionEquipIds.has(i.id));
        const preItems = runItems.filter(i => i.phase === "Pre-Session");
        const allPreItems = [...preItems, ...movedEquipItems, ...safetyItems];
        if (!allPreItems.length) return null;
        const phColor = SESSION_PHASE_COLOR["Pre-Session"];
        const done = preItems.filter(i => checklist[i.id]).length
                   + movedEquipItems.filter(i => equipChecklist[i.id]).length
                   + safetyItems.filter(i => equipChecklist[i.id]).length;
        const allSorted = sortCriticalFirst(
          [
            ...preItems.map(i => ({ ...i, _src: "run" })),
            ...movedEquipItems.map(i => ({ ...i, _src: "equip" })),
            ...safetyItems.map(i => ({ ...i, _src: "equip" })),
          ],
          criticalIds
        );
        return (
          <div>
            {renderPhaseHeader("Pre-Session", phColor, done, allPreItems.length, null)}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {allSorted.map(item =>
                item._src === "run"
                  ? renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), false)
                  : renderItem(item, !!equipChecklist[item.id], toggleEquip, phColor, criticalIds.includes(item.id), false)
              )}
            </div>
          </div>
        );
      })()}

      {/* Post-Session */}
      {(() => {
        const items = sortCriticalFirst(runItems.filter(i => i.phase === "Post-Session"), criticalIds);
        if (!items.length) return null;
        const phaseDone = items.filter(i => checklist[i.id]).length;
        const phColor = SESSION_PHASE_COLOR["Post-Session"];
        const disabled = !isCompleted;
        return (
          <div style={{ opacity: disabled ? 0.55 : 1 }}>
            {renderPhaseHeader("Post-Session", phColor, phaseDone, items.length,
              disabled ? <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span> : null
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map(item => renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), disabled))}
            </div>
          </div>
        );
      })()}

      {pct === 100 && (
        <div style={{ background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}><CheckCircle size={28} color="#4A8C6F" strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D6A50" }}>You're fully set up</div>
          <div style={{ fontSize: 12, color: "#4A8C6F", marginTop: 3 }}>All setup and session items confirmed. Go hold space. 🌿</div>
        </div>
      )}
    </div>
  );
}

function ClientSessionsTab({ record, data, onOpenRelated, today }) {
  const registrations = (data.registrations || [])
    .filter(r => r.clientId === record.id && r.status !== "canceled")
    .sort((a, b) => (b.date || b.sessionDate || "").localeCompare(a.date || a.sessionDate || ""));

  const sessions = registrations.map(reg => {
    const session = (data.sessions || []).find(s => s.id === reg.sessionId);
    return { reg, session };
  }).filter(({ session }) => session);

  const STATUS_COLOR = { Completed: "#4A8C6F", Planned: C.brand, "Booking open": C.brand, "Follow-up pending": C.gold, Canceled: "#C0573F" };

  // Recognised revenue per booking — actual Stripe charge only (matches LTV and the Revenue tab).
  const sessionRevenue = ({ reg }) => registrationPaymentForLtv(reg);
  const totalRevenue = sessions.reduce((sum, s) => sum + sessionRevenue(s), 0);

  if (!sessions.length) {
    return <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13 }}>No sessions found for this client.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Summary row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.ink3 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(totalRevenue)} total revenue</span>
      </div>
      {sessions.map((item) => {
        const { reg, session } = item;
        const isVirtual = !session.studioId && (session.locationType === "zoom" || session.locationType === "custom" || !session.locationType);
        const partner = session.studioId ? (data.partners || []).find(p => p.id === session.studioId) : null;
        const statusColor = STATUS_COLOR[session.status] || C.ink3;
        const rev = sessionRevenue(item);
        return (
          <button key={session.id} onClick={() => onOpenRelated({ db: "sessions", record: session })}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}
            className="sb-relrow">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: isVirtual ? C.brand : LANE.b2b.color, flexShrink: 0, marginTop: 3 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cleanName(session.name)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                {session.date && <span style={{ fontSize: 12, color: C.ink3 }}>{fmtDate(session.date)}{session.time ? ` · ${session.time}` : ""}</span>}
                {session.durationMins ? <span style={{ fontSize: 12, color: C.ink3 }}>{session.durationMins} min</span> : null}
                {partner && <span style={{ fontSize: 12, color: LANE.b2b.color, fontWeight: 600 }}>{cleanName(partner.name)}</span>}
                {session.journey && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: hexA(C.brand, 0.1), color: C.brand, fontWeight: 600 }}>{session.journey}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: rev > 0 ? "#4A8C6F" : C.ink3 }}>{rev > 0 ? money(rev) : "Free"}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: hexA(statusColor, 0.12), color: statusColor }}>
                {session.status || "Planned"}
              </span>
              {session.breakthroughNoted && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4A8C6F", padding: "1px 6px", borderRadius: 8, background: hexA("#4A8C6F", 0.1) }}>Breakthrough</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** Agreement file helpers — validate magic bytes; never trust extension/MIME alone */
function agreementExt(name) {
  const m = /\.(pdf|doc|docx)$/i.exec(name || "");
  return m ? m[1].toLowerCase() : "";
}

function stripAgreementForStore(agreements) {
  return (agreements || []).map(({ dataUrl, ...rest }) => ({
    ...rest,
    isPdf: rest.isPdf ?? (agreementExt(rest.name) === "pdf"),
  }));
}

function dataForEncryptedStore(data) {
  if (!data?.partners?.length) return data;
  return {
    ...data,
    partners: data.partners.map(p => ({
      ...p,
      agreements: stripAgreementForStore(p.agreements),
    })),
  };
}

async function persistAgreementBlob(cryptoKey, agreementId, dataUrl) {
  if (!cryptoKey || !agreementId || !dataUrl) return;
  const enc = await Sec.encrypt({ dataUrl }, cryptoKey);
  await store.set(AGREEMENT_BLOB_PREFIX + agreementId, enc);
}

async function loadAgreementBlob(cryptoKey, agreementId) {
  if (!cryptoKey || !agreementId) return null;
  try {
    const raw = await store.get(AGREEMENT_BLOB_PREFIX + agreementId);
    if (!raw?.value) return null;
    const dec = await Sec.decrypt(raw.value, cryptoKey);
    return dec?.dataUrl || null;
  } catch { return null; }
}

async function deleteAgreementBlob(agreementId) {
  if (!agreementId) return;
  await store.remove(AGREEMENT_BLOB_PREFIX + agreementId);
}

async function persistAllAgreementBlobs(data, cryptoKey) {
  for (const p of data.partners || []) {
    for (const a of p.agreements || []) {
      if (a.dataUrl) await persistAgreementBlob(cryptoKey, a.id, a.dataUrl);
    }
  }
}

function agreementMimeForExt(ext) {
  if (ext === "pdf") return "application/pdf";
  if (ext === "doc") return "application/msword";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "";
}

function dataUrlToBytes(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  try {
    const bin = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch { return null; }
}

function isPdfBytes(bytes) {
  return bytes && bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D;
}

function isDocxBytes(bytes) {
  return bytes && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function isDocBytes(bytes) {
  return bytes && bytes.length >= 8 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
}

function bytesMatchExt(bytes, ext) {
  if (ext === "pdf") return isPdfBytes(bytes);
  if (ext === "docx") return isDocxBytes(bytes);
  if (ext === "doc") return isDocBytes(bytes);
  return false;
}

function agreementRecordIsPdf(a) {
  if (agreementExt(a.name) !== "pdf") return false;
  if (!a.dataUrl) return false;
  const bytes = dataUrlToBytes(a.dataUrl);
  return !!(bytes && isPdfBytes(bytes));
}

async function validateAgreementUpload(file) {
  const ext = agreementExt(file.name);
  if (!ext) return { ok: false, error: "Only PDF or Word documents (.pdf, .doc, .docx) are allowed." };

  const expectedMime = agreementMimeForExt(ext);
  const allowedMimes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-word",
    "application/octet-stream",
  ]);
  if (file.type && !allowedMimes.has(file.type)) {
    return { ok: false, error: "File type is not allowed." };
  }

  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ok: false, error: "Could not read file. Please try again." };
  }

  if (!bytesMatchExt(bytes, ext)) {
    return { ok: false, error: `File content does not match a valid .${ext} document.` };
  }

  if (file.type && file.type !== "application/octet-stream" && file.type !== expectedMime) {
    return { ok: false, error: "File type does not match the file extension." };
  }

  return { ok: true, ext, mime: expectedMime };
}

function openAgreementFile(a, cryptoKey) {
  const openWithDataUrl = (dataUrl) => {
    if (!dataUrl) { alert("Could not read this file."); return; }
    const ext = agreementExt(a.name);
    const bytes = dataUrlToBytes(dataUrl);
    if (!bytes) { alert("Could not read this file."); return; }
    if (!bytesMatchExt(bytes, ext)) {
      alert("This file failed a safety check and cannot be opened.");
      return;
    }

    const blob = new Blob([bytes], { type: agreementMimeForExt(ext) || "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    if (ext === "pdf") {
      // No features string: "noreferrer" implies noopener and makes window.open
      // return null (false "Pop-up blocked"). Sever opener manually instead.
      const w = window.open(url, "_blank");
      if (!w) {
        URL.revokeObjectURL(url);
        alert("Pop-up blocked. Please allow pop-ups to view this PDF.");
        return;
      }
      try { w.opener = null; } catch (_) {}
      setTimeout(() => URL.revokeObjectURL(url), 120_000);
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = a.name || `agreement.${ext}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  };

  if (a.dataUrl) {
    openWithDataUrl(a.dataUrl);
    return;
  }
  if (!cryptoKey || !a.id) {
    alert("Could not read this file.");
    return;
  }
  loadAgreementBlob(cryptoKey, a.id).then(openWithDataUrl);
}

function PartnerAgreementsTab({ agreements, onChange, cryptoKey, partnerName, canEdit = true }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [savedMsg, setSavedMsg]   = useState("");

  const MAX_FILE_MB = 5;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    setError("");
    setUploading(true);
    const check = await validateAgreementUpload(file);
    if (!check.ok) {
      setError(check.error);
      setUploading(false);
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { setError("Could not read file. Please try again."); setUploading(false); };
    reader.onload = async (ev) => {
      const next = [...agreements, {
        id:         `agr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name:       file.name,
        size:       file.size,
        type:       check.mime,
        uploadedAt: new Date().toISOString(),
        isPdf:      check.ext === "pdf",
        dataUrl:    ev.target.result,
      }];
      try {
        await onChange(next);
        setSavedMsg("Agreement saved.");
        setTimeout(() => setSavedMsg(""), 3000);
      } catch {
        setError("Could not save the agreement. Please try again.");
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const remove = async (id) => {
    try {
      await onChange(agreements.filter(a => a.id !== id));
    } catch {
      setError("Could not remove the agreement. Please try again.");
    }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Upload button */}
      {canEdit && (
      <div style={{ paddingTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={handleUpload} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
          borderRadius: 9, border: "none", cursor: uploading ? "wait" : "pointer",
          background: C.brand, color: "#fff", fontSize: 13, fontWeight: 700,
        }}>
          <Upload size={14} /> {uploading ? "Uploading…" : "Upload Agreement"}
        </button>
        <span style={{ fontSize: 11.5, color: C.ink3 }}>PDF or Word only (.pdf, .doc, .docx) · max {MAX_FILE_MB} MB</span>
      </div>
      )}

      {error && (
        <div style={{ fontSize: 12.5, color: "#C0392B", background: hexA("#C0392B", 0.07), border: `1px solid ${hexA("#C0392B", 0.2)}`, borderRadius: 8, padding: "8px 12px" }}>
          {error}
        </div>
      )}
      {savedMsg && (
        <div style={{ fontSize: 12.5, color: "#4A8C6F", background: hexA("#4A8C6F", 0.08), border: `1px solid ${hexA("#4A8C6F", 0.25)}`, borderRadius: 8, padding: "8px 12px" }}>
          {savedMsg}
        </div>
      )}

      {/* Agreement list */}
      {agreements.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13.5 }}>
          <FileSignature size={32} color={C.line} style={{ display: "block", margin: "0 auto 10px" }} />
          No agreements uploaded yet for {partnerName}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agreements.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: C.surfaceAlt, border: `1px solid ${C.line}`,
              borderRadius: 10, padding: "11px 14px",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: hexA("#C0392B", 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileSignature size={17} color="#C0392B" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>
                  {fmtSize(a.size)} · Uploaded {a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <button onClick={() => openAgreementFile(a, cryptoKey)} title="Open file" style={{
                background: "#EBF3FF", border: "1px solid #BFDBFE", color: "#2563EB",
                borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}>
                <Download size={12} /> Open
              </button>
              {canEdit && (
              <button onClick={() => remove(a.id)} title="Remove" style={{
                background: "none", border: "none", cursor: "pointer", color: C.ink3,
                padding: 6, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center",
              }}>
                <Trash2 size={15} />
              </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>
        Agreements save automatically when uploaded. File bytes are kept in separate encrypted storage so large PDFs persist reliably.
      </div>
    </div>
  );
}

function PartnerSessionsTab({ record, data, onOpenRelated, today }) {
  const sessions = (data.sessions || [])
    .filter(s => s.studioId === record.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  // Studio finance per session: actual Stripe revenue received × this studio's share %.
  const partnersById = { [record.id]: record };
  const revenueRows = buildRegistrationRevenueRows(data);
  const finBySession = Object.fromEntries(sessions.map(s => [s.id, studioSessionFinance(s, data, { partnersById, revenueRows })]));
  const totalGross = sessions.reduce((s, x) => s + finBySession[x.id].gross, 0);
  const totalSplit = sessions.reduce((s, x) => s + finBySession[x.id].studioSplit, 0);
  const totalNet   = sessions.reduce((s, x) => s + finBySession[x.id].net, 0);

  if (!sessions.length) {
    return <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13 }}>No sessions logged for this studio yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Totals summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
        {[
          { label: "Total Gross", val: money(totalGross), color: C.ink },
          { label: "Studio Split", val: money(totalSplit), color: C.gold },
          { label: "Total Net", val: money(totalNet), color: "#4A8C6F" },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.ink3, marginBottom: 2 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>

      {sessions.map(s => {
        const fin   = finBySession[s.id];
        const net   = fin.net;
        const gross = fin.gross;
        const split = fin.studioSplit;
        const isPast = s.date && s.date < today;
        const statusColor = SESSION_STATUS_COLOR[s.status] || C.ink3;
        return (
          <button key={s.id} onClick={() => onOpenRelated({ db: "sessions", record: s })}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}
            className="sb-relrow">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cleanName(s.name)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                {s.date && <span style={{ fontSize: 12, color: C.ink3 }}>{fmtDate(s.date)}{s.time ? ` · ${s.time}` : ""}</span>}
                {s.attendance != null && <span style={{ fontSize: 12, color: C.ink3 }}>{s.attendance} attended</span>}
                {s.journey && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: hexA(C.brand, 0.1), color: C.brand, fontWeight: 600 }}>{s.journey}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
              {gross > 0 && <span style={{ fontSize: 12, color: C.ink3 }}>Gross: {money(gross)}</span>}
              {split > 0 && <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Split: {money(split)}</span>}
              {net > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(net)} net</span>}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: hexA(statusColor, 0.12), color: statusColor }}>
                {s.status || "Planned"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SessionBookingsTab({ record, data, onOpenRelated, setData }) {
  const allRegistrations = (data.registrations || []).filter(r => r.sessionId === record.id);
  // Only active bookings occupy a spot. Canceled/rescheduled bookings are removed from this tab
  // (they free up capacity) and remain visible on the Cancellations and Reschedules tab.
  const registrations = allRegistrations.filter(r => r.status !== "canceled" && r.status !== "rescheduled");
  const sessionListPrice = resolveSessionListPrice(data.registrations, record.id);
  const REG_STATUS_COLOR = { booked: C.brand, attended: "#4A8C6F", canceled: "#C0573F", rescheduled: C.gold, no_show: "#8A96AC" };

  useEffect(() => {
    if (!setData) return;
    backfillRegistrationPaymentsForRegs(registrations, setData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id, setData]);

  const studio = (data.partners || []).find(p => p.id === record.studioId);

  const downloadParticipantList = () => {
    const esc = (v) => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    const studioName = esc(studio?.name || "—");
    const sessionName = esc(record.name || "Session");
    const sessionDate = esc(record.date ? fmtDate(record.date) : "—");
    const sessionTime = esc(record.time || "—");

    const active = registrations.filter(r => r.status !== "canceled");

    const rows = active.map((reg, i) => {
      const client = (data.clients || []).find(c => c.id === reg.clientId);
      const name   = esc(cleanName(client?.name || reg.name || "Unknown"));
      const email  = esc(client?.email || "—");
      const phone  = esc(client?.phone || "—");
      const status = esc(reg.status || "—");
      const amount = esc(formatActualBookingAmount(reg, sessionListPrice) || "—");
      const waiver = reg.waiverStatus === "signed" ? "✓ Signed" : "Pending";
      const paid   = reg.paymentStatus === "paid" ? "✓ Paid" : reg.paymentStatus === "unpaid" ? "Unpaid" : "—";
      const rowBg  = i % 2 === 0 ? "#ffffff" : "#f8f9fc";
      return `<tr style="background:${rowBg}">
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${i + 1}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;font-weight:600">${name}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${email}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${phone}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;font-weight:600">${amount}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;text-transform:capitalize">${status}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;color:${reg.waiverStatus === "signed" ? "#2D6A50" : "#9A5D10"}">${waiver}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;color:${reg.paymentStatus === "paid" ? "#2D6A50" : reg.paymentStatus === "unpaid" ? "#C0392B" : "#666"}">${paid}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
      <title>Participant List — ${sessionName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px 40px; color: #1a1d23; font-size: 13px; }
        .header { margin-bottom: 28px; border-bottom: 2px solid #2E6FB0; padding-bottom: 16px; }
        .logo { font-size: 20px; font-weight: 800; color: #2E6FB0; letter-spacing: -0.5px; margin-bottom: 6px; }
        .meta { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 10px; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a96ac; font-weight: 600; margin-bottom: 2px; }
        .meta-value { font-size: 13.5px; font-weight: 700; color: #1a1d23; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #2E6FB0; color: #fff; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 11px; color: #8a96ac; text-align: right; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        <div class="logo">Simply Breathe</div>
        <div style="font-size:18px;font-weight:800;color:#1a1d23;margin-bottom:4px">${sessionName}</div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Studio</span><span class="meta-value">${studioName}</span></div>
          <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">${sessionDate}</span></div>
          <div class="meta-item"><span class="meta-label">Time</span><span class="meta-value">${sessionTime}</span></div>
          <div class="meta-item"><span class="meta-label">Registered</span><span class="meta-value">${active.length} participant${active.length !== 1 ? "s" : ""}</span></div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Amount</th><th>Status</th><th>Waiver</th><th>Payment</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Generated ${new Date().toLocaleString()} · Simply Breathe OS</div>
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Pop-up blocked. Please allow pop-ups for this site to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
  };

  if (!registrations.length) {
    return (
      <div style={{ padding: "32px 22px", textAlign: "center", color: C.ink3, fontSize: 14 }}>
        No bookings linked to this session yet.<br />
        <span style={{ fontSize: 12 }}>Bookings sync automatically from Calendly.</span>
      </div>
    );
  }

  const counts = { booked: 0, attended: 0, canceled: 0, rescheduled: 0, no_show: 0 };
  registrations.forEach(r => { if (counts[r.status] != null) counts[r.status]++; });
  const activeRegs = registrations.filter(r => r.status !== "canceled" && r.status !== "rescheduled");
  const bookingRevenue = activeRegs.reduce((sum, r) => {
    if (r.paymentStatus === "unpaid") return sum;
    const amt = resolveActualBookingAmount(r, sessionListPrice);
    if (amt == null || amt <= 0) return sum;
    return sum + amt;
  }, 0);

  return (
    <div style={{ padding: "0 22px 22px" }}>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, paddingTop: 4, alignItems: "center" }}>
        {Object.entries(counts).filter(([,n]) => n > 0).map(([status, n]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
            padding: "5px 12px", borderRadius: 20,
            background: hexA(REG_STATUS_COLOR[status] || C.ink3, 0.1),
            color: REG_STATUS_COLOR[status] || C.ink3, fontWeight: 600 }}>
            <span style={{ fontWeight: 800 }}>{n}</span> {status}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {bookingRevenue > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>
              {money(bookingRevenue)} session revenue
            </span>
          )}
          {registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length > 0 && (
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>
              ⚠ {registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length} waiver{registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length !== 1 ? "s" : ""} pending
            </span>
          )}
          {record.studioId && (
            <button onClick={downloadParticipantList} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5,
              fontWeight: 700, background: C.brand, color: "#fff",
            }}>
              <Download size={13} /> Participant List
            </button>
          )}
        </div>
      </div>

      {/* Booking rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {registrations.map(reg => {
          const client = (data.clients || []).find(c => c.id === reg.clientId);
          const statusColor = REG_STATUS_COLOR[reg.status] || C.ink3;
          const amountLabel = formatActualBookingAmount(reg, sessionListPrice);
          return (
            <div key={reg.id} style={{
              background: C.surfaceAlt, borderRadius: 12, padding: "12px 14px",
              border: `1px solid ${C.line}`, display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.brandSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: C.brand, flexShrink: 0 }}>
                {(client?.name || reg.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                    {cleanName(client?.name || "Unknown client")}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: hexA(statusColor, 0.12), color: statusColor, fontWeight: 600 }}>
                    {reg.status}
                  </span>
                  {reg.waiverStatus === "signed"
                    ? <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Waiver</span>
                    : reg.status !== "canceled" && <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>⚠ Waiver pending</span>}
                  {amountLabel && reg.status !== "canceled" && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: hexA(amountLabel === "Free" ? C.ink3 : "#4A8C6F", 0.12),
                      color: amountLabel === "Free" ? C.ink3 : "#4A8C6F",
                    }}>{amountLabel}</span>
                  )}
                  {reg.paymentStatus === "paid"
                    ? <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Paid</span>
                    : reg.paymentStatus === "unpaid" && <span style={{ fontSize: 11, color: "#C0573F", fontWeight: 600 }}>Unpaid</span>}
                </div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {client?.email && <span>{client.email}</span>}
                  {client?.phone && <span>{client.phone}</span>}
                  {reg.attendanceType && <span>{reg.attendanceType}</span>}
                  {reg.locationType === "zoom" && reg.locationJoinUrl && reg.locationJoinUrl.startsWith("https://") && (
                    <a href={reg.locationJoinUrl} target="_blank" rel="noreferrer noopener"
                      style={{ color: C.brand, fontWeight: 600 }}>Zoom link</a>
                  )}
                </div>
                {reg.concerns && (
                  <div style={{ fontSize: 11.5, color: "#C0573F", marginTop: 4, fontWeight: 500 }}>
                    ⚠ {reg.concerns}
                  </div>
                )}
                {reg.howHeard && (
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Heard via: {reg.howHeard}</div>
                )}
              </div>
              {amountLabel && reg.status !== "canceled" && (
                <div style={{ textAlign: "right", flexShrink: 0, alignSelf: "center", minWidth: 52 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>Amount</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: amountLabel === "Free" ? C.ink3 : "#4A8C6F" }}>{amountLabel}</div>
                </div>
              )}
              {client && (
                <button onClick={() => onOpenRelated({ db: "clients", record: client })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4, flexShrink: 0 }}
                  title="Open client record">
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionChecklist({ checklist, onChange, sessionName, status, isVirtual }) {
  const toggle = (id) => onChange({ ...checklist, [id]: !checklist[id] });
  const activeItems = SESSION_CHECKLIST.filter(i => isVirtual ? i.virtual : !i.virtual);
  const done = activeItems.filter(i => checklist[i.id]).length;
  const total = activeItems.length;
  const pctDone = total ? Math.round((done / total) * 100) : 0;
  const isCompleted = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — Run Checklist</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{done} of {total} items complete</div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pctDone === 100 ? "#4A8C6F" : pctDone >= 50 ? C.brand : C.gold }}>
            {pctDone}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pctDone + "%",
            background: pctDone === 100 ? "#4A8C6F" : pctDone >= 50 ? C.brand : C.gold }} />
        </div>
      </div>

      {SESSION_CHECKLIST_PHASES.map((phase) => {
        const items = activeItems.filter((i) => i.phase === phase);
        if (!items.length) return null;
        const phaseDone = items.filter((i) => checklist[i.id]).length;
        const color = SESSION_PHASE_COLOR[phase];
        const isPost = phase === "Post-Session";
        return (
          <div key={phase} style={{ opacity: isPost && !isCompleted ? 0.55 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color }}>{phase}</span>
              {isPost && !isCompleted && <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span>}
              <span style={{ fontSize: 11, color: C.ink3, marginLeft: "auto" }}>{phaseDone}/{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map((item) => {
                const checked = !!checklist[item.id];
                const disabled = isPost && !isCompleted;
                return (
                  <button key={item.id} onClick={() => !disabled && toggle(item.id)} disabled={disabled} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: checked ? hexA(color, 0.07) : "transparent",
                    border: "none", borderRadius: 8, padding: "9px 10px",
                    cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? color : C.line}`,
                      background: checked ? color : C.surface, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, transition: "all .12s",
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SESSION PERFORMANCE (drawer tab)
   ============================================================ */
function SessionPerformance({ record: r, derived, data }) {
  // Studio sessions: gross/split/net derive from actual Stripe revenue received × studio share %.
  const fin = r.studioId
    ? studioSessionFinance(r, data, { revenueRows: buildRegistrationRevenueRows(data) })
    : { seatPrice: 0, gross: Number(r.revenue) || 0, studioSplit: 0, net: Number(r.netRevenue) || 0, sharePct: 0 };
  const net = fin.net;
  const gross = fin.gross;
  const split = fin.studioSplit;
  const seatPrice = fin.seatPrice;
  const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
  const revPerHead = r.attendance ? (net / r.attendance).toFixed(2) : 0;
  const fillRate = r.registered ? Math.round(((r.attendance || 0) / r.registered) * 100) : null;
  const studio = clientShort(derived.partnerName[r.studioId] || "");
  const studioFull = derived.partnerName[r.studioId] || "";

  const handleDownloadPDF = () => {
    // HTML-escape all user-supplied strings interpolated into document.write to prevent stored XSS
    const esc = s => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const sessionTitle = esc(cleanName(r.name || "Session"));
    const rows = [
      ["Status",          esc(r.status || "—")],
      ["Journey",         esc(r.journey || "—")],
      ["Studio",          esc(studioFull || "—")],
      ["Date & Time",     `${esc(fmtDate(r.date))}${r.time ? " · " + esc(r.time) : ""}`],
      ["Capacity",        r.capacity || "—"],
      ["Registered",      r.registered || "—"],
      ["Attended",        `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`],
      ["Paid Attendees",  typeof r.paidAttendees === "number" ? r.paidAttendees : (r.attendance || 0)],
      ["Waivers",         r.waivers || 0],
      ["No-shows",        r.noShows || 0],
      ["Gross Revenue",   `$${Number(gross).toFixed(2)}`],
      ["Studio Split",    `$${Number(split).toFixed(2)}`],
      ["Net Revenue",     `$${Number(net).toFixed(2)}`],
      ["Rev per Head",    `$${Number(revPerHead).toFixed(2)}`],
      ["Conversion Rate", r.conversion ? `${Math.round(r.conversion * 100)}%` : "—"],
      ["Packages Sold",   r.packagesSold || 0],
      ["Testimonials",    r.testimonialsCapt || 0],
      ["Referrals",       r.referralsGenerated || 0],
    ];

    const metricsHtml = rows.map(([label, val]) => `
      <div class="metric">
        <div class="metric-label">${label}</div>
        <div class="metric-val">${val}</div>
      </div>`).join("");

    const revenueHtml = gross > 0 ? `
      <div class="section">
        <div class="section-title">Revenue Breakdown</div>
        <table class="rev-table">
          <tr><td>Gross Revenue</td><td class="amt">$${gross.toFixed(2)}</td></tr>
          <tr><td>Studio Split</td><td class="amt minus">-$${split.toFixed(2)}</td></tr>
        </table>
      </div>` : "";

    const notesHtml = r.notes ? `
      <div class="section">
        <div class="section-title">Session Notes</div>
        <div class="notes">${esc(r.notes)}</div>
      </div>` : "";

    const studioEsc = esc(studioFull);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>Session Report — ${sessionTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2340; background: #fff; padding: 32px 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2E6FB0; padding-bottom: 14px; margin-bottom: 22px; }
    .brand { font-size: 18px; font-weight: 800; color: #2E6FB0; letter-spacing: -0.3px; }
    .brand-sub { font-size: 11px; color: #6b7a99; margin-top: 2px; }
    .session-title { font-size: 20px; font-weight: 800; color: #1a2340; margin-bottom: 2px; }
    .session-sub { font-size: 12px; color: #6b7a99; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7a99; font-weight: 700; margin-bottom: 10px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; background: #f5f7fb; border-radius: 10px; padding: 14px 16px; }
    .metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7a99; font-weight: 700; }
    .metric-val { font-size: 13px; font-weight: 600; color: #1a2340; margin-top: 1px; }
    .rev-table { width: 100%; border-collapse: collapse; background: #f5f7fb; border-radius: 10px; overflow: hidden; }
    .rev-table td { padding: 10px 14px; border-bottom: 1px solid #e3e8f0; font-size: 13px; }
    .amt { text-align: right; font-weight: 700; }
    .minus { color: #D9892B; }
    .net-row td { font-weight: 800; font-size: 14px; background: #eaf4ee; }
    .net { color: #4A8C6F; }
    .notes { background: #f5f7fb; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #3a4a6b; line-height: 1.6; font-style: italic; }
    .footer { margin-top: 32px; border-top: 1px solid #e3e8f0; padding-top: 10px; font-size: 10px; color: #9aaccb; text-align: center; }
    @media print { body { padding: 20px 28px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Simply Breathe</div>
      <div class="brand-sub">Session Performance Report</div>
    </div>
    <div style="text-align:right">
      <div class="session-title">${sessionTitle}</div>
      <div class="session-sub">${studioEsc ? studioEsc + " · " : ""}${esc(fmtDate(r.date))}${r.time ? " · " + esc(r.time) : ""}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Session Metrics</div>
    <div class="metrics-grid">${metricsHtml}</div>
  </div>
  ${revenueHtml}
  ${notesHtml}
  <div class="footer">Generated by Simply Breathe OS · ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { alert("Popup blocked — please allow popups for this site to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  // Benchmarks from all sessions
  const allSessions = data.sessions.filter((s) => s.id !== r.id && (Number(s.netRevenue) || 0) > 0);
  const avgNetAll = allSessions.length ? allSessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0) / allSessions.length : null;
  const avgConvAll = allSessions.filter((s) => s.conversion > 0).length
    ? allSessions.filter((s) => s.conversion > 0).reduce((a, s) => a + Number(s.conversion), 0) / allSessions.filter((s) => s.conversion > 0).length
    : null;

  const metrics = [
    { label: "Status",          val: r.status || "—", accent: SESSION_STATUS_COLOR[r.status] },
    { label: "Journey",         val: r.journey || "—" },
    { label: "Studio",          val: studio || "—" },
    { label: "Date & time",     val: `${fmtDate(r.date)}${r.time ? ` · ${r.time}` : ""}` },
    { label: "Capacity",        val: r.capacity || "—" },
    { label: "Registered",      val: r.registered || "—" },
    { label: "Attended",        val: `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : capUtil >= 90 ? "#4A8C6F" : null },
    { label: "Paid attendees",  val: typeof r.paidAttendees === "number" ? r.paidAttendees : (r.attendance || 0) },
    { label: "Waivers",         val: r.waivers || 0 },
    { label: "No-shows",        val: r.noShows || 0, accent: (r.noShows || 0) > 2 ? C.gold : null },
    ...(r.studioId ? [
      { label: "Price per seat",  val: money(seatPrice) },
      { label: "Studio share",    val: `${fin.sharePct}%`, accent: C.gold },
    ] : []),
    { label: "Gross revenue",   val: money(gross) },
    { label: "Studio split",    val: money(split), accent: C.gold },
    { label: "Your net",        val: money(net), accent: net > 0 ? "#4A8C6F" : "#C0573F" },
    { label: "Rev per head",    val: money(revPerHead) },
    { label: "Conversion rate", val: pct(r.conversion), accent: r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : C.gold },
    { label: "Packages sold",   val: r.packagesSold || 0 },
    { label: "Testimonials",    val: r.testimonialsCapt || 0, accent: (r.testimonialsCapt || 0) === 0 ? C.gold : null },
    { label: "Referrals",       val: r.referralsGenerated || 0 },
  ];

  const postItems = [
    { label: "Follow-up sent",     done: r.followUpSent },
    { label: "Rebook offer sent",  done: r.rebookOfferSent },
    { label: "Referrals requested",done: r.referralsRequested },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* PDF download — studio sessions only */}
      {r.studioId && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleDownloadPDF} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: C.brand, color: "#fff", border: "none",
          }}>
            <Download size={14} strokeWidth={2} /> Download PDF
          </button>
        </div>
      )}
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {metrics.map(({ label, val, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      {gross > 0 && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 10 }}>Revenue breakdown</div>
          <div style={{ background: C.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
            {[
              { label: "Gross revenue", amount: gross, color: C.brand, pct: 100 },
              { label: "Studio split (out)", amount: -split, color: C.gold, pct: gross ? Math.round((split / gross) * 100) : 0 },
              { label: "Your net", amount: net, color: "#4A8C6F", pct: gross ? Math.round((net / gross) * 100) : 0 },
            ].map(({ label, amount, color, pct: p }) => (
              <div key={label} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{amount < 0 ? "-" : ""}{money(Math.abs(amount))}</span>
                </div>
                <div style={{ height: 5, background: C.line, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: p + "%", background: color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* vs. average */}
      {avgNetAll !== null && (
        <div style={{ background: net >= avgNetAll ? hexA("#4A8C6F", 0.08) : hexA(C.gold, 0.08), borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>vs. your average</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>This session net</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: net >= avgNetAll ? "#4A8C6F" : C.gold }}>{money(net)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg net ({allSessions.length} sessions)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{money(Math.round(avgNetAll))}</div>
            </div>
            {avgConvAll !== null && <>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>This session conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.conversion >= avgConvAll ? "#4A8C6F" : C.gold }}>{pct(r.conversion)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{pct(avgConvAll)}</div>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* Post-session actions */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 8 }}>Post-session actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {postItems.map(({ label, done }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: done ? hexA("#4A8C6F", 0.07) : hexA(C.gold, 0.07) }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#4A8C6F" : C.line, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: done ? C.ink3 : C.ink, textDecoration: done ? "line-through" : "none" }}>{label}</span>
              {!done && <span style={{ marginLeft: "auto", fontSize: 11, color: C.gold, fontWeight: 600 }}>Pending</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment & notes */}
      {r.equipmentNeeded && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Equipment needed</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px" }}>{r.equipmentNeeded}</div>
        </div>
      )}
      {r.notes && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Session notes</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px", fontStyle: "italic", lineHeight: 1.5 }}>{r.notes}</div>
        </div>
      )}
    </div>
  );
}
/* ============================================================
   PARTNER LAUNCH CHECKLIST
   ============================================================ */
function PartnerLaunchChecklist({ checklist, onChange, partnerName }) {
  const cl = checklist || emptyChecklist();
  const toggle = (id) => onChange({ ...cl, [id]: !cl[id] });

  const totalItems = PARTNER_CHECKLIST.length;
  const totalDone  = PARTNER_CHECKLIST.filter(i => !!cl[i.id]).length;
  const pct        = Math.round((totalDone / totalItems) * 100);

  // Determine active phase (first incomplete phase)
  const activePhaseId = PARTNER_CHECKLIST_PHASES.find(ph =>
    ph.items.some(i => !cl[i.id])
  )?.id || "post_event";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Overall progress header */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{partnerName}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {totalDone} of {totalItems} launch items complete
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 700,
            color: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .4s ease",
            width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : `linear-gradient(90deg, ${C.brand}, #6B5CE7)`,
          }} />
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: "#4A8C6F", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5 }}>
            <Check size={14} /> Fully launched — this partner is ready to run.
          </div>
        )}

        {/* Phase progress pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {PARTNER_CHECKLIST_PHASES.map(ph => {
            const done  = ph.items.filter(i => !!cl[i.id]).length;
            const total = ph.items.length;
            const complete = done === total;
            return (
              <div key={ph.id} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: complete ? ph.bg : C.surface,
                border: `1px solid ${complete ? ph.color : C.line}`,
              }}>
                <span style={{ fontSize: 12 }}>{ph.Icon ? <ph.Icon size={14} color={ph.color} strokeWidth={1.5} /> : null}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600,
                  color: complete ? ph.color : C.ink3 }}>
                  {ph.label}
                </span>
                <span style={{ fontSize: 11, color: complete ? ph.color : C.ink3, opacity: 0.7 }}>
                  {done}/{total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase sections — timeline style */}
      <div style={{ position: "relative" }}>
        {/* Vertical connecting line */}
        <div style={{
          position: "absolute", left: 19, top: 24, bottom: 24,
          width: 2, background: C.line, zIndex: 0,
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {PARTNER_CHECKLIST_PHASES.map((ph, phIdx) => {
            const phaseDone  = ph.items.filter(i => !!cl[i.id]).length;
            const phaseTotal = ph.items.length;
            const phaseComplete = phaseDone === phaseTotal;
            const isActive = ph.id === activePhaseId;
            const isPast   = PARTNER_CHECKLIST_PHASES.findIndex(p => p.id === activePhaseId) > phIdx;

            return (
              <div key={ph.id} style={{ position: "relative", zIndex: 1 }}>
                {/* Phase header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  {/* Phase dot */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: phaseComplete ? ph.color : isActive ? ph.bg : C.surface,
                    border: `2px solid ${phaseComplete || isActive ? ph.color : C.line}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, boxShadow: isActive ? `0 0 0 3px ${ph.color}25` : "none",
                    transition: "all .2s",
                  }}>
                    {phaseComplete ? <Check size={16} color="#fff" strokeWidth={1.5} /> : (ph.Icon ? <ph.Icon size={16} color="#fff" strokeWidth={1.5} /> : null)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isActive || phaseComplete ? ph.color : C.ink3 }}>
                        {ph.label}
                      </span>
                      {isActive && !phaseComplete && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: ph.bg, color: ph.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Current
                        </span>
                      )}
                      {phaseComplete && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: ph.color, opacity: 0.7 }}>
                          Complete ✓
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ height: 4, background: C.line, borderRadius: 4, marginTop: 5, width: 120, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4,
                        width: `${Math.round((phaseDone / phaseTotal) * 100)}%`,
                        background: ph.color, transition: "width .3s ease" }} />
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: phaseComplete ? ph.color : C.ink3, fontWeight: 600 }}>
                    {phaseDone}/{phaseTotal}
                  </span>
                </div>

                {/* Checklist items */}
                <div style={{ marginLeft: 52, display: "flex", flexDirection: "column", gap: 2 }}>
                  {ph.items.map(item => {
                    const checked = !!cl[item.id];
                    return (
                      <button key={item.id} onClick={() => toggle(item.id)} style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        textAlign: "left", padding: "8px 12px", borderRadius: 8,
                        background: checked ? hexA(ph.color, 0.07) : "transparent",
                        border: `1px solid ${checked ? hexA(ph.color, 0.2) : "transparent"}`,
                        cursor: "pointer", transition: "all .12s",
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${checked ? ph.color : C.line}`,
                          background: checked ? ph.color : C.surface,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s",
                        }}>
                          {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <span style={{
                          fontSize: 13.5, fontWeight: checked ? 400 : 500,
                          color: checked ? C.ink3 : C.ink,
                          textDecoration: checked ? "line-through" : "none",
                          flex: 1,
                        }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTACT TIMELINE
   ============================================================ */
const TL_COLORS = {
  session:    C.brand,
  offer_sent: C.gold,
  offer_won:  "#4A8C6F",
  offer_lost: "#C0573F",
  followup:   "#7B68EE",
  referral:   C.gold,
  upcoming:   C.ink3,
  milestone:  C.brandDeep,
  email_sent: "#2563EB",
};

function tlEvent(date, type, title, detail, extra = {}) {
  return { date: date || "", type, title, detail, ...extra };
}

function buildClientTimeline(record, data, today) {
  const events = [];
  const clientOffers = (data.offers || []).filter((o) => o.clientId === record.id);
  const clientFUs = (data.followups || []).filter((f) => f.clientId === record.id);

  // First contact / lead added
  const firstDate = record.firstSession || record.nextSession || "";
  if (firstDate) {
    events.push(tlEvent(record.firstSession || "", "milestone",
      "First session attended",
      [record.source && `Source: ${record.source}`, record.packageType !== "None" && record.packageType && `Package: ${record.packageType}`].filter(Boolean).join(" · ") || "No package yet",
      { sub: record.notes || "" }));
  } else {
    events.push(tlEvent("", "milestone", "Lead added", `Source: ${record.source || "—"} · Status: ${record.status}`, { sub: record.notes || "" }));
  }

  // All sessions (we use firstSession as start, lastSession as most recent)
  if (record.lastSession && record.lastSession !== record.firstSession) {
    const count = Number(record.sessionsAttended) || 0;
    events.push(tlEvent(record.lastSession, "session",
      `Most recent session — session #${count}`,
      `${count} total session${count !== 1 ? "s" : ""} attended · LTV: ${money(record.lifetimeValue)}`));
  }

  // Offers
  clientOffers.forEach((o) => {
    events.push(tlEvent(o.dateOffered, "offer_sent",
      `${o.offerType} offer sent`,
      `${money(o.price)} · status: ${o.status}`,
      { offerId: o.id }));
    if (o.closeDate && o.status !== "Offered") {
      events.push(tlEvent(o.closeDate,
        o.status === "Accepted" ? "offer_won" : "offer_lost",
        `${o.offerType} ${o.status.toLowerCase()}`,
        o.status === "Accepted" ? `Payment received: ${money(o.price)}` : `Declined on ${fmtDate(o.closeDate)}`,
        { offerId: o.id }));
    }
  });

  // Follow-ups
  clientFUs.forEach((f) => {
    events.push(tlEvent(f.lastContact, "followup",
      `${f.futype} follow-up`,
      f.outcome || "Pending response",
      { pending: !f.outcome, nextAction: f.nextAction }));
  });

  // Emails sent from CRM
  (record.emailHistory || []).forEach(entry => {
    const dateStr = entry.date ? entry.date.slice(0, 10) : "";
    events.push(tlEvent(dateStr, "email_sent",
      `Email sent: ${entry.templateName}`,
      `To: ${entry.to}`));
  });

  // Next session (future)
  if (record.nextSession && record.nextSession >= today) {
    events.push(tlEvent(record.nextSession, "upcoming",
      "Next session scheduled",
      fmtDate(record.nextSession, true),
      { future: true }));
  }

  // Referral status
  const pendingFU = clientFUs.find((f) => !f.outcome && f.nextAction);
  const highReferral = record.referral === "High";
  const isAdvocate = record.status === "Advocate";

  return {
    events: events.filter((e) => e.date || e.type === "milestone").sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Status",        value: record.status },
      { label: "Segment",       value: record.clientType || "—", accent: CLIENT_TYPE_COLOR[record.clientType] },
      { label: "Source",        value: record.source || "—" },
      { label: "First session", value: fmtDate(record.firstSession) || "Not yet" },
      { label: "Sessions",      value: `${record.sessionsAttended || 0} attended` },
      { label: "Package",       value: record.packageType || "None" },
      { label: "Lifetime value",value: money(record.lifetimeValue || 0) },
      { label: "Referral",      value: (record.referral || "—") + " potential", accent: REFERRAL_COLOR[record.referral] },
      { label: "Open offers",   value: clientOffers.filter((o) => OPEN_STATUSES.includes(o.status)).length + " pending" },
      { label: "Intent tags",   value: (record.tags || []).join(", ") || "None set" },
      { label: "Testimonial",   value: isAdvocate ? "Advocate — request now" : highReferral ? "High potential — not yet requested" : "Not yet requested" },
      { label: "Next follow-up",value: pendingFU ? fmtDate(pendingFU.nextAction) : "None scheduled", accent: pendingFU && pendingFU.nextAction <= today ? "#C0573F" : null },
    ],
  };
}

function buildPartnerTimeline(record, data, derived, today) {
  const sessions = [...(derived.sessionsByStudio[record.id] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalNet = sessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const totalAttend = sessions.reduce((a, s) => a + (Number(s.attendance) || 0), 0);
  const avgAttend = sessions.length ? Math.round(totalAttend / sessions.length) : 0;

  const events = [];

  // Partnership milestone
  events.push(tlEvent(record.outreachDate || sessions[0]?.date || "", "milestone",
    `Partnership: ${record.stage}`,
    `${record.studioSharePct ? `${record.studioSharePct}% to studio` : (record.revShare || "Revenue share TBD")} · Contact: ${record.contact} (${record.role})`));

  // Outreach date (if different from first session)
  if (record.outreachDate) {
    events.push(tlEvent(record.outreachDate, "followup",
      "First outreach sent",
      `Initial contact with ${record.contact} · ${fmtStudioType(record.studioType)}`));
  }

  // Last touch
  if (record.lastTouch && record.lastTouch !== record.outreachDate) {
    events.push(tlEvent(record.lastTouch, "followup",
      "Last touchpoint",
      record.notes ? record.notes.slice(0, 100) : "Check notes for details"));
  };

  // All sessions as events
  sessions.forEach((s, i) => {
    events.push(tlEvent(s.date, "session",
      `Session ${i + 1}: ${cleanName(s.name)}`,
      `${s.attendance} in room · ${money(s.netRevenue)} net · ${pct(s.conversion)} conversion · ${s.packagesSold} pkg sold`,
      { notes: s.notes, sessionId: s.id }));
  });

  // Upcoming sessions
  const upcomingSessions = data.sessions.filter((s) => s.studioId === record.id && s.date >= today);
  upcomingSessions.forEach((s) => {
    if (!sessions.find((x) => x.id === s.id)) {
      events.push(tlEvent(s.date, "upcoming", `Upcoming: ${cleanName(s.name)}`, fmtDate(s.date, true), { future: true }));
    }
  });

  // Emails sent from CRM
  (record.emailHistory || []).forEach(entry => {
    const dateStr = entry.date ? entry.date.slice(0, 10) : "";
    events.push(tlEvent(dateStr, "email_sent",
      `Email sent: ${entry.templateName}`,
      `To: ${entry.to}`));
  });

  // Next action
  if (record.nextAction) {
    events.push(tlEvent(record.nextAction, "upcoming",
      `Next action scheduled`,
      `Follow up with ${record.contact}`,
      { future: record.nextAction >= today, pending: record.nextAction < today, nextAction: record.nextAction }));
  }

  return {
    events: events.sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Stage",             value: record.stage, accent: STAGE_COLOR[record.stage] },
      { label: "Studio type",       value: fmtStudioType(record.studioType) },
      { label: "Location",          value: record.location || "—" },
      { label: "Contact",           value: `${record.contact || "—"} (${record.role || "—"})` },
      { label: "Email",             value: record.email || "—" },
      { label: "Est. community",    value: record.estimatedCommunitySize ? Number(record.estimatedCommunitySize).toLocaleString() + " people" : "—" },
      { label: "Revenue potential", value: money(record.revenuePotential || 0), accent: C.brand },
      { label: "Close probability", value: record.closeProbability || "—", accent: CLOSE_PROB_COLOR[record.closeProbability] },
      { label: "Studio revenue share", value: record.studioSharePct ? `${record.studioSharePct}% to studio` : (record.revShare || "TBD") },
      { label: "Contract status",   value: record.contractStatus || "None" },
      { label: "First outreach",    value: fmtDate(record.outreachDate) || "—" },
      { label: "Last touch",        value: fmtDate(record.lastTouch) || "—" },
      { label: "Next action",       value: fmtDate(record.nextAction) || "None scheduled", accent: record.nextAction && record.nextAction <= today ? "#C0573F" : null },
      { label: "Total sessions",    value: sessions.length + " logged" },
      { label: "Avg attendance",    value: avgAttend + " per session" },
      { label: "Total net revenue", value: money(totalNet), accent: C.brand },
      { label: "Emails sent",       value: (record.emailHistory || []).length + " from CRM" },
      { label: "Promotion",         value: record.promotionCommitments || "None noted" },
      { label: "Insurance",         value: record.insuranceReqs || "None noted" },
      { label: "Notes",             value: record.notes ? record.notes.slice(0, 80) + (record.notes.length > 80 ? "…" : "") : "—" },
    ],
  };
}

function ContactTimeline({ db, record, data, derived, today, onOpenRelated }) {
  const { events, summary } = db === "clients"
    ? buildClientTimeline(record, data, today)
    : buildPartnerTimeline(record, data, derived, today);

  const TL_ICON = {
    session:    <Wind size={13} />,
    offer_sent: <DollarSign size={13} />,
    offer_won:  <Check size={13} />,
    offer_lost: <X size={13} />,
    followup:   <Phone size={13} />,
    referral:   <Users size={13} />,
    upcoming:   <CalendarDays size={13} />,
    milestone:  <ArrowUpRight size={13} />,
    email_sent: <Send size={13} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {summary.map(({ label, value, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 12 }}>
          Timeline · {events.length} event{events.length !== 1 ? "s" : ""}
        </div>

        {events.length === 0
          ? <Empty pad>No events logged yet — add sessions, offers, and follow-ups to build this timeline.</Empty>
          : (
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: C.line, borderRadius: 2 }} />

              {events.map((ev, i) => {
                const color = TL_COLORS[ev.type] || C.ink3;
                const isFuture = ev.future || (ev.date && ev.date > today);
                return (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, opacity: isFuture ? 0.7 : 1 }}>
                    {/* Dot */}
                    <div style={{ flexShrink: 0, width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: isFuture ? C.surfaceAlt : color,
                        border: `2px solid ${isFuture ? C.line : color}`, display: "flex", alignItems: "center",
                        justifyContent: "center", color: isFuture ? C.ink3 : "#fff", zIndex: 1, position: "relative",
                      }}>
                        {TL_ICON[ev.type]}
                      </div>
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, background: isFuture ? "transparent" : C.surface,
                      border: `1px solid ${isFuture ? C.lineSoft : C.line}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 2,
                      borderLeft: isFuture ? undefined : `3px solid ${color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{ev.title}</div>
                        {ev.date && (
                          <span style={{ fontSize: 11, color: isFuture ? C.ink3 : C.brand, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {isFuture ? "📅 " : ""}{fmtDate(ev.date)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{ev.detail}</div>
                      {ev.sub && ev.sub.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.sub.length > 180 ? ev.sub.slice(0, 180) + "…" : ev.sub}
                        </div>
                      )}
                      {ev.notes && ev.notes.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.notes.length > 180 ? ev.notes.slice(0, 180) + "…" : ev.notes}
                        </div>
                      )}
                      {ev.pending && ev.nextAction && (
                        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                          color: ev.nextAction <= today ? "#C0573F" : C.gold, background: ev.nextAction <= today ? hexA("#C0573F", 0.1) : C.goldSoft,
                          padding: "2px 8px", borderRadius: 6 }}>
                          <CalendarDays size={11} />
                          Next action: {fmtDate(ev.nextAction)}{ev.nextAction <= today ? " · overdue" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

// Standalone component so useState/useRef/useEffect are always called unconditionally.
// FieldInput previously called these hooks inside an `else if (type === "tagselector")`
// branch, violating the Rules of Hooks and risking state corruption on type change.
function TagSelectorInput({ fld, value, onChange }) {
  const resolvedOptions = typeof fld.options === "function" ? fld.options() : (fld.options || []);
  const selected  = Array.isArray(value) ? value : (value ? [value] : []);
  const available = resolvedOptions.filter(o => !selected.includes(o));
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {selected.map(tag => (
        <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px 4px 12px", borderRadius: 20, background: C.brandSoft, color: C.brandDeep, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.brand}` }}>
          {tag}
          <button onClick={() => onChange(selected.filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: C.brand, fontSize: 13, marginLeft: 2 }}>×</button>
        </span>
      ))}
      {available.length > 0 && (
        <div ref={ref} style={{ position: "relative" }}>
          <button onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.surface, color: C.ink2, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.line}`, cursor: "pointer" }}>
            <Plus size={12} /> Add type
          </button>
          {open && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 999, minWidth: 150, padding: "4px 0", overflow: "hidden" }}>
              {available.map(opt => (
                <button key={opt} onClick={() => { onChange([...selected, opt]); setOpen(false); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.ink }}
                  onMouseEnter={e => e.currentTarget.style.background = C.brandSoft}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {selected.length === 0 && available.length === 0 && <span style={{ fontSize: 12.5, color: C.ink3 }}>—</span>}
    </div>
  );
}

function FieldInput({ fld, value, onChange, data }) {
  const { type } = fld;
  const resolvedOptions = typeof fld.options === "function" ? fld.options() : (fld.options || []);
  let control;
  if (type === "dropdown") {
    control = (
      <div style={{ position: "relative" }}>
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", appearance: "none", WebkitAppearance: "none",
            padding: "8px 34px 8px 12px", borderRadius: 9,
            border: `1px solid ${C.line}`, background: C.surface,
            fontSize: 13.5, color: value ? C.ink : C.ink3,
            cursor: "pointer", outline: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          }}
        >
          <option value="">— select —</option>
          {resolvedOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} color={C.ink3} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      </div>
    );
  } else if (type === "select") {
    control = (
      <div className="sb-chiprow">
        {resolvedOptions.map((o) => {
          const on = value === o;
          const cl = fld.key === "status" || fld.key === "stage" ? (STATUS_COLOR[o] || STAGE_COLOR[o]) : C.brand;
          return <button key={o} className="sb-selchip" onClick={() => onChange(o)}
            style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>{o}</button>;
        })}
      </div>
    );
  } else if (type === "multiselect") {
    const vals = Array.isArray(value) ? value : [];
    control = (
      <div className="sb-chiprow" style={{ flexWrap: "wrap" }}>
        {resolvedOptions.map((o) => {
          const on = vals.includes(o);
          const cl = fld.colorMap ? (fld.colorMap[o] || C.brand) : C.brand;
          return (
            <button key={o} className="sb-selchip" onClick={() => onChange(on ? vals.filter(v => v !== o) : [...vals, o])}
              style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (type === "tagselector") {
    control = <TagSelectorInput fld={fld} value={value} onChange={onChange} />;
  } else if (type === "relation") {
    control = (
      <select className="sb-input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— none —</option>
        {data[fld.target].map((r) => <option key={r.id} value={r.id}>{cleanName(r.name)}</option>)}
      </select>
    );
  } else if (type === "textarea") {
    control = <textarea className="sb-input" rows={fld.rows || 3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "checkbox") {
    control = (
      <div style={{ display: "flex", gap: 8 }}>
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => onChange(v)} style={{
            padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
            background: value === v ? (v ? "#4A8C6F" : C.ink3) : C.surface,
            color: value === v ? "#fff" : C.ink2,
            border: `1px solid ${value === v ? (v ? "#4A8C6F" : C.ink3) : C.line}`,
          }}>{v ? "Yes ✓" : "No"}</button>
        ))}
      </div>
    );
  } else if (type === "date") {
    control = <input className="sb-input" type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "number" || type === "currency" || type === "percent") {
    control = (
      <div style={{ position: "relative" }}>
        {type === "currency" && <span className="sb-affix" style={{ left: 10 }}>$</span>}
        <input className="sb-input" type="number" step={type === "percent" ? "0.01" : "any"}
          style={{ paddingLeft: type === "currency" ? 22 : 12 }}
          value={value === "" || value == null ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        {type === "percent" && <span className="sb-affix" style={{ right: 10 }}>{value !== "" && value != null ? pct(value) : "0–1"}</span>}
      </div>
    );
  } else {
    control = <input className="sb-input" type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
      value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className={"sb-field" + (type === "textarea" || type === "select" || type === "tagselector" || fld.wide ? " sb-field-wide" : "")}>
      <span className="sb-flabel">{fld.label}</span>
      {control}
    </label>
  );
}

/* ============================================================
   CSV IMPORT
   ============================================================ */
const IMPORT_MAP = {
  partners: { file: "02-Studio-Partners.csv", map: { "studio name": "name", location: "location", "contact name": "contact", role: "role", email: "email", phone: "phone", "partnership stage": "stage", "studio revenue share %": "studioSharePct", "avg attendance": "avgAttendance", "sessions per month": "sessionsPerMonth", notes: "notes" }, nums: ["studioSharePct", "avgAttendance", "sessionsPerMonth"] },
  clients: { file: "01-Clients.csv", map: { name: "name", phone: "phone", email: "email", source: "source", status: "status", "first session date": "firstSession", "sessions attended": "sessionsAttended", "last session date": "lastSession", "next session date": "nextSession", "package type": "packageType", "lifetime value": "lifetimeValue", "emotional notes": "notes", "referral potential": "referral" }, nums: ["sessionsAttended", "lifetimeValue"] },
  sessions: { file: "03-Sessions.csv", map: { "session name": "name", studio: "_studio", date: "date", "attendance count": "attendance", revenue: "revenue", "your net revenue": "netRevenue", "conversion rate": "conversion", "packages sold": "packagesSold", "referrals generated": "referralsGenerated", notes: "notes" }, nums: ["attendance", "revenue", "netRevenue", "conversion", "packagesSold", "referralsGenerated"], rel: { field: "_studio", to: "partners", set: "studioId" } },
  offers: { file: "04-Offers-Sales.csv", map: { offer: "name", "client name": "_client", "offer type": "offerType", price: "price", status: "status", "date offered": "dateOffered", "close date": "closeDate" }, nums: ["price"], rel: { field: "_client", to: "clients", set: "clientId" } },
  content: { file: "05-Content-Referral.csv", map: { "content title": "name", type: "type", platform: "platform", "date posted": "datePosted", engagement: "engagement", "leads generated": "leads", "sessions booked": "booked" }, nums: ["engagement", "leads", "booked"] },
  followups: { file: "06-Follow-Ups.csv", map: { "follow-up": "name", "client name": "_client", stage: "stage", "last contact date": "lastContact", "follow-up type": "futype", "next action date": "nextAction", outcome: "outcome" }, rel: { field: "_client", to: "clients", set: "clientId" } },
  expenses: { file: "07-Expenses.csv", map: { date: "date", vendor: "vendor", description: "description", amount: "amount", category: "category", "payment method": "paymentMethod", "paymentmethod": "paymentMethod", "tax deductible": "taxDeductible", "taxdeductible": "taxDeductible", recurring: "recurring", "recurring freq": "recurringFreq", "recurringfreq": "recurringFreq", "linked session": "linkedSession", "linked partner": "linkedPartner", "receipt url": "receiptUrl", notes: "notes" }, nums: ["amount"], bools: ["taxDeductible", "recurring"] },
};
// Calendly bookings (`registrations`) are sync-only — not in IMPORT_MAP / not CSV-importable.
const DB_ORDER = ["partners", "clients", "sessions", "offers", "content", "followups", "expenses"];

/* ============================================================
   EDIT PROFILE MODAL
   ============================================================ */
/* ============================================================
   ADMIN VIEW
   ============================================================ */

/* ============================================================
   EXPENSE SUMMARY VIEW
   ============================================================ */


const DB_SCHEMA = [
  {
    table: "clients", label: "Clients", lane: "B2C",
    description: "Individual clients — leads, attendees, members, and advocates.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Full name" },
      { name: "email",           type: "email",    required: false, description: "Contact email address" },
      { name: "phone",           type: "string",   required: false, description: "Phone number" },
      { name: "source",          type: "select",   required: false, description: "How the client found Simply Breathe", values: "Referral · Instagram · Studio · Website · Direct · Event · Corporate · Other" },
      { name: "type",            type: "select",   required: false, description: "Client classification", values: "First-time attendee · Repeat attendee · Member · Advocate · Referral source · Private client · Studio attendee · Virtual attendee · Corporate attendee · High-value lead · Past client – reactivate" },
      { name: "tags",            type: "array",    required: false, description: "Intent / emotional tags", values: "Stress relief · Anxiety · Burnout · Performance · Grief · Letting go · Self-confidence · Nervous system reset · Transformation seeker · Spiritual growth · Corporate wellness" },
      { name: "firstContact",    type: "date",     required: false, description: "Date of first contact (ISO 8601)" },
      { name: "lastSession",     type: "date",     required: false, description: "Date of most recent session attended" },
      { name: "nextFollowUp",    type: "date",     required: false, description: "Scheduled next follow-up date" },
      { name: "status",          type: "select",   required: false, description: "Relationship status", values: "New lead · Active · Warm · VIP · Advocate · Inactive · Lost" },
      { name: "referralSource",  type: "string",   required: false, description: "Name of the person who referred this client" },
      { name: "referralPotential", type: "select", required: false, description: "Likelihood to refer others", values: "High · Medium · Low" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "partners", label: "Studio Partners", lane: "B2B",
    description: "Studios, gyms, and wellness spaces that host breathwork events.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Studio or business name" },
      { name: "owner",           type: "string",   required: false, description: "Owner or manager name" },
      { name: "email",           type: "email",    required: false, description: "Primary contact email" },
      { name: "phone",           type: "string",   required: false, description: "Phone number" },
      { name: "location",        type: "string",   required: false, description: "City / address" },
      { name: "type",            type: "select",   required: false, description: "Studio category", values: "Yoga · Gym · Meditation · Wellness · Pilates · Corporate · Other" },
      { name: "communitySize",   type: "number",   required: false, description: "Estimated active member / follower count" },
      { name: "bestJourney",     type: "string",   required: false, description: "Best-fit breathwork journey for this audience" },
      { name: "revenuePotential",type: "currency",  required: false, description: "Estimated total revenue potential ($)" },
      { name: "stage",           type: "select",   required: false, description: "Pipeline stage", values: "Target Identified · Researched · Initial Outreach Sent · Follow-Up Needed · Discovery Call Booked · Demo Session Offered · Demo Completed · Pilot Proposed · Agreement Sent · Agreement Signed · First Session Scheduled · Pilot Completed · Recurring Partner · Lost / Not a Fit" },
      { name: "probability",     type: "number",   required: false, description: "Probability of closing (0–100%)" },
      { name: "lastTouch",       type: "date",     required: false, description: "Date of last activity or contact" },
      { name: "nextAction",      type: "string",   required: false, description: "Next required action" },
      { name: "contractStatus",  type: "select",   required: false, description: "Agreement status", values: "None · Sent · Signed · Expired" },
      { name: "insuranceReq",    type: "string",   required: false, description: "Insurance requirements noted" },
      { name: "promotionCommit", type: "string",   required: false, description: "Agreed promotion commitments" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes and conversation history" },
      { name: "checklist",       type: "object",   required: false, description: "Studio Launch Checklist — 4-phase, 23 boolean items (before_signing, after_signing, before_event, after_event)" },
    ],
  },
  {
    table: "sessions", label: "Sessions", lane: "B2C",
    description: "Individual breathwork events — studio, virtual, or private.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Session date (ISO 8601)" },
      { name: "time",            type: "string",   required: false, description: "Session start time" },
      { name: "studio",          type: "string",   required: false, description: "Studio name or 'Virtual'" },
      { name: "journey",         type: "string",   required: false, description: "Breathwork journey used" },
      { name: "status",          type: "select",   required: false, description: "Lifecycle status", values: "Planned · Booking Open · Promotion Active · Almost Full · Completed · Follow-Up Pending · Closed Out" },
      { name: "capacity",        type: "number",   required: false, description: "Maximum attendee capacity" },
      { name: "registered",      type: "number",   required: false, description: "Number registered" },
      { name: "paid",            type: "number",   required: false, description: "Number who paid" },
      { name: "waivers",         type: "number",   required: false, description: "Number of waivers completed" },
      { name: "noShows",         type: "number",   required: false, description: "Number of no-shows" },
      { name: "grossRevenue",    type: "currency",  required: false, description: "Total gross revenue collected ($)" },
      { name: "studioSplit",     type: "currency",  required: false, description: "Amount paid to studio ($)" },
      { name: "netRevenue",      type: "currency",  required: false, description: "Net revenue after studio split ($)" },
      { name: "roomSetup",       type: "select",   required: false, description: "Room setup status", values: "Not started · In progress · Complete" },
      { name: "audioSetup",      type: "select",   required: false, description: "Music / headset setup status", values: "Not started · In progress · Complete" },
      { name: "testimonialsCapt",type: "boolean",  required: false, description: "Were testimonials captured post-session?" },
      { name: "followUpSent",    type: "boolean",  required: false, description: "Was the post-session follow-up email sent?" },
      { name: "rebookOfferSent", type: "boolean",  required: false, description: "Was a rebook offer sent?" },
      { name: "referralsReq",    type: "boolean",  required: false, description: "Were referrals requested?" },
      { name: "breakthroughNoted", type: "boolean", required: false, description: "Was a client breakthrough noted? Triggers testimonial request alert." },
      { name: "equipChecklist",  type: "object",   required: false, description: "Equipment checklist — 3 phases, 17 boolean items (audio_tech, room_supplies, admin_checkin)" },
      { name: "conversionResult",type: "string",   required: false, description: "Outcome summary (e.g. '2 3-packs sold')" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "offers", label: "Offers", lane: "B2C",
    description: "Sales offers made to clients or studios.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "client",          type: "string",   required: true,  description: "Client or studio name" },
      { name: "type",            type: "select",   required: false, description: "Offer type", values: "Single session · 3-pack · 6-pack · 12-pack · Private session · Studio pilot · Studio recurring agreement · Corporate event · Group event · Referral partner offer" },
      { name: "amount",          type: "currency",  required: false, description: "Offer value ($)" },
      { name: "dateOffered",     type: "date",     required: false, description: "Date offer was sent" },
      { name: "expiresOn",       type: "date",     required: false, description: "Offer expiration date" },
      { name: "followUpDate",    type: "date",     required: false, description: "Scheduled follow-up date" },
      { name: "status",          type: "select",   required: false, description: "Offer lifecycle status", values: "Drafted · Sent · Viewed · Follow-Up Due · Accepted · Paid · Declined · Expired" },
      { name: "probability",     type: "number",   required: false, description: "Estimated close probability (0–100%)" },
      { name: "source",          type: "select",   required: false, description: "Lead source for this offer", values: "Referral · Instagram · Studio · Website · Direct · Event · Corporate · Other" },
      { name: "reasonLost",      type: "string",   required: false, description: "Reason if offer was declined or expired" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "revenue", label: "Revenue", lane: "B2C",
    description: "Individual revenue line items for attribution and profitability analysis.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Revenue date" },
      { name: "client",          type: "string",   required: false, description: "Linked client name" },
      { name: "session",         type: "string",   required: false, description: "Linked session ID or name" },
      { name: "channel",         type: "select",   required: false, description: "Revenue channel", values: "Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner" },
      { name: "gross",           type: "currency",  required: false, description: "Gross revenue ($)" },
      { name: "stripeFee",       type: "currency",  required: false, description: "Payment processing fee ($)" },
      { name: "studioSplit",     type: "currency",  required: false, description: "Studio share ($)" },
      { name: "facilitatorCost", type: "currency",  required: false, description: "Facilitator / contractor cost ($)" },
      { name: "refunds",         type: "currency",  required: false, description: "Refund amount ($)" },
      { name: "net",             type: "currency",  required: false, description: "Net revenue after all deductions ($)" },
      { name: "costCenter",      type: "string",   required: false, description: "Cost center or accounting category" },
      { name: "source",          type: "string",   required: false, description: "Marketing source or campaign" },
      { name: "campaign",        type: "string",   required: false, description: "Campaign name" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "expenses", label: "Expenses", lane: "Core",
    description: "Business expenses — manually entered, or auto-generated from studio revenue splits and canceled bookings.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Expense date (ISO 8601)" },
      { name: "vendor",          type: "string",   required: false, description: "Vendor or payee name" },
      { name: "description",     type: "string",   required: false, description: "What the expense was for" },
      { name: "amount",          type: "currency",  required: false, description: "Expense amount ($)" },
      { name: "category",        type: "select",   required: false, description: "Expense category", values: "Equipment & Supplies · Software & Subscriptions · Marketing & Advertising · Travel & Transport · Education & Training · Professional Services · Insurance · Administrative · Studio & Venue · Studio Split · Refunds & Cancellations · Other" },
      { name: "paymentMethod",   type: "select",   required: false, description: "How the expense was paid", values: "Credit Card · Bank Transfer · Cash · Check · Other" },
      { name: "taxDeductible",   type: "boolean",  required: false, description: "Is this expense tax deductible?" },
      { name: "recurring",       type: "boolean",  required: false, description: "Is this a recurring expense?" },
      { name: "recurringFreq",   type: "select",   required: false, description: "Recurrence frequency", values: "One-time · Monthly · Quarterly · Annual" },
      { name: "linkedSession",   type: "string",   required: false, description: "Linked session ID (if tied to a session)" },
      { name: "linkedPartner",   type: "string",   required: false, description: "Linked studio partner ID (if tied to a partner)" },
      { name: "receiptUrl",      type: "string",   required: false, description: "Link to a receipt or supporting document" },
      { name: "stripeRefundId",  type: "string",   required: false, description: "Stripe refund ID (re_...) when the expense reflects an actual Stripe refund" },
      { name: "refundedAt",      type: "date",     required: false, description: "When the Stripe refund was issued (ISO 8601)" },
      { name: "auto",            type: "boolean",  required: false, description: "True for auto-generated rows (studio split / canceled booking) — read-only in the UI" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "referrals", label: "Referrals", lane: "B2C",
    description: "Referral relationships — who referred whom and the resulting revenue.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "referrer",        type: "string",   required: true,  description: "Name of person who gave the referral" },
      { name: "referred",        type: "string",   required: false, description: "Name of person referred" },
      { name: "date",            type: "date",     required: false, description: "Date referral was received" },
      { name: "status",          type: "select",   required: false, description: "Referral status", values: "Received · Contacted · Attended · Purchased · Thanked · Closed" },
      { name: "attended",        type: "boolean",  required: false, description: "Did the referred person attend a session?" },
      { name: "purchased",       type: "boolean",  required: false, description: "Did they purchase an offer?" },
      { name: "revenue",         type: "currency",  required: false, description: "Revenue generated from this referral ($)" },
      { name: "thankYouSent",    type: "boolean",  required: false, description: "Was a thank-you sent to the referrer?" },
      { name: "rewardGiven",     type: "boolean",  required: false, description: "Was a referral reward given?" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "content", label: "Content Calendar", lane: "B2C",
    description: "Social media and email content — ideas, drafts, scheduled, and published.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "title",           type: "string",   required: true,  description: "Post title or working title" },
      { name: "body",            type: "textarea", required: false, description: "Caption or body copy" },
      { name: "platform",        type: "select",   required: false, description: "Publishing platform", values: "Instagram · Facebook · LinkedIn · TikTok · YouTube · Email · Blog · Other" },
      { name: "category",        type: "select",   required: false, description: "Content category", values: "Client transformation · Breathwork education · Nervous system regulation · Behind the scenes · Studio partner promotion · Founder story · Testimonials · FAQs · Contraindications/safety · Upcoming sessions" },
      { name: "status",          type: "select",   required: false, description: "Content lifecycle status", values: "Idea · Draft · Scheduled · Published · Archived" },
      { name: "scheduledDate",   type: "date",     required: false, description: "Scheduled publish date" },
      { name: "reach",           type: "number",   required: false, description: "Total accounts reached" },
      { name: "likes",           type: "number",   required: false, description: "Like count" },
      { name: "comments",        type: "number",   required: false, description: "Comment count" },
      { name: "shares",          type: "number",   required: false, description: "Share / repost count" },
      { name: "saves",           type: "number",   required: false, description: "Save count" },
      { name: "leads",           type: "number",   required: false, description: "Leads generated from this post" },
      { name: "booked",          type: "number",   required: false, description: "Bookings attributed to this post" },
      { name: "revenue",         type: "currency",  required: false, description: "Revenue attributed to this post ($)" },
      { name: "sessionPromoted", type: "string",   required: false, description: "Session name promoted in this post" },
      { name: "studioTagged",    type: "string",   required: false, description: "Studio partner tagged" },
      { name: "reused",          type: "boolean",  required: false, description: "Is this repurposed content?" },
      { name: "cta",             type: "string",   required: false, description: "Call to action text or link" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "outreach", label: "Outreach Hub", lane: "B2B",
    description: "Proactive studio and referral outreach tracking.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Target name (studio or individual)" },
      { name: "targetType",      type: "select",   required: false, description: "Type of outreach target", values: "Studio · Individual · Corporate · Event Space · Wellness Brand" },
      { name: "contactStatus",   type: "select",   required: false, description: "Contact lifecycle status", values: "Not contacted · Contacted · Responded · Meeting booked · Demo offered · Negotiating · Closed · Not interested" },
      { name: "messageUsed",     type: "textarea", required: false, description: "Outreach message or template used" },
      { name: "lastContact",     type: "date",     required: false, description: "Date of last contact" },
      { name: "nextFollowUp",    type: "date",     required: false, description: "Next scheduled follow-up date" },
      { name: "responseStatus",  type: "select",   required: false, description: "Response received", values: "No response · Positive · Neutral · Negative · Bounced" },
      { name: "warmth",          type: "select",   required: false, description: "Relationship warmth", values: "Cold · Warm · Hot" },
      { name: "source",          type: "select",   required: false, description: "How this target was found", values: "Instagram · Referral · LinkedIn · Walk-in · Event · Website · Directory · Other" },
      { name: "priority",        type: "number",   required: false, description: "Priority score (1–5)" },
      { name: "revenuePotential",type: "currency",  required: false, description: "Estimated revenue potential ($)" },
      { name: "partnerId",       type: "string",   required: false, description: "Linked Studio Partner record ID" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "testimonials", label: "Testimonials", lane: "Core",
    description: "Client testimonials — written, video, and usage permissions.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "client",          type: "string",   required: true,  description: "Client name" },
      { name: "session",         type: "string",   required: false, description: "Session or journey attended" },
      { name: "written",         type: "textarea", required: false, description: "Full written testimonial text" },
      { name: "videoUrl",        type: "string",   required: false, description: "Video testimonial URL" },
      { name: "permissionRec",   type: "boolean",  required: false, description: "Was permission received to use this testimonial?" },
      { name: "useWebsite",      type: "boolean",  required: false, description: "Permitted for website use?" },
      { name: "useSocial",       type: "boolean",  required: false, description: "Permitted for social media use?" },
      { name: "firstNameOnly",   type: "boolean",  required: false, description: "First name only permission?" },
      { name: "theme",           type: "select",   required: false, description: "Testimonial theme", values: "Stress relief · Release · Clarity · Emotional breakthrough · Sleep · Performance · Transformation · Nervous system" },
      { name: "bestQuote",       type: "string",   required: false, description: "Single best pull-quote for marketing" },
      { name: "beforeSummary",   type: "textarea", required: false, description: "Client state before the session" },
      { name: "afterSummary",    type: "textarea", required: false, description: "Client state after the session" },
      { name: "status",          type: "select",   required: false, description: "Testimonial status", values: "Requested · Received · Approved · Published · Archived" },
      { name: "date",            type: "date",     required: false, description: "Date testimonial was received" },
    ],
  },
  {
    table: "templates", label: "Templates", lane: "Core",
    description: "Email and SMS communication templates.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Template display name" },
      { name: "category",        type: "select",   required: false, description: "Template category", values: "B2B Outreach · Session · Follow-Up · Offer" },
      { name: "channel",         type: "select",   required: false, description: "Delivery channel", values: "Email · SMS" },
      { name: "subject",         type: "string",   required: false, description: "Email subject line (Email templates only)" },
      { name: "body",            type: "textarea", required: false, description: "Template body — supports {{variable}} placeholders" },
      { name: "linkedTo",        type: "select",   required: false, description: "Associated record type", values: "Client · Studio Partner · Session · Offer · General" },
      { name: "notes",           type: "textarea", required: false, description: "Usage notes or variable descriptions" },
    ],
  },
];

/* ── EMAIL LOGS ── */
const EMAIL_STATUS_COLOR = {
  sent:      "#2563EB",
  failed:    "#C0392B",
  delivered: "#4A8C6F",
  bounced:   "#C0392B",
  complained:"#D9892B",
  opened:    "#4A8C6F",
  clicked:   "#4A8C6F",
  queued:    "#D9892B",
  delivery_delayed: "#D9892B",
  unknown:   C.ink3,
};



/* ── RESET TO PRODUCTION ── */
// Operational CRM data — wiped on reset. Includes integration-linked records (Calendly bookings,
// Stripe payments, follow-ups) so test data cannot re-link or pollute production sync.
// Only operational/test CRM data is wiped. All configuration, content, and admin settings are preserved.
const RESET_WIPE_TABLES = [
  { key: "clients",        label: "Clients" },
  { key: "partners",       label: "Studio partners" },
  { key: "sessions",       label: "Sessions" },
  { key: "registrations",  label: "Calendly bookings" },
  { key: "payments",       label: "Stripe payments" },
  { key: "offers",         label: "Offers" },
  { key: "referrals",      label: "Referrals" },
  { key: "followups",      label: "Follow-ups" },
  { key: "sequences",      label: "Follow-up sequences" },
  { key: "expenses",       label: "Expenses" },
  { key: "revenue",        label: "Revenue" },
  // Excluded (preserved on reset):
  // outreach      — real studio relationship records, not test data
  // testimonials  — real client-written content
  // content       — evergreen content calendar posts
  // emailLog      — permanent audit trail
];
const RESET_KEEP_ITEMS = [
  "Message templates",
  "Follow-up template overrides",
  "Content Calendar posts",
  "Testimonials",
  "Outreach Hub records",
  "CRM settings & dropdown lists",
  "Journey descriptions",
  "User accounts & PINs",
  "Email log (permanent audit trail)",
];





/* ============================================================
   CRM SETTINGS VIEW
   ============================================================ */
const SETTINGS_META = [
  { key: "sources",        label: "Lead Sources",        hint: "Where clients and studio leads come from. Shown in client & offer forms." },
  { key: "clientTypes",    label: "Client Types",         hint: "Client segment labels used in the client form and analytics." },
  { key: "clientStatuses", label: "Client Statuses",      hint: "Status options for a client record (e.g. Lead, Booked, Member)." },
  { key: "packageTypes",   label: "Package Types",        hint: "Package options available to clients (e.g. Drop-in, 3-pack, Membership)." },
  { key: "offerTypes",     label: "Offer Types",          hint: "Types of offers/products you can create in the Offers & Sales section." },
  { key: "referralLevels", label: "Referral Potential",   hint: "Referral strength levels used on client records (e.g. Low, Medium, High)." },
];



/* ============================================================
   JOURNEY DESCRIPTIONS VIEW
   ============================================================ */


const AVATAR_COLORS = ["#2E6FB0","#6B5CE7","#D9892B","#4A8C6F","#2A9D8F","#C0392B","#8E44AD","#16A085","#E67E22","#2980B9"];

function EditProfileModal({ user, masterKeyRaw, onSave, onClose }) {
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

function ConfirmModal({ message, okLabel = "OK", danger = false, onOk, onCancel }) {
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

/** Host-initiated Calendly cancel — reason required; emails every invitee. */
function CancelCalendlyModal({ isStudio, activeCount, busy: parentBusy, onConfirm, onCancel }) {
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

function ImportModal({ data, setData, onClose }) {
  const [staged, setStaged] = useState({});  // db -> parsed rows
  const [busy, setBusy] = useState(false);

  const handleFile = (db, file) => {
    if (file.size > 10 * 1024 * 1024) { alert("CSV file must be under 10 MB."); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      error: (err) => { alert(`Could not read CSV file: ${err.message || err}`); },
      complete: (res) => {
        if (res.errors.length) {
          const msgs = res.errors.slice(0, 3).map(e => e.message).join("; ");
          alert(`CSV parse warning — some rows may be skipped: ${msgs}`);
        }
        const spec = IMPORT_MAP[db];
        const rows = res.data.map((raw) => {
          const rec = { id: uid(db) };
          const lower = {};
          Object.keys(raw).forEach((k) => { lower[norm(k)] = raw[k]; });
          Object.entries(spec.map).forEach(([csvKey, field]) => {
            let val = lower[csvKey] ?? "";
            val = Sec.sanitize(val);                          // ← sanitize before coercing
            if (spec.nums && spec.nums.includes(field)) val = num(val);
            if (spec.bools && spec.bools.includes(field)) val = bool(val);
            rec[field] = val;
          });
          return rec;
        }).filter((r) => Object.values(r).some((v) => v !== "" && v !== 0 && v != null && String(v) !== r.id));
        setStaged((s) => ({ ...s, [db]: rows }));
      },
    });
  };

  const apply = () => {
    setBusy(true);
    setData((cur) => {
      const next = { ...cur };
      // import partners & clients first so relations can resolve
      DB_ORDER.forEach((db) => { if (staged[db]) next[db] = staged[db].map((r) => ({ ...r })); });
      // wire relations
      DB_ORDER.forEach((db) => {
        const spec = IMPORT_MAP[db];
        if (!spec) return;
        if (spec.rel && next[db]) {
          const targetRows = next[spec.rel.to];
          next[db] = next[db].map((r) => {
            const wanted = norm(r[spec.rel.field]);
            const match = targetRows.find((t) => norm(t.name) === wanted);
            const { [spec.rel.field]: _omit, ...rest } = r;
            return { ...rest, [spec.rel.set]: match ? match.id : "" };
          });
        } else if (next[db]) {
          next[db] = next[db].map((r) => { const { _studio, _client, ...rest } = r; return rest; });
        }
      });
      return next;
    });
    setTimeout(onClose, 200);
  };

  const stagedCount = Object.values(staged).reduce((a, r) => a + r.length, 0);

  return (
    <div className="sb-drawerwrap" onMouseDown={onClose}>
      <div className="sb-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sb-drawerhead">
          <span className="sb-eyebrow">Import CSVs</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: C.ink2, marginTop: 0, lineHeight: 1.5 }}>
            Drop in any of the six files to replace that table. Studio and client names are matched automatically to
            re-link Sessions, Offers, and Follow-Ups. Headers are matched by name, so the exact column order doesn't matter.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {DB_ORDER.filter((db) => IMPORT_MAP[db]).map((db) => (
              <div key={db} className="sb-importrow">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{sectionLabel(db)}</div>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>{IMPORT_MAP[db].file}</div>
                </div>
                {staged[db] ? <span className="sb-importok"><Check size={13} /> {staged[db].length} rows ready</span> : <span style={{ fontSize: 12, color: C.ink3 }}>current: {(data[db] || []).length}</span>}
                <label className="sb-ghost" style={{ cursor: "pointer" }}>
                  <Upload size={14} /> Choose
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleFile(db, e.target.files[0])} />
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="sb-drawerfoot">
          <div style={{ flex: 1, fontSize: 12.5, color: C.ink3 }}>{stagedCount ? `${stagedCount} rows staged` : "No files chosen"}</div>
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          <button className="sb-primary" onClick={apply} disabled={!stagedCount || busy} style={{ opacity: !stagedCount ? 0.5 : 1 }}>
            Import & re-link
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */










/* ---------- tiny utils ---------- */
const DESC_PANEL_BODY_STYLE = {
  padding: "12px 14px", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word",
  overflowX: "hidden", overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
  touchAction: "pan-y", height: "min(240px, 38vh)", boxSizing: "border-box",
};

/* ============================================================
   REFERRAL TREE VIEW
   ============================================================ */

/* ============================================================
   OUTREACH HUB
   ============================================================ */

/* ── FOLLOW-UP SEND EMAIL BUTTON (inline table action) ── */




/* ============================================================
   REFERRAL TREE
   ============================================================ */

/* ── WORKFLOWS COMMAND CENTER ── */




/* ── USER MANAGEMENT VIEW ── */




/* ── STARTER TEMPLATES ── */
const STARTER_TEMPLATES = [
  {
    name: "Session Booking Confirmation",
    category: "Session",
    channel: "Email",
    linkedTo: "Client",
    subject: "You're booked! Your breathwork session on {{sessionDate}}",
    body: `Hi {{firstName}},

You're all set! Here are your booking details:

📅 Date & Time: {{sessionDate}}
📍 Location / Link: {{sessionLink}}

A few things to help you prepare:
- Wear comfortable, loose-fitting clothing
- Avoid heavy meals for 2 hours before the session
- Have a blanket and pillow nearby if you're joining virtually
- Come with an open mind and willingness to breathe deeply

If you have any questions or need to reschedule, just reply to this email.

Looking forward to breathing with you soon.

Warm regards,
{{yourName}}`,
    notes: "Sent immediately after a new booking is confirmed.",
  },
  {
    name: "Pre-Session Reminder (24-Hour)",
    category: "Session",
    channel: "Email",
    linkedTo: "Client",
    subject: "Your breathwork session is tomorrow — a few reminders",
    body: `Hi {{firstName}},

Just a friendly reminder that your breathwork session is tomorrow at {{sessionTime}}.

Here's what to expect:
- The session typically runs {{sessionDuration}} minutes
- You may experience tingling, emotional releases, or deep relaxation — all normal
- Have water nearby and plan to rest quietly for 10–15 minutes after

📍 Location / Link: {{sessionLink}}

If anything comes up and you need to reschedule, please let me know as soon as possible so I can open the spot for someone else.

See you tomorrow!

{{yourName}}`,
    notes: "Send the day before the session.",
  },
  {
    name: "Post-Session Check-In (Same Day)",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "How are you feeling after today's session?",
    body: `Hi {{firstName}},

Thank you so much for showing up and doing the work today — it was a honour to hold space for you.

Breathwork can continue working in your body and mind for the next 24–72 hours. Here are a few suggestions:
- Drink plenty of water
- Rest if you feel tired
- Journal anything that came up for you
- Be gentle with yourself

I'd love to hear how you're feeling — just hit reply and let me know. Your feedback helps me tailor future sessions to serve you better.

Looking forward to hearing from you.

With gratitude,
{{yourName}}`,
    notes: "Send within a few hours of the session ending.",
  },
  {
    name: "72-Hour Rebooking Offer",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "Ready for your next session, {{firstName}}?",
    body: `Hi {{firstName}},

I hope the past few days have been good to you since our session together.

Many clients find the most powerful shifts happen when they practice consistently. I'd love to support you in building that momentum.

Here are a few ways we can continue:

🌿 Single Session — Book at your own pace
📦 Package — Save when you commit to a journey (ask me about current options)
🏢 Studio Group — Join an upcoming group session for a shared experience

If you're ready to book your next session, you can do so here: {{bookingLink}}

If you have any questions or want to chat about what's right for you, just reply to this email.

Looking forward to our next session together.

{{yourName}}`,
    notes: "Send 72 hours after session. Personalize the package section if relevant.",
  },
  {
    name: "Package / Offer Proposal",
    category: "Offer",
    channel: "Email",
    linkedTo: "Client",
    subject: "A personalised offer for you, {{firstName}}",
    body: `Hi {{firstName}},

Based on our work together, I wanted to reach out with a personalised offer I think would be a great fit for where you are right now.

{{offerDetails}}

This offer is available until {{offerExpiry}}.

Here's what's included:
- {{packageItem1}}
- {{packageItem2}}
- {{packageItem3}}

Investment: {{offerPrice}}

If you have questions or want to talk it through, I'm happy to jump on a quick call. Just reply to this email or book a call here: {{bookingLink}}

I believe in this work and I believe in your capacity to transform. I'd love to support you further.

Warmly,
{{yourName}}`,
    notes: "Personalise the offerDetails and package items before sending.",
  },
  {
    name: "New Client Welcome",
    category: "Session",
    channel: "Email",
    linkedTo: "Client",
    subject: "Welcome to Simply Breathe — so glad you're here",
    body: `Hi {{firstName}},

Welcome! I'm so glad you found your way here.

Simply Breathe is a space for you to slow down, reconnect with your breath, and access the deep healing and clarity that lives inside you. Whether you're here to manage stress, process emotions, or simply explore — you're in the right place.

Here's what to expect as a new client:
- Your first session is about building trust and finding your rhythm
- There's no right or wrong way to breathe — just show up as you are
- I'll guide you through everything; you just need to follow the breath

Your first session is booked for {{sessionDate}} at {{sessionTime}}.
📍 Location / Link: {{sessionLink}}

If you have any questions before we meet, please don't hesitate to reach out. I read every reply personally.

Looking forward to breathing with you soon.

With warmth,
{{yourName}}`,
    notes: "Send to brand new clients after their first booking.",
  },
  {
    name: "Studio Partner — Initial Outreach",
    category: "B2B Outreach",
    channel: "Email",
    linkedTo: "Studio Partner",
    subject: "Partnering to bring transformative breathwork to {{studioName}}",
    body: `Hi {{contactName}},

My name is {{yourName}} and I run Simply Breathe — a breathwork practice focused on helping people manage stress, process emotions, and access deep physical and mental renewal.

I've been following {{studioName}} and I think your community would genuinely benefit from what we offer. Breathwork is a natural complement to yoga, mindfulness, and wellness practices, and it tends to attract exactly the kind of client your studio already serves.

I'd love to explore hosting a session at your studio on a revenue-share basis — low risk for you, high value for your members.

Here's a quick overview of what a partnership looks like:
- I bring everything needed to run the session
- We split revenue based on attendance
- Your community gets an experience they'll talk about

Would you be open to a short call this week to see if it's a fit? I'm flexible on timing.

Looking forward to connecting.

{{yourName}}`,
    notes: "First outreach to a potential studio partner.",
  },
  {
    name: "Studio Partner — Follow-Up After No Reply",
    category: "B2B Outreach",
    channel: "Email",
    linkedTo: "Studio Partner",
    subject: "Following up — breathwork at {{studioName}}",
    body: `Hi {{contactName}},

I wanted to follow up on my previous email about bringing breathwork sessions to {{studioName}}.

I know things get busy, so I'll keep this short — I genuinely believe your community would love this experience, and I'd love to make it easy for you to say yes.

If now isn't the right time, no problem at all — just let me know and I'll check back in a few months. If you're curious, I'm happy to answer any questions or send over more details.

Either way, thanks for the work you do at {{studioName}}.

{{yourName}}`,
    notes: "Send 5–7 days after no reply to the initial outreach.",
  },
  {
    name: "Testimonial Request",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "Would you share your experience, {{firstName}}?",
    body: `Hi {{firstName}},

I hope you're continuing to feel the effects of our work together.

I have a small favour to ask. If your experience with Simply Breathe has meant something to you, I'd be so grateful if you'd share a short testimonial. It helps other people who are searching for this kind of support find their way here.

You could share:
- What you were feeling before your session
- What shifted or what you noticed during / after
- What you'd say to someone thinking about trying breathwork

You can reply directly to this email, or if it's easier, write a quick Google review here: {{reviewLink}}

Even just two or three sentences would mean a lot. Thank you for trusting me with your journey.

With gratitude,
{{yourName}}`,
    notes: "Send 1–2 weeks after a completed session or package.",
  },
  {
    name: "Re-Engagement (Lapsed Client)",
    category: "Follow-Up",
    channel: "Email",
    linkedTo: "Client",
    subject: "Checking in — how have you been, {{firstName}}?",
    body: `Hi {{firstName}},

It's been a while since we last connected and I've been thinking about you.

Life gets full, and it's easy to let the practices that support us slip. I just wanted to reach out and say — there's no judgment here. The breath is always waiting for you when you're ready.

If you're feeling the pull to reconnect — whether it's stress, a transition you're navigating, or just a desire to feel more like yourself — I'd love to hold space for you again.

I have a few spots open over the next couple of weeks. If you'd like to book, you can do so here: {{bookingLink}}

Or if you just want to chat about where you're at, hit reply. I read every message personally.

Either way, I hope you're well.

Warmly,
{{yourName}}`,
    notes: "For clients who haven't booked in 60+ days. Personalise as needed.",
  },
];

/* ── STARTER CONTENT ── */


/* ── TEMPLATE LIBRARY ── */


/* ── TESTIMONIAL LIBRARY ── */






/* ============================================================
   PAYMENT RECONCILIATION VIEW
   ============================================================ */

// Module-level flag so the one-time payment repair survives component remounts.
// A useRef would reset to false each time the component mounts (navigating away
// and back), causing applyPaymentReconciliation to re-run on every visit.








/* ============================================================
   REVENUE ATTRIBUTION VIEW
   ============================================================ */

// dateMode: "session" (default) — filter by session date (r.date); "booked" — filter by booking date (r.bookedAt).


/* ============================================================
   OFFER CONVERSION ANALYTICS
   ============================================================ */



/* ============================================================
   FOLLOW-UP ENGINE COMPONENTS
   ============================================================ */







/* ── FU TEMPLATE EMAIL MODAL — recipient search + compose ── */





/* ============================================================
   CSS
   ============================================================ */
const CSS = `
* { box-sizing: border-box; }
input, textarea, select, button { font-family: inherit; }
.lucide { stroke-width: 1.5 !important; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.sb-shell { display: flex; min-height: 100vh; }
.sb-sidebar { width: 226px; flex-shrink: 0; background: ${C.surface}; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 40; }
.sb-navbtn { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; border: none; border-radius: 9px; font-size: 14px; cursor: pointer; transition: background .12s; }
.sb-navbtn:hover { background: ${C.brandMist}; }
.sb-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sb-header { display: flex; align-items: center; gap: 12px; padding: 16px 28px; border-bottom: 1px solid ${C.line}; background: ${hexA(C.bg, 0.85)}; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 20; }
.sb-content { padding: 22px 28px 28px; max-width: 1280px; width: 100%; }
.sb-menu { display: none; background: none; border: none; cursor: pointer; color: ${C.ink}; padding: 4px; }
.sb-scrim { display: none; }
.sb-search { display: flex; align-items: center; gap: 7px; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 9px; padding: 7px 11px; width: 220px; }
.sb-search input { border: none; outline: none; background: none; font-size: 13.5px; width: 100%; color: ${C.ink}; }
.sb-card { background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 14px; }
.sb-primary { display: inline-flex; align-items: center; gap: 6px; background: ${C.brand}; color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background .12s; }
.sb-primary:hover { background: ${C.brandDeep}; }
.sb-ghost { display: inline-flex; align-items: center; gap: 6px; background: ${C.surface}; color: ${C.ink2}; border: 1px solid ${C.line}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-ghost:hover { background: ${C.surfaceAlt}; }
.sb-danger { display: inline-flex; align-items: center; gap: 6px; background: none; color: #B4513B; border: 1px solid ${hexA("#B4513B", 0.3)}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-danger:hover { background: ${hexA("#B4513B", 0.07)}; }
.sb-link { display: inline-flex; align-items: center; gap: 2px; background: none; border: none; color: ${C.brand}; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-iconbtn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 8px; cursor: pointer; color: ${C.ink2}; }
.sb-iconbtn:hover { background: ${C.surfaceAlt}; }

.sb-hero { display: flex; align-items: center; gap: 20px; background: linear-gradient(120deg, ${C.brandMist}, ${C.surface}); border: 1px solid ${C.line}; border-radius: 16px; padding: 22px 26px; }
.sb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sb-stat { padding: 16px 18px; }
.sb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.sb-panelhead { display: flex; align-items: center; gap: 9px; padding: 15px 18px 10px; }
.sb-panelbody { padding: 0 8px 8px; }
.sb-badge { background: ${C.brandSoft}; color: ${C.brandDeep}; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 20px; }
.sb-listrow { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; text-align: left; }
.sb-listrow:hover { background: ${C.surfaceAlt}; }
.sb-nba-row:hover { background: ${C.surfaceAlt}; }
.sb-actionrow { align-items: flex-start; padding: 12px 14px; border-bottom: 1px solid ${C.lineSoft}; border-radius: 0; }
.sb-actionrow:last-child { border-bottom: none; }
.sb-actionrow:hover { background: ${C.brandMist}; }
.sb-rowtitle { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowsub { font-size: 12px; color: ${C.ink3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowval { font-size: 13px; font-weight: 600; color: ${C.brand}; white-space: nowrap; }
.sb-mininote { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: ${C.ink3}; padding: 8px 12px 2px; }

.sb-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.sb-tab { background: none; border: none; padding: 7px 13px; border-radius: 8px; font-size: 13.5px; font-weight: 600; color: ${C.ink3}; cursor: pointer; }
.sb-tab:hover { color: ${C.ink2}; background: ${C.surfaceAlt}; }
.sb-tab-on { color: ${C.brandDeep}; background: ${C.brandSoft}; }

.sb-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sb-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid ${C.line}; white-space: nowrap; }
.sb-table td { padding: 13px 16px; border-bottom: 1px solid ${C.lineSoft}; color: ${C.ink}; white-space: nowrap; }
.sb-trow { cursor: pointer; }
.sb-trow:hover td { background: ${C.surfaceAlt}; }
.sb-table tbody tr:last-child td { border-bottom: none; }
.sb-table tfoot td { padding: 12px 16px; border-top: 2px solid ${C.line}; background: ${C.surfaceAlt}; font-size: 13.5px; }

.sb-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; }
.sb-col { min-width: 224px; width: 224px; flex-shrink: 0; }
.sb-colhead { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 10px; }
.sb-bcard { display: block; width: 100%; text-align: left; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 11px; padding: 11px 12px; cursor: pointer; transition: box-shadow .12s, transform .12s; }
.sb-bcard:hover { box-shadow: 0 4px 16px ${hexA(C.brandDeep, 0.1)}; transform: translateY(-1px); }
.sb-emptycard { border: 1px dashed ${C.line}; border-radius: 11px; padding: 14px; text-align: center; color: ${C.ink3}; font-size: 13px; }

.sb-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.sb-caldow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; text-align: center; padding-bottom: 4px; font-weight: 600; }
.sb-calcell { border-radius: 9px; padding: 6px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.sb-calev { font-size: 10.5px; font-weight: 600; background: ${C.brandSoft}; color: ${C.brandDeep}; border: none; border-radius: 5px; padding: 3px 5px; cursor: pointer; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-calev:hover { background: ${C.brand}; color: #fff; }

.sb-drawerwrap { position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.38)}; display: flex; align-items: center; justify-content: center; z-index: 60; backdrop-filter: blur(4px); padding: 20px; }
.sb-drawer { width: 700px; max-width: 96vw; max-height: 90vh; background: ${C.surface}; border-radius: 20px; display: flex; flex-direction: column; box-shadow: 0 24px 80px ${hexA(C.brandDeep, 0.32)}, 0 4px 20px ${hexA(C.brandDeep, 0.12)}; animation: sb-pop .22s cubic-bezier(.22,.68,0,1.2); overflow: hidden; }
.sb-drawer-wide { width: 900px; }
.sb-modal { width: 540px; max-width: 94vw; max-height: 88vh; margin: auto; background: ${C.surface}; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px ${hexA(C.brandDeep, 0.3)}; animation: sb-pop .2s ease; }
.sb-drawerwrap:has(.sb-modal) { align-items: center; justify-content: center; }
@keyframes sb-slide { from { transform: translateX(30px); opacity: .6; } to { transform: none; opacity: 1; } }
@keyframes sb-pop { from { transform: scale(.96) translateY(6px); opacity: 0; } to { transform: none; opacity: 1; } }
.sb-drawerhead { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 16px; border-bottom: 1px solid ${C.line}; flex-shrink: 0; }
.sb-eyebrow { font-size: 11.5px; text-transform: uppercase; letter-spacing: .12em; color: ${C.ink3}; font-weight: 600; }
.sb-drawerbody { padding: 20px 22px; overflow-y: auto; flex: 1; }
.sb-drawerfoot { display: flex; align-items: center; gap: 9px; padding: 14px 22px; border-top: 1px solid ${C.line}; flex-shrink: 0; }
.sb-titleinput { font-family: ${FONT.display}; font-size: 22px; font-weight: 600; border: none; outline: none; width: 100%; color: ${C.ink}; padding: 0 0 14px; }
.sb-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.sb-field { display: flex; flex-direction: column; gap: 5px; }
.sb-field-wide { grid-column: 1 / -1; }
.sb-flabel { font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: ${C.ink3}; font-weight: 600; }
.sb-input { border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 11px; font-size: 13.5px; outline: none; color: ${C.ink}; background: ${C.surface}; width: 100%; }
.sb-input:focus { border-color: ${C.brand}; box-shadow: 0 0 0 3px ${hexA(C.brand, 0.12)}; }
.sb-affix { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: ${C.ink3}; }
.sb-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
.sb-selchip { border: 1px solid ${C.line}; border-radius: 20px; padding: 5px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .1s; }
.sb-rellabel { display: flex; align-items: center; gap: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 700; padding-bottom: 7px; border-bottom: 1px solid ${C.lineSoft}; margin-bottom: 6px; }
.sb-relrow { display: flex; align-items: center; gap: 9px; width: 100%; background: none; border: none; padding: 8px 6px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.sb-relrow:hover { background: ${C.surfaceAlt}; }
.sb-importrow { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid ${C.line}; border-radius: 11px; }
.sb-importok { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.brand}; }

.sb-breathe { animation: sb-breath 8s ease-in-out infinite; }
.sb-breathe2 { animation-delay: .4s; }
@keyframes sb-breath { 0%,100% { transform: scale(.82); opacity: .25; } 45% { transform: scale(1.12); opacity: .55; } }
@media (prefers-reduced-motion: reduce) { .sb-breathe { animation: none; } }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 6px; border: 2px solid ${C.bg}; }
:focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }

@media (max-width: 860px) {
  .sb-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform .22s; box-shadow: 4px 0 30px ${hexA(C.brandDeep, 0.2)}; }
  .sb-sidebar.sb-open { transform: none; }
  .sb-scrim { display: block; position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.3)}; z-index: 35; }
  .sb-menu { display: inline-flex; }
  .sb-stats { grid-template-columns: 1fr 1fr; }
  .sb-nba-grid { grid-template-columns: 1fr !important; }
  .sb-pipeline-grid { grid-template-columns: 1fr 1fr !important; }
  .sb-lane-split { flex-direction: column !important; }
  .sb-grid2 { grid-template-columns: 1fr; }
  .sb-content, .sb-header { padding-left: 16px; padding-right: 16px; }
  .sb-search { width: 130px; }
  .sb-fields { grid-template-columns: 1fr; }
  .sb-hero { flex-direction: column; text-align: center; }
}
`;


