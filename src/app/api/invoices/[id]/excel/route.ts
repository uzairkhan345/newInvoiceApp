import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { buildInvoiceWorkbook } from "@/lib/excel/buildInvoiceWorkbook";

/**
 * Builds the workbook in-memory
 * (`workbook.xlsx.writeBuffer()`); nothing is ever written to disk. Sources
 * exclusively from `documentService.assembleInvoiceDocumentData`, so a SENT
 * invoice always exports its locked snapshot, never live Party/PaymentMethod
 * data. M28 — one of only two Route Handlers in the app, so it needs its
 * own explicit session check (no layout wraps it the way pages get one).
 */
export async function GET(
  _request: Request,
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

  const data = documentService.assembleInvoiceDocumentData(invoice);
  const buffer = await buildInvoiceWorkbook(data);
  const filename = `${sanitizeFilename(data.invoiceNumber)}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Invoice numbers are free-text and admin-editable — never trust them raw in a filename. */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]+/g, "_");
}
