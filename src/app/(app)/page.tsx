import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardActionArea } from "@/components/dashboard/DashboardActionArea";
import type { ActionMetric } from "@/components/dashboard/ActionRequiredPanel";
import { ProjectBillingStatusTable } from "@/components/dashboard/ProjectBillingStatusTable";
import { UpcomingBillingCard } from "@/components/dashboard/UpcomingBillingCard";
import { ReceivablesAgeingCard } from "@/components/dashboard/ReceivablesAgeingCard";
import {
  DashboardViewToggle,
  type DashboardView,
} from "@/components/dashboard/DashboardViewToggle";
import { PortfolioPulseStats } from "@/components/dashboard/PortfolioPulseStats";
import { FilterChips } from "@/components/shared/FilterChips";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { formatCurrency } from "@/lib/currency";
import {
  buildPriorityFeed,
  countActionableFeedItems,
} from "@/lib/priorityFeed";
import {
  buildProjectBillingRows,
  buildReceivablesAgeing,
  resolveHealthCategory,
  type ProjectBillingRow,
} from "@/lib/projectBillingStatus";

/**
 * Operational dashboard — redesign v3 (ui_redesign_handoff_v3/), superseding
 * the M27/M30 layout. Two explicit decisions made with the user before this
 * rewrite: fired ProjectAlertSchedule data is back on the dashboard again
 * (reversing part of M30's dashboard/global-bell split) as the "Invoices to
 * prepare" metric + action rows, and the Priority Feed's recent-activity
 * rows (invoice sent/paid, project created) are dropped entirely — this feed
 * is action-only now. See Docs/internal/feedback_backlog.md's dashboard-v3
 * section before touching this file.
 *
 * M36-adjacent — a `?view=` toggle (List/Health) ported from the reference
 * prototype: List view is the original layout above, unchanged; Health view
 * (`?view=health`) replaces it with a portfolio-wide stat row, filterable
 * project list, and the upcoming-billing/receivables-ageing sidebar — a
 * different presentation of the same `buildProjectBillingRows` data, not a
 * new data source. See Docs/internal/feedback_backlog.md's dashboard-health
 * section for the full scoping record (deliberately excludes the
 * prototype's "Attention mix" sidebar and colored-dot row styling).
 */
function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function sumUsd(invoices: { currency: string; total: unknown }[]): number {
  return invoices
    .filter((invoice) => invoice.currency === "USD")
    .reduce((sum, invoice) => sum + Number(invoice.total), 0);
}

function todayEyebrow(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date());
}

function resolveView(value: string | undefined): DashboardView {
  return value === "health" ? "health" : "list";
}

type HealthFilterValue = "all" | "needsAttention" | "upcoming" | "healthy";

