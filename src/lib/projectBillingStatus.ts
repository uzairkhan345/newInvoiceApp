import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { AlertScheduleWithProject } from "@/repositories/projectAlertScheduleRepository";
import { computeDueDate } from "@/lib/invoicePeriod";
import { resolveScheduledDayThisMonth } from "@/lib/alertScheduleFiring";
import { toDateInputValue } from "@/lib/dates";

/**
 * Dashboard "Project billing status"/"Upcoming billing" widgets — pure
 * aggregation over data already fetched for other dashboard sections (all
 * invoices, active projects, fired alert schedules), rather than bespoke
 * Prisma groupBys per widget. Matches the existing lightweight-aggregation
 * style (e.g. buildPriorityFeed).
 */

export type LastInvoiceInfo = {
  total: string;
  currency: string;
  issueDate: Date;
};

/** Most-recently-issued invoice (any status) per project id. */
export function buildLastInvoiceByProjectId(
  allInvoices: InvoiceListItem[],
): Map<string, LastInvoiceInfo> {
  const byProject = new Map<string, LastInvoiceInfo>();
  for (const invoice of allInvoices) {
    const existing = byProject.get(invoice.projectId);
    if (
      !existing ||
      invoice.issueDate.getTime() > existing.issueDate.getTime()
    ) {
      byProject.set(invoice.projectId, {
        total: invoice.total.toString(),
        currency: invoice.currency,
        issueDate: invoice.issueDate,
      });
    }
  }
  return byProject;
}

const BILLING_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  SEMI_MONTHLY: "Semi-monthly",
  MONTHLY: "Monthly",
};

/** Projects with no fixed invoicePeriodType are billed ad hoc — "Milestone" matches the mock's label for this case. */
function billingLabelFor(project: ProjectWithRelations): string {
  if (!project.invoicePeriodType) return "Milestone";
  return BILLING_LABELS[project.invoicePeriodType] ?? "Milestone";
}

export type BillingStatusTone = "overdue" | "prepare" | "draft" | "positive";

/** Shared left-border accent classes for billing-status project cards (ProjectCardGrid, InvoiceProjectPicker). */
export const BILLING_TONE_ACCENT: Record<BillingStatusTone, string> = {
  overdue: "bg-[var(--status-overdue-text)]",
  prepare: "bg-[var(--status-sent-text)]",
  draft: "bg-brand",
  positive: "bg-[var(--status-paid-text)]",
};

/** Shared status-pill classes for billing-status project cards (ProjectCardGrid, InvoiceProjectPicker). */
export const BILLING_TONE_PILL: Record<BillingStatusTone, string> = {
  overdue: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]",
  prepare: "bg-[var(--status-sent-bg)] text-[var(--status-sent-text)]",
  draft: "bg-brand-light text-brand",
  positive: "bg-[var(--status-paid-bg)] text-[var(--status-paid-text)]",
};

export type ProjectBillingRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  billingLabel: string;
  lastInvoiceDate: Date | null;
  lastInvoiceTotal: string | null;
  lastInvoiceCurrency: string | null;
  nextInvoiceDate: Date | null;
  exposureTotal: string;
  exposureCurrency: string;
  exposureCount: number;
  statusLabel: string;
  statusTone: BillingStatusTone;
};

/**
 * Next expected billing trigger for a project. Only derived from a
 * *currently fired* alert schedule (already fetched dashboard-wide) or an
 * invoicePeriodType calc off the last invoice — a project with an
 * active-but-not-yet-due recurring schedule has no cheap "next date" here
 * without an extra per-project query, so it falls through to the
 * invoicePeriodType estimate instead. Accepted scope simplification, not a
 * bug — the schedule itself is still visible/editable on the project page.
 */
