// Calendly signature verification, payload extraction, API enrichment, and pull-recent.
const crypto = require("crypto");
const { readQueue, writeQueue, withQueueLock } = require("./queue");

// ── Calendly HMAC-SHA256 signature verification ──
// Header: Calendly-Webhook-Signature: t=<timestamp>,v1=<hex-signature>
function verifySignature(req) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    // Never accept unsigned Calendly webhooks unless explicitly opted in for local testing.
    // Production always rejects. Dev also rejects by default (ngrok exposure is common);
    // set ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true only for intentional local unsigned testing.
    const allowUnsigned = process.env.NODE_ENV !== "production" && process.env.ALLOW_UNSIGNED_CALENDLY_WEBHOOKS === "true";
    if (!allowUnsigned) {
      console.error("[FATAL] CALENDLY_WEBHOOK_SIGNING_KEY not set — rejecting webhook"
        + ((process.env.NODE_ENV === "production") ? " in production" : " (set ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true to override in dev)"));
      return false;
    }
    console.warn("[WARN] CALENDLY_WEBHOOK_SIGNING_KEY not set — ALLOW_UNSIGNED_CALENDLY_WEBHOOKS=true; skipping signature check (dev only)");
    return true;
  }
  const header = req.headers["calendly-webhook-signature"] || "";
  // Parse with explicit limit-split and duplicate-key rejection to prevent
  // crafted headers from manipulating the timestamp or signature fields.
  const parts = {};
  for (const segment of header.split(",")) {
    const eqIdx = segment.indexOf("=");
    if (eqIdx === -1) continue;
    const key = segment.slice(0, eqIdx).trim();
    const val = segment.slice(eqIdx + 1).trim();
    if (parts[key] !== undefined) {
      console.warn("[WARN] Duplicate key in Calendly-Webhook-Signature header — rejecting");
      return false;
    }
    parts[key] = val;
  }
  const { t, v1 } = parts;
  if (!t || !v1) return false;

  // Reject replayed webhooks older than 5 minutes
  const MAX_AGE_MS = 5 * 60 * 1000;
  if (Math.abs(Date.now() - parseInt(t, 10) * 1000) > MAX_AGE_MS) {
    console.warn("[WARN] Calendly webhook timestamp too old — possible replay attack");
    return false;
  }

  const toSign = `${t}.${req.rawBody}`;
  const hmac   = crypto.createHmac("sha256", signingKey);
  hmac.update(toSign);
  const digest = hmac.digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(v1, "hex"));
  } catch { return false; }
}

/**
 * Invitee display name from registration/billing form data only.
 * Prefer payload.invitee.* when nested; otherwise the invitee resource itself
 * (Calendly webhooks put invitee fields on payload). Never use scheduled_event
 * name/description or other calendar-sync metadata.
 */
function resolveInviteeFormName(inviteeResource, scheduled = {}) {
  if (!inviteeResource || typeof inviteeResource !== "object") return "";
  const form = (inviteeResource.invitee && typeof inviteeResource.invitee === "object")
    ? inviteeResource.invitee
    : inviteeResource;
  const fromParts = [form.first_name, form.last_name].filter(Boolean).join(" ").trim();
  const raw = String(form.name || fromParts || "").trim();
  if (!raw) return "";

  // Safeguard: reject values that are clearly calendar event titles / descriptions
  const eventTitle = String(scheduled?.name || "").trim();
  const eventDesc = String(scheduled?.description || "").trim();
  if (eventTitle && raw.toLowerCase() === eventTitle.toLowerCase()) {
    console.warn("[WARN] Rejecting invitee name that matches scheduled_event.name (calendar sync contamination)");
    return "";
  }
  if (eventDesc && raw.toLowerCase() === eventDesc.toLowerCase()) {
    console.warn("[WARN] Rejecting invitee name that matches scheduled_event.description");
    return "";
  }
  return raw;
}

