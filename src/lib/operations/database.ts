import { PGlite, type Transaction } from "@electric-sql/pglite";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { operationsSchema } from "./schema";

export type OperationsDB = PGlite;
export type OperationsTransaction = Transaction;
export async function openOperationsDB(directory?: string) {
  if (directory) await mkdir(directory, { recursive: true, mode: 0o700 });
  const db = new PGlite(directory);
  await db.waitReady;
  await db.exec(operationsSchema);
  await db.exec(
    "SET ROLE ops_runtime; SET timezone='Europe/Istanbul'; SET statement_timeout='15s';",
  );
  return db;
}
const runtime = globalThis as typeof globalThis & {
  sehpaOperationsDB?: Promise<PGlite>;
};
export function operationsDB() {
  if (process.env.NODE_ENV === "production")
    throw new Error(
      "Şirket panelinin yerel veritabanı yalnızca geliştirme içindir. Canlı PostgreSQL bağlantısı kurulmalı.",
    );
  if (process.env.LOCAL_PREVIEW !== "true")
    throw new Error("Yerel şirket paneli etkin değil.");
  if (!runtime.sehpaOperationsDB) {
    const directory =
      process.env.OPS_DB_DIRECTORY ??
      path.join(process.cwd(), ".local", "company-pg");
    runtime.sehpaOperationsDB = openOperationsDB(directory).catch((error) => {
      runtime.sehpaOperationsDB = undefined;
      throw error;
    });
  }
  return runtime.sehpaOperationsDB;
}
