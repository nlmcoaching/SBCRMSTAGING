import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { applyCalendlyEvents, resolvePartner, extractStudio } from "./calendlySync.js";

let seq = 0;
const uid = (p) => `${p}_${++seq}`;
const opts = {
  uid,
  today: () => "2026-07-17",
  now: () => new Date("2026-07-17T12:00:00.000Z"),
};

function emptyData(extra = {}) {
  return {
    clients: [], partners: [], sessions: [], registrations: [], followups: [],
    revenue: [], offers: [], payments: [],
    ...extra,
  };
}

function createdEvt(extra = {}) {
  return {
    id: "evt_1",
    eventType: "invitee.created",
    name: "Alex Rivera",
    email: "alex@example.com",
    phone: "555-0100",
    eventName: "Virtual Breathwork",
    description: "Full description text",
    calendlyInviteeUri: "https://api.calendly.com/scheduled_events/abc/invitees/inv1",
    calendlyEventUri: "https://api.calendly.com/scheduled_events/abc",
    calendlyEventTypeUri: "https://api.calendly.com/event_types/et1",
    startTime: "2026-07-20T18:00:00.000Z",
    endTime: "2026-07-20T19:00:00.000Z",
    createdAt: "2026-07-15T12:00:00.000Z",
    receivedAt: "2026-07-15T12:00:01.000Z",
    locationType: "zoom",
    locationJoinUrl: "https://zoom.us/j/1",
    paymentAmount: 55,
    paidAmount: null,
    paymentSuccessful: false,
    ...extra,
  };
}

describe("resolvePartner / extractStudio", () => {
  it("matches partner name in event text", () => {
    const p = resolvePartner([{ id: "p1", name: "Indiga Yoga" }], "Indiga Yoga - Walnut Creek");
    assert.equal(p.id, "p1");
  });

  it("parses studio dash and middot formats", () => {
    assert.deepEqual(extractStudio("Indiga Yoga - Walnut Creek", ""), {
      name: "Indiga Yoga", location: "Walnut Creek",
    });
    assert.deepEqual(extractStudio("Indiga Yoga · Journey", "Addr"), {
      name: "Indiga Yoga", location: "Addr",
    });
  });
});

