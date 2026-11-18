import Link from "next/link";
import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { commerceModules } from "@/lib/modules";
import { settingsDefinitions } from "@/lib/settings";
export default function ScopePage() {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">PROJE KAPSAMI</span>
          <h1>E-ticaretin tamamı, görünür bir plan.</h1>
          <p>
            Hazır ekranlar, çalışan yerel işlemler ve canlıya geçmeden
            tamamlanacak modüller.
          </p>
        </div>
      </div>
      <div className="scope-intro">
        <CheckCircle size={25} />
        <div>
          <strong>Bu teslim: mağaza vitrini ve yönetim temeli</strong>
          <p>
            Ana sayfa, ürün detayı, koleksiyon, arama, favoriler, sepet
            hesaplama, ürün düzenleme ve ayar kaydı yerelde çalışır. Canlı
            tahsilat ve operasyon servisleri henüz devrede değildir.
          </p>
        </div>
      </div>
      <h2 className="scope-heading">Çalışan ayar ekranları</h2>
      <div className="scope-grid">
        {Object.entries(settingsDefinitions).map(([key, definition]) => (
          <Link href={`/yonetim/ayarlar/${key}`} key={key}>
            <div>
              <h3>{definition.title}</h3>
              <ArrowUpRight size={18} />
            </div>
            <p>{definition.description}</p>
            <span className="status-badge green">Ayar kaydı hazır</span>
          </Link>
        ))}
      </div>
      <h2 className="scope-heading">Operasyon modülleri</h2>
      <div className="scope-grid">
        {commerceModules.map((module) => (
          <Link href={`/yonetim/moduller/${module.slug}`} key={module.slug}>
            <div>
              <h3>{module.title}</h3>
              <ArrowUpRight size={18} />
            </div>
            <p>{module.description}</p>
            <span className="status-badge">{module.status}</span>
          </Link>
        ))}
      </div>
      <div className="admin-inline-note">
        Yayın kapısı: gerçek katalog, PostgreSQL veri adaptörü, rol yönetimi,
        İyzico sandbox senaryoları, kargo adaptörü, SMTP gönderimleri, yasal
        içerikler, KVKK/çerez izinleri, yedek geri yükleme ve uçtan uca sipariş
        testleri.
      </div>
    </>
  );
}
