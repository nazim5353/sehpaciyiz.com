import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const index = process.argv.indexOf("--destination");
assert.ok(
  index >= 0 && process.argv[index + 1],
  "Use --destination <panel checkout>",
);
const destination = path.resolve(process.argv[index + 1]);
assert.notEqual(destination, path.resolve(root));
const target = JSON.parse(
  await fs.readFile(
    path.join(root, "preview/panel-hosting-target.json"),
    "utf8",
  ),
);
const manifest = JSON.parse(
  await fs.readFile(path.join(destination, ".openai/hosting.json"), "utf8"),
);
assert.equal(manifest.project_id, target.project_id);
assert.equal(manifest.d1, "DB");
async function read(name) {
  return fs.readFile(path.join(root, name), "utf8");
}
async function write(name, value) {
  const f = path.join(destination, name);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, value);
}
async function copy(from, to = from) {
  const f = path.join(destination, to);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.cp(path.join(root, from), f, { recursive: true });
}
for (const forbidden of [
  ".env.local",
  ".local",
  "lib/operations/database.ts",
  "lib/operations/identity.ts",
  "lib/store.ts",
])
  await assert.rejects(fs.access(path.join(destination, forbidden)), {
    code: "ENOENT",
  });
const products = JSON.parse(await read("src/data/catalog.json"));
const catalog = products.map((p) => ({
  id: p.id,
  name: p.name,
  sku: p.sku ?? "",
  image: p.images[0],
  priceMinor: p.price,
  unitCostMinor: null,
}));
await write("data/panel-catalog.json", JSON.stringify(catalog));
for (const image of new Set(catalog.map((p) => p.image))) {
  assert.ok(
    image.startsWith("/images/catalog-cutouts/") && !image.includes(".."),
  );
  await copy("public" + image);
}
await copy("public/fonts");
await copy("src/app/icon.svg", "app/icon.svg");
for (const name of ["types", "validation", "filters"])
  await copy(`src/lib/operations/${name}.ts`, `lib/operations/${name}.ts`);
for (const name of ["model", "commands", "selectors", "persistence"])
  await write(
    `lib/company/${name}.ts`,
    (await read(`cloud/company/${name}.ts`)).replaceAll(
      "../../src/lib/operations/",
      "../operations/",
    ),
  );
for (const name of [
  "company-workspace",
  "company-forms",
  "company-modal",
  "admin-shell",
])
  await copy(`src/components/${name}.tsx`, `components/${name}.tsx`);
await write(
  "components/company-modal.tsx",
  (await read("src/components/company-modal.tsx")).replace(
    'import * as Dialog from "@radix-ui/react-dialog";',
    'import { Dialog } from "radix-ui";',
  ),
);
await write(
  "components/company-modal.tsx",
  (
    await fs.readFile(
      path.join(destination, "components/company-modal.tsx"),
      "utf8",
    )
  ).replace(
    "const data = await response.json();",
    "const data = await response.json() as {error?:string;result?:unknown};",
  ),
);
await write("vite-env.d.ts", '/// <reference types="vite/client" />\n');
await copy("cloud/company/drizzle", "drizzle");
let forms = await read("src/components/company-forms.tsx");
forms = forms
  .replace('password: text(form, "password"),', "")
  .replace(
    '["staff", "password", "reset"].includes(mode)',
    '["password", "reset"].includes(mode)',
  )
  .replace(
    '"Personel kendi kayıtlarını girer. Mali raporlar ve düzeltme onayı şirket sahibinde kalır."',
    '"Personelin ChatGPT e-postasını kullanın. Bu alanın paylaşım ayarlarından da erişim verilmelidir. Personel kendi kayıtlarını girer; mali raporlar ve onaylar şirket sahibinde kalır."',
  );
await write("components/company-forms.tsx", forms);
let workspace = await read("src/components/company-workspace.tsx");
const reset =
  /<button\s+className="company-button"\s+onClick=\{\(\) =>\s+setModal\(\{ type: "reset", targetId: u\.id \}\)\s+\}\s*>\s*Şifre yenile\s*<\/button>/g;
let resetCount = 0;
workspace = workspace.replace(reset, () => {
  resetCount++;
  return "";
});
assert.equal(resetCount, 1, "Review cloud staff identity adapter");
await write("components/company-workspace.tsx", workspace);
let shell = await read("src/components/admin-shell.tsx");
shell = shell
  .replace(
    'href="/" target="_blank"',
    `href="https://sehpaciyiz-onizleme.bee-organiza-3097.chatgpt.site" target="_blank"`,
  )
  .replaceAll(
    'href="/yonetim/urunler"',
    'href="https://sehpaciyiz-onizleme.bee-organiza-3097.chatgpt.site/koleksiyon/"',
  )
  .replaceAll(
    'href="/yonetim/ayarlar/genel"',
    'href="https://sehpaciyiz-onizleme.bee-organiza-3097.chatgpt.site/"',
  )
  .replace("Mağaza ayarları", "Web vitrini")
  .replace(
    'user.preview\n                ? "Yerel önizleme"',
    'user.preview\n                ? "Bulut çalışma alanı"',
  )
  .replaceAll('"Girişsiz önizleme"', '"Güvenli bulut alanı"')
  .replaceAll('"Yerel çalışma"', '"Güvenli bulut alanı"');