// ── Helper: extract clean fields from Calendly payload ──
function extractEvent(event, payload) {
  // invitee_no_show.* payloads expose invitee as a URI string, not an object.
  const isNoShow = String(event || "").startsWith("invitee_no_show.");
  const isRoutingForm = String(event || "").startsWith("routing_form_submission");
  const noShowInviteeUri = (isNoShow && typeof payload.invitee === "string")
    ? payload.invitee
    : "";

  // Dedicated invitee object when present; Calendly invitee.* webhooks use payload as the invitee.
  // Routing form submissions use payload.uri as the submission URI (not an invitee).
  const invitee = (payload.invitee && typeof payload.invitee === "object")
    ? payload.invitee
    : (isNoShow || isRoutingForm ? {} : payload);
  const scheduled = payload.scheduled_event || invitee.scheduled_event || {};
  const location  = scheduled.location || {};

  // Custom question answers (registration form / routing form)
  const answers = {};
  (invitee.questions_and_answers || payload.questions_and_answers || []).forEach(({ question, answer }) => {
    const key = String(question || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    answers[key] = answer || "";
  });

  const payment = invitee.payment || payload.payment || null;
  const rawAmount = payment?.amount;
  const paymentAmount = rawAmount != null
    ? (typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount))
    : null;

  const submissionUri = isRoutingForm && typeof payload.uri === "string" ? payload.uri : "";
  const inviteeUri = noShowInviteeUri
    || (typeof invitee.uri === "string" ? invitee.uri : "")
    || (typeof payload.uri === "string" && !isNoShow && !isRoutingForm ? payload.uri : "")
    || submissionUri
    || "";

  // Routing forms may put email in Q&A or leave submitter as an invitee URI (no email).
  const routingEmail = isRoutingForm
    ? (answers.email || answers.email_address || payload.email || "").toLowerCase()
    : "";

  return {
    id:                   `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt:           new Date().toISOString(),
    processed:            false,
    eventType:            event,                              // invitee.created | invitee.canceled | ...
    // Invitee — name strictly from registration/billing invitee form (never event title)
    name:                 isRoutingForm
                            ? (answers.name || answers.full_name || "")
                            : resolveInviteeFormName(isNoShow ? invitee : payload, scheduled),
    email:                (invitee.email || (!isNoShow && !isRoutingForm ? payload.email : "") || routingEmail || "").toLowerCase(),
    phone:                answers.phone_number || answers.phone || invitee.text_reminder_number || (!isNoShow && !isRoutingForm ? payload.text_reminder_number : "") || "",
    timezone:             invitee.timezone || (!isNoShow && !isRoutingForm ? payload.timezone : "") || "",
    // Scheduled event (calendar metadata — kept separate from invitee name)
    calendlyInviteeUri:   inviteeUri,
    calendlySubmissionUri: submissionUri,
    calendlyEventUri:     scheduled.uri || "",
    calendlyEventTypeUri: scheduled.event_type || "",
    eventName:            scheduled.name || "",
    description:          scheduled.description || "",
    startTime:            scheduled.start_time || "",
    endTime:              scheduled.end_time  || "",
    createdAt:            invitee.created_at || payload.created_at || "",
    locationType:         location.type || "",               // zoom, physical, custom, etc.
    locationJoinUrl:      location.join_url || "",
    locationAddress:      location.location || "",
    // Status
    rescheduled:          invitee.rescheduled || payload.rescheduled || false,
    cancelerType:         invitee.cancellation?.canceler_type || payload.cancellation?.canceler_type || "",
    cancelReason:         invitee.cancellation?.reason || payload.cancellation?.reason || "",
    // Reschedule links (Calendly: new_invitee on the canceled side, old_invitee on the new booking)
    newInviteeUri:        invitee.new_invitee || payload.new_invitee || "",
    oldInviteeUri:        invitee.old_invitee || payload.old_invitee || "",
    // Custom question answers (full map + common fields)
    doneBreathworkBefore: answers.have_you_done_breathwork_before || answers.breathwork_before || "",
    howHeard:             answers.how_did_you_hear_about_us || answers.how_did_you_find_us || "",
    referredBy:           answers.who_referred_you || answers.referred_by || "",
    concerns:             answers.any_physical_or_emotional_concerns || answers.concerns || "",
    attendanceType:       answers.attending_virtually_or_in_person || answers.attendance_type || "",
    reviewedContraindications: answers.have_you_reviewed_contraindications || answers.contraindications || "",
    customAnswers:        answers,
    // UTM / tracking
    utmSource:            invitee.tracking?.utm_source || payload.tracking?.utm_source || "",
    utmMedium:            invitee.tracking?.utm_medium || payload.tracking?.utm_medium || "",
    utmCampaign:          invitee.tracking?.utm_campaign || payload.tracking?.utm_campaign || "",
    // Payment (Calendly Stripe / native checkout)
    paymentAmount:        paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paidAmount:           paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paymentCurrency:      payment?.currency || "",
    paymentSuccessful:    payment?.successful === true,
  };
}

// ── Calendly event-type metadata cache (in-memory, per-process) ──
const _eventTypeDescCache = {};
const _eventTypeMetaCache = {};

// Calendly does not expose the Payment-section dollar amount via API — this org stores it in internal_note
// (e.g. "Studio\\n$55", "virtual|$100") to mirror the configured session price.
function parsePriceFromInternalNote(note) {
  if (!note) return null;
  const text = String(note);
  if (/\bfree\b/i.test(text)) return 0;
  const dollarMatch = text.match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  if (dollarMatch) {
    const amount = parseFloat(dollarMatch[1]);
    return Number.isNaN(amount) ? null : amount;
  }
  const pipeMatch = text.match(/\|\s*\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (pipeMatch) {
    const amount = parseFloat(pipeMatch[1]);
    return Number.isNaN(amount) ? null : amount;
  }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (/^\$?\d+(?:\.\d{1,2})?$/.test(trimmed)) {
      const amount = parseFloat(trimmed.replace(/^\$/, ""));
      if (!Number.isNaN(amount)) return amount;
    }
  }
  return null;
}

function parseCalendlyPaymentAmount(rawAmount) {
  if (rawAmount == null) return null;
  const amount = typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount);
  return amount != null && !Number.isNaN(amount) ? amount : null;
}

const CALENDLY_API_BASE = "https://api.calendly.com/";

const CALENDLY_API_TIMEOUT_MS = 10_000; // 10 s — prevents hanging webhook handler
/** Overall budget for pull-recent fan-out (many serial invitee GETs). Frontend times out ~15s. */
const CALENDLY_PULL_DEADLINE_MS = 25_000;

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function pickEventTypeDescription(resource) {
  const plain = String(resource?.description_plain || "").trim();
  const fromHtml = stripHtml(resource?.description_html || "");
  if (!plain) return fromHtml;
  if (!fromHtml) return plain;
  const plainTruncated = plain.endsWith("...") || plain.endsWith("…");
  if (plainTruncated && fromHtml.length > plain.length) return fromHtml;
  return plain.length >= fromHtml.length ? plain : fromHtml;
}

async function fetchEventTypeMeta(eventTypeUri) {
  if (!eventTypeUri) return { description: "", price: null };

  if (!eventTypeUri.startsWith(CALENDLY_API_BASE)) {
    console.warn(`[WARN] Rejected suspicious event_type URI (not api.calendly.com): ${eventTypeUri}`);
    return { description: "", price: null };
  }

  const cached = _eventTypeMetaCache[eventTypeUri];
  if (cached) return cached;

  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return { description: "", price: null };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);

  try {
    const res = await fetch(eventTypeUri, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Calendly API ${res.status}`);
    const data = await res.json();
    const meta = {
      description: pickEventTypeDescription(data.resource),
      price: parsePriceFromInternalNote(data.resource?.internal_note),
    };
    const cacheKeys = Object.keys(_eventTypeMetaCache);
    if (cacheKeys.length >= 500) {
      cacheKeys.slice(0, 250).forEach(k => {
        delete _eventTypeMetaCache[k];
        delete _eventTypeDescCache[k];
      });
    }
    _eventTypeMetaCache[eventTypeUri] = meta;
    if (meta.description) _eventTypeDescCache[eventTypeUri] = meta.description;
    if (meta.price != null) {
      console.log(`[OK] Event type ${eventTypeUri.split("/").pop()} list price: $${meta.price}`);
    }
    return meta;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[WARN] Could not fetch event type metadata: ${err.message}`);
    delete _eventTypeMetaCache[eventTypeUri];
    delete _eventTypeDescCache[eventTypeUri];
    return { description: "", price: null };
  }
}

async function fetchEventTypeDescription(eventTypeUri) {
  const meta = await fetchEventTypeMeta(eventTypeUri);
  return meta.description || "";
}

async function fetchEventTypePrice(eventTypeUri) {
  const meta = await fetchEventTypeMeta(eventTypeUri);
  return meta.price;
}

/** GET an invitee resource by URI (used for no-show webhooks and payment lookup). */
async function fetchInviteeResource(inviteeUri) {
  if (!inviteeUri?.startsWith(CALENDLY_API_BASE)) return null;
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
  try {
    const res = await fetch(inviteeUri, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()).resource ?? null;
  } catch (err) {
    clearTimeout(timer);
    console.warn(`[WARN] Could not fetch invitee resource: ${err.message}`);
    return null;
  }
}

/**
 * invitee_no_show.* webhooks only include an invitee URI — resolve email/name/event
 * so the event passes the email gate and CRM can match the registration.
 */
async function resolveInviteeForNoShow(extracted, inviteeUri) {
  const uri = String(inviteeUri || extracted?.calendlyInviteeUri || "").trim();
  if (!uri) return extracted;

  const invitee = await fetchInviteeResource(uri);
  if (!invitee) return { ...extracted, calendlyInviteeUri: uri || extracted.calendlyInviteeUri };

  let scheduled = {};
  if (invitee.event?.startsWith(CALENDLY_API_BASE)) {
    const token = process.env.CALENDLY_API_TOKEN;
    if (token) {
      try {
        const data = await calendlyApiGet(
          invitee.event.replace(CALENDLY_API_BASE, ""),
          token,
        );
        scheduled = data.resource || data || {};
      } catch { /* optional enrichment */ }
    }
  }

  const location = scheduled.location || {};
  return {
    ...extracted,
    calendlyInviteeUri: invitee.uri || uri,
    email: (invitee.email || "").toLowerCase(),
    name: resolveInviteeFormName(invitee, scheduled) || extracted.name || "",
    phone: invitee.text_reminder_number || extracted.phone || "",
    timezone: invitee.timezone || extracted.timezone || "",
    calendlyEventUri: scheduled.uri || invitee.event || extracted.calendlyEventUri || "",
    calendlyEventTypeUri: scheduled.event_type || extracted.calendlyEventTypeUri || "",
    eventName: scheduled.name || extracted.eventName || "",
    startTime: scheduled.start_time || extracted.startTime || "",
    endTime: scheduled.end_time || extracted.endTime || "",
    locationType: location.type || extracted.locationType || "",
    locationJoinUrl: location.join_url || extracted.locationJoinUrl || "",
    locationAddress: location.location || extracted.locationAddress || "",
    createdAt: invitee.created_at || extracted.createdAt || "",
  };
}

async function fetchInviteePayment(inviteeUri, eventTypeUriHint = "") {
  if (!inviteeUri?.startsWith(CALENDLY_API_BASE)) return null;

  const invitee = await fetchInviteeResource(inviteeUri);
  if (!invitee) return null;

  try {
    let eventTypeUri = eventTypeUriHint || "";
    if (!eventTypeUri && invitee.event?.startsWith(CALENDLY_API_BASE)) {
      const evtController = new AbortController();
      const evtTimer = setTimeout(() => evtController.abort(), CALENDLY_API_TIMEOUT_MS);
      try {
        const token = process.env.CALENDLY_API_TOKEN;
        const evtRes = await fetch(invitee.event, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          signal: evtController.signal,
        });
        clearTimeout(evtTimer);
        if (evtRes.ok) {
          eventTypeUri = (await evtRes.json()).resource?.event_type || "";
        }
      } catch {
        clearTimeout(evtTimer);
      }
    }

    const listPrice = eventTypeUri ? await fetchEventTypePrice(eventTypeUri) : null;
    const payment = invitee.payment;
    const paidAmount = payment != null ? parseCalendlyPaymentAmount(payment.amount) : null;
    const paymentSuccessful = payment?.successful === true;

    // Amount column = configured session price from event type (mirrors Calendly Payment section via internal_note).
    // paidAmount = what Calendly recorded on the invitee (often $0 for coupons).
    const sessionPrice = listPrice ?? paidAmount;

    // Return null (not a truthy shell of nulls) so enrichment does not clobber
    // webhook-supplied paymentAmount/paidAmount when the API has nothing new.
    if (sessionPrice == null && paidAmount == null) {
      return null;
    }

    return {
      paymentAmount: sessionPrice,
      paidAmount,
      paymentSuccessful,
      priceSource: listPrice != null ? "event_type" : "calendly_payment",
    };
  } catch (err) {
    console.warn(`[WARN] Could not fetch invitee payment: ${err.message}`);
    return null;
  }
}

let _calendlyUserUri = null;
let _eventTypesByNameCache = null;
let _eventTypesByNameCacheAt = 0;
const EVENT_TYPES_CACHE_MS = 5 * 60 * 1000;

async function calendlyApiGet(path, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CALENDLY_API_TIMEOUT_MS);
  try {
    const res = await fetch(`${CALENDLY_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Calendly API ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function getCalendlyUserUri(token) {
  if (_calendlyUserUri) return _calendlyUserUri;
  const data = await calendlyApiGet("users/me", token);
  _calendlyUserUri = data.resource?.uri || "";
  return _calendlyUserUri;
}

async function getEventTypesByNameIndex(token) {
  if (_eventTypesByNameCache && Date.now() - _eventTypesByNameCacheAt < EVENT_TYPES_CACHE_MS) {
    return _eventTypesByNameCache;
  }
  const userUri = await getCalendlyUserUri(token);
  if (!userUri) return {};
  const index = {};
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ user: userUri, count: "100" });
    if (pageToken) qs.set("page_token", pageToken);
    const data = await calendlyApiGet(`event_types?${qs}`, token);
    for (const et of data.collection || []) {
      const name = String(et.name || "").trim().toLowerCase();
      if (name && !index[name]) index[name] = et.uri;
    }
    pageToken = data.pagination?.next_page_token || null;
  } while (pageToken);
  _eventTypesByNameCache = index;
  _eventTypesByNameCacheAt = Date.now();
  return index;
}

