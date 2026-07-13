import type { Browser } from "puppeteer-core";
import { launchBrowser as launchLocalBrowser } from "@/lib/pdf/localAdapter";
import { launchBrowser as launchServerlessBrowser } from "@/lib/pdf/serverlessAdapter";

/**
 * Docs/implementation_decisions.md §12.2/§21 — the ONE part of the app
 * permitted to be deployment-target-specific. Selection is driven by the
 * `PDF_ADAPTER` env var ("local" | "serverless"), falling back to
 * `process.env.VERCEL` auto-detection if unset. No other module in the app
 * branches on deployment target.
 */
export function launchBrowser(): Promise<Browser> {
  const useServerless =
    process.env.PDF_ADAPTER === "serverless" ||
    (!process.env.PDF_ADAPTER && Boolean(process.env.VERCEL));

  return useServerless ? launchServerlessBrowser() : launchLocalBrowser();
}
