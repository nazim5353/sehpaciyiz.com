import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  createSession,
  verifySession,
  assertOrigin,
  isLocalPreview,
  requestOrigin,
} from "../src/lib/auth";
import { seal, unseal } from "../src/lib/crypto";
process.env.SESSION_SECRET = "a".repeat(64);
process.env.SETTINGS_ENCRYPTION_KEY = "b".repeat(64);
test("sessions are signed and modified or expired tokens are rejected", () => {
  const token = createSession();
  assert.equal(verifySession(token), true);
  assert.equal(verifySession(token + "x"), false);
  assert.equal(verifySession(), false);
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", expires: 1 }),
  ).toString("base64url");
  const signature = createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
  assert.equal(verifySession(`${payload}.${signature}`), false);
});
test("secret encryption is randomized and authenticates ciphertext", () => {
  const first = seal("test-only-secret");
  const second = seal("test-only-secret");
  assert.notEqual(first, second);
  assert.ok(!first.includes("test-only-secret"));
  assert.equal(unseal(first), "test-only-secret");
  const parts = first.split(":");
  parts[3] =
    (parseInt(parts[3].slice(0, 2), 16) ^ 1).toString(16).padStart(2, "0") +
    parts[3].slice(2);
  assert.throws(() => unseal(parts.join(":")));
});
test("cross-origin writes and preview login on nonlocal hosts are rejected", () => {
  assert.throws(() =>
    assertOrigin(
      new Request("http://127.0.0.1:3100/api/admin/settings/genel", {
        headers: { origin: "https://example.com" },
      }),
    ),
  );
  process.env.LOCAL_PREVIEW = "true";
  assert.equal(
    isLocalPreview(new Request("https://example.com/api/admin/session")),
    false,
  );
  assert.equal(
    isLocalPreview(new Request("http://127.0.0.1:3100/api/admin/session")),
    true,
  );
});
test("Next localhost normalization preserves the actual loopback origin", () => {
  const request = new Request("http://localhost:3100/api/admin/session", {
    headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
  });
  assert.doesNotThrow(() => assertOrigin(request));
  assert.equal(requestOrigin(request), "http://127.0.0.1:3100");
  assert.throws(() =>
    assertOrigin(
      new Request(request.url, {
        headers: { host: "127.0.0.1:3100", origin: "http://localhost:3100" },
      }),
    ),
  );
  assert.throws(() =>
    assertOrigin(
      new Request(request.url, {
        headers: { host: "example.com", origin: "http://example.com" },
      }),
    ),
  );
});
test("owner setup rejects a LAN Host despite Next loopback normalization", () => {
  process.env.LOCAL_PREVIEW = "true";
  assert.equal(
    isLocalPreview(
      new Request("http://localhost:3100/api/operations/session", {
        headers: { host: "192.168.1.100:3100" },
      }),
    ),
    false,
  );
});
