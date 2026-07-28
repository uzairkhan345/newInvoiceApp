import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { InvoiceTableRow } from "@/lib/invoiceTableRow";

/**
 * Invoices list — M27 v2 redesign (design_handoff_dashboard_v2/README.md §3,
 * Docs/ui_design_guide.md §4). Two independent layouts, not one table that
 * squeezes: a dark-header grid table at `≥1024px`, replaced entirely by
 * stacked cards below that — same breakpoint the nav shell uses. Deliberately
 * bespoke markup (not the shared `DataTable`/`ui/table.tsx` primitives used
 * elsewhere) since this treatment is scoped to Invoices/Projects only — the
 * Parties list is explicitly unaffected by this redesign.
 */
const DESKTOP_GRID_WITH_PROJECT =
  "grid-cols-[1.1fr_1.3fr_1.3fr_0.9fr_0.9fr_0.9fr_28px]";
const DESKTOP_GRID_WITHOUT_PROJECT =
  "grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.9fr_28px]";

export function InvoiceTable({
  invoices,
  hideProjectColumn,
}: {
  invoices: InvoiceTableRow[];
  /** M19.3a — the Project column/line is redundant when this table is already scoped to one project. */
  hideProjectColumn?: boolean;
}) {
  const gridCols = hideProjectColumn
    ? DESKTOP_GRID_WITHOUT_PROJECT
    : DESKTOP_GRID_WITH_PROJECT;

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-border lg:block">
        <div
          className={cn(
            "grid items-center gap-3 bg-nav px-5 py-3.5 text-[11px] font-bold tracking-[0.05em] text-nav-muted uppercase",
            gridCols,
          )}
        >
          <span>Invoice</span>
          <span>Client</span>
          {hideProjectColumn ? null : <span>Project</span>}
          <span>Amount</span>
          <span>Due</span>
          <span>Status</span>
          <span />
        </div>
        {invoices.map((invoice, index) => (
          <Link
            key={invoice.id}
            href={`/invoices/${invoice.id}`}
            className={cn(
              "grid items-center gap-3 px-5 py-3.5 hover:bg-muted/40",
              gridCols,
              index > 0 && "border-t border-muted",
            )}
          >
            <span className="truncate font-mono text-[13px] font-semibold text-foreground">
              {invoice.invoiceNumber}
            </span>
            <span className="truncate text-[13px] text-foreground">
              {invoice.project.client.name}
            </span>
            {hideProjectColumn ? null : (
              <span className="truncate text-[13px] text-muted-foreground">
                {invoice.project.name}
              </span>
            )}
            <span className="truncate font-mono text-[13px] text-foreground">
              {formatCurrency(invoice.total, invoice.currency)}
            </span>
            <span className="truncate text-[13px] text-muted-foreground">
              {formatDisplayDate(invoice.dueDate)}
            </span>
            <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--border-heavy)]" />
          </Link>
        ))}
      </div>

      {/* Mobile stacked cards */}
      <div className="flex flex-col gap-3 lg:hidden">
        {invoices.map((invoice) => (
          <Link
            key={invoice.id}
            href={`/invoices/${invoice.id}`}
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[13px] font-bold text-foreground">
                {invoice.invoiceNumber}
              </span>
              <StatusBadge status={invoice.status} dueDate={invoice.dueDate} />
            </div>
            <span className="text-[13px] font-semibold text-foreground">
              {invoice.project.client.name}
            </span>
            {hideProjectColumn ? null : (
              <span className="text-[12px] text-muted-foreground">
                {invoice.project.name}
              </span>
            )}
            <div className="mt-1 flex items-center justify-between border-t border-muted pt-2">
              <span className="text-[12px] text-muted-foreground">
                {formatDisplayDate(invoice.dueDate)}
              </span>
              <span className="font-mono text-[13px] font-bold text-foreground">
                {formatCurrency(invoice.total, invoice.currency)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
