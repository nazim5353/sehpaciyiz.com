// Targeted matte cleanup for studio floor patches found during contact-sheet review.
// Never changes RGB; small isolated metal highlights are retained.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const plans = {
  p36: { "01": 0.7 },
  p43: { "01": 0.5 },
  p46: { "01": 0.6 },
  p52: { "01": 0.7 },
  p53: { "01": 0.6, "04": 0.6 },
  p87: { "03": 0.65 },
  p92: { "01": 0.75 },
  p120: { "01": 0.6 },
  p142: { "01": 0.65 },
  p143: { "01": 0.7 },
  p169: { "01": 0.88 },
  p187: { "02": 0.62, "03": 0.62 },
  p210: { "03": 0.6, "04": 0.6 },
  p222: { "01": 0.6 },
  p240: { "01": 0.75 },
};
const directory = path.join(root, ".local/cutout-jobs");
let cleaned = 0;
for (const name of await fs.readdir(directory)) {
  const filename = path.join(directory, name);
  const record = JSON.parse(await fs.readFile(filename, "utf8"));
  const fraction =
    plans[record.productId]?.[path.basename(record.local, ".png")];
  if (fraction === undefined || record.groundCleanup) continue;
  const target = path.join(root, "public", record.local);
  const { data, info } = await sharp(target)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const source = await sharp(path.join(root, "public", record.source))
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer();
  const { width, height } = info;
  const [x0, y0, x1, y1] = record.foregroundBox;
  const startY = Math.floor(y0 + (y1 - y0) * fraction);
  const area = width * height;
  const candidate = new Uint8Array(area),
    visited = new Uint8Array(area);
  const queue = new Uint32Array(area);
  const blueGround = record.productId === "p187";
  for (let p = startY * width; p < area; p++) {
    const i = p * 4;
    const min = Math.min(source[i], source[i + 1], source[i + 2]);
    const max = Math.max(source[i], source[i + 1], source[i + 2]);
    if (min > (blueGround ? 145 : 190) && max - min < (blueGround ? 90 : 30))
      candidate[p] = 1;
  }
  for (let seed = startY * width; seed < area; seed++) {
    if (!candidate[seed] || visited[seed]) continue;
    let head = 0,
      tail = 1,
      touchesTransparent = false;
    let left = width,
      top = height,
      right = 0,
      bottom = 0;
    queue[0] = seed;
    visited[seed] = 1;
    while (head < tail) {
      const p = queue[head++],
        x = p % width,
        y = Math.floor(p / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      if (data[p * 4 + 3] === 0) touchesTransparent = true;
      for (const neighbour of [
        x ? p - 1 : -1,
        x < width - 1 ? p + 1 : -1,
        y > startY ? p - width : -1,
        y < height - 1 ? p + width : -1,
      ])
        if (neighbour >= 0 && candidate[neighbour] && !visited[neighbour]) {
          visited[neighbour] = 1;
          queue[tail++] = neighbour;
        }
    }
    if (
      touchesTransparent &&
      tail > 400 &&
      right - left > 12 &&
      bottom - top > 6
    )
      for (let i = 0; i < tail; i++) data[queue[i] * 4 + 3] = 0;
  }
  const bytes = await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 6 })
    .toBuffer();
  const cleanedFile = target.replace(/\.png$/, "-clean.png");
  await fs.writeFile(cleanedFile, bytes);
  record.local = record.local.replace(/\.png$/, "-clean.png");
  record.sha256 = createHash("sha256").update(bytes).digest("hex");
  record.groundCleanup = "reviewed-floor-v1";
  let transparent = 0,
    foreground = 0;
  let left = width,
    top = height,
    right = 0,
    bottom = 0;
  for (let p = 0; p < area; p++) {
    const alpha = data[p * 4 + 3];
    if (alpha === 0) transparent++;
    if (alpha > 128) {
      foreground++;
      const x = p % width,
        y = Math.floor(p / width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  Object.assign(record, {
    transparentFraction: transparent / area,
    foregroundFraction: foreground / area,
    foregroundBox: [left, top, right + 1, bottom + 1],
  });
  await fs.writeFile(filename, JSON.stringify(record, null, 2));
  cleaned++;
}
console.log(JSON.stringify({ groundPatchesCleaned: cleaned }));
