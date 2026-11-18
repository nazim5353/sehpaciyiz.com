import { brand } from "../src/lib/brand";
import { readStore, updateStore } from "../src/lib/store";
import { createHash } from "node:crypto";

async function main() {
  const before = await readStore();
  const updates = {
    genel: { tagline: brand.slogan },
    seo: { title: brand.title, description: brand.description },
    icerik: {
      heroTitle: brand.slogan,
      heroDescription: brand.heroDescription,
      announcement: brand.announcement,
      about: brand.about,
    },
  };
  const changed = Object.entries(updates).some(([section, fields]) =>
    Object.entries(fields).some(([key, value]) => before.settings[section][key] !== value),
  );
  if (changed) {
    await updateStore((store) => {
      for (const [section, fields] of Object.entries(updates))
        Object.assign(store.settings[section], fields);
    }, "apply-brand", "Form identity approved 2026-11-17");
  }
  const after = await readStore();
  const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  if (hash(before.products) !== hash(after.products)) throw new Error("Unexpected catalogue mutation");
  for (const section of Object.keys(before.settings))
    if (!(section in updates) && hash(before.settings[section]) !== hash(after.settings[section]))
      throw new Error(`Unexpected settings mutation: ${section}`);
  console.log(changed ? "Form brand content applied; catalogue and operational settings preserved." : "Form brand content already current.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
