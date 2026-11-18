export const commerceModules = [
  {
    slug: "siparisler",
    title: "Siparişler",
    group: "Satış",
    status: "Geliştirilecek",
    description:
      "Sipariş, ödeme ve üretim durumlarını ayrı takip eden sipariş merkezi.",
    capabilities: [
      "Sipariş arama, filtreleme ve dışa aktarma",
      "Müşteri, teslimat ve fatura adresi anlık görüntüsü",
      "Ürün, varyant ve fiyat anlık görüntüsü",
      "Hazır stok rezervasyonu ve süre aşımı",
      "Üretim iş emri ve tahmini hazırlık süresi",
      "Sipariş notları ve durum geçmişi",
    ],
  },
  {
    slug: "musteriler",
    title: "Müşteriler",
    group: "Satış",
    status: "Geliştirilecek",
    description:
      "Üyeler ve üyeliksiz alışveriş yapan müşteriler için tek müşteri kaydı.",
    capabilities: [
      "Müşteri listesi ve sipariş geçmişi",
      "Adres defteri ve kurumsal fatura bilgileri",
      "Üyelik, giriş ve şifre yenileme",
      "İletişim izinleri ve izin kayıtları",
      "Veri dışa aktarma ve silme talepleri",
    ],
  },
  {
    slug: "iadeler",
    title: "İptal ve iadeler",
    group: "Satış",
    status: "Geliştirilecek",
    description:
      "Ürün iade talebi ile ödeme iadesini ayrı yöneten takip akışı.",
    capabilities: [
      "Kalem bazında iade talebi",
      "Tam ve kısmi İyzico iadesi",
      "İptal ve stok rezervasyonu çözme",
      "İade kargosu ve inceleme süreci",
      "İade mutabakatı ve işlem geçmişi",
    ],
  },
  {
    slug: "kampanyalar",
    title: "Kampanyalar",
    group: "Mağaza",
    status: "Geliştirilecek",
    description:
      "İndirim, kupon ve set tekliflerini kârlılık sınırlarıyla yönetin.",
    capabilities: [
      "Tarih aralıklı sabit ve yüzdelik kuponlar",
      "Minimum sepet ve kullanım sınırları",
      "Ürün ve kategori bazlı indirim",
      "Kampanya birleştirme kuralları",
      "Ücretsiz kargo ve set kampanyaları",
    ],
  },
  {
    slug: "kategoriler",
    title: "Kategoriler ve medya",
    group: "Mağaza",
    status: "Geliştirilecek",
    description: "Ürün ağacı, görseller, videolar ve kategori içerikleri.",
    capabilities: [
      "Kategori sıralaması ve hiyerarşi",
      "Görsel yükleme ve boyut optimizasyonu",
      "Varyanta özel görseller",
      "Alternatif metin ve medya arşivi",
      "SEO adresleri ve yönlendirmeler",
    ],
  },
  {
    slug: "faturalar",
    title: "E-fatura",
    group: "Operasyon",
    status: "Sağlayıcı bekliyor",
    description:
      "Seçilecek e-fatura sağlayıcısı ile fatura oluşturma ve takibi.",
    capabilities: [
      "Bireysel ve kurumsal fatura",
      "Sağlayıcı API adaptörü",
      "Fatura numarası, PDF ve durum takibi",
      "İade faturası süreci",
      "Yeniden deneme ve hata kuyruğu",
    ],
  },
  {
    slug: "otomasyonlar",
    title: "Kargo otomasyonu",
    group: "Operasyon",
    status: "Sağlayıcı bekliyor",
    description:
      "Ödeme onayından teslimata kadar taşıyıcıyla otomatik veri alışverişi.",
    capabilities: [
      "Hazır siparişten otomatik gönderi / barkod oluşturma",
      "Desi, paket ve çoklu koli desteği",
      "Taşıyıcı durum bildirimleri ve periyodik sorgulama",
      "Kargo etiketi ve takip bağlantısı",
      "Tekrarlı gönderi önleme",
      "Hata kuyruğu ve kontrollü yeniden deneme",
    ],
  },
  {
    slug: "raporlar",
    title: "Raporlar",
    group: "Operasyon",
    status: "Geliştirilecek",
    description: "Satış, ödeme, ürün, stok ve teslimat görünürlüğü.",
    capabilities: [
      "Ciro, indirim ve iade raporu",
      "Ürün ve varyant performansı",
      "Stok ve üretim ihtiyaçları",
      "İyzico tahsilat mutabakatı",
      "Kargo ve ürün maliyeti",
      "CSV dışa aktarma",
    ],
  },
  {
    slug: "guvenlik",
    title: "Kullanıcılar ve güvenlik",
    group: "Sistem",
    status: "Temel oturum hazır",
    description:
      "Yerel yönetici oturumu hazır. Canlı kullanıcı yönetimi yayın öncesi tamamlanacak.",
    capabilities: [
      "Rol ve işlem bazlı yetkilendirme",
      "Yönetici iki adımlı doğrulama",
      "Oturum listesi ve oturum sonlandırma",
      "Giriş denemesi sınırları ve alarm",
      "Günlük harici yedek ve geri yükleme denemesi",
      "Gizli anahtar rotasyonu",
    ],
  },
];
