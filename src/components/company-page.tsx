import { redirect, notFound } from "next/navigation";
import { currentOperator } from "@/lib/operations/identity";
import { operationsDB } from "@/lib/operations/database";
import { getOperationsData } from "@/lib/operations/service";
import { operationFilters } from "@/lib/operations/filters";
import { CompanyWorkspace, type CompanyView } from "./company-workspace";
export type CompanySearch = Promise<
  Record<string, string | string[] | undefined>
>;
const views = [
  "ozet",
  "satislar",
  "alimlar",
  "giderler",
  "vergiler",
  "kasa",
  "takvim",
  "raporlar",
  "maliyetler",
  "ekip",
  "onaylar",
];
export async function CompanyPage({
  view,
  searchParams,
}: {
  view: string;
  searchParams: CompanySearch;
}) {
  if (!views.includes(view)) notFound();
  const user = await currentOperator();
  if (!user) redirect("/yonetim/giris");
  if (
    user.role !== "OWNER" &&
    ["kasa", "raporlar", "maliyetler", "ekip"].includes(view)
  )
    redirect("/yonetim");
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams))
    if (typeof value === "string") params.set(key, value);
  const kind =
    view === "satislar"
      ? "SALE"
      : view === "giderler"
        ? "EXPENSE"
        : view === "vergiler"
          ? "TAX"
          : view === "alimlar"
            ? params.get("kind") === "MATERIAL_PURCHASE"
              ? "MATERIAL_PURCHASE"
              : "PRODUCT_PURCHASE"
            : null;
  if (kind) params.set("kind", kind);
  let filters;
  try {
    filters = operationFilters(params);
    if (filters.from > filters.to) throw new Error();
  } catch {
    return (
      <div className="company-error">
        <h1>Tarih veya filtre bilgileri geçerli değil.</h1>
        <a href={view === "ozet" ? "/yonetim" : `/yonetim/${view}`}>
          Filtreleri sıfırla
        </a>
      </div>
    );
  }
  const data = await getOperationsData(
    await operationsDB(),
    user,
    filters,
    view === "takvim" ? "due" : "record",
  );
  return (
    <CompanyWorkspace
      key={`${view}:${JSON.stringify(filters)}`}
      view={view as CompanyView}
      data={data}
    />
  );
}
