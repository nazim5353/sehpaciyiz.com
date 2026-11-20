export const infoPages: Record<
  string,
  { title: string; key?: string; paragraphs: string[] }
> = {
  hakkimizda: { title: "Her açıdan özgün.", paragraphs: [] },
  iletisim: {
    title: "Birlikte doğru tasarımı seçelim.",
    paragraphs: [
      "Ürün adı veya kodu, düşündüğünüz renk ve kullanım alanıyla bize ulaşabilirsiniz. Ölçüsü doğrulanmamış modellerde seçim yapmadan önce ölçü bilgisini teyit edin.",
      "Mağaza şu anda önizleme aşamasındadır. Bu sitede ödeme alınmaz ve gerçek sipariş oluşturulmaz.",
    ],
  },
  teslimat: {
    title: "Teslimat ve montaj",
    key: "delivery",
    paragraphs: [
      "Her modelin hazırlık bilgisi ürün sayfasında gösterilir. Siparişe özel ürünler üretim süresine tabidir; karma sepetlerde en uzun hazırlık süresi dikkate alınır. Gösterilen iş günü bilgileri takvim günü değildir.",
      "Kargo ücreti sepet tutarına göre hesaplanır ve sepet özetinde gösterilir. Montaj ve paket bilgilerini ürünün “Ölçüler ve montaj” bölümünde inceleyebilirsiniz.",
      "Bu önizlemede gönderi oluşturulmaz. Kesin teslimat, taşıyıcı ve montaj koşulları satış açılmadan önce işletme tarafından yayınlanacaktır.",
    ],
  },
  iade: {
    title: "İade ve değişim",
    key: "returns",
    paragraphs: [
      "Bu mağaza önizlemesinde sipariş veya ödeme alınmadığı için site üzerinden iade işlemi başlatılmaz.",
      "Ürün, renk ve ölçü seçiminizi kontrol edin. Siparişe özel üretim dahil kesin iade ve değişim koşulları, işletmeye ait satış metinleriyle birlikte alışveriş açılmadan önce yayınlanacaktır.",
      "Mevcut bir alışveriş hakkında yardım almak için satın aldığınız kanal üzerinden satıcıyla iletişime geçin. Ürün kodunu ve sipariş numaranızı hazır bulundurun.",
    ],
  },
  gizlilik: {
    title: "Gizlilik ve tarayıcı verileri",
    key: "privacy",
    paragraphs: [
      "Favorileriniz ve sepetiniz, bu cihazın tarayıcısındaki yerel depolamada saklanır. Başka bir cihazda otomatik olarak görünmez. Tarayıcınızdan site verilerini temizleyerek bu kayıtları kaldırabilirsiniz.",
      "Sepeti açtığınızda ürün kodu, varyant ve adet bilgileri güncel fiyatın hesaplanması için uygulamaya gönderilir. Bu işlem sipariş oluşturmaz. Bu sürümde reklam veya analiz takip kodları yüklenmez.",
      "İşletmenin veri sorumlusu bilgileri ve tam KVKK aydınlatma metni yayınlanmadan kişisel bilgi toplayan alışveriş akışı açılmaz.",
    ],
  },
  satis: {
    title: "Alışveriş hakkında",
    key: "sales",
    paragraphs: [
      "Bu sürüm, koleksiyonu incelemek ve mağaza deneyimini değerlendirmek için hazırlanmıştır. Sepete ürün eklemek satın alma, stok rezervasyonu veya ödeme yükümlülüğü oluşturmaz.",
      "Fiyat ve kargo hesaplamasını sepet özetinde görebilirsiniz. Kart bilgisi istenmez ve tahsilat yapılmaz.",
      "Satış açılmadan önce işletme bilgileri, ön bilgilendirme, mesafeli satış sözleşmesi, teslimat ve iade koşulları işletme tarafından tamamlanacaktır.",
    ],
  },
};
