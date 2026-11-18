import { test } from "node:test";
import assert from "node:assert/strict";
import products from "../src/data/catalog.json";

test("catalogue import refuses an original photo before any storefront write", async () => {
  // The import helper is a local Node script, not a browser/runtime dependency.
  const { validateProductCutouts } = await import("../scripts/catalog/validate-cutouts.mjs");
  const product = products[0];
  const original = product.originalImages![0];
  assert.notEqual(original, product.images[0]);
  await assert.rejects(
    () => validateProductCutouts([{ ...product, images: [original], originalImages: [original] }]),
    /Önce dekupe hazırlayın/,
  );
});
