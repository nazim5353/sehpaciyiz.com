import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCart } from "../src/lib/commerce";
import { seedProducts } from "./fixtures/catalog";
import type { Product } from "../src/lib/catalog";
test("server quote uses catalog prices and charges shipping below the threshold", () => {
  const quote = calculateCart(
    [{ productId: "luna", variantId: "mese", quantity: 1 }],
    seedProducts,
    19900,
    500000,
  );
  assert.equal(quote.subtotal, 429000);
  assert.equal(quote.shipping, 19900);
  assert.equal(quote.total, 448900);
});
test("mixed cart uses the latest production lead time and free shipping", () => {
  const quote = calculateCart(
    [
      { productId: "luna", variantId: "mese", quantity: 1 },
      { productId: "luna", variantId: "ceviz", quantity: 1 },
    ],
    seedProducts,
    19900,
    500000,
  );
  assert.equal(quote.total, 878000);
  assert.equal(quote.shipping, 0);
  assert.equal(quote.leadDays, 14);
  assert.equal(quote.items[1].production, true);
});
test("duplicate lines cannot bypass stock limits", () => {
  assert.throws(
    () =>
      calculateCart(
        [
          { productId: "luna", variantId: "mese", quantity: 5 },
          { productId: "luna", variantId: "mese", quantity: 5 },
        ],
        seedProducts,
        19900,
        500000,
      ),
    /hazır stok/,
  );
});
test("invalid quantities and unknown variants are rejected", () => {
  for (const quantity of [0, -1, 1.5, 21, NaN])
    assert.throws(() =>
      calculateCart(
        [{ productId: "luna", variantId: "mese", quantity }],
        seedProducts,
        0,
        500000,
      ),
    );
  assert.throws(() =>
    calculateCart(
      [{ productId: "luna", variantId: "silinmis", quantity: 1 }],
      seedProducts,
      0,
      500000,
    ),
  );
});
test("inactive products are rejected and an empty cart has no shipping fee", () => {
  const products = structuredClone(seedProducts);
  products[0].active = false;
  assert.throws(() =>
    calculateCart(
      [{ productId: "luna", variantId: "mese", quantity: 1 }],
      products,
      19900,
      500000,
    ),
  );
  assert.equal(calculateCart([], products, 19900, 500000).total, 0);
});

test("made-to-order items use production capacity rather than ready-stock limits", () => {
  const products: Product[] = structuredClone(seedProducts);
  products[0].variants[0].madeToOrder = true;
  products[0].variants[0].stock = 1;
  const quote = calculateCart(
    [
      {
        productId: products[0].id,
        variantId: products[0].variants[0].id,
        quantity: 3,
      },
    ],
    products,
    0,
    0,
  );
  assert.equal(quote.items[0].quantity, 3);
  assert.equal(quote.items[0].production, true);
});
