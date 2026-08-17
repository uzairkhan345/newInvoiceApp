import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import {
  isDueWithin14Days,
  resolveHealthCategory,
  type DashboardHealthFilter,
} from "@/lib/projectBillingStatus";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

/**
 * Dashboard "Project billing health" view — same 4-stat-card grid shape as
 * PartySummaryStats.tsx/InvoiceSummaryStats.tsx, over data
 * ProjectBillingStatusTable's own rows already carry (no new query). Each
 * card is a real link into the same `?health=` filter the FilterChips below
 * it use, matching List view's clickable metric-card behavior
 * (ActionRequiredPanel) — clicking filters the table to exactly what the
 * card's own number counts, never a looser approximation of it.
 */
export function PortfolioPulseStats({
  rows,
  now = new Date(),
  activeFilter,
}: {
  rows: ProjectBillingRow[];
  now?: Date;
  activeFilter: DashboardHealthFilter;
}) {
  const needsAttentionCount = rows.filter(
    (row) => resolveHealthCategory(row.statusTone) === "needsAttention",
  ).length;
  const datesWithin14DaysCount = rows.filter((row) =>
    isDueWithin14Days(row, now),
  ).length;
  const openExposureUsd = rows.reduce(
    (sum, row) =>
      row.exposureCurrency === "USD" ? sum + Number(row.exposureTotal) : sum,
    0,
  );

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        href="/?view=health"
        active={activeFilter === "all"}
        label="Active projects"
        value={rows.length.toString()}
      />
      <Stat
        href="/?view=health&health=needsAttention"
        active={activeFilter === "needsAttention"}
        label="Need attention"
        value={needsAttentionCount.toString()}
        danger={needsAttentionCount > 0}
      />
      <Stat
        href="/?view=health&health=dueSoon14Days"
        active={activeFilter === "dueSoon14Days"}
        label="Dates in 14 days"
        value={datesWithin14DaysCount.toString()}
      />
      <Stat
        href="/?view=health&health=openExposure"
        active={activeFilter === "openExposure"}
        label="Open exposure"
        value={formatCurrency(openExposureUsd, "USD")}
      />
    </div>
  );
}

function Stat({
  href,
  label,
  value,
  danger = false,
  active = false,
}: {
  href: string;
  label: string;
  value: string;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative block overflow-hidden rounded-xl border p-4 transition-colors",
        active
          ? "border-brand bg-brand-light/20"
          : "border-border bg-card hover:border-brand/40",
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
    </Link>
  );
}
