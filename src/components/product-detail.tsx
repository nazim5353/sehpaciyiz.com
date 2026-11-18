"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Heart,
  Minus,
  Plus,
  Package,
  Ruler,
  ShieldCheck,
  Hammer,
  CaretDown,
  ArrowsOut,
  X,
  Check,
  WhatsappLogo,
} from "@phosphor-icons/react";
import {
  type Product,
  money,
  variantPrice,
  fulfillment,
  leadTimeLabel,
} from "@/lib/catalog";
import { useStore } from "./store-provider";
export function ProductDetail({
  product,
  freeThreshold,
  whatsapp,
  initialVariantId,
}: {
  product: Product;
  freeThreshold: number;
  whatsapp: string;
  initialVariantId?: string;
}) {
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.id === initialVariantId)?.id ??
      product.variants[0].id,
  );
  const [quantity, setQuantity] = useState(1);
  const [image, setImage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId)!;
  const delivery = fulfillment(variant);
  const price = variantPrice(product, variant);
  const store = useStore();
  const favorite = store.favorites.includes(product.id);
  const max = Math.min(20, variant.stock > 0 ? variant.stock : 20);
  return (
    <>
      <div className="product-layout">
        <div className="product-gallery">
          <button
            className="gallery-main"
            onClick={() => setZoom(true)}
            aria-label="Ürün görselini büyüt"
          >
            <Image
              src={product.images[image]}
              alt={`${product.name}, ${image + 1}. ürün görünümü`}
              fill
              sizes="(max-width: 768px) 100vw, 55vw"
              loading="eager"
              fetchPriority="high"
            />
            <span className="zoom-icon">
              <ArrowsOut size={22} />
            </span>
          </button>
          <div className="gallery-thumbnails" aria-label="Ürün görselleri">
            {product.images.map((src, i) => (
              <button
                key={src}
                onClick={() => setImage(i)}
                className={i === image ? "selected" : ""}
                aria-label={`${i + 1}. ürün görseli`}
                aria-pressed={image === i}
              >
                <Image src={src} alt="" fill sizes="100px" />
              </button>
            ))}
          </div>
          <p className="image-disclosure">
            Ürün görselleri kataloğa aittir. Özel renk ve yüzey taleplerinizi
            üretim öncesinde bizimle paylaşabilirsiniz.
          </p>
        </div>
        <div className="product-purchase">
          <div className="product-overline">
            <Link href={`/koleksiyon?kategori=${product.categorySlug}`}>
              {product.category}
            </Link>
            <span>Ürün kodu: {product.sku ?? "Bilgi alın"}</span>
          </div>
          <h1>{product.name}</h1>
          <p className="product-intro">{product.description}</p>
          <div className="detail-prices">
            <strong>{money(price)}</strong>
            {product.previousPrice && product.previousPrice > price && (
              <del>{money(product.previousPrice)}</del>
            )}
          </div>
          <span className="tax-note">
            KDV dahil{variant.madeToOrder ? " · Siparişe özel üretim" : ""}
          </span>
          <p className="payment-price-note">Kart ve havalede aynı fiyat.</p>
          {product.variants.length > 1 && (
            <div className="variant-picker">
              <p>
                Renk: <strong>{variant.name}</strong>
              </p>
              <div>
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    className={
                      variant.id === v.id
                        ? "color-option selected"
                        : "color-option"
                    }
                    style={{ "--swatch": v.color } as React.CSSProperties}
                    aria-label={v.name}
                    aria-pressed={variant.id === v.id}
                    onClick={() => {
                      setVariantId(v.id);
                      setQuantity(1);
                    }}
                  >
                    {variant.id === v.id && <Check size={18} />}
                  </button>
                ))}
              </div>
            </div>
          )}
          {product.colorNote && (
            <p className="product-color-note">{product.colorNote}</p>
          )}
          <div className={`delivery-state ${delivery.type}`}>
            <Package size={23} weight="light" />
            <div>
              <strong>{delivery.label}</strong>
              <span>{delivery.detail}</span>
            </div>
            {variant.stock > 0 && !variant.madeToOrder && (
              <span className="stock-count">{variant.stock} adet</span>
            )}
          </div>
          <div className="purchase-actions">
            <div className="quantity">
              <button
                aria-label="Adet azalt"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity === 1}
              >
                <Minus size={17} />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                aria-label="Adet artır"
                onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                disabled={quantity >= max}
              >
                <Plus size={17} />
              </button>
            </div>
            <button
              className="button primary add-cart"
              onClick={() => store.add(product.id, variant.id, quantity)}
            >
              Sepete ekle <ArrowRight size={21} />
            </button>
            <button
              className={`detail-favorite ${favorite ? "selected" : ""}`}
              aria-label={
                favorite ? "Ürünü favorilerden çıkar" : "Ürünü favorilere ekle"
              }
              aria-pressed={favorite}
              onClick={() => store.toggleFavorite(product.id)}
            >
              <Heart size={23} weight={favorite ? "fill" : "regular"} />
            </button>
          </div>
          <p className="shipping-note">
            <Check size={16} /> {money(freeThreshold)} ve üzeri siparişlerde
            ücretsiz kargo.
          </p>
          <div className="product-quick-specs">
            <div>
              <Ruler size={23} weight="light" />
              <span>
                Ölçüler<strong>{product.dimensions}</strong>
              </span>
            </div>
            <div>
              <Hammer size={23} weight="light" />
              <span>
                Kurulum<strong>Montaj bilgisi aşağıda</strong>
              </span>
            </div>
          </div>
          <div className="product-disclosures">
            <details open>
              <summary>
                Malzeme ve ürün özellikleri <CaretDown size={17} />
              </summary>
              <p>{product.description}</p>
              {product.specifications?.length ? (
                <dl className="product-specifications">
                  {product.specifications.map((spec) => (
                    <div key={spec.label}>
                      <dt>{spec.label}</dt>
                      <dd>{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>{product.material}</p>
              )}
            </details>
            <details>
              <summary>
                Ölçüler ve montaj <CaretDown size={17} />
              </summary>
              <p>
                {product.dimensions}. {product.assembly}
              </p>
            </details>
            <details>
              <summary>
                Teslimat ve iade <CaretDown size={17} />
              </summary>
              <p>
                {variant.madeToOrder
                  ? `Bu ürün siparişinize özel üretilir. Teslim süresi ${leadTimeLabel(variant.leadDaysMin ?? variant.leadDays, variant.leadDays)} iş günü içerisindedir.`
                  : `Hazırlık süresi ${variant.leadDays} iş günüdür.`}{" "}
                Karma sepetler birlikte hazırlanır. Teslimat ve iade ayrıntıları
                için bizimle iletişime geçebilirsiniz.
              </p>
            </details>
            <details>
              <summary>
                Ödeme seçenekleri <CaretDown size={17} />
              </summary>
              <p>
                İyzico kartla ödeme bağlantısı hazırlanıyor. Taksit seçenekleri
                bağlantı tamamlandığında kartınıza ve işyeri hesabına göre
                gösterilecek. Bu önizlemede ödeme alınmaz.
              </p>
            </details>
          </div>
          {/^\d{10,15}$/.test(whatsapp) && (
            <a
              className="product-help"
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`${product.name} (${variant.name}) hakkında bilgi almak istiyorum.`)}`}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsappLogo size={21} /> Bu ürün hakkında konuşalım{" "}
              <ArrowRight size={16} />
            </a>
          )}
          <p className="secure-note">
            <ShieldCheck size={18} /> Ödeme öncesinde toplam fiyatı ve hazırlık
            süresini görün.
          </p>
        </div>
      </div>
      <Dialog.Root open={zoom} onOpenChange={setZoom}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="zoom-dialog">
            <Dialog.Title className="sr-only">
              {product.name} büyük görsel
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Ürünün katalog görseli.
            </Dialog.Description>
            <Dialog.Close
              className="icon-button zoom-close"
              aria-label="Görseli kapat"
            >
              <X size={25} />
            </Dialog.Close>
            <Image
              src={product.images[image]}
              alt={product.name}
              fill
              sizes="90vw"
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
