import { z } from "zod";
import { todayInIstanbul, type RecordInput } from "./types";

export const minor = z.number().int().min(0).max(100_000_000_000);
export const dateInput = z.iso.date();
export const lineInput = z
  .object({
    productId: z.string().max(100).optional(),
    sku: z.string().max(100).optional(),
    name: z.string().trim().min(1).max(180),
    quantity: z.number().int().min(1).max(10000),
    unitPriceMinor: minor,
    discountMinor: minor.default(0),
    unitCostMinor: minor.nullable().optional(),
  })
  .strict();
export const recordInputSchema = z
  .object({
    kind: z.enum([
      "SALE",
      "PRODUCT_PURCHASE",
      "MATERIAL_PURCHASE",
      "EXPENSE",
      "TAX",
    ]),
    date: dateInput,
    channel: z
      .enum(["WEB", "INSTAGRAM", "TRENDYOL", "HEPSIBURADA", "STORE"])
      .nullable()
      .optional(),
    party: z.string().trim().max(160).default(""),
    category: z.string().trim().max(100).default(""),
    description: z.string().trim().max(2000).default(""),
    documentNo: z.string().trim().max(100).default(""),
    dueDate: dateInput.nullable().optional(),
    amountMinor: minor.optional(),
    lines: z.array(lineInput).max(50).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === "SALE" && !value.channel)
      ctx.addIssue({
        code: "custom",
        message: "Satış kanalını seçin.",
        path: ["channel"],
      });
    if (value.kind !== "SALE" && value.channel)
      ctx.addIssue({
        code: "custom",
        message: "Satış kanalı yalnızca satış kayıtlarında kullanılır.",
        path: ["channel"],
      });
    if (
      ["SALE", "PRODUCT_PURCHASE", "MATERIAL_PURCHASE"].includes(value.kind) &&
      !value.lines.length
    )
      ctx.addIssue({
        code: "custom",
        message: "En az bir ürün veya malzeme satırı ekleyin.",
        path: ["lines"],
      });
    if (
      ["EXPENSE", "TAX"].includes(value.kind) &&
      (!value.amountMinor || !value.category)
    )
      ctx.addIssue({
        code: "custom",
        message: "Kategori ve tutarı girin.",
        path: ["amountMinor"],
      });
    for (const [i, line] of value.lines.entries())
      if (line.discountMinor > line.unitPriceMinor * line.quantity)
        ctx.addIssue({
          code: "custom",
          message: "İndirim satır toplamını aşamaz.",
          path: ["lines", i, "discountMinor"],
        });
  });
export const paymentInputSchema = z
  .object({
    recordId: z.uuid(),
    date: dateInput,
    accountId: z.uuid(),
    method: z.enum(["CASH", "CARD", "BANK"]),
    grossMinor: minor.min(1),
    commissionMinor: minor.default(0),
    shippingMinor: minor.default(0),
    refund: z.boolean().default(false),
    description: z.string().trim().max(500).default(""),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.date > todayInIstanbul())
      ctx.addIssue({
        code: "custom",
        message: "Gerçekleşen ödeme için gelecek tarih seçilemez.",
        path: ["date"],
      });
    if (value.commissionMinor + value.shippingMinor > value.grossMinor)
      ctx.addIssue({
        code: "custom",
        message: "Kesintiler tahsilatı aşamaz.",
        path: ["grossMinor"],
      });
    if (value.refund && (value.commissionMinor || value.shippingMinor))
      ctx.addIssue({
        code: "custom",
        message: "İade kaydında kesinti girilemez.",
        path: ["refund"],
      });
  });
export function recordTotal(input: RecordInput) {
  const amount = ["EXPENSE", "TAX"].includes(input.kind)
    ? input.amountMinor!
    : input.lines.reduce(
        (sum, line) =>
          sum + line.quantity * line.unitPriceMinor - line.discountMinor,
        0,
      );
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100_000_000_000)
    throw new Error("Kayıt toplamı geçerli değil.");
  return amount;
}
