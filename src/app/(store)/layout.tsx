import { getProducts, getPublicSettings } from "@/lib/store";
import { StoreProvider } from "@/components/store-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { StorefrontMotion } from "@/components/storefront-motion";
import "./storefront.css";
import "./catalog.css";
import "./form-brand.css";
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [products, settings] = await Promise.all([
    getProducts(),
    getPublicSettings(),
  ]);
  return (
    <StoreProvider products={products} shipping={settings.shipping}>
      <div className="storefront">
        <link
          rel="stylesheet"
          href="/design/motion/motion.css"
          precedence="default"
        />
        <a className="skip-link" href="#main">
          İçeriğe geç
        </a>
        <Header
          storeName={settings.storeName}
          announcement={String(settings.content.announcement)}
        />
        {children}
        <Footer
          name={settings.storeName}
          about={String(settings.content.about)}
          email={settings.email}
          phone={settings.phone}
        />
      </div>
      <StorefrontMotion />
    </StoreProvider>
  );
}
