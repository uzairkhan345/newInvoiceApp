import { notFound } from "next/navigation";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";

/**
 * Bare markup only, no sidebar/nav (handled by
 * `AppShell` detecting this path), print-friendly. This is the exact route
 * M9's PDF adapter will later navigate to and screenshot. `InvoiceDocument`
 * itself is a fixed-size A4 page (Docs/invoice_design_guidelines.md) with no
 * card/border chrome and no wrapper padding here — its own CSS sets the
 * exact page geometry, identically to the in-app preview. `screenOnly=false`
 * so the locked banner and status tag never render here — this route is
 * "what will actually print," viewed as a screen tab or captured as a PDF,
 * so both should look identical rather than differing by media type.
 */
export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await invoiceService.getById(id);
  if (!invoice) {
    notFound();
  }

  const data = documentService.assembleInvoiceDocumentData(invoice);

  return (
    <div className="bg-white">
      <InvoiceDocument data={data} screenOnly={false} />
    </div>
  );
}
