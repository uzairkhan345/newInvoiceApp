"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import type { InvoiceTableRow } from "@/lib/invoiceTableRow";

/** Docs/ui_design_guide.md §9/§4 — List/Ledger template for Invoices. */
export function InvoiceTable({
  invoices,
  hideProjectColumn,
}: {
  invoices: InvoiceTableRow[];
  /** Docs/feedback_backlog.md M19.3a — the Project column is redundant when this table is already scoped to one project. */
  hideProjectColumn?: boolean;
}) {
  const router = useRouter();

  const columns: DataTableColumn<InvoiceTableRow>[] = [
    {
      header: "Invoice #",
      cell: (invoice) => (
        <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
      ),
    },
    ...(hideProjectColumn
      ? []
      : [
          {
            header: "Project",
            cell: (invoice: InvoiceTableRow) => invoice.project.name,
          } satisfies DataTableColumn<InvoiceTableRow>,
        ]),
    { header: "Client", cell: (invoice) => invoice.project.client.name },
    {
      header: "Issue Date",
      cell: (invoice) => formatDisplayDate(invoice.issueDate),
    },
    {
      header: "Due Date",
      cell: (invoice) => formatDisplayDate(invoice.dueDate),
    },
    {
      header: "Status",
      cell: (invoice) => (
        <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
      ),
    },
    {
      header: "Total",
      align: "right",
      cell: (invoice) => (
        <span className="font-mono">
          {formatCurrency(invoice.total, invoice.currency)}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={invoices}
      getRowKey={(invoice) => invoice.id}
      onRowClick={(invoice) => router.push(`/invoices/${invoice.id}`)}
    />
  );
}
