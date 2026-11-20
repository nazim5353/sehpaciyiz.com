import { z } from "zod";
import type {
  Account,
  Amendment,
  AuditRow,
  BusinessRecord,
  CatalogCost,
  Operator,
  Payment,
  RecordInput,
} from "../../src/lib/operations/types";
import {
  recordInputSchema,
  recordTotal,
} from "../../src/lib/operations/validation";
export type Identity = { userId: string; email: string; displayName: string };
export type CloudUser = Operator & { subject?: string };
export type Transfer = {
  id: string;
  date: string;
  sourceId: string;
  targetId: string;
  amountMinor: number;
  description: string;
  createdByName: string;
};
export type CloudState = {
  users: CloudUser[];
  records: BusinessRecord[];
  payments: Payment[];
  accounts: Account[];
  amendments: Omit<Amendment, "current">[];
  audit: (AuditRow & { before?: unknown; after?: unknown })[];
  costs: { id: string; unitCostMinor: number }[];
  transfers: Transfer[];
  requests: { id: string; actorId: string; hash: string; result: unknown }[];
  nextNumber: number;
};
export const collections = [
  "users",
  "records",
  "payments",
  "accounts",
  "amendments",
  "audit",
  "costs",
  "transfers",
  "requests",
] as const;
export function emptyState(): CloudState {
  return {
    users: [],
    records: [],
    payments: [],
    accounts: [],
    amendments: [],
    audit: [],
    costs: [],
    transfers: [],
    requests: [],
    nextNumber: 1,
  };
}
export const publicUser = (u: CloudUser): Operator => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  active: u.active,
  preview: true,
});
export function ownerOnly(actor: Operator) {
  if (actor.role !== "OWNER" || !actor.active)
    throw new Error("Bu işlem yalnızca şirket sahibine açık.");
}
export function audit(
  state: CloudState,
  actor: Operator,
  action: string,
  record: BusinessRecord | null,
  detail: string,
  before?: unknown,
  after?: unknown,
) {
  state.audit.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actorName: actor.name,
    action,
    recordNumber: record?.number ?? null,
    detail,
    before: before === undefined ? undefined : structuredClone(before),
    after: after === undefined ? undefined : structuredClone(after),
  });
}
export function ensureIdentity(
  state: CloudState,
  identity: Identity,
): { actor: Operator; changed: boolean } {
  if (!identity.userId || !identity.email) throw new Error("Oturum açın.");
  let user = state.users.find((u) => u.subject === identity.userId);
  let changed = false;
  if (!user) {
    if (!state.users.some((u) => u.role === "OWNER")) {
      user = {
        id: crypto.randomUUID(),
        name: identity.displayName,
        email: identity.email.toLowerCase(),
        subject: identity.userId,
        role: "OWNER",
        active: true,
      };
      state.users.push(user);
      state.accounts.push({
        id: crypto.randomUUID(),
        name: "Nakit kasa",
        type: "CASH",
        openingMinor: 0,
        openingDate: "2000-01-01",
        balanceMinor: 0,
      });
      audit(
        state,
        user,
        "SETUP",
        null,
        "Kalıcı şirket çalışma alanı oluşturuldu.",
      );
      changed = true;
    } else {
      user = state.users.find(
        (u) => u.email.toLowerCase() === identity.email.toLowerCase(),
      );
      if (!user || user.subject)
        throw new Error("Bu şirket alanına erişim yetkiniz yok.");
      if (!user.active) throw new Error("Hesap etkin değil.");
      user.subject = identity.userId;
      changed = true;
      audit(
        state,
        user,
        "MEMBER_CONNECTED",
        null,
        "Personel hesabı güvenli giriş kimliğiyle eşleştirildi.",
      );
    }
  }
  if (!user.active) throw new Error("Hesap etkin değil.");
  return { actor: publicUser(user), changed };
}
export function accessible(state: CloudState, actor: Operator, id: string) {
  z.uuid().parse(id);
  const row = state.records.find((r) => r.id === id);
  if (!row) throw new Error("Kayıt bulunamadı.");
  if (!actor.active || (actor.role !== "OWNER" && row.createdBy !== actor.id))
    throw new Error("Bu kayda erişim yetkiniz yok.");
  return row;
}
export function settlement(state: CloudState, record: BusinessRecord) {
  return state.payments
    .filter((p) => p.recordId === record.id)
    .reduce((sum, p) => sum + (p.refund ? -p.grossMinor : p.grossMinor), 0);
}
export function recordDTO(
  state: CloudState,
  actor: Operator,
  row: BusinessRecord,
): BusinessRecord {
  const paid = settlement(state, row);
  return {
    ...row,
    lines: row.lines.map((l) =>
      actor.role === "OWNER"
        ? { ...l }
        : (({ unitCostMinor: _, ...rest }) => rest)(l),
    ),
    settledMinor: paid,
    remainingMinor: Math.max(0, row.amountMinor - paid),
  };
}
export function normalizeRecord(
  state: CloudState,
  actor: Operator,
  catalog: CatalogCost[],
  input: unknown,
  previous?: BusinessRecord,
): RecordInput & { amountMinor: number } {
  const value = recordInputSchema.parse(input) as RecordInput;
  if (previous && previous.kind !== value.kind)
    throw new Error("Kaydın işlem türü değiştirilemez.");
  value.lines = value.lines.map((line, i) => {
    if (actor.role !== "OWNER" && line.unitCostMinor != null)
      throw new Error("Maliyet alanını değiştirme yetkiniz yok.");
    const product = line.productId
      ? catalog.find((p) => p.id === line.productId)
      : undefined;
    if (line.productId && !product)
      throw new Error("Katalog ürünü bulunamadı.");
    const old = previous?.lines[i],
      same =
        old &&
        old.productId === line.productId &&
        old.name === (product?.name ?? line.name);
    const cost =
      value.kind === "SALE"
        ? actor.role === "OWNER" && line.unitCostMinor != null
          ? line.unitCostMinor
          : same
            ? old.unitCostMinor
            : (state.costs.find((c) => c.id === product?.id)?.unitCostMinor ??
              null)
        : null;
    return {
      ...line,
      ...(product
        ? { productId: product.id, name: product.name, sku: product.sku }
        : {}),
      unitCostMinor: cost ?? null,
    };
  });
  return {
    ...value,
    channel: value.kind === "SALE" ? value.channel : null,
    amountMinor: recordTotal(value),
  };
}
export async function fingerprint(value: unknown) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(bytes), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
