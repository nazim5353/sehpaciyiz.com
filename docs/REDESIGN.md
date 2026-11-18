# Sehpacıyız mağaza tasarımı

Tür: ürün / mobilya e-ticareti. Yerel Next.js projesi; yayın yapılmaz.

Amaç: Maqhome referansındaki kolay kategori erişimini ve açık ürün bilgisini Sehpacıyız için özgün bir görsel sistemle sunmak. Referansın kodu, metinleri ve görselleri kullanılmadı.

Görsel yön: ahşap görsellere uyan kiremit turuncu, kırık beyaz, kum ve koyu zeytin. Mevcut yerel Manrope fontu korunur; ana başlığa Georgia italik vurgu eklenir. Yeni font indirme veya takip servisi yok.

Ses: ev mobilyası seçen kullanıcıyla doğrudan, sıcak ve kısa Türkçe. Fiyat, stok ve süre mevcut katalogdan; indirim oranları fiyatlardan hesaplanır. Yeni satış rakamı, yorum, puan veya garanti iddiası eklenmez.

## Sayfa yapısı

1. Açık arama, favori ve sepet; kategori menüsü ve mobil menü.
2. Açılış: gerçek projedeki yaşam alanı görseli, yönetilebilir vitrin metni, katalog ürünü ve güncel fiyat bağlantısı.
3. Kategoriler: ürün görselleri, tanım ve doğrudan koleksiyon bağlantısı.
4. Ürünler: kategori seçimi; her kartta güncel varyant fiyatı, fiyat farkı, renk, hazırlık süresi, favori ve sepete ekleme.
5. Malzeme detayı ve tipografik vurgu: kütüphanenin word-highlight modülü, hareket azaltma tercihine uyumlu.
6. Bütçe bağlantıları ve kategori/bütçe seçimi yapan gerçek GET formu.
7. Katalogdan hesaplanan fırsat bandı, teslimat/ürün bilgisi ve önizleme sınırlarını açıklayan SSS.
8. Mevcut bilgi sayfaları ve yönetim bağlantısı ile altbilgi.

## Referansa ve mevcut uygulamaya göre kararlar

Kullanıcı basit fakat bilgiye hızlı erişilen bir alışveriş sitesi istedi. Bu nedenle tasarım becerisinin tanıtım sayfaları için önerdiği her bölümü bir tam ekran yapma kuralı burada uygulanmaz; ürünler ve kategori grupları içerik boyunda kalır. Alışveriş için renk düğmeleri, sepet çekmecesi, açılır filtreler/SSS ve birden fazla ürün bağlantısı korunur. Admin sayfaları mevcut tasarımını korur; yeni CSS `.storefront` ile kapsamlanır.

Fotoğraflar mevcut `public/images` klasöründen gelir. Yaşam alanı ve Luna görselleri önceki teslimin yapay zekâ üretimleridir. Diğer görseller önceki projenin örnek katalog varlıklarıdır; gerçek ürün ve renk görselleri katalog aktarımında eşleştirilmelidir. Renk seçimi fiyatı ve hazırlık süresini değiştirir; gerçeği olmayan bir renk fotoğrafı üretilmez.

Tasarım becerisinin rastgele önerisindeki mint, doğal ahşap görsellerdeki turuncu/kum renkleriyle uyumlu olmadığı için kiremit yönü seçildi. Var olan markanın fontları korunarak yeni font yükü eklenmedi. Python çalıştırıcısı olmadığı için ui-ux-pro-max araması çalışmadı; becerinin erişilebilirlik, klavye, kontrast, 44px dokunma alanı ve responsive temel kuralları kullanıldı.

Yedek: `.local/design-backup/src`. Çalışma başında Git deposu bulunmadığından kaynak yedeği alındı. Kaynak kodundaki değişiklikler yereldir.
