import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  emptyState,
  ensureIdentity,
  type Identity,
  type CloudState,
} from "../cloud/company/model";
import { runCommand } from "../cloud/company/commands";
import { selectData, exportRecords } from "../cloud/company/selectors";
import {
  withCompany,
  loadState,
  commitState,
  type CloudDB,
} from "../cloud/company/persistence";
import {
  todayInIstanbul,
  type BusinessRecord,
  type CatalogCost,
  type RecordInput,
} from "../src/lib/operations/types";
const identity: Identity = {
  userId: "test-owner-subject",
  email: "owner@example.test",
  displayName: "Test Sahibi",
};
const catalog: CatalogCost[] = [
  {
    id: "test-product",
    sku: "QN-TEST",
    name: "Test ürün",
    image: "/test.png",
    priceMinor: 100000,
    unitCostMinor: null,
  },
];
const date = todayInIstanbul(),
  filters = { from: date, to: date };
const sale = (patch: Partial<RecordInput> = {}): RecordInput => ({
  kind: "SALE",
  date,
  channel: "WEB",
  party: "Test müşteri",
  category: "",
  description: "",
  documentNo: "",
  dueDate: date,
  lines: [
    {
      productId: catalog[0].id,
      name: catalog[0].name,
      quantity: 2,
      unitPriceMinor: 100000,
      discountMinor: 0,
    },
  ],
  ...patch,
});
test("cloud ledger keeps money, deductions, cost snapshots, idempotency and refunds consistent", async () => {
  const state = emptyState(),
    owner = ensureIdentity(state, identity).actor;
  await runCommand(state, owner, catalog, {
    action: "product_cost",
    productId: catalog[0].id,
    unitCostMinor: 40000,
  });
  const request = {
    action: "create_record",
    requestId: crypto.randomUUID(),
    record: sale(),
  };
  const record = (await runCommand(
    state,
    owner,
    catalog,
    request,
  )) as BusinessRecord;
  await runCommand(state, owner, catalog, request);
  assert.equal(state.records.length, 1);
  await assert.rejects(() =>
    runCommand(state, owner, catalog, {
      ...request,
      record: sale({ party: "Değişti" }),
    }),
  );
  const payment = {
    action: "payment",
    requestId: crypto.randomUUID(),
    payment: {
      recordId: record.id,
      date,
      accountId: state.accounts[0].id,
      method: "CARD",
      grossMinor: 100000,
      commissionMinor: 8000,
      shippingMinor: 2000,
      refund: false,
      description: "Test tahsilat",
    },
  };
  await runCommand(state, owner, catalog, payment);
  await runCommand(state, owner, catalog, payment);
  assert.equal(state.payments.length, 1);
  await assert.rejects(() =>
    runCommand(state, owner, catalog, {
      ...payment,
      requestId: crypto.randomUUID(),
      payment: { ...payment.payment, grossMinor: 100001 },
    }),
  );
  const expense = (await runCommand(state, owner, catalog, {
    action: "create_record",
    requestId: crypto.randomUUID(),
    record: sale({
      kind: "EXPENSE",
      channel: null,
      category: "Kira",
      amountMinor: 30000,
      lines: [],
    }),
  })) as BusinessRecord;
  await runCommand(state, owner, catalog, {
    ...payment,
    requestId: crypto.randomUUID(),
    payment: {
      ...payment.payment,
      recordId: expense.id,
      grossMinor: 30000,
      commissionMinor: 0,
      shippingMinor: 0,
    },
  });
  await runCommand(state, owner, catalog, {
    action: "account",
    account: {
      name: "Test banka",
      type: "BANK",
      openingMinor: 20000,
      openingDate: date,
    },
  });
  await runCommand(state, owner, catalog, {
    action: "transfer",
    requestId: crypto.randomUUID(),
    transfer: {
      sourceId: state.accounts[0].id,
      targetId: state.accounts[1].id,
      date,
      amountMinor: 10000,
      description: "Test aktarım",
    },
  });
  let data = selectData(state, owner, catalog, filters);
  assert.equal(data.dashboard!.cashInMinor, 90000);
  assert.equal(data.dashboard!.cashOutMinor, 30000);
  assert.equal(data.dashboard!.balanceMinor, 80000);
  assert.equal(data.dashboard!.knownProductMarginMinor, 120000);
  assert.equal(data.dashboard!.expenseMinor, 40000);
  assert.equal(data.dashboard!.receivableMinor, 100000);
  assert.equal(data.accounts[0].balanceMinor, 50000);
  assert.equal(data.accounts[1].balanceMinor, 30000);
  const onlyExpenses = selectData(state, owner, catalog, {
    ...filters,
    kind: "EXPENSE",
  });
  assert.equal(onlyExpenses.payments.length, 1);
  assert.equal(onlyExpenses.dashboard!.cashInMinor, 0);
  await runCommand(state, owner, catalog, {
    action: "product_cost",
    productId: catalog[0].id,
    unitCostMinor: 60000,
  });
  await runCommand(state, owner, catalog, {
    action: "edit_record",
    id: record.id,
    version: 1,
    record: sale({ description: "Not güncellendi" }),
    reason: "Not düzeltildi",
  });
  assert.equal(state.records[0].lines[0].unitCostMinor, 40000);
  const originalAudit = state.audit.find(
    (a) => a.action === "RECORD_CREATED" && a.recordNumber === record.number,
  )!;
  assert.equal((originalAudit.after as BusinessRecord).description, "");
  await assert.rejects(() =>
    runCommand(state, owner, catalog, {
      action: "cancel_record",
      id: record.id,
      version: 2,
      reason: "İptal talebi",
    }),
  );
  await runCommand(state, owner, catalog, {
    ...payment,
    requestId: crypto.randomUUID(),
    payment: {
      ...payment.payment,
      commissionMinor: 0,
      shippingMinor: 0,
      refund: true,
    },
  });
  await runCommand(state, owner, catalog, {
    action: "cancel_record",
    id: record.id,
    version: 2,
    reason: "Test iptal edildi",
  });
  data = selectData(state, owner, catalog, filters);
  assert.equal(data.dashboard!.salesMinor, 0);
  assert.equal(data.dashboard!.cashNetMinor, -40000);
});
test("cloud staff identity, scope and approval versions remain server controlled", async () => {
  const state = emptyState(),
    owner = ensureIdentity(state, identity).actor;
  assert.throws(() =>
    ensureIdentity(state, {
      userId: "intruder",
      email: "unknown@example.test",
      displayName: "Test",
    }),
  );
  await runCommand(state, owner, catalog, {
    action: "staff",
    user: { name: "Test Personel", email: "staff@example.test" },
  });
  const staffIdentity = {
      userId: "staff-subject",
      email: "staff@example.test",
      displayName: "Test Personel",
    },
    staff = ensureIdentity(state, staffIdentity).actor;
  await runCommand(state, owner, catalog, {
    action: "create_record",
    requestId: crypto.randomUUID(),
    record: sale({
      lines: [
        {
          name: "Özel ürün",
          quantity: 1,
          unitPriceMinor: 100000,
          discountMinor: 0,
          unitCostMinor: 33333,
        },
      ],
    }),
  });
  const own = (await runCommand(state, staff, catalog, {
    action: "create_record",
    requestId: crypto.randomUUID(),
    record: sale(),
  })) as BusinessRecord;
  let data = selectData(state, staff, catalog, filters);
  assert.equal(data.records.length, 1);
  assert.equal(data.dashboard, null);
  assert.equal(data.users.length, 1);
  assert.equal(data.audit.length, 0);
  assert.equal(data.records[0].lines[0].unitCostMinor, undefined);
  assert.ok(data.catalog.every((p) => p.unitCostMinor === null));
  assert.throws(() => exportRecords(state, staff, filters));
  assert.equal(
    selectData(state, staff, catalog, { ...filters, search: "33333" }).records
      .length,
    0,
  );
  await assert.rejects(() =>
    runCommand(state, staff, catalog, {
      action: "product_cost",
      productId: catalog[0].id,
      unitCostMinor: 1,
    }),
  );
  await assert.rejects(() =>
    runCommand(state, staff, catalog, {
      action: "cancel_record",
      id: state.records[0].id,
      version: 1,
      reason: "Erişim testi",
    }),
  );
  const edit = {
    action: "edit_record",
    id: own.id,
    version: 1,
    record: sale({ description: "Düzeltilmiş not" }),
    reason: "Not düzeltildi",
  };
  await runCommand(state, staff, catalog, edit);
  assert.equal(state.records[1].description, "");
  await assert.rejects(() =>
    runCommand(state, staff, catalog, {
      action: "amendment",
      id: state.amendments[0].id,
      approve: true,
      note: "",
    }),
  );
  await runCommand(state, owner, catalog, {
    action: "amendment",
    id: state.amendments[0].id,
    approve: true,
    note: "Kontrol edildi",
  });
  assert.equal(state.records[1].description, "Düzeltilmiş not");
  await runCommand(state, staff, catalog, { ...edit, version: 2 });
  await runCommand(state, owner, catalog, { ...edit, version: 2 });
  await assert.rejects(() =>
    runCommand(state, owner, catalog, {
      action: "amendment",
      id: state.amendments[1].id,
      approve: true,
      note: "",
    }),
  );
  data = selectData(state, staff, catalog, filters);
  assert.equal(data.amendments[1].current.lines[0].unitCostMinor, undefined);
  await runCommand(state, owner, catalog, {
    action: "staff_active",
    id: staff.id,
    active: false,
  });
  assert.throws(() => ensureIdentity(state, staffIdentity));
  assert.equal(JSON.stringify(state).includes('"password"'), false);
});
class SQLiteD1 {
  constructor(public db: DatabaseSync) {}
  prepare(sql: string) {
    const statement = {
      sql,
      values: [] as unknown[],
      bind(...values: unknown[]) {
        return { ...statement, values };
      },
    };
    return statement;
  }
  async batch<T>(statements: { sql: string; values: unknown[] }[]) {
    this.db.exec("BEGIN");
    try {
      const results = statements.map((s) => ({
        success: true,
        results: this.db.prepare(s.sql).all(...(s.values as any[])) as T[],
      }));
      this.db.exec("COMMIT");
      return results;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
}
test("cloud persistence survives reopening and atomically retries concurrent sales without losing entries", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sehpa-cloud-ledger-"));
  const file = path.join(dir, "ledger.sqlite");
  let sqlite = new DatabaseSync(file);
  const migration = await readFile(
    new URL(
      "../cloud/company/drizzle/0000_nostalgic_rachel_grey.sql",
      import.meta.url,
    ),
    "utf8",
  );
  sqlite.exec(migration);
  let db = new SQLiteD1(sqlite) as unknown as CloudDB;
  try {
    await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        withCompany(
          db,
          identity,
          (state, actor) =>
            runCommand(state, actor, catalog, {
              action: "create_record",
              requestId: crypto.randomUUID(),
              record: sale({ party: `Test ${i}` }),
            }),
          true,
        ),
      ),
    );
    let loaded = await loadState(db);
    assert.equal(loaded.state.records.length, 4);
    assert.equal(new Set(loaded.state.records.map((r) => r.number)).size, 4);
    assert.equal(loaded.state.users.length, 1);
    const old = structuredClone(loaded.state),
      changed = structuredClone(old);
    changed.records[0].description = "Yeni not";
    await commitState(db, loaded.revision, old, changed);
    const wrong = structuredClone(old);
    wrong.records[1].description = "Çakışan not";
    await assert.rejects(() => commitState(db, loaded.revision, old, wrong));
    loaded = await loadState(db);
    assert.equal(loaded.state.records[0].description, "Yeni not");
    assert.equal(loaded.state.records[1].description, "");
    const mutated = structuredClone(loaded.state);
    mutated.audit[0].detail = "Geçmişi değiştir";
    await assert.rejects(() =>
      commitState(db, loaded.revision, loaded.state, mutated),
    );
    sqlite.close();
    sqlite = new DatabaseSync(file);
    db = new SQLiteD1(sqlite) as unknown as CloudDB;
    loaded = await loadState(db);
    assert.equal(loaded.state.records.length, 4);
    assert.equal(loaded.state.nextNumber, 5);
    const owner = ensureIdentity(loaded.state, identity).actor;
    for (let i = 0; i < 102; i++)
      await runCommand(loaded.state, owner, catalog, {
        action: "create_record",
        requestId: crypto.randomUUID(),
        record: sale(),
      });
    const first = selectData(loaded.state, owner, catalog, filters),
      next = selectData(loaded.state, owner, catalog, {
        ...filters,
        cursor: first.nextCursor!,
      });
    assert.equal(first.records.length, 100);
    assert.equal(next.records.length, 6);
    assert.equal(exportRecords(loaded.state, owner, filters).length, 106);
    assert.equal(next.dashboard!.salesMinor, 106 * 200000);
  } finally {
    sqlite.close();
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith("sehpa-cloud-ledger-"));
    await rm(dir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 150,
    });
  }
});
