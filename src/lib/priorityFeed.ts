import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { AlertScheduleWithProject } from "@/repositories/projectAlertScheduleRepository";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import {
  isSendInvoiceSchedule,
  resolveScheduledDayThisMonth,
} from "@/lib/alertScheduleFiring";
import { buildLastInvoiceByProjectId } from "@/lib/projectBillingStatus";

/**
 * Dashboard Action Required panel (redesign v3, ui_redesign_handoff_v3/) —
 * one action-only list, urgency-tiered to match the mockup's
 * Critical/High/Upcoming pills. Supersedes the M27 merged
 * action-items+recent-activity feed: recent-activity rows are dropped
 * entirely per an explicit user decision (the mockup has no equivalent), and
 * fired ProjectAlertSchedule data is surfaced here again (as "prepare") per
 * another explicit user decision reversing part of M30's dashboard/bell
 * split — see Docs/internal/feedback_backlog.md's dashboard-v3 section.
 */
export type PriorityFeedCategory =
  "overdue" | "prepare" | "draft" | "due" | "setup";
export type PriorityFeedTier = "Critical" | "High" | "Upcoming";
export type PriorityFeedBarTone =
  "overdue" | "prepare" | "draft" | "due" | "setup";

export type PriorityFeedAction = {
  label: string;
  href?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type PriorityFeedItem = {
  id: string;
  category: PriorityFeedCategory;
  tier: PriorityFeedTier;
  barTone: PriorityFeedBarTone;
  projectId: string;
  projectName: string;
  clientName: string;
  issue: string;
  note?: string;
  amount?: string;
  timing?: string;
  timingDanger?: boolean;
  secondaryLink?: { label: string; href: string };
  action: PriorityFeedAction;
};

/** No email-sending infrastructure exists anywhere in this app (checked: no nodemailer/SendGrid/Resend/SMTP client) — render disabled rather than fake a working send, per ui_redesign_handoff_v3/docs/ROUTE_ACTION_MAP.md. */
const NO_EMAIL_SENDING_REASON = "Sending reminder emails isn't set up yet.";

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildPriorityFeed(input: {
  overdueInvoices: InvoiceListItem[];
  dueSoonInvoices: InvoiceListItem[];
  staleDrafts: InvoiceListItem[];
  missingPaymentMethodProjects: ProjectWithRelations[];
  firedAlertSchedules: AlertScheduleWithProject[];
  activeProjects: ProjectWithRelations[];
  allInvoices: InvoiceListItem[];
  now?: Date;
}): PriorityFeedItem[] {
  const now = input.now ?? new Date();
  const clientNameByProjectId = new Map(
    input.activeProjects.map((project) => [project.id, project.client.name]),
  );
  const lastInvoiceByProjectId = buildLastInvoiceByProjectId(input.allInvoices);

  const overdue: PriorityFeedItem[] = input.overdueInvoices.map((invoice) => {
    const days = Math.abs(daysBetween(now, invoice.dueDate));
    return {
      id: `overdue-${invoice.id}`,
      category: "overdue",
      tier: "Critical",
      barTone: "overdue",
      projectId: invoice.project.id,
      projectName: invoice.project.name,
      clientName: invoice.project.client.name,
      issue: `Invoice ${invoice.invoiceNumber} is overdue`,
      note: `Sent ${formatDisplayDate(invoice.issueDate)}`,
      amount: formatCurrency(invoice.total.toString(), invoice.currency),
      timing: `${days} ${days === 1 ? "day" : "days"} overdue`,
      timingDanger: true,
      secondaryLink: {
        label: "View invoice →",
        href: `/invoices/${invoice.id}`,
      },
      action: {
        label: "Send reminder",
        disabled: true,
        disabledReason: NO_EMAIL_SENDING_REASON,
      },
    };
  });

  const prepare: PriorityFeedItem[] = input.firedAlertSchedules
    .filter(isSendInvoiceSchedule)
    .map((schedule) => {
      const day = resolveScheduledDayThisMonth(schedule.dayOfMonth, now);
      const scheduledDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day),
      );
      const lastInvoice = lastInvoiceByProjectId.get(schedule.project.id);
      return {
        id: `prepare-${schedule.id}`,
        category: "prepare",
        tier: "High",
        barTone: "prepare",
        projectId: schedule.project.id,
        projectName: schedule.project.name,
        clientName: clientNameByProjectId.get(schedule.project.id) ?? "",
        issue:
          schedule.label ||
          "Invoice has not been created for this billing cycle",
        note: schedule.recurring ? "Recurring reminder" : "One-time reminder",
        amount: lastInvoice
          ? formatCurrency(lastInvoice.total, lastInvoice.currency)
          : undefined,
        timing: `Billing date was ${formatDisplayDate(scheduledDate)}`,
        secondaryLink: {
          label: "View project →",
          href: `/projects/${schedule.project.id}`,
        },
        action: {
          label: "Create invoice",
          href: `/invoices/new/${schedule.project.id}`,
        },
      };
    },
  );

  const draft: PriorityFeedItem[] = input.staleDrafts.map((invoice) => ({
    id: `draft-${invoice.id}`,
    category: "draft",
    tier: "High",
    barTone: "draft",
    projectId: invoice.project.id,
    projectName: invoice.project.name,
    clientName: invoice.project.client.name,
    issue: "Draft invoice is awaiting review",
    note: `Created ${formatDisplayDate(invoice.createdAt)}`,
    amount: formatCurrency(invoice.total.toString(), invoice.currency),
    timing: `Draft for ${Math.max(1, daysBetween(now, invoice.createdAt))} ${daysBetween(now, invoice.createdAt) === 1 ? "day" : "days"}`,
    action: { label: "Review & send", href: `/invoices/${invoice.id}` },
  }));

  const due: PriorityFeedItem[] = input.dueSoonInvoices.map((invoice) => {
    const days = daysBetween(invoice.dueDate, now);
    return {
      id: `due-${invoice.id}`,
      category: "due",
      tier: "Upcoming",
      barTone: "due",
      projectId: invoice.project.id,
      projectName: invoice.project.name,
      clientName: invoice.project.client.name,
      issue: "Payment is due soon",
      note: `Sent ${formatDisplayDate(invoice.issueDate)}`,
      amount: formatCurrency(invoice.total.toString(), invoice.currency),
      timing:
        days <= 0
          ? "Due today"
          : `Due in ${days} ${days === 1 ? "day" : "days"}`,
      action: { label: "View invoice", href: `/invoices/${invoice.id}` },
    };
  });

  const setup: PriorityFeedItem[] = input.missingPaymentMethodProjects.map(
    (project) => ({
      id: `setup-${project.id}`,
      category: "setup",
      tier: "High",
      barTone: "setup",
      projectId: project.id,
      projectName: project.name,
      clientName: project.client.name,
      issue: "Missing preferred payment method",
      action: { label: "Complete setup", href: `/projects/${project.id}` },
    }),
  );

  return [...overdue, ...prepare, ...draft, ...due, ...setup];
}

/** Every item in this feed is actionable now that recent-activity rows are gone — the banner headline total is just the feed's length. */
export function countActionableFeedItems(items: PriorityFeedItem[]): number {
  return items.length;
}
