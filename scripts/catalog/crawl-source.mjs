import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "../../.local/catalog-tools/node_modules/cheerio/dist/esm/index.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = path.join(root, ".local/catalog-import/source");
await fs.mkdir(directory, { recursive: true });
const base = "https://yergindesign.com";
const clean = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function splitArguments(value) {
  let quote = null,
    depth = 0,
    escape = false,
    start = 0;
  const parts = [];
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') quote = c;
    else if ("([{ ".trim().includes(c)) depth++;
    else if (")] }".replace(/ /g, "").includes(c)) depth--;
    else if (c === "," && depth === 0) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}
function decodeArgument(value) {
  if (!value || value === "null") return null;
  if (value.startsWith("JSON.parse(")) {
    const raw = value.match(/^JSON\.parse\('([\s\S]*)'\)$/)?.[1];
    if (raw === undefined) throw new Error("Unsupported encoded argument");
    const decoded = JSON.parse('"' + raw.replace(/"/g, '\\"') + '"');
    return JSON.parse(decoded);
  }
  return JSON.parse(value);
}
export function parseProduct(html, url) {
  const $ = load(html);
  const component = $("[x-data]")
    .toArray()
    .find((el) =>
      ($(el).attr("x-data") ?? "").trim().startsWith("uomoProductDetails("),
    );
  if (!component) throw new Error("Product component not found: " + url);
  const attribute = $(component).attr("x-data").trim();
  const args = splitArguments(
    attribute.slice(attribute.indexOf("(") + 1, attribute.lastIndexOf(")")),
  ).map(decodeArgument);
  const $properties = $("#product-properties");
  const rows = $properties
    .find("tr")
    .toArray()
    .map((el) =>
      $(el)
        .find("th,td")
        .toArray()
        .map((cell) => clean($(cell).text())),
    );
  const paragraphs = $properties
    .find("p,li")
    .toArray()
    .map((el) => clean($(el).text()))
    .filter(Boolean);
  const categories = $(".uomo-pdp-breadcrumb a[href*='/kategori/']")
    .toArray()
    .map((el) => ({ name: clean($(el).text()), url: $(el).attr("href") }));
  return {
    url,
    fetchedAt: new Date().toISOString(),
    product: args[0],
    options: args[1],
    optionValues: args[2],
    combinations: args[3],
    defaultSelection: args[4],
    media: args[5],
    categories,
    propertiesText: clean($properties.text()),
    propertyRows: rows,
    propertyParagraphs: paragraphs,
    propertiesHtml: $properties.html(),
    title: clean($("h1").first().text()),
    detailSections: $(".uomo-pdp-tabs .acor-ttl")
      .toArray()
      .map((el) => ({ title: clean($(el).text()), target: $(el).attr("rel") })),
    linkedProducts: [
      ...new Set(
        $("a[href*='/urun/']")
          .toArray()
          .map((el) => $(el).attr("href"))
          .filter(Boolean),
      ),
    ],
  };
}
async function get(url, filename) {
  const target = path.join(directory, filename);
  try {
    return await fs.readFile(target, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(45000),
        headers: {
          "User-Agent": "Sehpaciyiz catalog migration; public product data",
        },
      });
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      const text = await response.text();
      await fs.writeFile(target, text);
      return text;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
}
const xml = await get(base + "/sitemap.xml", "sitemap.txt");
const sitemap = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
const productUrls = new Set(sitemap.filter((url) => url.includes("/urun/")));
const categoryData = [];
for (const url of sitemap.filter((url) => url.includes("/kategori/"))) {
  const html = await get(url, "category-" + url.split("/").pop() + ".html");
  const $ = load(html);
  const links = [
    ...new Set(
      $("a[href*='/urun/']")
        .toArray()
        .map((el) => new URL($(el).attr("href"), base).href),
    ),
  ];
  links.forEach((url) => productUrls.add(url));
  categoryData.push({
    url,
    title: clean($("h1").first().text()),
    products: links,
  });
}
await fs.writeFile(
  path.join(directory, "categories.json"),
  JSON.stringify(categoryData, null, 2),
);
console.log(
  JSON.stringify({
    sitemapProducts: sitemap.filter((u) => u.includes("/urun/")).length,
    categoryCounts: categoryData.map((c) => [c.title, c.products.length]),
    discoveredProducts: productUrls.size,
  }),
);
const queue = [...productUrls];
const products = [],
  failures = [];
let completed = 0;
async function worker() {
  while (queue.length) {
    const url = queue.shift();
    try {
      const html = await get(url, url.split("/").pop() + ".html");
      products.push(parseProduct(html, url));
    } catch (error) {
      failures.push({ url, error: error.message });
    }
    completed++;
    if (completed % 15 === 0 || !queue.length)
      console.log(
        JSON.stringify({
          completed,
          imported: products.length,
          failures: failures.length,
          remaining: queue.length,
        }),
      );
    await new Promise((r) => setTimeout(r, 180));
  }
}
await Promise.all([worker(), worker(), worker()]);
products.sort((a, b) => a.product.id - b.product.id);
await fs.writeFile(
  path.join(directory, "products.json"),
  JSON.stringify(products, null, 2),
);
await fs.writeFile(
  path.join(directory, "failures.json"),
  JSON.stringify(failures, null, 2),
);
console.log(
  JSON.stringify({
    completed: products.length,
    failures,
    optionProducts: products.filter((p) => p.options?.length).length,
    missingDescriptions: products.filter((p) => !p.propertiesText).length,
    missingImages: products.filter((p) => !p.media?.length).length,
  }),
);
if (failures.length) process.exitCode = 1;
