import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import type {
  ProjectBillingRow,
  BillingStatusTone,
} from "@/lib/projectBillingStatus";

const TONE_STYLES: Record<BillingStatusTone, string> = {
  overdue: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]",
  prepare: "bg-[var(--status-sent-bg)] text-[var(--status-sent-text)]",
  draft: "bg-brand-light text-brand",
  positive: "bg-[var(--status-paid-bg)] text-[var(--status-paid-text)]",
};

/**
 * Dashboard "Project billing status" widget (redesign v3) — reuses this
 * app's own dark-header grid-table convention (ProjectTable.tsx/
 * InvoiceTable.tsx) rather than the mockup's plain light-grey header, for
 * visual consistency with the rest of the app.
 */
export function ProjectBillingStatusTable({
  rows,
}: {
  rows: ProjectBillingRow[];
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-[18px]">
        <div>
          <span className="text-[14px] font-normal tracking-[-0.14px] text-foreground">
            Project billing status
          </span>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Billing health across active projects.
          </p>
        </div>
        <Link
          href="/projects?from=dashboard"
          className="text-[11px] font-bold text-brand"
        >
          View all projects →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="bg-nav text-[10px] font-bold tracking-[0.05em] text-nav-muted uppercase">
              <th className="px-5 py-3 font-bold">Project</th>
              <th className="px-3 py-3 font-bold">Billing</th>
              <th className="px-3 py-3 font-bold">Last invoice</th>
              <th className="px-3 py-3 font-bold">Next invoice</th>
              <th className="px-3 py-3 font-bold">Exposure</th>
              <th className="px-5 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-[12px] text-muted-foreground"
                >
                  No active projects yet.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={row.projectId}
                  className={cn(index > 0 && "border-t border-muted")}
                >
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/projects/${row.projectId}`}
                      className="block text-[13px] font-semibold text-foreground hover:text-brand hover:underline"
                    >
                      {row.projectName}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {row.clientName}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-foreground">
                    {row.billingLabel}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-foreground">
                    {row.lastInvoiceDate
                      ? formatDisplayDate(row.lastInvoiceDate)
                      : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-foreground">
                    {row.nextInvoiceDate
                      ? formatDisplayDate(row.nextInvoiceDate)
                      : "Not scheduled"}
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[12px] font-semibold text-foreground">
                    {Number(row.exposureTotal) > 0
                      ? formatCurrency(row.exposureTotal, row.exposureCurrency)
                      : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "inline-block rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap uppercase",
                        TONE_STYLES[row.statusTone],
                      )}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
