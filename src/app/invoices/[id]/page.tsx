import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Download, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { StatusActionBar } from "@/components/invoice/StatusActionBar";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { toDateInputValue } from "@/lib/dates";
import { getAiAssistConfigSummary } from "@/lib/ai-providers/config";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await invoiceService.getById(id);
  if (!invoice) {
    notFound();
  }
  const aiConfig = await getAiAssistConfigSummary();

  const headerAction = (
    <div className="flex items-center gap-3">
      <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/invoices/${invoice.id}/print`} target="_blank" />}
      >
        <Eye className="h-3.5 w-3.5" />
        Preview
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/api/invoices/${invoice.id}/excel`} />}
      >
        <Download className="h-3.5 w-3.5" />
        Excel
      </Button>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/api/invoices/${invoice.id}/pdf`} />}
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </Button>
      <StatusActionBar invoiceId={invoice.id} status={invoice.status} />
    </div>
  );

  if (invoice.status !== "DRAFT") {
    const data = documentService.assembleInvoiceDocumentData(invoice);
    return (
      <>
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle={invoice.project.name}
          action={headerAction}
          backHref="/invoices"
          backLabel="Back to Invoices"
        />
        {/* Docs/invoice_design_guidelines.md §15 — the A4 page has fixed
            physical dimensions; on narrow viewports it scrolls horizontally
            rather than reflowing. */}
        <div className="overflow-x-auto">
          <InvoiceDocument data={data} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Draft invoice for ${invoice.project.name}.`}
        action={headerAction}
        backHref="/invoices"
        backLabel="Back to Invoices"
      />
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        projectId={invoice.projectId}
        aiConfig={aiConfig}
        project={{
          name: invoice.project.name,
          contractorName: invoice.project.contractor.name,
          clientName: invoice.project.client.name,
          preferredPaymentMethodLabel:
            invoice.project.preferredPaymentMethod?.label ?? null,
          displayCurrency: invoice.project.displayCurrency,
        }}
        defaultValues={{
          invoiceNumber: invoice.invoiceNumber,
          issueDate: toDateInputValue(invoice.issueDate),
          dueDate: toDateInputValue(invoice.dueDate),
          convertedTotal: invoice.convertedTotal?.toString() ?? "",
          itemsNote: invoice.itemsNote ?? "",
          bottomNote: invoice.bottomNote ?? "",
          items: invoice.items.map((item) => ({
            description: item.description,
            isFlatAmount: item.isFlatAmount,
            quantity: item.quantity?.toString() ?? "",
            unitPrice: item.unitPrice?.toString() ?? "",
            amount: item.isFlatAmount ? item.amount.toString() : "",
          })),
        }}
      />
    </>
  );
}
