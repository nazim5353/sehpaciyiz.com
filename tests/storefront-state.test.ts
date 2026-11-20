import { test } from "node:test";
import assert from "node:assert/strict";
import {
  restoreStorefront,
  quantityLimit,
  matchesProduct,
  collectionQuery,
} from "../src/lib/storefront-state";
import { seedProducts } from "./fixtures/catalog";

test("browser restoration rejects malformed data, merges duplicates and respects stock", () => {
  for (const value of [
    null,
    false,
    42,
    "broken",
    [],
    { cart: [null, {}, { quantity: NaN }] },
  ])
    assert.deepEqual(restoreStorefront(value, seedProducts), {
      cart: [],
      favorites: [],
    });
  const p = seedProducts[0],
    v = p.variants[0];
  const line = { productId: p.id, variantId: v.id, quantity: 5 };
  const restored = restoreStorefront(
    {
      cart: [
        line,
        line,
        { ...line, quantity: -1 },
        { ...line, variantId: "removed" },
      ],
      favorites: [p.id, p.id, "removed", null],
    },
    seedProducts,
  );
  assert.deepEqual(restored.cart, [
    { ...line, quantity: Math.min(10, quantityLimit(v)) },
  ]);
  assert.deepEqual(restored.favorites, [p.id]);
  const inactive = structuredClone(seedProducts);
  inactive[0].active = false;
  assert.deepEqual(
    restoreStorefront({ cart: [line], favorites: [p.id] }, inactive),
    { cart: [], favorites: [] },
  );
});

test("made-to-order quantities are independent of ready stock", () => {
  assert.equal(
    quantityLimit({
      id: "v",
      name: "Test",
      stock: 2,
      madeToOrder: true,
      leadDays: 15,
      surcharge: 0,
    }),
    20,
  );
});

test("Turkish search matches ASCII input, category, SKU and multiple words", () => {
  const product = {
    ...seedProducts[0],
    name: "Işıltı Şampanya Puf",
    category: "Puflar",
    sku: "PYP-064",
    material: "Kadife",
  };
  for (const q of ["isilti", "ŞAMPANYA", "puflar kadife", "  pyp-064  "])
    assert.equal(matchesProduct(product, q), true, q);
  assert.equal(matchesProduct(product, "masa"), false);
});

test("repeated and oversized URL parameters cannot crash collection search", () => {
  const query = collectionQuery({
    q: ["  puf  ", "masa"],
    min: "a".repeat(200),
    unknown: "ignored",
  });
  assert.equal(query.q, "puf");
  assert.equal(query.min?.length, 100);
  assert.equal("unknown" in query, false);
});
