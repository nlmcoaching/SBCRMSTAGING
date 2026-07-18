/**
 * register-unlock authorization matrix — the Critical privilege model.
 * Covers: bootstrap, self-reg→Viewer, Owner-granted roles, rotate-with-proof.
 */
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const os = require("os");
const express = require("express");

const {
  AUTH_USERS_FILE,
  writeAuthUsers,
  readAuthUsers,
  getRefundSessions,
  getSessionChallenges,
} = require("./authUsers");

const TEST_SECRET = "test-frontend-secret-auth-matrix";
const prevFrontendSecret = process.env.FRONTEND_SECRET;
const prevAllowInsecure = process.env.ALLOW_INSECURE_DEV_AUTH;

let backupPath = null;
let hadAuthFile = false;
let server;
let baseUrl;

function hexSecret() {
  return crypto.randomBytes(32).toString("hex");
}

function unlockProof(secretHex, nonce, userId) {
  return crypto
    .createHmac("sha256", Buffer.from(secretHex, "hex"))
    .update(`${nonce}:${userId}`)
    .digest("base64");
}

async function api(method, urlPath, { headers = {}, body } = {}) {
  const res = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-frontend-secret": TEST_SECRET,
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { _raw: text }; }
  return { status: res.status, json };
}

async function challenge() {
  const r = await api("GET", "/api/auth/session-challenge");
  assert.equal(r.status, 200);
  assert.ok(r.json?.nonce);
  return r.json.nonce;
}

async function mintSession(userId, secretHex) {
  const nonce = await challenge();
  const r = await api("POST", "/api/auth/session", {
    body: { userId, nonce, unlockProof: unlockProof(secretHex, nonce, userId) },
  });
  assert.equal(r.status, 200, `mintSession failed: ${JSON.stringify(r.json)}`);
  return r.json;
}

function clearInMemoryAuth() {
  getRefundSessions().clear();
  getSessionChallenges().clear();
}

