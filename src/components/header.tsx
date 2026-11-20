"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MagnifyingGlass,
  Heart,
  ShoppingBag,
  List,
  X,
  ArrowUpRight,
  ArrowRight,
} from "@phosphor-icons/react";
import { useStore } from "./store-provider";
import { categories } from "@/lib/catalog";
export function Logo({
  name = "Sehpacıyız",
  inverted = false,
}: {
  name?: string;
  inverted?: boolean;
}) {
  return (
    <Link href="/" className="logo" aria-label={`${name} ana sayfa`}>
      <Image
        src={inverted ? "/brand/logo-form-ters.svg" : "/brand/logo-form.svg"}
        alt={name}
        width={558}
        height={97}
        className="brand-logo"
        loading={inverted ? "lazy" : "eager"}
      />
    </Link>
  );
}
export function Header({
  storeName,
  announcement,
}: {
  storeName: string;
  announcement: string;
}) {
  const store = useStore();
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    setMenu(false);
  }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const media = window.matchMedia("(max-width: 640px)");
    if (!media.matches) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigation.current?.querySelector<HTMLElement>("a,button")?.focus();
    const resize = () => {
      if (!media.matches) setMenu(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab") {
        const controls = [
          menuButton.current,
          ...Array.from(
            navigation.current?.querySelectorAll<HTMLElement>(
              "a[href],button:not(:disabled)",
            ) ?? [],
          ),
        ].filter(
          (el): el is HTMLElement => !!el && el.getClientRects().length > 0,
        );
        if (!controls.length) return;
        const index = controls.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", onKey);
      media.removeEventListener("change", resize);
      document.body.style.overflow = overflow;
    };
  }, [menu]);
  return (
    <>
      <div className="announcement">
        <div className="container announcement-inner">
          <span>{announcement}</span>
          <Link href="/bilgi/teslimat">
            Teslimat hakkında <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-inner">
          <button
            className="icon-button mobile-menu"
            ref={menuButton}
            aria-label={menu ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={menu}
            aria-controls="store-navigation"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={24} /> : <List size={24} />}
          </button>
          <Logo name={storeName} />
          <button
            className="header-search"
            onClick={() => {
              setMenu(false);
              store.openSearch();
            }}
          >
            <MagnifyingGlass size={21} />
            <span>Koleksiyonda arayın</span>
            <span className="search-hint">Ara</span>
          </button>
          <div className="header-actions">
            <button
              className="icon-button mobile-search"
              aria-label="Ürünlerde ara"
              onClick={() => {
                setMenu(false);
                store.openSearch();
              }}
            >
              <MagnifyingGlass size={23} />
            </button>
            <button
              className="header-action favorites-button"
              aria-label="Favorilerimi aç"
              onClick={() => {
                setMenu(false);
                store.openFavorites();
              }}
            >
              <span className="action-icon">
                <Heart size={23} />
                {store.favorites.length > 0 && (
                  <span className="count">{store.favorites.length}</span>
                )}
              </span>
              <span>Favorilerim</span>
            </button>
            <button
              className="header-action cart-action"
              aria-label={`Sepeti aç, ${store.count} ürün`}
              onClick={() => {
                setMenu(false);
                store.openCart();
              }}
            >
              <span className="action-icon">
                <ShoppingBag size={23} />
                <span className="count">{store.count}</span>
              </span>
              <span>Sepetim</span>
            </button>
          </div>
        </div>
        <div className="navigation-border">
          <div className="container navigation-row">
            <nav
              ref={navigation}
              id="store-navigation"
              aria-label="Ana menü"
              className={`main-nav collection-nav ${menu ? "is-open" : ""}`}
            >
              <div className="collection-nav-intro">
                <Link href="/koleksiyon" onClick={() => setMenu(false)}>
                  Tüm koleksiyon <ArrowUpRight size={16} />
                </Link>
                <Link
                  className="nav-sale"
                  href="/koleksiyon?indirim=1"
                  onClick={() => setMenu(false)}
                >
                  Fiyat avantajları <ArrowRight size={14} />
                </Link>
              </div>
              <ul className="collection-nav-categories">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/koleksiyon?kategori=${category.slug}`}
                      onClick={() => setMenu(false)}
                    >
                      <span className="collection-nav-image">
                        <Image
                          src={category.navigationImage}
                          alt=""
                          fill
                          sizes="64px"
                        />
                      </span>
                      <span>{category.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                className="mobile-help"
                href="/bilgi/iletisim"
                onClick={() => setMenu(false)}
              >
                İletişime geçin <ArrowRight size={18} />
              </Link>
              <button
                className="mobile-menu-search"
                onClick={() => {
                  setMenu(false);
                  store.openSearch();
                }}
              >
                <MagnifyingGlass size={20} /> Ürün arayın
              </button>
              <button
                className="mobile-nav-favorites"
                onClick={() => {
                  setMenu(false);
                  store.openFavorites();
                }}
              >
                <Heart size={20} /> Favorilerim ({store.favorites.length})
              </button>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
