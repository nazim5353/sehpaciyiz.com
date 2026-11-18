import { currentOperator, ownerOnly } from "@/lib/operations/identity";
import { operationsDB } from "@/lib/operations/database";
import { getOperationsData } from "@/lib/operations/service";
import { operationFilters } from "@/lib/operations/filters";
import { recordKinds, salesChannels } from "@/lib/operations/types";
const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
export async function GET(request: Request) {
  try {
    const actor = await currentOperator();
    if (!actor)
      return Response.json({ error: "Oturum açın." }, { status: 401 });
    ownerOnly(actor);
    const params = new URL(request.url).searchParams;
    const filters = operationFilters(params);
    filters.cursor = undefined;
    const db = await operationsDB();
    const rows = [
      [
        "Kayıt no",
        "Tür",
        "Tarih",
        "Satış kanalı",
        "Müşteri / firma",
        "Kategori",
        "Belge no",
        "Açıklama",
        "Toplam (TL)",
        "Güncel mahsup (TL)",
        "Güncel kalan (TL)",
        "Durum",
        "Personel",
      ],
    ];
    let cursor: string | null = null;
    do {
      const data = await getOperationsData(
        db,
        actor,
        {
          ...filters,
          cursor: cursor ?? undefined,
        },
        params.get("view") === "takvim" ? "due" : "record",
      );
      for (const record of data.records)
        rows.push([
          record.number,
          recordKinds.find((k) => k.id === record.kind)!.name,
          record.date,
          salesChannels.find((c) => c.id === record.channel)?.name ?? "",
          record.party,
          record.category,
          record.documentNo,
          record.description,
          (record.amountMinor / 100).toFixed(2).replace(".", ","),
          (record.settledMinor / 100).toFixed(2).replace(".", ","),
          (record.remainingMinor / 100).toFixed(2).replace(".", ","),
          record.status === "ACTIVE" ? "Etkin" : "İptal",
          record.createdByName,
        ]);
      cursor = data.nextCursor;
    } while (cursor);
    return new Response(
      "\ufeff" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="sehpaciyiz-${filters.from}-${filters.to}.csv"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch {
    return Response.json(
      { error: "Dışa aktarma için şirket sahibi hesabıyla giriş yapın." },
      { status: 403 },
    );
  }
}
