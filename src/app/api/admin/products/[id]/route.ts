import { isAdmin, assertOrigin } from "@/lib/auth";
import { updateStore } from "@/lib/store";
import { z } from "zod";
const schema = z
  .object({
    name: z.string().trim().min(3).max(120),
    price: z.number().int().min(100).max(100000000),
    active: z.boolean(),
    featured: z.boolean(),
    variants: z
      .array(
        z
          .object({
            id: z.string(),
            stock: z.number().int().min(0).max(100000),
            leadDays: z.number().int().min(1).max(180),
            surcharge: z.number().int().min(0).max(100000000),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin()))
    return Response.json(
      { error: "Oturum açmanız gerekiyor." },
      { status: 401 },
    );
  try {
    assertOrigin(request);
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16384)
      return Response.json({ error: "Veri çok büyük." }, { status: 413 });
    const values = schema.parse(JSON.parse(raw));
    const { id } = await context.params;
    await updateStore(
      (store) => {
        const product = store.products.find((p) => p.id === id);
        if (!product) throw new Error("Ürün bulunamadı.");
        if (
          values.variants.length !== product.variants.length ||
          new Set(values.variants.map((v) => v.id)).size !==
            product.variants.length ||
          values.variants.some(
            (v) => !product.variants.find((pv) => pv.id === v.id),
          )
        )
          throw new Error("Seçenekler geçersiz.");
        product.name = values.name;
        product.price = values.price;
        if (product.previousPrice && product.previousPrice <= product.price)
          product.previousPrice = undefined;
        product.active = values.active;
        product.featured = values.featured;
        for (const variant of product.variants)
          Object.assign(
            variant,
            values.variants.find((v) => v.id === variant.id),
          );
      },
      "Ürün güncellendi",
      id,
    );
    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "Ürün kaydedilemedi. Değerleri kontrol edin." },
      { status: 400 },
    );
  }
}
