import { CompanyPage, type CompanySearch } from "@/components/company-page";
export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ view: string }>;
  searchParams: CompanySearch;
}) {
  return <CompanyPage view={(await params).view} searchParams={searchParams} />;
}
