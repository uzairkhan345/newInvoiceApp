import { notFound } from "next/navigation";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";

/**
 * Docs/execution_plan.md §12 — bare markup only, no sidebar/nav (handled by
 * `AppShell` detecting this path), print-friendly. This is the exact route
 * M9's PDF adapter will later navigate to and screenshot — a plain, full-bleed
 * white page (`framed={false}`), not the bordered/rounded "document card"
 * used for the in-app preview, since a real exported PDF has no card chrome.
 * `InvoiceDocument`'s own padding serves as the page margin; no extra
 * wrapper padding is added here.
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
    <div className="min-h-screen bg-white">
      <InvoiceDocument data={data} framed={false} />
    </div>
  );
}