function resolveHealthFilter(value: string | undefined): HealthFilterValue {
  if (value === "needsAttention" || value === "upcoming" || value === "healthy") {
    return value;
  }
  return "all";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; health?: string }>;
}) {
  const { view: viewParam, health: healthParam } = await searchParams;
  const view = resolveView(viewParam);
  const healthFilter = resolveHealthFilter(healthParam);

  const [
    activeProjects,
    allInvoices,
    overdueInvoices,
    staleDrafts,
    dueSoonInvoices,
    missingPaymentMethodProjects,
    firedAlertSchedules,
  ] = await Promise.all([
    projectService.list({ status: "ACTIVE" }),
    invoiceService.list(),
    invoiceService.listOverdue(),
    invoiceService.listStaleDrafts(),
    invoiceService.listDueSoon(),
    projectService.listMissingPreferredPaymentMethod(),
    projectAlertScheduleService.listFiredAcrossActiveProjects(),
  ]);

  const feed = buildPriorityFeed({
    overdueInvoices,
    dueSoonInvoices,
    staleDrafts,
    missingPaymentMethodProjects,
    firedAlertSchedules,
    activeProjects,
    allInvoices,
  });

  const billingRows = buildProjectBillingRows({
    activeProjects,
    allInvoices,
    overdueInvoices,
    staleDrafts,
    firedAlertSchedules,
    missingPaymentMethodProjects,
    dueSoonInvoices,
  });

  const sentInvoices = allInvoices.filter(
    (invoice) => invoice.status === "SENT",
  );
  const ageing = buildReceivablesAgeing(sentInvoices);

  const lastInvoiceByProjectId = new Map(
    allInvoices
      .slice()
      .sort((a, b) => a.issueDate.getTime() - b.issueDate.getTime())
      .map((invoice) => [invoice.projectId, invoice]),
  );

  const metrics: Record<"prepare" | "draft" | "due" | "overdue", ActionMetric> =
    {
      prepare: {
        count: firedAlertSchedules.length,
        amount: (() => {
          const total = firedAlertSchedules.reduce((sum, schedule) => {
            const last = lastInvoiceByProjectId.get(schedule.project.id);
            return last && last.currency === "USD"
              ? sum + Number(last.total)
              : sum;
          }, 0);
          return total > 0
            ? `${formatCurrency(total, "USD")} expected`
            : undefined;
        })(),
      },
      draft: {
        count: staleDrafts.length,
        amount:
          staleDrafts.length > 0
            ? `${formatCurrency(sumUsd(staleDrafts), "USD")} ready`
            : undefined,
      },
      due: {
        count: dueSoonInvoices.length,
        amount:
          dueSoonInvoices.length > 0
            ? `${formatCurrency(sumUsd(dueSoonInvoices), "USD")} outstanding`
            : undefined,
      },
      overdue: {
        count: overdueInvoices.length,
        amount:
          overdueInvoices.length > 0
            ? `${formatCurrency(sumUsd(overdueInvoices), "USD")} outstanding`
            : undefined,
      },
    };

  const actionableCount = countActionableFeedItems(feed);

  const rowsByCategory: Record<
    Exclude<HealthFilterValue, "all">,
    ProjectBillingRow[]
  > = {
    needsAttention: [],
    upcoming: [],
    healthy: [],
  };
  for (const row of billingRows) {
    rowsByCategory[resolveHealthCategory(row.statusTone)].push(row);
  }
  const filteredRows =
    healthFilter === "all" ? billingRows : rowsByCategory[healthFilter];

  return (
    <>
      <PageHeader
        eyebrow={todayEyebrow()}
        title="Billing dashboard"
        subtitle="See what needs attention across every project."
        action={
          <div className="flex items-center gap-3">
            <DashboardViewToggle active={view} />
            <Button nativeButton={false} render={<Link href="/invoices/new" />}>
              + New Invoice
            </Button>
          </div>
        }
      />

      {view === "list" ? (
        <DashboardActionArea
          items={feed}
          metrics={metrics}
          headline={`${actionableCount} ${pluralize(actionableCount, "billing action", "billing actions")} need review.`}
        />
      ) : (
        <>
          <PortfolioPulseStats rows={billingRows} />
          <div className="mb-4">
            <FilterChips
              options={[
                { value: "all", label: `All projects (${billingRows.length})` },
                {
                  value: "needsAttention",
                  label: `Needs attention (${rowsByCategory.needsAttention.length})`,
                },
                {
                  value: "upcoming",
                  label: `Upcoming (${rowsByCategory.upcoming.length})`,
                },
                {
                  value: "healthy",
                  label: `Healthy (${rowsByCategory.healthy.length})`,
                },
              ]}
              active={healthFilter}
              hrefFor={(value) =>
                value === "all" ? "/?view=health" : `/?view=health&health=${value}`
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
            <ProjectBillingStatusTable rows={filteredRows} />
            <div className="flex flex-col gap-4">
              <UpcomingBillingCard rows={billingRows} />
              <ReceivablesAgeingCard ageing={ageing} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