async function fetchEventTypeDescriptionByName(eventName, token) {
  // Exact name match only (case-insensitive). Substring matching can cross-bind
  // similar event types (e.g. "Yoga" → "Indiga Yoga - Walnut Creek").
  const needle = String(eventName || "").trim().toLowerCase();
  if (!needle) return "";
  const index = await getEventTypesByNameIndex(token);
  if (index[needle]) return fetchEventTypeDescription(index[needle]);
  return "";
}

async function fetchEventTypePriceByName(eventName, token) {
  // Exact name match only — fuzzy substring matching can assign the wrong list price.
  const needle = String(eventName || "").trim().toLowerCase();
  if (!needle) return null;
  const index = await getEventTypesByNameIndex(token);
  if (index[needle]) return fetchEventTypePrice(index[needle]);
  return null;
}

/** Stable dedup key: invitee URI, else routing-form submission URI, else email+createdAt for routing forms. */
function calendlyWebhookDedupKey(extracted) {
  const uri = extracted.calendlyInviteeUri || extracted.calendlySubmissionUri || "";
  if (uri) return `${uri}|${extracted.eventType}`;
  if (String(extracted.eventType || "").startsWith("routing_form_submission") && extracted.email) {
    return `rf:${extracted.email}|${extracted.createdAt || ""}|${extracted.eventType}`;
  }
  return "";
}