describe("applyCalendlyEvents — booking", () => {
  it("creates client, virtual session, registration, and follow-ups", () => {
    seq = 0;
    const { data, processed, ids, syncedItems } = applyCalendlyEvents(emptyData(), [createdEvt()], opts);
    assert.equal(processed, 1);
    assert.deepEqual(ids, ["evt_1"]);
    assert.equal(data.clients.length, 1);
    assert.equal(data.clients[0].email, "alex@example.com");
    assert.equal(data.clients[0].name, "Alex Rivera");
    assert.equal(data.sessions.length, 1);
    assert.equal(data.sessions[0].capacity, 1);
    assert.equal(data.sessions[0].calendlyEventUri, createdEvt().calendlyEventUri);
    assert.equal(data.registrations.length, 1);
    assert.equal(data.registrations[0].status, "booked");
    assert.equal(data.registrations[0].paymentAmount, 55);
    assert.equal(data.followups.length, 3);
    assert.equal(syncedItems[0].type, "Booked");
  });

  it("does not resurrect a canceled registration on redelivery", () => {
    seq = 0;
    const evt = createdEvt();
    const prev = emptyData({
      clients: [{ id: "c1", email: "alex@example.com", name: "Alex", status: "Booked" }],
      registrations: [{
        id: "reg1",
        clientId: "c1",
        sessionId: "",
        calendlyInviteeUri: evt.calendlyInviteeUri,
        status: "canceled",
        canceledAt: "2026-07-16T00:00:00.000Z",
        cancelerType: "invitee",
      }],
      sessions: [],
    });
    const { data, processed, ids } = applyCalendlyEvents(prev, [evt], opts);
    assert.equal(processed, 0);
    // Ack the event so the pending queue drains; do not leave it to refetch forever.
    assert.deepEqual(ids, [evt.id]);
    assert.equal(data.registrations[0].status, "canceled");
    assert.equal(data.sessions.length, 0);
  });

  it("acks synthetic TEST uris without mutating CRM", () => {
    seq = 0;
    const { data, processed, ids } = applyCalendlyEvents(emptyData(), [createdEvt({
      id: "evt_test",
      calendlyInviteeUri: "https://api.calendly.com/scheduled_events/x/invitees/TEST",
    })], opts);
    assert.equal(processed, 0);
    assert.deepEqual(ids, ["evt_test"]);
    assert.equal(data.registrations.length, 0);
  });

  it("acks events before calendlySyncFromDate without applying", () => {
    seq = 0;
    const { data, processed, ids } = applyCalendlyEvents(
      emptyData(),
      [createdEvt({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" })],
      { ...opts, calendlySyncFromDate: "2026-07-01" },
    );
    assert.equal(processed, 0);
    assert.deepEqual(ids, ["old"]);
    assert.equal(data.registrations.length, 0);
  });

  it("marks $0 bookings paid", () => {
    seq = 0;
    const { data } = applyCalendlyEvents(emptyData(), [createdEvt({ paymentAmount: 0 })], opts);
    assert.equal(data.registrations[0].paymentStatus, "paid");
  });
});

describe("applyCalendlyEvents — cancel / no-show", () => {
  it("cancels a registration and removes an empty virtual session", () => {
    seq = 0;
    const invitee = createdEvt().calendlyInviteeUri;
    const eventUri = createdEvt().calendlyEventUri;
    const prev = emptyData({
      clients: [{ id: "c1", email: "alex@example.com", name: "Alex" }],
      sessions: [{
        id: "se1", name: "Virtual", studioId: "", calendlyEventUri: eventUri,
        registered: 1, locationType: "zoom",
      }],
      registrations: [{
        id: "reg1", clientId: "c1", sessionId: "se1",
        calendlyInviteeUri: invitee, calendlyEventUri: eventUri, status: "booked",
      }],
    });
    const { data, processed } = applyCalendlyEvents(prev, [{
      id: "evt_c",
      eventType: "invitee.canceled",
      name: "Alex Rivera",
      email: "alex@example.com",
      calendlyInviteeUri: invitee,
      calendlyEventUri: eventUri,
      canceledAt: "2026-07-16T12:00:00.000Z",
      cancelerType: "invitee",
      cancelReason: "Conflict",
      rescheduled: false,
    }], opts);
    assert.equal(processed, 1);
    assert.equal(data.registrations[0].status, "canceled");
    assert.equal(data.registrations[0].cancelerType, "invitee");
    assert.equal(data.sessions.length, 0);
  });

  it("decrements studio session registered count on cancel", () => {
    seq = 0;
    const invitee = "https://api.calendly.com/scheduled_events/g1/invitees/i1";
    const eventUri = "https://api.calendly.com/scheduled_events/g1";
    const prev = emptyData({
      partners: [{ id: "p1", name: "Indiga Yoga" }],
      sessions: [{
        id: "se1", name: "Indiga Yoga - WC", studioId: "p1",
        calendlyEventUri: eventUri, registered: 3,
      }],
      registrations: [{
        id: "reg1", clientId: "c1", sessionId: "se1",
        calendlyInviteeUri: invitee, calendlyEventUri: eventUri, status: "booked",
      }],
      clients: [{ id: "c1", email: "a@ex.com", name: "A" }],
    });
    const { data } = applyCalendlyEvents(prev, [{
      id: "evt_c",
      eventType: "invitee.canceled",
      name: "A",
      email: "a@ex.com",
      calendlyInviteeUri: invitee,
      calendlyEventUri: eventUri,
      cancelerType: "host",
    }], opts);
    assert.equal(data.registrations[0].status, "canceled");
    assert.equal(data.sessions.length, 1);
    assert.equal(data.sessions[0].registered, 2);
  });

  it("creates a cancellation-only registration when booking was never synced", () => {
    seq = 0;
    const { data } = applyCalendlyEvents(emptyData(), [{
      id: "evt_c",
      eventType: "invitee.canceled",
      name: "Sam Lee",
      email: "sam@example.com",
      calendlyInviteeUri: "https://api.calendly.com/scheduled_events/z/invitees/z1",
      calendlyEventUri: "https://api.calendly.com/scheduled_events/z",
      eventName: "Breathwork",
      cancelerType: "invitee",
      canceledAt: "2026-07-16T12:00:00.000Z",
    }], opts);
    assert.equal(data.registrations.length, 1);
    assert.equal(data.registrations[0].status, "canceled");
    assert.match(data.registrations[0].notes, /cancellation event/i);
    assert.equal(data.clients[0].email, "sam@example.com");
  });

  it("marks no-show and clears it without clobbering attended", () => {
    seq = 0;
    const invitee = createdEvt().calendlyInviteeUri;
    const base = emptyData({
      clients: [{ id: "c1", email: "alex@example.com", name: "Alex" }],
      sessions: [{ id: "se1", studioId: "", calendlyEventUri: "u", registered: 1, noShows: 0 }],
      registrations: [{
        id: "reg1", clientId: "c1", sessionId: "se1",
        calendlyInviteeUri: invitee, status: "booked", noShow: false,
      }],
    });
    const noshow = applyCalendlyEvents(base, [{
      id: "n1", eventType: "invitee_no_show.created", name: "Alex",
      calendlyInviteeUri: invitee,
    }], opts);
    assert.equal(noshow.data.registrations[0].status, "no_show");
    assert.equal(noshow.data.sessions[0].noShows, 1);

    const cleared = applyCalendlyEvents(noshow.data, [{
      id: "n2", eventType: "invitee_no_show.deleted", name: "Alex",
      calendlyInviteeUri: invitee,
    }], opts);
    assert.equal(cleared.data.registrations[0].status, "booked");
    assert.equal(cleared.data.sessions[0].noShows, 0);

    const attended = {
      ...noshow.data,
      registrations: [{ ...noshow.data.registrations[0], status: "attended", noShow: true }],
    };
    const keep = applyCalendlyEvents(attended, [{
      id: "n3", eventType: "invitee_no_show.deleted", name: "Alex",
      calendlyInviteeUri: invitee,
    }], opts);
    assert.equal(keep.data.registrations[0].status, "attended");
    assert.equal(keep.data.registrations[0].noShow, false);
  });
});

describe("applyCalendlyEvents — studio auto-create", () => {
  it("auto-creates a studio partner for physical studio-named events", () => {
    seq = 0;
    const { data } = applyCalendlyEvents(emptyData(), [createdEvt({
      eventName: "Indiga Yoga - Walnut Creek",
      locationType: "physical",
      locationAddress: "123 Main",
      locationJoinUrl: "",
    })], opts);
    assert.equal(data.partners.length, 1);
    assert.equal(data.partners[0].name, "Indiga Yoga");
    assert.equal(data.sessions[0].studioId, data.partners[0].id);
    assert.equal(data.sessions[0].capacity, 20);
  });
});
