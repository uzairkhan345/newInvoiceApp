import { launchBrowser } from "@/lib/pdf/adapter";

/**
 * M32.1 — the `local`/`serverless` PDF_ADAPTER path (headless-Chromium
 * browser rendering), split out of `route.ts` so it can be reached via a
 * dynamic `import()` instead of a static one: `puppeteer`/`puppeteer-core`/
 * `@sparticuz/chromium` are now `devDependencies`, so a production install
 * running the `pdf-lib` adapter must never pull this module's static import
 * graph in, even on the branch that never executes it. Navigates the shared
 * `/invoices/[id]/print` route (the same markup/data as the on-screen
 * preview) via the deployment adapter, streams the buffer back; nothing is
 * ever written to disk. `/invoices/[id]/print` is itself behind the same
 * auth gate as every other page (the `(app)` route group's layout), so the
 * headless browser has to carry a real session too — it gets one by
 * forwarding the original request's own cookies, exactly the credential the
 * real user's browser already sent, rather than inventing a separate
 * internal-only auth mechanism. See Docs/internal/feedback_backlog.md's M28
 * section.
 */
export async function renderInvoicePdfViaBrowser(
  id: string,
  cookieHeader: string | null,
): Promise<Uint8Array> {
  const printUrl = new URL(
    `/invoices/${id}/print`,
    process.env.NEXT_PUBLIC_APP_URL,
  ).toString();

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((pair) => {
        const [name, ...rest] = pair.trim().split("=");
        return { name, value: rest.join("="), url: printUrl };
      });
      await page.setCookie(...cookies);
    }
    await page.goto(printUrl, { waitUntil: "networkidle0" });
    // Must resolve before `finally`'s browser.close() runs, or the browser
    // closes mid-flight and printToPDF fails with "Target closed".
    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}
