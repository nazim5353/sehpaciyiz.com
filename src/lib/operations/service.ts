import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { getProducts } from "../store";
import { auditOperation, ownerOnly } from "./identity";
import type { OperationsDB, OperationsTransaction } from "./database";
import {
  recordInputSchema,
  paymentInputSchema,
  recordTotal,
  minor,
  dateInput,
} from "./validation";
import {
  salesChannels,
  todayInIstanbul,
  type Account,
  type Amendment,
  type AuditRow,
  type BusinessRecord,
  type CatalogCost,
  type Dashboard,
  type Operator,
  type OpsData,
  type OpsFilters,
  type Payment,
  type RecordInput,
  type RecordLine,
} from "./types";

type RawRecord = {
  id: string;
  number: string;
  kind: BusinessRecord["kind"];
  date: string;
  channel: BusinessRecord["channel"];
  party: string;
  category: string;
  description: string;
  documentNo: string;
  dueDate: string | null;
  amountMinor: string;
  lines: RecordLine[];
  status: "ACTIVE" | "CANCELED";
  createdBy: string;
  createdByName: string;
  version: number;
  createdAt: string;
  settledMinor: string;
  request_hash: string;
};
const recordSelect = `SELECT r.id, r.number::text, r.kind, r.business_date::text AS date, r.channel, r.party, r.category, r.description, r.document_no AS "documentNo", r.due_date::text AS "dueDate", r.amount_minor::text AS "amountMinor", r.lines, r.status, r.created_by AS "createdBy", u.name AS "createdByName", r.version, r.created_at::text AS "createdAt", r.request_hash,
COALESCE((SELECT SUM(CASE WHEN p.refund THEN -p.gross_minor ELSE p.gross_minor END) FROM ops_payments p WHERE p.record_id=r.id),0)::text AS "settledMinor" FROM ops_records r JOIN ops_users u ON u.id=r.created_by`;
const numberCode = (number: string) => `SHP-${number.padStart(6, "0")}`;
function asMinor(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isSafeInteger(amount))
    throw new Error("Tutar güvenli hesaplama sınırını aşıyor.");
  return amount;
}
function activeActor(actor: Operator) {
  if (!actor.active) throw new Error("Hesap etkin değil.");
}
function accessible(actor: Operator, row: RawRecord) {
  activeActor(actor);
  if (actor.role !== "OWNER" && row.createdBy !== actor.id)
    throw new Error("Bu kayda erişim yetkiniz yok.");
}
function recordDTO(row: RawRecord, actor: Operator): BusinessRecord {
  const amount = asMinor(row.amountMinor),
    settled = asMinor(row.settledMinor);
  const lines = row.lines.map((line) =>
    actor.role === "OWNER" ? line : { ...line, unitCostMinor: undefined },
  );
  return {
    ...row,
    request_hash: undefined,
    number: numberCode(row.number),
    amountMinor: amount,
    settledMinor: settled,
    remainingMinor: Math.max(0, amount - settled),
    lines,
  } as BusinessRecord;
}
async function recordRow(
  tx: OperationsTransaction | OperationsDB,
  id: string,
  actor: Operator,
  lock = false,
) {
  z.uuid().parse(id);
  const row = (
    await tx.query<RawRecord>(
      `${recordSelect} WHERE r.id=$1${lock ? " FOR UPDATE OF r" : ""}`,
      [id],
    )
  ).rows[0];
  if (!row) throw new Error("Kayıt bulunamadı.");
  accessible(actor, row);
  return row;
}
async function normalizedRecord(
  tx: OperationsTransaction,
  actor: Operator,
  input: unknown,
  previous?: RawRecord,
) {
  const parsed = recordInputSchema.parse(input) as RecordInput;
  if (previous && parsed.kind !== previous.kind)
    throw new Error("Kaydın işlem türü değiştirilemez.");
  const products = await getProducts();
  const costs = (
    await tx.query<{ product_ref: string; unit_cost_minor: string }>(
      "SELECT product_ref,unit_cost_minor::text FROM ops_product_costs",
    )
  ).rows;
  parsed.lines = parsed.lines.map((line, index) => {
    const product = line.productId
      ? products.find((p) => p.id === line.productId)
      : undefined;
    if (line.productId && !product)
      throw new Error("Katalog ürünü bulunamadı.");
    if (actor.role === "STAFF" && line.unitCostMinor != null)
      throw new Error(
        "Satış maliyetini yalnızca şirket sahibi belirleyebilir.",
      );
    const old = previous?.lines[index];
    const sameHistoricalLine =
      old &&
      old.productId === line.productId &&
      old.name === (product?.name ?? line.name);
    const cost =
      parsed.kind === "SALE"
        ? actor.role === "OWNER" && line.unitCostMinor != null
          ? line.unitCostMinor
          : sameHistoricalLine
            ? old.unitCostMinor
            : product
              ? costs.find((c) => c.product_ref === product.id)?.unit_cost_minor
              : null
        : null;
    return {
      ...line,
      ...(product
        ? { name: product.name, sku: product.sku, productId: product.id }
        : {}),
      unitCostMinor: cost == null ? null : asMinor(cost),
    };
  });
  return {
    ...parsed,
    channel: parsed.kind === "SALE" ? parsed.channel : null,
    amountMinor: recordTotal(parsed),
  };
}
const requestHash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function createBusinessRecord(
  db: OperationsDB,
  actor: Operator,
  input: unknown,
  requestId: string = randomUUID(),
) {
  activeActor(actor);
  z.uuid().parse(requestId);
  const parsed = recordInputSchema.parse(input),
    hash = requestHash(parsed);
  return db.transaction(async (tx) => {
    const existing = (
      await tx.query<RawRecord>(`${recordSelect} WHERE r.id=$1`, [requestId])
    ).rows[0];
    if (existing) {
      accessible(actor, existing);
      if (existing.createdBy !== actor.id || existing.request_hash !== hash)
        throw new Error("İşlem anahtarı başka bir kayıt için kullanılmış.");
      return recordDTO(existing, actor);
    }
    const data = await normalizedRecord(tx, actor, parsed);
    await tx.query(
      `INSERT INTO ops_records(id,request_hash,kind,business_date,channel,party,category,description,document_no,due_date,amount_minor,lines,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)`,
      [
        requestId,
        hash,
        data.kind,
        data.date,
        data.channel,
        data.party,
        data.category,
        data.description,
        data.documentNo,
        data.dueDate ?? null,
        data.amountMinor,
        JSON.stringify(data.lines),
        actor.id,
      ],
    );
    await auditOperation(
      tx,
      actor,
      "RECORD_CREATED",
      requestId,
      "Yeni şirket kaydı oluşturuldu.",
      null,
      data,
    );
    return recordDTO(await recordRow(tx, requestId, actor), actor);
  });
}
export async function addBusinessPayment(
  db: OperationsDB,
  actor: Operator,
  input: unknown,
  requestId: string = randomUUID(),
) {
  activeActor(actor);
  z.uuid().parse(requestId);
  const data = paymentInputSchema.parse(input),
    hash = requestHash(data);
  if (data.refund) ownerOnly(actor);
  return db.transaction(async (tx) => {
    const duplicate = (
      await tx.query<{ created_by: string; request_hash: string }>(
        "SELECT created_by,request_hash FROM ops_payments WHERE id=$1",
        [requestId],
      )
    ).rows[0];
    if (duplicate) {
      if (duplicate.created_by !== actor.id || duplicate.request_hash !== hash)
        throw new Error("İşlem anahtarı başka bir ödeme için kullanılmış.");
      return requestId;
    }
    const row = await recordRow(tx, data.recordId, actor, true);
    if (row.status !== "ACTIVE")
      throw new Error("İptal edilmiş kayda ödeme eklenemez.");
    const account = (
      await tx.query<{ opening_date: string }>(
        "SELECT opening_date::text FROM ops_accounts WHERE id=$1",
        [data.accountId],
      )
    ).rows[0];
    if (!account) throw new Error("Kasa / banka hesabı bulunamadı.");
    if (data.date < account.opening_date)
      throw new Error("Ödeme tarihi hesabın açılışından önce olamaz.");
    const settled = asMinor(row.settledMinor);
    if (
      data.refund
        ? data.grossMinor > settled
        : data.grossMinor > asMinor(row.amountMinor) - settled
    )
      throw new Error(
        data.refund
          ? "İade tutarı alınan / ödenen toplamı aşamaz."
          : "Ödeme tutarı kalan bakiyeyi aşamaz.",
      );
    if (row.kind !== "SALE" && (data.commissionMinor || data.shippingMinor))
      throw new Error(
        "Kesinti alanları yalnızca satış tahsilatlarında kullanılır.",
      );
    const net = data.grossMinor - data.commissionMinor - data.shippingMinor;
    await tx.query(
      "INSERT INTO ops_payments(id,request_hash,record_id,account_id,business_date,method,gross_minor,commission_minor,shipping_minor,net_minor,refund,description,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      [
        requestId,
        hash,
        data.recordId,
        data.accountId,
        data.date,
        data.method,
        data.grossMinor,
        data.commissionMinor,
        data.shippingMinor,
        net,
        data.refund,
        data.description,
        actor.id,
      ],
    );
    await auditOperation(
      tx,
      actor,
      data.refund ? "PAYMENT_REFUNDED" : "PAYMENT_CREATED",
      row.id,
      data.refund
        ? "İade hareketi kaydedildi."
        : "Tahsilat / ödeme kaydedildi.",
      null,
      { ...data, netMinor: net },
    );
    return requestId;
  });
}
async function applyRecordChange(
  tx: OperationsTransaction,
  actor: Operator,
  row: RawRecord,
  action: "EDIT" | "CANCEL",
  proposed: unknown,
  reason: string,
) {
  if (row.status !== "ACTIVE") throw new Error("Kayıt zaten iptal edilmiş.");
  if (action === "CANCEL") {
    if (asMinor(row.settledMinor) !== 0)
      throw new Error(
        "Ödeme bulunan kaydı iptal etmeden önce iade hareketini girin.",
      );
    await tx.query(
      "UPDATE ops_records SET status='CANCELED',version=version+1,updated_at=now() WHERE id=$1",
      [row.id],
    );
    await auditOperation(
      tx,
      actor,
      "RECORD_CANCELED",
      row.id,
      reason,
      row,
      null,
    );
    return;
  }
  const data = await normalizedRecord(tx, actor, proposed, row);
  if (data.amountMinor < asMinor(row.settledMinor))
    throw new Error("Toplam tutar mevcut tahsilat / ödemeden düşük olamaz.");
  await tx.query(
    "UPDATE ops_records SET business_date=$2,channel=$3,party=$4,category=$5,description=$6,document_no=$7,due_date=$8,amount_minor=$9,lines=$10::jsonb,version=version+1,updated_at=now() WHERE id=$1",
    [
      row.id,
      data.date,
      data.channel,
      data.party,
      data.category,
      data.description,
      data.documentNo,
      data.dueDate ?? null,
      data.amountMinor,
      JSON.stringify(data.lines),
    ],
  );
  await auditOperation(tx, actor, "RECORD_EDITED", row.id, reason, row, data);
}
export async function changeBusinessRecord(
  db: OperationsDB,
  actor: Operator,
  id: string,
  version: number,
  action: "EDIT" | "CANCEL",
  proposed: unknown,
  reason: string,
) {
  activeActor(actor);
  z.string().trim().min(5).max(500).parse(reason);
  return db.transaction(async (tx) => {
    const row = await recordRow(tx, id, actor, true);
    if (row.version !== version)
      throw new Error("Kayıt değişmiş. Sayfayı yenileyip tekrar deneyin.");
    if (actor.role === "OWNER") {
      await applyRecordChange(tx, actor, row, action, proposed, reason);
      return { approvalRequired: false };
    }
    const parsed = action === "EDIT" ? recordInputSchema.parse(proposed) : null;
    if (parsed?.kind && parsed.kind !== row.kind)
      throw new Error("Kaydın işlem türü değiştirilemez.");
    if (parsed?.lines.some((line) => line.unitCostMinor != null))
      throw new Error("Maliyet alanını değiştirme yetkiniz yok.");
    if (
      (
        await tx.query(
          "SELECT id FROM ops_amendments WHERE record_id=$1 AND status='PENDING'",
          [id],
        )
      ).rows.length
    )
      throw new Error("Bu kayıt için bekleyen bir düzeltme talebi var.");
    await tx.query(
      "INSERT INTO ops_amendments(id,record_id,requested_by,record_version,action,proposed,reason) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)",
      [
        randomUUID(),
        id,
        actor.id,
        version,
        action,
        parsed ? JSON.stringify(parsed) : null,
        reason,
      ],
    );
    await auditOperation(tx, actor, "AMENDMENT_REQUESTED", id, reason);
    return { approvalRequired: true };
  });
}
export async function decideAmendment(
  db: OperationsDB,
  actor: Operator,
  id: string,
  approve: boolean,
  note: string,
) {
  ownerOnly(actor);
  z.uuid().parse(id);
  z.string().max(500).parse(note);
  return db.transaction(async (tx) => {
    const request = (
      await tx.query<{
        record_id: string;
        record_version: number;
        action: "EDIT" | "CANCEL";
        proposed: unknown;
        reason: string;
        status: string;
      }>("SELECT * FROM ops_amendments WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (!request || request.status !== "PENDING")
      throw new Error("Talep bulunamadı veya daha önce sonuçlandırıldı.");
    if (approve) {
      const row = await recordRow(tx, request.record_id, actor, true);
      if (row.version !== request.record_version)
        throw new Error(
          "Kayıt talepten sonra değişmiş. Talebi reddedip güncel bir talep isteyin.",
        );
      await applyRecordChange(
        tx,
        actor,
        row,
        request.action,
        request.proposed,
        request.reason,
      );
    }
    await tx.query(
      "UPDATE ops_amendments SET status=$2,decided_by=$3,decision_note=$4,decided_at=now() WHERE id=$1",
      [id, approve ? "APPROVED" : "REJECTED", actor.id, note],
    );
    await auditOperation(
      tx,
      actor,
      approve ? "AMENDMENT_APPROVED" : "AMENDMENT_REJECTED",
      request.record_id,
      note || request.reason,
    );
  });
}
export async function setProductCost(
  db: OperationsDB,
  actor: Operator,
  productId: string,
  unitCostMinor: number,
) {
  ownerOnly(actor);
  minor.parse(unitCostMinor);
  if (!(await getProducts()).some((p) => p.id === productId))
    throw new Error("Ürün bulunamadı.");
  await db.transaction(async (tx) => {
    const before = (
      await tx.query(
        "SELECT unit_cost_minor::text FROM ops_product_costs WHERE product_ref=$1",
        [productId],
      )
    ).rows[0];
    await tx.query(
      "INSERT INTO ops_product_costs(product_ref,unit_cost_minor,updated_by) VALUES($1,$2,$3) ON CONFLICT(product_ref) DO UPDATE SET unit_cost_minor=$2,updated_by=$3,updated_at=now()",
      [productId, unitCostMinor, actor.id],
    );
    await auditOperation(
      tx,
      actor,
      "PRODUCT_COST",
      null,
      `${productId} ürününün güncel maliyeti değiştirildi. Eski satış maliyetleri korundu.`,
      before,
      { unitCostMinor },
    );
  });
}
export async function addAccount(
  db: OperationsDB,
  actor: Operator,
  input: unknown,
) {
  ownerOnly(actor);
  const data = z
    .object({
      name: z.string().trim().min(2).max(100),
      type: z.enum(["CASH", "BANK"]),
      openingMinor: z.number().int().min(-100_000_000_000).max(100_000_000_000),
      openingDate: dateInput,
    })
    .strict()
    .parse(input);
  if (data.openingDate > todayInIstanbul())
    throw new Error("Açılış tarihi gelecekte olamaz.");
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO ops_accounts(id,name,type,opening_minor,opening_date,created_by) VALUES($1,$2,$3,$4,$5,$6)",
      [
        randomUUID(),
        data.name,
        data.type,
        data.openingMinor,
        data.openingDate,
        actor.id,
      ],
    );
    await auditOperation(
      tx,
      actor,
      "ACCOUNT_CREATED",
      null,
      `${data.name} hesabı oluşturuldu.`,
    );
  });
}
export async function transferAccounts(
  db: OperationsDB,
  actor: Operator,
  input: unknown,
  requestId: string = randomUUID(),
) {
  ownerOnly(actor);
  z.uuid().parse(requestId);
  const data = z
    .object({
      sourceId: z.uuid(),
      targetId: z.uuid(),
      amountMinor: minor.min(1),
      date: dateInput,
      description: z.string().trim().max(500),
    })
    .strict()
    .parse(input);
  if (data.sourceId === data.targetId)
    throw new Error("Farklı iki hesap seçin.");
  if (data.date > todayInIstanbul())
    throw new Error("Transfer tarihi gelecekte olamaz.");
  await db.transaction(async (tx) => {
    const old = (
      await tx.query<{
        source_id: string;
        target_id: string;
        amount_minor: string;
        business_date: string;
      }>(
        "SELECT source_id,target_id,amount_minor::text,business_date::text FROM ops_transfers WHERE id=$1",
        [requestId],
      )
    ).rows[0];
    if (old) {
      if (
        old.source_id !== data.sourceId ||
        old.target_id !== data.targetId ||
        asMinor(old.amount_minor) !== data.amountMinor ||
        old.business_date !== data.date
      )
        throw new Error("İşlem anahtarı başka bir transfer için kullanılmış.");
      return;
    }
    const accounts = (
      await tx.query<{ opening_date: string }>(
        "SELECT opening_date::text FROM ops_accounts WHERE id IN ($1,$2)",
        [data.sourceId, data.targetId],
      )
    ).rows;
    if (
      accounts.length !== 2 ||
      accounts.some((a) => a.opening_date > data.date)
    )
      throw new Error("Hesapları ve açılış tarihlerini kontrol edin.");
    await tx.query(
      "INSERT INTO ops_transfers(id,source_id,target_id,amount_minor,business_date,description,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        requestId,
        data.sourceId,
        data.targetId,
        data.amountMinor,
        data.date,
        data.description,
        actor.id,
      ],
    );
    await auditOperation(
      tx,
      actor,
      "ACCOUNT_TRANSFER",
      null,
      "Hesaplar arası transfer kaydedildi; gelir veya gider toplamına eklenmedi.",
      null,
      data,
    );
  });
}

