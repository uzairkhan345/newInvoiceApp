import type { InvoiceListItem } from "@/repositories/invoiceRepository";

/**
 * Next.js Server→Client Component props must be plain-serializable — a
 * Prisma `Decimal` instance (Invoice.total/subtotal) is not, so the invoices
 * list page maps each row through this function before handing it to the
 * (client) InvoiceTable component, rather than passing `InvoiceListItem`
 * directly. Kept in a plain module (no "use client") since a Server
 * Component can't call a function exported from a client module.
 */
export type InvoiceTableRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  total: string;
  project: { name: string; client: { name: string } };
};

export function toInvoiceTableRow(invoice: InvoiceListItem): InvoiceTableRow {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    total: invoice.total.toString(),
    project: {
      name: invoice.project.name,
      client: { name: invoice.project.client.name },
    },
  };
}
