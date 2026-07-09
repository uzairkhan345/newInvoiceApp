import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { toInvoiceTableRow } from "@/lib/invoiceTableRow";

/**
 * Docs/execution_plan.md §16 M5 — DRAFT/SENT/PAID/VOID all listed, no
 * status-change buttons yet (M6). Status renders as a plain, uncolored
 * Badge here deliberately — the 5-variant lifecycle-color StatusBadge
 * component is explicitly M6's job (Docs/execution_plan.md §11).
 */
export default async function InvoicesPage() {
  const invoices = await invoiceService.list();

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
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice from an existing project."
          action={
            <Button nativeButton={false} render={<Link href="/invoices/new" />}>
              Create your first invoice
            </Button>
          }
        />
      ) : (
        <InvoiceTable invoices={invoices.map(toInvoiceTableRow)} />
      )}
    </>
  );
}
