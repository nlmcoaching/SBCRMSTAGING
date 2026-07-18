/**
 * Pure Calendly queue → CRM apply (the setData body of App.syncCalendly).
 * I/O (fetch/ack/description backfill) stays in App; this module is unit-testable.
 */
import { uid as defaultUid, todayISO, addDaysISO, cleanName } from "./format.js";
import { emptyChecklist } from "./constants.js";
import { emptySessionChecklist, emptyEquipChecklist } from "./checklists.js";
import { isTruncatedPreview, resolveCalendlyDescription } from "./api.js";
import { Sec } from "./sec.js";
import { healStudioPartners } from "./normalizeData.js";
import {
  deriveRegistrationPaymentStatus,
  refreshCalendlySessionRevenue,
  applyRegistrationLifetimeValues,
} from "./revenue/index.js";

/** Match a studio partner by name only (strips "Sample -" prefix). */
export function resolvePartner(partnersList, ...textFields) {
  const haystack = textFields.join(" ").toLowerCase();
  return partnersList.find(p => {
    if (!p.name) return false;
    const pName = p.name.replace(/^sample\s*-\s*/i, "").toLowerCase();
    return pName.length > 2 && haystack.includes(pName);
  });
}

/** Extract studio name + location from "Studio - Location" or "Studio · Journey". */
export function extractStudio(eventName, locationAddress) {
  if (!eventName) return null;
  const dashIdx = eventName.indexOf(" - ");
  if (dashIdx > 0) {
    return {
      name: eventName.slice(0, dashIdx).trim(),
      location: eventName.slice(dashIdx + 3).trim() || locationAddress || "",
    };
  }
  const dotIdx = eventName.indexOf(" · ");
  if (dotIdx > 0) return { name: eventName.slice(0, dotIdx).trim(), location: locationAddress || "" };
  return null;
}

function inviteeFormNameFromEvent(evt) {
  const n = String(evt.name || "").trim();
  if (!n) return "";
  const eventTitle = String(evt.eventName || "").trim();
  const eventDesc = String(evt.description || "").trim();
  if (eventTitle && n.toLowerCase() === eventTitle.toLowerCase()) return "";
  if (eventDesc && n.toLowerCase() === eventDesc.toLowerCase()) return "";
  return n;
}

function isSyntheticUri(uri) {
  const u = String(uri || "");
  return /\/scheduled_events\/TEST\b/i.test(u) || /\/invitees\/TEST\b/i.test(u);
}

/**
 * Apply pending Calendly queue events to CRM data.
 * @returns {{ data, processed, ids, syncedItems, sessionsNeedingDesc, paymentLookupUris }}
 */
