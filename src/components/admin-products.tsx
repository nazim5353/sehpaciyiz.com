"use client";
import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  MagnifyingGlass,
  PencilSimple,
  X,
  FloppyDisk,
  ArrowUpRight,
} from "@phosphor-icons/react";
import { type Product, money } from "@/lib/catalog";
export function AdminProducts({ initial }: { initial: Product[] }) {
  const [products, setProducts] = useState(initial);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          price: editing.price,
          active: editing.active,
          featured: editing.featured,
          variants: editing.variants.map(
            ({ id, stock, leadDays, surcharge }) => ({
              id,
              stock,
              leadDays,
              surcharge,
            }),
          ),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProducts((current) =>
        current.map((p) => (p.id === editing.id ? editing : p)),
      );
      setEditing(null);
      setMessage("Ürün kaydedildi. Değişiklikler mağazaya yansıtıldı.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ürün kaydedilemedi.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="admin-table-panel">
        <div className="table-toolbar">
          <div className="admin-search">
            <MagnifyingGlass size={19} />
            <input
              aria-label="Ürünlerde ara"
              placeholder="Ürün adı veya ürün kodu ara..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <span>{products.length} ürün</span>
        </div>
        <div className="table-overflow">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Kategori</th>
                <th>Satış fiyatı</th>
                <th>Hazır stok</th>
                <th>Durum</th>
                <th>
                  <span className="sr-only">İşlemler</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products
                .filter((p) =>
                  `${p.name} ${p.id}`
                    .toLocaleLowerCase("tr")
                    .includes(query.toLocaleLowerCase("tr")),
                )
                .map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <div className="admin-product-image">
                          <Image
                            src={product.images[0]}
                            alt=""
                            fill
                            sizes="55px"
                          />
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <small>
                            {product.sku ?? product.id.toUpperCase()}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>
                      <strong>{money(product.price)}</strong>
                    </td>
                    <td>
                      {product.variants.reduce((sum, v) => sum + v.stock, 0)}{" "}
                      adet <small>{product.variants.length} seçenek</small>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${product.active ? "green" : ""}`}
                      >
                        {product.active ? "Yayında" : "Taslak"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          href={`/urun/${product.slug}`}
                          className="icon-button"
                          aria-label={`${product.name} mağazada gör`}
                        >
                          <ArrowUpRight size={19} />
                        </Link>
                        <button
                          className="icon-button"
                          aria-label={`${product.name} düzenle`}
                          onClick={() => {
                            setEditing(structuredClone(product));
                            setMessage("");
                          }}
                        >
                          <PencilSimple size={19} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      <p role="status" className="save-success">
        {!editing && message}
      </p>
      <Dialog.Root
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="product-edit-dialog">
            <div className="drawer-heading">
              <Dialog.Title>Ürün düzenle</Dialog.Title>
              <Dialog.Close
                className="icon-button"
                aria-label="Düzenlemeyi kapat"
              >
                <X size={22} />
              </Dialog.Close>
            </div>
            <Dialog.Description>
              Fiyat ve seçenek stoklarını güncelleyin. Tüm tutarlar KDV dahil
              fiyatlardır.
            </Dialog.Description>
            {editing && (
              <form onSubmit={save}>
                <div className="field">
                  <label htmlFor="productName">Ürün adı</label>
                  <input
                    id="productName"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    required
                    minLength={3}
                  />
                </div>
                <div className="field">
                  <label htmlFor="productPrice">Satış fiyatı (TL)</label>
                  <input
                    id="productPrice"
                    type="number"
                    value={editing.price / 100}
                    step="0.01"
                    min="1"
                    required
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        price: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </div>
                <div className="edit-checkboxes">
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.active}
                      onChange={(e) =>
                        setEditing({ ...editing, active: e.target.checked })
                      }
                    />{" "}
                    Mağazada yayınla
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editing.featured}
                      onChange={(e) =>
                        setEditing({ ...editing, featured: e.target.checked })
                      }
                    />{" "}
                    Ana sayfada göster
                  </label>
                </div>
                <h3>Üretim ve stok bilgileri</h3>
                {editing.variants.map((variant, index) => (
                  <div className="variant-edit" key={variant.id}>
                    <strong>
                      <span style={{ background: variant.color }} />
                      {variant.name}
                    </strong>
                    <div>
                      {[
                        {
                          key: "stock",
                          title: "Hazır stok",
                          value: variant.stock,
                          min: 0,
                        },
                        {
                          key: "leadDays",
                          title: "Hazırlık (iş günü)",
                          value: variant.leadDays,
                          min: 1,
                        },
                        {
                          key: "surcharge",
                          title: "Fiyat farkı (TL)",
                          value: variant.surcharge / 100,
                          min: 0,
                        },
                      ].map((field) => (
                        <div className="field" key={field.key}>
                          <label htmlFor={`${variant.id}-${field.key}`}>
                            {field.title}
                          </label>
                          <input
                            type="number"
                            id={`${variant.id}-${field.key}`}
                            min={field.min}
                            step={field.key === "surcharge" ? "0.01" : "1"}
                            required
                            value={field.value}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                variants: editing.variants.map((v, i) =>
                                  i === index
                                    ? {
                                        ...v,
                                        [field.key]:
                                          field.key === "surcharge"
                                            ? Math.round(
                                                Number(event.target.value) *
                                                  100,
                                              )
                                            : Number(event.target.value),
                                      }
                                    : v,
                                ),
                              })
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <small>
                      {variant.madeToOrder
                        ? "Siparişe özel üretim. Alt hazırlık sınırı 7 iş günüdür."
                        : "Stok 0 olduğunda sipariş üzerine üretim olarak sunulur."}
                    </small>
                  </div>
                ))}
                {message && (
                  <p className="form-error" role="alert">
                    {message}
                  </p>
                )}
                <button className="button primary full" disabled={pending}>
                  <FloppyDisk size={18} />
                  {pending ? "Kaydediliyor..." : "Ürünü kaydet"}
                </button>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
