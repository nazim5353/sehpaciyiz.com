import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("out");
let bytes = 0;
async function measure(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await measure(filename);
    else bytes += (await fs.stat(filename)).size;
  }
}
await measure(root);
assert.ok(bytes < 250 * 1024 * 1024, `Preview output is ${Math.ceil(bytes / 1048576)} MiB; reduce repeated payloads or unused files before publishing (256 MiB platform limit).`);
for (const forbidden of ["yonetim", "api", ".env.local", ".local"]) {
  await assert.rejects(fs.access(path.join(root, forbidden)), { code: "ENOENT" }, `Private path in export: ${forbidden}`);
}
console.log(JSON.stringify({ expandedMiB: +(bytes / 1048576).toFixed(1), hostingLimitVerified: true }));
