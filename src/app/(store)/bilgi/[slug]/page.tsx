import { notFound } from "next/navigation";
import { getPublicSettings, readStore } from "@/lib/store";
import { StorePageTransition } from "@/components/store-page-transition";
const pages: Record<string, { title: string; key?: string }> = {
  hakkimizda: { title: "Her açıdan özgün." },
  iletisim: { title: "Yardımcı olalım." },
  teslimat: { title: "Teslimat ve montaj", key: "delivery" },
  iade: { title: "İade ve değişim", key: "returns" },
  gizlilik: { title: "Gizlilik ve KVKK", key: "privacy" },
  satis: { title: "Mesafeli satış sözleşmesi", key: "sales" },
};
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
      : [settings.email, settings.phone].filter(Boolean).join("\n");
  return (
    <StorePageTransition key={slug}>
      <main id="main" className="container info-page">
        <span className="eyebrow">Sehpacıyız</span>
        <h1>{page.title}</h1>
        {content ? (
          <div className="prose">{content}</div>
        ) : (
          <div className="preview-notice">
            {slug === "iletisim"
              ? "İletişim bilgileri mağaza yönetiminden eklenecek."
              : "Bu sayfanın işletmeye özel metni yayın öncesinde hazırlanacak. Önizleme sırasında satış yapılmamaktadır."}
          </div>
        )}
      </main>
    </StorePageTransition>
  );
}
