import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { openOperationsDB } from "../src/lib/operations/database";
import {
  bootstrapOwner,
  addStaff,
  authenticateOperator,
  startOperatorSession,
  sessionOperator,
  setStaffActive,
  changeOperatorPassword,
} from "../src/lib/operations/identity";
import {
  createBusinessRecord,
  addBusinessPayment,
  getOperationsData,
  setProductCost,
  changeBusinessRecord,
  decideAmendment,
  addAccount,
  transferAccounts,
} from "../src/lib/operations/service";
import {
  parseMoneyInput,
  todayInIstanbul,
  type RecordInput,
} from "../src/lib/operations/types";
import catalog from "../src/data/catalog.json";
process.env.LOCAL_PREVIEW = "true";
const date = todayInIstanbul(),
  filters = { from: date, to: date };
const input = (patch: Partial<RecordInput> = {}): RecordInput => ({
  kind: "SALE",
  date,
  channel: "WEB",
  party: "Test müşteri",
  category: "",
  description: "Test kaydı",
  documentNo: "",
  dueDate: date,
  lines: [
    {
      name: "Test ürün",
      quantity: 2,
      unitPriceMinor: 100000,
      discountMinor: 0,
    },
  ],
  ...patch,
});
const ownerInput = {
  name: "Test şirket sahibi",
  email: "owner@example.test",
  password: "only-for-test-7829!",
};
test("Turkish decimal inputs retain kuruş and reject invalid or excessive values", () => {
  assert.equal(parseMoneyInput("1.250,56"), 125056);
  assert.equal(parseMoneyInput("1.250"), 125000);
  assert.equal(parseMoneyInput("250.55"), 25055);
  assert.equal(parseMoneyInput("0,01"), 1);
  assert.throws(() => parseMoneyInput("12,345"));
  assert.throws(() => parseMoneyInput("1e6"));
  assert.throws(() => parseMoneyInput("-10"));
  assert.throws(() => parseMoneyInput("99999999999999"));
});
test("company ledger persists on Windows, creates one owner, and keeps passwords hashed", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sehpa-operations-"));
  let db = await openOperationsDB(dir);
  try {
    await bootstrapOwner(db, ownerInput);
    await assert.rejects(() => bootstrapOwner(db, ownerInput));
    const row = (
      await db.query<{ password_hash: string }>(
        "SELECT password_hash FROM ops_users",
      )
    ).rows[0];
    assert.ok(row.password_hash.startsWith("scrypt:"));
    assert.ok(!row.password_hash.includes(ownerInput.password));
    await db.close();
    db = await openOperationsDB(dir);
    assert.equal(
      (await authenticateOperator(db, ownerInput.email, ownerInput.password))
        .role,
      "OWNER",
    );
  } finally {
    await db.close();
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("sehpa-operations-"));
    await rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 150,
    });
  }
});
test("ledger math, idempotency, fees, transfers, cost snapshots and refunds are consistent", async () => {
  const db = await openOperationsDB();
  try {
    const owner = await bootstrapOwner(db, ownerInput);
    const product = catalog[0];
    await setProductCost(db, owner, product.id, 40000);
    const saleInput = input({
      lines: [
        {
          productId: product.id,
          name: product.name,
          quantity: 2,
          unitPriceMinor: 100000,
          discountMinor: 0,
        },
      ],
    });
    const id = randomUUID();
    const sale = await createBusinessRecord(db, owner, saleInput, id);
    assert.equal(
      (await createBusinessRecord(db, owner, saleInput, id)).id,
      sale.id,
    );
    await assert.rejects(() =>
      createBusinessRecord(db, owner, input({ party: "changed" }), id),
    );
    let data = await getOperationsData(db, owner, filters);
    const cash = data.accounts[0];
    const pay = {
      recordId: sale.id,
      date,
      accountId: cash.id,
      method: "CARD",
      grossMinor: 100000,
      commissionMinor: 8000,
      shippingMinor: 2000,
      refund: false,
      description: "Test tahsilat",
    };
    const paymentId = randomUUID();
    await addBusinessPayment(db, owner, pay, paymentId);
    await addBusinessPayment(db, owner, pay, paymentId);
    await assert.rejects(() =>
      addBusinessPayment(db, owner, { ...pay, grossMinor: 100001 }, paymentId),
    );
    await assert.rejects(() =>
      addBusinessPayment(db, owner, { ...pay, grossMinor: 150000 }),
    );
    const expense = await createBusinessRecord(
      db,
      owner,
      input({
        kind: "EXPENSE",
        channel: null,
        category: "Kira",
        amountMinor: 30000,
        lines: [],
      }),
    );
    await addBusinessPayment(db, owner, {
      ...pay,
      recordId: expense.id,
      grossMinor: 30000,
      commissionMinor: 0,
      shippingMinor: 0,
    });
    await addAccount(db, owner, {
      name: "Test banka",
      type: "BANK",
      openingMinor: 20000,
      openingDate: date,
    });
    data = await getOperationsData(db, owner, filters);
    const bank = data.accounts.find((a) => a.type === "BANK")!;
    await transferAccounts(db, owner, {
      sourceId: cash.id,
      targetId: bank.id,
      amountMinor: 10000,
      date,
      description: "Test transfer",
    });
    data = await getOperationsData(db, owner, filters);
    assert.equal(data.dashboard!.cashInMinor, 90000);
    assert.equal(data.dashboard!.cashOutMinor, 30000);
    assert.equal(data.dashboard!.cashNetMinor, 60000);
    assert.equal(data.dashboard!.balanceMinor, 80000);
    assert.equal(data.dashboard!.receivableMinor, 100000);
    assert.equal(data.dashboard!.deductionsMinor, 10000);
    assert.equal(data.dashboard!.knownProductMarginMinor, 120000);
    assert.equal(data.dashboard!.expenseMinor, 40000);
    assert.equal(
      data.accounts.find((a) => a.id === cash.id)!.balanceMinor,
      50000,
    );
    assert.equal(
      data.accounts.find((a) => a.id === bank.id)!.balanceMinor,
      30000,
    );
    const filtered = await getOperationsData(db, owner, {
      ...filters,
      kind: "EXPENSE",
    });
    assert.equal(filtered.payments.length, 1);
    assert.equal(filtered.dashboard!.cashInMinor, 0);
    assert.equal(filtered.dashboard!.cashOutMinor, 30000);
    await setProductCost(db, owner, product.id, 60000);
    assert.equal(
      (await getOperationsData(db, owner, filters)).records.find(
        (r) => r.id === sale.id,
      )!.lines[0].unitCostMinor,
      40000,
    );
    await changeBusinessRecord(
      db,
      owner,
      sale.id,
      1,
      "EDIT",
      saleInput,
      "Açıklama düzeltildi",
    );
    data = await getOperationsData(db, owner, filters);
    assert.equal(
      data.records.find((r) => r.id === sale.id)!.lines[0].unitCostMinor,
      40000,
    );
    await assert.rejects(() =>
      changeBusinessRecord(
        db,
        owner,
        sale.id,
        2,
        "CANCEL",
        null,
        "İptal talebi",
      ),
    );
    await addBusinessPayment(db, owner, {
      ...pay,
      grossMinor: 100000,
      commissionMinor: 0,
      shippingMinor: 0,
      refund: true,
    });
    await changeBusinessRecord(
      db,
      owner,
      sale.id,
      2,
      "CANCEL",
      null,
      "Test iptal edildi",
    );
    data = await getOperationsData(db, owner, filters);
    assert.equal(data.dashboard!.salesMinor, 0);
    assert.equal(data.dashboard!.cashNetMinor, -40000);
    assert.equal(
      data.records.find((r) => r.id === sale.id)!.status,
      "CANCELED",
    );
    await assert.rejects(() =>
      db.query("UPDATE ops_audit SET detail='tamper'"),
    );
    await assert.rejects(() => db.query("DELETE FROM ops_payments"));
    await assert.rejects(() =>
      db.query("UPDATE ops_payments SET gross_minor=1"),
    );
  } finally {
    await db.close();
  }
});
test("staff scope, owner approvals, stale changes and session revocation enforce permissions", async () => {
  const db = await openOperationsDB();
  try {
    const owner = await bootstrapOwner(db, ownerInput);
    await addStaff(db, owner, {
      name: "Test personel",
      email: "staff@example.test",
      password: "test-personnel-128!",
    });
    const staff = await authenticateOperator(
      db,
      "staff@example.test",
      "test-personnel-128!",
    );
    const token = await startOperatorSession(db, staff);
    assert.equal((await sessionOperator(db, token))!.id, staff.id);
    const secret = await createBusinessRecord(
      db,
      owner,
      input({
        lines: [
          {
            name: "Özel maliyet",
            quantity: 1,
            unitPriceMinor: 20000,
            discountMinor: 0,
            unitCostMinor: 5000,
          },
        ],
      }),
    );
    const own = await createBusinessRecord(
      db,
      staff,
      input({
        lines: [
          {
            name: "Personel ürünü",
            quantity: 1,
            unitPriceMinor: 50000,
            discountMinor: 0,
          },
        ],
      }),
    );
    let scoped = await getOperationsData(db, staff, filters);
    assert.equal(scoped.dashboard, null);
    assert.equal(scoped.audit.length, 0);
    assert.equal(scoped.users.length, 1);
    assert.equal(scoped.records.length, 1);
    assert.equal(scoped.records[0].id, own.id);
    assert.ok(scoped.catalog.every((p) => p.unitCostMinor === null));
    assert.ok(
      scoped.records[0].lines.every((l) => l.unitCostMinor === undefined),
    );
    assert.ok(
      scoped.accounts.every(
        (a) => a.balanceMinor === 0 && a.openingMinor === 0,
      ),
    );
    await assert.rejects(() => setProductCost(db, staff, catalog[0].id, 1));
    await assert.rejects(() => addStaff(db, staff, ownerInput));
    await assert.rejects(() =>
      changeBusinessRecord(
        db,
        staff,
        secret.id,
        1,
        "CANCEL",
        null,
        "Test erişim",
      ),
    );
    await assert.rejects(() =>
      createBusinessRecord(
        db,
        staff,
        input({
          lines: [
            {
              name: "Hile",
              quantity: 1,
              unitPriceMinor: 100,
              discountMinor: 0,
              unitCostMinor: 0,
            },
          ],
        }),
      ),
    );
    const changed = input({
      lines: [
        {
          name: "Personel ürünü",
          quantity: 1,
          unitPriceMinor: 60000,
          discountMinor: 0,
        },
      ],
    });
    await changeBusinessRecord(
      db,
      staff,
      own.id,
      1,
      "EDIT",
      changed,
      "Yanlış tutar düzeltmesi",
    );
    scoped = await getOperationsData(db, staff, filters);
    assert.equal(scoped.records[0].amountMinor, 50000);
    await assert.rejects(() =>
      decideAmendment(db, staff, scoped.amendments[0].id, true, ""),
    );
    await decideAmendment(
      db,
      owner,
      scoped.amendments[0].id,
      true,
      "Kontrol edildi",
    );
    assert.equal(
      (await getOperationsData(db, staff, filters)).records[0].amountMinor,
      60000,
    );
    await changeBusinessRecord(
      db,
      staff,
      own.id,
      2,
      "EDIT",
      changed,
      "İkinci değişiklik talebi",
    );
    const pending = (
      await getOperationsData(db, owner, filters)
    ).amendments.find((a) => a.status === "PENDING")!;
    await changeBusinessRecord(
      db,
      owner,
      own.id,
      2,
      "EDIT",
      changed,
      "Sahip güncellemesi",
    );
    await assert.rejects(() =>
      decideAmendment(db, owner, pending.id, true, ""),
    );
    await decideAmendment(db, owner, pending.id, false, "Kayıt güncellendi");
    await changeOperatorPassword(db, owner, {
      targetId: staff.id,
      newPassword: "updated-personnel-138!",
    });
    assert.equal(await sessionOperator(db, token), null);
    await assert.rejects(() =>
      authenticateOperator(db, staff.email, "test-personnel-128!"),
    );
    const active = await authenticateOperator(
      db,
      staff.email,
      "updated-personnel-138!",
    );
    const token2 = await startOperatorSession(db, active);
    await setStaffActive(db, owner, staff.id, false);
    assert.equal(await sessionOperator(db, token2), null);
    await assert.rejects(() =>
      authenticateOperator(db, staff.email, "updated-personnel-138!"),
    );
    await assert.rejects(() => setStaffActive(db, owner, owner.id, false));
  } finally {
    await db.close();
  }
});
