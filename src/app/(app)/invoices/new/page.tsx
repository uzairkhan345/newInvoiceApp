import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InvoiceProjectPicker } from "@/components/invoice/InvoiceProjectPicker";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { projectService } from "@/services/projectService";
import { invoiceService } from "@/services/invoiceService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { buildProjectBillingRows } from "@/lib/projectBillingStatus";
import { resolveBackTarget } from "@/lib/backNavigation";

/**
 * Docs/implementation_decisions.md §20 — the mandatory project-picker gate.
 * There is no path to the invoice form that skips picking an existing
 * project first (Story 4.1). Redesign v3 (ui_redesign_handoff_v3
 * screenshots/15-create-invoice-project-picker.jpg): a searchable card
 * grid instead of a plain list, scoped to ACTIVE projects only — an
 * archived project isn't meant to keep receiving new invoices, closing a
 * gap the mockup made obvious rather than reversing a deliberate decision
 * (nothing previously depended on archived projects being invoiceable).
 */
export default async function NewInvoiceProjectPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  const back = resolveBackTarget(returnTo, {
    href: "/invoices",
    label: "Back to Invoices",
  });
  const [
    activeProjects,
    allInvoices,
    overdueInvoices,
    staleDrafts,
    firedAlertSchedules,
    liveAlertSchedules,
  ] = await Promise.all([
    projectService.list({ status: "ACTIVE" }),
    invoiceService.list(),
    invoiceService.listOverdue(),
    invoiceService.listStaleDrafts(),
    projectAlertScheduleService.listFiredAcrossActiveProjects(),
    projectAlertScheduleService.listLiveAcrossActiveProjects(),
  ]);

  // M40 — same schedule-wins-over-invoicePeriodType priority the dashboard
  // uses (M38), so this picker's "Next invoice" preview agrees with it.
  const billingRows = buildProjectBillingRows({
    activeProjects,
    allInvoices,
    overdueInvoices,
    staleDrafts,
    firedAlertSchedules,
    liveAlertSchedules,
  });

  return (
    <>
      <PageHeader
        backHref={back.href}
        backLabel={back.label}
        eyebrow="New draft invoice"
        title="Choose a project"
        subtitle="Project settings provide the client, contractor, payment method, currency and invoice numbering."
      />
      {activeProjects.length === 0 ? (
        <EmptyState
          title="No active projects yet"
          description="Create a project before you can create an invoice."
          action={
            <Button nativeButton={false} render={<Link href="/projects/new" />}>
              Create your first project
            </Button>
          }
        />
      ) : (
        <InvoiceProjectPicker
          projects={activeProjects}
          billingRows={billingRows}
        />
      )}
    </>
  );
}
