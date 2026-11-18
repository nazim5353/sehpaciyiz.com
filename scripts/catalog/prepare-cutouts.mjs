// Non-generative extraction: original RGB and dimensions are preserved; only alpha changes.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const ort = require(
  path.join(root, ".local/cutout-tools/node_modules/onnxruntime-node"),
);
const option = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? undefined : process.argv[i + 1];
};
const modelName = option("model") ?? "isnet-general-use";
const provider = option("provider") ?? "cpu";
const modelFile = path.join(root, `.local/cutout-models/${modelName}.onnx`);
const provenance = JSON.parse(
  await fs.readFile(
    path.join(root, "src/data/catalog-provenance.json"),
    "utf8",
  ),
);
const products = JSON.parse(
  await fs.readFile(path.join(root, "src/data/catalog.json"), "utf8"),
);
const owners = new Map(
  products.flatMap((p) =>
    (p.originalImages ?? p.images).map((image) => [image, p]),
  ),
);
let assets = provenance.assets.slice();
const ids = option("ids")?.split(",");
if (ids) assets = assets.filter((a) => ids.includes(owners.get(a.local).id));
assets.sort(
  (a, b) =>
    Number(owners.get(b.local).featured) -
      Number(owners.get(a.local).featured) || a.local.localeCompare(b.local),
);
if (option("limit")) assets = assets.slice(0, Number(option("limit")));
if (option("shard")) {
  const [index, count] = option("shard").split("/").map(Number);
  assert.ok(
    Number.isInteger(index) &&
      Number.isInteger(count) &&
      index >= 0 &&
      index < count,
  );
  assets = assets.filter((_, position) => position % count === index);
}
const jobDirectory = path.join(root, ".local/cutout-jobs");
await fs.mkdir(jobDirectory, { recursive: true });
let session;
const records = [];
const started = Date.now();
for (const [index, asset] of assets.entries()) {
  const originalFile = path.join(root, "public", asset.local);
  const destination = asset.local
    .replace("/images/catalog/", "/images/catalog-cutouts/")
    .replace(/\.[^.]+$/, ".png");
  const targetFile = path.join(root, "public", destination);
  const jobFile = path.join(
    jobDirectory,
    createHash("sha256").update(asset.local).digest("hex") + ".json",
  );
  try {
    const cached = JSON.parse(await fs.readFile(jobFile, "utf8"));
    if (cached.model === modelName && cached.sourceSha256 === asset.sha256) {
      await fs.access(targetFile);
      records.push(cached);
      continue;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!session) {
    console.log(JSON.stringify({ loadingModel: modelName }));
    session = await ort.InferenceSession.create(modelFile, {
      executionProviders: [provider],
      intraOpNumThreads: Number(option("threads") ?? 4),
      interOpNumThreads: 1,
      graphOptimizationLevel: "all",
      enableMemPattern: provider !== "dml",
      executionMode: "sequential",
    });
  }
  const originalBytes = await fs.readFile(originalFile);
  assert.equal(
    createHash("sha256").update(originalBytes).digest("hex"),
    asset.sha256,
  );
  const { data: original, info } = await sharp(originalBytes)
    .rotate()
    .toColourspace("srgb")
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const size = 1024,
    area = size * size;
  const pixels = await sharp(originalBytes)
    .rotate()
    .removeAlpha()
    .toColourspace("srgb")
    .resize(size, size, { fit: "fill", kernel: "lanczos3" })
    .raw()
    .toBuffer();
  const normalized = new Float32Array(area * 3);
  let maximum = 1;
  for (const value of pixels) if (value > maximum) maximum = value;
  const means =
    modelName === "isnet-general-use" ? [0.5, 0.5, 0.5] : [0.485, 0.456, 0.406];
  const deviations =
    modelName === "isnet-general-use" ? [1, 1, 1] : [0.229, 0.224, 0.225];
  for (let i = 0; i < area; i++)
    for (let channel = 0; channel < 3; channel++)
      normalized[channel * area + i] =
        (pixels[i * 3 + channel] / maximum - means[channel]) /
        deviations[channel];
  const predictions = await session.run({
    [session.inputNames[0]]: new ort.Tensor("float32", normalized, [
      1,
      3,
      size,
      size,
    ]),
  });
  const prediction = predictions[session.outputNames[0]];
  const values = prediction.data;
  let minimum = Infinity,
    maxProbability = -Infinity;
  const probabilities = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    const probability =
      modelName === "isnet-general-use"
        ? values[i]
        : 1 / (1 + Math.exp(-values[i]));
    probabilities[i] = probability;
    minimum = Math.min(minimum, probability);
    maxProbability = Math.max(maxProbability, probability);
  }
  const maskBytes = Buffer.alloc(values.length);
  for (let i = 0; i < values.length; i++)
    maskBytes[i] = Math.floor(
      (255 * (probabilities[i] - minimum)) / (maxProbability - minimum),
    );
  const mask = await sharp(maskBytes, {
    raw: {
      width: prediction.dims.at(-1),
      height: prediction.dims.at(-2),
      channels: 1,
    },
  })
    .resize(info.width, info.height, { kernel: "lanczos3", fit: "fill" })
    .toColourspace("b-w")
    .raw()
    .toBuffer();
  const rgba = Buffer.from(original);
  let transparent = 0,
    foreground = 0;
  let left = info.width,
    top = info.height,
    right = 0,
    bottom = 0;
  for (let i = 0; i < mask.length; i++) {
    const a = mask[i] < 12 ? 0 : mask[i] > 244 ? 255 : mask[i];
    const alpha = Math.min(a, original[i * 4 + 3]);
    rgba[i * 4 + 3] = alpha;
    if (alpha === 0) transparent++;
    if (alpha > 128) {
      foreground++;
      const x = i % info.width,
        y = Math.floor(i / info.width);
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  const transparentFraction = transparent / (info.width * info.height);
  const foregroundFraction = foreground / (info.width * info.height);
  assert.ok(transparentFraction > 0.05, "Background remains: " + asset.local);
  assert.ok(
    foregroundFraction > 0.005 && foregroundFraction < 0.95,
    "Suspicious mask: " + asset.local,
  );
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  const output = await sharp(rgba, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const decoded = await sharp(output).raw().toBuffer();
  assert.equal(decoded.length, original.length);
  for (let i = 0; i < original.length; i += 4)
    if (
      decoded[i] !== original[i] ||
      decoded[i + 1] !== original[i + 1] ||
      decoded[i + 2] !== original[i + 2]
    )
      throw new Error("RGB pixel changed: " + asset.local);
  await fs.writeFile(targetFile, output);
  const record = {
    productId: owners.get(asset.local).id,
    source: asset.local,
    local: destination,
    sourceSha256: asset.sha256,
    sha256: createHash("sha256").update(output).digest("hex"),
    width: info.width,
    height: info.height,
    model: modelName,
    rgbPreserved: true,
    transparentFraction,
    foregroundFraction,
    foregroundBox: [left, top, right + 1, bottom + 1],
  };
  await fs.writeFile(jobFile, JSON.stringify(record, null, 2));
  records.push(record);
  console.log(
    JSON.stringify({
      completed: index + 1,
      total: assets.length,
      product: owners.get(asset.local).name,
      seconds: Math.round((Date.now() - started) / 1000),
    }),
  );
}
if (assets.length === provenance.assets.length)
  await fs.writeFile(
    path.join(root, "src/data/catalog-cutouts.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
if (session) await session.release();
console.log(
  JSON.stringify({
    prepared: records.length,
    model: modelName,
    seconds: Math.round((Date.now() - started) / 1000),
  }),
);