export function applyCalendlyEvents(prevData, events, options = {}) {
  const {
    calendlySyncFromDate = "",
    now = () => new Date(),
    today = () => todayISO(),
    uid = defaultUid,
  } = options;

  const processedIds = [];
  const syncedItems = [];
  const sessionsNeedingDesc = [];
  const paymentLookupUris = [];
  let processed = 0;

  let next = { ...(prevData || {}) };
  const clients = [...(next.clients || [])];
  const registrations = [...(next.registrations || [])];
  const sessions = [...(next.sessions || [])];
  const followups = [...(next.followups || [])];
  const partners = [...(next.partners || [])];

  // Retroactively fix Calendly-synced sessions missing studioId / capacity / double-prefix names.
  sessions.forEach((s, i) => {
    if (!s.calendlyEventUri) return;
    let updated = { ...s };
    let changed = false;

    if (!s.studioId) {
      const linkedReg = registrations.find(r => r.sessionId === s.id);
      const match = resolvePartner(partners, s.name, s.notes || "", linkedReg?.locationAddress || "");
      if (match) { updated.studioId = match.id; changed = true; }
    }

    if (!updated.calendlyEventUri) {
      const linkedReg = registrations.find(r => r.sessionId === s.id && r.calendlyEventUri);
      if (linkedReg?.calendlyEventUri) {
        updated.calendlyEventUri = linkedReg.calendlyEventUri;
        changed = true;
      }
    }

    const isVirtualSession = !updated.studioId && (updated.locationType === "zoom" || updated.locationType === "custom" || !updated.locationType);
    if (isVirtualSession && s.capacity !== 1) { updated.capacity = 1; changed = true; }

    if (updated.studioId) {
      const partnerObj = partners.find(p => p.id === updated.studioId);
      if (partnerObj) {
        const pName = cleanName(partnerObj.name || "");
        const sName = cleanName(updated.name || "");
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

  const healed = healStudioPartners(sessions, partners);
  if (healed.changed) {
    sessions.splice(0, sessions.length, ...healed.sessions);
    partners.splice(0, partners.length, ...healed.partners);
  }

  const finish = () => {
    const refreshedSessions = refreshCalendlySessionRevenue(sessions, registrations);
    const ltvData = { registrations, revenue: next.revenue || [], offers: next.offers || [] };
    return {
      data: {
        ...next,
        clients: applyRegistrationLifetimeValues(clients, ltvData),
        registrations,
        sessions: refreshedSessions,
        followups,
        partners,
      },
      processed,
      ids: processedIds,
      syncedItems,
      sessionsNeedingDesc,
      paymentLookupUris,
    };
  };

  if (!events?.length) {
    const refreshedSessions = refreshCalendlySessionRevenue(sessions, registrations);
    const ltvData = { registrations, revenue: next.revenue || [], offers: next.offers || [] };
    return {
      data: {
        ...next,
        clients: applyRegistrationLifetimeValues(clients, ltvData),
        sessions: refreshedSessions,
        partners,
        // Preserve prev registrations/followups refs when the queue is empty (heal only
        // mutates sessions/partners; avoids unnecessary downstream effect churn).
      },
      processed: 0,
      ids: [],
      syncedItems: [],
      sessionsNeedingDesc,
      paymentLookupUris: [],
    };
  }

  const nowIso = () => {
    const d = typeof now === "function" ? now() : now;
    return d instanceof Date ? d.toISOString() : String(d);
  };

  events.forEach(rawEvt => {
    const san = (v) => Sec.sanitize(v);
    const evt = {
      ...rawEvt,
      name: san(rawEvt.name),
      email: san(rawEvt.email),
      phone: san(rawEvt.phone),
      eventName: san(rawEvt.eventName),
      description: san(rawEvt.description),
      locationAddress: san(rawEvt.locationAddress),
      howHeard: san(rawEvt.howHeard),
      referredBy: san(rawEvt.referredBy),
      concerns: san(rawEvt.concerns),
      cancelReason: san(rawEvt.cancelReason),
    };

    const inviteeFormName = inviteeFormNameFromEvent(evt);

    const _uri = String(evt.calendlyInviteeUri || evt.calendlyEventUri || "");
    if (isSyntheticUri(_uri)) {
      processedIds.push(evt.id);
      return;
    }

    if (calendlySyncFromDate) {
      const _evtTs = evt.createdAt || evt.receivedAt || "";
      if (_evtTs && _evtTs < calendlySyncFromDate) {
        processedIds.push(evt.id);
        return;
      }
    }

    if (evt.eventType === "invitee.created") {
      const crmCanceledReg = registrations.find(r =>
        r.calendlyInviteeUri && r.calendlyInviteeUri === evt.calendlyInviteeUri
        && (r.status === "canceled" || r.status === "rescheduled"));
      if (crmCanceledReg) {
        // Ack so rebooked-after-cancel redeliveries do not stay in the pending queue forever.
        processedIds.push(evt.id);
        return;
      }

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

      const priorReg = registrations.find(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
      const priorCanceled = priorReg && (priorReg.status === "canceled" || priorReg.status === "rescheduled");
      let sessionId = priorCanceled ? (priorReg.sessionId || "") : "";
      if (evt.calendlyEventUri && !priorCanceled) {
        const isPhysical = evt.locationType === "physical" || (!evt.locationType && evt.locationAddress && evt.locationType !== "zoom");
        let matchedPartner = resolvePartner(partners, evt.eventName || "", evt.locationAddress || "");

        if (!matchedPartner && isPhysical) {
          const extracted = extractStudio(evt.eventName || "", evt.locationAddress || "");
          if (extracted?.name) {
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
          const isVirtual = !resolvedStudioId && !isPhysical;
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
      const preserveCancel = prevReg && (prevReg.status === "canceled" || prevReg.status === "rescheduled");
      const preserveAttendanceStatus = prevReg && (prevReg.status === "attended" || prevReg.status === "no_show");
      const regRecord = {
        id: existingRegIdx >= 0 ? registrations[existingRegIdx].id : uid("reg"),
        clientId: client.id, sessionId,
        calendlyInviteeUri: evt.calendlyInviteeUri,
        calendlyEventUri: evt.calendlyEventUri,
        calendlyEventTypeUri: evt.calendlyEventTypeUri || prevReg?.calendlyEventTypeUri || "",
        eventName: evt.eventName,
        status: preserveCancel || preserveAttendanceStatus ? prevReg.status : "booked",
        paymentAmount,
        paidAmount,
        paymentStatus,
        stripeVerified: prevReg?.stripeVerified || false,
        stripePaymentIntentId: prevReg?.stripePaymentIntentId || "",
        stripeChargeId: prevReg?.stripeChargeId || "",
        paymentId: prevReg?.paymentId || "",
        paidAt: prevReg?.paidAt || "",
        amountRefunded: prevReg?.amountRefunded || 0,
        waiverStatus: "signed",
        createdAt: existingRegIdx >= 0
          ? (registrations[existingRegIdx].createdAt || evt.createdAt || evt.receivedAt || nowIso())
          : (evt.createdAt || evt.receivedAt || nowIso()),
        calendlyReceivedAt: evt.receivedAt || prevReg?.calendlyReceivedAt || "",
        scheduledAt: evt.startTime,
        timezone: evt.timezone,
        locationType: evt.locationType,
        locationJoinUrl: evt.locationJoinUrl,
        locationAddress: evt.locationAddress,
        attendanceType: evt.attendanceType,
        checkedIn: prevReg?.checkedIn || false,
        attended: prevReg?.attended || false,
        noShow: prevReg?.noShow || false,
        doneBreathworkBefore: evt.doneBreathworkBefore,
        howHeard: evt.howHeard,
        referredBy: evt.referredBy,
        concerns: evt.concerns,
        reviewedContraindications: evt.reviewedContraindications,
        rescheduledFromInviteeUri: evt.oldInviteeUri || prevReg?.rescheduledFromInviteeUri || "",
        notes: prevReg?.notes || "",
      };
      if (preserveCancel) {
        regRecord.canceledAt = prevReg.canceledAt || "";
        regRecord.cancelReason = prevReg.cancelReason || "";
        regRecord.cancelerType = prevReg.cancelerType || "";
        regRecord.rescheduledToInviteeUri = prevReg.rescheduledToInviteeUri || "";
      }
      if (existingRegIdx >= 0) registrations[existingRegIdx] = regRecord;
      else registrations.push(regRecord);

      if ((paymentAmount == null || paymentAmount === "") && evt.calendlyInviteeUri) {
        paymentLookupUris.push(evt.calendlyInviteeUri);
      }

      if (existingRegIdx < 0 && sessionDate) {
        [
          { label: "Send same-day session confirmation/check-in", days: 0 },
          { label: "Send 24-hour post-session follow-up", days: 1 },
          { label: "Send 72-hour rebooking or package offer", days: 3 },
        ].forEach(({ label, days }) => {
          if (!followups.some(f => f.clientId === client.id && f.name === label)) {
            followups.push({
              id: uid("f"), name: label, clientId: client.id, stage: client.status,
              lastContact: today(), futype: "24h", nextAction: addDaysISO(sessionDate, days), outcome: "",
            });
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
      processedIds.push(evt.id);

    } else if (evt.eventType === "invitee.canceled") {
      const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
      const cancelStatus = evt.rescheduled ? "rescheduled" : "canceled";
      const cancelFields = {
        status: cancelStatus,
        canceledAt: evt.canceledAt || evt.receivedAt || nowIso(),
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
          const remainingActive = registrations.filter(
            x => x.sessionId === sess.id && x.status !== "canceled" && x.status !== "rescheduled"
          ).length;
          if (isVirtual && remainingActive === 0) {
            sessions.splice(sessIdx, 1);
          } else if (sess.registered > 0) {
            sessions[sessIdx] = { ...sess, registered: sess.registered - 1 };
          }
        }
      } else {
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
        registrations.push({
          id: uid("reg"),
          clientId: cancelClient?.id || "",
          sessionId: existingSession?.id || "",
          calendlyInviteeUri: evt.calendlyInviteeUri || "",
          calendlyEventUri: evt.calendlyEventUri || "",
          calendlyEventTypeUri: evt.calendlyEventTypeUri || "",
          eventName: evt.eventName || "",
          scheduledAt: evt.startTime || "",
          timezone: evt.timezone || "",
          locationType: evt.locationType || "",
          locationAddress: evt.locationAddress || "",
          attendanceType: evt.attendanceType || "",
          howHeard: evt.howHeard || "",
          referredBy: evt.referredBy || "",
          concerns: evt.concerns || "",
          paymentAmount: evt.paymentAmount ?? null,
          paidAmount: evt.paidAmount ?? null,
          paymentStatus: "canceled",
          stripeVerified: false, waiverStatus: "signed",
          createdAt: evt.createdAt || evt.receivedAt || nowIso(),
          notes: "Registration created from cancellation event",
          ...cancelFields,
        });
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
      processedIds.push(evt.id);

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
      processedIds.push(evt.id);

    } else if (evt.eventType === "invitee_no_show.deleted") {
      const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
      if (regIdx >= 0) {
        const prev = registrations[regIdx];
        const patch = { noShow: false };
        if (prev.status === "no_show") patch.status = "booked";
        registrations[regIdx] = { ...prev, ...patch };
        const reg = registrations[regIdx];
        const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
        if (sessIdx >= 0 && sessions[sessIdx].noShows > 0) {
          sessions[sessIdx] = { ...sessions[sessIdx], noShows: sessions[sessIdx].noShows - 1 };
        }
      }
      syncedItems.push({ type: "No-show cleared", clientName: inviteeFormName || "", eventName: evt.eventName || "", scheduledAt: evt.startTime || "", amount: null, isNew: false });
      processed++;
      processedIds.push(evt.id);
    }
  });

  return finish();
}