export async function getOperationsData(
  db: OperationsDB,
  actor: Operator,
  filters: OpsFilters,
  basis: "record" | "due" = "record",
): Promise<OpsData> {
  activeActor(actor);
  dateInput.parse(filters.from);
  dateInput.parse(filters.to);
  if (filters.from > filters.to)
    throw new Error("Başlangıç tarihi bitişten sonra olamaz.");
  const owner = actor.role === "OWNER";
  const args: unknown[] = [filters.from, filters.to];
  const dateColumn = basis === "due" ? "r.due_date" : "r.business_date";
  const conditions = [`${dateColumn}>=$1::date`, `${dateColumn}<=$2::date`];
  if (!owner) {
    args.push(actor.id);
    conditions.push(`r.created_by=$${args.length}`);
  }
  if (filters.channel) {
    args.push(filters.channel);
    conditions.push(`r.channel=$${args.length}`);
  }
  if (filters.kind) {
    args.push(filters.kind);
    conditions.push(`r.kind=$${args.length}`);
  }
  if (filters.search) {
    args.push(`%${filters.search.slice(0, 120)}%`);
    conditions.push(
      `(r.party ILIKE $${args.length} OR r.document_no ILIKE $${args.length} OR r.description ILIKE $${args.length} OR r.lines::text ILIKE $${args.length} OR r.number::text ILIKE $${args.length})`,
    );
  }
  const where = conditions.join(" AND "),
    baseArgs = args.slice();
  if (filters.cursor) {
    const decoded = Buffer.from(filters.cursor, "base64url")
      .toString()
      .split("|");
    dateInput.parse(decoded[0]);
    z.string()
      .regex(/^\d{1,18}$/)
      .parse(decoded[1]);
    args.push(decoded[0], decoded[1]);
    conditions.push(
      `(r.business_date,r.number)<($${args.length - 1}::date,$${args.length}::bigint)`,
    );
  }
  const raw = (
    await db.query<RawRecord>(
      `${recordSelect} WHERE ${conditions.join(" AND ")} ORDER BY r.business_date DESC,r.number DESC LIMIT 101`,
      args,
    )
  ).rows;
  const nextCursor =
    raw.length > 100
      ? Buffer.from(`${raw[99].date}|${raw[99].number}`).toString("base64url")
      : null;
  const records = raw.slice(0, 100).map((r) => recordDTO(r, actor));
  const paymentArgs: unknown[] = [filters.from, filters.to];
  const paymentConditions = [
    "p.business_date>=$1::date",
    "p.business_date<=$2::date",
  ];
  if (!owner) {
    paymentArgs.push(actor.id);
    paymentConditions.push("r.created_by=$" + paymentArgs.length);
  }
  if (filters.channel) {
    paymentArgs.push(filters.channel);
    paymentConditions.push("r.channel=$" + paymentArgs.length);
  }
  if (filters.kind) {
    paymentArgs.push(filters.kind);
    paymentConditions.push("r.kind=$" + paymentArgs.length);
  }
  if (filters.search) {
    paymentArgs.push("%" + filters.search.slice(0, 120) + "%");
    const n = paymentArgs.length;
    paymentConditions.push(
      "(r.party ILIKE $" +
        n +
        " OR r.document_no ILIKE $" +
        n +
        " OR r.description ILIKE $" +
        n +
        " OR r.lines::text ILIKE $" +
        n +
        " OR r.number::text ILIKE $" +
        n +
        ")",
    );
  }
  const paymentWhere = paymentConditions.join(" AND ");
  const paymentRaw = (
    await db.query<Record<string, unknown>>(
      `SELECT p.id,p.record_id AS "recordId",p.business_date::text AS date,p.account_id AS "accountId",p.method,p.gross_minor::text AS "grossMinor",p.commission_minor::text AS "commissionMinor",p.shipping_minor::text AS "shippingMinor",p.net_minor::text AS "netMinor",p.refund,p.description,p.created_by AS "createdBy",r.number::text AS "recordNumber",r.party,a.name AS "accountName",CASE WHEN ((r.kind='SALE')<>p.refund) THEN 'IN' ELSE 'OUT' END AS flow FROM ops_payments p JOIN ops_records r ON r.id=p.record_id JOIN ops_accounts a ON a.id=p.account_id WHERE ${paymentWhere} ORDER BY p.business_date DESC,p.created_at DESC LIMIT 300`,
      paymentArgs,
    )
  ).rows;
  const payments = paymentRaw.map((row) => ({
    ...row,
    recordNumber: numberCode(String(row.recordNumber)),
    grossMinor: asMinor(row.grossMinor),
    commissionMinor: asMinor(row.commissionMinor),
    shippingMinor: asMinor(row.shippingMinor),
    netMinor: asMinor(row.netMinor),
  })) as Payment[];
  const accountRows = (
    await db.query<{
      id: string;
      name: string;
      type: "CASH" | "BANK";
      opening_minor: string;
      opening_date: string;
    }>(
      "SELECT id,name,type,opening_minor::text,opening_date::text FROM ops_accounts ORDER BY name",
    )
  ).rows;
  const balanceRows = owner
    ? (
        await db.query<{ id: string; balance: string }>(
          `SELECT a.id,(CASE WHEN a.opening_date<=$1::date THEN a.opening_minor ELSE 0 END+COALESCE((SELECT SUM(CASE WHEN ((r.kind='SALE')<>p.refund) THEN p.net_minor ELSE -p.net_minor END) FROM ops_payments p JOIN ops_records r ON r.id=p.record_id WHERE p.account_id=a.id AND p.business_date<=$1::date),0)+COALESCE((SELECT SUM(t.amount_minor) FROM ops_transfers t WHERE t.target_id=a.id AND t.business_date<=$1::date),0)-COALESCE((SELECT SUM(t.amount_minor) FROM ops_transfers t WHERE t.source_id=a.id AND t.business_date<=$1::date),0))::text AS balance FROM ops_accounts a`,
          [filters.to],
        )
      ).rows
    : [];
  const accounts: Account[] = accountRows.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    openingDate: a.opening_date,
    openingMinor: owner ? asMinor(a.opening_minor) : 0,
    balanceMinor: owner
      ? asMinor(balanceRows.find((b) => b.id === a.id)?.balance)
      : 0,
  }));
  const amendmentRows = (
    await db.query<Record<string, unknown>>(
      `SELECT a.id,a.record_id AS "recordId",r.number::text AS "recordNumber",r.party,a.requested_by AS "requestedBy",u.name AS "requestedByName",a.reason,a.status,a.action,a.record_version AS version,a.proposed,a.created_at::text AS "createdAt",a.decision_note AS "decisionNote" FROM ops_amendments a JOIN ops_records r ON r.id=a.record_id JOIN ops_users u ON u.id=a.requested_by ${owner ? "" : "WHERE a.requested_by=$1"} ORDER BY (a.status='PENDING') DESC,a.created_at DESC LIMIT 100`,
      owner ? [] : [actor.id],
    )
  ).rows;
  const amendments = amendmentRows.map((a) => ({
    ...a,
    recordNumber: numberCode(String(a.recordNumber)),
    ...(!owner && a.proposed
      ? {
          proposed: {
            ...(a.proposed as RecordInput),
            lines: (a.proposed as RecordInput).lines.map(
              ({ unitCostMinor: _cost, ...line }) => line,
            ),
          },
        }
      : {}),
  })) as Amendment[];
  if (amendments.length) {
    const currentRecords = (
      await db.query<RawRecord>(`${recordSelect} WHERE r.id=ANY($1::uuid[])`, [
        amendments.map((a) => a.recordId),
      ])
    ).rows;
    for (const amendment of amendments) {
      const current = currentRecords.find((r) => r.id === amendment.recordId)!;
      accessible(actor, current);
      amendment.current = recordDTO(current, actor);
    }
  }
  const transfers = owner
    ? (
        await db.query<{
          id: string;
          date: string;
          sourceName: string;
          targetName: string;
          amountMinor: string;
          description: string;
          createdByName: string;
        }>(
          `SELECT t.id,t.business_date::text AS date,s.name AS "sourceName",d.name AS "targetName",t.amount_minor::text AS "amountMinor",t.description,u.name AS "createdByName" FROM ops_transfers t JOIN ops_accounts s ON s.id=t.source_id JOIN ops_accounts d ON d.id=t.target_id JOIN ops_users u ON u.id=t.created_by WHERE t.business_date>=$1::date AND t.business_date<=$2::date ORDER BY t.business_date DESC,t.id DESC LIMIT 300`,
          [filters.from, filters.to],
        )
      ).rows.map((t) => ({ ...t, amountMinor: asMinor(t.amountMinor) }))
    : [];
  const users = owner
    ? (
        await db.query<Operator>(
          "SELECT id,name,email,role,active FROM ops_users ORDER BY created_at",
        )
      ).rows
    : [actor];
  const audit = owner
    ? (
        await db.query<AuditRow>(
          `SELECT a.id,a.at::text,u.name AS "actorName",a.action,CASE WHEN r.number IS NULL THEN NULL ELSE 'SHP-'||lpad(r.number::text,6,'0') END AS "recordNumber",a.detail FROM ops_audit a JOIN ops_users u ON u.id=a.actor_id LEFT JOIN ops_records r ON r.id=a.record_id ORDER BY a.at DESC LIMIT 100`,
        )
      ).rows
    : [];
  const products = await getProducts();
  const costs = owner
    ? (
        await db.query<{ product_ref: string; unit_cost_minor: string }>(
          "SELECT product_ref,unit_cost_minor::text FROM ops_product_costs",
        )
      ).rows
    : [];
  const catalog: CatalogCost[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku ?? "",
    image: p.images[0],
    priceMinor: p.price,
    unitCostMinor:
      owner && costs.some((c) => c.product_ref === p.id)
        ? asMinor(costs.find((c) => c.product_ref === p.id)!.unit_cost_minor)
        : null,
  }));
  let dashboard: Dashboard | null = null;
  if (owner) {
    const all = (
      await db.query<RawRecord>(`${recordSelect} WHERE ${where}`, baseArgs)
    ).rows;
    const totals = all.filter((r) => r.status === "ACTIVE");
    const cash = (
      await db.query<{
        date: string;
        income: string;
        expense: string;
        deductions: string;
      }>(
        `SELECT p.business_date::text AS date,SUM(CASE WHEN ((r.kind='SALE')<>p.refund) THEN p.net_minor ELSE 0 END)::text AS income,SUM(CASE WHEN ((r.kind='SALE')<>p.refund) THEN 0 ELSE p.net_minor END)::text AS expense,SUM(p.commission_minor+p.shipping_minor)::text AS deductions FROM ops_payments p JOIN ops_records r ON r.id=p.record_id WHERE ${paymentWhere} GROUP BY p.business_date ORDER BY p.business_date`,
        paymentArgs,
      )
    ).rows;
    let margin = 0,
      missing = 0;
    for (const r of totals.filter((r) => r.kind === "SALE")) {
      if (r.lines.some((l) => l.unitCostMinor == null)) missing++;
      for (const l of r.lines)
        if (l.unitCostMinor != null)
          margin +=
            l.quantity * (l.unitPriceMinor - l.unitCostMinor) - l.discountMinor;
    }
    const channels = salesChannels.map((c) => ({
      ...c,
      totalMinor: totals
        .filter((r) => r.channel === c.id)
        .reduce((n, r) => n + asMinor(r.amountMinor), 0),
      count: totals.filter((r) => r.channel === c.id).length,
    }));
    const buckets = new Map<
      string,
      {
        date: string;
        incomeMinor: number;
        expenseMinor: number;
        salesMinor: number;
      }
    >();
    const bucketDate = (date: string) => {
      if (filters.group === "month") return date.slice(0, 7) + "-01";
      if (filters.group === "week") {
        const d = new Date(date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
        return d.toISOString().slice(0, 10);
      }
      return date;
    };
    const bucket = (date: string) => {
      const key = bucketDate(date);
      if (!buckets.has(key))
        buckets.set(key, {
          date: key,
          incomeMinor: 0,
          expenseMinor: 0,
          salesMinor: 0,
        });
      return buckets.get(key)!;
    };
    for (const row of cash) {
      const b = bucket(row.date);
      b.incomeMinor += asMinor(row.income);
      b.expenseMinor += asMinor(row.expense);
    }
    for (const row of totals.filter((r) => r.kind === "SALE"))
      bucket(row.date).salesMinor += asMinor(row.amountMinor);
    const sum = (key: "income" | "expense" | "deductions") =>
      cash.reduce((n, r) => n + asMinor(r[key]), 0);
    const sales = totals.filter((r) => r.kind === "SALE"),
      expenses = totals.filter((r) => r.kind !== "SALE");
    dashboard = {
      salesMinor: sales.reduce((n, r) => n + asMinor(r.amountMinor), 0),
      receiptsMinor: sales.reduce((n, r) => n + asMinor(r.settledMinor), 0),
      expenseMinor:
        expenses.reduce((n, r) => n + asMinor(r.amountMinor), 0) +
        sum("deductions"),
      cashInMinor: sum("income"),
      cashOutMinor: sum("expense"),
      cashNetMinor: sum("income") - sum("expense"),
      balanceMinor: accounts.reduce((n, a) => n + a.balanceMinor, 0),
      receivableMinor: sales.reduce(
        (n, r) =>
          n + Math.max(0, asMinor(r.amountMinor) - asMinor(r.settledMinor)),
        0,
      ),
      payableMinor: expenses.reduce(
        (n, r) =>
          n + Math.max(0, asMinor(r.amountMinor) - asMinor(r.settledMinor)),
        0,
      ),
      deductionsMinor: sum("deductions"),
      knownProductMarginMinor: margin,
      missingCostSales: missing,
      recordCount: all.length,
      pendingApprovals: Number(
        (
          await db.query<{ count: string }>(
            "SELECT count(*)::text AS count FROM ops_amendments WHERE status='PENDING'",
          )
        ).rows[0].count,
      ),
      channels,
      periods: [...buckets.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }
  return {
    transfers,
    user: actor,
    records,
    payments,
    accounts,
    amendments,
    users,
    audit,
    catalog,
    dashboard,
    filters,
    nextCursor,
  };
}
