import { type Product, variantPrice } from "./catalog";
export type CartLine = {
  productId: string;
  variantId: string;
  quantity: number;
};
export function calculateCart(
  lines: CartLine[],
  products: Product[],
  flatRate: number,
  freeThreshold: number,
) {
  let subtotal = 0;
  let leadDays = 0;
  let leadDaysMin = 0;
  const merged = new Map<string, CartLine>();
  for (const line of lines) {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20
    )
      throw new Error("Ürün adedi 1 ile 20 arasında olmalı.");
    const key = `${line.productId}:${line.variantId}`;
    const quantity = (merged.get(key)?.quantity ?? 0) + line.quantity;
    if (quantity > 20)
      throw new Error("Aynı seçenekten en fazla 20 adet eklenebilir.");
    merged.set(key, { ...line, quantity });
  }
  const items = [...merged.values()].map((line) => {
    const product = products.find((p) => p.id === line.productId && p.active);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant)
      throw new Error("Sepetteki ürün veya seçenek artık satışta değil.");
    if (variant.stock > 0 && !variant.madeToOrder && line.quantity > variant.stock)
      throw new Error(`${product.name} için yeterli hazır stok yok.`);
    const price = variantPrice(product, variant);
    subtotal += price * line.quantity;
    leadDays = Math.max(leadDays, variant.leadDays);
    leadDaysMin = Math.max(
      leadDaysMin,
      variant.leadDaysMin ?? variant.leadDays,
    );
    return {
      ...line,
      name: product.name,
      variant: variant.name,
      price,
      image: product.images[0],
      production: variant.madeToOrder === true || variant.stock === 0,
    };
  });
  const shipping =
    items.length === 0 || subtotal >= freeThreshold ? 0 : flatRate;
  return {
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    leadDays,
    leadDaysMin,
  };
}
