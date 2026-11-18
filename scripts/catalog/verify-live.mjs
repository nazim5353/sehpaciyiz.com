import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const products = JSON.parse(
  await fs.readFile(path.join(root, "src/data/catalog.json"), "utf8"),
);
const categories = JSON.parse(
  await fs.readFile(path.join(root, "src/data/categories.json"), "utf8"),
);
const base = "http://127.0.0.1:3100";
const report = {
  at: new Date().toISOString(),
  pages: [],
  categories: [],
  productPages: [],
  images: [],
  quotes: [],
};
async function html(route) {
  const r = await fetch(base + route, { signal: AbortSignal.timeout(60000) });
  assert.equal(r.status, 200, route);
  return r.text();
}
function cardSlugs(body) {
  return [
    ...body.matchAll(
      /<a[^>]*class="product-card-title"[^>]*href="\/urun\/([^"?]+)/g,
    ),
  ].map((m) => m[1]);
}
const home = await html("/");
assert.ok(home.includes("133"));
assert.equal(cardSlugs(home).length, 8, "Home page keeps a concise selection");
const navigation = home.match(
  /<ul class="collection-nav-categories">([\s\S]*?)<\/ul>/,
)?.[1];
assert.ok(navigation, "Visual category navigation exists");
for (const category of categories)
  assert.ok(navigation.includes(`kategori=${category.slug}`), category.slug);
assert.ok(!home.includes("Stok var"));
assert.ok(!home.includes("card-payment-price"));
const opportunities = products.filter(
  (p) => p.previousPrice && p.price * 100 < p.previousPrice * 80,
);
const opportunitySlugs = cardSlugs(await html("/koleksiyon?indirim=1"));
assert.equal(opportunitySlugs.length, Math.min(24, opportunities.length));
for (const slug of opportunitySlugs)
  assert.ok(
    opportunities.some((p) => p.slug === slug),
    "Ineligible opportunity: " + slug,
  );
report.opportunities = {
  total: opportunities.length,
  firstPage: opportunitySlugs.length,
};
const found = new Set();
for (let page = 1; page <= Math.ceil(products.length / 24); page++) {
  const body = await html(`/koleksiyon?sayfa=${page}`);
  const slugs = cardSlugs(body);
  assert.equal(slugs.length, Math.min(24, products.length - (page - 1) * 24));
  for (const slug of slugs) {
    assert.ok(!found.has(slug), "Product repeated between pages: " + slug);
    found.add(slug);
  }
  report.pages.push({ page, products: slugs.length });
}
assert.equal(found.size, products.length);
for (const product of products)
  assert.ok(found.has(product.slug), "Unlisted product " + product.slug);
for (const category of categories) {
  const body = await html(`/koleksiyon?kategori=${category.slug}`);
  const expected = products.filter(
    (p) => p.categorySlug === category.slug,
  ).length;
  assert.ok(body.includes(`${expected}`));
  for (const slug of cardSlugs(body))
    assert.equal(
      products.find((p) => p.slug === slug)?.categorySlug,
      category.slug,
    );
  report.categories.push({
    category: category.name,
    expected,
    firstPage: cardSlugs(body).length,
  });
}
const queue = products.slice();
async function productWorker() {
  while (queue.length) {
    const p = queue.shift();
    const body = await html(`/urun/${p.slug}`);
    assert.ok(body.includes(`<h1>${p.name}</h1>`), p.slug);
    assert.ok(
      body.replace(/<!--[\s\S]*?-->/g, "").includes(`Ürün kodu: ${p.sku}`),
      "Missing visible QN code: " + p.slug,
    );
    assert.ok(p.sku.startsWith("QN-"), p.slug);
    assert.ok(body.includes("Özel üretim"), p.slug);
    assert.ok(!body.includes("Stok var"), p.slug);
    assert.ok(body.includes("Kart ve havalede aynı fiyat."), p.slug);
    assert.ok(!body.includes("detail-payment-price"), p.slug);
    assert.ok(body.includes("7–14 iş günü içerisinde"), p.slug);
    assert.ok(
      body.includes(p.images[0].replace(/&/g, "&amp;")) ||
        body.includes(encodeURIComponent(p.images[0])),
      "Missing gallery " + p.slug,
    );
    report.productPages.push({
      id: p.id,
      slug: p.slug,
      code: p.sku,
      status: 200,
    });
  }
}
await Promise.all([productWorker(), productWorker(), productWorker()]);
for (let i = 0; i < products.length; i += 40) {
  const batch = products.slice(i, i + 40);
  const response = await fetch(base + "/api/cart/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(
      batch.map((p) => ({
        productId: p.id,
        variantId: p.variants[0].id,
        quantity: 1,
      })),
    ),
  });
  assert.equal(response.status, 200);
  const quote = await response.json();
  assert.equal(quote.items.length, batch.length);
  assert.equal(
    quote.subtotal,
    batch.reduce((s, p) => s + p.price, 0),
  );
  assert.equal(quote.leadDaysMin, 7);
  assert.equal(quote.leadDays, 14);
  assert.ok(quote.items.every((item) => item.production));
  report.quotes.push({
    products: batch.length,
    subtotal: quote.subtotal,
    minBusinessDays: quote.leadDaysMin,
    maxBusinessDays: quote.leadDays,
  });
}
const imageQueue = products.flatMap((p) => p.images);
async function imageWorker() {
  while (imageQueue.length) {
    const url = imageQueue.shift();
    const response = await fetch(base + url, {
      method: "HEAD",
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, url);
    assert.ok(response.headers.get("content-type")?.startsWith("image/"), url);
    report.images.push({ url, status: response.status });
  }
}
await Promise.all([imageWorker(), imageWorker(), imageWorker(), imageWorker()]);
const store = JSON.parse(
  await fs.readFile(path.join(root, ".local/store.json"), "utf8"),
);
assert.equal(store.products.length, products.length);
assert.ok(store.products.every((p) => !Object.hasOwn(p, "creditCardPrice")));
assert.deepEqual(
  store.products.map((p) => p.id).sort(),
  products.map((p) => p.id).sort(),
);
const output = path.join(root, "output/qa/catalog-import");
await fs.mkdir(output, { recursive: true });
await fs.writeFile(
  path.join(output, "live-verification.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    homeCards: 8,
    pages: report.pages.length,
    uniqueListedProducts: found.size,
    categories: report.categories.length,
    productPages: report.productPages.length,
    images: report.images.length,
    quoteProducts: report.quotes.reduce((s, q) => s + q.products, 0),
    status: "PASS",
  }),
);
