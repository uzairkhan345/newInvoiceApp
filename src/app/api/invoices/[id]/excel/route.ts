import { NextResponse } from "next/server";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { buildInvoiceWorkbook } from "@/lib/excel/buildInvoiceWorkbook";

/**
 * Builds the workbook in-memory
 * (`workbook.xlsx.writeBuffer()`); nothing is ever written to disk. Sources
 * exclusively from `documentService.assembleInvoiceDocumentData`, so a SENT
 * invoice always exports its locked snapshot, never live Party/PaymentMethod
 * data.
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
