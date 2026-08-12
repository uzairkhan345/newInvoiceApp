import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf";

/**
 * M28 — one of only two Route Handlers in the app, so it needs its own
 * explicit session check (no layout wraps it the way pages get one).
 *
 * M32.1 — branches on `PDF_ADAPTER`: `"pdf-lib"` renders in-process, no
 * browser at all; anything else (`"local"`/`"serverless"`, the
 * historical default) launches headless Chromium via a **dynamic**
 * `import()` of `renderViaBrowser.ts` — load-bearing, not stylistic, since
 * `puppeteer`/`puppeteer-core`/`@sparticuz/chromium` are now
 * `devDependencies`; a static import of that module graph from a file
 * production runs would break a production-only install even on the
 * branch that never executes.
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

  const pdfBuffer =
    process.env.PDF_ADAPTER === "pdf-lib"
      ? await renderInvoicePdf(documentService.assembleInvoiceDocumentData(invoice))
      : await (
          await import("@/lib/pdf/renderViaBrowser")
        ).renderInvoicePdfViaBrowser(id, request.headers.get("cookie"));

  const filename = `${sanitizeFilename(invoice.invoiceNumber)}.pdf`;

  return new NextResponse(Buffer.from(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Invoice numbers are free-text and admin-editable — never trust them raw in a filename. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, "_");
}