function resolveNextInvoiceDate(
  project: ProjectWithRelations,
  firedSchedule: AlertScheduleWithProject | undefined,
  lastInvoice: LastInvoiceInfo | undefined,
  now: Date,
): Date | null {
  if (firedSchedule) {
    const day = resolveScheduledDayThisMonth(firedSchedule.dayOfMonth, now);
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  }
  if (project.invoicePeriodType && lastInvoice) {
    const next = computeDueDate(
      toDateInputValue(lastInvoice.issueDate),
      project.invoicePeriodType,
    );
    const [year, month, day] = next.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  return null;
}

export function buildProjectBillingRows(input: {
  activeProjects: ProjectWithRelations[];
  allInvoices: InvoiceListItem[];
  overdueInvoices: InvoiceListItem[];
  staleDrafts: InvoiceListItem[];
  firedAlertSchedules: AlertScheduleWithProject[];
  now?: Date;
}): ProjectBillingRow[] {
  const now = input.now ?? new Date();
  const lastInvoiceByProjectId = buildLastInvoiceByProjectId(input.allInvoices);
  const overdueByProjectId = new Map<string, InvoiceListItem>();
  for (const invoice of input.overdueInvoices) {
    if (!overdueByProjectId.has(invoice.projectId)) {
      overdueByProjectId.set(invoice.projectId, invoice);
    }
  }
  const staleDraftProjectIds = new Set(
    input.staleDrafts.map((invoice) => invoice.projectId),
  );
  const firedScheduleByProjectId = new Map<string, AlertScheduleWithProject>();
  for (const schedule of input.firedAlertSchedules) {
    if (!firedScheduleByProjectId.has(schedule.project.id)) {
      firedScheduleByProjectId.set(schedule.project.id, schedule);
    }
  }

  return input.activeProjects.map((project) => {
    const lastInvoice = lastInvoiceByProjectId.get(project.id);
    const overdueInvoice = overdueByProjectId.get(project.id);
    const firedSchedule = firedScheduleByProjectId.get(project.id);
    const outstandingInvoices = input.allInvoices.filter(
      (invoice) =>
        invoice.projectId === project.id && invoice.status === "SENT",
    );
    const exposureTotal = outstandingInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.total),
      0,
    );

    let statusLabel = "On track";
    let statusTone: BillingStatusTone = "positive";
    if (overdueInvoice) {
      const days = Math.floor(
        (now.getTime() - overdueInvoice.dueDate.getTime()) /
          (24 * 60 * 60 * 1000),
      );
      statusLabel = `${days} ${days === 1 ? "day" : "days"} overdue`;
      statusTone = "overdue";
    } else if (firedSchedule) {
      statusLabel = "Invoice due";
      statusTone = "prepare";
    } else if (staleDraftProjectIds.has(project.id)) {
      statusLabel = "Review draft";
      statusTone = "draft";
    }

    return {
      projectId: project.id,
      projectName: project.name,
      clientName: project.client.name,
      billingLabel: billingLabelFor(project),
      lastInvoiceDate: lastInvoice?.issueDate ?? null,
      lastInvoiceTotal: lastInvoice?.total ?? null,
      lastInvoiceCurrency: lastInvoice?.currency ?? null,
      nextInvoiceDate: resolveNextInvoiceDate(
        project,
        firedSchedule,
        lastInvoice,
        now,
      ),
      exposureTotal: exposureTotal.toString(),
      exposureCurrency: lastInvoice?.currency ?? project.displayCurrency,
      exposureCount: outstandingInvoices.length,
      statusLabel,
      statusTone,
    };
  });
}

export type AgeingBucket = { label: string; total: string; count: number };

/**
 * Dashboard "Receivables ageing" — outstanding (SENT) invoices bucketed by
 * days past due. USD-only, same M26 convention as sumSubtotalByStatus: a
 * non-USD SINGLE-mode invoice is excluded from this blended total rather
 * than mixed in (no live FX rate to normalize with).
 */
export function buildReceivablesAgeing(
  sentInvoices: InvoiceListItem[],
  now: Date = new Date(),
): { notYetDue: AgeingBucket; dueSoon: AgeingBucket; late: AgeingBucket } {
  const notYetDue: AgeingBucket = {
    label: "Not yet due",
    total: "0",
    count: 0,
  };
  const dueSoon: AgeingBucket = { label: "1–30 days", total: "0", count: 0 };
  const late: AgeingBucket = { label: "31+ days", total: "0", count: 0 };

  let notYetDueSum = 0;
  let dueSoonSum = 0;
  let lateSum = 0;

  for (const invoice of sentInvoices) {
    if (invoice.currency !== "USD") continue;
    const daysPastDue = Math.floor(
      (now.getTime() - invoice.dueDate.getTime()) / (24 * 60 * 60 * 1000),
    );
    const amount = Number(invoice.total);
    if (daysPastDue <= 0) {
      notYetDueSum += amount;
      notYetDue.count += 1;
    } else if (daysPastDue <= 30) {
      dueSoonSum += amount;
      dueSoon.count += 1;
    } else {
      lateSum += amount;
      late.count += 1;
    }
  }

  notYetDue.total = notYetDueSum.toString();
  dueSoon.total = dueSoonSum.toString();
  late.total = lateSum.toString();
  return { notYetDue, dueSoon, late };
}
