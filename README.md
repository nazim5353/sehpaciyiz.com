# Sehpacıyız

20 Kasım 2026 teslimi: sepet stok sınırları ve kayıt onarımı, Türkçe/ürün kodu araması, koleksiyon araması, yardım içerikleri, ürün paylaşım bilgileri, sitemap/robots ve GitHub kontrolleri tamamlandı. Güncel doğrulama ve entegrasyon devri: [docs/SON-TESLIM.md](docs/SON-TESLIM.md). Ödeme, kargo, e-posta ve üretim barındırma bağlantıları kullanıcının diğer geliştiricisine bırakılmıştır; bu teslim canlı satış açmaz.

Özgün modelleri ve kaliteyi odağına alan sehpa ve yaşam alanı markası. Form logosu; mat antrasit, kırık beyaz, sıcak taş ve şampanya renkleriyle uygulanır. Slogan: **Her açıdan özgün.** TypeScript, Next.js App Router, React ve Tailwind CSS ile yerel geliştirme sürümü.

**[Çevrimiçi tasarım önizlemesi](https://sehpaciyiz-onizleme.bee-organiza-3097.chatgpt.site)** — aynı ChatGPT hesabıyla farklı cihaz ve internet bağlantılarından açılır. Güncelleme iş akışı: [docs/ONLINE-PREVIEW.md](docs/ONLINE-PREVIEW.md).

## Form kurumsal kimliği

18 Kasım 2026 renk revizyonu: Kullanıcının Yergin Design referansına göre antrasit ve şampanya paleti uygulanmıştır. Güncel renk kaynağı `src/data/brand-palette.json` dosyasıdır. Logo, favicon, paylaşım görseli ve tarayıcı tema rengi bu paletle uyumludur; logo geometrisi korunur. `node scripts/prepare-form-assets.mjs` güncel web varlıklarını yeniden üretir. Önceki renk sunumları geçmiş tasarım aşamalarına aittir.

17 Kasım 2026 tarihinde onaylanan kimliğin logo dosyaları `public/brand/`, renk ve tipografi katmanı `src/app/(store)/form-brand.css`, ortak metinleri `src/lib/brand.ts` içindedir. Yatay logo ve amblem font gerektirmeyen vektör çizimleridir. Başlıklar Georgia, açıklamalar mevcut yerel Manrope ailesidir.

Mevcut yerel mağazaya marka metinlerini uygulamak için `node --env-file=.env.local --import tsx scripts/apply-form-brand.ts` kullanılabilir. Bu komut yalnızca marka/içerik/SEO alanlarını günceller ve katalog ile operasyon ayarlarının korunmasını denetler. Tekrar çalıştırıldığında değişiklik yoksa kayıt yapmaz. Önceki sürüm `.local/backups/before-form-brand.zip` içinde saklanır.

Bu uygulama yerel önizlemeyi günceller; canlı ödeme ve sipariş altyapısını etkinleştirmez. İnceleme çıktıları `output/qa/form-brand/` içindedir.

## Çalıştırma

Geliştirici devri, güncel durum ve veri sınırları: [docs/DEVIR.md](docs/DEVIR.md). Node.js 24 LTS ve npm kullanın.

```sh
npm ci
node scripts/setup-local.mjs
npm run dev
```

- Ana sayfa: http://127.0.0.1:3100/
- Örnek ürün: http://127.0.0.1:3100/urun/taveon-orta-sehpa
- Yönetim: http://127.0.0.1:3100/yonetim

Windows'ta ilk kurulumdan sonra `LOCAL-AC.cmd` dosyasına çift tıklayarak sunucu ve tarayıcı açılabilir. İlk şirket sahibi hesabı `/yonetim/giris` ekranında oluşturulur. Panel ve yetkiler için [docs/COMPANY_PANEL.md](docs/COMPANY_PANEL.md) belgesine bakın. Sunucu varsayılan olarak yalnızca 127.0.0.1 üzerinde dinler.

## Bu teslimde çalışanlar

- Güncel antrasit, kırık beyaz, taş ve şampanya paletinde responsive ana sayfa ve ürün detayı. Sistem koyu teması site rengini değiştirmez.
- Ürün galerisi, görsel büyütme, renk seçimi, varyant fiyatı ve hazır stok / üretim süresi.
- Kategori ve fiyat aralığı filtreleri, ürün sıralama, arama ve tarayıcıda saklanan favoriler.
- Tarayıcıda saklanan sepet; **sunucuda** güncel katalogdan hesaplanan fiyat, stok, kargo ve karma sepet hazırlık süresi. Bu sepet stok rezerve etmez ve sipariş oluşturmaz.
- Yönetim oturumu; örnek ürün adı, fiyat, stok, renk fiyat farkı, üretim süresi ve yayın durumu düzenleme.
- 9 ayar bölümü: genel, ödeme/İyzico, kargo, SMTP, API, SEO, bildirim, vitrin, yasal içerik.
- Mağaza adı/iletişim ve vitrin metinlerinin mağazaya, kargo ücreti/ücretsiz kargo limitinin sepet hesabına yansıması.
- Sunucuda atomik dosya kaydı, işlem geçmişi, gizli alanlarda AES-256-GCM şifreleme ve tarayıcıya maskelenmiş değer gönderimi. Oturum çerezleri HttpOnly ve SameSite=Lax; yazma uçları oturum ve Origin kontrolü yapar.
- Henüz geliştirilmeyen modüller panelde açıkça işaretlenmiştir. Sahte satış grafiği veya sipariş verisi yoktur.

## Veri ve canlıya geçiş sınırı

Bu sürümün veri adaptörü geliştirmeye özeldir: `.local/store.json` dosyası. `.env.local` ve `.local/` Git'e dahil edilmez. Tek Node sürecinde yazılar sırayla, geçici dosya ve atomik rename ile kaydedilir. Birden fazla süreç, ağ diski veya üretim ortamı için uygun değildir.

**Üretim modunda yerel veri adaptörü bilinçli olarak kapalıdır.** `npm run build` derlemeyi doğrular; bu aşamada `npm start` ile canlı mağaza sunulamaz. PostgreSQL veri adaptörü, kullanıcı/rol sistemi ve operasyon servisleri tamamlanmalıdır. `DATABASE_URL` tanımlamak tek başına bağlantıyı etkinleştirmez.

`prisma/schema.prisma` üretim için ilk veri modeli taslağıdır. Migration uygulanmadı, veri aktarılmadı. Para değerleri kuruş olarak tam sayıdır; tarihler timestamptz'dir. Ürün/renk, sipariş anlık görüntüleri, stok rezervasyonu, ödeme girişimleri, webhook tekrar koruması, iade, gönderi, entegrasyon kuyruğu ve işlem kaydı taslağı içerir. Uygulama davranışına henüz bağlanmamıştır. Canlı migration öncesinde stok/para negatiflik kontrolleri, veritabanı yetkileri, optimistic locking ve işlem sınırları eklenmelidir.

Canlı API anahtarları bu önizlemeye girilmemeli. API/SMTP ayarlarının kaydı tahsilat, e-posta veya gönderi otomasyonu başlatmaz. Silme/anahtar rotasyonu arayüzü de sonraki adımdır; boş gizli alan mevcut değeri korur.

## Tam e-ticaret kapsamı

Güncel durum panelde `/yonetim/kapsam` altında da bulunur.

| Alan              | Bu aşama                          | Tamamlanacak işler                                                                                                                   |
| ----------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Vitrin            | Ana sayfa, ürün, koleksiyon hazır | Gerçek katalog, renk görselleri, ürün önerileri, doğrulanmış yorumlar                                                                |
| Katalog           | Mevcut örnek ürün düzenleme       | Yeni ürün/kategori, medya yükleme, toplu aktarım, SKU ve barkod, setler, SEO yönlendirmeleri                                         |
| Stok / üretim     | Varyant stok ve süre gösterimi    | Atomik stok rezervasyonu, süre aşımı, stok hareketleri, güvenlik stoğu, Yergin eşleştirmesi ve senkronizasyon                        |
| Sipariş           | Veri modeli taslağı               | Üyeliksiz ödeme, adres, bireysel/kurumsal fatura, sipariş kalemi anlık görüntüleri, ayrı ödeme/üretim/sevkiyat durumları             |
| İyzico            | Gizli anahtar ayar ekranı         | Checkout Form başlatma/sorgulama, tutar/para birimi/sipariş doğrulama, V3 webhook imzası, tekrar koruması, fraud inceleme, mutabakat |
| İptal / iade      | Kapsam ve veri modeli taslağı     | Talep, kalem bazlı tam/kısmi iade, stok ve ödeme mutabakatı, iade gönderisi                                                          |
| Kampanya          | Örnek liste fiyatı gösterimi      | Kupon, tarih/kullanım sınırı, kategori/ürün indirimi, birleşme kuralları, set ve kargo teklifleri                                    |
| Kargo             | Ücret ayarı ve sepet hesabı       | Taşıyıcı seçimi, bölge/desi kuralları, çoklu koli, etiket/barkod, takip, durum webhook'u, hata/tekrar kuyruğu                        |
| SMTP / bildirim   | Şifreli ayarlar, tercih ekranı    | Sağlayıcı bağlantısı, test bağlantısı, güvenli e-posta şablonları, sipariş/ödeme/kargo/iade bildirimleri, SPF/DKIM/DMARC doğrulaması |
| Müşteri           | Favori ve sepet yerelde           | Üyelik, e-posta doğrulama, şifre yenileme, adres defteri, sipariş geçmişi, iletişim izinleri, KVKK talepleri                         |
| E-fatura / SMS    | Ayar ekranı                       | Sağlayıcı adaptörü, fatura PDF/durum takibi, iade faturası, SMS ve izin yönetimi                                                     |
| SEO / reklam      | Meta ve noindex önizleme          | Gerçek ürün structured data, sitemap, robots, canonical, 301 geçişleri, GA4 e-ticaret, Meta katalog/Conversions API, çerez izni      |
| Yönetim güvenliği | Yerel imzalı oturum               | Kalıcı kullanıcı/rol yetkileri, MFA, giriş denemesi sınırlama, oturum iptali, gizli bilgi rotasyonu, ayrıntılı audit                 |
| Operasyon         | Kapsam ve bağlantı merkezi        | Harici yedek, geri yükleme testi, izleme/alarmlar, staging/canlı ayrımı, hata kuyruğu, CSV raporları                                 |
| Yasal içerik      | Metin ayarları ve bilgi sayfaları | İşletmeye özel metinler, işlem anında sözleşme sürümü/kabul kaydı, veri saklama kuralları                                            |

## Kontroller

```sh
npm run typecheck
npm test
npm run db:validate
npm run build
```

Testler stok sınırı, tekrarlı sepet kalemleri, sunucu fiyat hesabı, karma üretim süresi, oturum imzası/süre aşımı, Origin kontrolü, gizli bilgi şifreleme/maskeleme ve yerel kayıt kalıcılığını kapsar. Tarayıcı QA kanıtları `output/qa/` altında tutulur.

## Görsel kaynakları

Ürün adları, fiyatlar, stoklar ve özellikler **örnektir**. Yaşam alanı ve Luna görselleri yapay zekâ ile üretildi. Diğer örnek fotoğraflar mevcut Yergin proje klasöründen alındı; Sehpacıyız katalog eşleştirmesi değildir. Kaynaklar ve üretim komutları: [docs/ASSETS.md](docs/ASSETS.md).

## Yeni mağaza arayüzü

Kiremit/kum tonlarında yenilenen vitrin, ürün kartlarında renk/fiyat/hazırlık süresi, kategori ve bütçe seçimi, mobil filtre paneli ve SSS bölümü eklendi. Yönetim bağlantıları ve mevcut sepet hesabı korunur.

Bu bilgisayarda bağımlılıklar hazırken `pnpm dev` ile http://127.0.0.1:3100/ adresi açılabilir. Tasarım kararları: [docs/REDESIGN.md](docs/REDESIGN.md). Doğrulama sonuçları ve açık tasarım denetimi bulguları: [docs/REDESIGN-QA.md](docs/REDESIGN-QA.md).

## Güncel ürün kataloğu

Toplam 197 ürün ve 258 dekupe görsel vardır. Yergin Design kaynağından gelen 133 ürün korunur; Kataloqp/Poy'un PUF 01 ve PUF 02 kataloglarından 64 görselli model özgün isim ve kodlarıyla “Puflar” kategorisine eklendi. Sekiz kategori, 24 ürünlük koleksiyon sayfaları ve 8 ürünlük ana sayfa seçkisi vardır. Puf fiyatları kaynak KDV dahil toplamın 2,5 katı alınarak yukarı doğru 50 TL'ye yuvarlanır; yeniden KDV eklenmez. Puflarda kaynak üretim süresi 15 iş günüdür ve hazır stok iddiası yoktur. Ayrıntılar: [docs/PUF-IMPORT.md](docs/PUF-IMPORT.md).

Kaynak/yeni isim eşleştirmeleri, veri sınırları, yedekler ve doğrulama: [docs/CATALOG-IMPORT.md](docs/CATALOG-IMPORT.md). Üretim veritabanı ve ödeme bağlantısı tamamlanana kadar yerel önizleme sürümüdür.
