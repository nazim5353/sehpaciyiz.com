// Lossless framing only: trim fully transparent borders, never resample RGB.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import sharp from "sharp";

const option = name => process.argv[process.argv.indexOf(`--${name}`) + 1];
assert.ok(process.argv.includes("--root") && process.argv.includes("--output"), "Use --root <prepared catalogue> --output <final catalogue>");
const root = path.resolve(option("root"));
const output = path.resolve(option("output"));
assert.notEqual(root, output);
const products = JSON.parse(await fs.readFile(path.join(root, "src/data/catalog.json"), "utf8"));
const jobs = path.join(root, ".local/cutout-jobs");
const records = [];
let totalBytes = 0;
for (const product of products) {
  const source = product.originalImages[0];
  const job = JSON.parse(await fs.readFile(path.join(jobs, createHash("sha256").update(source).digest("hex") + ".json"), "utf8"));
  const input = await fs.readFile(path.join(root, "public", job.local));
  assert.equal(createHash("sha256").update(input).digest("hex"), job.sha256);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  assert.ok(right > left && bottom > top, product.id);
  const padding = Math.max(12, Math.ceil(Math.max(right - left + 1, bottom - top + 1) * 0.08));
  const crop = {
    left: Math.max(0, left - padding), top: Math.max(0, top - padding),
    width: Math.min(info.width, right + padding + 1) - Math.max(0, left - padding),
    height: Math.min(info.height, bottom + padding + 1) - Math.max(0, top - padding),
  };
  const bytes = await sharp(input).extract(crop).png({ compressionLevel: 9 }).toBuffer();
  totalBytes += bytes.length;
  const cropped = await sharp(bytes).ensureAlpha().raw().toBuffer();
  const original = await sharp(path.join(root, "public", source)).rotate().toColourspace("srgb").ensureAlpha().raw().toBuffer();
  let transparent = 0, foreground = 0;
  for (let y = 0; y < crop.height; y++) for (let x = 0; x < crop.width; x++) {
    const i = (y * crop.width + x) * 4;
    const originalIndex = ((y + crop.top) * info.width + x + crop.left) * 4;
    for (let channel = 0; channel < 3; channel++) assert.equal(cropped[i + channel], original[originalIndex + channel], `RGB changed: ${product.id}`);
    transparent += Number(cropped[i + 3] === 0);
    foreground += Number(cropped[i + 3] > 128);
  }
  const target = path.join(output, "public", job.local);
  const originalTarget = path.join(output, "public", source);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.mkdir(path.dirname(originalTarget), { recursive: true });
  await fs.writeFile(target, bytes);
  await fs.copyFile(path.join(root, "public", source), originalTarget);
  records.push({
    ...job, sha256: createHash("sha256").update(bytes).digest("hex"),
    width: crop.width, height: crop.height,
    sourceWidth: info.width, sourceHeight: info.height, sourceCrop: crop,
    transparentFraction: transparent / (crop.width * crop.height),
    foregroundFraction: foreground / (crop.width * crop.height),
    foregroundBox: [left - crop.left, top - crop.top, right - crop.left + 1, bottom - crop.top + 1],
    refinement: "transparent-border-crop", rgbPreserved: true,
  });
}
await fs.mkdir(path.join(output, "src/data"), { recursive: true });
await fs.writeFile(path.join(output, "src/data/catalog-cutouts.json"), JSON.stringify(records, null, 2) + "\n");
console.log(JSON.stringify({ prepared: records.length, rgbVerified: true, totalMiB: +(totalBytes / 1048576).toFixed(1) }));
