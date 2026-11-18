import { isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
export async function CompanyOwnerGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/yonetim");
  return children;
}