await write("components/admin-shell.tsx", shell);
await write("app/company.css", await read("src/app/yonetim/company.css"));
const palette = JSON.parse(await read("src/data/brand-palette.json"));
await write(
  "app/globals.css",
  (await read("src/app/globals.css")) +
    `\n@font-face{font-family:Manrope;src:url('/fonts/manrope-regular.ttf') format('truetype');font-weight:400;font-display:swap}@font-face{font-family:Manrope;src:url('/fonts/manrope-semibold.ttf') format('truetype');font-weight:600;font-display:swap}@font-face{font-family:Manrope;src:url('/fonts/manrope-bold.ttf') format('truetype');font-weight:700 900;font-display:swap}:root{--font-manrope:Manrope;--bg:${palette.background};--surface:#fff;--text:${palette.text};--muted:${palette.muted};--line:${palette.line};--accent:${palette.ink};--accent-soft:${palette.mist};--sage:${palette.paper}}\n`,
);
await write(
  "app/layout.tsx",
  `import './globals.css';import './company.css';export const metadata={title:'Sehpacıyız · Şirket Yönetimi',robots:{index:false,follow:false}};export default function Layout({children}:{children:React.ReactNode}){return <html lang="tr"><body>{children}</body></html>}`,
);
await write(
  "app/page.tsx",
  `import {redirect} from 'next/navigation';export default function Home(){redirect('/yonetim')}`,
);
await write(
  "app/yonetim/page.tsx",
  `import {CloudCompanyPage} from '@/components/cloud-company-page';export const dynamic='force-dynamic';export default function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CloudCompanyPage view="ozet" searchParams={searchParams}/>}`,
);
await write(
  "app/yonetim/[view]/page.tsx",
  `import {CloudCompanyPage} from '@/components/cloud-company-page';export const dynamic='force-dynamic';export default async function Page({params,searchParams}:{params:Promise<{view:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){return <CloudCompanyPage view={(await params).view} searchParams={searchParams}/>}`,
);
await write(
  "components/cloud-company-page.tsx",
  await read("cloud/company/page-template.tsx.txt"),
);
await write(
  "lib/company/runtime.ts",
  await read("cloud/company/runtime-template.ts.txt"),
);
await write(
  "app/api/operations/route.ts",
  await read("cloud/company/api-template.ts.txt"),
);
await write(
  "app/api/operations/export/route.ts",
  await read("cloud/company/export-template.ts.txt"),
);
await write(
  "app/api/health/route.ts",
  `import {env} from 'cloudflare:workers';export const dynamic='force-dynamic';export async function GET(){if(!env.DB)return Response.json({ok:false},{status:503});await env.DB.prepare('SELECT revision FROM cloud_revision LIMIT 1').all();return Response.json({ok:true,storage:'persistent-cloud-database'},{headers:{'Cache-Control':'no-store'}})}`,
);
await write(
  "db/schema.ts",
  `import {sqliteTable,text,integer,primaryKey,check} from 'drizzle-orm/sqlite-core';import {sql} from 'drizzle-orm';export const revision=sqliteTable('cloud_revision',{id:text('id').primaryKey(),revision:integer('revision').notNull().default(0)},t=>[check('revision_conflict',sql\`\${t.revision}>=0\`)]);export const entities=sqliteTable('cloud_entities',{companyId:text('company_id').notNull().references(()=>revision.id),kind:text('kind').notNull(),id:text('id').notNull(),payload:text('payload').notNull()},t=>[primaryKey({columns:[t.companyId,t.kind,t.id]})]);`,
);
await write(
  "next.config.ts",
  `export default {images:{unoptimized:true},poweredByHeader:false};\n`,
);
await write(
  "README.md",
  `# Sehpacıyız şirket yönetimi\n\nKalıcı ve özel panel: ${target.url}\n\nKalıcılık Cloudflare D1 ile sağlanır. Bu kaynak scripts/prepare-company-panel.mjs ile hazırlanır. Yerel veritabanı, .env, kaynak fotoğraflar ve şifreler kopyalanmaz. Personel yetkileri şirket alanına özgüdür; dış erişim ayrıca Sites paylaşım politikası tarafından denetlenir.\n`,
);
console.log(
  JSON.stringify({
    project_id: target.project_id,
    destination,
    products: catalog.length,
    privateFilesCopied: false,
  }),
);
