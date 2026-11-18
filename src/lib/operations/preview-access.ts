import { networkInterfaces } from "node:os";

// Explicit opt-in for the local workspace; never grants access in production.
export function companyPreviewAllowed(
  host: string | null,
  env: {
    NODE_ENV?: string;
    LOCAL_PREVIEW?: string;
    COMPANY_PANEL_PREVIEW?: string;
  } = process.env,
  localAddresses = Object.values(networkInterfaces())
    .flatMap((values) => values ?? [])
    .filter((value) => !value.internal)
    .map((value) => value.address),
) {
  if (
    env.NODE_ENV === "production" ||
    env.LOCAL_PREVIEW !== "true" ||
    env.COMPANY_PANEL_PREVIEW !== "true" ||
    !host
  )
    return false;
  try {
    const url = new URL(`http://${host}`);
    return (
      url.host === host.toLowerCase() &&
      ["localhost", "127.0.0.1", "[::1]", ...localAddresses].includes(
        url.hostname,
      )
    );
  } catch {
    return false;
  }
}

export const PREVIEW_OWNER_EMAIL = "local-preview@sehpaciyiz.invalid";
export const PREVIEW_PASSWORD_DISABLED = "disabled:local-preview";
