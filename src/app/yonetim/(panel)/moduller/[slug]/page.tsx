import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckSquare, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { commerceModules } from "@/lib/modules";
export default async function ModulePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const module = commerceModules.find((m) => m.slug === slug);
  if (!module) notFound();
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            {module.group.toLocaleUpperCase("tr")}
          </span>
          <h1>{module.title}</h1>
          <p>{module.description}</p>
        </div>
        <span className="status-badge">{module.status}</span>
      </div>
      <div className="module-placeholder">
        <div className="module-symbol">
          <CheckSquare size={40} weight="light" />
        </div>
        <h2>Bu modül geliştirme kapsamında.</h2>
        <p>
          Bu ekran kapsamı gösterir. Canlı işlem yapmaz ve örnek sipariş ya da
          müşteri verisi üretmez.
        </p>
        <div className="module-capabilities">
          {module.capabilities.map((capability) => (
            <div key={capability}>
              <CheckSquare size={20} />
              <span>{capability}</span>
            </div>
          ))}
        </div>
        <Link className="button secondary" href="/yonetim/kapsam">
          Tüm geliştirme kapsamı <ArrowRight size={18} />
        </Link>
      </div>
    </>
  );
}
