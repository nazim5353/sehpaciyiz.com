import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import catalog from "../src/data/catalog.json";
import categories from "../src/data/categories.json";
import { calculateCart } from "../src/lib/commerce";
import type { Product } from "../src/lib/catalog";

test("the complete 64 pictured PUF models retain unique source codes and leave the original catalogue present", async () => {
  const provenance = JSON.parse(await readFile("src/data/pouf-provenance.json", "utf8"));
  const poufs = catalog.filter(product => product.categorySlug === "puf");
  assert.equal(poufs.length, 64);
  assert.equal(catalog.length, 197);
  assert.equal(categories.length, 8);
  assert.equal(new Set(catalog.map(product => product.id)).size, catalog.length);
  assert.equal(new Set(catalog.map(product => product.slug)).size, catalog.length);
  assert.equal(new Set(provenance.items.map((item: { sku: string }) => item.sku)).size, 64);
  assert.equal(new Set(provenance.items.map((item: { photoSha256: string }) => item.photoSha256)).size, 64, "Two different photographed models must not accidentally share a PDF image");
  for (const item of provenance.items) {
    const product = poufs.find(product => product.id === item.productId);
    assert.ok(product, item.sku);
    assert.equal(product.sku, item.sku);
    assert.ok(product.images[0].startsWith("/images/catalog-cutouts/"));
    assert.ok(product.images[0].endsWith(".png"));
    assert.notEqual(product.images[0], product.originalImages[0]);
    assert.equal(Object.hasOwn(product, "previousPrice"), false, "No fabricated discount");
  }
});

test("pouf prices use VAT-inclusive source totals times 2.5 rounded upward to 50 TRY", async () => {
  const provenance = JSON.parse(await readFile("src/data/pouf-provenance.json", "utf8"));
  for (const item of provenance.items) {
    const product = catalog.find(product => product.id === item.productId)!;
    const multiplied = item.sourceGrossKurus * 2.5;
    assert.equal(product.price % 5000, 0, item.sku);
    assert.ok(product.price >= multiplied && product.price < multiplied + 5000, item.sku);
    assert.equal(product.price, item.salePriceKurus);
  }
  for (const [sku, expected] of [["PYP-0830", 1100000], ["PYP-0832", 1035000], ["PYP-0837", 785000], ["PYP-0635", 1240000]] as const) {
    assert.equal(catalog.find(product => product.sku === sku)?.price, expected, sku);
  }
});

test("pouf production and mixed carts reflect 15 business days without claiming ready stock", () => {
  const product = catalog.find(product => product.sku === "PYP-0830")!;
  assert.equal(product.variants[0].madeToOrder, true);
  assert.equal(product.variants[0].stock, 0);
  assert.equal(product.variants[0].leadDays, 15);
  const quote = calculateCart([{ productId: product.id, variantId: product.variants[0].id, quantity: 2 }], catalog as Product[], 19900, 500000);
  assert.equal(quote.total, 2200000);
  assert.equal(quote.leadDays, 15);
  assert.equal(quote.items[0].production, true);
});
