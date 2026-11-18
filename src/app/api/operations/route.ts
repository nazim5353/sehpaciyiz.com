import { z } from "zod";
import { assertOrigin } from "@/lib/auth";
import { operationsDB } from "@/lib/operations/database";
import {
  addStaff,
  changeOperatorPassword,
  currentOperator,
  ownerOnly,
  setStaffActive,
} from "@/lib/operations/identity";
import {
  addAccount,
  addBusinessPayment,
  changeBusinessRecord,
  createBusinessRecord,
  decideAmendment,
  getOperationsData,
  setProductCost,
  transferAccounts,
} from "@/lib/operations/service";
import { operationFilters } from "@/lib/operations/filters";
export const runtime = "nodejs";
function failure(error: unknown) {
  if (error instanceof z.ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Giriş bilgileri geçerli değil." },
      { status: 400 },
    );
  const code = (error as { code?: string })?.code;
  if (code)
    return Response.json(
      {
        error:
          code === "23505"
            ? "Bu kayıt zaten mevcut."
            : code === "23503"
              ? "İlişkili kayıt bulunamadı."
              : "İşlem kaydedilemedi. Alanları kontrol edin.",
      },
      { status: 400 },
    );
  const message =
    error instanceof Error ? error.message : "İşlem tamamlanamadı.";
  return Response.json(
    { error: message },
    { status: /yetki|yalnızca şirket|erişim/.test(message) ? 403 : 400 },
  );
}
export async function GET(request: Request) {
  try {
    const actor = await currentOperator();
    if (!actor)
      return Response.json({ error: "Oturum açın." }, { status: 401 });
    const params = new URL(request.url).searchParams;
    if (
      ["raporlar", "maliyetler", "kasa", "ekip"].includes(
        params.get("view") ?? "",
      )
    )
      ownerOnly(actor);
    return Response.json(
      await getOperationsData(
        await operationsDB(),
        actor,
        operationFilters(params),
        params.get("view") === "takvim" ? "due" : "record",
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const actor = await currentOperator();
    if (!actor)
      return Response.json({ error: "Oturum açın." }, { status: 401 });
    const text = await request.text();
    if (Buffer.byteLength(text) > 65536)
      return Response.json({ error: "İstek çok büyük." }, { status: 413 });
    const body = JSON.parse(text);
    const db = await operationsDB();
    let result: unknown = { ok: true };
    switch (body.action) {
      case "create_record":
        result = await createBusinessRecord(
          db,
          actor,
          body.record,
          z.uuid().parse(body.requestId),
        );
        break;
      case "payment":
        result = await addBusinessPayment(
          db,
          actor,
          body.payment,
          z.uuid().parse(body.requestId),
        );
        break;
      case "edit_record":
      case "cancel_record":
        result = await changeBusinessRecord(
          db,
          actor,
          z.uuid().parse(body.id),
          z.number().int().min(1).parse(body.version),
          body.action === "edit_record" ? "EDIT" : "CANCEL",
          body.record,
          z.string().min(5).max(500).parse(body.reason),
        );
        break;
      case "amendment":
        await decideAmendment(
          db,
          actor,
          z.uuid().parse(body.id),
          z.boolean().parse(body.approve),
          z
            .string()
            .max(500)
            .parse(body.note ?? ""),
        );
        break;
      case "product_cost":
        await setProductCost(
          db,
          actor,
          z.string().max(100).parse(body.productId),
          z
            .number()
            .int()
            .min(0)
            .max(100_000_000_000)
            .parse(body.unitCostMinor),
        );
        break;
      case "account":
        await addAccount(db, actor, body.account);
        break;
      case "transfer":
        await transferAccounts(
          db,
          actor,
          body.transfer,
          z.uuid().parse(body.requestId),
        );
        break;
      case "staff":
        await addStaff(db, actor, body.user);
        break;
      case "staff_active":
        await setStaffActive(
          db,
          actor,
          z.uuid().parse(body.id),
          z.boolean().parse(body.active),
        );
        break;
      case "password":
        result = {
          signInAgain: await changeOperatorPassword(db, actor, body.password),
        };
        break;
      default:
        throw new Error("İşlem tanınmadı.");
    }
    return Response.json(
      { ok: true, result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
