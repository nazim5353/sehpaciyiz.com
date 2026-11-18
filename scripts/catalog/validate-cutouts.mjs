import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const defaultRoot = fileURLToPath(new URL("../../", import.meta.url));

async function assertUsableAlpha(input, label) {
  const alpha = await sharp(input).extractChannel("alpha").raw().toBuffer();
  let transparent = false;
  let opaque = false;
  for (const value of alpha) {
    transparent ||= value === 0;
    opaque ||= value > 240;
    if (transparent && opaque) break;
  }
  assert.ok(transparent, `Arka plan şeffaf değil: ${label}`);
  assert.ok(opaque, `Ürün görünür değil: ${label}`);
}

/** Refuse unprocessed originals or broken cutouts before changing the catalogue. */
export async function validateProductCutouts(products, { root = defaultRoot, categories = [] } = {}) {
  const records = JSON.parse(await fs.readFile(path.join(root, "src/data/catalog-cutouts.json"), "utf8"));
  const byLocal = new Map(records.map(record => [record.local, record]));
  const checked = new Set();
  for (const product of products) {
    assert.ok(product.images?.length, `Ürün görseli eksik: ${product.id}`);
    if (product.originalImages) assert.equal(product.originalImages.length, product.images.length, `Kaynak/dekupe sayısı farklı: ${product.id}`);
    for (const [index, image] of product.images.entries()) {
      const record = byLocal.get(image);
      assert.ok(record && image.startsWith("/images/catalog-cutouts/") && image.endsWith(".png"), `Önce dekupe hazırlayın; kaynak görsel vitrine eklenemez: ${product.id} / ${image}`);
      assert.equal(record.productId, product.id, `Dekupe başka ürüne ait: ${image}`);
      if (product.originalImages) assert.equal(record.source, product.originalImages[index], `Kaynak/dekupe eşleşmiyor: ${image}`);
      assert.equal(record.rgbPreserved, true, `Ürünün özgün renkleri doğrulanmamış: ${image}`);
      if (checked.has(image)) continue;
      const bytes = await fs.readFile(path.join(root, "public", image));
      assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256, `Dekupe dosyası kayıtla eşleşmiyor: ${image}`);
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.format, "png", image);
      assert.ok(metadata.hasAlpha, `Şeffaflık kanalı eksik: ${image}`);
      assert.equal(metadata.width, record.width, image);
      assert.equal(metadata.height, record.height, image);
      await assertUsableAlpha(bytes, image);
      checked.add(image);
    }
  }
  for (const category of categories) {
    assert.ok(byLocal.has(category.image), `Kategori görseli doğrulanmış dekupe değil: ${category.slug}`);
    if (category.navigationImage) {
      const meta = await sharp(path.join(root, "public", category.navigationImage)).metadata();
      assert.ok(meta.hasAlpha, `Menü görseli şeffaf değil: ${category.slug}`);
      await assertUsableAlpha(path.join(root, "public", category.navigationImage), category.navigationImage);
    }
  }
  return { products: products.length, cutouts: checked.size, categories: categories.length, verified: true };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = async file => JSON.parse(await fs.readFile(path.join(defaultRoot, file), "utf8"));
  const products = await read("src/data/catalog.json");
  const categories = await read("src/data/categories.json");
  const seed = await validateProductCutouts(products, { categories });
  const runtime = await read(".local/store.json");
  const published = new Map(products.map(product => [product.id, product.images]));
  for (const product of runtime.products)
    assert.deepEqual(product.images, published.get(product.id), `Yerel vitrin dekupe kataloğundan farklı: ${product.id}`);
  console.log(JSON.stringify({ ...seed, runtimeProductsVerified: runtime.products.length }, null, 2));
}
