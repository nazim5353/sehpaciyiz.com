import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getProducts, getPublicSettings } from "@/lib/store";
import { ProductDetail } from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { StorePageTransition } from "@/components/store-page-transition";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = (await getProducts()).find(
    (p) => p.slug === slug && p.active,
  );
  return {
    title: product?.name ?? "Ürün bulunamadı",
    description: product?.description,
  };
}
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ renk?: string }>;
}) {
  const { slug } = await params;
  const { renk } = await searchParams;
  const [products, settings] = await Promise.all([
    getProducts(),
    getPublicSettings(),
  ]);
  const product = products.find((p) => p.slug === slug && p.active);
  if (!product) notFound();
  return (
    <StorePageTransition key={slug}>
      <main id="main" className="container product-page">
        <nav className="breadcrumbs" aria-label="Sayfa konumu">
          <Link href="/">Ana sayfa</Link>
          <CaretRight size={12} />
          <Link href={`/koleksiyon?kategori=${product.categorySlug}`}>
            {product.category}
          </Link>
          <CaretRight size={12} />
          <span>{product.name}</span>
        </nav>
        <ProductDetail
          key={`${product.id}-${renk ?? "default"}`}
          product={product}
          initialVariantId={renk}
          freeThreshold={settings.shipping.freeThreshold}
          whatsapp={settings.whatsapp}
        />
        <section className="section related-products">
          <div className="section-heading">
            <div>
              <h2>Birlikte daha güzel.</h2>
              <p>Yaşam alanınıza eşlik edecek diğer tasarımlar.</p>
            </div>
            <Link href="/koleksiyon" className="text-link">
              Koleksiyonu keşfet
            </Link>
          </div>
          <div className="product-grid">
            {products
              .filter((p) => p.active && p.id !== product.id)
              .slice(0, 4)
              .map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
          </div>
        </section>
      </main>
    </StorePageTransition>
  );
}
