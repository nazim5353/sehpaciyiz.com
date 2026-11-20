# Son teslim — 20 Kasım 2026

Kullanıcı talebiyle değişiklikler mevcut `main` branch'inde toplanır. Ödeme, kargo, e-posta sağlayıcıları ve üretim barındırma/veritabanı bağlantısı başka geliştirici tarafından yapılacaktır. Bu sürümde tahsilat, gerçek sipariş veya otomatik gönderi açılmaz.

## Tamamlanan site işleri

- Eski tarayıcı sepetleri doğrulanır; tekrarlı kalemler birleştirilir, satıştan kalkan ürünler çıkarılır, hazır stok sınırı aşılmaz. Favoriler tekilleştirilir.
- Ürün eklerken ve sepet adedi artırırken aynı stok sınırı kullanılır. Siparişe özel üretim, hazır stoktan ayrı değerlendirilir.
- Sepet güncellenirken eski fiyat özeti temizlenir, iptal edilen isteğin sonucu uygulanmaz; başarısız hesaplama yeniden denenebilir.
- Arama Türkçe ve ASCII yazımları, birden fazla kelimeyi, kategori, malzeme ve ürün kodunu destekler. Koleksiyonda kalıcı URL ile arama, filtreleme, sıralama ve sayfalama birlikte çalışır. Tekrarlı URL parametreleri güvenle normalleştirilir.
- Boş bilgi sayfalarına mevcut uygulamanın gerçek davranışını anlatan içerikler ve yardım bağlantıları eklendi. İşletmeye özel kayıtlı metinler önceliklidir; onaylanmış yasal sözleşme yerine taslak bir sözleşme üretilmedi. Yapılandırılan iletişim kanalları tıklanabilir.
- Mobil menüde klavye odağı, Escape ve arka plan kaydırması düzenlendi. Bilgi metinleri mobilde 16 px'dir.
- Ürünlere canonical, ürün bazlı paylaşım görselleri ve güvenli Product JSON-LD eklendi. İlgili ürünler önce aynı kategoriden seçilir. Aktif satış olmadığı için yapılandırılmış veride satın alınabilir teklif veya yorum iddiası yoktur.
- `NEXT_PUBLIC_SITE_URL` canonical kökünü belirler. Önizleme varsayılan olarak noindex'tir; `SITE_INDEXING=true` yalnız HTTPS adresinde taramayı açar. Sitemap yalnız aktif ürünleri içerir; yönetim ve API yolları dahil edilmez.
- GitHub Actions, `main` push'larında ve PR'larda tip kontrolü, testler, dekupe doğrulama, Prisma doğrulama ve build çalıştırır.
- Çalışma başında bulunan hero düzenlemeleri ve bulut şirket paneli kaynakları korunmuştur. Bulut paneli kodunun kalıcılık, yetki ve eşzamanlı kayıt testleri test paketine dahildir.

## Entegrasyonu devralacak geliştirici

Temiz kurulum, veri sınırları ve çalıştırma için [DEVIR.md](DEVIR.md). `.env.example` değişkenleri örnektir; gerçek anahtarlar `.env.local` veya üretim gizli bilgi yöneticisinde tutulmalıdır. `.local/`, şirket kayıtları, kullanıcılar ve parolalar Git'e gönderilmez.

Yerel veri adaptörleri üretim modunda bilinçli olarak kapalıdır. `npm run build` başarılı olması canlı ticaret altyapısının çalıştığını göstermez. Üretim adaptörü, ödeme/sipariş/rezervasyon işlemleri, webhook doğrulaması, taşıyıcı ve e-posta servisleri tamamlanıp uçtan uca doğrulanmadan canlı satış açılmamalıdır. İşletmeye özel iletişim ve yasal metinler ayarlardan tamamlanmalıdır.

## Çevrimiçi önizleme

Kayıtlı hedef `preview/hosting-target.json` içindedir. 20 Kasım 2026'da Sites `get_site` çağrısı bu kimlik için `project_not_found` (404) döndürmüştür. Yeni Site oluşturulmadı ve mevcut özel paylaşım tercihi değiştirilmedi. Önizleme kaynağı hazırlama betiği yeni dosyalarla güncellendi; erişim sağlanınca [ONLINE-PREVIEW.md](ONLINE-PREVIEW.md) iş akışıyla aynı hedef yayınlanmalıdır.

## Doğrulama

- Test paketi: 37/37 geçti. Son tip düzeltmesinden sonra ilgili 10 sepet/arama testi yeniden geçti.
- TypeScript: geçti. Ana Next.js üretim derlemesi: geçti.
- Dekupe doğrulaması: 197 ürün, 258 görsel, 8 kategori geçti. Kaynak piksel koruma testleri de test paketinde geçti.
- Prisma şeması: geçerli; migration uygulanmadı.
- `npm run verify:http`: 15 HTTP kontrolü geçti (ana sayfa, koleksiyon, tekrarlı arama parametreleri, ürün, altı bilgi sayfası, ürün 404, geçerli/geçersiz sepet, robots ve sitemap). Bu komut için geliştirme sunucusu açık olmalıdır; veri yazmaz.
- Temizlenmiş statik önizleme kaynağı yeniden hazırlandı; özel veri içermediği kontrol edildi. Statik derleme geçti: 210 sayfa, 237,2 MiB; 250 MiB denetim eşiğinin altında. Yayın servisine erişim hatası nedeniyle bu çıktı çevrimiçi hedefe yüklenemedi.

Görsel denetim sınırı: `GATE: ERROR (the copy (the page showed no <main>, <section> or <h1> to lint); consistency.mjs could not walk 1440, 390; check.mjs could not run (exit 2: check: timed out))`. Bu sonuç bir tasarım geçişi değildir. Otomatik tarayıcı denetimi 1440 ve 390 genişliklerinde tamamlanamadı; bu denetimde kopya, taşma, tıklama alanları ve azaltılmış hareket doğrulanamadı. HTTP kontrolü sonrasında sayfaların gerçek HTML gövdelerinde main/h1 bulunduğu ayrıca doğrulandı. Denetim, skill'in hata sonrası tekrar çalıştırmama kuralı nedeniyle yeniden koşturulmadı. Önceden kayıtlı üç muafiyet (ürün rozeti görsel bindirmesi, tutarlı ürün kartı düzeni ve kategori/ürün fotoğrafının yeniden kullanımı) değiştirilmedi; bu çalışmada eşleşen görsel bulgu üretilemedi.
