"use client";
import { useState, useTransition, ViewTransition } from "react";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { categories, type Product } from "@/lib/catalog";
import { ProductCard } from "./product-card";
const tabs = [
  { id: "all", label: "Tüm tasarımlar" },
  ...categories.map((c) => ({ id: c.slug, label: c.name })),
];
export function HomeProducts({ products }: { products: Product[] }) {
  const [category, setCategory] = useState("all");
  const [isPending, startTransition] = useTransition();
  const matching = products.filter(
    (p) => category === "all" || p.categorySlug === category,
  );
  const chosen = [...matching]
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, 8);
  return (
    <>
      <div
        className="home-product-tabs"
        role="group"
        aria-label="Ürün kategorisi seç"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-pressed={category === tab.id}
            className={category === tab.id ? "active" : ""}
            type="button"
            onClick={() => startTransition(() => setCategory(tab.id))}
          >
            {tab.label}
            <span>
              {
                products.filter(
                  (p) => tab.id === "all" || p.categorySlug === tab.id,
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="product-grid" aria-live="polite" aria-busy={isPending}>
        {chosen.map((product) => (
          <ViewTransition
            key={product.id}
            default="none"
            enter="form-card-in"
            exit="form-card-out"
            update="form-card-move"
          >
            <ProductCard product={product} />
          </ViewTransition>
        ))}
      </div>
      <ViewTransition update="form-card-move" default="none">
        <div className="home-products-more">
          <span>
            {matching.length} tasarımdan {chosen.length} tanesi gösteriliyor.
          </span>
          <Link
            className="text-link"
            href={
              category === "all"
                ? "/koleksiyon"
                : `/koleksiyon?kategori=${category}`
            }
          >
            Tüm tasarımları gör <ArrowUpRight size={18} />
          </Link>
        </div>
      </ViewTransition>
    </>
  );
}
