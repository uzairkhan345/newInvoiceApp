import Link from "next/link";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate, formatShortDate } from "@/lib/dates";
import { resolveNextOccurrence } from "@/lib/alertScheduleFiring";
import { withReturnTo } from "@/lib/backNavigation";
import { cn } from "@/lib/utils";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";
import type { ProjectAlertScheduleWithFiringState } from "@/services/projectAlertScheduleService";

const TONE_TEXT: Record<ProjectBillingRow["statusTone"], string> = {
  overdue: "text-[var(--status-overdue-text)]",
  prepare: "text-[var(--status-sent-text)]",
  draft: "text-brand",
  setupIncomplete: "text-[var(--status-sent-text)]",
  upcoming: "text-[var(--status-upcoming-text)]",
  positive: "text-[var(--status-paid-text)]",
};

function nextOccurrenceOf(
  schedules: ProjectAlertScheduleWithFiringState[],
): { date: Date; schedule: ProjectAlertScheduleWithFiringState } | null {
  let best: {
    date: Date;
    schedule: ProjectAlertScheduleWithFiringState;
  } | null = null;
  for (const schedule of schedules) {
    const date = resolveNextOccurrence(schedule);
    if (!date) continue;
    if (!best || date.getTime() < best.date.getTime())
      best = { date, schedule };
  }
  return best;
}

/**
 * Project detail Overview tab's 4 mini health cards (ui_redesign_handoff_v3
 * screenshots/10-project-detail-overview.jpg) — Next billing/Outstanding/
 * Billing health reuse the same per-project billing row the dashboard's
 * status table computes; Next alert is the soonest upcoming
 * ProjectAlertSchedule occurrence, independent of that row.
 */
export function ProjectHealthCards({
  projectId,
  billingRow,
  alertSchedules,
  returnTo,
}: {
  projectId: string;
  billingRow: ProjectBillingRow;
  alertSchedules: ProjectAlertScheduleWithFiringState[];
  returnTo?: string;
}) {
  const nextAlert = nextOccurrenceOf(alertSchedules);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <HealthCard
        label="Next billing"
        value={
          billingRow.nextInvoiceDate
            ? formatDisplayDate(billingRow.nextInvoiceDate)
            : "Not scheduled"
        }
        subtext={`${billingRow.billingLabel}${billingRow.lastInvoiceTotal ? ` · ${formatCurrency(billingRow.lastInvoiceTotal, billingRow.lastInvoiceCurrency!)} expected` : ""}`}
        actionLabel="Prepare invoice →"
        actionHref={withReturnTo(
          `/invoices/new/${projectId}`,
          withReturnTo(`/projects/${projectId}`, returnTo),
        )}
        highlight
      />
      <HealthCard
        label="Outstanding"
        value={
          billingRow.exposureCount > 0
            ? formatCurrency(
                billingRow.exposureTotal,
                billingRow.exposureCurrency,
              )
            : "—"
        }
        subtext={
          billingRow.exposureCount > 0
            ? `${billingRow.exposureCount} ${billingRow.exposureCount === 1 ? "invoice" : "invoices"} awaiting payment`
            : "Nothing awaiting payment"
        }
        actionLabel={
          billingRow.exposureCount > 0 ? "View invoice →" : undefined
        }
        actionHref={`/projects/${projectId}?tab=invoices`}
      />
      <HealthCard
        label="Billing health"
        value={billingRow.statusLabel}
        valueClassName={TONE_TEXT[billingRow.statusTone]}
        subtext={
          billingRow.lastCoveredPeriod
            ? `Last billed ${formatShortDate(billingRow.lastCoveredPeriod.start)} – ${formatShortDate(billingRow.lastCoveredPeriod.end)}.`
            : "No billed period recorded."
        }
        actionLabel="View history →"
        actionHref={`/projects/${projectId}?tab=invoices`}
      />
      <HealthCard
        label="Next alert"
        value={
          nextAlert ? formatDisplayDate(nextAlert.date) : "None configured"
        }
        subtext={
          nextAlert
            ? nextAlert.schedule.label ||
              (nextAlert.schedule.recurring
                ? "Recurring reminder"
                : "One-time reminder")
            : "Add a day-of-month reminder"
        }
        actionLabel="Manage alerts →"
        actionHref={`/projects/${projectId}?tab=invoices`}
      />
    </div>
  );
}

function HealthCard({
  label,
  value,
  valueClassName,
  subtext,
  actionLabel,
  actionHref,
  highlight = false,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  subtext: string;
  actionLabel?: string;
  actionHref: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-4",
        highlight
          ? "border-brand-light bg-gradient-to-br from-card to-brand-light/30"
          : "border-border bg-card",
      )}
    >
      <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn("mt-2 text-lg font-bold text-foreground", valueClassName)}
      >
        {value}
      </span>
      <span className="mt-1 min-h-[28px] text-[11px] text-muted-foreground">
        {subtext}
      </span>
      {actionLabel ? (
        <Link
          href={actionHref}
          className="mt-1 text-[11px] font-bold text-brand hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
