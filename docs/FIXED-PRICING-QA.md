# Tek fiyat, kategori menüsü ve fırsat filtresi

- 133 ürün aynı ana fiyatla kart ve havaleye sunulur. Ayrı kart fiyatı seed, çalışma verisi, tip, aktarım aracı ve görünümden kaldırıldı. Çalışma verisi yedeklendi; mağaza ayarları korundu.
- Ürün kartlarında ve detaylarında “Özel üretim” ve 7–14 iş günü bilgisi kullanılır.
- Fırsat filtresi `price * 100 < previousPrice * 80` koşulunu uygular. Tam %20 dahil değildir. Eşik altı, eşit ve üstü değerler test edildi. Güncel koşulu sağlayan 23 ürünün listelenmesi HTTP üzerinden doğrulandı.
- Menüde yedi kategori doğrudan erişilebilir. Küçük kategori görselleri gerçek alfa kanalı olan ayrı PNG dosyalarıdır. Yedi dosyanın şeffaf köşeleri ve sunucudan erişimi doğrulandı. [Görsel dosyaları ve istemler](CATEGORY-CUTOUTS.md).
- TypeScript kontrolü, 15 test ve Next.js derlemesi geçti. Tüm 133 ürün detayı, 133 sepet fiyatı, 194 orijinal görsel ve yedi kategori için canlı doğrulama tamamlandı.
- 1440, 1024, 768 ve 390 piksel ekran görüntüleri incelendi. 1024, 768 ve 390 genişliklerinde yatay taşma yok. Menü 1440, 1024 ve 768 genişliklerinde okunuyor; mobil kapalı görünümü kontrol edildi.

Geniş tasarım kontrolcüsü, bu değişiklikten önceki alışveriş kartlarının sütunlarını ve kısa içerik bölümlerini tek ekranlık tanıtım sayfası kurallarına göre işaretler. Bu bulgular için genel bir tasarım geçişi iddia edilmez. Ek mobil etkileşim kontrolcüsü tamamlanmış JSON raporu üretmedi; bu ek kontrol başarılı sayılmadı.

Kanıtlar: `output/qa/fixed-pricing/final-verification.json`, `cutout-verification.json`, `responsive-report.json`, ekran görüntüleri ve `output/qa/catalog-import/live-verification.json`.
