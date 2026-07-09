"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import type { InvoiceTableRow } from "@/lib/invoiceTableRow";

/** Docs/ui_design_guide.md §9/§4 — List/Ledger template for Invoices. */
export function InvoiceTable({ invoices }: { invoices: InvoiceTableRow[] }) {
  const router = useRouter();

  const columns: DataTableColumn<InvoiceTableRow>[] = [
    {
      header: "Invoice #",
      cell: (invoice) => (
        <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
      ),
    },
    { header: "Project", cell: (invoice) => invoice.project.name },
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
        <Badge variant="secondary" className="uppercase">
          {invoice.status}
        </Badge>
      ),
    },
    {
      header: "Total",
      align: "right",
      cell: (invoice) => (
        <span className="font-mono">
          {formatCurrency(invoice.total, "USD")}
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
