"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ArrowUpRight, ShoppingBag, Check } from "@phosphor-icons/react";
import { type Product, money, variantPrice, fulfillment } from "@/lib/catalog";
import { useStore } from "./store-provider";
export function ProductCard({ product }: { product: Product }) {
  const { favorites, toggleFavorite, add } = useStore();
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const variant = product.variants.find((v) => v.id === variantId)!;
  const price = variantPrice(product, variant);
  const delivery = fulfillment(variant);
  const favorite = favorites.includes(product.id);
  const discount =
    product.previousPrice && product.previousPrice > price
      ? Math.round((1 - price / product.previousPrice) * 100)
      : 0;
  const href = `/urun/${product.slug}?renk=${variant.id}`;
  return (
    <article className="product-card card">
      <div
        className={`product-card-image${product.images.length > 1 ? " has-alternate" : ""}`}
      >
        <Link
          className="m-zoom"
          href={href}
          aria-label={`${product.name} ürününü incele`}
        >
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 23vw"
          />
          {product.images.length > 1 && (
            <Image
              className="product-alternate"
              src={product.images[1]}
              alt=""
              fill
              sizes="(max-width: 640px) 90vw, 23vw"
            />
          )}
        </Link>
        <div className="card-badges">
          {discount > 0 ? (
            <span className="discount-badge">%{discount} avantaj</span>
          ) : product.badge ? (
            <span className="new-badge">{product.badge}</span>
          ) : null}
        </div>
        <button
          className={`favorite-control ${favorite ? "selected" : ""}`}
          aria-label={`${product.name} ${favorite ? "favorilerden çıkar" : "favorilere ekle"}`}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(product.id)}
        >
          <Heart size={21} weight={favorite ? "fill" : "regular"} />
        </button>
        <Link className="card-view" href={href}>
          Ürünü incele <ArrowUpRight size={17} />
        </Link>
      </div>
      <div className="product-card-info">
        <span className="product-category">{product.category}</span>
        <Link className="product-card-title" href={href}>
          {product.name}
        </Link>
        <div className="product-card-prices">
          <strong>{money(price)}</strong>
          {discount > 0 && <del>{money(product.previousPrice!)}</del>}
          <span>KDV dahil</span>
        </div>
        {product.variants.length > 1 ? (
          <div className="card-options">
            <div
              className="card-swatches"
              aria-label={`${product.name} renk seçenekleri`}
            >
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  className={v.id === variant.id ? "swatch selected" : "swatch"}
                  aria-label={`${product.name}, ${v.name}`}
                  aria-pressed={v.id === variant.id}
                  onClick={() => setVariantId(v.id)}
                  style={{ "--swatch": v.color } as React.CSSProperties}
                >
                  <span />
                </button>
              ))}
            </div>
            <span>{variant.name}</span>
          </div>
        ) : (
          <div className="card-options catalog-options">
            <span>Ürün kodu: {product.sku}</span>
          </div>
        )}
        <div className={`card-availability ${delivery.type}`}>
          <Check size={14} />
          <span>
            {variant.madeToOrder
              ? `${delivery.label} · ${delivery.detail}`
              : delivery.detail}
          </span>
        </div>
        <button
          className="card-add"
          onClick={() => add(product.id, variant.id, 1)}
          aria-label={`${product.name} sepete ekle`}
        >
          <ShoppingBag size={17} /> Sepete ekle <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}
