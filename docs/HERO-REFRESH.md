# Açılış vitrini ve alt alan

19 Kasım 2026. Kullanıcının isteği: daha şık gerçek ürünler, hareketli bir açılış, ürün geçişleri ve koyu alan yerine resmi bir görünüm.

## Tasarım kararı

Onaylı Form kimliği korunur: mürekkep `#242321`, kâğıt `#f5f2eb`, açık taş `#eeeae2`, şampanya `#c7b38a`, metin `#302d28`, ikincil metin `#6d665c`. Georgia başlıkları mobilya formlarını öne çıkarır; mevcut Manrope metin ve kontrollerde sürer. Ürünlere renk veya filtre uygulanmaz.

Sol hizalı başlık ve eylemler, sağda büyük ürün vitrini. Telefonda metnin ardından ürün vitrini gelir. Yeni sekizinci kategori masaüstü menüsüne tek satırda yerleşir.

    Başlık / açıklama     Gerçek dekupe ürün
    Koleksiyon / hakkında Ürün adı / KDV dahil fiyat
    Üretim / ürün sayısı   Seçim / önceki / duraklat / sonraki

Sıradan masa yerine üç farklı form seçildi: Ravena Orta Sehpa, Nerova Orta Sehpa ve Lotus Puf. Seçim ve süre `src/data/hero-selection.json` dosyasından yönetilir. Önceki 133 ürün ve fiyatları korunur.

## Hareket ve erişim

6,5 saniyede bir yumuşak opaklık ve konum geçişi. İleri, geri, doğrudan seçim ve duraklatma kontrolleri vardır. Fare ürün alanındayken, klavye odağı vitrindeyken ve sekme görünmezken otomatik geçiş durur. Azaltılmış hareket tercihinde otomatik oynatma ve animasyon kapalıdır. Gizli slayt bağlantıları klavye sırasına girmez.

Alt alan açık kâğıt zemin, koyu logo, ince çizgiler ve koleksiyon, destek, kurumsal bağlantı sütunlarıyla yenilendi. Aynı slogan korunur. Bu sayede ürünün formu vitrinin ana görseli olur; ek dekor veya üretilmiş ürün görseli kullanılmaz.
