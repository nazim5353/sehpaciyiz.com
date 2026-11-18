"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play } from "@phosphor-icons/react";
import { money, type Product } from "@/lib/catalog";

export function HeroShowcase({ products, heading, description, productCount, categoryCount, intervalMs = 6500 }: {
  products: Product[];
  heading: string;
  description: string;
  productCount: number;
  categoryCount: number;
  intervalMs?: number;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setVisible(document.visibilityState === "visible");
    motion(); visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", motion); document.removeEventListener("visibilitychange", visibility); };
  }, []);
  const autoPlaying = !paused && !hovered && !focused && !reduced && visible && products.length > 1;
  useEffect(() => {
    if (!autoPlaying) return;
    const timer = window.setInterval(() => setActive(index => (index + 1) % products.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [autoPlaying, intervalMs, products.length]);
  function select(index: number) {
    const next = (index + products.length) % products.length;
    setActive(next);
    setAnnouncement(`${products[next].name}, ${money(products[next].price)}. ${next + 1} / ${products.length}.`);
  }
  return (
    <section className="hero-gallery container" aria-labelledby="hero-heading" data-enter>
      <div className="gallery-copy">
        <p className="gallery-intro">Sehpa, puf ve yaşam alanı koleksiyonu</p>
        <h1 id="hero-heading">{heading}</h1>
        <p className="gallery-description">{description}</p>
        <div className="gallery-actions">
          <Link className="button primary" href="/koleksiyon">Koleksiyonu keşfet</Link>
          <Link className="gallery-about" href="/bilgi/hakkimizda">Sehpacıyız hakkında</Link>
        </div>
        <div className="gallery-notes">
          <span>Siparişe özel üretim</span>
          <span>{productCount} tasarım, {categoryCount} kategori</span>
        </div>
      </div>
      <div className="gallery-stage" role="region" aria-roledescription="ürün sliderı" aria-label="Koleksiyondan seçilmiş tasarımlar"
        onPointerEnter={event => { if (event.pointerType !== "touch") setHovered(true); }} onPointerLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
        <div className="gallery-slides">
          {products.map((product, index) => (
            <div key={product.id} className={`gallery-slide${index === active ? " is-active" : ""}`} aria-hidden={index !== active} role="group" aria-roledescription="slayt" aria-label={`${index + 1} / ${products.length}`}>
              <span className="gallery-category">{product.category}</span>
              <Link className={`gallery-visual${product.categorySlug === "orta-sehpa" ? " gallery-visual-wide" : ""}`} href={`/urun/${product.slug}`} tabIndex={index === active ? 0 : -1} aria-label={`${product.name} ürününü incele`}>
                <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 760px) 100vw, 60vw" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} />
              </Link>
              <Link className="gallery-product" href={`/urun/${product.slug}`} tabIndex={index === active ? 0 : -1}>
                <span><strong>{product.name}</strong><small>{money(product.price)} <span>KDV dahil</span></small></span><span className="gallery-detail">İncele</span>
              </Link>
            </div>
          ))}
        </div>
        <div className="gallery-controls">
          <div className="gallery-dots" role="group" aria-label="Tasarım seçimi">
            {products.map((product, index) => <button key={product.id} type="button" className={index === active ? "is-active" : ""} aria-label={`${index + 1}. tasarım: ${product.name}`} aria-pressed={index === active} onClick={() => select(index)}><span /></button>)}
          </div>
          <div className="gallery-navigation">
            <span className="gallery-position" aria-hidden="true">{String(active + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}</span>
            <button type="button" aria-label="Önceki tasarım" onClick={() => select(active - 1)}><ArrowLeft size={18} /></button>
            <button type="button" aria-label={paused ? "Otomatik ürün geçişlerini başlat" : "Otomatik ürün geçişlerini durdur"} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
            <button type="button" aria-label="Sonraki tasarım" onClick={() => select(active + 1)}><ArrowRight size={18} /></button>
          </div>
        </div>
        <p className="gallery-announcement" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}
