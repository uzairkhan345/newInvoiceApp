import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import {
  InvoiceStatusFilter,
  type InvoiceStatusFilterValue,
} from "@/components/invoice/InvoiceStatusFilter";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { toInvoiceTableRow } from "@/lib/invoiceTableRow";

/**
 * Top-level invoices list — every invoice across every project, newest
 * first, filterable by a `?status=` search param driving the chip row
 * (Docs/ui_design_guide.md §4). "Overdue" and "Sent" deliberately overlap:
 * an overdue invoice is still SENT under the hood.
 */

/** Unrecognized/missing `?status=` falls back to "all". */
function resolveFilter(status: string | undefined): InvoiceStatusFilterValue {
  if (
    status === "overdue" ||
    status === "sent" ||
    status === "paid" ||
    status === "draft" ||
    status === "void"
  ) {
    return status;
  }
  return "all";
}

const EMPTY_STATE_COPY: Record<
  InvoiceStatusFilterValue,
  { title: string; description: string }
> = {
  all: {
    title: "No invoices yet",
    description: "Create your first invoice from an existing project.",
  },
  overdue: {
    title: "No overdue invoices",
    description: "Every sent invoice is still within its due date.",
  },
  sent: {
    title: "No sent invoices",
    description: "Invoices appear here once they've been sent.",
  },
  paid: {
    title: "No paid invoices",
    description: "Invoices appear here once they've been marked paid.",
  },
  draft: {
    title: "No draft invoices",
    description: "Invoices appear here while they're still being prepared.",
  },
  void: {
    title: "No void invoices",
    description: "Invoices appear here once they've been voided.",
  },
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; from?: string }>;
}) {
  const { status, from } = await searchParams;
  const filter = resolveFilter(status);
  const cameFromDashboard = from === "dashboard";

  const invoices = await (filter === "overdue"
    ? invoiceService.listOverdue()
    : filter === "sent"
      ? invoiceService.listByStatus("SENT")
      : filter === "paid"
        ? invoiceService.listByStatus("PAID")
        : filter === "draft"
          ? invoiceService.listByStatus("DRAFT")
          : filter === "void"
            ? invoiceService.listByStatus("VOID")
            : invoiceService.list());

  const emptyCopy = EMPTY_STATE_COPY[filter];

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Every invoice across every project, newest first."
        backHref={cameFromDashboard ? "/" : undefined}
        backLabel="Back to Dashboard"
        action={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            + New Invoice
          </Button>
        }
      />
      <InvoiceStatusFilter active={filter} fromDashboard={cameFromDashboard} />
      {invoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={emptyCopy.title}
          description={emptyCopy.description}
          action={
            filter === "all" ? (
              <Button
                nativeButton={false}
                render={<Link href="/invoices/new" />}
              >
                Create your first invoice
              </Button>
            ) : undefined
          }
        />
      ) : (
        <InvoiceTable invoices={invoices.map(toInvoiceTableRow)} />
      )}
    </>
  );
}
