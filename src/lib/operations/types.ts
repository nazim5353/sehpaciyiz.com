export const salesChannels = [
  { id: "WEB", name: "Web sitesi" },
  { id: "INSTAGRAM", name: "Instagram" },
  { id: "TRENDYOL", name: "Trendyol" },
  { id: "HEPSIBURADA", name: "Hepsiburada" },
  { id: "STORE", name: "Mağaza" },
] as const;
export type SalesChannel = (typeof salesChannels)[number]["id"];
export const recordKinds = [
  { id: "SALE", name: "Satış", plural: "Satışlar" },
  { id: "PRODUCT_PURCHASE", name: "Ürün alımı", plural: "Ürün alımları" },
  {
    id: "MATERIAL_PURCHASE",
    name: "Malzeme alımı",
    plural: "Malzeme alımları",
  },
  { id: "EXPENSE", name: "Gider", plural: "Diğer giderler" },
  { id: "TAX", name: "Vergi / resmi ödeme", plural: "Vergi kayıtları" },
] as const;
export type RecordKind = (typeof recordKinds)[number]["id"];
export const expenseCategories = [
  "Kira",
  "Personel",
  "Kargo / nakliye",
  "Komisyon",
  "Reklam",
  "Ambalaj",
  "Elektrik / su / iletişim",
  "Muhasebe / danışmanlık",
  "Bakım / onarım",
  "Diğer",
];
export type Operator = {
  preview?: boolean;
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
  active: boolean;
};
export type RecordLine = {
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPriceMinor: number;
  discountMinor: number;
  unitCostMinor?: number | null;
};
export type RecordInput = {
  kind: RecordKind;
  date: string;
  channel?: SalesChannel | null;
  party: string;
  category: string;
  description: string;
  documentNo: string;
  dueDate?: string | null;
  amountMinor?: number;
  lines: RecordLine[];
};
export type BusinessRecord = RecordInput & {
  id: string;
  number: string;
  amountMinor: number;
  status: "ACTIVE" | "CANCELED";
  createdBy: string;
  createdByName: string;
  version: number;
  createdAt: string;
  settledMinor: number;
  remainingMinor: number;
};
export type PaymentInput = {
  recordId: string;
  date: string;
  accountId: string;
  method: "CASH" | "CARD" | "BANK";
  grossMinor: number;
  commissionMinor: number;
  shippingMinor: number;
  refund: boolean;
  description: string;
};
export type Payment = PaymentInput & {
  id: string;
  netMinor: number;
  flow: "IN" | "OUT";
  createdBy: string;
  recordNumber: string;
  party: string;
  accountName: string;
};
export type Account = {
  id: string;
  name: string;
  type: "CASH" | "BANK";
  openingMinor: number;
  openingDate: string;
  balanceMinor: number;
};
export type Amendment = {
  current: BusinessRecord;
  id: string;
  recordId: string;
  recordNumber: string;
  party: string;
  requestedBy: string;
  requestedByName: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  action: "EDIT" | "CANCEL";
  version: number;
  proposed: RecordInput | null;
  createdAt: string;
  decisionNote: string;
};
export type AuditRow = {
  id: string;
  at: string;
  actorName: string;
  action: string;
  recordNumber: string | null;
  detail: string;
};
export type CatalogCost = {
  id: string;
  name: string;
  sku: string;
  image: string;
  priceMinor: number;
  unitCostMinor: number | null;
};
export type Dashboard = {
  salesMinor: number;
  receiptsMinor: number;
  expenseMinor: number;
  cashInMinor: number;
  cashOutMinor: number;
  cashNetMinor: number;
  balanceMinor: number;
  receivableMinor: number;
  payableMinor: number;
  deductionsMinor: number;
  knownProductMarginMinor: number;
  missingCostSales: number;
  recordCount: number;
  pendingApprovals: number;
  channels: {
    id: SalesChannel;
    name: string;
    totalMinor: number;
    count: number;
  }[];
  periods: {
    date: string;
    incomeMinor: number;
    expenseMinor: number;
    salesMinor: number;
  }[];
};
export type OpsFilters = {
  from: string;
  to: string;
  channel?: SalesChannel | "";
  kind?: RecordKind | "";
  search?: string;
  group?: "day" | "week" | "month";
  cursor?: string;
};
export type OpsData = {
  transfers: {
    id: string;
    date: string;
    sourceName: string;
    targetName: string;
    amountMinor: number;
    description: string;
    createdByName: string;
  }[];
  user: Operator;
  records: BusinessRecord[];
  payments: Payment[];
  accounts: Account[];
  amendments: Amendment[];
  users: Operator[];
  audit: AuditRow[];
  catalog: CatalogCost[];
  dashboard: Dashboard | null;
  filters: OpsFilters;
  nextCursor: string | null;
};
export const financeMoney = (minor: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
export function todayInIstanbul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function currentMonthRange() {
  const today = todayInIstanbul();
  return {
    from: today.slice(0, 7) + "-01",
    to:
      today.slice(0, 7) +
      "-" +
      new Date(
        Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
      ).getUTCDate(),
  };
}
export function moneyInput(minor: number | null | undefined) {
  return minor == null ? "" : (minor / 100).toFixed(2).replace(".", ",");
}
export function parseMoneyInput(value: string) {
  let text = value.trim().replace(/\s|₺/g, "");
  if (!text) return 0;
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error("Tutarı 1.250,50 biçiminde girin.");
  const [whole, fraction = ""] = text.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor > 100_000_000_000)
    throw new Error("Tutar izin verilen sınırı aşıyor.");
  return minor;
}
