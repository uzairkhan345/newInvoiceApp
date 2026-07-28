import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/layout/StatsCard";
import { AlertBanner, type AlertBannerChip } from "@/components/dashboard/AlertBanner";
import { PriorityFeed } from "@/components/dashboard/PriorityFeed";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { formatCurrency } from "@/lib/currency";
import { buildPriorityFeed, countActionableFeedItems } from "@/lib/priorityFeed";
import { daysSince } from "@/lib/dashboardTrend";

/**
 * Operational dashboard — M27 v2 redesign (design_handoff_dashboard_v2/README.md
 * §2, Docs/ui_design_guide.md §16), superseding the original M10 layout. Counts
 * only in the stats row (no revenue framing); VOID is excluded from every
 * count/total by construction (never queried for here). The primary
 * "Sent/Unpaid" dollar figure is USD-only by construction (Docs/feedback_backlog.md
 * M26) — a non-USD SINGLE-currency invoice is never blended into it, since
 * this app has no live/stored FX rate to normalize with; it instead gets its
 * own same-currency breakdown line below the primary figure. Stat-card trends/
 * sparklines are best-effort approximations (no history/audit table exists) —
 * see `src/lib/dashboardTrend.ts`.
 */
const RECENT_ACTIVITY_LIMIT = 8;

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export default async function DashboardPage() {
  const [
    draftCount,
    sentCount,
    activeProjectCount,
    sentOutstanding,
    sentOutstandingByNonUsdCurrency,
    overdueInvoices,
    staleDrafts,
    missingPaymentMethodProjects,
    recentInvoiceActivity,
    recentProjects,
    activeProjectsTrend,
    draftInvoicesTrend,
    sentUnpaidTrend,
  ] = await Promise.all([
    invoiceService.countByStatus("DRAFT"),
    invoiceService.countByStatus("SENT"),
    projectService.countActive(),
    invoiceService.sumSubtotalByStatus("SENT"),
    invoiceService.sumSubtotalByStatusGroupedByNonUsdCurrency("SENT"),
    invoiceService.listOverdue(),
    invoiceService.listStaleDrafts(),
    projectService.listMissingPreferredPaymentMethod(),
    invoiceService.listRecentActivity(RECENT_ACTIVITY_LIMIT),
    projectService.listRecentlyCreated(RECENT_ACTIVITY_LIMIT),
    projectService.getActiveProjectsTrend(),
    invoiceService.getDraftInvoicesTrend(),
    invoiceService.getSentUnpaidTrend(),
  ]);
  const overdueTrend = await invoiceService.getOverdueTrend(overdueInvoices);

  const feed = buildPriorityFeed({
    overdueInvoices,
    missingPaymentMethodProjects,
    staleDrafts,
    recentInvoiceActivity,
    recentProjects,
    activityLimit: RECENT_ACTIVITY_LIMIT,
  });

  const actionableCount = countActionableFeedItems(feed);
  const alertChips: AlertBannerChip[] = [];
  if (overdueInvoices.length > 0) {
    const overdueUsdTotal = overdueInvoices
      .filter((invoice) => invoice.currency === "USD")
      .reduce((sum, invoice) => sum + Number(invoice.total), 0);
    alertChips.push({
      label: `${overdueInvoices.length} ${pluralize(overdueInvoices.length, "invoice")} overdue — ${formatCurrency(overdueUsdTotal, "USD")}`,
      href: "/invoices?status=overdue&from=dashboard",
    });
  }
  if (missingPaymentMethodProjects.length > 0) {
    alertChips.push({
      label: `${missingPaymentMethodProjects.length} ${pluralize(missingPaymentMethodProjects.length, "project")} missing payment method`,
      href: "/projects?from=dashboard",
    });
  }
  if (staleDrafts.length > 0) {
    const oldestStaleDays = daysSince(staleDrafts[0].createdAt);
    alertChips.push({
      label: `${staleDrafts.length} ${pluralize(staleDrafts.length, "draft")} stalled ${oldestStaleDays}${staleDrafts.length > 1 ? "+" : ""} days`,
      href: "/invoices?status=draft&from=dashboard",
    });
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Operational overview across every project and invoice."
        action={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            + New Invoice
          </Button>
        }
      />

      {alertChips.length > 0 ? (
        <AlertBanner
          headline={`${actionableCount} ${pluralize(actionableCount, "item")} need review before month-end.`}
          chips={alertChips}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Active Projects"
          value={activeProjectCount}
          href="/projects?from=dashboard"
          trend={{ ...activeProjectsTrend, semantics: "higher-is-better" }}
        />
        <StatsCard
          label="Draft Invoices"
          value={draftCount}
          href="/invoices?status=draft&from=dashboard"
          trend={{ ...draftInvoicesTrend, semantics: "neutral" }}
        />
        <StatsCard
          label="Sent / Unpaid"
          value={sentCount}
          href="/invoices?status=sent&from=dashboard"
          trend={{ ...sentUnpaidTrend, semantics: "higher-is-better" }}
          subtext={
            <>
              <div>
                {formatCurrency(sentOutstanding.toString(), "USD")} outstanding
              </div>
              {/* Docs/feedback_backlog.md M26 — non-USD SINGLE-mode invoices are
                  excluded from the USD sum above (blending currencies would be
                  wrong); each currency actually present gets its own line here
                  instead of being silently dropped. */}
              {sentOutstandingByNonUsdCurrency.map(({ currency, total }) => (
                <div key={currency}>
                  + {formatCurrency(total.toString(), currency)} outstanding
                </div>
              ))}
            </>
          }
        />
        <StatsCard
          label="Overdue Invoices"
          value={overdueInvoices.length}
          href="/invoices?status=overdue&from=dashboard"
          trend={{ ...overdueTrend, semantics: "lower-is-better" }}
        />
      </div>

      <div className="mt-6">
        <PriorityFeed items={feed} />
      </div>
    </>
  );
}
