export type Variant = {
  id: string;
  name: string;
  color: string;
  stock: number;
  leadDays: number;
  surcharge: number;
};
export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  previousPrice?: number;
  images: string[];
  description: string;
  material: string;
  dimensions: string;
  assembly: string;
  variants: Variant[];
  featured: boolean;
  active: boolean;
  badge?: string;
};
export const categories = [
  {
    name: "Orta sehpalar",
    slug: "orta-sehpa",
    subtitle: "Salonun buluşma noktası",
    image: "/images/luna-studio.webp",
  },
  {
    name: "Yan sehpalar",
    slug: "yan-sehpa",
    subtitle: "Her köşeye bir dokunuş",
    image: "/images/gemora.webp",
  },
  {
    name: "Zigon sehpalar",
    slug: "zigon-sehpa",
    subtitle: "Birlikte de ayrı da güzel",
    image: "/images/paloma.webp",
  },
  {
    name: "Dresuarlar",
    slug: "dresuar",
    subtitle: "Hoş bir karşılama",
    image: "/images/siena.webp",
  },
];
const variants: Variant[] = [
  {
    id: "mese",
    name: "Doğal meşe",
    color: "#c7a777",
    stock: 8,
    leadDays: 3,
    surcharge: 0,
  },
  {
    id: "ceviz",
    name: "Ceviz",
    color: "#76513d",
    stock: 0,
    leadDays: 14,
    surcharge: 20000,
  },
  {
    id: "krem",
    name: "Kırık beyaz",
    color: "#e7e2d9",
    stock: 4,
    leadDays: 3,
    surcharge: 0,
  },
];
export const seedProducts: Product[] = [
  {
    id: "luna",
    slug: "luna-oval-orta-sehpa",
    name: "Luna Oval Orta Sehpa",
    category: "Orta sehpalar",
    categorySlug: "orta-sehpa",
    price: 429000,
    previousPrice: 499000,
    images: [
      "/images/luna-studio.webp",
      "/images/living-room.webp",
      "/images/luna-detail.webp",
    ],
    description:
      "Yuvarlak hatlar, doğal bir görünüm, günlük hayata yer açan bir raf. Luna, kahvenizden sevdiğiniz kitaplara kadar her şeyi bir araya getirir.",
    material: "Meşe görünümlü kaplama, ahşap ayak",
    dimensions: "110 × 60 × 42 cm",
    assembly: "Kolay kurulum, bağlantı elemanları kutuda",
    variants,
    featured: true,
    active: true,
    badge: "Yeni koleksiyon",
  },
  {
    id: "mina",
    slug: "mina-ikili-yan-sehpa",
    name: "Mina İkili Yan Sehpa",
    category: "Yan sehpalar",
    categorySlug: "yan-sehpa",
    price: 279000,
    images: ["/images/gemora.webp"],
    description:
      "Koltuk yanında ya da en sevdiğiniz köşede. İkili formuyla ihtiyacınız olan yere kolayca uyum sağlar.",
    material: "Kaplama yüzey, metal gövde",
    dimensions: "Ölçüler katalogla kesinleştirilecek",
    assembly: "Kurulum bilgisi katalogla kesinleştirilecek",
    variants,
    featured: true,
    active: true,
  },
  {
    id: "pera",
    slug: "pera-ikili-zigon-sehpa",
    name: "Pera İkili Zigon Sehpa",
    category: "Zigon sehpalar",
    categorySlug: "zigon-sehpa",
    price: 349000,
    previousPrice: 399000,
    images: ["/images/paloma.webp"],
    description:
      "Misafir geldiğinde yan yana, günlük kullanımda iç içe. Yaşam alanınıza uyum sağlayan iki kullanışlı parça.",
    material: "Ahşap görünümlü yüzey",
    dimensions: "Ölçüler katalogla kesinleştirilecek",
    assembly: "Kurulum bilgisi katalogla kesinleştirilecek",
    variants,
    featured: true,
    active: true,
    badge: "Set avantajı",
  },
  {
    id: "ada",
    slug: "ada-yuvarlak-orta-sehpa",
    name: "Ada Yuvarlak Orta Sehpa",
    category: "Orta sehpalar",
    categorySlug: "orta-sehpa",
    price: 549000,
    images: ["/images/siena.webp"],
    description:
      "Sade formu ve kullanışlı yüzeyiyle salonunuzun merkezinde kendine yer bulur.",
    material: "Kaplama yüzey, metal detay",
    dimensions: "Ölçüler katalogla kesinleştirilecek",
    assembly: "Kurulum bilgisi katalogla kesinleştirilecek",
    variants,
    featured: true,
    active: true,
  },
];
export const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(cents / 100);
export function variantPrice(product: Product, variant: Variant) {
  return product.price + variant.surcharge;
}
export function fulfillment(variant: Variant) {
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
