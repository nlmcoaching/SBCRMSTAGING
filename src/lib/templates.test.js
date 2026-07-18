import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractTemplateVars,
  autoFillTemplateVars,
  applyTemplateVars,
  findUnreplacedTemplateTokens,
  unreplacedTokensMessage,
  resolveRelationshipActionRecipient,
  suggestEmailTemplatesForAction,
  outreachScore,
} from "./templates.js";

describe("extractTemplateVars / applyTemplateVars", () => {
  it("collects unique tokens from subject and body", () => {
    const vars = extractTemplateVars({
      subject: "Hi {{FirstName}}",
      body: "Hello {{FirstName}} and {{YourName}}",
    });
    assert.deepEqual(vars.sort(), ["FirstName", "YourName"]);
  });

  it("replaces known vars and leaves missing tokens intact", () => {
    assert.equal(
      applyTemplateVars("Hi {{FirstName}} from {{StudioName}}", { FirstName: "Alex" }),
      "Hi Alex from {{StudioName}}",
    );
  });
});

describe("autoFillTemplateVars", () => {
  it("fills client fields and your name", () => {
    const { vars, autoFilledKeys } = autoFillTemplateVars(
      ["ClientName", "FirstName", "Email", "YourName", "Unknown"],
      { name: "Alex Rivera", email: "a@ex.com" },
      "client",
      { name: "Jeff Mason" },
    );
    assert.equal(vars.ClientName, "Alex Rivera");
    assert.equal(vars.FirstName, "Alex");
    assert.equal(vars.Email, "a@ex.com");
    assert.equal(vars.YourName, "Jeff");
    assert.equal(vars.Unknown, "");
    assert.ok(autoFilledKeys.has("ClientName"));
    assert.ok(!autoFilledKeys.has("Unknown"));
  });

  it("fills partner studio fields", () => {
    const { vars } = autoFillTemplateVars(
      ["StudioName", "ContactName", "RevSplit", "AvgAttendance"],
      { name: "Indiga", contact: "Sam", studioSharePct: 40, avgAttendance: 18 },
      "partner",
      { name: "Jeff" },
    );
    assert.equal(vars.StudioName, "Indiga");
    assert.equal(vars.ContactName, "Sam");
    assert.equal(vars.RevSplit, "40% to studio");
    assert.equal(vars.AvgAttendance, "18");
  });
});

describe("findUnreplacedTemplateTokens", () => {
  it("finds leftover placeholders across texts", () => {
    const tokens = findUnreplacedTemplateTokens("Hi {{ FirstName }}", "See {{Offer}}");
    assert.deepEqual(tokens.sort(), ["FirstName", "Offer"]);
  });

  it("builds a send-blocking message", () => {
    assert.equal(unreplacedTokensMessage([]), "");
    assert.match(unreplacedTokensMessage(["Offer"]), /\{\{Offer\}\}/);
  });
});

describe("resolveRelationshipActionRecipient", () => {
  const data = {
    clients: [{ id: "c1", name: "Alex", email: "a@ex.com" }],
    partners: [{ id: "p1", name: "Indiga", email: "s@ex.com" }],
  };

  it("resolves clients and partners directly", () => {
    const c = resolveRelationshipActionRecipient({ db: "clients", record: { id: "c1" } }, data);
    assert.equal(c.type, "client");
    assert.equal(c.recipient.email, "a@ex.com");
    const p = resolveRelationshipActionRecipient({ db: "partners", record: { id: "p1" } }, data);
    assert.equal(p.type, "partner");
    assert.equal(p.recipient.name, "Indiga");
  });

  it("resolves followups via clientId", () => {
    const r = resolveRelationshipActionRecipient(
      { db: "followups", record: { id: "f1", clientId: "c1", name: "Alex" } },
      data,
    );
    assert.equal(r.recipient.id, "c1");
  });
});

describe("suggestEmailTemplatesForAction", () => {
  const templates = [
    { id: "t1", channel: "Email", category: "Studio Outreach" },
    { id: "t2", channel: "Email", category: "Engagement" },
    { id: "t3", channel: "SMS", category: "Engagement" },
  ];

  it("prefers studio categories for partner actions", () => {
    const out = suggestEmailTemplatesForAction({ id: "pi_1" }, templates);
    assert.deepEqual(out.map(t => t.id), ["t1", "t2"]);
  });

  it("falls back to all email templates when no category match", () => {
    const out = suggestEmailTemplatesForAction({ id: "x_1" }, [
      { id: "t9", channel: "Email", category: "Other" },
    ]);
    assert.deepEqual(out.map(t => t.id), ["t9"]);
  });
});

describe("outreachScore", () => {
  it("scores hot high-priority prospects higher than cold ones", () => {
    const hot = outreachScore({
      warmth: "Hot",
      revenuePotential: 3000,
      responseStatus: "Interested",
      priority: "High",
      lastContact: "2026-07-10",
    }, "2026-07-17");
    const cold = outreachScore({
      warmth: "Cold",
      revenuePotential: 0,
      responseStatus: "",
      priority: "Low",
      lastContact: "2026-01-01",
    }, "2026-07-17");
    assert.ok(hot > cold);
    assert.ok(hot <= 100);
    assert.ok(cold >= 0);
  });
});
