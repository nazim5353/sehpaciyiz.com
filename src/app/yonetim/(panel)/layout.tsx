import { redirect } from "next/navigation";
import { currentOperator } from "@/lib/operations/identity";
import { AdminShell } from "@/components/admin-shell";
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentOperator();
  if (!user) redirect("/yonetim/giris");
  return <AdminShell user={user}>{children}</AdminShell>;
}
