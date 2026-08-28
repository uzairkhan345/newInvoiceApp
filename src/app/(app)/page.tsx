import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { WeeklyActionPlanner } from "@/components/dashboard/WeeklyActionPlanner";
import { Button } from "@/components/ui/button";
import { invoiceService } from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { buildPriorityFeed } from "@/lib/priorityFeed";
import { buildProjectBillingRows } from "@/lib/projectBillingStatus";
import { buildWeeklyActionPlanner } from "@/lib/weeklyActionPlanner";

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
    liveAlertSchedules,
  ] = await Promise.all([
    projectService.list({ status: "ACTIVE" }),
    invoiceService.list(),
    invoiceService.listOverdue(),
    invoiceService.listStaleDrafts(),
    invoiceService.listDueSoon(),
    projectService.listMissingPreferredPaymentMethod(),
    projectAlertScheduleService.listFiredAcrossActiveProjects(),
    projectAlertScheduleService.listLiveAcrossActiveProjects(),
  ]);
  const items = buildPriorityFeed({
    overdueInvoices,
    dueSoonInvoices,
    staleDrafts: allInvoices.filter((invoice) => invoice.status === "DRAFT"),
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
    liveAlertSchedules,
    missingPaymentMethodProjects,
    dueSoonInvoices,
  });
  const actions = buildWeeklyActionPlanner({
    items,
    billingRows,
    activeProjects,
    allInvoices,
  });
  const actionProjectIds = new Set(actions.map((action) => action.projectId));
  const onTrackProjects = billingRows.filter(
    (row) => !actionProjectIds.has(row.projectId),
  );
  return (
    <>
      <PageHeader
        eyebrow={todayEyebrow()}
        title="This week"
        subtitle="The next action required for each project, ordered by urgency."
        action={
          <Button nativeButton={false} render={<Link href="/invoices/new" />}>
            + New Invoice
          </Button>
        }
      />
      <WeeklyActionPlanner
        actions={actions}
        onTrackProjects={onTrackProjects}
      />
    </>
  );
}
