import { cleanName, fmtDate } from "./format.js";

export function extractTemplateVars(t) {
  const matches = [...(t.subject || "").matchAll(/\{\{([^}]+)\}\}/g),
                   ...(t.body   || "").matchAll(/\{\{([^}]+)\}\}/g)];
  return [...new Set(matches.map(m => m[1].trim()))];
}

export function autoFillTemplateVars(varKeys, recipient, type, currentUser) {
  const vals = {};
  const filled = new Set();
  const yourFirstName = (currentUser?.name || "").split(" ")[0] || "";
  const set = (k, v) => { vals[k] = v; filled.add(k); };

  varKeys.forEach(k => {
    const lk = k.toLowerCase();
    if (lk === "yourname") { set(k, yourFirstName); return; }
    if (type === "client") {
      const firstName = (recipient.name || "").split(" ")[0];
      if (lk === "clientname")       { set(k, cleanName(recipient.name || "")); return; }
      if (lk === "firstname")        { set(k, firstName); return; }
      if (lk === "email")            { set(k, recipient.email || ""); return; }
      if (lk === "phone")            { set(k, recipient.phone || ""); return; }
    }
    if (type === "partner") {
      if (lk === "studioname")       { set(k, recipient.name || ""); return; }
      if (lk === "contactname")      { set(k, recipient.contact || ""); return; }
      if (lk === "email")            { set(k, recipient.email || ""); return; }
      if (lk === "phone")            { set(k, recipient.phone || ""); return; }
      if (lk === "location")         { set(k, recipient.location || ""); return; }
      if (lk === "avgattendance" || lk === "avgattendan") { set(k, recipient.avgAttendance != null ? String(recipient.avgAttendance) : ""); return; }
      if (lk === "lastcontactdate")  { set(k, recipient.lastTouch ? fmtDate(recipient.lastTouch) : ""); return; }
      if (lk === "sessionspermonth") { set(k, recipient.sessionsPerMonth != null ? String(recipient.sessionsPerMonth) : ""); return; }
      if (lk === "revsplit")         { set(k, recipient.studioSharePct ? `${recipient.studioSharePct}% to studio` : (recipient.revShare || "")); return; }
      if (lk === "referencestudio")  { set(k, recipient.name || ""); return; }
    }
    vals[k] = "";
  });
  return { vars: vals, autoFilledKeys: filled };
}

export function applyTemplateVars(text, vars) {
  return (text || "").replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] || `{{${k.trim()}}}`);
}

/** Remaining `{{token}}` placeholders in one or more strings (subject/body). */
export function findUnreplacedTemplateTokens(...texts) {
  const found = new Set();
  for (const text of texts) {
    for (const m of String(text || "").matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
      const token = m[1].trim();
      if (token) found.add(token);
    }
  }
  return [...found];
}

export function unreplacedTokensMessage(tokens) {
  if (!tokens?.length) return "";
  return `Replace or remove unfilled placeholders before sending: ${tokens.map(t => `{{${t}}}`).join(", ")}`;
}

export function resolveRelationshipActionRecipient(action, data) {
  const { db, record: r } = action;
  if (!r) return null;
  const clients  = data.clients  || [];
  const partners = data.partners || [];

  if (db === "clients") {
    const client = clients.find(c => c.id === r.id) || r;
    return { recipient: { ...client, _type: "client" }, type: "client" };
  }
  if (db === "partners") {
    const partner = partners.find(p => p.id === r.id) || r;
    return { recipient: { ...partner, _type: "partner" }, type: "partner" };
  }
  if (db === "followups") {
    const client = clients.find(c => c.id === r.clientId);
    if (client) return { recipient: { ...client, _type: "client" }, type: "client" };
    return { recipient: { id: r.clientId || r.id, name: r.name || "Client", email: "", _type: "client" }, type: "client" };
  }
  if (db === "referrals") {
    if (action.id.startsWith("rty_")) {
      const referrer = clients.find(c => c.id === r.referrerId);
      if (referrer) return { recipient: { ...referrer, _type: "client" }, type: "client" };
    }
    if (action.id.startsWith("rnc_")) {
      if (r.referredId) {
        const referred = clients.find(c => c.id === r.referredId);
        if (referred) return { recipient: { ...referred, _type: "client" }, type: "client" };
      }
      return { recipient: { id: `${r.id}_referred`, name: r.referredName || "Referred contact", email: "", _type: "client", _pseudo: true }, type: "client" };
    }
  }
  return null;
}

export function suggestEmailTemplatesForAction(action, templates) {
  const email = (templates || []).filter(t => t.channel === "Email");
  const cats = action.id.startsWith("pi_")
    ? ["Studio Outreach", "Engagement"]
    : ["Engagement", "Post-Session", "Sales & Offers"];
  const matched = email.filter(t => cats.includes(t.category));
  return matched.length ? matched : email;
}

export function outreachScore(o, today) {
  let s = 0;
  if (o.warmth === "Hot") s += 40; else if (o.warmth === "Warm") s += 20;
  s += Math.min(30, Math.round((Number(o.revenuePotential) || 0) / 500) * 5);
  if (o.responseStatus === "Interested") s += 15; else if (o.responseStatus === "Responded") s += 8;
  if (o.priority === "High") s += 10; else if (o.priority === "Medium") s += 5;
  const daysOld = !o.lastContact ? 0 : Math.round((new Date(today||new Date()) - new Date(o.lastContact)) / 86400000);
  s = Math.max(0, s - Math.floor(daysOld / 7) * 5);
  return Math.min(100, s);
}
