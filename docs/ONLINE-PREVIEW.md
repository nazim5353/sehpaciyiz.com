# Sabit çevrimiçi önizleme

Kullanıcının 18 Kasım 2026 talebi: her web sitesi çalışmasının sonunda önizlemeyi güncelleyin ve aynı HTTPS bağlantısını paylaşın. Farklı internet sağlayıcılarıyla kullanılabilmeli; localhost veya yerel ağ adresi teslim bağlantısı değildir.

Adres: https://sehpaciyiz-onizleme.bee-organiza-3097.chatgpt.site

Site kimliği `preview/hosting-target.json` içindedir. Yeni Site oluşturmayın. Önizleme sahibine özeldir; aynı ChatGPT hesabıyla farklı cihaz ve internet bağlantılarından açılır. Paylaşım kitlesi kullanıcı istemedikçe değiştirilmez.

## Güncelleme

1. Ana Next.js projesindeki değişiklikleri tamamlayın ve uygun kontrolleri çalıştırın.
2. Sites skill ile bu Site'nin mevcut kaynak deposunu açın. Hazırlık için `node scripts/prepare-online-preview.mjs --destination <açılan kaynak klasörü>` çalıştırın. Proje dışındaki dosyalara bağımlı olmayan ayrı bir Next.js statik vitrin kaynağı hazırlanır. Eksik veya eşleşmeyen dekupe görseller hazırlığı durdurur. Kaynak sayfa yapısı değiştiğinde adaptör sessizce yanlış çıktı üretmek yerine hata verir; adaptörü de güncelleyin.
3. Bu kaynakta bağımlılıkları kurun; `npm run build` ile statik `out/` çıktısını doğrulayın. Ürünler build sırasında üretilir, koleksiyon sorguları ve renk seçimi istemcide çalışır.
   Ortak katalog önizleme sağlayıcısının JS paketinde bir kez tutulur; her sayfanın HTML/RSC verisine tekrar eklenmez. `postbuild` kontrolü açılmış yayın çıktısını 250 MiB altında tutar (platform sınırı 256 MiB) ve özel yolların dışarıda kaldığını doğrular.
4. Sites kaynak yardımcısıyla tam kaynağı senkronize edip arşivleyin ve aynı Site'ye yayınlayın. Sites kimlik bilgilerini dosyaya kaydetmeyin veya GitHub'a eklemeyin.
5. Kullanıcıya yerel adres yerine sabit HTTPS bağlantısını iletin. İlgili ana depo değişikliklerini GitHub'da tutun.

## Kapsam

Vitrin, 133 ürün, 7 kategori, 194 dekupe fotoğraf, arama, filtreler, ürün galerileri, varyant seçimi ve tarayıcıdaki favori/sepet önizlemesi dahildir. Statik önizlemede sepet hesabı tarayıcıda katalogdan yapılır; sipariş veya tahsilat oluşturmaz. Tam yerel uygulamanın sunucuda sepet doğrulaması ve şirket paneli korunur.

`.env.local`, `.local/`, şirket kayıtları, kullanıcılar, yönetim API'leri ve kaynak ürün fotoğrafları bu yayın kaynağına kopyalanmaz. Gösterilen katalog ve marka ayarları Git'teki sürümden alınır. Canlı ticaret ve üretim veri altyapısının tamamlanması ayrı iştir.
