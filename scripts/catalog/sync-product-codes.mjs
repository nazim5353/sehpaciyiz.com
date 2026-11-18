import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const provenance = JSON.parse(
  await fs.readFile(
    path.join(root, "src/data/catalog-provenance.json"),
    "utf8",
  ),
);
const directory = path.join(root, ".local/catalog-import/code-verification");
await fs.mkdir(directory, { recursive: true });
const queue = provenance.products.slice();
const mappings = [],
  failures = [];
let completed = 0;
async function verify(product) {
  const response = await fetch(product.sourceUrl, {
    signal: AbortSignal.timeout(45000),
    headers: { "User-Agent": "Sehpaciyiz public product-code verification" },
  });
  assert.equal(response.status, 200, product.sourceUrl);
  const html = await response.text();
  assert.ok(
    html.includes('x-text="product.sku"'),
    "Visible SKU must bind to the product SKU",
  );
  const start = html.indexOf("uomoProductDetails(");
  assert.ok(start >= 0);
  const encoded = html.slice(start).match(/JSON\.parse\('([\s\S]*?)'\)/)?.[1];
  assert.ok(encoded, "Encoded product data is missing");
  const original = JSON.parse(
    JSON.parse('"' + encoded.replace(/"/g, '\\"') + '"'),
  );
  assert.equal(
    original.id,
    product.sourceId,
    "Do not confuse a source database id with the SKU",
  );
  const sourceSku = String(original.sku ?? "").trim();
  assert.match(sourceSku, /^[A-Za-z0-9][A-Za-z0-9_./-]*$/);
  const structured = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((m) => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    })
    .find((item) => item?.["@type"] === "Product");
  assert.equal(
    String(structured?.sku ?? "").trim(),
    sourceSku,
    "Visible and structured product codes must agree",
  );
  const mapping = {
    productId: product.id,
    name: product.name,
    sourceId: original.id,
    originalName: original.name,
    sourceSku,
    code: `QN-${sourceSku}`,
    sourceUrl: product.sourceUrl,
    verifiedAt: new Date().toISOString(),
    sourceLabel: "SKU",
    sourceBinding: "product.sku",
  };
  await fs.writeFile(
    path.join(directory, `${product.id}.json`),
    JSON.stringify(mapping, null, 2),
  );
  return mapping;
}
async function worker() {
  while (queue.length) {
    const product = queue.shift();
    let lastError;
    try {
      const cached = JSON.parse(
        await fs.readFile(path.join(directory, `${product.id}.json`), "utf8"),
      );
      if (
        !process.argv.includes("--refresh") &&
        cached.sourceId === product.sourceId &&
        Date.now() - Date.parse(cached.verifiedAt) < 3600000
      ) {
        mappings.push(cached);
        completed++;
        continue;
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        mappings.push(await verify(product));
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError)
      failures.push({
        id: product.id,
        url: product.sourceUrl,
        error: lastError.message,
      });
    completed++;
    if (completed % 20 === 0 || !queue.length)
      console.log(
        JSON.stringify({
          completed,
          total: provenance.products.length,
          failed: failures.length,
        }),
      );
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await fs.writeFile(
  path.join(directory, "failures.json"),
  JSON.stringify(failures, null, 2),
);
assert.equal(failures.length, 0, JSON.stringify(failures));
assert.equal(mappings.length, provenance.products.length);
assert.equal(new Set(mappings.map((m) => m.code)).size, mappings.length);
mappings.sort((a, b) => a.sourceId - b.sourceId);
await fs.writeFile(
  path.join(root, "src/data/product-codes.json"),
  JSON.stringify(mappings, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    verified: mappings.length,
    example: mappings.find((m) => m.sourceSku === "Z339"),
  }),
);
