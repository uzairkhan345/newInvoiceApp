import type { NextConfig } from "next";

/**
 * M32.1 — belt-and-suspenders alongside `route.ts`'s dynamic import of the
 * browser-rendering path: keeps Next's server bundler from trying to
 * statically trace `puppeteer`/`puppeteer-core`/`@sparticuz/chromium`
 * (now `devDependencies`) into the server build at all.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
  // Standalone output is copied to the deploy target as a self-contained
  // server (its own minimal node_modules), rather than requiring a full
  // `pnpm install` on the host. `.next/static` and `public/` aren't
  // included automatically and must be copied alongside it separately.
  output: "standalone",
};

export default nextConfig;
