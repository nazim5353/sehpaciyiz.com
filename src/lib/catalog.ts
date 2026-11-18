import categoryData from "../data/categories.json";
export type Variant = {
  id: string;
  name: string;
  color?: string;
  stock: number;
  leadDays: number;
  leadDaysMin?: number;
  madeToOrder?: boolean;
  surcharge: number;
};
export type Product = {
  id: string;
  sku?: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  previousPrice?: number;
  images: string[];
  originalImages?: string[];
  description: string;
  material: string;
  dimensions: string;
  assembly: string;
  specifications?: { label: string; value: string }[];
  colorNote?: string;
  variants: Variant[];
  featured: boolean;
  active: boolean;
  badge?: string;
  catalogImported?: boolean;
};
export const categories = categoryData;
export const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function variantPrice(product: Product, variant: Variant) {
  return product.price + variant.surcharge;
}
export function isOpportunity(
  product: Pick<Product, "price" | "previousPrice">,
) {
  return (
    !!product.previousPrice && product.price * 100 < product.previousPrice * 80
  );
}
export function leadTimeLabel(minimum: number, maximum: number) {
  return minimum === maximum ? String(maximum) : `${minimum}–${maximum}`;
}
export function fulfillment(variant: Variant) {
  if (variant.madeToOrder)
    return {
      label: "Özel üretim",
      detail: `${leadTimeLabel(variant.leadDaysMin ?? variant.leadDays, variant.leadDays)} iş günü içerisinde`,
      type: "production" as const,
    };
  return variant.stock > 0
    ? {
        label: "Hazır stok",
        detail: `${variant.leadDays} iş günü içinde kargoda`,
        type: "stock" as const,
      }
    : {
        label: "Sipariş üzerine üretim",
        detail: `${variant.leadDays} iş gününde hazırlanır`,
        type: "production" as const,
      };
}
