import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { resolveHealthCategory } from "@/lib/projectBillingStatus";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Dashboard "Project billing health" view — same 4-stat-card grid shape as
 * PartySummaryStats.tsx/InvoiceSummaryStats.tsx, over data
 * ProjectBillingStatusTable's own rows already carry (no new query).
 */
export function PortfolioPulseStats({
  rows,
  now = new Date(),
}: {
  rows: ProjectBillingRow[];
  now?: Date;
}) {
  const needsAttentionCount = rows.filter(
    (row) => resolveHealthCategory(row.statusTone) === "needsAttention",
  ).length;
  const datesWithin14DaysCount = rows.filter(
    (row) =>
      row.nextInvoiceDate !== null &&
      row.nextInvoiceDate.getTime() >= now.getTime() &&
      row.nextInvoiceDate.getTime() <= now.getTime() + FOURTEEN_DAYS_MS,
  ).length;
  const openExposureUsd = rows.reduce(
    (sum, row) =>
      row.exposureCurrency === "USD" ? sum + Number(row.exposureTotal) : sum,
    0,
  );

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Active projects" value={rows.length.toString()} />
      <Stat
        label="Need attention"
        value={needsAttentionCount.toString()}
        danger={needsAttentionCount > 0}
      />
      <Stat
        label="Dates in 14 days"
        value={datesWithin14DaysCount.toString()}
      />
      <Stat
        label="Open exposure"
        value={formatCurrency(openExposureUsd, "USD")}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4",
        danger &&
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--status-overdue-text)]",
      )}
    >
      <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div
        className={cn(
          "mt-2 font-mono text-xl font-bold text-foreground",
          danger && "text-[var(--status-overdue-text)]",
        )}
      >
        {value}
      </div>
    </div>
  );
}
