import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
try {
  await writeFile(
    new URL("../.env.local", import.meta.url),
    "LOCAL_PREVIEW=true\nSESSION_SECRET=" +
      randomBytes(32).toString("hex") +
      "\nSETTINGS_ENCRYPTION_KEY=" +
      randomBytes(32).toString("hex") +
      "\n",
    { flag: "wx", mode: 0o600 },
  );
  console.log("Yerel ayarlar oluşturuldu. npm run dev ile başlatın.");
} catch (error) {
  if (error.code === "EEXIST")
    console.log(".env.local mevcut; değiştirilmedi.");
  else throw error;
}
