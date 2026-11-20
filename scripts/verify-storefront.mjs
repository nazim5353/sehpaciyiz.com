import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const origin = new URL(process.env.VERIFY_ORIGIN || "http://127.0.0.1:3100");
assert.ok(
  ["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname),
  "Use a local test server",
);
const catalog = JSON.parse(
  await readFile(new URL("../src/data/catalog.json", import.meta.url), "utf8"),
);
const product = catalog.find((p) => p.active);
const pages = [
  "/",
  "/koleksiyon",
  "/koleksiyon?q=puf&q=masa&sayfa=2",
  `/urun/${product.slug}`,
  ...["hakkimizda", "iletisim", "teslimat", "iade", "gizlilik", "satis"].map(
    (slug) => `/bilgi/${slug}`,
  ),
];
for (const pathname of pages) {
  const response = await fetch(new URL(pathname, origin), {
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, pathname);
  const html = await response.text();
  assert.match(html, /<main\b/, pathname);
  assert.match(html, /<h1\b/, pathname);
  assert.doesNotMatch(
    html,
    /Yerel veri adaptörü yalnızca|Internal Server Error/,
    pathname,
  );
  if (pathname.startsWith("/urun/")) {
    assert.match(html, /application\/ld\+json/);
    assert.match(html, /rel="canonical"/);
  }
  console.log(`PASS ${pathname}`);
}
const missing = await fetch(new URL("/urun/olmayan-urun-smoke-check", origin), {
  signal: AbortSignal.timeout(60000),
});
assert.equal(missing.status, 404);
console.log("PASS missing product returns 404");
const quote = await fetch(new URL("/api/cart/quote", origin), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify([
    { productId: product.id, variantId: product.variants[0].id, quantity: 1 },
  ]),
  signal: AbortSignal.timeout(60000),
});
assert.equal(quote.status, 200);
const data = await quote.json();
assert.equal(data.items.length, 1);
assert.equal(data.total, data.subtotal + data.shipping);
assert.ok(Number.isSafeInteger(data.total) && data.total > 0);
console.log("PASS server cart quote");
const invalid = await fetch(new URL("/api/cart/quote", origin), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: '[{"quantity":21}]',
  signal: AbortSignal.timeout(60000),
});
assert.equal(invalid.status, 400);
console.log("PASS invalid cart rejected");
for (const pathname of ["/robots.txt", "/sitemap.xml"]) {
  const response = await fetch(new URL(pathname, origin), {
    signal: AbortSignal.timeout(60000),
  });
  assert.equal(response.status, 200, pathname);
  console.log(`PASS ${pathname}`);
}
