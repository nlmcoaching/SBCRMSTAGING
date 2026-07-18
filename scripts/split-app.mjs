/**
 * One-shot extractor: split src/App.jsx into feature/component modules.
 * Run from repo root: node scripts/split-app.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(ROOT, "src", "App.jsx");
const lines = fs.readFileSync(APP, "utf8").split(/\n/);

// 1-based inclusive ranges → 0-based slice
function slice(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content.replace(/\n+$/, "") + "\n", "utf8");
  console.log("wrote", rel, `(${content.split(/\n/).length} lines)`);
}

function exportify(body, names) {
  let out = body;
  for (const name of names) {
    // function Foo → export function Foo
    out = out.replace(new RegExp(`^function ${name}\\b`, "m"), `export function ${name}`);
    // const Foo = → export const Foo =
    out = out.replace(new RegExp(`^const ${name}\\b`, "m"), `export const ${name}`);
    // class Foo → export class Foo
    out = out.replace(new RegExp(`^class ${name}\\b`, "m"), `export class ${name}`);
  }
  return out;
}

// ─── shared import headers ───────────────────────────────────────────
const REACT = `import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";\n`;
const LUCIDE_TODAY = `import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, ChevronDown, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
  Zap, Copy, Clock, TrendingUp, BarChart2, AlertCircle, Activity, Send, Info, BellRing, Milestone,
  LogOut, UserCircle, Shield, KeyRound, Receipt, ClipboardList, FileSignature, CalendarCheck, CheckCircle, Save, Scale, Lock,
} from "lucide-react";\n`;
const LUCIDE_DRAWER = LUCIDE_TODAY;
const RECHARTS = `import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, ComposedChart, Bar, Line, Legend } from "recharts";\n`;
const PAPA = `import Papa from "papaparse";\n`;

const LIB_THEME = `import { C, FONT, hexA } from "../lib/theme.js";\n`;
const LIB_THEME_FROM_FEAT = `import { C, FONT, hexA } from "../../lib/theme.js";\n`;
const LIB_FORMAT = `import { uid, todayISO, addDaysISO, addMonthsISO, MONTHS, fmtDate, money, pct, onOrBefore, sameMonth, num, bool, norm, cleanName, preferLongerText, clientShort, sectionLabel, fmtStudioType, isValidISODate } from "../lib/format.js";\n`;
const LIB_FORMAT_FEAT = `import { uid, todayISO, addDaysISO, addMonthsISO, MONTHS, fmtDate, money, pct, onOrBefore, sameMonth, num, bool, norm, cleanName, preferLongerText, clientShort, sectionLabel, fmtStudioType, isValidISODate } from "../../lib/format.js";\n`;

// ─── 1. styles/appCss.js ─────────────────────────────────────────────
{
  const cssBody = slice(9213, 9335).replace(/^const CSS = /, "export function buildAppCss() {\n  return ");
  // close: was `;\n` after template — become `;\n}\n`
  const body = cssBody.replace(/`;\s*$/, "`;\n}\n");
  write("src/styles/appCss.js", `import { C, hexA } from "../lib/theme.js";\n\n${body}`);
}

// ─── 2. lib/csvImport.js ─────────────────────────────────────────────
{
  const body = exportify(slice(8491, 8538), ["IMPORT_MAP", "parseImportRows"]);
  write(
    "src/lib/csvImport.js",
    `import { uid, norm, num, bool, isValidISODate } from "./format.js";\n` +
      `import { Sec } from "./sec.js";\n\n` +
      body,
  );
}

// ─── 3. lib/schema/fields.js ─────────────────────────────────────────
{
  // FIELDS (5610-5834) then f (5835) then newRecord (2299-2317)
  // f must be before FIELDS for const TDZ if we reorder; function f is hoisted so keep order FIELDS then f
  const fields = exportify(slice(5610, 5835), ["FIELDS", "f"]);
  const newRec = exportify(slice(2299, 2317), ["newRecord"]);
  write(
    "src/lib/schema/fields.js",
    `import { uid, todayISO } from "../format.js";\n` +
      `import { getS } from "../crmSettings.js";\n` +
      `import { emptyChecklist, INTENT_TAGS, TAG_COLOR, OUTREACH_SOURCE, STUDIO_TYPE, CLOSE_PROB, STAGE, CONTRACT_STATUS, SESSION_STATUS, SETUP_STATUS, OFFER_STATUS, OFFER_PROB, SOURCE, SOURCE_COLOR, REFERRAL, REFERRAL_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, OUTREACH_TARGET_TYPE, OUTREACH_RESPONSE, OUTREACH_PRIORITY, OUTREACH_PRIORITY_COLOR, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TESTIMONIAL_TYPE, TESTIMONIAL_THEMES, TMPL_CATEGORY, TMPL_CHANNEL, TMPL_LINKED_TO, EXPENSE_CATEGORY, EXPENSE_PAYMENT_METHOD, EXPENSE_RECUR_FREQ, REV_CHANNEL, CONTENT_TYPE, PLATFORM, CONTENT_STATUS, CONTENT_CATEGORY, CONTENT_CTA, FUTYPE, PACKAGE, CLIENT_TYPE, STATUS } from "../constants.js";\n` +
      `import { emptySessionChecklist, emptyEquipChecklist } from "../checklists.js";\n\n` +
      `${fields}\n\n${newRec}\n`,
  );
  write("src/lib/schema/index.js", `export { FIELDS, f, newRecord } from "./fields.js";\n`);
}

// ─── 4. components/modals.jsx ────────────────────────────────────────
{
  const drawerErr = exportify(slice(102, 119), ["DrawerErrorBoundary"]);
  const editProf = exportify(slice(8626, 8948), ["AVATAR_COLORS", "EditProfileModal"]);
  const confirm = exportify(slice(8950, 8994), ["ConfirmModal"]);
  const cancelCal = exportify(slice(8996, 9102), ["CancelCalendlyModal"]);
  write(
    "src/components/modals.jsx",
    REACT +
      `import { X, AlertCircle, KeyRound, Shield, UserCircle, CheckCircle, Save, Lock } from "lucide-react";\n` +
      `import { C, FONT, hexA } from "../lib/theme.js";\n` +
      `import { Sec } from "../lib/sec.js";\n` +
      `import { loadSecMeta, saveSecMeta } from "../lib/secMeta.js";\n\n` +
      `${drawerErr}\n\n${editProf}\n\n${confirm}\n\n${cancelCal}\n`,
  );
}

// ─── 5. components/tables.jsx ────────────────────────────────────────
{
  const table = exportify(slice(5004, 5210), ["TableView", "formatRecordFieldValue", "RecordTableView"]);
  write(
    "src/components/tables.jsx",
    REACT +
      `import { ChevronDown, Plus } from "lucide-react";\n` +
      LIB_THEME +
      `import { money, cleanName, norm, fmtDate } from "../lib/format.js";\n` +
      `import { Empty } from "./primitives.jsx";\n\n` +
      table +
      "\n",
  );
}

// ─── 6. features/today/today.jsx ─────────────────────────────────────
{
  const body = exportify(slice(2319, 3873), [
    "CAT_META",
    "LANE",
    "URGENCY_DOT",
    "sessionIsVirtual",
    "sessionActionLocation",
    "sessionVirtualPreSessionComplete",
    "sessionStudioPreSessionComplete",
    "sessionPreSessionComplete",
    "normalizeChecklistMap",
    "resolveActionOpen",
    "resolveActionContact",
    "buildActions",
    "LaneSplitPanel",
    "buildAlerts",
    "findOrphanedGroups",
    "OrphanedRecordsModal",
    "AlertsPanel",
    "PipelineSnapshot",
    "ActionEmailModal",
    "Today",
    "RevenueTrend",
    "SourceBreakdown",
  ]);
  write(
    "src/features/today/today.jsx",
    REACT +
      RECHARTS +
      LUCIDE_TODAY +
      LIB_THEME_FROM_FEAT +
      LIB_FORMAT_FEAT +
      `import * as constants from "../../lib/constants.js";\n` +
      `import { emptySessionChecklist, emptyEquipChecklist, SESSION_CHECKLIST, EQUIP_CHECKLIST, VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS } from "../../lib/checklists.js";\n` +
      `import { sendCrmEmail, makeEmailFailEntry, cappedLog, EMAIL_LOG_CAP, slimHistEntry } from "../../lib/email.js";\n` +
      `import { extractTemplateVars, autoFillTemplateVars, applyTemplateVars, findUnreplacedTemplateTokens, unreplacedTokensMessage, resolveRelationshipActionRecipient, suggestEmailTemplatesForAction } from "../../lib/templates.js";\n` +
      `import { BreathMark, Stat, Panel, Row, Dot, Tag, MiniChip, DateChip, Empty } from "../../components/primitives.jsx";\n` +
      `import { registrationBookingTimestamp, registrationCreatedTimestamp } from "../../lib/stripeMatching.js";\n` +
      `import { buildRegistrationRevenueRows, registrationRevenueForMonth, computeClientLifetimeValue } from "../../lib/revenue/index.js";\n` +
      `const { OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, STAGE, STAGE_COLOR, SESSION_STATUS, SESSION_STATUS_COLOR, CLIENT_TYPE, STATUS, STATUS_COLOR, FUTYPE, FUTYPE_COLOR, REF_STATUS, OUTREACH_STATUS, TESTIMONIAL_ACTION_STATUSES, OUTREACH_CLOSED_STATUSES, OUTREACH_NO_RESPONSE } = constants;\n\n` +
      body +
      "\n",
  );
  write("src/features/today/index.js", `export { Today, OrphanedRecordsModal, findOrphanedGroups, buildAlerts, AlertsPanel, LANE } from "./today.jsx";\n`);
}

// ─── 7. features/drawer/drawer.jsx ───────────────────────────────────
{
  // RecordDrawer block 5837-6588, skip SessionPerfView 6592-6704, then 6705-8489, plus DESC_PANEL
  const part1 = slice(5837, 6588);
  const part2 = slice(6705, 8489);
  const desc = exportify(slice(9119, 9123), ["DESC_PANEL_BODY_STYLE"]);
  let body = part1 + "\n\n" + part2 + "\n\n" + desc;
  body = exportify(body, [
    "resolveDrawerTab",
    "RecordDrawer",
    "sortCriticalFirst",
    "SessionChecklistPanel",
    "ClientSessionsTab",
    "agreementExt",
    "stripAgreementForStore",
    "dataForEncryptedStore",
    "agreementMimeForExt",
    "dataUrlToBytes",
    "isPdfBytes",
    "isDocxBytes",
    "isDocBytes",
    "bytesMatchExt",
    "agreementRecordIsPdf",
    "openAgreementFile",
    "PartnerAgreementsTab",
    "PartnerSessionsTab",
    "SessionBookingsTab",
    "SessionPerformance",
    "PartnerLaunchChecklist",
    "tlEvent",
    "buildClientTimeline",
    "buildPartnerTimeline",
    "ContactTimeline",
    "TagSelectorInput",
    "FieldInput",
    "DESC_PANEL_BODY_STYLE",
  ]);
  write(
    "src/features/drawer/drawer.jsx",
    REACT +
      LUCIDE_DRAWER +
      LIB_THEME_FROM_FEAT +
      LIB_FORMAT_FEAT +
      `import { getS } from "../../lib/crmSettings.js";\n` +
      `import * as constants from "../../lib/constants.js";\n` +
      `import { SESSION_CHECKLIST, EQUIP_CHECKLIST_PHASES, EQUIP_CHECKLIST, emptyEquipChecklist, VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS, virtualEquipPhaseItems, SESSION_CHECKLIST_PHASES, SESSION_PHASE_COLOR, emptySessionChecklist } from "../../lib/checklists.js";\n` +
      `import { AGREEMENT_BLOB_PREFIX, fetchCalendlyDescriptionForSession, isTruncatedPreview, resolveCalendlyDescription, cancelCalendlyEvent } from "../../lib/api.js";\n` +
      `import { store } from "../../lib/store.js";\n` +
      `import { Sec } from "../../lib/sec.js";\n` +
      `import { _c, studioSessionFinance, buildRegistrationRevenueRows, issueStripeRefund, calendlyBookingAmount, formatBookingAmount, resolveActualBookingAmount, formatActualBookingAmount } from "../../lib/revenue/index.js";\n` +
      `import { FIELDS } from "../../lib/schema/fields.js";\n` +
      `import { BreathMark, Stat, Panel, Row, Dot, Tag, MiniChip, DateChip, Empty } from "../../components/primitives.jsx";\n` +
      `import { CancelCalendlyModal } from "../../components/modals.jsx";\n` +
      `import { PARTNER_CHECKLIST_PHASES, PARTNER_CHECKLIST } from "../../lib/constants.js";\n` +
      `const { STATUS, STATUS_COLOR, CLIENT_TYPE, INTENT_TAGS, TAG_COLOR, STAGE, STAGE_COLOR, STUDIO_TYPE, CLOSE_PROB, CONTRACT_STATUS, SESSION_STATUS, SESSION_STATUS_COLOR, SETUP_STATUS, OFFER_STATUS, OFFER_STATUS_COLOR, SOURCE, REFERRAL, REFERRAL_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, OUTREACH_TARGET_TYPE, OUTREACH_RESPONSE, OUTREACH_PRIORITY, OUTREACH_PRIORITY_COLOR, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TESTIMONIAL_TYPE, TESTIMONIAL_THEMES, TMPL_CATEGORY, TMPL_CATEGORY_COLOR, TMPL_CHANNEL, TMPL_CHANNEL_COLOR, TMPL_LINKED_TO, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, EXPENSE_PAYMENT_METHOD, EXPENSE_RECUR_FREQ, REV_CHANNEL, REV_CHANNEL_COLOR, COST_CENTER, CONTENT_TYPE, PLATFORM, PLATFORM_COLOR, CONTENT_STATUS, CONTENT_STATUS_COLOR, CONTENT_CATEGORY, CONTENT_CAT_COLOR, CONTENT_CTA, FUTYPE, PACKAGE, JOURNEY_TYPES } = constants;\n\n` +
      body +
      "\n",
  );
  write("src/features/drawer/index.js", `export { RecordDrawer, dataForEncryptedStore, stripAgreementForStore } from "./drawer.jsx";\n`);
}

// ─── 8. features/section/section.jsx ─────────────────────────────────
{
  const sectionFn = exportify(slice(3875, 4060), ["Section"]);
  const viewsBlock = exportify(slice(4062, 5002), [
    "col",
    "TagList",
    "registrationSessionTimestamp",
    "formatRegistrationDateTime",
    "registrationBookedDisplay",
    "sortRegistrationsBySessionTime",
    "sortRegistrationsByCreatedAt",
    "cancelRegistrationManually",
    "refundEligibility",
    "registrationExpandRow",
    "VIEWS",
    "partnerHasAgreementPdf",
    "partnerHasUploadedAgreement",
    "partnerIsActive",
    "partnerCols",
    "activePartnerCols",
    "offerCols",
    "referralActionPending",
    "refCols",
    "refActionCols",
    "revCols",
    "revenueTableCols",
    "expenseTableCols",
    "contentCols",
    "sum",
  ]);
  const layoutViews = exportify(slice(5211, 5606), [
    "PartnerPipelineView",
    "BoardView",
    "cardChip",
    "sessionStartSortKey",
    "CalendarView",
  ]);
  const sessionPerf = exportify(slice(6592, 6704), ["SessionPerfView"]);
  write(
    "src/features/section/section.jsx",
    REACT +
      PAPA +
      LUCIDE_TODAY +
      LIB_THEME_FROM_FEAT +
      LIB_FORMAT_FEAT +
      `import * as constants from "../../lib/constants.js";\n` +
      `import { _c, calcNet, buildRevenueViewRows, openRevenueViewRow, calendlyBookingAmount, issueStripeRefund, studioSessionFinance, sessionFinanceFor, buildRegistrationRevenueRows } from "../../lib/revenue/index.js";\n` +
      `import { parseImportRows } from "../../lib/csvImport.js";\n` +
      `import { canAccessAdminTab } from "../../lib/constants.js";\n` +
      `import { TableView, RecordTableView } from "../../components/tables.jsx";\n` +
      `import { Empty, Tag, MiniChip, DateChip } from "../../components/primitives.jsx";\n` +
      `import { ReferralTreeView } from "../referrals";\n` +
      `import { TestimonialLibraryView } from "../testimonials";\n` +
      `import { ContentAnalyticsView } from "../content";\n` +
      `import { WorkflowsView } from "../workflows";\n` +
      `import { TemplateLibraryView, STARTER_CONTENT } from "../templates";\n` +
      `import { OutreachHubView } from "../outreach";\n` +
      `import { RevenueAttributionView, RevenueThisMonthView, OfferConversionView, ExpenseSummaryView, RefundsView } from "../revenue";\n` +
      `import { PaymentReconciliationView } from "../stripe";\n` +
      `import { AdminView, UserManagementView } from "../admin";\n` +
      `const { STATUS, STATUS_COLOR, CLIENT_TYPE, CLIENT_TYPE_COLOR, INTENT_TAGS, TAG_COLOR, STAGE, STAGE_COLOR, STUDIO_TYPE, CLOSE_PROB, CLOSE_PROB_COLOR, CONTRACT_STATUS, REF_STATUS, REF_STATUS_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TMPL_CATEGORY, TMPL_CATEGORY_COLOR, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, REV_CHANNEL, REV_CHANNEL_COLOR, CONTENT_STATUS, CONTENT_STATUS_COLOR, CONTENT_CATEGORY, CONTENT_CAT_COLOR, PLATFORM, PLATFORM_COLOR, SESSION_STATUS, SESSION_STATUS_COLOR, OFFER_STATUS, OFFER_STATUS_COLOR, SOURCE, SOURCE_COLOR, OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, REFERRAL, REFERRAL_COLOR } = constants;\n\n` +
      `${sectionFn}\n\n${viewsBlock}\n\n${layoutViews}\n\n${sessionPerf}\n`,
  );
  write("src/features/section/index.js", `export { Section, VIEWS } from "./section.jsx";\n`);
}

// ─── 9. Rewrite App.jsx as composition shell ─────────────────────────
{
  const appFn = slice(121, 2296);
  // Remove setAppComponents/setAppFields lines and replace with imports usage
  let appBody = appFn
    .replace(
      /  setAppComponents\(\{ Today, TableView, RecordTableView, ConfirmModal \}\);\n  setAppFields\(FIELDS\);\n/,
      "  // Shared tables/modals/FIELDS are real modules — admin/revenue import them directly.\n",
    );

  const header = `import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
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
} from "./lib/stripeMatching.js";

import { C, FONT, hexA } from "./lib/theme.js";
import { uid, todayISO, addDaysISO, addMonthsISO, MONTHS, fmtDate, money, pct, onOrBefore, sameMonth, num, bool, norm, cleanName, preferLongerText, clientShort, sectionLabel, fmtStudioType, isValidISODate } from "./lib/format.js";
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
import {
  calcNet,
  deriveRegistrationPaymentStatus,
  applyRegistrationPaymentLookup,
  applyPaymentReconciliation,
  reconcileAmountMismatches,
  processStripeWebhookEvents,
  refreshCalendlySessionRevenue,
  AUTO_CXL_EXP_ID_PREFIX,
  AUTO_SPLIT_EXP_ID_PREFIX,
  isAutoExpenseRecord,
  syncBookingLedgers,
  buildRevenueViewRows,
  applyStudioSessionSplit,
  applyRegistrationLifetimeValues,
} from "./lib/revenue/index.js";
import { SEED } from "./lib/seed.js";
import { extractTemplateVars, autoFillTemplateVars, applyTemplateVars, findUnreplacedTemplateTokens, unreplacedTokensMessage, resolveRelationshipActionRecipient, suggestEmailTemplatesForAction, outreachScore } from "./lib/templates.js";
import { newRecord } from "./lib/schema/fields.js";
import { dataForEncryptedStore } from "./features/drawer";
import { BreathMark, Stat, Panel, Row, Dot, Tag, MiniChip, DateChip, Empty } from "./components/primitives.jsx";
import { DrawerErrorBoundary, ConfirmModal, EditProfileModal } from "./components/modals.jsx";
import { FirstRunSetup, LockScreen, PassphraseUpgrade } from "./features/auth";
import { Today, OrphanedRecordsModal, findOrphanedGroups } from "./features/today";
import { Section } from "./features/section";
import { RecordDrawer } from "./features/drawer";
import { FollowUpEngine } from "./features/followup";
import { buildAppCss } from "./styles/appCss.js";

const { STATUS, STATUS_COLOR, CLIENT_TYPE, CLIENT_TYPE_COLOR, INTENT_TAGS, TAG_COLOR, STAGE, STAGE_COLOR, STUDIO_TYPE, CLOSE_PROB, CLOSE_PROB_COLOR, CONTRACT_STATUS, PARTNER_CHECKLIST_PHASES, PARTNER_CHECKLIST, emptyChecklist, FUTYPE, FUTYPE_COLOR, SOURCE, SOURCE_COLOR, PACKAGE, REFERRAL, REFERRAL_COLOR, OFFER_TYPE, OFFER_STATUS, OFFER_STATUS_COLOR, OFFER_PROB, OPEN_STATUSES, WON_STATUSES, LOST_STATUSES, REF_STATUS, REF_STATUS_COLOR, OUTREACH_STATUS, OUTREACH_STATUS_COLOR, OUTREACH_WARMTH, OUTREACH_WARMTH_COLOR, OUTREACH_TARGET_TYPE, OUTREACH_RESPONSE, OUTREACH_SOURCE, OUTREACH_PRIORITY, OUTREACH_PRIORITY_COLOR, OUTREACH_CLOSED_STATUSES, OUTREACH_NO_RESPONSE, TESTIMONIAL_STATUS, TESTIMONIAL_STATUS_COLOR, TESTIMONIAL_TYPE, TESTIMONIAL_THEMES, TESTIMONIAL_ACTION_STATUSES, TMPL_CATEGORY, TMPL_CATEGORY_COLOR, TMPL_CHANNEL, TMPL_CHANNEL_COLOR, TMPL_LINKED_TO, EXPENSE_CATEGORY, EXPENSE_CATEGORY_COLOR, EXPENSE_PAYMENT_METHOD, EXPENSE_RECUR_FREQ, REV_CHANNEL, REV_CHANNEL_COLOR, COST_CENTER, CONTENT_TYPE, PLATFORM, PLATFORM_COLOR, CONTENT_STATUS, CONTENT_STATUS_COLOR, CONTENT_CATEGORY, CONTENT_CAT_COLOR, CONTENT_CTA, SESSION_STATUS, SESSION_STATUS_COLOR, JOURNEY_TYPES, SETUP_STATUS, FU_STEPS, FU_TEMPLATES, interpolateTemplate, addDays, makeSequenceSteps, USER_ROLES, USER_ROLE_COLOR, USER_COLORS, ROLE_PERMISSIONS, canAccessSection, canAccessAdminTab } = constants;

/* ============================================================
   Simply Breathe OS — CRM
   Root composition: state, sync, auth gate, and shell layout.
   Views live under src/features/*; schema under src/lib/schema.
   ============================================================ */

const DISMISSED_ALERTS_KEY = "sb:dismissed-alerts:v1";
const LAST_BACKUP_KEY      = "sb:last-backup:v1";
const BACKUP_REMINDER_DAYS = 7;

const CSS = buildAppCss();

`;

  // App body still references dataForEncryptedStore — now imported
  // Also may reference stripAgreementForStore — check
  write("src/App.jsx", header + appBody + "\n");
}

console.log("Done. Next: fix compile errors, update admin/revenue imports, remove appBridge registration.");
