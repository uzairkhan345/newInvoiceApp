import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { invoiceService } from "@/services/invoiceService";
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

  if (invoice.status !== "DRAFT") {
    return (
      <>
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle={invoice.project.name}
          action={
            <Badge variant="secondary" className="uppercase">
              {invoice.status}
            </Badge>
          }
        />
        <Card>
          <CardContent className="pt-6 text-[13px] text-muted-foreground">
            This invoice is not editable yet. The full locked document preview
            lands in a later milestone — for now, {invoice.status} invoices are
            simply not editable from this page.
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Draft invoice for ${invoice.project.name}.`}
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
