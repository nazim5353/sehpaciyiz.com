import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicSettings, readStore } from "@/lib/store";
import { StorePageTransition } from "@/components/store-page-transition";
import { infoPages as pages } from "@/lib/info-pages";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return {
    title: pages[slug]?.title ?? "Sayfa bulunamadı",
    alternates: { canonical: `/bilgi/${slug}` },
  };
}
export default async function InfoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  const [settings, store] = await Promise.all([
    getPublicSettings(),
    readStore(),
  ]);
  const content = page.key
    ? String(store.settings.yasal[page.key])
    : slug === "hakkimizda"
      ? String(settings.content.about)
      : "";
  return (
    <StorePageTransition key={slug}>
      <main id="main" className="container info-page">
        <span className="eyebrow">Sehpacıyız</span>
        <h1>{page.title}</h1>
        {content ? (
          <div className="prose">{content}</div>
        ) : (
          <div className="prose">
            {page.paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        )}
        {slug === "iletisim" && (
          <div className="info-contact-actions">
            {settings.email && (
              <a className="button primary" href={`mailto:${settings.email}`}>
                E-posta gönder
              </a>
            )}
            {settings.phone && (
              <a
                className="button secondary"
                href={`tel:${settings.phone.replace(/[^+\d]/g, "")}`}
              >
                Telefonla ara
              </a>
            )}
            {/^\d{10,15}$/.test(settings.whatsapp) && (
              <a
                className="button secondary"
                href={`https://wa.me/${settings.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp ile yaz
              </a>
            )}
            {!settings.email &&
              !settings.phone &&
              !/^\d{10,15}$/.test(settings.whatsapp) && (
                <p>
                  İletişim kanalları satış açıldığında burada yayınlanacaktır.
                </p>
              )}
          </div>
        )}
        <nav className="info-links" aria-label="Yardım konuları">
          {Object.entries(pages)
            .filter(([key]) => key !== slug)
            .map(([key, value]) => (
              <Link key={key} href={`/bilgi/${key}`}>
                {value.title}
              </Link>
            ))}
          <Link href="/koleksiyon">Koleksiyonu incele</Link>
        </nav>
      </main>
    </StorePageTransition>
  );
}
