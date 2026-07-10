import { notFound } from "next/navigation";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";

/**
 * Docs/execution_plan.md §12 — bare markup only, no sidebar/nav (handled by
 * `AppShell` detecting this path), print-friendly. This is the exact route
 * M9's PDF adapter will later navigate to and screenshot.
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
    <div className="min-h-screen bg-background px-4 py-10 print:bg-white print:p-0">
      <InvoiceDocument data={data} />
    </div>
  );
}
