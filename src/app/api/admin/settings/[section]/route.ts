import { isAdmin, assertOrigin } from "@/lib/auth";
import { mergeSettings, updateStore } from "@/lib/store";
import { settingsDefinitions } from "@/lib/settings";
import { z } from "zod";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ section: string }> },
) {
  if (!(await isAdmin()))
    return Response.json(
      { error: "Oturum açmanız gerekiyor." },
      { status: 401 },
    );
  try {
    assertOrigin(request);
    const { section } = await context.params;
    const definition = settingsDefinitions[section];
    if (!definition)
      return Response.json({ error: "Bölüm bulunamadı." }, { status: 404 });
    const body = await request.text();
    if (Buffer.byteLength(body) > 32768)
      return Response.json(
        { error: "Ayar verisi çok büyük." },
        { status: 413 },
      );
    const shape: Record<string, z.ZodType> = {};
    for (const field of definition.fields)
      shape[field.key] =
        field.type === "checkbox"
          ? z.boolean()
          : field.type === "number"
            ? z
                .number()
                .finite()
                .min(field.min ?? 0)
                .max(field.max ?? 1000000)
            : field.type === "email"
              ? z.union([z.literal(""), z.email()])
              : field.type === "select"
                ? z.enum(field.options as [string, ...string[]])
                : z.string().max(field.type === "textarea" ? 12000 : 1000);
    const parsed = z.object(shape).strict().safeParse(JSON.parse(body));
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Alanları kontrol edin. Sayı, e-posta veya seçim geçerli değil.",
        },
        { status: 400 },
      );
    await updateStore(
      (store) =>
        mergeSettings(
          store,
          section,
          parsed.data as Record<string, string | number | boolean>,
        ),
      "Ayarlar güncellendi",
      definition.title,
    );
    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "Ayarlar kaydedilemedi. Tekrar deneyin." },
      { status: 400 },
    );
  }
}
