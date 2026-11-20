import Link from "next/link";
import {
  X,
  ArrowRight,
  SlidersHorizontal,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { getProducts } from "@/lib/store";
import { categories, isOpportunity } from "@/lib/catalog";
import { matchesProduct, collectionQuery } from "@/lib/storefront-state";
import { ProductCard } from "@/components/product-card";
import { CollectionSidebar } from "@/components/collection-sidebar";
import { StorePageTransition } from "@/components/store-page-transition";
export const metadata = { title: "Koleksiyon" };
export default async function Collection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = collectionQuery(await searchParams);
  const category = categories.find((c) => c.slug === query.kategori);
  const all = (await getProducts()).filter((p) => p.active);
  const minimum = Number(query.min || 0);
  const maximum = Number(query.max || 1000000);
  const min = Number.isFinite(minimum) ? Math.max(0, minimum) * 100 : 0;
  const max = Number.isFinite(maximum) ? Math.max(0, maximum) * 100 : 100000000;
  const products = all.filter(
    (p) =>
      (!category || p.categorySlug === category.slug) &&
      (!query.q || matchesProduct(p, query.q)) &&
      (query.indirim !== "1" || isOpportunity(p)) &&
      (query.uretim !== "1" || p.variants.some((v) => v.madeToOrder)) &&
      p.price >= min &&
      p.price <= max,
  );
  products.sort(
    query.siralama === "azalan"
      ? (a, b) => b.price - a.price
      : query.siralama === "artan"
        ? (a, b) => a.price - b.price
        : (a, b) =>
            Number(b.featured) - Number(a.featured) ||
            Number(b.id.replace(/\D/g, "")) - Number(a.id.replace(/\D/g, "")),
  );
  const pageSize = 24;
  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const requestedPage = Number(query.sayfa || 1);
  const page = Math.min(
    pageCount,
    Math.max(1, Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1),
  );
  const visibleProducts = products.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  function url(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      ...query,
      sayfa: undefined,
      ...patch,
    }))
      if (value) params.set(key, value);
    const suffix = params.toString();
    return `/koleksiyon${suffix ? `?${suffix}` : ""}`;
  }
  const filtered = !!(
    query.q ||
    query.min ||
    query.max ||
    query.indirim === "1" ||
    query.uretim === "1"
  );
  return (
    <StorePageTransition>
      <main id="main" className="container collection-page">
        <nav className="breadcrumbs" aria-label="Sayfa konumu">
          <Link href="/">Ana sayfa</Link>
          <span>/</span>
          <span>Koleksiyon</span>
          {category && (
            <>
              <span>/</span>
              <span>{category.name}</span>
            </>
          )}
        </nav>
        <div className="collection-intro">
          <div>
            <span className="eyebrow">Sehpacıyız koleksiyonu</span>
            <h1>
              {category?.name ??
                (query.indirim === "1"
                  ? "Seçili tasarımlarda fiyat avantajları"
                  : "Kendi çizgisi olan tasarımlar")}
            </h1>
            <p>
              {query.indirim === "1"
                ? "%20’nin üzerinde indirimle sunulan tasarımları keşfet. Kart ve havalede aynı fiyat geçerli."
                : "Formları, renkleri ve ölçüleri karşılaştırın. Yaşam alanınıza eşlik edecek tasarımı seçin."}
            </p>
          </div>
          <span className="collection-count">
            {products.length}
            <span>tasarım</span>
          </span>
        </div>
        <div className="collection-layout">
          <CollectionSidebar>
            <h2>
              <SlidersHorizontal size={16} /> Koleksiyonu daralt
            </h2>
            <nav className="sidebar-categories" aria-label="Kategoriler">
              <Link
                href={url({ kategori: undefined })}
                className={!category ? "active" : ""}
              >
                Tüm ürünler <span>{all.length}</span>
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={url({ kategori: c.slug })}
                  className={category?.slug === c.slug ? "active" : ""}
                >
                  {c.name}
                  <span>
                    {all.filter((p) => p.categorySlug === c.slug).length}
                  </span>
                </Link>
              ))}
            </nav>
            <form action="/koleksiyon" className="filter-form">
              <div>
                <label htmlFor="collection-search">Ürün adı veya kodu</label>
                <input
                  id="collection-search"
                  name="q"
                  type="search"
                  defaultValue={query.q ?? ""}
                  placeholder="Koleksiyonda ara"
                  maxLength={100}
                />
              </div>
              {query.kategori && (
                <input type="hidden" name="kategori" value={query.kategori} />
              )}
              {query.siralama && (
                <input type="hidden" name="siralama" value={query.siralama} />
              )}
              <div>
                <label htmlFor="min-price">En düşük fiyat (TL)</label>
                <input
                  id="min-price"
                  name="min"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  defaultValue={query.min ?? ""}
                />
              </div>
              <div>
                <label htmlFor="max-price">En yüksek fiyat (TL)</label>
                <input
                  id="max-price"
                  name="max"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Sınır yok"
                  defaultValue={query.max ?? ""}
                />
              </div>
              <label className="filter-check">
                <input
                  type="checkbox"
                  name="indirim"
                  value="1"
                  defaultChecked={query.indirim === "1"}
                />{" "}
                %20 üzeri indirimli ürünler
              </label>
              <label className="filter-check">
                <input
                  type="checkbox"
                  name="uretim"
                  value="1"
                  defaultChecked={query.uretim === "1"}
                />{" "}
                Özel üretim
              </label>
              <button type="submit" className="button primary btn btn--primary">
                Filtreleri uygula <ArrowRight size={16} />
              </button>
              {filtered && (
                <Link
                  className="reset-filters"
                  href={url({
                    q: undefined,
                    min: undefined,
                    max: undefined,
                    indirim: undefined,
                    uretim: undefined,
                  })}
                >
                  Filtreleri temizle
                </Link>
              )}
            </form>
          </CollectionSidebar>
          <div className="collection-results">
            <div className="collection-toolbar">
              <span className="results-count">
                {products.length
                  ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, products.length)} / ${products.length} tasarım`
                  : "Bu filtrede tasarım bulunamadı"}
              </span>
              <form className="sort-form">
                <label htmlFor="sort">Sıralama</label>
                {Object.entries(query)
                  .filter(([key]) => key !== "siralama" && key !== "sayfa")
                  .map(([key, value]) => (
                    <input
                      key={key}
                      type="hidden"
                      name={key}
                      value={value ?? ""}
                    />
                  ))}
                <select
                  id="sort"
                  name="siralama"
                  defaultValue={query.siralama ?? "onerilen"}
                >
                  <option value="onerilen">Önerilen tasarımlar</option>
                  <option value="artan">Fiyat: düşükten yükseğe</option>
                  <option value="azalan">Fiyat: yüksekten düşüğe</option>
                </select>
                <button className="text-link" type="submit">
                  Sırala
                </button>
              </form>
            </div>
            {filtered && (
              <div className="active-filters" aria-label="Uygulanan filtreler">
                {query.q && (
                  <Link href={url({ q: undefined })}>
                    Arama: {query.q} <X size={12} />
                  </Link>
                )}
                {query.min && (
                  <Link href={url({ min: undefined })}>
                    {query.min} TL’den başlayan <X size={12} />
                  </Link>
                )}
                {query.max && (
                  <Link href={url({ max: undefined })}>
                    {query.max} TL’ye kadar <X size={12} />
                  </Link>
                )}
                {query.indirim === "1" && (
                  <Link href={url({ indirim: undefined })}>
                    %20 üzeri indirim <X size={12} />
                  </Link>
                )}
                {query.uretim === "1" && (
                  <Link href={url({ uretim: undefined })}>
                    Özel üretim <X size={12} />
                  </Link>
                )}
              </div>
            )}
            {products.length ? (
              <div className="product-grid">
                {visibleProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h2>Bu seçimde henüz tasarım yok.</h2>
                <p>
                  Fiyat aralığını genişletebilir veya diğer kategorilere göz
                  atabilirsin.
                </p>
                <Link className="button primary" href="/koleksiyon">
                  Tüm ürünleri gör <ArrowRight size={18} />
                </Link>
              </div>
            )}
            {pageCount > 1 && (
              <nav
                className="collection-pagination"
                aria-label="Koleksiyon sayfaları"
              >
                {page > 1 ? (
                  <Link
                    href={url({ sayfa: String(page - 1) })}
                    aria-label="Önceki sayfa"
                  >
                    <CaretLeft size={16} />
                  </Link>
                ) : (
                  <span aria-disabled="true">
                    <CaretLeft size={16} />
                  </span>
                )}
                {Array.from({ length: pageCount }, (_, i) => i + 1).map(
                  (number) => (
                    <Link
                      key={number}
                      className={number === page ? "active" : ""}
                      aria-current={number === page ? "page" : undefined}
                      aria-label={`${number}. sayfa`}
                      href={url({ sayfa: String(number) })}
                    >
                      {number}
                    </Link>
                  ),
                )}
                {page < pageCount ? (
                  <Link
                    href={url({ sayfa: String(page + 1) })}
                    aria-label="Sonraki sayfa"
                  >
                    <CaretRight size={16} />
                  </Link>
                ) : (
                  <span aria-disabled="true">
                    <CaretRight size={16} />
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      </main>
    </StorePageTransition>
  );
}
