# Geliştirici devri — 18 Kasım 2026

## Temiz kurulum

Kullanıcıya teslim edilecek sabit çevrimiçi bağlantı ve yayınlama iş akışı [ONLINE-PREVIEW.md](ONLINE-PREVIEW.md) belgesindedir. Her web sitesi güncellemesinde aynı önizlemeyi de yayınlayın; localhost'u nihai teslim bağlantısı olarak kullanmayın.

Node.js 24 LTS ve npm kullanın. Depo kökü doğrudan Next.js projesidir; ek bir alt klasöre girilmez.

```sh
npm ci
node scripts/setup-local.mjs
npm run dev
```

Önizleme: http://127.0.0.1:3100/ — Yönetim: http://127.0.0.1:3100/yonetim/giris

Kurulum betiği yeni rastgele oturum ve şifreleme anahtarları üretir. Mevcut `.env.local` dosyasını değiştirmez. Windows'ta ilk kurulumdan sonra `LOCAL-AC.cmd` sunucuyu başlatıp tarayıcıyı açar; sunucu zaten çalışıyorsa ikinci bir süreç başlatmaz.

## Devralınan durum

- Next.js App Router, React ve TypeScript; paket sürümleri `package-lock.json` ile sabittir.
- Vitrin, ürün detayları, koleksiyon filtreleri, arama, favoriler ve yerel sepet çalışır. Katalog: 133 ürün, 7 kategori, 194 dekupe galeri fotoğrafı.
- Kurumsal kimlik: onaylanan Form logo geometrisi, “Her açıdan özgün.” sloganı; güncel antrasit, kırık beyaz, sıcak taş ve şampanya paleti.
- Renklerin kaynağı `src/data/brand-palette.json`, ortak marka metinleri `src/lib/brand.ts`, vitrin stilleri `src/app/(store)/form-brand.css` içindedir. Önceki renkleri anlatan tasarım belgeleri tarihsel notlardır.
- Logo ana SVG dosyaları `assets/brand/form-master/` içindedir. `node scripts/prepare-form-assets.mjs` web logoları, ikonlar ve paylaşım görselini üretir; proje dışındaki dosyalara ihtiyaç duymaz.
- Şirket paneli için ilk sahip hesabı loopback adresindeki giriş ekranında oluşturulur. Önceden paylaşılmış bir kullanıcı veya şifre yoktur. Panel ayrıntıları: [COMPANY_PANEL.md](COMPANY_PANEL.md).

## Veri sınırları

`.env.local`, `.local/`, şirket veritabanı, kullanıcılar, oturumlar, yedekler ve özel ayarlar Git'e dahil edilmez. Temiz kurulumda katalog `src/data/catalog.json` ve varsayılan marka ayarlarından yüklenir. Yerel şirket verileri `.local/company-pg`, vitrin değişiklikleri `.local/store.json` altında oluşur.

Bu sürüm geliştirme önizlemesidir. `npm run build` derlemeyi doğrular; yerel veri adaptörleri üretim modunda çalışmayı reddettiği için `npm start` canlı mağaza kurulum yöntemi değildir. Yönetilen PostgreSQL adaptörü, üretim oturumları, canlı ödeme/sipariş ve dağıtım çalışmaları ayrıca tamamlanmalıdır. Prisma şeması vitrin/operasyon adaptörlerine bağlı bir canlı veritabanı kurulumu değildir. Ayrıntılar README ve şirket paneli belgesindedir.

## Görsel kuralı

Yeni ürün **vitrine eklenmeden önce dekupe edilir**. `originalImages` kaynak kaydıdır; vitrin `/images/catalog-cutouts/...png` dosyalarını kullanır. Ürün rengi, ölçüsü, malzemesi ve ince ayaklar korunur. `multiply` ve renk filtreleri kullanılmaz. `AGENTS.md` ve [PRODUCT-PRESENTATION.md](PRODUCT-PRESENTATION.md) bağlayıcı iş akışını açıklar.

Mevcut kaynak fotoğraflar, dekupe PNG'ler ve doğrulama kayıtları depodadır; siteyi çalıştırmak için model indirmek veya dekupeyi yeniden üretmek gerekmez. Yeni dekupe üretiminde `prepare-cutouts.mjs` ayrıca `.local/cutout-tools/node_modules/onnxruntime-node` ve `.local/cutout-models/isnet-general-use.onnx` ister. Bu yerel araç/model dosyaları depoya dahil değildir; hazırlanmadan bu betiği çalıştırmayın. Görsel hakları ve kaynakları `ASSETS.md`, `CATALOG-IMPORT.md` ve provenance kayıtlarındadır.

## Kontroller

```sh
npm run typecheck
npm test
npm run images:validate
npm run db:validate
npm run build
```

Geliştirme sunucusu açıkken build çıktısını ayırın: PowerShell'de `$env:OPS_TEST_BUILD='true'; npm run build`, macOS/Linux'ta `OPS_TEST_BUILD=true npm run build`. Böylece çalışan `.next` klasörü korunur. Piksel koruma testleri 194 büyük görseli çözdüğü için zaman alabilir.

## Devam edilecek alanlar

Üretim veri adaptörü ve dağıtım, gerçek sipariş/ödeme akışı, stok rezervasyonu, kargo ve bildirim servisleri tamamlanmalıdır. Şirket paneli yerel PGlite verisiyle çalışır; canlı ticaret bağlantısı olarak değerlendirilmez. Önce mevcut testleri çalıştırın ve temiz kurulumda vitrin ile sahip hesabı kurulumunu doğrulayın.
