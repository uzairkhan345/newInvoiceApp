import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser } from "puppeteer-core";

/**
 * Docs/implementation_decisions.md §12.2/§21 — `puppeteer-core` +
 * `@sparticuz/chromium`, sized for a serverless target (e.g. Vercel).
 * Implemented to the same interface as `localAdapter.ts` from the start so
 * the eventual switch isn't a rewrite, but this adapter is only ever
 * exercised/validated at the follow-on M13 deployment-readiness milestone —
 * it is not called by anything during local dev (see `adapter.ts`'s
 * factory) and its live behavior against Vercel is unverified here.
 */
export async function launchBrowser(): Promise<Browser> {
  return puppeteerCore.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}
