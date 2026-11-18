import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import products from "../src/data/catalog.json";
import codes from "../src/data/product-codes.json";
import type { Product } from "../src/lib/catalog";

test("every QN code retains the complete visible source SKU and matches the original product id", () => {
  assert.equal(codes.length, 133);
  const codedProducts = products.filter(product => product.sku?.startsWith("QN-"));
  assert.equal(new Set(codes.map((c) => c.code)).size, codedProducts.length);
  for (const product of codedProducts) {
    const source = codes.find((c) => c.productId === product.id)!;
    assert.ok(source, product.id);
    assert.equal(source.sourceId, Number(product.id.slice(1)));
    assert.equal(source.sourceLabel, "SKU");
    assert.equal(source.sourceBinding, "product.sku");
    assert.equal(product.sku, `QN-${source.sourceSku}`);
    assert.notEqual(product.sku, `QN-${source.sourceId}`);
  }
  assert.equal(products.find((p) => p.id === "p235")?.sku, "QN-Z339");
});

test("all transparent gallery photos retain source RGB and their recorded lossless framing", async () => {
  const cutouts = JSON.parse(
    await readFile(
      path.join(process.cwd(), "src/data/catalog-cutouts.json"),
      "utf8",
    ),
  ) as {
    productId: string;
    source: string;
    local: string;
    sourceSha256: string;
    sha256: string;
    sourceCrop?: { left: number; top: number; width: number; height: number };
  }[];
  assert.equal(cutouts.length, products.reduce((count, product) => count + product.images.length, 0));
  const mapping = new Map(cutouts.map((c) => [c.source, c]));
  for (const product of products as Product[]) {
    assert.equal(
      product.originalImages?.length,
      product.images.length,
      product.id,
    );
    for (const [index, original] of product.originalImages!.entries()) {
      const image = mapping.get(original)!;
      assert.equal(image.productId, product.id);
      assert.equal(product.images[index], image.local);
    }
  }
  for (const image of cutouts) {
    const original = await readFile(
      path.join(process.cwd(), "public", image.source),
    );
    const output = await readFile(
      path.join(process.cwd(), "public", image.local),
    );
    assert.equal(
      createHash("sha256").update(original).digest("hex"),
      image.sourceSha256,
    );
    assert.equal(
      createHash("sha256").update(output).digest("hex"),
      image.sha256,
    );
    let originalPipeline = sharp(original)
      .rotate()
      .toColourspace("srgb");
    if (image.sourceCrop) originalPipeline = originalPipeline.extract(image.sourceCrop);
    const originalPixels = await originalPipeline
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const outputPixels = await sharp(output)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert.equal(
      outputPixels.info.width,
      originalPixels.info.width,
      image.local,
    );
    assert.equal(
      outputPixels.info.height,
      originalPixels.info.height,
      image.local,
    );
    assert.ok(
      outputPixels.data.equals(originalPixels.data),
      "Original RGB changed: " + image.local,
    );
    const metadata = await sharp(output).metadata();
    assert.ok(metadata.hasAlpha, image.local);
    const statistics = await sharp(output).stats();
    assert.equal(statistics.channels[3].min, 0, image.local);
    assert.ok(statistics.channels[3].max > 240, image.local);
  }
});
