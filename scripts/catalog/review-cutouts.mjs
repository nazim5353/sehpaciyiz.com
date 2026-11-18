import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const codes = JSON.parse(
  await fs.readFile(path.join(root, "src/data/product-codes.json"), "utf8"),
);
const cleanedOnly = process.argv.includes("--cleaned");
const partial = process.argv.includes("--partial") || cleanedOnly;
const jobDirectory = path.join(root, ".local/cutout-jobs");
const records = (
  await Promise.all(
    (await fs.readdir(jobDirectory))
      .filter((n) => n.endsWith(".json"))
      .map(async (n) =>
        JSON.parse(await fs.readFile(path.join(jobDirectory, n), "utf8")),
      ),
  )
)
  .filter((r) => r.model === "isnet-general-use")
  .filter((r) => !cleanedOnly || r.groundCleanup)
  .sort(
    (a, b) =>
      Number(a.productId.slice(1)) - Number(b.productId.slice(1)) ||
      a.source.localeCompare(b.source),
  );
if (!partial) assert.equal(records.length, 194);
const output = path.join(
  root,
  "output/qa/product-presentation",
  cleanedOnly ? "cleaned-sheets" : partial ? "partial-sheets" : "sheets",
);
await fs.mkdir(output, { recursive: true });
for (let start = 0; start < records.length; start += 16) {
  const batch = records.slice(start, start + 16);
  const layers = [];
  for (const [i, record] of batch.entries()) {
    const background = "#e5dfd2";
    const [x0, y0, x1, y1] = record.foregroundBox;
    const left = Math.max(0, x0 - 12),
      top = Math.max(0, y0 - 12);
    const width = Math.min(record.width, x1 + 12) - left,
      height = Math.min(record.height, y1 + 12) - top;
    const input = await sharp(path.join(root, "public", record.local))
      .extract({ left, top, width, height })
      .resize(230, 210, { fit: "contain", background })
      .flatten({ background })
      .png()
      .toBuffer();
    layers.push({ input, left: (i % 4) * 230, top: Math.floor(i / 4) * 240 });
    const code = codes.find((c) => c.productId === record.productId).code;
    const text = `${record.productId} ${code} / ${path.basename(record.local)}`;
    const label = Buffer.from(
      `<svg width="230" height="30"><rect width="230" height="30" fill="${background}"/><text x="8" y="20" font-size="12" fill="#292824">${text}</text></svg>`,
    );
    layers.push({
      input: label,
      left: (i % 4) * 230,
      top: Math.floor(i / 4) * 240 + 210,
    });
  }
  await sharp({
    create: {
      width: 920,
      height: Math.ceil(batch.length / 4) * 240,
      channels: 3,
      background: "#e5dfd2",
    },
  })
    .composite(layers)
    .png()
    .toFile(
      path.join(output, `${String(start / 16 + 1).padStart(2, "0")}.png`),
    );
}
console.log(
  JSON.stringify({
    reviewedAssets: records.length,
    sheets: Math.ceil(records.length / 16),
    output: path.relative(root, output),
  }),
);
