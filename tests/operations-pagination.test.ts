import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openOperationsDB } from "../src/lib/operations/database";
import { bootstrapOwner } from "../src/lib/operations/identity";
import {
  getOperationsData,
  createBusinessRecord,
  changeBusinessRecord,
  setProductCost,
} from "../src/lib/operations/service";
import { todayInIstanbul, type RecordInput } from "../src/lib/operations/types";
import catalog from "../src/data/catalog.json";
process.env.LOCAL_PREVIEW = "true";
test("keyset pages preserve ordering, totals include every page, and due dates use their own period", async () => {
  const db = await openOperationsDB();
  try {
    const owner = await bootstrapOwner(db, {
      name: "Test Sahip",
      email: "pages@example.test",
      password: "pages-test-only-381!",
    });
    const date = todayInIstanbul(),
      filters = { from: date, to: date };
    await db.query(
      `INSERT INTO ops_records(id,request_hash,kind,business_date,channel,party,amount_minor,lines,created_by,due_date) SELECT gen_random_uuid(),'test','SALE',$1::date,'WEB','Sayfa test',100,'[{"name":"Test","quantity":1,"unitPriceMinor":100,"discountMinor":0}]'::jsonb,$2::uuid,$1::date+1 FROM generate_series(1,105)`,
      [date, owner.id],
    );
    const first = await getOperationsData(db, owner, filters);
    assert.equal(first.records.length, 100);
    assert.equal(first.records[0].number, "SHP-000105");
    assert.equal(first.dashboard!.salesMinor, 10500);
    assert.ok(first.nextCursor);
    const next = await getOperationsData(db, owner, {
      ...filters,
      cursor: first.nextCursor!,
    });
    assert.equal(next.records.length, 5);
    assert.equal(next.nextCursor, null);
    assert.equal(next.records[0].number, "SHP-000005");
    assert.equal(
      new Set([...first.records, ...next.records].map((r) => r.id)).size,
      105,
    );
    assert.equal(next.dashboard!.salesMinor, 10500);
    assert.equal(
      (await getOperationsData(db, owner, filters, "due")).records.length,
      0,
    );
    const product = catalog[0];
    const input: RecordInput = {
      kind: "SALE",
      channel: "WEB",
      date,
      party: "Eksik maliyet",
      category: "",
      description: "",
      documentNo: "",
      lines: [
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPriceMinor: 10000,
          discountMinor: 0,
        },
      ],
    };
    const r = await createBusinessRecord(db, owner, input, randomUUID());
    assert.equal(r.lines[0].unitCostMinor, null);
    await setProductCost(db, owner, product.id, 5000);
    await changeBusinessRecord(
      db,
      owner,
      r.id,
      1,
      "EDIT",
      { ...input, description: "Yeni not" },
      "Yalnızca not değişti",
    );
    assert.equal(
      (await getOperationsData(db, owner, filters)).records.find(
        (x) => x.id === r.id,
      )!.lines[0].unitCostMinor,
      null,
    );
  } finally {
    await db.close();
  }
});
