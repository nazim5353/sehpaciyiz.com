import { CompanyPage, type CompanySearch } from "@/components/company-page";
export const metadata = { title: "Sehpacıyız · Şirket yönetimi" };
export default function Dashboard({
  searchParams,
}: {
  searchParams: CompanySearch;
}) {
  return <CompanyPage view="ozet" searchParams={searchParams} />;
}
