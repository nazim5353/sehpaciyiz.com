import { z } from "zod";
import {
  minor,
  dateInput,
  paymentInputSchema,
  recordInputSchema,
} from "../../src/lib/operations/validation";
import {
  todayInIstanbul,
  type BusinessRecord,
  type CatalogCost,
  type Operator,
} from "../../src/lib/operations/types";
import {
  accessible,
  audit,
  fingerprint,
  normalizeRecord,
  ownerOnly,
  recordDTO,
  settlement,
  type CloudState,
} from "./model";
const reasonInput = z.string().trim().min(5).max(500);
function applyChange(
  state: CloudState,
  actor: Operator,
  catalog: CatalogCost[],
  row: BusinessRecord,
  action: "EDIT" | "CANCEL",
  proposed: unknown,
  reason: string,
) {
  if (row.status !== "ACTIVE")
    throw new Error("İptal edilmiş kayıt değiştirilemez.");
  const before = structuredClone(row),
    paid = settlement(state, row);
  if (action === "CANCEL") {
    if (paid !== 0) throw new Error("Önce iade hareketi girin.");
    row.status = "CANCELED";
    row.version++;
    audit(state, actor, "RECORD_CANCELED", row, reason, before, row);
    return;
  }
  const data = normalizeRecord(state, actor, catalog, proposed, row);
  if (data.amountMinor < paid)
    throw new Error("Yeni tutar mevcut tahsil / ödeme toplamından az olamaz.");
  Object.assign(row, data, { version: row.version + 1 });
  audit(state, actor, "RECORD_EDITED", row, reason, before, row);
}
export async function runCommand(
  state: CloudState,
  actor: Operator,
  catalog: CatalogCost[],
  body: Record<string, any>,
): Promise<unknown> {
  if (!actor.active) throw new Error("Hesap etkin değil.");
  let requestId: string | undefined, hash: string | undefined;
  if (["create_record", "payment", "transfer"].includes(body.action)) {
    requestId = z.uuid().parse(body.requestId);
    hash = await fingerprint(body);
    const old = state.requests.find((r) => r.id === requestId);
    if (old) {
      if (old.actorId !== actor.id || old.hash !== hash)
        throw new Error("İşlem anahtarı başka bir kayıt için kullanılmış.");
      return structuredClone(old.result);
    }
  }
  let result: unknown = { ok: true };
  switch (body.action) {
    case "create_record": {
      const input = normalizeRecord(state, actor, catalog, body.record);
      const row: BusinessRecord = {
        ...input,
        id: requestId!,
        number: `SHP-${String(state.nextNumber++).padStart(6, "0")}`,
        status: "ACTIVE",
        createdBy: actor.id,
        createdByName: actor.name,
        version: 1,
        createdAt: new Date().toISOString(),
        settledMinor: 0,
        remainingMinor: input.amountMinor,
      };
      state.records.push(row);
      audit(
        state,
        actor,
        "RECORD_CREATED",
        row,
        "Yeni kayıt oluşturuldu.",
        undefined,
        row,
      );
      result = recordDTO(state, actor, row);
      break;
    }
    case "payment": {
      const p = paymentInputSchema.parse(body.payment),
        row = accessible(state, actor, p.recordId);
      if (row.status !== "ACTIVE")
        throw new Error("İptal edilmiş kayda ödeme girilemez.");
      if (p.refund) ownerOnly(actor);
      const account = state.accounts.find((a) => a.id === p.accountId);
      if (!account) throw new Error("Hesap bulunamadı.");
      if (p.date < account.openingDate)
        throw new Error("Ödeme tarihi hesap açılışından önce olamaz.");
      const paid = settlement(state, row),
        cap = p.refund ? paid : row.amountMinor - paid;
      if (p.grossMinor > cap)
        throw new Error(
          "Tutar kaydın kalan / iade edilebilir tutarını aşıyor.",
        );
      if (row.kind !== "SALE" && (p.commissionMinor || p.shippingMinor))
        throw new Error("Kesintiler yalnızca satış tahsilatında kullanılır.");
      const payment = {
        ...p,
        id: requestId!,
        netMinor: p.grossMinor - p.commissionMinor - p.shippingMinor,
        flow:
          (row.kind === "SALE") !== p.refund
            ? ("IN" as const)
            : ("OUT" as const),
        createdBy: actor.id,
        recordNumber: row.number,
        party: row.party,
        accountName: account.name,
      };
      state.payments.push(payment);
      audit(
        state,
        actor,
        "PAYMENT_CREATED",
        row,
        p.refund
          ? "İade hareketi girildi."
          : "Tahsil / ödeme hareketi girildi.",
        undefined,
        payment,
      );
      result = payment;
      break;
    }
    case "edit_record":
    case "cancel_record": {
      const row = accessible(state, actor, z.uuid().parse(body.id)),
        version = z.number().int().min(1).parse(body.version),
        reason = reasonInput.parse(body.reason),
        action = body.action === "edit_record" ? "EDIT" : "CANCEL";
      if (row.version !== version)
        throw new Error("Kayıt değişmiş. Sayfayı yenileyip tekrar deneyin.");
      if (row.status !== "ACTIVE") throw new Error("Kayıt iptal edilmiş.");
      if (actor.role === "OWNER") {
        applyChange(state, actor, catalog, row, action, body.record, reason);
        result = { approvalRequired: false };
        break;
      }
      const proposed =
        action === "EDIT" ? recordInputSchema.parse(body.record) : null;
      if (proposed?.kind && proposed.kind !== row.kind)
        throw new Error("Kaydın işlem türü değiştirilemez.");
      if (proposed?.lines.some((l) => l.unitCostMinor != null))
        throw new Error("Maliyet alanını değiştirme yetkiniz yok.");
      if (
        state.amendments.some(
          (a) => a.recordId === row.id && a.status === "PENDING",
        )
      )
        throw new Error("Bu kayıt için bekleyen bir düzeltme talebi var.");
      state.amendments.push({
        id: crypto.randomUUID(),
        recordId: row.id,
        recordNumber: row.number,
        party: row.party,
        requestedBy: actor.id,
        requestedByName: actor.name,
        reason,
        status: "PENDING",
        action,
        version,
        proposed,
        createdAt: new Date().toISOString(),
        decisionNote: "",
      });
      audit(state, actor, "AMENDMENT_REQUESTED", row, reason);
      result = { approvalRequired: true };
      break;
    }
    case "amendment": {
      ownerOnly(actor);
      const id = z.uuid().parse(body.id),
        approve = z.boolean().parse(body.approve),
        note = z
          .string()
          .max(500)
          .parse(body.note ?? "");
      const request = state.amendments.find((a) => a.id === id);
      if (!request || request.status !== "PENDING")
        throw new Error("Talep bulunamadı veya sonuçlandırıldı.");
      const row = accessible(state, actor, request.recordId);
      if (approve) {
        if (row.version !== request.version)
          throw new Error(
            "Kayıt talepten sonra değişmiş. Talebi reddedip güncel bir talep isteyin.",
          );
        applyChange(
          state,
          actor,
          catalog,
          row,
          request.action,
          request.proposed,
          request.reason,
        );
      }
      request.status = approve ? "APPROVED" : "REJECTED";
      request.decisionNote = note;
      audit(
        state,
        actor,
        approve ? "AMENDMENT_APPROVED" : "AMENDMENT_REJECTED",
        row,
        note || request.reason,
      );
      break;
    }
    case "product_cost": {
      ownerOnly(actor);
      const id = z.string().max(100).parse(body.productId),
        cost = minor.parse(body.unitCostMinor);
      const p = catalog.find((p) => p.id === id);
      if (!p) throw new Error("Ürün bulunamadı.");
      const previous = state.costs.find((c) => c.id === id);
      const before = previous ? { ...previous } : null;
      if (previous) previous.unitCostMinor = cost;
      else state.costs.push({ id, unitCostMinor: cost });
      audit(
        state,
        actor,
        "PRODUCT_COST",
        null,
        `${p.sku} · ${p.name} maliyeti güncellendi. Eski satış maliyetleri korundu.`,
        before,
        { unitCostMinor: cost },
      );
      break;
    }
    case "account": {
      ownerOnly(actor);
      const a = z
        .object({
          name: z.string().trim().min(2).max(100),
          type: z.enum(["CASH", "BANK"]),
          openingMinor: z
            .number()
            .int()
            .min(-100_000_000_000)
            .max(100_000_000_000),
          openingDate: dateInput,
        })
        .strict()
        .parse(body.account);
      if (a.openingDate > todayInIstanbul())
        throw new Error("Açılış tarihi gelecekte olamaz.");
      if (state.accounts.some((x) => x.name === a.name))
        throw new Error("Bu hesap adı zaten mevcut.");
      state.accounts.push({
        ...a,
        id: crypto.randomUUID(),
        balanceMinor: a.openingMinor,
      });
      audit(
        state,
        actor,
        "ACCOUNT_CREATED",
        null,
        `${a.name} hesabı oluşturuldu.`,
        undefined,
        a,
      );
      break;
    }
    case "transfer": {
      ownerOnly(actor);
      const t = z
        .object({
          sourceId: z.uuid(),
          targetId: z.uuid(),
          date: dateInput,
          amountMinor: minor.min(1),
          description: z.string().max(500),
        })
        .strict()
        .parse(body.transfer);
      if (t.sourceId === t.targetId) throw new Error("Farklı iki hesap seçin.");
      const accounts = state.accounts.filter(
        (a) => a.id === t.sourceId || a.id === t.targetId,
      );
      if (accounts.length !== 2) throw new Error("Hesap bulunamadı.");
      if (
        t.date > todayInIstanbul() ||
        accounts.some((a) => a.openingDate > t.date)
      )
        throw new Error("Transfer tarihi geçerli değil.");
      state.transfers.push({ ...t, id: requestId!, createdByName: actor.name });
      audit(
        state,
        actor,
        "TRANSFER_CREATED",
        null,
        "Hesaplar arası transfer kaydedildi.",
        undefined,
        t,
      );
      break;
    }
    case "staff": {
      ownerOnly(actor);
      const u = z
        .object({
          name: z.string().trim().min(2).max(100),
          email: z.email().max(200),
          password: z.string().max(128).optional(),
        })
        .strict()
        .parse(body.user);
      const email = u.email.toLowerCase();
      if (state.users.some((x) => x.email === email))
        throw new Error("Bu e-posta zaten kayıtlı.");
      state.users.push({
        id: crypto.randomUUID(),
        name: u.name,
        email,
        role: "STAFF",
        active: true,
      });
      audit(
        state,
        actor,
        "STAFF_CREATED",
        null,
        `${u.name} için personel yetkisi tanımlandı.`,
      );
      break;
    }
    case "staff_active": {
      ownerOnly(actor);
      const id = z.uuid().parse(body.id),
        active = z.boolean().parse(body.active);
      const user = state.users.find((u) => u.id === id && u.role === "STAFF");
      if (!user) throw new Error("Bu personel hesabı değiştirilemez.");
      user.active = active;
      audit(
        state,
        actor,
        "STAFF_STATUS",
        null,
        `${user.name}: ${active ? "hesap açıldı" : "hesap kapatıldı"}.`,
      );
      break;
    }
    default:
      throw new Error("Bu işlem bulut panelinde desteklenmiyor.");
  }
  if (requestId)
    state.requests.push({
      id: requestId,
      actorId: actor.id,
      hash: hash!,
      result: structuredClone(result),
    });
  return result;
}
