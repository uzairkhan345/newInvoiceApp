import { Briefcase, FileEdit, Send, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatsCard } from "@/components/layout/StatsCard";
import {
  NeedsAttentionList,
  type NeedsAttentionItem,
} from "@/components/dashboard/NeedsAttentionList";
import {
  ActivityLog,
  type ActivityItem,
} from "@/components/dashboard/ActivityLog";
import { invoiceService } from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";

/**
 * Operational dashboard (M10) — Docs/execution_plan.md §16 M10,
 * Docs/ui_design_guide.md §16, Docs/mvp_user_stories.md Epic 8. Counts only
 * in the stats row (no revenue framing); VOID is excluded from every
 * count/total by construction (never queried for here). The primary
 * "Sent/Unpaid" dollar figure is USD-only by construction (Docs/feedback_backlog.md
 * M26) — a non-USD SINGLE-currency invoice is never blended into it, since
 * this app has no live/stored FX rate to normalize with; it instead gets its
 * own same-currency breakdown line below the primary figure.
 */
const RECENT_ACTIVITY_LIMIT = 8;

const ACTIVITY_VERBS: Partial<Record<string, string>> = {
  SENT: "sent",
  PAID: "marked paid",
  VOID: "voided",
};

export default async function DashboardPage() {
  const [
    draftCount,
    sentCount,
    activeProjectCount,
    sentOutstanding,
    sentOutstandingByNonUsdCurrency,
    overdueInvoices,
    draftInvoices,
    missingPaymentMethodProjects,
    recentInvoiceActivity,
    recentProjects,
  ] = await Promise.all([
    invoiceService.countByStatus("DRAFT"),
    invoiceService.countByStatus("SENT"),
    projectService.countActive(),
    invoiceService.sumSubtotalByStatus("SENT"),
    invoiceService.sumSubtotalByStatusGroupedByNonUsdCurrency("SENT"),
    invoiceService.listOverdue(),
    invoiceService.listByStatus("DRAFT"),
    projectService.listMissingPreferredPaymentMethod(),
    invoiceService.listRecentActivity(RECENT_ACTIVITY_LIMIT),
    projectService.listRecentlyCreated(RECENT_ACTIVITY_LIMIT),
  ]);

  const needsAttention: NeedsAttentionItem[] = [
    ...overdueInvoices.map((invoice) => ({
      id: `overdue-${invoice.id}`,
      href: `/invoices/${invoice.id}`,
      title: `${invoice.invoiceNumber} — ${invoice.project.client.name}`,
      detail: `${invoice.project.name} · due ${formatDisplayDate(invoice.dueDate)}`,
      tag: "Overdue" as const,
    })),
    ...draftInvoices.map((invoice) => ({
      id: `draft-${invoice.id}`,
      href: `/invoices/${invoice.id}`,
      title: `${invoice.invoiceNumber} — ${invoice.project.client.name}`,
      detail: `${invoice.project.name} · awaiting review`,
      tag: "Draft" as const,
    })),
    ...missingPaymentMethodProjects.map((project) => ({
      id: `payment-method-${project.id}`,
      href: `/projects/${project.id}`,
      title: project.name,
      detail: "No preferred payment method set",
      tag: "No payment method" as const,
    })),
  ];

  const activity: ActivityItem[] = [
    ...recentInvoiceActivity.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      href: `/invoices/${invoice.id}`,
      message: `Invoice ${invoice.invoiceNumber} ${ACTIVITY_VERBS[invoice.status] ?? invoice.status.toLowerCase()}`,
      timestamp: invoice.updatedAt,
    })),
    ...recentProjects.map((project) => ({
      id: `project-${project.id}`,
      href: `/projects/${project.id}`,
      message: `Project ${project.name} created`,
      timestamp: project.createdAt,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Operational overview across every project and invoice."
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Active Projects"
          value={activeProjectCount}
          icon={Briefcase}
          href="/projects?from=dashboard"
        />
        <StatsCard
          label="Draft Invoices"
          value={draftCount}
          icon={FileEdit}
          href="/invoices?status=draft&from=dashboard"
        />
        <StatsCard
          label="Sent / Unpaid"
          value={sentCount}
          icon={Send}
          href="/invoices?status=sent&from=dashboard"
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
          icon={AlertTriangle}
          href="/invoices?status=overdue&from=dashboard"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <NeedsAttentionList items={needsAttention} />
        <ActivityLog items={activity} />
      </div>
    </>
  );
}
