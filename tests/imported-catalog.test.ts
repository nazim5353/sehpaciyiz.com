import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import products from "../src/data/catalog.json";
import provenance from "../src/data/catalog-provenance.json";
import {
  categories,
  fulfillment,
  isOpportunity,
  type Product,
} from "../src/lib/catalog";
import { calculateCart } from "../src/lib/commerce";

test("opportunities require a discount strictly above 20 percent", () => {
  assert.equal(isOpportunity({ price: 8000, previousPrice: 10000 }), false);
  assert.equal(isOpportunity({ price: 8001, previousPrice: 10000 }), false);
  assert.equal(isOpportunity({ price: 7999, previousPrice: 10000 }), true);
  assert.equal(isOpportunity({ price: 10000 }), false);
  assert.equal(isOpportunity({ price: 12000, previousPrice: 10000 }), false);
});

test("the import contains every source product once with renamed series and seven valid categories", () => {
  assert.equal(products.length, 133);
  assert.equal(provenance.products.length, products.length);
  assert.equal(new Set(products.map((p) => p.id)).size, products.length);
  assert.equal(new Set(products.map((p) => p.slug)).size, products.length);
  assert.equal(new Set(products.map((p) => p.name)).size, products.length);
  assert.equal(categories.length, 7);
  assert.equal(
    provenance.categories.reduce((n, c) => n + c.count, 0),
    products.length,
  );
  for (const product of products) {
    const source = provenance.products.find((p) => p.id === product.id)!;
    assert.ok(source);
    assert.notEqual(product.name, source.originalName);
    assert.ok(
      !product.name.startsWith(source.originalName.split(" ")[0] + " "),
    );
    assert.ok(categories.some((c) => c.slug === product.categorySlug));
    assert.equal(product.price, Math.round(source.originalSalePrice * 100));
    assert.ok(product.price > 0 && Number.isInteger(product.price));
    assert.ok(
      !Object.hasOwn(product, "creditCardPrice"),
      "One price for card and bank transfer",
    );
    assert.ok(product.previousPrice > product.price);
    assert.ok(product.description.includes(product.name));
    assert.ok(product.active);
    assert.equal(product.images.length, source.media.length);
  }
});

test("all 194 imported gallery files exist and retain their recorded original bytes", async () => {
  assert.equal(provenance.assets.length, 194);
  for (const image of provenance.assets) {
    const filename = path.join(process.cwd(), "public", image.local);
    await access(filename);
    const bytes = await readFile(filename);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      image.sha256,
      image.local,
    );
    assert.ok(image.width > 0 && image.height > 0);
  }
  for (const category of categories) {
    await access(path.join(process.cwd(), "public", category.image));
    await access(path.join(process.cwd(), "public", category.navigationImage));
  }
});

test("every imported product advertises special production and the authorized 7–14 business-day range", () => {
  for (const product of products as Product[]) {
    assert.equal(
      product.variants.length,
      1,
      "The source exposes no purchasable colour variants",
    );
    const variant = product.variants[0];
    assert.ok(variant.stock > 0);
    assert.equal(variant.madeToOrder, true);
    assert.equal(variant.leadDaysMin, 7);
    assert.equal(variant.leadDays, 14);
    assert.equal(fulfillment(variant).label, "Özel üretim");
    assert.equal(fulfillment(variant).detail, "7–14 iş günü içerisinde");
    const quote = calculateCart(
      [{ productId: product.id, variantId: variant.id, quantity: 1 }],
      products,
      19900,
      500000,
    );
    assert.equal(quote.subtotal, product.price);
    assert.equal(quote.leadDaysMin, 7);
    assert.equal(quote.leadDays, 14);
    assert.equal(quote.items[0].production, true);
  }
});

test("the source's known measurement is preserved and absent specifications stay unclaimed", () => {
  const source = provenance.products.find(
    (p) => p.originalName === "Nuta Orta Sehpa",
  )!;
  const product = products.find((p) => p.id === source.id)!;
  assert.equal(product.dimensions, "120 × 120 × 35 cm");
  assert.ok(product.material.toLocaleLowerCase("tr").includes("mdf"));
  for (const product of products) {
    const source = provenance.products.find((p) => p.id === product.id)!;
    if (!source.technicalFieldsAvailable.includes("Ölçüler"))
      assert.match(product.dimensions, /iletişime/);
    if (!source.technicalFieldsAvailable.includes("Malzeme"))
      assert.match(product.material, /iletişime/);
  }
});