/**
 * Idempotent Calendly webhook enqueue — dedup by invitee/submission URI + event type
 * (mirrors Stripe's stripeEventId check). Returns { status, id, queued }.
 */
function enqueueCalendlyWebhookEvent(extracted) {
  const queue = readQueue();
  const key = calendlyWebhookDedupKey(extracted);
  if (key) {
    const existing = queue.find(e => calendlyWebhookDedupKey(e) === key);
    if (existing) {
      console.log(`[INFO] Duplicate Calendly ${extracted.eventType} for ${key} — skipping`);
      return { status: "duplicate", id: existing.id, queued: false };
    }
  }
  queue.push(extracted);
  writeQueue(queue);
  console.log(`[OK] Queued ${extracted.eventType} for ${extracted.calendlyInviteeUri || extracted.calendlySubmissionUri || extracted.id} — queue length: ${queue.length}`);
  return { status: "queued", id: extracted.id, queued: true };
}

/**
 * Enrich a queued Calendly event after the webhook 200 — description + payment
 * via Calendly API. Patches the queue entry only while still unprocessed.
 */
async function enrichQueuedCalendlyEvent(eventId, { eventTypeUri = "", inviteeUri = "", calendlyEventTypeUri = "" } = {}) {
  const patches = {};

  if (eventTypeUri) {
    const desc = await fetchEventTypeDescription(eventTypeUri);
    if (desc) patches.description = desc;
  }

  if (inviteeUri) {
    const pay = await fetchInviteePayment(inviteeUri, eventTypeUri || calendlyEventTypeUri || "");
    if (pay) {
      if (pay.paymentAmount != null) patches.paymentAmount = pay.paymentAmount;
      // Only patch paidAmount / paymentSuccessful when the API returned a real amount —
      // paymentSuccessful:false must not wipe webhook-supplied paidAmount:null checks.
      if (pay.paidAmount != null) {
        patches.paidAmount = pay.paidAmount;
        patches.paymentSuccessful = pay.paymentSuccessful === true;
      }
      if (pay.priceSource) patches.paymentPriceSource = pay.priceSource;
    }
  } else if (eventTypeUri) {
    const price = await fetchEventTypePrice(eventTypeUri);
    if (price != null) {
      // Applied only when the queued row still has no amount (see patch below).
      patches._eventTypePrice = price;
    }
  }

  if (Object.keys(patches).length === 0) return;

  await withQueueLock(() => {
    const queue = readQueue();
    const idx = queue.findIndex(e => e.id === eventId && !e.processed);
    if (idx < 0) return;
    const current = queue[idx];
    const applied = { ...patches };
    if (applied._eventTypePrice != null) {
      if (current.paymentAmount == null) {
        applied.paymentAmount = applied._eventTypePrice;
        applied.paymentSuccessful = false;
        applied.paymentPriceSource = "event_type";
      }
      delete applied._eventTypePrice;
    }
    if (Object.keys(applied).length === 0) return;
    queue[idx] = { ...current, ...applied, enrichedAt: new Date().toISOString() };
    writeQueue(queue);
    console.log(`[OK] Enriched Calendly event ${eventId}`);
  });
}

