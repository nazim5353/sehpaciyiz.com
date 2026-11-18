// Refine only the alpha channel: isolate the pictured pouf from room props.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
assert.ok(process.argv.includes("--root"), "Use --root <prepared catalogue>");
const root = path.resolve(process.argv[process.argv.indexOf("--root") + 1]);
const products = JSON.parse(await fs.readFile(path.join(root, "src/data/catalog.json"), "utf8"));
const cache = path.join(root, ".local/raw-model-masks");
await fs.mkdir(cache, { recursive: true });
const records = [];
const refinements = JSON.parse(await fs.readFile(fileURLToPath(new URL("./pouf-mask-refinements.json", import.meta.url)), "utf8"));
function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
for (const product of products) {
  const source = product.originalImages[0];
  const jobFile = path.join(root, ".local/cutout-jobs", createHash("sha256").update(source).digest("hex") + ".json");
  const record = JSON.parse(await fs.readFile(jobFile, "utf8"));
  const destination = path.join(root, "public", record.local);
  const focusKey = record.modelFocus ? "-" + createHash("sha256").update(JSON.stringify(record.modelFocus)).digest("hex").slice(0, 12) : "";
  const rawFile = path.join(cache, record.sourceSha256 + focusKey + ".png");
  try { await fs.copyFile(destination, rawFile, 1); } catch (error) { if (error.code !== "EEXIST") throw error; }
  const { data, info } = await sharp(rawFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const exclusions = refinements.backgroundExclusions[product.id] ?? [];
  // These reviewed polygons cover only rugs in the negative space around legs.
  for (const polygon of exclusions) for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (insidePolygon(x, y, polygon)) data[(y * info.width + x) * 4 + 3] = 0;
  }
  const size = info.width * info.height;
  const labels = new Int32Array(size);
  const queue = new Uint32Array(size);
  const components = [];
  for (let start = 0; start < size; start++) {
    if (labels[start] || data[start * 4 + 3] === 0) continue;
    const label = components.length + 1;
    const c = { label, count: 0, sumX: 0, sumY: 0, left: info.width, top: info.height, right: 0, bottom: 0 };
    let head = 0, tail = 1; queue[0] = start; labels[start] = label;
    while (head < tail) {
      const pixel = queue[head++], x = pixel % info.width, y = Math.floor(pixel / info.width);
      c.count++; c.sumX += x; c.sumY += y;
      c.left = Math.min(c.left, x); c.right = Math.max(c.right, x); c.top = Math.min(c.top, y); c.bottom = Math.max(c.bottom, y);
      for (const next of [x > 0 ? pixel - 1 : -1, x + 1 < info.width ? pixel + 1 : -1, y > 0 ? pixel - info.width : -1, y + 1 < info.height ? pixel + info.width : -1]) {
        if (next < 0 || labels[next] || data[next * 4 + 3] === 0) continue;
        labels[next] = label; queue[tail++] = next;
      }
    }
    components.push(c);
  }
  const anchor = product.id === "poy-pyp-0865" ? [0.28, 0.73] : [0.5, 0.62];
  const significant = components.filter(c => c.count >= 30);
  const score = c => c.count * Math.exp(-((c.sumX / c.count / info.width - anchor[0]) ** 2 + (c.sumY / c.count / info.height - anchor[1]) ** 2) / (2 * 0.16 ** 2));
  significant.sort((a, b) => score(b) - score(a));
  const primary = significant[0];
  assert.ok(primary, product.id);
  const selected = new Set([primary.label]);
  const gap = Math.max(12, Math.max(primary.right - primary.left, primary.bottom - primary.top) * 0.05);
  for (const c of components) {
    const cx = c.sumX / c.count;
    const dy = Math.max(0, c.top - primary.bottom, primary.top - c.bottom);
    if (c.count >= 8 && cx >= primary.left - gap && cx <= primary.right + gap && dy <= gap) selected.add(c.label);
    // The lifted storage lid and cloth contents are part of this photographed model.
    if (product.id === "poy-pyp-0858" && c.count >= 15 && cx > info.width * 0.2 && cx < info.width * 0.82 && c.bottom > info.height * 0.15) selected.add(c.label);
  }
  const rgba = Buffer.from(data);
  // Keep every original alpha value of the selected objects. In particular,
  // pale fabric, fringes and slender legs must not be thresholded or eroded.
  for (let i = 0; i < size; i++) if (!selected.has(labels[i])) rgba[i * 4 + 3] = 0;
  const bytes = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  const decoded = await sharp(bytes).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < data.length; i += 4) for (let channel = 0; channel < 3; channel++) assert.equal(decoded[i + channel], data[i + channel], product.id);
  await fs.writeFile(destination, bytes);
  const updated = { ...record, sha256: createHash("sha256").update(bytes).digest("hex"), refinement: "subject-alpha-components", subjectAnchor: anchor, subjectCoreBox: [primary.left, primary.top, primary.right + 1, primary.bottom + 1], ...(exclusions.length ? { backgroundExclusions: exclusions } : {}), rgbPreserved: true };
  await fs.writeFile(jobFile, JSON.stringify(updated, null, 2));
  records.push(updated);
}
await fs.writeFile(path.join(root, "src/data/catalog-cutouts.json"), JSON.stringify(records, null, 2) + "\n");
console.log(JSON.stringify({ isolated: records.length, rgbVerified: true }));
