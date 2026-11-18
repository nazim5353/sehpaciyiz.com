import Link from "next/link";
import {
  ArrowUpRight,
  ShieldCheck,
  Package,
  Armchair,
  CreditCard,
} from "@phosphor-icons/react/dist/ssr";
import { Logo } from "./header";
import { categories } from "@/lib/catalog";
export function Benefits() {
  return (
    <div className="benefits container">
      {[
        {
          icon: Armchair,
          title: "Özgün modeller",
          text: "Yaşam alanına karakter katan formlar",
        },
        {
          icon: Package,
          title: "Siparişe özel üretim",
          text: "Hazırlık süresi ürün detayında",
        },
        {
          icon: CreditCard,
          title: "Açık ürün bilgisi",
          text: "Ölçü, renk ve fiyat bir arada",
        },
        {
          icon: ShieldCheck,
          title: "Seçim desteği",
          text: "Ürün hakkında bize ulaşın",
        },
      ].map(({ icon: Icon, title, text }) => (
        <div key={title}>
          <Icon size={30} weight="light" />
          <div>
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
export function Footer({
  name,
  about,
  email,
  phone,
}: {
  name: string;
  about: string;
  email: string;
  phone: string;
}) {
  return (
    <footer className="site-footer footer-formal">
      <div className="container footer-opening">
        <h2>Her açıdan özgün.</h2>
        <Link href="/koleksiyon">Koleksiyonu incele</Link>
      </div>
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo name={name} />
          <p>{about}</p>
          <Link className="social-link" href="/bilgi/iletisim">
            <Armchair size={22} /> Koleksiyonu birlikte değerlendirelim{" "}
            <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          <h3>Koleksiyonu keşfet</h3>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/koleksiyon?kategori=${category.slug}`}
            >
              {category.name}
            </Link>
          ))}
          <Link href="/koleksiyon?indirim=1">Fiyat avantajları</Link>
        </div>
        <div>
          <h3>Yardımcı olalım</h3>
          <Link href="/bilgi/teslimat">Teslimat ve montaj</Link>
          <Link href="/bilgi/iade">İade ve değişim</Link>
          <Link href="/bilgi/iletisim">İletişim</Link>
          {email && <a href={`mailto:${email}`}>{email}</a>}
          {phone && <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}>{phone}</a>}
        </div>
        <div>
          <h3>Sehpacıyız</h3>
          <Link href="/bilgi/hakkimizda">Hakkımızda</Link>
          <Link href="/bilgi/gizlilik">Gizlilik ve KVKK</Link>
          <Link href="/bilgi/satis">Mesafeli satış sözleşmesi</Link>
          <Link href="/yonetim">
            Yönetim paneli <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {name}. Her açıdan özgün.
        </span>
        <span>
          Yerel mağaza önizlemesi. Ödeme ve sipariş oluşturma henüz açık değil.
        </span>
      </div>
    </footer>
  );
}
