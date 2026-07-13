import puppeteer, { type Browser } from "puppeteer";

/**
 * Docs/implementation_decisions.md §12.2 — plain `puppeteer` (bundles its
 * own Chromium download). This is the adapter actually exercised during
 * local-dev MVP milestones (M0-M12) — see Docs/execution_plan.md §21.
 */
export function launchBrowser(): Promise<Browser> {
  return puppeteer.launch();
}
