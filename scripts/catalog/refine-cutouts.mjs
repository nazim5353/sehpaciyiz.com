// On studio-white photos, keep pale legs, glass edges and decorative stems that the mask may miss.
// RGB pixels stay unchanged. Only the alpha matte is refined.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = path.join(root, ".local/cutout-jobs");
const index = process.argv.indexOf("--ids");
const ids = index < 0 ? null : process.argv[index + 1].split(",");
const refinement = "white-studio-detail-v2";
let count = 0,
  whiteStudio = 0;
for (const name of await fs.readdir(directory)) {
  if (!name.endsWith(".json")) continue;
  const filename = path.join(directory, name);
  const record = JSON.parse(await fs.readFile(filename, "utf8"));
  if (
    record.model !== "isnet-general-use" ||
    (ids && !ids.includes(record.productId))
  )
    continue;
  if (record.refinement === refinement) {
    count++;
    continue;
  }
  const original = await sharp(path.join(root, "public", record.source))
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const target = path.join(root, "public", record.local);
  const result = await sharp(target)
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(result.data.length, original.data.length);
  const { width, height } = original.info;
  let white = 0,
    samples = 0;
  const borderChannels = [[], [], []];
  function sample(x, y) {
    const i = (y * width + x) * 4;
    const rgb = original.data.subarray(i, i + 3);
    if (Math.min(...rgb) >= 245 && Math.max(...rgb) - Math.min(...rgb) <= 12) {
      white++;
      for (let channel = 0; channel < 3; channel++)
        borderChannels[channel].push(rgb[channel]);
    }
    samples++;
  }
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 100))) {
    sample(x, 0);
    sample(x, height - 1);
  }
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 100))) {
    sample(0, y);
    sample(width - 1, y);
  }
  const isWhiteStudio = white / samples > 0.8;
  const background = borderChannels.map(
    (values) =>
      values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 255,
  );
  const backgroundLevel = Math.min(...background);
  if (isWhiteStudio) {
    whiteStudio++;
    for (let i = 0; i < result.data.length; i += 4) {
      const darkest = Math.min(
        original.data[i],
        original.data[i + 1],
        original.data[i + 2],
      );
      const detailAlpha = Math.round(
        255 * Math.max(0, Math.min(1, (backgroundLevel - 2 - darkest) / 13)),
      );
      const matchesBackground =
        Math.max(
          Math.abs(background[0] - original.data[i]),
          Math.abs(background[1] - original.data[i + 1]),
          Math.abs(background[2] - original.data[i + 2]),
        ) <= 4;
      result.data[i + 3] =
        matchesBackground && result.data[i + 3] < 245
          ? 0
          : Math.min(
              original.data[i + 3],
              Math.max(result.data[i + 3], detailAlpha),
            );
    }
  }
  let transparent = 0,
    foreground = 0;
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let pixel = 0; pixel < width * height; pixel++) {
    const i = pixel * 4;
    if (
      result.data[i] !== original.data[i] ||
      result.data[i + 1] !== original.data[i + 1] ||
      result.data[i + 2] !== original.data[i + 2]
    )
      throw new Error("RGB pixel changed: " + record.local);
    const alpha = result.data[i + 3];
    if (alpha === 0) transparent++;
    if (alpha > 128) {
      foreground++;
      const x = pixel % width,
        y = Math.floor(pixel / width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  const bytes = await sharp(result.data, {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();
  await fs.writeFile(target + ".tmp", bytes);
  await fs.rename(target + ".tmp", target);
  Object.assign(record, {
    refinement,
    whiteStudio: isWhiteStudio,
    borderWhiteFraction: white / samples,
    backgroundColour: background,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    transparentFraction: transparent / (width * height),
    foregroundFraction: foreground / (width * height),
    foregroundBox: [left, top, right + 1, bottom + 1],
  });
  assert.ok(record.transparentFraction > 0.05, record.source);
  await fs.writeFile(filename, JSON.stringify(record, null, 2));
  count++;
}
console.log(JSON.stringify({ refined: count, whiteStudio }));
