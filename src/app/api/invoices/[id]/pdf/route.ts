import { NextResponse } from "next/server";
import { invoiceService } from "@/services/invoiceService";
import { launchBrowser } from "@/lib/pdf/adapter";

/**
 * Docs/execution_plan.md §12 — navigates the shared /invoices/[id]/print
 * route (the same markup/data as the on-screen preview) via the deployment
 * adapter, streams the buffer back; nothing is ever written to disk.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
