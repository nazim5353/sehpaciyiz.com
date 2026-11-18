import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { validateProductCutouts } from "./validate-cutouts.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const option = name => process.argv[process.argv.indexOf(`--${name}`) + 1];
assert.ok(process.argv.includes("--source-root") && process.argv.includes("--prepared-root"), "Use --source-root <PDF research> --prepared-root <verified cutouts> [--apply]");
const sourceRoot = path.resolve(option("source-root"));
const prepared = path.resolve(option("prepared-root"));
const read = file => fs.readFile(file, "utf8").then(JSON.parse);
const audit = await read(path.join(sourceRoot, "research/price-audit.json"));
const photoMap = await read(path.join(sourceRoot, "photo-map.json"));
const cutouts = await read(path.join(prepared, "src/data/catalog-cutouts.json"));
assert.equal(audit.picturedProducts.length, 64);
assert.equal(cutouts.length, 64);
const captionCase = value => value.toLocaleLowerCase("tr-TR").replace(/(^|[\s(])\p{L}/gu, part => part.toLocaleUpperCase("tr-TR"));
const slugify = value => value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const discrepancy = new Set(audit.dimensionConflicts.map(row => row.sku));
const items = [];
const products = audit.picturedProducts.map(row => {
  const id = "poy-" + row.sku.toLowerCase();
  const cutout = cutouts.find(item => item.productId === id);
  const photo = photoMap.find(item => item.code === row.sku);
  assert.ok(cutout && photo, row.sku);
  const grossKurus = Math.round(row.totalVatIncluded * 100);
  const price = Math.ceil((grossKurus * 5 / 2) / 5000) * 5000;
  assert.equal(price, row.suggestedFinalPriceKurus);
  assert.equal(price % 5000, 0);
  const caption = captionCase(row.catalogName.replace(/\s+/g, " ").trim());
  const name = /\bpuf\b/i.test(caption) ? caption : `${caption} Puf`;
  const dimensions = row.catalogDimensions.replace(/^Q\s*/, "Ø ").replace(/x/gi, " × ").replace(/CM/gi, " cm").replace(/\s+/g, " ").trim();
  items.push({
    productId: id, sku: row.sku, catalogName: row.catalogName,
    catalogUrl: `https://www.kataloqp.online/wp-content/uploads/2026/11/${row.catalogFile === "puf-01.pdf" ? "PUF01.pdf" : "PUF02.pdf"}`,
    catalogPage: row.catalogPage, catalogDimensions: row.catalogDimensions,
    priceListDimensions: row.priceListDimensions,
    dimensionConfirmationRequired: discrepancy.has(row.sku),
    sourceGrossKurus: grossKurus, salePriceKurus: price,
    fabricMeterage: row.fabricMeterage,
    photoSha256: photo.sha256, pdfImageObject: photo.sourcePdfImage,
  });
  return {
    id, sku: row.sku, slug: slugify(`${name}-${row.sku}`), name,
    category: "Puflar", categorySlug: "puf", price,
    images: [cutout.local], originalImages: [cutout.source],
    description: `${name}. Kumaş döşeme ve 32 DNS sünger. Siparişe özel hazırlanır.`,
    material: "Kumaş döşeme, 32 DNS sünger. İskelet ve ayak malzemesi sipariş öncesinde teyit edilir.",
    dimensions: dimensions + (discrepancy.has(row.sku) ? " (ölçü teyidi gerekir)" : ""),
    assembly: "Montaj ve teslim şekli sipariş öncesinde teyit edilir.",
    specifications: [
      { label: "Model", value: row.catalogName },
      { label: "Ürün kodu", value: row.sku },
      { label: "Sünger", value: "32 DNS" },
      { label: "Kumaş metrajı", value: `${row.fabricMeterage.toLocaleString("tr-TR")} m` },
      ...(discrepancy.has(row.sku) ? [{ label: "Ölçü teyidi", value: "Bu modelin ölçüleri sipariş öncesinde teyit edilir." }] : []),
    ],
    colorNote: "Görseldeki kumaş ve desen esas alınır. Özel kumaş talepleri sipariş öncesinde teyit edilir.",
    variants: [{ id: "standart", name: "Görseldeki model", stock: 0, leadDays: 15, leadDaysMin: 15, madeToOrder: true, surcharge: 0 }],
    featured: false, active: true, catalogImported: true,
  };
});
assert.equal(new Set(products.map(product => product.id)).size, 64);
assert.equal(new Set(products.map(product => product.slug)).size, 64);
const image = cutouts.find(item => item.productId === "poy-pyp-0830").local;
const category = { name: "Puflar", slug: "puf", subtitle: "Kumaş, desen ve form bir arada", image, navigationImage: "/images/categories/puf-cutout.png" };
const navFile = path.join(prepared, "public", category.navigationImage);
await fs.mkdir(path.dirname(navFile), { recursive: true });
await sharp(path.join(prepared, "public", image)).resize(320, 240, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(navFile);
await validateProductCutouts(products, { root: prepared, categories: [category] });
const provenance = {
  sourceSite: audit.sourceSite, importedAt: "2026-11-18", scope: "64 pictured exact SKUs in PUF01 and PUF02",
  pricing: { base: "source VAT-inclusive TOPLAM", multiplier: 2.5, finalVatIncluded: true, additionalVatApplied: false, rounding: "upward to nearest TRY 50", roundingIncrementKurus: 5000 },
  items, assets: cutouts.map(row => ({ productId: row.productId, local: row.source, sha256: row.sourceSha256, width: row.sourceWidth, height: row.sourceHeight })),
  menuOnlyOptions: audit.menuOnlyOptions,
  dimensionDiscrepancies: audit.dimensionConflicts,
  sourceTerms: { foamDensity: "32 DNS", productionBusinessDays: 15, stockConfirmed: false },
};
if (!process.argv.includes("--apply")) {
  console.log(JSON.stringify({ dryRun: true, products: products.length, category: category.slug, imagesVerified: true, minPriceTry: Math.min(...products.map(p => p.price)) / 100, maxPriceTry: Math.max(...products.map(p => p.price)) / 100 }));
  process.exit(0);
}
const dataRoot = path.join(root, "src/data");
const existingProducts = await read(path.join(dataRoot, "catalog.json"));
const existingCategories = await read(path.join(dataRoot, "categories.json"));
const existingCutouts = await read(path.join(dataRoot, "catalog-cutouts.json"));
const storeFile = path.join(root, ".local/store.json");
let storeText;
try { storeText = await fs.readFile(storeFile, "utf8"); }
catch (error) { if (error.code !== "ENOENT") throw error; }
const ids = new Set(products.map(product => product.id));
const nextProducts = [...existingProducts.filter(product => !ids.has(product.id)), ...products];
const nextCategories = [...existingCategories.filter(item => item.slug !== category.slug), category];
const nextCutouts = [...existingCutouts.filter(item => !ids.has(item.productId)), ...cutouts];
const backup = path.join(root, ".local/backups", "before-pouf-import-" + new Date().toISOString().replace(/[:.]/g, "-"));
for (const relative of ["src/data/catalog.json", "src/data/categories.json", "src/data/catalog-cutouts.json", "src/data/pouf-provenance.json", ".local/store.json"]) {
  try { const target = path.join(backup, relative); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.copyFile(path.join(root, relative), target); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
for (const row of cutouts) for (const relative of [row.source, row.local]) {
  const target = path.join(root, "public", relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(prepared, "public", relative), target);
}
await fs.copyFile(navFile, path.join(root, "public", category.navigationImage));
// Verify the complete candidate manifest before changing any live catalogue data.
await validateProductCutouts(nextProducts, { root, categories: nextCategories, cutoutRecords: nextCutouts });
if (storeText !== undefined) assert.equal(await fs.readFile(storeFile, "utf8"), storeText, "Local store changed during import; preserve changes before retrying.");
const writeJson = async (file, value) => { const temp = file + ".pouf-import.tmp"; await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n"); await fs.rename(temp, file); };
await writeJson(path.join(dataRoot, "catalog-cutouts.json"), nextCutouts);
await writeJson(path.join(dataRoot, "catalog.json"), nextProducts);
await writeJson(path.join(dataRoot, "categories.json"), nextCategories);
await writeJson(path.join(dataRoot, "pouf-provenance.json"), provenance);
if (storeText !== undefined) {
  const store = JSON.parse(storeText);
  const settingsBefore = JSON.stringify(store.settings);
  store.products = [...store.products.filter(product => !ids.has(product.id)), ...products];
  assert.equal(JSON.stringify(store.settings), settingsBefore);
  await writeJson(storeFile, store);
}
console.log(JSON.stringify({ applied: true, addedProducts: products.length, totalProducts: nextProducts.length, categories: nextCategories.length, cutouts: nextCutouts.length, backup }));
