import type { NextConfig } from "next";

/**
 * M32.1 — belt-and-suspenders alongside `route.ts`'s dynamic import of the
 * browser-rendering path: keeps Next's server bundler from trying to
 * statically trace `puppeteer`/`puppeteer-core`/`@sparticuz/chromium`
 * (now `devDependencies`) into the server build at all.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer", "puppeteer-core", "@sparticuz/chromium"],
};

export default nextConfig;
