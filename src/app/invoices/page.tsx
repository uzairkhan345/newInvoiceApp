import Link from "next/link";
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
 * Docs/execution_plan.md §16 M5 — DRAFT/SENT/PAID/VOID all listed, no
 * status-change buttons yet (M6). Status renders as a plain, uncolored
 * Badge here deliberately — the 5-variant lifecycle-color StatusBadge
 * component is explicitly M6's job (Docs/execution_plan.md §11).
 */

/** Docs/feedback_backlog.md M24 — unrecognized/missing `?status=` falls back to "all". */
function resolveFilter(status: string | undefined): InvoiceStatusFilterValue {
  if (
    status === "overdue" ||
    status === "sent" ||
    status === "paid" ||
    status === "draft"
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
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = resolveFilter(status);

  const invoices = await (filter === "overdue"
    ? invoiceService.listOverdue()
    : filter === "sent"
      ? invoiceService.listByStatus("SENT")
      : filter === "paid"
        ? invoiceService.listByStatus("PAID")
        : filter === "draft"
          ? invoiceService.listByStatus("DRAFT")
          : invoiceService.list());

  const emptyCopy = EMPTY_STATE_COPY[filter];

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Every invoice across every project, newest first."
        action={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            Create Invoice
          </Button>
        }
      />
      <InvoiceStatusFilter active={filter} />
      {invoices.length === 0 ? (
        <EmptyState
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
