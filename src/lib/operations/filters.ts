import { z } from "zod";
import { currentMonthRange, type OpsFilters } from "./types";
const filterSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  channel: z
    .enum(["WEB", "INSTAGRAM", "TRENDYOL", "HEPSIBURADA", "STORE", ""])
    .optional(),
  kind: z
    .enum([
      "SALE",
      "PRODUCT_PURCHASE",
      "MATERIAL_PURCHASE",
      "EXPENSE",
      "TAX",
      "",
    ])
    .optional(),
  search: z.string().max(120).optional(),
  group: z.enum(["day", "week", "month"]).optional(),
  cursor: z.string().max(150).optional(),
});
export function operationFilters(params: URLSearchParams): OpsFilters {
  const defaults = currentMonthRange();
  return filterSchema.parse({
    from: params.get("from") || defaults.from,
    to: params.get("to") || defaults.to,
    channel: params.get("channel") || "",
    kind: params.get("kind") || "",
    search: params.get("search") || "",
    group: params.get("group") || "day",
    cursor: params.get("cursor") || undefined,
  });
}
