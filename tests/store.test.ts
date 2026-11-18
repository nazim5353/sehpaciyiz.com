import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { SECRET_MASK } from "../src/lib/settings";
test("local writes persist, concurrent writes serialize, and secrets are masked", async () => {
  const original = process.cwd();
  const folder = await mkdtemp(path.join(os.tmpdir(), "sehpa-test-"));
  process.chdir(folder);
  process.env.LOCAL_PREVIEW = "true";
  process.env.SETTINGS_ENCRYPTION_KEY = "c".repeat(64);
  try {
    const { readStore, updateStore, maskSettings, mergeSettings } =
      await import("../src/lib/store");
    await Promise.all([
      updateStore(
        (store) => {
          store.settings.genel.storeName = "Test mağaza";
        },
        "Test",
        "general",
      ),
      updateStore(
        (store) =>
          mergeSettings(store, "smtp", { password: "test-only-secret" }),
        "Test",
        "smtp",
      ),
    ]);
    const store = await readStore();
    assert.equal(store.settings.genel.storeName, "Test mağaza");
    assert.equal(store.audit.length, 2);
    assert.equal(maskSettings(store.settings).smtp.password, SECRET_MASK);
    assert.ok(
      !(
        await readFile(path.join(folder, ".local/store.json"), "utf8")
      ).includes("test-only-secret"),
    );
    const before = store.settings.smtp.password;
    await updateStore(
      (s) => mergeSettings(s, "smtp", { password: SECRET_MASK }),
      "Test",
      "smtp",
    );
    assert.equal((await readStore()).settings.smtp.password, before);
    await updateStore(
      (s) => mergeSettings(s, "smtp", { password: "" }),
      "Test",
      "smtp",
    );
    assert.equal((await readStore()).settings.smtp.password, before);
  } finally {
    process.chdir(original);
    assert.equal(path.dirname(path.resolve(folder)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(folder).startsWith("sehpa-test-"));
    await rm(folder, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 150,
    });
  }
});
