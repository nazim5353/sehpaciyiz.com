"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Minus,
  Plus,
  ArrowRight,
  ShoppingBag,
  Heart,
  Trash,
  MagnifyingGlass,
  Package,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { type Product, money, leadTimeLabel } from "@/lib/catalog";
import { type CartLine, calculateCart } from "@/lib/commerce";
type Quote = ReturnType<typeof calculateCart>;
type StoreContextValue = {
  add: (productId: string, variantId: string, quantity: number) => void;
  toggleFavorite: (id: string) => void;
  favorites: string[];
  count: number;
  openCart: () => void;
  openSearch: () => void;
  openFavorites: () => void;
  products: Product[];
};
const StoreContext = createContext<StoreContextValue | null>(null);
export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("Mağaza sağlayıcısı bulunamadı.");
  return store;
}
export function StoreProvider({
  children,
  products,
  shipping,
}: {
  children: ReactNode;
  products: Product[];
  shipping: { flatRate: number; freeThreshold: number };
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<"cart" | "search" | "favorites" | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("sehpa-store-v1") ?? "{}");
      if (Array.isArray(data.cart))
        setCart(
          data.cart
            .filter(
              (item: CartLine) =>
                item &&
                typeof item.productId === "string" &&
                typeof item.variantId === "string" &&
                Number.isInteger(item.quantity) &&
                item.quantity >= 1 &&
                item.quantity <= 20 &&
                products.some(
                  (p) =>
                    p.active &&
                    p.id === item.productId &&
                    p.variants.some((v) => v.id === item.variantId),
                ),
            )
            .slice(0, 50),
        );
      if (Array.isArray(data.favorites))
        setFavorites(
          data.favorites
            .filter(
              (id: unknown) =>
                typeof id === "string" &&
                products.some((p) => p.active && p.id === id),
            )
            .slice(0, 100),
        );
    } catch {}
    setReady(true);
  }, [products]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "sehpa-store-v1",
          JSON.stringify({ cart, favorites }),
        );
      } catch {}
  }, [cart, favorites, ready]);
  useEffect(() => {
    if (panel !== "cart") return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/cart/quote", {
      method: "POST",
      body: JSON.stringify(cart),
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setQuote(data);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setError(error.message);
          setQuote(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [cart, panel]);
  function add(productId: string, variantId: string, quantity: number) {
    setCart((current) => {
      const found = current.find(
        (line) => line.productId === productId && line.variantId === variantId,
      );
      return found
        ? current.map((line) =>
            line === found
              ? { ...line, quantity: Math.min(20, line.quantity + quantity) }
              : line,
          )
        : [...current, { productId, variantId, quantity }];
    });
    setPanel("cart");
  }
  function change(index: number, delta: number) {
    setCart((current) =>
      current.flatMap((line, i) =>
        i !== index
          ? [line]
          : line.quantity + delta <= 0
            ? []
            : [{ ...line, quantity: Math.min(20, line.quantity + delta) }],
      ),
    );
  }
  const value = useMemo(
    () => ({
      add,
      toggleFavorite: (id: string) =>
        setFavorites((current) =>
          current.includes(id)
            ? current.filter((v) => v !== id)
            : [...current, id],
        ),
      favorites,
      count: cart.reduce((total, line) => total + line.quantity, 0),
      openCart: () => setPanel("cart"),
      openSearch: () => setPanel("search"),
      openFavorites: () => setPanel("favorites"),
      products,
    }),
    [cart, favorites, products],
  );
  const results = products.filter(
    (product) =>
      product.active &&
      (panel === "favorites"
        ? favorites.includes(product.id)
        : `${product.name} ${product.sku ?? ""}`
            .toLocaleLowerCase("tr")
            .includes(query.toLocaleLowerCase("tr"))),
  );
  return (
    <StoreContext.Provider value={value}>
      {children}
      <Dialog.Root
        open={panel !== null}
        onOpenChange={(open) => {
          if (!open) setPanel(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="store-drawer">
            <div className="drawer-heading">
              <Dialog.Title>
                {panel === "cart"
                  ? "Sepetim"
                  : panel === "search"
                    ? "Eviniz için ne arıyorsunuz?"
                    : "Favorilerim"}
              </Dialog.Title>
              <Dialog.Close
                className="icon-button"
                aria-label="Pencereyi kapat"
              >
                <X size={23} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="drawer-description">
              {panel === "cart"
                ? "Seçtiğiniz ürünler ve sipariş özeti."
                : panel === "search"
                  ? "Ürün adını yazarak koleksiyonda arayın."
                  : "Beğendiğiniz ürünleri burada saklayın."}
            </Dialog.Description>
            {panel === "search" && (
              <div className="drawer-search">
                <MagnifyingGlass size={22} />
                <input
                  autoFocus
                  aria-label="Ürün ara"
                  placeholder="Örneğin: Luna, orta sehpa..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            )}
            {panel === "cart" ? (
              <>
                <div className="drawer-scroll">
                  {cart.length === 0 ? (
                    <div className="empty-state">
                      <ShoppingBag size={48} weight="light" />
                      <h3>Burada güzel şeylere yer var.</h3>
                      <p>Beğendiğiniz bir sehpayı seçerek başlayın.</p>
                      <Dialog.Close className="button primary">
                        Koleksiyona dön <ArrowRight size={18} />
                      </Dialog.Close>
                    </div>
                  ) : (
                    cart.map((line, index) => {
                      const product = products.find(
                        (p) => p.id === line.productId,
                      );
                      const variant = product?.variants.find(
                        (v) => v.id === line.variantId,
                      );
                      return (
                        <div
                          className="cart-line"
                          key={`${line.productId}:${line.variantId}`}
                        >
                          <div className="cart-image">
                            {product && (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="90px"
                              />
                            )}
                          </div>
                          <div className="cart-line-info">
                            <strong>
                              {product?.name ?? "Satışta olmayan ürün"}
                            </strong>
                            <span>{variant?.name ?? "Seçenek bulunamadı"}</span>
                            <b>
                              {product && variant
                                ? money(product.price + variant.surcharge)
                                : ""}
                            </b>
                            <div className="quantity small">
                              <button
                                onClick={() => change(index, -1)}
                                aria-label={`${product?.name} adet azalt`}
                              >
                                <Minus size={14} />
                              </button>
                              <span>{line.quantity}</span>
                              <button
                                onClick={() => change(index, 1)}
                                aria-label={`${product?.name} adet artır`}
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          <button
                            className="icon-button"
                            aria-label={`${product?.name} sepetten kaldır`}
                            onClick={() =>
                              setCart((current) =>
                                current.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                {cart.length > 0 && (
                  <div className="cart-summary">
                    {loading && (
                      <p role="status">
                        Güncel fiyat ve stok kontrol ediliyor...
                      </p>
                    )}
                    {error && (
                      <p className="form-error" role="alert">
                        {error}
                      </p>
                    )}
                    {quote && !loading && (
                      <>
                        <div>
                          <span>Ara toplam</span>
                          <strong>{money(quote.subtotal)}</strong>
                        </div>
                        <div>
                          <span>Kargo</span>
                          <strong>
                            {quote.shipping
                              ? money(quote.shipping)
                              : "Ücretsiz"}
                          </strong>
                        </div>
                        <div className="cart-total">
                          <span>Toplam</span>
                          <strong>{money(quote.total)}</strong>
                        </div>
                        <p>
                          <Package size={17} /> Birlikte gönderim:{" "}
                          {leadTimeLabel(quote.leadDaysMin, quote.leadDays)} iş
                          günü içerisinde teslim.
                        </p>
                      </>
                    )}
                    <div className="preview-notice">
                      Örnek mağaza: ödeme henüz açık değil. Sepetiniz bu
                      tarayıcıda saklanır.
                    </div>
                    <button disabled className="button primary full">
                      Ödeme bağlantısı hazırlanıyor
                    </button>
                    <small>
                      {money(shipping.freeThreshold)} ve üzeri örnek
                      siparişlerde kargo ücretsiz.
                    </small>
                  </div>
                )}
              </>
            ) : (
              <div className="drawer-scroll">
                {results.length ? (
                  results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/urun/${product.slug}`}
                      className="search-result"
                      onClick={() => setPanel(null)}
                    >
                      <div className="cart-image">
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          sizes="90px"
                        />
                      </div>
                      <div>
                        <strong>{product.name}</strong>
                        <span>{money(product.price)}</span>
                      </div>
                      <ArrowRight size={20} />
                    </Link>
                  ))
                ) : (
                  <div className="empty-state">
                    <Heart size={42} weight="light" />
                    <h3>
                      {panel === "favorites"
                        ? "Favori köşeniz henüz boş."
                        : "Bu aramada ürün bulunamadı."}
                    </h3>
                    <p>
                      {panel === "favorites"
                        ? "Ürünlerdeki kalbe dokunarak favorilerinize ekleyin."
                        : "Daha kısa bir ürün adı deneyin."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </StoreContext.Provider>
  );
}
