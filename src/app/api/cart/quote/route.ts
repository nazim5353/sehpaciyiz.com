import { z } from "zod";
import { getProducts, getPublicSettings } from "@/lib/store";
import { calculateCart } from "@/lib/commerce";
const schema = z
  .array(
    z
      .object({
        productId: z.string().max(100),
        variantId: z.string().max(100),
        quantity: z.number().int().min(1).max(20),
      })
      .strict(),
  )
  .max(50);
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16384)
      return Response.json({ error: "Sepet çok büyük." }, { status: 413 });
    const lines = schema.parse(JSON.parse(raw));
    const [products, settings] = await Promise.all([
      getProducts(),
      getPublicSettings(),
    ]);
    return Response.json(
      calculateCart(
        lines,
        products,
        settings.shipping.flatRate,
        settings.shipping.freeThreshold,
      ),
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof z.ZodError
            ? "Sepet bilgisi geçersiz."
            : error instanceof Error
              ? error.message
              : "Sepet hesaplanamadı.",
      },
      { status: 400 },
    );
  }
}
