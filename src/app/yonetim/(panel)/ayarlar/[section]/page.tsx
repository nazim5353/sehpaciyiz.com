import { notFound } from "next/navigation";
import { settingsDefinitions } from "@/lib/settings";
import { readStore, maskSettings } from "@/lib/store";
import { SettingsForm } from "@/components/settings-form";
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const definition = settingsDefinitions[section];
  if (!definition) notFound();
  const store = await readStore();
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">MAĞAZA AYARLARI</span>
          <h1>{definition.title}</h1>
          <p>{definition.description}</p>
        </div>
        <span className="status-badge">Yerel yapılandırma</span>
      </div>
      <SettingsForm
        section={section}
        fields={definition.fields}
        initial={maskSettings(store.settings)[section]}
      />
    </>
  );
}
