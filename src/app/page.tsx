import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AlertBanner,
  type AlertBannerChip,
} from "@/components/dashboard/AlertBanner";
import {
  ActionRequiredPanel,
  type ActionMetric,
} from "@/components/dashboard/ActionRequiredPanel";
import { ProjectBillingStatusTable } from "@/components/dashboard/ProjectBillingStatusTable";
import { UpcomingBillingCard } from "@/components/dashboard/UpcomingBillingCard";
import { ReceivablesAgeingCard } from "@/components/dashboard/ReceivablesAgeingCard";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { formatCurrency } from "@/lib/currency";
import {
  buildPriorityFeed,
  countActionableFeedItems,
} from "@/lib/priorityFeed";
import { DUE_SOON_WITHIN_DAYS } from "@/lib/dashboardTrend";
import {
  buildProjectBillingRows,
  buildReceivablesAgeing,
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

export default async function DashboardPage() {
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
  const alertChips: AlertBannerChip[] = [];
  if (overdueInvoices.length > 0) {
    alertChips.push({
      label: `${overdueInvoices.length} ${pluralize(overdueInvoices.length, "invoice")} overdue — ${formatCurrency(sumUsd(overdueInvoices), "USD")}`,
      href: "/invoices?status=overdue&from=dashboard",
    });
  }
  if (firedAlertSchedules.length > 0) {
    alertChips.push({
      label: `${firedAlertSchedules.length} ${pluralize(firedAlertSchedules.length, "invoice")} need${firedAlertSchedules.length === 1 ? "s" : ""} to be prepared`,
      href: "/projects?from=dashboard",
    });
  }
  if (staleDrafts.length > 0) {
    alertChips.push({
      label: `${staleDrafts.length} ${pluralize(staleDrafts.length, "draft")} awaiting review`,
      href: "/invoices?status=draft&from=dashboard",
    });
  }
  if (dueSoonInvoices.length > 0) {
    alertChips.push({
      label: `${dueSoonInvoices.length} ${pluralize(dueSoonInvoices.length, "invoice")} due within ${DUE_SOON_WITHIN_DAYS} days`,
      href: "/invoices?status=sent&from=dashboard",
    });
  }
  if (missingPaymentMethodProjects.length > 0) {
    alertChips.push({
      label: `${missingPaymentMethodProjects.length} ${pluralize(missingPaymentMethodProjects.length, "project")} missing payment method`,
      href: "/projects?from=dashboard",
    });
  }

  return (
    <>
      <PageHeader
        eyebrow={todayEyebrow()}
        title="Billing dashboard"
        subtitle="See what needs attention across every project."
        action={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            + New Invoice
          </Button>
        }
      />

      {alertChips.length > 0 ? (
        <AlertBanner
          headline={`${actionableCount} ${pluralize(actionableCount, "billing action", "billing actions")} need review.`}
          chips={alertChips}
        />
      ) : null}

      <ActionRequiredPanel items={feed} metrics={metrics} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <ProjectBillingStatusTable rows={billingRows} />
        <div className="flex flex-col gap-4">
          <UpcomingBillingCard rows={billingRows} />
          <ReceivablesAgeingCard ageing={ageing} />
        </div>
      </div>
    </>
  );
}
