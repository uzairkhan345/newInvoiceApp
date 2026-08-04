import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { ProjectDeleteButton } from "@/components/project/ProjectDeleteButton";
import {
  ProjectDetailTabs,
  type ProjectDetailTab,
} from "@/components/project/ProjectDetailTabs";
import { ProjectHealthCards } from "@/components/project/ProjectHealthCards";
import { ProjectSummary } from "@/components/project/ProjectSummary";
import { ProjectRecentActivity } from "@/components/project/ProjectRecentActivity";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import { AlertScheduleList } from "@/components/project-alert-schedule/AlertScheduleList";
import { AddAlertScheduleButton } from "@/components/project-alert-schedule/AddAlertScheduleButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { projectService } from "@/services/projectService";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import { invoiceService } from "@/services/invoiceService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { buildProjectBillingRows } from "@/lib/projectBillingStatus";
import { toInvoiceTableRow } from "@/lib/invoiceTableRow";
import type { PaymentMethod } from "@/generated/prisma/client";

function resolveTab(value: string | undefined): ProjectDetailTab {
  if (value === "invoices" || value === "setup") return value;
  return "overview";
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = resolveTab(tabParam);

  const project = await projectService.getById(id);
  if (!project) {
    notFound();
  }

  const [isDeletable, invoices, alertSchedules] = await Promise.all([
    projectService.isDeletable(id),
    invoiceService.listByProject(id),
    projectAlertScheduleService.listForProjectWithFiringState(id),
  ]);

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle="View project details and invoicing configuration."
        backHref="/projects"
        backLabel="Back to Projects"
        action={
          <ProjectDeleteButton
            projectId={project.id}
            projectName={project.name}
            isDeletable={isDeletable}
          />
        }
      />
      <ProjectDetailTabs
        projectId={project.id}
        active={tab}
        invoicesCount={invoices.length}
      />

      {tab === "overview" ? (
        <OverviewTab projectId={project.id} project={project} />
      ) : tab === "invoices" ? (
        <InvoicesAndAlertsTab
          project={project}
          invoices={invoices}
          alertSchedules={alertSchedules}
        />
      ) : (
        <BillingSetupTab project={project} />
      )}
    </>
  );
}

async function OverviewTab({
  projectId,
  project,
}: {
  projectId: string;
  project: NonNullable<Awaited<ReturnType<typeof projectService.getById>>>;
}) {
  const [recentActivity, alertSchedules] = await Promise.all([
    invoiceService.listRecentActivity(5, projectId),
    projectAlertScheduleService.listForProjectWithFiringState(projectId),
  ]);

  if (project.status !== "ACTIVE") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-[12px] text-muted-foreground">
          This project is archived — billing health isn&rsquo;t tracked for
          archived projects.
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <ProjectSummary project={project} />
          <ProjectRecentActivity invoices={recentActivity} />
        </div>
      </div>
    );
  }

  const [allInvoices, overdueInvoices, staleDrafts, firedAlertSchedules] =
    await Promise.all([
      invoiceService.list(),
      invoiceService.listOverdue(),
      invoiceService.listStaleDrafts(),
      projectAlertScheduleService.listFiredAcrossActiveProjects(),
    ]);

  const [row] = buildProjectBillingRows({
    activeProjects: [project],
    allInvoices,
    overdueInvoices,
    staleDrafts,
    firedAlertSchedules,
  });

  return (
    <div className="flex flex-col gap-4">
      <ProjectHealthCards
        projectId={projectId}
        billingRow={row}
        alertSchedules={alertSchedules}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <ProjectSummary project={project} />
        <ProjectRecentActivity invoices={recentActivity} />
      </div>
    </div>
  );
}

function InvoicesAndAlertsTab({
  project,
  invoices,
  alertSchedules,
}: {
  project: NonNullable<Awaited<ReturnType<typeof projectService.getById>>>;
  invoices: Awaited<ReturnType<typeof invoiceService.listByProject>>;
  alertSchedules: Awaited<
    ReturnType<typeof projectAlertScheduleService.listForProjectWithFiringState>
  >;
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-foreground">Invoices</h2>
        {invoices.length > 0 ? (
          <Button
            variant="outline"
            className="h-8 px-3 text-[12px]"
            nativeButton={false}
            render={<Link href={`/invoices/new/${project.id}`} />}
          >
            <FileText className="h-3.5 w-3.5" />
            Create Invoice
          </Button>
        ) : null}
      </div>
      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Create the first invoice for this project."
          action={
            <Button
              nativeButton={false}
              render={<Link href={`/invoices/new/${project.id}`} />}
            >
              Create Invoice
            </Button>
          }
        />
      ) : (
        <InvoiceTable
          invoices={invoices.map(toInvoiceTableRow)}
          hideProjectColumn
        />
      )}

      <div className="mt-8 mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-foreground">
          Alert Schedules
        </h2>
        {alertSchedules.length > 0 ? (
          <AddAlertScheduleButton projectId={project.id} />
        ) : null}
      </div>
      {alertSchedules.length === 0 ? (
        <EmptyState
          title="No alert schedules yet"
          description="Add a day-of-month reminder for this project."
          action={<AddAlertScheduleButton projectId={project.id} />}
        />
      ) : (
        <AlertScheduleList projectId={project.id} schedules={alertSchedules} />
      )}
    </>
  );
}

async function BillingSetupTab({
  project,
}: {
  project: NonNullable<Awaited<ReturnType<typeof projectService.getById>>>;
}) {
  const parties = await partyService.list();
  const paymentMethodEntries = await Promise.all(
    parties.map(
      async (party) =>
        [party.id, await paymentMethodService.listForParty(party.id)] as const,
    ),
  );
  const paymentMethodsByPartyId: Record<string, PaymentMethod[]> =
    Object.fromEntries(paymentMethodEntries);

  return (
    <ProjectForm
      mode="edit"
      projectId={project.id}
      initialParties={parties}
      initialPaymentMethodsByPartyId={paymentMethodsByPartyId}
      defaultValues={{
        name: project.name,
        abbreviation: project.abbreviation ?? "",
        serviceDescription: project.serviceDescription ?? "",
        clientId: project.clientId,
        contractorId: project.contractorId,
        preferredPaymentMethodId: project.preferredPaymentMethodId ?? "",
        invoiceNumberFormat: project.invoiceNumberFormat,
        invoicePeriodType: project.invoicePeriodType ?? "",
        displayCurrency: project.displayCurrency,
        status: project.status,
      }}
    />
  );
}
