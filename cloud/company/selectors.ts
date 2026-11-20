import type {
  Account,
  BusinessRecord,
  CatalogCost,
  Dashboard,
  Operator,
  OpsData,
  OpsFilters,
} from "../../src/lib/operations/types";
import { salesChannels } from "../../src/lib/operations/types";
import { dateInput } from "../../src/lib/operations/validation";
import { publicUser, recordDTO, type CloudState } from "./model";
const numberOf = (r: BusinessRecord) => Number(r.number.slice(4));
function matchRecord(r: BusinessRecord, f: OpsFilters) {
  const search = f.search?.toLocaleLowerCase("tr");
  return (
    (!f.channel || r.channel === f.channel) &&
    (!f.kind || r.kind === f.kind) &&
    (!search ||
      [
        r.party,
        r.documentNo,
        r.description,
        r.number,
        ...r.lines.flatMap((l) => [l.name, l.sku ?? ""]),
      ]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(search))
  );
}
const safeSum = (values: number[]) => {
  const n = values.reduce((s, v) => s + v, 0);
  if (!Number.isSafeInteger(n))
    throw new Error("Toplam tutar güvenli hesaplama sınırını aşıyor.");
  return n;
};
function scopedRecords(
  state: CloudState,
  actor: Operator,
  filters: OpsFilters,
  basis: "record" | "due",
) {
  dateInput.parse(filters.from);
  dateInput.parse(filters.to);
  if (filters.from > filters.to)
    throw new Error("Başlangıç tarihi bitişten sonra olamaz.");
  return state.records
    .filter((r) => {
      const date = basis === "due" ? r.dueDate : r.date;
      return (
        (actor.role === "OWNER" || r.createdBy === actor.id) &&
        date &&
        date >= filters.from &&
        date <= filters.to &&
        matchRecord(r, filters)
      );
    })
    .map((r) => recordDTO(state, actor, r))
    .sort((a, b) => b.date.localeCompare(a.date) || numberOf(b) - numberOf(a));
}
export function exportRecords(
  state: CloudState,
  actor: Operator,
  filters: OpsFilters,
  basis: "record" | "due" = "record",
) {
  if (actor.role !== "OWNER")
    throw new Error("Bu işlem yalnızca şirket sahibine açık.");
  return scopedRecords(state, actor, filters, basis);
}
export function selectData(
  state: CloudState,
  actor: Operator,
  catalog: CatalogCost[],
  filters: OpsFilters,
  basis: "record" | "due" = "record",
): OpsData {
  const owner = actor.role === "OWNER";
  if (!actor.active) throw new Error("Hesap etkin değil.");
  const all = scopedRecords(state, actor, filters, basis),
    totals = all.filter((r) => r.status === "ACTIVE");
  let page = all;
  if (filters.cursor) {
    try {
      const [date, no] = atob(
        filters.cursor.replaceAll("-", "+").replaceAll("_", "/"),
      ).split("|");
      dateInput.parse(date);
      if (!/^\d+$/.test(no)) throw new Error();
      page = all.filter(
        (r) => r.date < date || (r.date === date && numberOf(r) < Number(no)),
      );
    } catch {
      throw new Error("Sayfa bilgisi geçerli değil.");
    }
  }
  const records = page.slice(0, 100),
    nextCursor =
      page.length > 100
        ? btoa(`${records[99].date}|${numberOf(records[99])}`)
            .replaceAll("+", "-")
            .replaceAll("/", "_")
            .replaceAll("=", "")
        : null;
  const periodPayments = state.payments.filter((p) => {
    const r = state.records.find((r) => r.id === p.recordId)!;
    return (
      p.date >= filters.from &&
      p.date <= filters.to &&
      (owner || r.createdBy === actor.id) &&
      matchRecord(r, filters)
    );
  });
  const accounts: Account[] = state.accounts.map((a) => {
    const moves = state.payments
      .filter((p) => p.accountId === a.id && p.date <= filters.to)
      .map((p) => (p.flow === "IN" ? p.netMinor : -p.netMinor));
    const transfers = state.transfers
      .filter((t) => t.date <= filters.to)
      .map((t) =>
        t.targetId === a.id
          ? t.amountMinor
          : t.sourceId === a.id
            ? -t.amountMinor
            : 0,
      );
    return {
      ...a,
      openingMinor: owner ? a.openingMinor : 0,
      balanceMinor: owner
        ? safeSum([
            a.openingDate <= filters.to ? a.openingMinor : 0,
            ...moves,
            ...transfers,
          ])
        : 0,
    };
  });
  const amendments = state.amendments
    .filter((a) => owner || a.requestedBy === actor.id)
    .sort(
      (a, b) =>
        Number(b.status === "PENDING") - Number(a.status === "PENDING") ||
        b.createdAt.localeCompare(a.createdAt),
    )
    .slice(0, 100)
    .map((a) => ({
      ...a,
      proposed: a.proposed
        ? {
            ...a.proposed,
            lines: a.proposed.lines.map((l) =>
              owner ? { ...l } : (({ unitCostMinor: _, ...rest }) => rest)(l),
            ),
          }
        : null,
      current: recordDTO(
        state,
        actor,
        state.records.find((r) => r.id === a.recordId)!,
      ),
    }));
  let dashboard: Dashboard | null = null;
  if (owner) {
    const sales = totals.filter((r) => r.kind === "SALE"),
      expenses = totals.filter((r) => r.kind !== "SALE");
    const income = safeSum(
        periodPayments.filter((p) => p.flow === "IN").map((p) => p.netMinor),
      ),
      out = safeSum(
        periodPayments.filter((p) => p.flow === "OUT").map((p) => p.netMinor),
      ),
      deductions = safeSum(
        periodPayments.map((p) => p.commissionMinor + p.shippingMinor),
      );
    const buckets = new Map<
      string,
      {
        date: string;
        incomeMinor: number;
        expenseMinor: number;
        salesMinor: number;
      }
    >();
    const bucket = (date: string) => {
      let key = date;
      if (filters.group === "month") key = date.slice(0, 7) + "-01";
      if (filters.group === "week") {
        const d = new Date(date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
        key = d.toISOString().slice(0, 10);
      }
      if (!buckets.has(key))
        buckets.set(key, {
          date: key,
          incomeMinor: 0,
          expenseMinor: 0,
          salesMinor: 0,
        });
      return buckets.get(key)!;
    };
    for (const p of periodPayments) {
      const b = bucket(p.date);
      if (p.flow === "IN") b.incomeMinor += p.netMinor;
      else b.expenseMinor += p.netMinor;
    }
    for (const r of sales) bucket(r.date).salesMinor += r.amountMinor;
    dashboard = {
      salesMinor: safeSum(sales.map((r) => r.amountMinor)),
      receiptsMinor: safeSum(sales.map((r) => r.settledMinor)),
      expenseMinor: safeSum([
        ...expenses.map((r) => r.amountMinor),
        deductions,
      ]),
      cashInMinor: income,
      cashOutMinor: out,
      cashNetMinor: income - out,
      balanceMinor: safeSum(accounts.map((a) => a.balanceMinor)),
      receivableMinor: safeSum(sales.map((r) => r.remainingMinor)),
      payableMinor: safeSum(expenses.map((r) => r.remainingMinor)),
      deductionsMinor: deductions,
      knownProductMarginMinor: safeSum(
        sales.flatMap((r) =>
          r.lines
            .filter((l) => l.unitCostMinor != null)
            .map(
              (l) =>
                l.quantity * (l.unitPriceMinor - l.unitCostMinor!) -
                l.discountMinor,
            ),
        ),
      ),
      missingCostSales: sales.filter((r) =>
        r.lines.some((l) => l.unitCostMinor == null),
      ).length,
      recordCount: all.length,
      pendingApprovals: state.amendments.filter((a) => a.status === "PENDING")
        .length,
      channels: salesChannels.map((c) => ({
        ...c,
        totalMinor: safeSum(
          sales.filter((r) => r.channel === c.id).map((r) => r.amountMinor),
        ),
        count: sales.filter((r) => r.channel === c.id).length,
      })),
      periods: [...buckets.values()].sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }
  return {
    user: actor,
    records,
    payments: periodPayments
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 300)
      .map((p) => ({
        ...p,
        party: state.records.find((r) => r.id === p.recordId)!.party,
      })),
    accounts,
    amendments,
    users: owner ? state.users.map(publicUser) : [actor],
    audit: owner
      ? state.audit
          .slice(-100)
          .reverse()
          .map(({ before: _, after: __, ...row }) => row)
      : [],
    catalog: catalog.map((p) => ({
      ...p,
      unitCostMinor: owner
        ? (state.costs.find((c) => c.id === p.id)?.unitCostMinor ?? null)
        : null,
    })),
    dashboard,
    filters,
    nextCursor,
    transfers: owner
      ? state.transfers
          .filter((t) => t.date >= filters.from && t.date <= filters.to)
          .slice()
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 300)
          .map((t) => ({
            ...t,
            sourceName: state.accounts.find((a) => a.id === t.sourceId)!.name,
            targetName: state.accounts.find((a) => a.id === t.targetId)!.name,
          }))
      : [],
  };
}
