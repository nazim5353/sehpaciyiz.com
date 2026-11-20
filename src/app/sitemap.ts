import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/store";
import { absoluteUrl, indexable } from "@/lib/site";
import { infoPages } from "@/lib/info-pages";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexable) return [];
  return [
    "/",
    "/koleksiyon",
    ...Object.keys(infoPages).map((slug) => `/bilgi/${slug}`),
    ...(await getProducts())
      .filter((p) => p.active)
      .map((p) => `/urun/${p.slug}`),
  ].map((path) => ({ url: absoluteUrl(path) }));
}
