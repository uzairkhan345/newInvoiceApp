import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProjectForm } from "@/components/project/ProjectForm";
import { ProjectDetailCard } from "@/components/project/ProjectDetailCard";
import { ProjectDeleteButton } from "@/components/project/ProjectDeleteButton";
import {
  ProjectDetailTabs,
  type ProjectDetailTab,
} from "@/components/project/ProjectDetailTabs";
import { ProjectHealthCards } from "@/components/project/ProjectHealthCards";
import { ProjectSummary } from "@/components/project/ProjectSummary";
import { ProjectRecentActivity } from "@/components/project/ProjectRecentActivity";
import { ProjectStatusPill } from "@/components/project/ProjectStatusPill";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import { InvoiceSortToggle } from "@/components/invoice/InvoiceSortToggle";
import { AlertScheduleList } from "@/components/project-alert-schedule/AlertScheduleList";
import { AddAlertScheduleButton } from "@/components/project-alert-schedule/AddAlertScheduleButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { FileText, Pencil } from "lucide-react";
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

function resolveSort(value: string | undefined): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; edit?: string; sort?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam, edit, sort: sortParam } = await searchParams;
  const tab = resolveTab(tabParam);
  const isEditingSetup = tab === "setup" && edit === "1";
  const sort = resolveSort(sortParam);

  const project = await projectService.getById(id);
  if (!project) {
    notFound();
  }

  const [isDeletable, invoices, alertSchedules] = await Promise.all([
    projectService.isDeletable(id),
    invoiceService.listByProject(id, sort),
    projectAlertScheduleService.listForProjectWithFiringState(id),
  ]);

  return (
    <>
      <PageHeader
        title={
          <>
            {project.name}
            <ProjectStatusPill status={project.status} />
          </>
        }
        subtitle="View project details and invoicing configuration."
        backHref="/projects"
        backLabel="Back to Projects"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/projects/${project.id}?tab=setup&edit=1`} />
              }
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit project
            </Button>
            <Button
              nativeButton={false}
              render={<Link href={`/invoices/new/${project.id}`} />}
            >
              <FileText className="h-3.5 w-3.5" />
              Create invoice
            </Button>
            <ProjectDeleteButton
              projectId={project.id}
              projectName={project.name}
              isDeletable={isDeletable}
            />
          </div>
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
          sort={sort}
        />
      ) : (
        <BillingSetupTab project={project} isEditing={isEditingSetup} />
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

  const [
    allInvoices,
    overdueInvoices,
    staleDrafts,
    firedAlertSchedules,
    liveAlertSchedules,
  ] = await Promise.all([
    invoiceService.list(),
    invoiceService.listOverdue(),
    invoiceService.listStaleDrafts(),
    projectAlertScheduleService.listFiredAcrossActiveProjects(),
    projectAlertScheduleService.listLiveAcrossActiveProjects(),
  ]);

  // M39-adjacent — same schedule-wins-over-invoicePeriodType priority the
  // dashboard uses (M38), now applied here too so "Next billing" agrees
  // with the dashboard's own Project billing status table for this project.
  const [row] = buildProjectBillingRows({
    activeProjects: [project],
    allInvoices,
    overdueInvoices,
    staleDrafts,
    firedAlertSchedules,
    liveAlertSchedules,
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
  sort,
}: {
  project: NonNullable<Awaited<ReturnType<typeof projectService.getById>>>;
  invoices: Awaited<ReturnType<typeof invoiceService.listByProject>>;
  alertSchedules: Awaited<
    ReturnType<typeof projectAlertScheduleService.listForProjectWithFiringState>
  >;
  sort: "asc" | "desc";
}) {
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-normal tracking-[-0.14px] text-foreground">
            Invoices
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Invoices created for {project.name}, ordered by invoice number.
          </p>
        </div>
        {invoices.length > 0 ? (
          <div className="flex items-center gap-2">
            <InvoiceSortToggle projectId={project.id} sort={sort} />
            <Button
              variant="outline"
              className="h-8 px-3 text-[12px]"
              nativeButton={false}
              render={<Link href={`/invoices/new/${project.id}`} />}
            >
              <FileText className="h-3.5 w-3.5" />
              Create Invoice
            </Button>
          </div>
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
        <div>
          <h2 className="text-[14px] font-normal tracking-[-0.14px] text-foreground">
            Alert Schedules
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Recurring reminders for this project&apos;s billing schedule.
          </p>
        </div>
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
  isEditing,
}: {
  project: NonNullable<Awaited<ReturnType<typeof projectService.getById>>>;
  isEditing: boolean;
}) {
  if (!isEditing) {
    const nextInvoiceNumber = await invoiceService.previewNextInvoiceNumber(
      project.id,
    );
    return (
      <ProjectDetailCard
        project={project}
        editHref={`/projects/${project.id}?tab=setup&edit=1`}
        nextInvoiceNumber={nextInvoiceNumber}
      />
    );
  }

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
    <>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-normal tracking-[-0.14px] text-foreground">
            Edit billing setup
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Update {project.name}&rsquo;s invoicing configuration.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-8 px-3 text-[12px]"
          nativeButton={false}
          render={<Link href={`/projects/${project.id}?tab=setup`} />}
        >
          Cancel
        </Button>
      </div>
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
    </>
  );
}
