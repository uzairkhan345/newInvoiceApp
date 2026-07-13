import { describe, expect, it } from "vitest";
import { launchBrowser } from "@/lib/pdf/localAdapter";

/**
 * Docs/execution_plan.md §16 M9 — a smoke test for the actual PDF-generation
 * mechanism (Puppeteer launch + page.pdf()) in this environment. It
 * deliberately does NOT drive the real /invoices/[id]/print route over
 * HTTP — that requires a running Next.js server, which `pnpm test` doesn't
 * spin up (this repo has no formal E2E suite, per Docs/milestone_prompts.md's
 * "Locked-in environment facts"). The real route is exercised via manual
 * browser/curl verification instead (see the M9 addendum in
 * Docs/execution_plan.md).
 */
describe("pdf localAdapter", () => {
  it("launches a real local browser and renders HTML to a non-empty PDF buffer", async () => {
    const browser = await launchBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(
        "<html><body><h1>Smoke test invoice</h1></body></html>",
      );
      const buffer = await page.pdf({ format: "A4", printBackground: true });
      expect(buffer.byteLength).toBeGreaterThan(0);
      // %PDF- magic bytes confirm this is a real PDF, not an error page.
      expect(Buffer.from(buffer.slice(0, 5)).toString("ascii")).toBe("%PDF-");
    } finally {
      await browser.close();
    }
  }, 30_000);
});
