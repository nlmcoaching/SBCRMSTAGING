import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CRM_ARRAY_KEYS,
  SAMPLE_SEED_REVENUE_IDS,
  normalizeCrmData,
  healStudioPartners,
  healStudioPartnersData,
} from "./normalizeData.js";

describe("normalizeCrmData", () => {
  it("returns null for non-objects", () => {
    assert.equal(normalizeCrmData(null), null);
    assert.equal(normalizeCrmData(undefined), null);
    assert.equal(normalizeCrmData("x"), null);
  });

  it("fills missing CRM arrays", () => {
    const out = normalizeCrmData({ clients: [{ id: "c1" }] });
    for (const k of CRM_ARRAY_KEYS) {
      assert.ok(Array.isArray(out[k]), k);
    }
    assert.equal(out.clients[0].id, "c1");
    assert.deepEqual(out.sessions, []);
  });

  it("strips legacy sample revenue ids", () => {
    const seedId = [...SAMPLE_SEED_REVENUE_IDS][0];
    const out = normalizeCrmData({
      clients: [], partners: [], sessions: [], offers: [],
      revenue: [{ id: seedId, amount: 10 }, { id: "rv-real", amount: 20 }],
    });
    assert.deepEqual(out.revenue.map(r => r.id), ["rv-real"]);
  });

  it("coerces partner studioSharePct to a number", () => {
    const out = normalizeCrmData({
      partners: [
        { id: "p1", name: "A", studioSharePct: 40 },
        { id: "p2", name: "B", studioSharePct: "25" },
        { id: "p3", name: "C" },
      ],
    });
    assert.equal(out.partners[0].studioSharePct, 40);
    assert.equal(out.partners[1].studioSharePct, 25);
    assert.equal(out.partners[2].studioSharePct, 0);
  });
});

describe("healStudioPartners", () => {
  it("is a no-op when nothing is missing", () => {
    const sessions = [{ id: "s1", name: "Virtual Breathwork", locationType: "zoom" }];
    const partners = [{ id: "p1", name: "Studio X" }];
    const out = healStudioPartners(sessions, partners);
    assert.equal(out.changed, false);
    assert.equal(out.sessions, sessions);
    assert.equal(out.partners, partners);
  });

  it("recreates a missing partner from a dangling studioId", () => {
    const sessions = [{
      id: "s1",
      name: "Indiga Yoga - Walnut Creek",
      studioId: "sp_missing",
      locationType: "physical",
      revenue: 200,
      studioSplit: 80,
    }];
    const out = healStudioPartners(sessions, []);
    assert.equal(out.changed, true);
    assert.equal(out.partners.length, 1);
    assert.equal(out.partners[0].id, "sp_missing");
    assert.equal(out.partners[0].name, "Indiga Yoga");
    assert.equal(out.partners[0].location, "Walnut Creek");
    assert.equal(out.partners[0].studioSharePct, 40);
    assert.equal(out.sessions[0].studioId, "sp_missing");
  });

  it("links physical studio-named sessions to an existing partner by name", () => {
    const partners = [{ id: "p1", name: "Indiga Yoga", location: "WC" }];
    const sessions = [{
      id: "s1",
      name: "Indiga Yoga - Walnut Creek",
      locationType: "physical",
      locationAddress: "123 Main",
    }];
    const out = healStudioPartners(sessions, partners);
    assert.equal(out.changed, true);
    assert.equal(out.sessions[0].studioId, "p1");
    assert.equal(out.partners.length, 1);
  });

  it("never turns virtual sessions into studio partners", () => {
    const sessions = [{
      id: "s1",
      name: "Virtual - Zoom Room",
      locationType: "zoom",
    }];
    const out = healStudioPartners(sessions, []);
    assert.equal(out.changed, false);
    assert.equal(out.partners.length, 0);
  });

  it("healStudioPartnersData returns same object when unchanged", () => {
    const d = { sessions: [], partners: [], clients: [] };
    assert.equal(healStudioPartnersData(d), d);
    assert.equal(healStudioPartnersData(null), null);
  });
});
