import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { validateProductCutouts } from "./catalog/validate-cutouts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const optionIndex = process.argv.indexOf("--destination");
assert.ok(optionIndex >= 0 && process.argv[optionIndex + 1], "Use --destination <Site checkout>");
const destination = path.resolve(process.argv[optionIndex + 1]);
assert.notEqual(destination, path.resolve(root), "Use a separate hosting checkout");
const target = JSON.parse(await fs.readFile(path.join(root, "preview/hosting-target.json"), "utf8"));
const hostingFile = path.join(destination, ".openai/hosting.json");
const hosting = JSON.parse(await fs.readFile(hostingFile, "utf8"));
assert.equal(hosting.project_id, target.project_id, "Unexpected Site identity");
for (const forbidden of ["src/app/yonetim", "src/app/api", ".env.local"]) {
  await assert.rejects(fs.access(path.join(destination, forbidden)), { code: "ENOENT" }, `Unexpected private/runtime path: ${forbidden}`);
}

const read = (name) => fs.readFile(path.join(root, name), "utf8");
async function write(name, content) {
  const filename = path.join(destination, name);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, content);
}
async function copy(name, to = name) {
  const filename = path.join(destination, to);
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.cp(path.join(root, name), filename, { recursive: true });
}
function replaceOnce(text, pattern, replacement, label) {
  let count = 0;
  const result = text.replace(pattern, (...args) => {
    count++;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  assert.equal(count, 1, `Source changed; review the preview adapter: ${label}`);
  return result;
}

const products = JSON.parse(await read("src/data/catalog.json"));
const categories = JSON.parse(await read("src/data/categories.json"));
const validation = await validateProductCutouts(products, { root, categories });
for (const name of ["src/app/(store)", "src/data", "public/brand", "public/design", "public/fonts", "public/images/catalog-cutouts", "public/images/categories"]) await copy(name);
for (const name of ["layout.tsx", "globals.css", "icon.svg", "error.tsx", "not-found.tsx"]) await copy(`src/app/${name}`);
for (const name of ["catalog.ts", "brand.ts", "settings.ts", "commerce.ts"]) await copy(`src/lib/${name}`);
for (const name of ["collection-sidebar", "store-page-transition", "product-card", "product-detail", "home-products", "header", "footer", "storefront-motion", "store-provider"]) await copy(`src/components/${name}.tsx`);
for (const name of ["tsconfig.json", "next-env.d.ts", "postcss.config.mjs", "package-lock.json"]) await copy(name);
await copy("preview/store.ts", "src/lib/store.ts");
await copy("preview/product-query.tsx", "src/components/product-query.tsx");
await copy("preview/store-provider.tsx", "src/components/online-store-provider.tsx");
await copy("preview/check-output.mjs", "scripts/check-output.mjs");
const packageJson = JSON.parse(await read("package.json"));
packageJson.scripts = { dev: "next dev --hostname 127.0.0.1 --port 3200", build: "next build", postbuild: "node scripts/check-output.mjs", typecheck: "tsc --noEmit" };
await write("package.json", JSON.stringify(packageJson, null, 2) + "\n");
await write(".gitignore", "node_modules/\n.next/\nout/\n.local/\n.env*\n*.tsbuildinfo\n.sites-runtime/\n");
await write("next.config.mjs", 'export default { output: "export", trailingSlash: true, images: { unoptimized: true }, poweredByHeader: false };\n');
await write(".openai/hosting.json", JSON.stringify({ ...hosting, static: { directory: "out" } }, null, 2) + "\n");

let layout = await read("src/app/layout.tsx");
layout = replaceOnce(layout, /new URL\("http:\/\/127\.0\.0\.1:3100"\)/g, `new URL(${JSON.stringify(target.url)})`, "metadata origin");
layout = replaceOnce(layout, /export const dynamic = "force-dynamic";\s*/g, "", "dynamic root");
await write("src/app/layout.tsx", layout);

let shopLayout = await read("src/app/(store)/layout.tsx");
shopLayout = replaceOnce(shopLayout, /import \{ StoreProvider \} from "@\/components\/store-provider";/g, 'import { OnlineStoreProvider } from "@/components/online-store-provider";', "shared catalogue provider");
shopLayout = replaceOnce(shopLayout, /  const \[products, settings\] = await Promise\.all\(\[[\s\S]*?  \]\);/g, "  const settings = await getPublicSettings();", "shared catalogue data");
shopLayout = replaceOnce(shopLayout, /<StoreProvider products=\{products\} shipping=\{settings.shipping\}>/g, "<OnlineStoreProvider shipping={settings.shipping}>", "shared provider start");
shopLayout = replaceOnce(shopLayout, /<\/StoreProvider>/g, "</OnlineStoreProvider>", "shared provider end");
await write("src/app/(store)/layout.tsx", shopLayout);

let collection = await read("src/app/(store)/koleksiyon/page.tsx");
collection = replaceOnce(collection, /import \{ getProducts \} from "@\/lib\/store";/g, 'import catalogData from "@/data/catalog.json";\nimport { useSearchParams } from "next/navigation";', "collection data");
collection = replaceOnce(collection, /export const metadata = \{ title: "Koleksiyon" \};\s*/g, "", "collection metadata");
collection = replaceOnce(collection, /export default async function Collection\(\{[\s\S]*?const query = await searchParams;/g, 'export default function Collection() {\n  const query = Object.fromEntries(useSearchParams().entries());', "collection query");
collection = replaceOnce(collection, /\(await getProducts\(\)\)\.filter/g, "catalogData.filter", "collection products");
await write("src/components/online-collection.tsx", '"use client";\n' + collection);
await write("src/app/(store)/koleksiyon/page.tsx", 'import { Suspense } from "react";\nimport Collection from "@/components/online-collection";\nexport const metadata = { title: "Koleksiyon" };\nexport default function Page() { return <Suspense fallback={<main id="main" className="container collection-page"><h1>Koleksiyon</h1><p>Tasarımlar yükleniyor…</p></main>}><Collection /></Suspense>; }\n');

let product = await read("src/app/(store)/urun/[slug]/page.tsx");
product = 'import { Suspense } from "react";\nimport { OnlineProductDetail } from "@/components/product-query";\n' + product;
product = replaceOnce(product, /  searchParams,\s*/g, "", "product query argument");
product = replaceOnce(product, /  searchParams: Promise<\{ renk\?: string \}>;\s*/g, "", "product query type");
product = replaceOnce(product, /  const \{ renk \} = await searchParams;\s*/g, "", "product query read");
product = replaceOnce(product, /        <ProductDetail[\s\S]*?        \/>/g, '        <Suspense fallback={<ProductDetail product={product} freeThreshold={settings.shipping.freeThreshold} whatsapp={settings.whatsapp} />}>\n          <OnlineProductDetail product={product} freeThreshold={settings.shipping.freeThreshold} whatsapp={settings.whatsapp} />\n        </Suspense>', "product query boundary");
product += '\nexport async function generateStaticParams() { return (await getProducts()).filter(p => p.active).map(p => ({ slug: p.slug })); }\n';
await write("src/app/(store)/urun/[slug]/page.tsx", product);
let info = await read("src/app/(store)/bilgi/[slug]/page.tsx");
info += '\nexport function generateStaticParams() { return Object.keys(pages).map(slug => ({ slug })); }\n';
await write("src/app/(store)/bilgi/[slug]/page.tsx", info);

let provider = await read("src/components/store-provider.tsx");
provider = replaceOnce(provider, /    const controller = new AbortController\(\);[\s\S]*?    return \(\) => controller\.abort\(\);/g, '    setLoading(false);\n    setError("");\n    try {\n      setQuote(calculateCart(cart, products, shipping.flatRate, shipping.freeThreshold));\n    } catch (error) {\n      setQuote(null);\n      setError(error instanceof Error ? error.message : "Sepet hesaplanamadı.");\n    }', "preview cart");
provider = replaceOnce(provider, /\}, \[cart, panel\]\);/g, "}, [cart, panel, products, shipping]);", "preview cart dependencies");
await write("src/components/store-provider.tsx", provider);
let footer = await read("src/components/footer.tsx");
footer = replaceOnce(footer, /          <Link href="\/yonetim">[\s\S]*?<\/Link>/g, "", "local admin link");
footer = replaceOnce(footer, /Yerel mağaza önizlemesi\./g, "Tasarım önizlemesi.", "preview label");
await write("src/components/footer.tsx", footer);
await write("README.md", `# Sehpacıyız çevrimiçi tasarım önizlemesi\n\nKaynak: https://github.com/nazim5353/sehpaciyiz.com\n\nSabit adres: ${target.url}\n\nBu kaynak ana depodaki scripts/prepare-online-preview.mjs ile hazırlanır. Yerel veri, kullanıcı, şirket paneli ve sunucu API'leri içermez. Sepet hesaplaması yalnızca görsel/etkileşimli önizlemedir; sipariş veya ödeme oluşturmaz. npm ci ve npm run build ile out/ üretilir.\n`);
console.log(JSON.stringify({ destination, url: target.url, ...validation, privateDataIncluded: false }));
