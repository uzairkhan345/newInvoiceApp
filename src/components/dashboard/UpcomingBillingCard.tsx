import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

const MONTH_LABELS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** Next N upcoming billing dates across active projects — reuses the same per-project billing rows the status table builds. */
export function UpcomingBillingCard({ rows }: { rows: ProjectBillingRow[] }) {
  const upcoming = rows
    .filter((row) => row.nextInvoiceDate !== null)
    .sort((a, b) => a.nextInvoiceDate!.getTime() - b.nextInvoiceDate!.getTime())
    .slice(0, 3);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="border-b border-border px-5 py-[14px]">
        <span className="text-[13px] font-bold text-foreground">
          Upcoming billing
        </span>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Next 14 days</p>
      </div>
      {upcoming.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12px] text-muted-foreground">
          Nothing scheduled.
        </div>
      ) : (
        upcoming.map((row, index) => (
          <div
            key={row.projectId}
            className={`flex items-center gap-3 px-5 py-3 ${index > 0 ? "border-t border-muted" : ""}`}
          >
            <div className="flex w-9 shrink-0 flex-col items-center text-[9px] font-bold text-muted-foreground">
              <span className="font-mono text-[15px] font-bold text-foreground">
                {row.nextInvoiceDate!.getUTCDate()}
              </span>
              {MONTH_LABELS[row.nextInvoiceDate!.getUTCMonth()]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-foreground">
                {row.projectName}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {row.billingLabel}
              </p>
            </div>
            {row.lastInvoiceTotal ? (
              <span className="shrink-0 font-mono text-[12px] font-semibold text-foreground">
                {formatCurrency(row.lastInvoiceTotal, row.lastInvoiceCurrency!)}
              </span>
            ) : null}
          </div>
        ))
      )}
    </Card>
  );
}
