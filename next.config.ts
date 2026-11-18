import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
const config: NextConfig = {
  distDir:
    process.env.OPS_TEST_BUILD === "true" ? ".local/ops-next-test" : ".next",
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingExcludes: { "/*": ["./.local/**/*", "./.env*"] },
  allowedDevOrigins: [
    "127.0.0.1",
    ...Object.values(networkInterfaces())
      .flatMap((addresses) => addresses ?? [])
      .filter((address) => address.family === "IPv4" && !address.internal)
      .map((address) => address.address),
  ],
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
