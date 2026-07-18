/**
 * Prefix-only hygiene check for backend/.env — never prints secret values.
 * Usage: node scripts/check-env-prefixes.js
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
if (!fs.existsSync(envPath)) {
  console.log("backend/.env not found");
  process.exit(0);
}

const want = [
  "NODE_ENV",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "CALENDLY_API_TOKEN",
  "QUEUE_ENCRYPTION_KEY",
  "FRONTEND_SECRET",
  "ADMIN_SECRET",
];

function prefixOf(v) {
  if (!v) return "(empty)";
  if (v.startsWith("sk_live_")) return "sk_live_";
  if (v.startsWith("rk_live_")) return "rk_live_";
  if (v.startsWith("sk_test_")) return "sk_test_";
  if (v.startsWith("rk_test_")) return "rk_test_";
  if (v.startsWith("whsec_")) return "whsec_";
  if (v.startsWith("re_")) return "re_";
  return "(set)";
}

const map = new Map();
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  if (!line || line.trim().startsWith("#")) continue;
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  map.set(k, v);
}

for (const k of want) {
  console.log(`${k}: prefix=${prefixOf(map.get(k))}`);
}

const stripe = map.get("STRIPE_SECRET_KEY") || "";
if (stripe.startsWith("sk_live_") || stripe.startsWith("rk_live_")) {
  console.log("note: LIVE Stripe key detected — refunds hit live money when NODE_ENV≠production");
}
if (stripe.startsWith("sk_live_")) {
  console.log("note: prefer a refund-scoped rk_live_ restricted key instead of full sk_live_");
}
