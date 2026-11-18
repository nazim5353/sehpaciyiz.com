import { getProducts } from "@/lib/store";
import { AdminProducts } from "@/components/admin-products";
export default async function ProductsPage() {
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">MAĞAZA</span>
          <h1>Ürünler ve stok</h1>
          <p>
            Fiyatları, renk seçeneklerini, hazır stokları ve üretim sürelerini
            yönetin.
          </p>
        </div>
        <span className="status-badge">Örnek katalog</span>
      </div>
      <AdminProducts initial={await getProducts()} />
      <div className="admin-inline-note">
        Bu aşamada mevcut örnek ürünlerin düzenlenmesi hazırdır. Yeni ürün
        ekleme, görsel yükleme ve toplu aktarım katalog modülünün sonraki
        adımıdır.
      </div>
    </>
  );
}
