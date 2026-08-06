import puppeteer, { type Browser } from "puppeteer";

/**
 * Docs/implementation_decisions.md §12.2 — plain `puppeteer` (bundles its
 * own Chromium download). This is the adapter actually exercised during
 * local-dev MVP milestones (M0-M12) — see
 */
export function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    // GitHub Actions runners (and similar CI containers) don't support
    // Chrome's default sandbox — "No usable sandbox!" is otherwise fatal
    // there. Real local dev and the eventual droplet deployment both keep
    // the sandbox; this only relaxes it where CI would fail without it.
    args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
  });
}
