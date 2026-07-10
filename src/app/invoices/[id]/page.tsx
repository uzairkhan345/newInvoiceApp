import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { StatusActionBar } from "@/components/invoice/StatusActionBar";
import { Card, CardContent } from "@/components/ui/card";
import { invoiceService } from "@/services/invoiceService";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate, toDateInputValue } from "@/lib/dates";

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
    return (
      <>
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle={invoice.project.name}
          action={headerAction}
        />
        <Card>
          <CardContent className="space-y-6 pt-6 text-[13px]">
            <p className="text-muted-foreground">
              This invoice is {invoice.status.toLowerCase()} and no longer
              editable. Line items, snapshot data, and totals are locked. (The
              full styled document preview lands in a later milestone.)
            </p>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Issue Date
                </dt>
                <dd>{formatDisplayDate(invoice.issueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Due Date
                </dt>
                <dd>{formatDisplayDate(invoice.dueDate)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Subtotal
                </dt>
                <dd className="font-mono">
                  {formatCurrency(invoice.subtotal.toString(), "USD")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Total
                </dt>
                <dd className="font-mono font-semibold">
                  {formatCurrency(invoice.total.toString(), "USD")}
                </dd>
              </div>
              {invoice.convertedTotal && invoice.convertedCurrency ? (
                <div>
                  <dt className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                    Converted Total
                  </dt>
                  <dd className="font-mono text-muted-foreground">
                    {formatCurrency(
                      invoice.convertedTotal.toString(),
                      invoice.convertedCurrency,
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60">
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right font-mono">
                      {item.quantity.toString()}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(item.unitPrice.toString(), "USD")}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(item.amount.toString(), "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
