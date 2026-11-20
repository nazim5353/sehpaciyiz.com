import { type Product, type Variant } from "./catalog";
import type { CartLine } from "./commerce";

export function quantityLimit(variant: Variant) {
  return Math.min(
    20,
    variant.stock > 0 && !variant.madeToOrder ? variant.stock : 20,
  );
}

// Browser storage is untrusted and may belong to an older catalogue version.
export function restoreStorefront(value: unknown, products: Product[]) {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const active = new Map(
    products.filter((p) => p.active).map((p) => [p.id, p]),
  );
  const merged = new Map<string, CartLine>();
  for (const item of Array.isArray(data.cart) ? data.cart : []) {
    if (!item || typeof item !== "object") continue;
    const { productId, variantId, quantity } = item;
    const variant = active
      .get(productId)
      ?.variants.find((v) => v.id === variantId);
    if (
      !variant ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    )
      continue;
    const key = JSON.stringify([productId, variantId]);
    if (!merged.has(key) && merged.size >= 50) continue;
    merged.set(key, {
      productId,
      variantId,
      quantity: Math.min(
        quantityLimit(variant),
        (merged.get(key)?.quantity ?? 0) + quantity,
      ),
    });
  }
  const favorites = [
    ...new Set<string>(
      (Array.isArray(data.favorites) ? data.favorites : []).filter(
        (id): id is string => typeof id === "string" && active.has(id),
      ),
    ),
  ].slice(0, 100);
  return { cart: [...merged.values()], favorites };
}

export function searchText(value: string) {
  return value
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .trim();
}

export function matchesProduct(product: Product, query: string) {
  const haystack = searchText(
    `${product.name} ${product.sku ?? ""} ${product.category} ${product.material}`,
  );
  return searchText(query)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

export function collectionQuery(
  raw: Record<string, string | string[] | undefined>,
) {
  const query: Record<string, string | undefined> = {};
  for (const key of [
    "q",
    "kategori",
    "min",
    "max",
    "indirim",
    "uretim",
    "siralama",
    "sayfa",
  ]) {
    const value = raw[key];
    query[key] = (Array.isArray(value) ? value[0] : value)
      ?.trim()
      .slice(0, 100);
  }
  return query;
}
