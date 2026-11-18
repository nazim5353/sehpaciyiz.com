import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkle,
  Check,
  Ruler,
  Package,
  Swatches,
  CaretDown,
} from "@phosphor-icons/react/dist/ssr";
import { getProducts, getPublicSettings } from "@/lib/store";
import { categories, money } from "@/lib/catalog";
import { Benefits } from "@/components/footer";
import { HomeProducts } from "@/components/home-products";
import { StorePageTransition } from "@/components/store-page-transition";
export default async function Home() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getPublicSettings(),
  ]);
  const active = products.filter((p) => p.active);
  const heroProduct =
    active.find((p) => p.id === "p242") ??
    active.find((p) => p.featured) ??
    active[0];
  const title = String(settings.content.heroTitle);
  const sale = active.filter(
    (p) => p.previousPrice && p.previousPrice > p.price,
  );
  const largestDiscount = Math.max(
    0,
    ...sale.map((p) => Math.round((1 - p.price / p.previousPrice!) * 100)),
  );
  return (
    <StorePageTransition>
      <main id="main" className="store-home">
        <section className="hero container" data-enter>
          <div className="hero-copy">
            <span className="eyebrow">Sehpa ve yaşam alanı koleksiyonu</span>
            <h1>{title}</h1>
            <p>{String(settings.content.heroDescription)}</p>
            <div className="hero-actions">
              <Link
                className="button primary btn btn--primary"
                href="/koleksiyon"
              >
                Koleksiyonu keşfet <ArrowUpRight size={21} />
              </Link>
              <Link className="hero-secondary" href="/bilgi/hakkimizda">
                Sehpacıyız hakkında
              </Link>
            </div>
            <div className="hero-facts">
              <span>
                <Check size={15} /> Siparişe özel üretim
              </span>
              <span>
                <Check size={15} /> 7–14 iş günü içerisinde teslim
              </span>
            </div>
            <span className="hero-edition">
              {active.length} tasarım, {categories.length} kategori.
            </span>
          </div>
          <div className="hero-image" data-enter-media="">
            <Image
              src={heroProduct.images[0]}
              alt={heroProduct.name}
              fill
              sizes="(max-width: 900px) 100vw, 60vw"
              loading="eager"
              fetchPriority="high"
            />
            {heroProduct && (
              <Link className="hero-product" href={`/urun/${heroProduct.slug}`}>
                <span>
                  <strong>{heroProduct.name}</strong>
                  <b>{money(heroProduct.price)}</b>
                </span>
                <span className="hero-product-arrow">
                  <ArrowUpRight size={22} />
                </span>
              </Link>
            )}
          </div>
        </section>
        <Benefits />
        <section
          className="shop-section container categories-section"
          id="kategoriler"
        >
          <div className="section-heading">
            <div>
              <h2>Yaşam alanına göre koleksiyon</h2>
            </div>
            <Link className="text-link" href="/koleksiyon">
              Tüm koleksiyonu gör <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((category, i) => (
              <Link
                key={category.slug}
                href={`/koleksiyon?kategori=${category.slug}`}
                className={`category-card category-${i} card`}
              >
                <div className="category-image">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 45vw, 23vw"
                  />
                </div>
                <div className="category-card-copy">
                  <span>
                    <h3>{category.name}</h3>
                    <p>{category.subtitle}</p>
                  </span>
                  <span className="category-arrow">
                    <ArrowUpRight size={22} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
        <section className="shop-section products-section" id="tasarimlar">
          <div className="container">
            <div className="section-heading">
              <div>
                <h2>Koleksiyondan seçkiler</h2>
                <p>
                  Modelleri, renk seçeneklerini ve ürün detaylarını inceleyin.
                </p>
              </div>
              <Link href="/koleksiyon" className="text-link">
                Tüm ürünleri gör <ArrowUpRight size={19} />
              </Link>
            </div>
            <HomeProducts products={active} />
          </div>
        </section>
        <section
          className="shop-section container editorial-section"
          id="ilham"
        >
          <div className="editorial-photo">
            <Image
              src={heroProduct.images[1] ?? heroProduct.images[0]}
              alt={`${heroProduct.name} ürün detayı`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <div className="editorial-copy" data-moment="word-highlight">
            <span className="eyebrow">Form ve detay</span>
            <h2 className="mo-wh__text">
              Tasarımın karakteri <strong>detaylarında.</strong>
            </h2>
            <p>
              Bir tablanın çizgisi, ayakların dengesi, yüzeylerin birlikteliği.
              Tasarımı farklı açılardan inceleyin; yaşam alanınızdaki yerini
              düşünün.
            </p>
            <div className="editorial-points">
              <span>
                <Swatches size={23} /> Renk ve yüzey seçenekleri
              </span>
              <span>
                <Ruler size={23} /> Ölçü ve kullanım bilgileri
              </span>
              <span>
                <Package size={23} /> Siparişe özel üretim
              </span>
            </div>
            <Link
              className="button primary btn btn--primary"
              href={`/urun/${heroProduct.slug}`}
            >
              {heroProduct.name} — İncele <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
        <section className="shop-section container find-section">
          <div>
            <h2>Aradığınız formu bulun</h2>
            <p>
              Kullanım alanını ve fiyat aralığını seçerek koleksiyonu daraltın.
            </p>
          </div>
          <form action="/koleksiyon" className="finder-form">
            <div>
              <label htmlFor="finder-category">Kullanım alanı</label>
              <select id="finder-category" name="kategori">
                <option value="">Tüm tasarımlar</option>
                {categories.map((c) => (
                  <option value={c.slug} key={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="finder-budget">Fiyat aralığı</label>
              <select id="finder-budget" name="max">
                <option value="">Tüm fiyatlar</option>
                <option value="15000">15.000 TL’ye kadar</option>
                <option value="30000">30.000 TL’ye kadar</option>
              </select>
            </div>
            <button className="button primary btn btn--primary" type="submit">
              Tasarımları göster <ArrowRight size={20} />
            </button>
          </form>
        </section>
        {sale.length > 0 && (
          <section className="container sale-banner">
            <div className="sale-mark">
              <Sparkle size={48} weight="light" />
            </div>
            <div>
              <h2>Seçili tasarımlarda fiyat avantajları</h2>
              <p>Seçili ürünlerde %{largestDiscount}’e varan fiyat avantajı.</p>
            </div>
            <Link
              href="/koleksiyon?indirim=1"
              className="button primary btn btn--primary"
            >
              Seçili ürünleri incele <ArrowUpRight size={20} />
            </Link>
          </section>
        )}
        <section className="shop-section container home-faq">
          <div>
            <h2>Seçim ve teslimat hakkında</h2>
            <p>Ürün seçiminden teslimata, bilmeniz gerekenler.</p>
            <Link className="button secondary" href="/bilgi/iletisim">
              İletişime geçin <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="faq-list">
            <details>
              <summary>
                Ürünler nasıl hazırlanıyor?
                <CaretDown size={19} />
              </summary>
              <p>
                Ürünlerimiz siparişe özel üretilir. Teslim süresi 7–14 iş günü
                içerisindedir. Özel renk ve yüzey taleplerini üretim öncesinde
                bizimle paylaşabilirsiniz.
              </p>
            </details>
            <details>
              <summary>
                Kargo ücreti nasıl hesaplanıyor?
                <CaretDown size={19} />
              </summary>
              <p>
                {money(settings.shipping.freeThreshold)} ve üzerindeki
                sepetlerde kargo ücretsiz. Bu tutarın altındaki kargo bedeli{" "}
                {money(settings.shipping.flatRate)}. Güncel tutarı sepetinde
                görebilirsiniz.
              </p>
            </details>
            <details>
              <summary>
                Sehpanın ölçülerini nerede bulabilirim?
                <CaretDown size={19} />
              </summary>
              <p>
                Ürün sayfasındaki “Ölçüler ve montaj” bölümünde. Katalog ölçüsü
                henüz doğrulanmamış ürünler ayrıca belirtilir; seçim yapmadan
                önce bize ulaşabilirsiniz.
              </p>
            </details>
            <details>
              <summary>
                Bu siteden şu anda sipariş verebilir miyim?
                <CaretDown size={19} />
              </summary>
              <p>
                Şu anda mağazanın yerel önizlemesindesiniz. Ürünleri
                inceleyebilir, favorilerinize ve sepetinize ekleyebilirsiniz.
                Ödeme ve gerçek sipariş oluşturma henüz açık değil.
              </p>
            </details>
          </div>
        </section>
      </main>
    </StorePageTransition>
  );
}
