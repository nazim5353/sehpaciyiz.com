// Keep previews unindexed. The deployment owner opts in after reviewing live content.
export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3100",
);
export const indexable =
  process.env.SITE_INDEXING === "true" && siteUrl.protocol === "https:";
export const absoluteUrl = (pathname: string) =>
  new URL(pathname, siteUrl).href;
export const jsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
