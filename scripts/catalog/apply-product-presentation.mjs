import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateProductCutouts } from "./validate-cutouts.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = async (file) =>
  JSON.parse(await fs.readFile(path.join(root, file), "utf8"));
const codesOnly = process.argv.includes("--codes-only");
const codes = await read("src/data/product-codes.json");
const cutouts = codesOnly ? [] : await read("src/data/catalog-cutouts.json");
const codeMap = new Map(codes.map((c) => [c.productId, c]));
const imageMap = new Map(cutouts.map((c) => [c.source, c]));
const products = await read("src/data/catalog.json");
const categories = await read("src/data/categories.json");
const runtimeFile = path.join(root, ".local/store.json");
const runtimeText = await fs.readFile(runtimeFile, "utf8");
const store = JSON.parse(runtimeText);
const settingsBefore = JSON.stringify(store.settings);
assert.equal(codes.length, products.length);
assert.equal(new Set(codes.map((c) => c.code)).size, products.length);
if (!codesOnly) assert.equal(cutouts.length, 194);
for (const record of cutouts) {
  const bytes = await fs.readFile(path.join(root, "public", record.local));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), record.sha256);
  assert.ok(record.rgbPreserved);
}
function update(product) {
  const code = codeMap.get(product.id);
  assert.ok(code, "Missing source-code mapping: " + product.id);
  assert.equal(code.sourceId, Number(product.id.slice(1)));
  assert.equal(code.code, `QN-${code.sourceSku}`);
  if (codesOnly) return { ...product, sku: code.code };
  const originalImages = product.originalImages ?? product.images;
  const images = originalImages.map((source) => {
    const cutout = imageMap.get(source);
    assert.ok(cutout, "Missing cutout: " + source);
    assert.equal(cutout.productId, product.id);
    return cutout.local;
  });
  return { ...product, sku: code.code, originalImages, images };
}
const nextSeed = products.map(update);
const nextRuntime = store.products.map(update);
for (const [index, product] of nextRuntime.entries()) {
  const before = store.products[index];
  for (const key of Object.keys(before))
    if (!["sku", "images", "originalImages"].includes(key))
      assert.deepEqual(product[key], before[key], "Unexpected change: " + key);
}
const nextCategories = categories.map((category) => {
  if (codesOnly) return category;
  const original =
    cutouts.find((c) => c.local === category.image)?.source ?? category.image;
  const image = imageMap.get(original);
  assert.ok(image, "Missing category cutout: " + category.slug);
  return {
    ...category,
    image: image.local,
    navigationImage: `/images/categories/${category.slug}-cutout.png`,
  };
});
if (!codesOnly) await validateProductCutouts(nextSeed, { root });
console.log(
  JSON.stringify({
    mode: process.argv.includes("--apply") ? "apply" : "dry-run",
    products: nextSeed.length,
    codes: codes.length,
    cutouts: cutouts.length,
    settingsPreserved: true,
  }),
);
if (!process.argv.includes("--apply")) process.exit(0);
const backup = path.join(
  root,
  ".local/catalog-import/backup",
  "product-presentation-" + new Date().toISOString().replace(/[:.]/g, "-"),
);
await fs.mkdir(backup, { recursive: true });
if (!codesOnly) {
  await fs.mkdir(path.join(backup, "navigation"));
  for (const category of nextCategories) {
    const record = cutouts.find((c) => c.local === category.image);
    const filename = path.join(root, "public", category.navigationImage);
    try {
      await fs.copyFile(
        filename,
        path.join(backup, "navigation", `${category.slug}.png`),
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const [x0, y0, x1, y1] = record.foregroundBox;
    const left = Math.max(0, x0 - 12),
      top = Math.max(0, y0 - 12);
    const width = Math.min(record.width, x1 + 12) - left;
    const height = Math.min(record.height, y1 + 12) - top;
    await sharp(path.join(root, "public", record.local))
      .extract({ left, top, width, height })
      .resize(192, 144, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(filename + ".tmp");
    await fs.rename(filename + ".tmp", filename);
  }
}
for (const [file, name] of [
  ["src/data/catalog.json", "catalog.json"],
  ["src/data/categories.json", "categories.json"],
  [".local/store.json", "store.json"],
])
  await fs.copyFile(path.join(root, file), path.join(backup, name));
assert.equal(
  await fs.readFile(runtimeFile, "utf8"),
  runtimeText,
  "Store changed while preparing; retry without concurrent administration",
);
store.products = nextRuntime;
store.audit.unshift({
  id: randomUUID(),
  action: "catalog.product-presentation",
  target: `${codes.length} QN codes, ${cutouts.length} non-generative transparent photos`,
  at: new Date().toISOString(),
});
store.audit = store.audit.slice(0, 200);
assert.equal(JSON.stringify(store.settings), settingsBefore);
for (const [file, value] of [
  ["src/data/catalog.json", nextSeed],
  ["src/data/categories.json", nextCategories],
  [".local/store.json", store],
]) {
  const filename = path.join(root, file);
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  await fs.rename(temporary, filename);
}
console.log(
  JSON.stringify({ applied: true, backup: path.relative(root, backup) }),
);
