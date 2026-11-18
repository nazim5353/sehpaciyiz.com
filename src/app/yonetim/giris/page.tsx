import { redirect } from "next/navigation";
import { CompanyLogin } from "@/components/company-login";
import { currentOperator, hasCompanyOwner } from "@/lib/operations/identity";
export const metadata = { title: "Sehpacıyız şirket girişi" };
export default async function Login() {
  if (await currentOperator()) redirect("/yonetim");
  return <CompanyLogin setup={!(await hasCompanyOwner())} />;
}