describe("register-unlock auth matrix", () => {
  before(async () => {
    process.env.FRONTEND_SECRET = TEST_SECRET;
    delete process.env.ALLOW_INSECURE_DEV_AUTH;

    hadAuthFile = fs.existsSync(AUTH_USERS_FILE);
    if (hadAuthFile) {
      backupPath = path.join(os.tmpdir(), `sbcrm-auth-users.backup.${process.pid}.${Date.now()}.json`);
      fs.copyFileSync(AUTH_USERS_FILE, backupPath);
      fs.unlinkSync(AUTH_USERS_FILE);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/auth", require("../routes/auth"));
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    clearInMemoryAuth();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      if (backupPath && fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, AUTH_USERS_FILE);
        fs.unlinkSync(backupPath);
      } else if (!hadAuthFile && fs.existsSync(AUTH_USERS_FILE)) {
        fs.unlinkSync(AUTH_USERS_FILE);
      }
    } finally {
      if (prevFrontendSecret === undefined) delete process.env.FRONTEND_SECRET;
      else process.env.FRONTEND_SECRET = prevFrontendSecret;
      if (prevAllowInsecure === undefined) delete process.env.ALLOW_INSECURE_DEV_AUTH;
      else process.env.ALLOW_INSECURE_DEV_AUTH = prevAllowInsecure;
    }
  });

  beforeEach(() => {
    clearInMemoryAuth();
    if (fs.existsSync(AUTH_USERS_FILE)) fs.unlinkSync(AUTH_USERS_FILE);
  });

  it("rejects missing frontend secret", async () => {
    const res = await fetch(`${baseUrl}/api/auth/register-unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "u1", unlockSecret: hexSecret() }),
    });
    assert.equal(res.status, 403);
  });

  it("bootstrap (empty registry) trusts client Owner/canEdit", async () => {
    const secret = hexSecret();
    const r = await api("POST", "/api/auth/register-unlock", {
      body: { userId: "owner1", unlockSecret: secret, role: "Owner", canEdit: true },
    });
    assert.equal(r.status, 200);
    assert.deepEqual(
      { ok: r.json.ok, userId: r.json.userId, role: r.json.role, canEdit: r.json.canEdit },
      { ok: true, userId: "owner1", role: "Owner", canEdit: true },
    );
    const store = readAuthUsers();
    assert.equal(store.users.owner1.role, "Owner");
    assert.equal(store.users.owner1.canEdit, true);
  });

  it("bootstrap without unlockSecret returns 400", async () => {
    const r = await api("POST", "/api/auth/register-unlock", {
      body: { userId: "owner1", role: "Owner", canEdit: true },
    });
    assert.equal(r.status, 400);
    assert.match(r.json.error, /bootstrap/i);
  });

  it("Critical: self-registration ignores client Owner/canEdit and forces Viewer", async () => {
    const ownerSecret = hexSecret();
    writeAuthUsers({
      users: {
        owner1: { unlockSecret: ownerSecret, role: "Owner", canEdit: true, updatedAt: new Date().toISOString() },
      },
    });

    const attackerSecret = hexSecret();
    const r = await api("POST", "/api/auth/register-unlock", {
      body: {
        userId: "attacker",
        unlockSecret: attackerSecret,
        role: "Owner",
        canEdit: true,
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.role, "Viewer");
    assert.equal(r.json.canEdit, false);

    const store = readAuthUsers();
    assert.equal(store.users.attacker.role, "Viewer");
    assert.equal(store.users.attacker.canEdit, false);

    const session = await mintSession("attacker", attackerSecret);
    assert.equal(session.role, "Viewer");
    assert.equal(session.canEdit, false);
  });

  it("Owner session may grant Editor/canEdit to a new user", async () => {
    const ownerSecret = hexSecret();
    const boot = await api("POST", "/api/auth/register-unlock", {
      body: { userId: "owner1", unlockSecret: ownerSecret, role: "Owner", canEdit: true },
    });
    assert.equal(boot.status, 200);

    const ownerSession = await mintSession("owner1", ownerSecret);
    const editorSecret = hexSecret();
    const r = await api("POST", "/api/auth/register-unlock", {
      headers: { "x-session-token": ownerSession.token },
      body: {
        userId: "editor1",
        unlockSecret: editorSecret,
        role: "Editor",
        canEdit: true,
      },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.role, "Editor");
    assert.equal(r.json.canEdit, true);

    const store = readAuthUsers();
    assert.equal(store.users.editor1.role, "Editor");
    assert.equal(store.users.editor1.canEdit, true);
  });

  it("Owner may update role/canEdit without rotating the unlock secret", async () => {
    const ownerSecret = hexSecret();
    await api("POST", "/api/auth/register-unlock", {
      body: { userId: "owner1", unlockSecret: ownerSecret, role: "Owner", canEdit: true },
    });
    const ownerSession = await mintSession("owner1", ownerSecret);

    const viewerSecret = hexSecret();
    await api("POST", "/api/auth/register-unlock", {
      headers: { "x-session-token": ownerSession.token },
      body: { userId: "viewer1", unlockSecret: viewerSecret, role: "Viewer", canEdit: false },
    });

    const r = await api("POST", "/api/auth/register-unlock", {
      headers: { "x-session-token": ownerSession.token },
      body: { userId: "viewer1", role: "Editor", canEdit: true },
    });
    assert.equal(r.status, 200);
    assert.equal(r.json.role, "Editor");
    assert.equal(r.json.canEdit, true);

    const store = readAuthUsers();
    assert.equal(store.users.viewer1.unlockSecret, viewerSecret);
    assert.equal(store.users.viewer1.role, "Editor");
  });

  it("secret rotation requires a valid unlock proof and preserves role/canEdit", async () => {
    const ownerSecret = hexSecret();
    writeAuthUsers({
      users: {
        owner1: { unlockSecret: ownerSecret, role: "Owner", canEdit: true, updatedAt: new Date().toISOString() },
        editor1: {
          unlockSecret: hexSecret(),
          role: "Editor",
          canEdit: true,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    // Re-read so we know the stored editor secret
    const before = readAuthUsers().users.editor1;
    const oldSecret = before.unlockSecret;
    const newSecret = hexSecret();

    const missingNonce = await api("POST", "/api/auth/register-unlock", {
      body: { userId: "editor1", unlockSecret: newSecret },
    });
    assert.equal(missingNonce.status, 400);

    const nonce = await challenge();
    const badProof = await api("POST", "/api/auth/register-unlock", {
      body: {
        userId: "editor1",
        unlockSecret: newSecret,
        nonce,
        unlockProof: unlockProof(hexSecret(), nonce, "editor1"), // wrong secret
        role: "Owner",
        canEdit: true,
      },
    });
    assert.equal(badProof.status, 403);

    const nonce2 = await challenge();
    const ok = await api("POST", "/api/auth/register-unlock", {
      body: {
        userId: "editor1",
        unlockSecret: newSecret,
        nonce: nonce2,
        unlockProof: unlockProof(oldSecret, nonce2, "editor1"),
        role: "Owner", // must be ignored
        canEdit: false,
      },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.role, "Editor");
    assert.equal(ok.json.canEdit, true);

    const after = readAuthUsers().users.editor1;
    assert.equal(after.unlockSecret, newSecret);
    assert.equal(after.role, "Editor");
    assert.equal(after.canEdit, true);

    // Old secret can no longer mint; new secret can.
    const oldNonce = await challenge();
    const oldMint = await api("POST", "/api/auth/session", {
      body: {
        userId: "editor1",
        nonce: oldNonce,
        unlockProof: unlockProof(oldSecret, oldNonce, "editor1"),
      },
    });
    assert.equal(oldMint.status, 401);

    const session = await mintSession("editor1", newSecret);
    assert.equal(session.role, "Editor");
    assert.equal(session.canEdit, true);
  });

  it("Viewer session cannot elevate another user via Owner-manage path", async () => {
    const ownerSecret = hexSecret();
    await api("POST", "/api/auth/register-unlock", {
      body: { userId: "owner1", unlockSecret: ownerSecret, role: "Owner", canEdit: true },
    });
    const ownerSession = await mintSession("owner1", ownerSecret);

    const viewerSecret = hexSecret();
    await api("POST", "/api/auth/register-unlock", {
      headers: { "x-session-token": ownerSession.token },
      body: { userId: "viewer1", unlockSecret: viewerSecret, role: "Viewer", canEdit: false },
    });

    const viewerSession = await mintSession("viewer1", viewerSecret);
    const r = await api("POST", "/api/auth/register-unlock", {
      headers: { "x-session-token": viewerSession.token },
      body: {
        userId: "escalated",
        unlockSecret: hexSecret(),
        role: "Owner",
        canEdit: true,
      },
    });
    // Falls into self-registration (not Owner manage)
    assert.equal(r.status, 200);
    assert.equal(r.json.role, "Viewer");
    assert.equal(r.json.canEdit, false);
  });
});
