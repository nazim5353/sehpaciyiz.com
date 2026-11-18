import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  defaultSettings,
  type Settings,
  settingsDefinitions,
  SECRET_MASK,
} from "./settings";
import { type Product } from "./catalog";
import catalogData from "../data/catalog.json";
const seedProducts: Product[] = catalogData;
import { seal } from "./crypto";
export type AuditEntry = {
  id: string;
  action: string;
  target: string;
  at: string;
};
export type Store = {
  version: 1;
  settings: Settings;
  products: Product[];
  audit: AuditEntry[];
};
const filename = path.join(process.cwd(), ".local", "store.json");
const directory = path.dirname(filename);
function assertLocal() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.LOCAL_PREVIEW !== "true"
  )
    throw new Error(
      "Yerel veri adaptörü yalnızca geliştirme önizlemesinde kullanılabilir. PostgreSQL adaptörü devreye alınmalı.",
    );
}
function initial(): Store {
  return {
    version: 1,
    settings: defaultSettings(),
    products: structuredClone(seedProducts),
    audit: [],
  };
}
export async function readStore(): Promise<Store> {
  assertLocal();
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return initial();
  }
}
// Single-process development adapter. Production must use PostgreSQL transactions.
let writeQueue = Promise.resolve();
export async function updateStore(
  mutator: (store: Store) => void,
  action: string,
  target: string,
) {
  assertLocal();
  const operation = writeQueue.then(async () => {
    const store = await readStore();
    mutator(store);
    store.audit.unshift({
      id: randomUUID(),
      action,
      target,
      at: new Date().toISOString(),
    });
    store.audit = store.audit.slice(0, 200);
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(store, null, 2), { mode: 0o600 });
    await rename(temporary, filename);
  });
  writeQueue = operation.catch(() => {});
  await operation;
}
export async function getProducts() {
  return (await readStore()).products;
}
export async function getPublicSettings() {
  const { settings } = await readStore();
  return {
    storeName: String(settings.genel.storeName),
    tagline: String(settings.genel.tagline),
    whatsapp: String(settings.genel.whatsapp),
    email: String(settings.genel.email),
    phone: String(settings.genel.phone),
    content: settings.icerik,
    shipping: {
      flatRate: Number(settings.kargo.flatRate) * 100,
      freeThreshold: Number(settings.kargo.freeThreshold) * 100,
    },
  };
}
export function maskSettings(settings: Settings): Settings {
  const result = structuredClone(settings);
  for (const [section, definition] of Object.entries(settingsDefinitions))
    for (const field of definition.fields)
      if (field.type === "password")
        result[section][field.key] = result[section][field.key]
          ? SECRET_MASK
          : "";
  return result;
}
export function mergeSettings(
  store: Store,
  section: string,
  values: Record<string, string | number | boolean>,
) {
  const definition = settingsDefinitions[section];
  if (!definition) throw new Error("Ayar bölümü bulunamadı.");
  for (const field of definition.fields) {
    if (!(field.key in values)) continue;
    const value = values[field.key];
    if (field.type === "password") {
      if (value === SECRET_MASK || value === "") continue;
      store.settings[section][field.key] = seal(String(value));
    } else store.settings[section][field.key] = value;
  }
}
