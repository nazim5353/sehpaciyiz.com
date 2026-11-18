import products from "@/data/catalog.json";
import { defaultSettings } from "@/lib/settings";

// The hosted design preview contains only versioned catalogue and brand data.
// No filesystem, credentials, company database or write API is deployed.
export async function readStore() {
  return { version: 1, products, settings: defaultSettings(), audit: [] };
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