/** Build a queue event from Calendly REST API objects (same shape as webhook extractEvent). */
function buildInviteeCreatedFromApi(invitee, scheduled) {
  const location = scheduled.location || {};
  const answers = {};
  (invitee.questions_and_answers || []).forEach(({ question, answer }) => {
    const key = String(question || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    answers[key] = answer || "";
  });

  const payment = invitee.payment || null;
  const rawAmount = payment?.amount;
  const paymentAmount = rawAmount != null
    ? (typeof rawAmount === "number" ? rawAmount : parseFloat(rawAmount))
    : null;

  return {
    id:                 `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    receivedAt:         new Date().toISOString(),
    processed:          false,
    eventType:          "invitee.created",
    source:             "calendly_api_pull",
    // Invitee name from invitee resource only — never scheduled.name / description
    name:               resolveInviteeFormName(invitee, scheduled),
    email:              (invitee.email || "").toLowerCase(),
    phone:              answers.phone_number || answers.phone || invitee.text_reminder_number || "",
    timezone:           invitee.timezone || "",
    calendlyInviteeUri: invitee.uri || "",
    calendlyEventUri:   scheduled.uri || "",
    calendlyEventTypeUri: scheduled.event_type || "",
    eventName:          scheduled.name || "",
    description:        scheduled.description || "",
    startTime:          scheduled.start_time || "",
    endTime:            scheduled.end_time || "",
    createdAt:          invitee.created_at || "",
    locationType:       location.type || "",
    locationJoinUrl:    location.join_url || "",
    locationAddress:    location.location || "",
    rescheduled:        invitee.rescheduled || false,
    newInviteeUri:      invitee.new_invitee || "",
    oldInviteeUri:      invitee.old_invitee || "",
    doneBreathworkBefore: answers.have_you_done_breathwork_before || answers.breathwork_before || "",
    howHeard:           answers.how_did_you_hear_about_us || answers.how_did_you_find_us || "",
    referredBy:         answers.who_referred_you || answers.referred_by || "",
    concerns:           answers.any_physical_or_emotional_concerns || answers.concerns || "",
    attendanceType:     answers.attending_virtually_or_in_person || answers.attendance_type || "",
    reviewedContraindications: answers.have_you_reviewed_contraindications || answers.contraindications || "",
    customAnswers:      answers,
    utmSource:          invitee.tracking?.utm_source || "",
    utmMedium:          invitee.tracking?.utm_medium || "",
    utmCampaign:        invitee.tracking?.utm_campaign || "",
    paymentAmount:      paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paidAmount:         paymentAmount != null && !Number.isNaN(paymentAmount) ? paymentAmount : null,
    paymentCurrency:    payment?.currency || "",
    paymentSuccessful:  payment?.successful === true,
  };
}

async function enrichCalendlyQueueEvent(extracted) {
  const eventTypeUri = extracted.calendlyEventTypeUri || "";
  if (eventTypeUri) {
    extracted.description = await fetchEventTypeDescription(eventTypeUri) || extracted.description;
  }
  if (extracted.calendlyInviteeUri) {
    const pay = await fetchInviteePayment(extracted.calendlyInviteeUri, eventTypeUri);
    if (pay) {
      if (pay.paymentAmount != null) extracted.paymentAmount = pay.paymentAmount;
      if (pay.paidAmount != null) {
        extracted.paidAmount = pay.paidAmount;
        extracted.paymentSuccessful = pay.paymentSuccessful === true;
      }
      if (pay.priceSource) extracted.paymentPriceSource = pay.priceSource;
    }
  } else if (extracted.paymentAmount == null && eventTypeUri) {
    const price = await fetchEventTypePrice(eventTypeUri);
    if (price != null) {
      extracted.paymentAmount = price;
      extracted.paymentSuccessful = false;
      extracted.paymentPriceSource = "event_type";
    }
  }
  return extracted;
}

/** Build an invitee.canceled queue event from Calendly API objects (canceled invitee). */
function buildInviteeCanceledFromApi(invitee, scheduled) {
  const evt = buildInviteeCreatedFromApi(invitee, scheduled);
  evt.eventType    = "invitee.canceled";
  evt.rescheduled  = invitee.rescheduled || false;
  evt.cancelerType = invitee.cancellation?.canceler_type || "";
  evt.cancelReason = invitee.cancellation?.reason || "";
  evt.canceledAt   = invitee.cancellation?.created_at || invitee.updated_at || "";
  return evt;
}

/** Fetch all scheduled events of a given status (active|canceled) within the window. */
async function fetchScheduledEvents(userUri, minStart, status, token) {
  const events = [];
  let pageToken = null;
  do {
    const qs = new URLSearchParams({ user: userUri, min_start_time: minStart, count: "100", status });
    if (pageToken) qs.set("page_token", pageToken);
    const data = await calendlyApiGet(`scheduled_events?${qs}`, token);
    events.push(...(data.collection || []));
    pageToken = data.pagination?.next_page_token || null;
  } while (pageToken);
  return events;
}

/** Append candidate events to the queue, deduped by invitee URI + event type. Returns {added, skipped, requeued}.
 *  Processed events normally block re-queue (avoid sync thrash). Exceptions:
 *  - Payload changed (name / start / end / event / email) → refresh so CRM picks up edits
 *  - Booked within REQUEUE_RECENT_MS → re-queue so a lost CRM registration can heal
 */
const REQUEUE_RECENT_MS = 72 * 60 * 60 * 1000;

function calendlyEventPayloadChanged(existing, evt) {
  return existing.name !== evt.name
    || existing.email !== evt.email
    || existing.eventName !== evt.eventName
    || existing.startTime !== evt.startTime
    || existing.endTime !== evt.endTime
    || existing.phone !== evt.phone;
}

function isRecentCalendlyBooking(evt, nowMs = Date.now()) {
  const bookedAt = Date.parse(evt.createdAt || evt.receivedAt || "");
  return Number.isFinite(bookedAt) && (nowMs - bookedAt) < REQUEUE_RECENT_MS;
}

/** Synthetic URIs from webhook-signature tests (not real Calendly bookings). */
function isSyntheticCalendlyUri(uri) {
  if (!uri) return false;
  const u = String(uri);
  return /\/scheduled_events\/TEST\b/i.test(u) || /\/invitees\/TEST\b/i.test(u);
}

/**
 * Pure queue-candidate planner (no I/O). Mutates a shallow copy of `queueIn`.
 * Used by queueCandidates and unit-tested for dedup / requeue rules.
 */
function planCalendlyQueueCandidates(queueIn, candidates, nowMs = Date.now()) {
  const queue = [...(queueIn || [])];
  let added = 0, skipped = 0, requeued = 0;
  const byKey = new Map();
  queue.forEach((e, i) => {
    const key = `${e.calendlyInviteeUri}|${e.eventType}`;
    if (key !== "|") byKey.set(key, i);
  });
  for (const evt of candidates || []) {
    if (isSyntheticCalendlyUri(evt.calendlyInviteeUri) || isSyntheticCalendlyUri(evt.calendlyEventUri)) {
      skipped++;
      continue;
    }
    const key = `${evt.calendlyInviteeUri}|${evt.eventType}`;
    if (key === "|") { skipped++; continue; }
    const idx = byKey.get(key);
    if (idx == null) {
      queue.push(evt);
      byKey.set(key, queue.length - 1);
      added++;
      continue;
    }
    const existing = queue[idx];
    if (!existing.processed) { skipped++; continue; }
    const shouldRequeue = calendlyEventPayloadChanged(existing, evt) || isRecentCalendlyBooking(evt, nowMs);
    if (!shouldRequeue) { skipped++; continue; }
    queue[idx] = {
      ...evt,
      id: existing.id,
      processed: false,
      requeuedAt: new Date(nowMs).toISOString(),
      previouslyProcessedAt: existing.processedAt || "",
    };
    requeued++;
    added++;
  }
  return { queue, added, skipped, requeued };
}

async function queueCandidates(candidates) {
  let result = { added: 0, skipped: 0, requeued: 0 };
  await withQueueLock(() => {
    const planned = planCalendlyQueueCandidates(readQueue(), candidates);
    writeQueue(planned.queue);
    result = { added: planned.added, skipped: planned.skipped, requeued: planned.requeued };
  });
  return result;
}

/** Fetch recent Calendly bookings AND cancellations via API; queue any missing events (webhook fallback). */
async function pullRecentCalendlyBookings(daysBack = 30) {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) {
    return { added: 0, skipped: 0, scanned: 0, error: "CALENDLY_API_TOKEN not configured" };
  }

  const userUri = await getCalendlyUserUri(token);
  if (!userUri) {
    return { added: 0, skipped: 0, scanned: 0, error: "Could not resolve Calendly user" };
  }

  const minStart = new Date(Date.now() - Math.min(Math.max(daysBack, 1), 90) * 86400000).toISOString();
  const deadline = Date.now() + CALENDLY_PULL_DEADLINE_MS;
  const timedOut = () => Date.now() >= deadline;
  let added = 0, skipped = 0, scanned = 0, requeued = 0, truncated = false;

  // ── PASS 1: Cancellations first ──
  // Canceled events are few and need no payment enrichment, so they queue within ~1-2s —
  // well inside the frontend's ~12s pull timeout, ensuring they're processed on the same sync.
  try {
    const canceledEvents = await fetchScheduledEvents(userUri, minStart, "canceled", token);
    const cancelCandidates = [];
    for (const scheduled of canceledEvents) {
      if (timedOut()) { truncated = true; break; }
      const uuid = scheduled.uri?.split("/").pop();
      if (!uuid) continue;
      let invPage = null;
      do {
        if (timedOut()) { truncated = true; break; }
        const qs = new URLSearchParams({ count: "100" });
        if (invPage) qs.set("page_token", invPage);
        const invData = await calendlyApiGet(`scheduled_events/${uuid}/invitees?${qs}`, token);
        for (const invitee of invData.collection || []) {
          scanned++;
          if (!invitee.uri || !invitee.email) continue;
          if (invitee.status !== "canceled") continue;
          cancelCandidates.push(buildInviteeCanceledFromApi(invitee, scheduled));
        }
        invPage = invData.pagination?.next_page_token || null;
      } while (invPage && !truncated);
    }
    const r1 = await queueCandidates(cancelCandidates);
    added += r1.added; skipped += r1.skipped; requeued += r1.requeued || 0;
    if (r1.added > 0) console.log(`[OK] Calendly API pull queued ${r1.added} cancellation(s) (${r1.requeued || 0} re-queued)`);
  } catch (e) {
    console.warn(`[WARN] Cancellation pull failed: ${e.message}`);
  }

  // ── PASS 2: Active bookings (with payment enrichment) ──
  // Group/studio events stay "active" even when an individual participant cancels — only that
  // invitee's status flips to "canceled". So we must inspect invitees of active events too and
  // queue an invitee.canceled for any canceled participant (PASS 1 only catches fully-canceled events).
  // Bound serial fan-out with CALENDLY_PULL_DEADLINE_MS so we return before the CRM request times out.
  if (timedOut()) {
    console.warn(`[WARN] Calendly API pull hit ${CALENDLY_PULL_DEADLINE_MS}ms deadline before active pass`);
    return { added, skipped, scanned, requeued, truncated: true };
  }
  const activeEvents = await fetchScheduledEvents(userUri, minStart, "active", token);
  const bookingCandidates = [];
  const lateCancelCandidates = [];
  for (const scheduled of activeEvents) {
    if (timedOut()) { truncated = true; break; }
    const uuid = scheduled.uri?.split("/").pop();
    if (!uuid) continue;
    let invPage = null;
    do {
      if (timedOut()) { truncated = true; break; }
      const qs = new URLSearchParams({ count: "100" });
      if (invPage) qs.set("page_token", invPage);
      const invData = await calendlyApiGet(`scheduled_events/${uuid}/invitees?${qs}`, token);
      for (const invitee of invData.collection || []) {
        if (timedOut()) { truncated = true; break; }
        scanned++;
        if (!invitee.uri || !invitee.email) continue;
        if (invitee.status === "canceled") {
          lateCancelCandidates.push(buildInviteeCanceledFromApi(invitee, scheduled));
          continue;
        }
        const extracted = buildInviteeCreatedFromApi(invitee, scheduled);
        await enrichCalendlyQueueEvent(extracted);
        bookingCandidates.push(extracted);
      }
      invPage = invData.pagination?.next_page_token || null;
    } while (invPage && !truncated);
  }
  if (lateCancelCandidates.length) {
    const rc = await queueCandidates(lateCancelCandidates);
    added += rc.added; skipped += rc.skipped; requeued += rc.requeued || 0;
    if (rc.added > 0) console.log(`[OK] Calendly API pull queued ${rc.added} group-event participant cancellation(s)`);
  }
  const r2 = await queueCandidates(bookingCandidates);
  added += r2.added; skipped += r2.skipped; requeued += r2.requeued || 0;

  if (truncated) {
    console.warn(`[WARN] Calendly API pull truncated after ${CALENDLY_PULL_DEADLINE_MS}ms (${scanned} invitees scanned, ${added} queued) — remaining events sync next cycle`);
  } else if (added > 0) {
    console.log(`[OK] Calendly API pull queued ${added} event(s) (${requeued} re-queued for CRM heal/refresh, ${skipped} unchanged, ${scanned} invitees scanned)`);
  }

  return { added, skipped, scanned, requeued, truncated };
}

module.exports = {
  CALENDLY_API_BASE,
  CALENDLY_API_TIMEOUT_MS,
  CALENDLY_PULL_DEADLINE_MS,
  verifySignature,
  resolveInviteeFormName,
  extractEvent,
  parsePriceFromInternalNote,
  parseCalendlyPaymentAmount,
  stripHtml,
  pickEventTypeDescription,
  fetchEventTypeMeta,
  fetchEventTypeDescription,
  fetchEventTypePrice,
  fetchInviteeResource,
  resolveInviteeForNoShow,
  fetchInviteePayment,
  calendlyApiGet,
  getCalendlyUserUri,
  getEventTypesByNameIndex,
  fetchEventTypeDescriptionByName,
  fetchEventTypePriceByName,
  enqueueCalendlyWebhookEvent,
  enrichQueuedCalendlyEvent,
  buildInviteeCreatedFromApi,
  enrichCalendlyQueueEvent,
  buildInviteeCanceledFromApi,
  fetchScheduledEvents,
  calendlyEventPayloadChanged,
  isRecentCalendlyBooking,
  isSyntheticCalendlyUri,
  planCalendlyQueueCandidates,
  REQUEUE_RECENT_MS,
  queueCandidates,
  pullRecentCalendlyBookings,
};
