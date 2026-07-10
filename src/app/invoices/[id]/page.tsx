import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { StatusActionBar } from "@/components/invoice/StatusActionBar";
import { InvoiceDocument } from "@/components/invoice/InvoiceDocument";
import { invoiceService } from "@/services/invoiceService";
import { documentService } from "@/services/documentService";
import { toDateInputValue } from "@/lib/dates";

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

  const headerAction = (
    <div className="flex items-center gap-3">
      <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
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
        />
        <InvoiceDocument data={data} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Draft invoice for ${invoice.project.name}.`}
        action={headerAction}
      />
      <InvoiceForm
        mode="edit"
        invoiceId={invoice.id}
        projectId={invoice.projectId}
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
          items: invoice.items.map((item) => ({
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
          })),
        }}
      />
    </>
  );
}
