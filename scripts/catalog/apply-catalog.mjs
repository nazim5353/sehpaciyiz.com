import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { validateProductCutouts } from "./validate-cutouts.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const products = JSON.parse(
  await fs.readFile(path.join(root, "src/data/catalog.json"), "utf8"),
);
const provenance = JSON.parse(
  await fs.readFile(
    path.join(root, "src/data/catalog-provenance.json"),
    "utf8",
  ),
);
if (products.length !== provenance.productCount || products.length !== 133)
  throw new Error("Incomplete catalog");
if (new Set(products.map((p) => p.id)).size !== products.length)
  throw new Error("Duplicate IDs");
for (const product of products) {
  if (!product.active || !product.price || !product.images.length)
    throw new Error("Invalid product " + product.id);
  for (const image of product.images)
    await fs.access(path.join(root, "public", image));
  if (
    product.variants.some(
      (v) =>
        !v.madeToOrder ||
        v.leadDaysMin !== 7 ||
        v.leadDays !== 14 ||
        v.stock <= 0,
    )
  )
    throw new Error("Invalid delivery policy " + product.id);
}
const filename = path.join(root, ".local/store.json");
await validateProductCutouts(products, { root });
const previous = await fs.readFile(filename, "utf8");
const store = JSON.parse(previous);
console.log(
  JSON.stringify({
    action: "replace-preview-products",
    before: store.products.length,
    after: products.length,
    preserveSettings: true,
    preserveAudit: true,
    apply: process.argv.includes("--apply"),
  }),
);
if (!process.argv.includes("--apply")) process.exit(0);
const backups = path.join(root, ".local/catalog-import/backup");
await fs.mkdir(backups, { recursive: true });
const backup = path.join(backups, `store-pre-apply-${Date.now()}.json`);
await fs.writeFile(backup, previous, { flag: "wx", mode: 0o600 });
store.products = products;
store.audit.unshift({
  id: randomUUID(),
  action: "Ürün kataloğu aktarıldı: 133 ürün, 194 görsel",
  target: "catalog-import-yergin-design",
  at: new Date().toISOString(),
});
store.audit = store.audit.slice(0, 200);
if ((await fs.readFile(filename, "utf8")) !== previous)
  throw new Error(
    "Store changed during import; retry after stopping the development server",
  );
const temporary = filename + "." + randomUUID() + ".tmp";
await fs.writeFile(temporary, JSON.stringify(store, null, 2), { mode: 0o600 });
await fs.rename(temporary, filename);
console.log(
  JSON.stringify({
    applied: true,
    products: store.products.length,
    backup: path.relative(root, backup),
  }),
);
