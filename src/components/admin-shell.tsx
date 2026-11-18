"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  SquaresFour,
  ShoppingBag,
  Package,
  Receipt,
  Bank,
  CalendarBlank,
  ChartBar,
  Users,
  CheckSquare,
  GearSix,
  ArrowUpRight,
  List,
  X,
  SignOut,
  Key,
  Coins,
} from "@phosphor-icons/react";
import type { Operator } from "@/lib/operations/types";
import { UtilityForm } from "./company-forms";
const items = [
  { href: "/yonetim", label: "Yönetim özeti", icon: SquaresFour },
  {
    href: "/yonetim/satislar",
    label: "Satışlar & tahsilatlar",
    icon: ShoppingBag,
  },
  { href: "/yonetim/alimlar", label: "Ürün & malzeme alımları", icon: Package },
  { href: "/yonetim/giderler", label: "Diğer giderler", icon: Receipt },
  { href: "/yonetim/vergiler", label: "Vergiler & resmi ödemeler", icon: Bank },
  { href: "/yonetim/takvim", label: "Ödeme takvimi", icon: CalendarBlank },
  { href: "/yonetim/kasa", label: "Kasa & banka", icon: Bank, owner: true },
  {
    href: "/yonetim/raporlar",
    label: "Mali raporlar",
    icon: ChartBar,
    owner: true,
  },
  {
    href: "/yonetim/maliyetler",
    label: "Ürün maliyetleri",
    icon: Coins,
    owner: true,
  },
  {
    href: "/yonetim/onaylar",
    label: "Düzeltmeler & onaylar",
    icon: CheckSquare,
  },
  {
    href: "/yonetim/ekip",
    label: "Personel & işlem geçmişi",
    icon: Users,
    owner: true,
  },
];
export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: Operator;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState(false);
  return (
    <div className="company-shell">
      <aside
        id="company-navigation"
        className={`company-sidebar ${open ? "is-open" : ""}`}
      >
        <div className="company-sidebar-brand">
          <Link className="company-wordmark" href="/yonetim">
            sehpacıyız<span>.</span>
          </Link>
          <small>ŞİRKET YÖNETİMİ</small>
          <button
            className="company-icon company-nav-close"
            onClick={() => setOpen(false)}
            aria-label="Menüyü kapat"
          >
            <X size={22} />
          </button>
        </div>
        <nav aria-label="Şirket yönetimi">
          <span className="company-nav-label">ÇALIŞMA ALANI</span>
          {items
            .filter((i) => !i.owner || user.role === "OWNER")
            .map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={pathname === href ? "active" : ""}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon
                  size={19}
                  weight={pathname === href ? "fill" : "regular"}
                />
                {label}
              </Link>
            ))}
          {user.role === "OWNER" && (
            <>
              <span className="company-nav-label">WEB MAĞAZASI</span>
              <Link href="/yonetim/urunler" onClick={() => setOpen(false)}>
                <Package size={19} />
                Ürün kataloğu
              </Link>
              <Link
                href="/yonetim/ayarlar/genel"
                onClick={() => setOpen(false)}
              >
                <GearSix size={19} />
                Mağaza ayarları
              </Link>
            </>
          )}
        </nav>
        <div className="company-sidebar-user">
          <span className="company-avatar">
            {user.name.slice(0, 1).toLocaleUpperCase("tr")}
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>
              {user.preview
                ? "Yerel önizleme"
                : user.role === "OWNER"
                  ? "Şirket sahibi"
                  : "Personel"}
            </small>
          </div>
          {!user.preview && (
            <form action="/api/admin/session" method="post">
              <input type="hidden" name="action" value="logout" />
              <button
                className="company-icon"
                aria-label="Oturumu kapat"
                title="Oturumu kapat"
              >
                <SignOut size={20} />
              </button>
            </form>
          )}
        </div>
      </aside>
      {open && (
        <button
          className="company-nav-backdrop"
          aria-label="Menüyü kapat"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="company-body">
        <header className="company-topbar">
          <div>
            <button
              className="company-icon company-nav-toggle"
              aria-label="Menüyü aç"
              aria-expanded={open}
              aria-controls="company-navigation"
              onClick={() => setOpen(true)}
            >
              <List size={23} />
            </button>
            <span>
              Sehpacıyız <b>/</b> Çalışma alanı
            </span>
          </div>
          <div>
            <span className="company-local">
              {user.preview ? "Girişsiz önizleme" : "Yerel çalışma"}
            </span>
            {!user.preview && (
              <button
                className="company-icon"
                aria-label="Şifremi değiştir"
                title="Şifremi değiştir"
                onClick={() => setPassword(true)}
              >
                <Key size={19} />
              </button>
            )}
            <Link href="/" target="_blank">
              Mağazaya git <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
        <main className="company-main">{children}</main>
        <footer className="company-footer">
          Sehpacıyız şirket yönetimi{" "}
          <span>Satış kanalları manuel kayıt ile işlenir.</span>
        </footer>
      </div>
      {password && (
        <UtilityForm
          mode="password"
          close={() => setPassword(false)}
          done={() => {
            window.location.href = "/yonetim/giris";
          }}
        />
      )}
    </div>
  );
}
