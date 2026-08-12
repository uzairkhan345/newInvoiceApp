import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { invoiceService } from "@/services/invoiceService";
import { launchBrowser } from "@/lib/pdf/adapter";

/**
 * Navigates the shared /invoices/[id]/print
 * route (the same markup/data as the on-screen preview) via the deployment
 * adapter, streams the buffer back; nothing is ever written to disk. M28 —
 * one of only two Route Handlers in the app, so it needs its own explicit
 * session check (no layout wraps it the way pages get one). `/invoices/
 * [id]/print` is itself behind the same auth gate as every other page (the
 * `(app)` route group's layout), so the headless browser Puppeteer launches
 * below has to carry a real session too — it gets one by forwarding this
 * request's own cookies, exactly the credential the real user's browser
 * already sent, rather than inventing a separate internal-only auth
 * mechanism. See Docs/internal/feedback_backlog.md's M28 section.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const invoice = await invoiceService.getById(id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const printUrl = new URL(
    `/invoices/${id}/print`,
    process.env.NEXT_PUBLIC_APP_URL,
  ).toString();

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split(";").map((pair) => {
        const [name, ...rest] = pair.trim().split("=");
        return { name, value: rest.join("="), url: printUrl };
      });
      await page.setCookie(...cookies);
    }
    await page.goto(printUrl, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    const filename = `${sanitizeFilename(invoice.invoiceNumber)}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } finally {
    await browser.close();
  }
}

/** Invoice numbers are free-text and admin-editable — never trust them raw in a filename. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, "_");
}
