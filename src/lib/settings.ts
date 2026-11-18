import { brand } from "./brand";

export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "password"
    | "number"
    | "checkbox"
    | "textarea"
    | "select";
  help?: string;
  options?: string[];
  default: string | boolean | number;
  min?: number;
  max?: number;
};
export const settingsDefinitions: Record<
  string,
  { title: string; description: string; fields: Field[] }
> = {
  genel: {
    title: "Genel ayarlar",
    description:
      "Mağaza kimliği, iletişim bilgileri ve temel satış tercihleri.",
    fields: [
      { key: "storeName", label: "Mağaza adı", default: "sehpacıyız" },
      {
        key: "tagline",
        label: "Mağaza açıklaması",
        default: brand.slogan,
      },
      {
        key: "email",
        label: "Destek e-posta adresi",
        type: "email",
        default: "",
      },
      { key: "phone", label: "Telefon", default: "" },
      {
        key: "whatsapp",
        label: "WhatsApp numarası",
        default: "",
        help: "Ülke koduyla, yalnızca rakam. Örnek: 905xxxxxxxxx",
      },
      { key: "company", label: "Firma unvanı", default: "" },
      { key: "taxOffice", label: "Vergi dairesi", default: "" },
      { key: "taxNumber", label: "Vergi numarası", default: "" },
      { key: "address", label: "Firma adresi", type: "textarea", default: "" },
      {
        key: "currency",
        label: "Para birimi",
        type: "select",
        options: ["TRY"],
        default: "TRY",
      },
      {
        key: "guestCheckout",
        label: "Üyeliksiz alışveriş",
        type: "checkbox",
        default: true,
      },
      {
        key: "taxIncluded",
        label: "Fiyatları KDV dahil göster",
        type: "checkbox",
        default: true,
      },
    ],
  },
  odeme: {
    title: "Ödeme ve İyzico",
    description:
      "Sanal POS bağlantı bilgileri. Bu aşamada tahsilat kapalıdır; canlı bağlantı ayrıca geliştirilecek ve doğrulanacak.",
    fields: [
      {
        key: "mode",
        label: "Çalışma ortamı",
        type: "select",
        options: ["sandbox", "live"],
        default: "sandbox",
      },
      {
        key: "apiKey",
        label: "İyzico API anahtarı",
        type: "password",
        default: "",
      },
      {
        key: "secretKey",
        label: "İyzico güvenlik anahtarı",
        type: "password",
        default: "",
      },
      {
        key: "installments",
        label: "Talep edilen taksit sayıları",
        default: "1,2,3,6",
        help: "Kullanılabilecek seçenekler İyzico hesabınıza ve kartınıza göre belirlenecek.",
      },
      {
        key: "force3ds",
        label: "3D Secure tercih et",
        type: "checkbox",
        default: true,
      },
      {
        key: "bankTransfer",
        label: "Havale / EFT sun",
        type: "checkbox",
        default: false,
      },
      { key: "iban", label: "Havale IBAN", default: "" },
      { key: "accountName", label: "Hesap sahibi", default: "" },
    ],
  },
  kargo: {
    title: "Kargo ve teslimat",
    description:
      "Kargo ücretleri, üretim süreleri ve taşıyıcı bağlantı hazırlığı. Otomatik etiket servisi henüz bağlı değil.",
    fields: [
      {
        key: "carrier",
        label: "Kargo hizmeti",
        type: "select",
        options: [
          "Manuel takip",
          "Yurtiçi Kargo",
          "Aras Kargo",
          "MNG Kargo",
          "Sürat Kargo",
          "Geliver",
        ],
        default: "Manuel takip",
      },
      {
        key: "flatRate",
        label: "Standart kargo ücreti (TL)",
        type: "number",
        default: 199,
        min: 0,
        max: 50000,
      },
      {
        key: "freeThreshold",
        label: "Ücretsiz kargo alt limiti (TL)",
        type: "number",
        default: 5000,
        min: 0,
        max: 1000000,
      },
      {
        key: "dispatchDays",
        label: "Hazır stok hazırlık süresi (iş günü)",
        type: "number",
        default: 3,
        min: 1,
        max: 90,
      },
      {
        key: "productionDays",
        label: "Varsayılan üretim süresi (iş günü)",
        type: "number",
        default: 14,
        min: 1,
        max: 180,
      },
      {
        key: "apiKey",
        label: "Kargo API anahtarı",
        type: "password",
        default: "",
      },
      {
        key: "customerCode",
        label: "Kargo müşteri / sözleşme kodu",
        default: "",
      },
      {
        key: "autoLabel",
        label: "Ödeme onayında etiket oluşturma tercihi",
        type: "checkbox",
        default: false,
        help: "Tercih kaydedilir. Otomasyon taşıyıcı adaptörü tamamlandığında çalışacak.",
      },
      {
        key: "senderAddress",
        label: "Gönderici / iade adresi",
        type: "textarea",
        default: "",
      },
    ],
  },
  smtp: {
    title: "SMTP ve e-posta",
    description:
      "Sipariş e-postaları için gönderici yapılandırması. Bu sürüm e-posta göndermez.",
    fields: [
      {
        key: "host",
        label: "SMTP sunucusu",
        default: "",
        help: "Örnek: smtp.firmaniz.com",
      },
      {
        key: "port",
        label: "Port",
        type: "number",
        default: 587,
        min: 1,
        max: 65535,
      },
      {
        key: "secure",
        label: "Doğrudan TLS (genellikle port 465)",
        type: "checkbox",
        default: false,
      },
      { key: "username", label: "SMTP kullanıcı adı", default: "" },
      { key: "password", label: "SMTP şifresi", type: "password", default: "" },
      { key: "fromName", label: "Gönderici adı", default: "Sehpacıyız" },
      {
        key: "fromEmail",
        label: "Gönderici e-posta",
        type: "email",
        default: "",
      },
      { key: "replyTo", label: "Yanıt adresi", type: "email", default: "" },
    ],
  },
  api: {
    title: "API ve entegrasyonlar",
    description:
      "Üretim, fatura ve pazarlama bağlantılarının ayarları. Sağlayıcı adaptörleri kurulum bekliyor.",
    fields: [
      { key: "productionUrl", label: "Yergin üretim API adresi", default: "" },
      {
        key: "productionToken",
        label: "Üretim API erişim anahtarı",
        type: "password",
        default: "",
      },
      {
        key: "invoiceProvider",
        label: "E-fatura sağlayıcısı",
        type: "select",
        options: ["Henüz seçilmedi", "Paraşüt", "BirFatura", "Logo", "Diğer"],
        default: "Henüz seçilmedi",
      },
      {
        key: "invoiceKey",
        label: "E-fatura API anahtarı",
        type: "password",
        default: "",
      },
      {
        key: "smsProvider",
        label: "SMS sağlayıcısı",
        type: "select",
        options: ["Henüz seçilmedi", "Netgsm", "İleti Merkezi"],
        default: "Henüz seçilmedi",
      },
      {
        key: "smsKey",
        label: "SMS API anahtarı",
        type: "password",
        default: "",
      },
      {
        key: "metaToken",
        label: "Meta Conversions API anahtarı",
        type: "password",
        default: "",
      },
    ],
  },
  seo: {
    title: "SEO ve ölçümleme",
    description:
      "Arama motoru ve reklam ölçümleme tercihleri. Önizleme arama motorlarına kapalıdır; takip kodları henüz yüklenmez.",
    fields: [
      {
        key: "title",
        label: "Site başlığı",
        default: brand.title,
      },
      {
        key: "description",
        label: "Meta açıklaması",
        type: "textarea",
        default:
          brand.description,
      },
      { key: "gtm", label: "Google Tag Manager ID", default: "" },
      { key: "ga4", label: "GA4 ölçüm kimliği", default: "" },
      { key: "metaPixel", label: "Meta Pixel ID", default: "" },
      {
        key: "consentRequired",
        label: "Pazarlama çerezleri için izin iste",
        type: "checkbox",
        default: true,
      },
    ],
  },
  bildirimler: {
    title: "Bildirim tercihleri",
    description:
      "SMTP ve SMS servisleri bağlandığında kullanılacak işlem bildirimleri.",
    fields: [
      {
        key: "orderCreated",
        label: "Sipariş alındı e-postası",
        type: "checkbox",
        default: true,
      },
      {
        key: "paymentReceived",
        label: "Ödeme onayı e-postası",
        type: "checkbox",
        default: true,
      },
      {
        key: "shipped",
        label: "Kargo takip e-postası",
        type: "checkbox",
        default: true,
      },
      {
        key: "refund",
        label: "İade sonucu e-postası",
        type: "checkbox",
        default: true,
      },
      {
        key: "newOrderEmail",
        label: "Yeni sipariş bildirim adresi",
        type: "email",
        default: "",
      },
    ],
  },
  icerik: {
    title: "Ana sayfa ve içerik",
    description:
      "Mağaza vitrininin başlıklarını düzenleyin. Değişiklikler ana sayfaya yansır.",
    fields: [
      {
        key: "heroTitle",
        label: "Ana sayfa başlığı",
        default: brand.slogan,
      },
      {
        key: "heroDescription",
        label: "Ana sayfa açıklaması",
        type: "textarea",
        default:
          brand.heroDescription,
      },
      {
        key: "announcement",
        label: "Üst duyuru metni",
        default: brand.announcement,
      },
      {
        key: "about",
        label: "Marka hakkında",
        type: "textarea",
        default:
          brand.about,
      },
    ],
  },
  yasal: {
    title: "Yasal metinler",
    description:
      "İşletmenize uygun metinler yayın öncesinde yetkili kişi tarafından hazırlanmalı. Boş metinler mağazada yayınlanmaz.",
    fields: [
      {
        key: "privacy",
        label: "Gizlilik ve KVKK aydınlatma metni",
        type: "textarea",
        default: "",
      },
      {
        key: "sales",
        label: "Mesafeli satış sözleşmesi",
        type: "textarea",
        default: "",
      },
      {
        key: "returns",
        label: "İade ve değişim koşulları",
        type: "textarea",
        default: "",
      },
      {
        key: "delivery",
        label: "Teslimat ve montaj koşulları",
        type: "textarea",
        default: "",
      },
    ],
  },
};
export type Settings = Record<
  string,
  Record<string, string | boolean | number>
>;
export function defaultSettings(): Settings {
  return Object.fromEntries(
    Object.entries(settingsDefinitions).map(([section, definition]) => [
      section,
      Object.fromEntries(
        definition.fields.map((field) => [field.key, field.default]),
      ),
    ]),
  );
}
export const SECRET_MASK = "••••••••";
