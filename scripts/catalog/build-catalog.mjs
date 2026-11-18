import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const source = JSON.parse(
  await fs.readFile(
    path.join(root, ".local/catalog-import/source/products.json"),
    "utf8",
  ),
);
const output = path.join(root, "src/data");
await fs.mkdir(output, { recursive: true });
async function optionalData(filename) {
  try {
    return JSON.parse(await fs.readFile(path.join(output, filename), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
const verifiedCodes = new Map(
  (await optionalData("product-codes.json")).map((c) => [c.productId, c.code]),
);
const preparedCutouts = new Map(
  (await optionalData("catalog-cutouts.json")).map((c) => [c.source, c.local]),
);
const fold = (value) =>
  value
    .toLocaleLowerCase("tr")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i");
const slug = (value) =>
  fold(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const families = [
  ...new Set(source.map((p) => p.product.name.split(" ")[0])),
].sort((a, b) => a.localeCompare(b, "tr"));
const names =
  `Alvian Nerova Soreva Avelio Merian Corvia Tavira Ivara Orelio Melora Kavira
Arevio Solvia Ravena Tereno Milven Arveta Olvian Evrina Narelo Vireon Selvia
Alveta Nevio Solvian Mareno Talvia Belvia Ovelia Relven Anviro Evaris Corven
Larevo Meriva Calven Taveon Silven Alviro Neriva Calira Olenia Varelo Sorelio
Berova Kireva Marevo Velian Alvero Torvia Evania Iveris Darvio Ervian Soriva
Mevian Carivo Lareva Renova Talvero Belvio Averis Novian Sevria Karelo Omelia
Laviro Delvia Evario Raveon Arvelo Perivo Talven Soreno Erelia Manvero Arvian
Valeris Nareva Kavelo Orelia Selvian Malvero Tirena Averio Verdan Calvio Ravia
Berivo Nireva Ravira Evelio Tarven Corena Melvio Nerelio Ovaris Mirevo Arven
Senvia Larelio Levian Tolvia Elvian Marvia Revalio Solvero Talino Cevira
Ivenio Narven Kelvia Olvero Morvia Vairel Serivo Alvenio Darena Elario Neravo
Ravelo Tareva Orevio Valven Nivara Amelio Cordia Melven Arenia Cavenio Silora
Norelio Altiva Kaveno Mirelia Levaris Ovelio Renvia Cireva Norvia Mavelo`.split(
    /\s+/,
  );
const occupied = new Set(families.map(fold));
const available = [...new Set(names)].filter((n) => !occupied.has(fold(n)));
if (available.length < families.length)
  throw new Error(
    `Only ${available.length} names for ${families.length} families`,
  );
const nameMap = Object.fromEntries(
  families.map((name, i) => [name, available[i]]),
);

const categoryDefinitions = [
  {
    source: "orta-sehpalar",
    slug: "orta-sehpa",
    name: "Orta sehpalar",
    subtitle: "Salonun buluşma noktası",
    suffix: "Orta Sehpa",
  },
  {
    source: "yan-sehpalar-ikili-setler",
    slug: "yan-sehpa",
    name: "Yan sehpalar",
    subtitle: "Koltuk yanında, hayatın içinde",
    suffix: "Yan Sehpa",
  },
  {
    source: "zigon-sehpalar",
    slug: "zigon-sehpa",
    name: "Zigon sehpalar",
    subtitle: "Birlikte de ayrı da kullanışlı",
    suffix: "Zigon Sehpa Seti",
  },
  {
    source: "dresuarlar",
    slug: "dresuar",
    name: "Dresuarlar",
    subtitle: "Evine güzel bir karşılama",
    suffix: "Dresuar",
  },
  {
    source: "tv-sehpalari",
    slug: "tv-sehpasi",
    name: "TV sehpaları",
    subtitle: "Ekranın etrafında yeni bir düzen",
    suffix: "TV Sehpası",
  },
  {
    source: "dekoratif-rafkitaplik",
    slug: "raf-kitaplik",
    name: "Raf ve kitaplıklar",
    subtitle: "Sevdiğin şeylere yer aç",
    suffix: "Dekoratif Kitaplık",
  },
  {
    source: "servis-arabalari",
    slug: "servis-arabasi",
    name: "Servis arabaları",
    subtitle: "Sunumlarına eşlik eden tasarımlar",
    suffix: "Servis Arabası",
  },
];
const patterns = {
  "orta-sehpa": [
    "Salonun merkezinde kahveye, kitaplara ve sevdiğin objelere yer açar. Oturma alanının düzenini kendi yaşam ritmine göre tamamla.",
    "Günlük kullanım alanını salonun ortasında bir araya getirir. Kahve molalarından akşam sohbetlerine, evindeki anlara eşlik eder.",
    "Oturma alanını tamamlamak ve sevdiğin detayları bir arada tutmak için bir seçenek. Salonuna, senin kullanım alışkanlıklarınla anlam kazanacak bir köşe ekle.",
    "Kahveni, okuduğun kitabı ve dekoratif parçalarını bir araya getirebileceğin bir merkez oluşturur. Salon düzenini kişisel seçimlerinle tamamla.",
  ],
  "yan-sehpa": [
    "Koltuk veya berjer yanında günlük ihtiyaçlarını yakında tutmak için bir alan oluşturur. Kahve kupana, kitabına ya da sevdiğin bir objeye yer ayır.",
    "Oturma köşene eşlik eden bir tamamlayıcı. Yanına almak istediğin eşyaları, evindeki kullanım düzenine göre bir araya getir.",
    "Kahve molalarında ve okuma köşesinde elinin altında bir alan sunar. Evindeki yerleşimi, kendi ihtiyaçlarına göre tamamla.",
  ],
  "zigon-sehpa": [
    "Sehpa setiyle oturma alanında birden fazla kullanım noktası oluşturabilirsin. Günlük yerleşimden misafir ağırlamaya, parçaları ihtiyacına göre değerlendir.",
    "Salonunda farklı noktalara eşlik eden bir sehpa seti. Kahve ve servis alanlarını, evindeki düzene göre birlikte planla.",
    "Günlük kullanım ve sunum için bir arada düşünülen parçalar. Oturma alanını, ihtiyaç duyduğun noktalarda kullanabileceğin bir setle tamamla.",
  ],
  dresuar: [
    "Antrede veya yaşam alanında dekoratif objelerin için bir odak noktası oluşturur. Bir ayna, aydınlatma ya da sevdiğin aksesuarlarla kendi düzenini kur.",
    "Evinin girişine veya tamamlamak istediğin bir duvara eşlik eder. Kişisel objelerinle, sana ait bir karşılama köşesi oluşturabilirsin.",
  ],
  "tv-sehpasi": [
    "Televizyon çevresindeki yerleşimi tamamlayan bir tasarım. Ekran alanını, odanın diğer parçalarıyla birlikte planlamak için değerlendirebilirsin.",
    "Ekran köşesine kendi düzenini kurabileceğin bir zemin ekler. Televizyon ve çevresindeki objeleri, alanının ölçülerine göre birlikte değerlendir.",
  ],
  "raf-kitaplik": [
    "Kitaplarına, küçük objelerine ve sergilemek istediğin parçalara yer ayır. Duvar önünde kişisel bir düzen kurarken evinin karakterini detaylarla tamamla.",
    "Kitaplarla dekoratif parçaları bir araya getirebileceğin bir alan oluşturur. İçeriğini kendi seçtiklerinle doldur, evinde sana ait bir köşe kur.",
  ],
  "servis-arabasi": [
    "İçecek ve sunum parçalarını bir arada düzenlemek için bir seçenek. Kahve köşesinden misafir ağırlamaya, kullanımını kendi ihtiyaçlarına göre planla.",
  ],
};
const featuredSourceIds = [136, 242, 229, 143, 232, 241, 112, 175];
for (const category of categoryDefinitions) {
  const representative = source.find((p) =>
    p.categories.some((c) => c.url.endsWith("/" + category.source)),
  );
  if (representative && !featuredSourceIds.includes(representative.product.id))
    featuredSourceIds.push(representative.product.id);
}
const products = [],
  provenance = [];
const jobs = [];
for (const item of source) {
  const original = item.product;
  const sourceCategory = item.categories[0]?.url.split("/").pop();
  const category =
    categoryDefinitions.find((c) => c.source === sourceCategory) ??
    (original.name.includes("Orta") ? categoryDefinitions[0] : null);
  if (!category) throw new Error("Unmapped category: " + original.name);
  const family = nameMap[original.name.split(" ")[0]];
  const suffix =
    category.slug === "yan-sehpa" && /ikili/i.test(fold(original.name))
      ? "İkili Yan Sehpa Seti"
      : category.suffix;
  const name = `${family} ${suffix}`;
  const productSlug = slug(name);
  const rows = item.propertyRows.filter(
    (row) => row.length >= 2 && clean(row[1]),
  );
  const specs = rows.map(([label, value]) => {
    if (label === "Temizlik Önerisi")
      value = /sıcak|suyun/i.test(value)
        ? "Yüzeyi hafif nemli bezle temizleyin. Doğrudan güneşten koruyun; sıcak yüzeylerin ve suyun uzun süre temas etmesini önleyin."
        : "Hafif nemli bir bezle temizleyin ve doğrudan güneş ışığından koruyun.";
    if (label === "Renk" && /whatsapp/i.test(value))
      value =
        clean(value.split("(")[0]) +
        ". Diğer renk seçenekleri için bilgi alabilirsiniz.";
    return { label, value: clean(value) };
  });
  const field = (label) => specs.find((row) => row.label === label)?.value;
  const current = Number(original.salePrice ?? original.price);
  const previous = Number(original.price);
  if (!(current > 0)) throw new Error("Invalid price: " + original.name);
  const media = item.media.filter((m) => m.type === "image" && m.fullUrl);
  if (!media.length) throw new Error("Missing gallery: " + original.name);
  const images = media.map((m, i) => {
    const ext =
      path.extname(new URL(m.fullUrl).pathname).toLowerCase() || ".jpg";
    if (![".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext))
      throw new Error("Unexpected image format: " + m.fullUrl);
    const local = `/images/catalog/${productSlug}/${String(i + 1).padStart(2, "0")}${ext}`;
    jobs.push({
      productId: `p${original.id}`,
      source: m.fullUrl,
      local,
      fallback: m.xlUrl ?? m.lgUrl,
    });
    return local;
  });
  const textOptions = patterns[category.slug];
  const description = `${name}. ${textOptions[original.id % textOptions.length]} Siparişe özel üretimle hazırlanır.`;
  const product = {
    id: `p${original.id}`,
    sku:
      verifiedCodes.get(`p${original.id}`) ??
      `QN-${String(original.sku).trim()}`,
    slug: productSlug,
    name,
    category: category.name,
    categorySlug: category.slug,
    price: Math.round(current * 100),
    ...(previous > current
      ? { previousPrice: Math.round(previous * 100) }
      : {}),
    images: images.map((image) => preparedCutouts.get(image) ?? image),
    originalImages: images,
    description,
    material:
      field("Malzeme") ?? "Malzeme ayrıntıları için bizimle iletişime geçin.",
    dimensions:
      field("Ölçüler")?.replace(/[xX]/g, " × ") ??
      "Ölçü bilgisi için bizimle iletişime geçin.",
    assembly: "Kurulum ayrıntıları için ürün bilgisi talep edebilirsiniz.",
    specifications: specs,
    ...(field("Renk") ? { colorNote: field("Renk") } : {}),
    variants: [
      {
        id: "standart",
        name: field("Renk")?.startsWith("Siyah") ? "Siyah" : "Standart model",
        ...(field("Renk")?.startsWith("Siyah") ? { color: "#292929" } : {}),
        stock: Number(original.stock),
        leadDays: 14,
        leadDaysMin: 7,
        madeToOrder: true,
        surcharge: 0,
      },
    ],
    featured: featuredSourceIds.includes(original.id),
    active: true,
    badge: "Özel üretim",
    catalogImported: true,
  };
  products.push(product);
  provenance.push({
    id: product.id,
    name,
    slug: productSlug,
    originalName: original.name,
    originalSku: original.sku,
    sourceId: original.id,
    sourceUrl: item.url,
    sourceCategory: sourceCategory ?? "orta-sehpalar (ürün adına göre)",
    originalPrice: original.price,
    originalSalePrice: original.salePrice,
    originalCreditCardPrice: original.creditCardPrice,
    originalSaleCreditCardPrice: original.saleCreditCardPrice,
    sourceStock: original.stock,
    fetchedAt: item.fetchedAt,
    technicalFieldsAvailable: specs.map((s) => s.label),
    media: media.map((m) => m.fullUrl),
  });
}
if (new Set(products.map((p) => p.slug)).size !== products.length)
  throw new Error("Duplicate product slug");
if (new Set(products.map((p) => p.id)).size !== products.length)
  throw new Error("Duplicate product id");
const pending = jobs.slice(),
  results = [],
  failures = [];
let completed = 0;
async function download(job) {
  const filename = path.join(root, "public", job.local);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  let bytes;
  try {
    bytes = await fs.readFile(filename);
    await sharp(bytes).metadata();
  } catch {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(job.source, {
          signal: AbortSignal.timeout(60000),
        });
        if (!response.ok) throw new Error(`${response.status}: ${job.source}`);
        bytes = Buffer.from(await response.arrayBuffer());
        const metadata = await sharp(bytes).metadata();
        if (!metadata.width || !metadata.height)
          throw new Error("Unreadable image");
        await fs.writeFile(filename, bytes);
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  const metadata = await sharp(bytes).metadata();
  return {
    ...job,
    bytes: bytes.length,
    width: metadata.width,
    height: metadata.height,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}
async function worker() {
  while (pending.length) {
    const job = pending.shift();
    try {
      results.push(await download(job));
    } catch (error) {
      failures.push({ ...job, error: error.message });
    }
    completed++;
    if (completed % 20 === 0 || !pending.length)
      console.log(
        JSON.stringify({
          images: completed,
          total: jobs.length,
          failed: failures.length,
        }),
      );
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await fs.writeFile(
  path.join(root, ".local/catalog-import/image-failures.json"),
  JSON.stringify(failures, null, 2),
);
if (failures.length) {
  console.error(JSON.stringify(failures));
  process.exit(1);
}
const categories = categoryDefinitions.map((c) => {
  const group = products.filter((p) => p.categorySlug === c.slug);
  const representative = group.find((p) => p.featured) ?? group[0];
  return {
    name: c.name,
    slug: c.slug,
    subtitle: c.subtitle,
    image: representative.images[0],
    navigationImage: preparedCutouts.size
      ? `/images/categories/${c.slug}-cutout.png`
      : `/images/categories/${c.slug}.png`,
  };
});
const manifest = {
  importedAt: new Date().toISOString(),
  sourceSite: baseUrl(),
  productCount: products.length,
  imageCount: results.length,
  categories: categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    count: products.filter((p) => p.categorySlug === c.slug).length,
  })),
  products: provenance,
  assets: results,
  names: nameMap,
  fulfillment: {
    label: "Özel üretim",
    madeToOrder: true,
    minBusinessDays: 7,
    maxBusinessDays: 14,
    authorizedBy: "Kullanıcının katalog aktarımı sırasındaki talimatı",
  },
};
function baseUrl() {
  return "https://yergindesign.com/";
}
await fs.writeFile(
  path.join(output, "catalog.json"),
  JSON.stringify(products, null, 2) + "\n",
);
await fs.writeFile(
  path.join(output, "categories.json"),
  JSON.stringify(categories, null, 2) + "\n",
);
await fs.writeFile(
  path.join(output, "catalog-provenance.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    products: products.length,
    images: results.length,
    totalMiB: Math.round(
      results.reduce((s, r) => s + r.bytes, 0) / 1024 / 1024,
    ),
    categories: manifest.categories,
    featured: products
      .filter((p) => p.featured)
      .map((p) => ({ name: p.name, id: p.id, image: p.images[0] })),
    missingTechnical: products.filter((p) => !p.specifications.length).length,
  }),
);
