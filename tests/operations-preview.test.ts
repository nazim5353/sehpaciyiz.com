import { test } from "node:test";
import assert from "node:assert/strict";
import { openOperationsDB } from "../src/lib/operations/database";
import { companyPreviewAllowed } from "../src/lib/operations/preview-access";
import {
  localPreviewOperator,
  bootstrapOwner,
  hasCompanyOwner,
  authenticateOperator,
} from "../src/lib/operations/identity";
import {
  createBusinessRecord,
  getOperationsData,
} from "../src/lib/operations/service";
import { todayInIstanbul } from "../src/lib/operations/types";

test("login-free preview requires explicit local flags and the actual local Host", () => {
  const config = {
    NODE_ENV: "development",
    LOCAL_PREVIEW: "true",
    COMPANY_PANEL_PREVIEW: "true",
  };
  assert.equal(companyPreviewAllowed("127.0.0.1:3100", config, []), true);
  assert.equal(companyPreviewAllowed("localhost:3100", config, []), true);
  assert.equal(companyPreviewAllowed("[::1]:3100", config, []), true);
  assert.equal(
    companyPreviewAllowed("192.168.1.137:3100", config, ["192.168.1.137"]),
    true,
  );
  assert.equal(companyPreviewAllowed("example.com:3100", config, []), false);
  assert.equal(
    companyPreviewAllowed("192.168.1.200:3100", config, ["192.168.1.137"]),
    false,
  );
  assert.equal(companyPreviewAllowed(null, config, []), false);
  assert.equal(companyPreviewAllowed("127.0.0.1:3100/path", config, []), false);
  assert.equal(
    companyPreviewAllowed(
      "127.0.0.1:3100",
      { ...config, NODE_ENV: "production" },
      [],
    ),
    false,
  );
  assert.equal(
    companyPreviewAllowed(
      "127.0.0.1:3100",
      { ...config, COMPANY_PANEL_PREVIEW: "false" },
      [],
    ),
    false,
  );
  assert.equal(
    companyPreviewAllowed(
      "127.0.0.1:3100",
      { ...config, LOCAL_PREVIEW: "false" },
      [],
    ),
    false,
  );
});
test("local preview preserves ledger data when the personal owner account is later configured", async () => {
  process.env.LOCAL_PREVIEW = "true";
  const db = await openOperationsDB();
  try {
    const preview = await localPreviewOperator(db);
    assert.equal(preview.preview, true);
    assert.equal(preview.role, "OWNER");
    assert.equal((await localPreviewOperator(db)).id, preview.id);
    assert.equal(await hasCompanyOwner(db), false);
    await assert.rejects(() =>
      authenticateOperator(db, preview.email, "disabled:local-preview"),
    );
    const date = todayInIstanbul();
    const expense = await createBusinessRecord(db, preview, {
      kind: "EXPENSE",
      date,
      channel: null,
      party: "Test gider",
      category: "Kira",
      description: "",
      documentNo: "",
      amountMinor: 10000,
      lines: [],
    });
    const owner = await bootstrapOwner(db, {
      name: "Test Sahibi",
      email: "personal-owner@example.test",
      password: "only-for-preview-test-128!",
    });
    assert.equal(owner.id, preview.id);
    assert.equal(await hasCompanyOwner(db), true);
    assert.equal(
      (
        await authenticateOperator(
          db,
          owner.email,
          "only-for-preview-test-128!",
        )
      ).id,
      owner.id,
    );
    const data = await getOperationsData(db, owner, { from: date, to: date });
    assert.equal(data.records[0].id, expense.id);
    assert.equal(data.records[0].createdByName, "Test Sahibi");
    assert.equal(data.accounts.length, 1);
    const again = await localPreviewOperator(db);
    assert.equal(again.id, owner.id);
    assert.equal(again.preview, true);
    assert.equal((await db.query("SELECT id FROM ops_users")).rows.length, 1);
  } finally {
    await db.close();
  }
});
