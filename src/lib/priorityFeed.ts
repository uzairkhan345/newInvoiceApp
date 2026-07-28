import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";

/**
 * Dashboard Priority Feed (M27 v2 redesign) — merges the old separate
 * NeedsAttentionList + ActivityLog into one urgency-sorted list:
 * overdue invoices, then setup gaps (missing preferred payment method),
 * then stale drafts, then recent lifecycle activity chronologically.
 * design_handoff_dashboard_v2/README.md §2, Docs/ui_design_guide.md §16.
 */
export type PriorityFeedCategory = "overdue" | "setup" | "draft" | "activity";

/** Left-edge bar / tag color — distinct from `category` since "activity" rows vary between green (positive) and indigo (neutral) sub-events. */
export type PriorityFeedBarTone =
  | "overdue"
  | "setup"
  | "draft"
  | "positive"
  | "info";

export type PriorityFeedItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  amount?: string;
  category: PriorityFeedCategory;
  barTone: PriorityFeedBarTone;
};

const ACTIVITY_VERBS: Partial<Record<string, string>> = {
  SENT: "sent",
  PAID: "marked paid",
  VOID: "voided",
};

/** PAID reads as a positive (green) event; SENT/VOID are neutral (indigo) — see README §2's "green/indigo (activity events)" bar note. */
const ACTIVITY_TONE: Partial<Record<string, PriorityFeedBarTone>> = {
  PAID: "positive",
  SENT: "info",
  VOID: "info",
};

type ActivityFeedItem = PriorityFeedItem & { timestamp: Date };

export function buildPriorityFeed(input: {
  overdueInvoices: InvoiceListItem[];
  missingPaymentMethodProjects: ProjectWithRelations[];
  staleDrafts: InvoiceListItem[];
  recentInvoiceActivity: InvoiceListItem[];
  recentProjects: ProjectWithRelations[];
  activityLimit: number;
}): PriorityFeedItem[] {
  const overdue: PriorityFeedItem[] = input.overdueInvoices.map((invoice) => ({
    id: `overdue-${invoice.id}`,
    href: `/invoices/${invoice.id}`,
    title: `${invoice.invoiceNumber} — ${invoice.project.client.name}`,
    detail: `${invoice.project.name} · due ${formatDisplayDate(invoice.dueDate)}`,
    amount: formatCurrency(invoice.total.toString(), invoice.currency),
    category: "overdue",
    barTone: "overdue",
  }));

  const setup: PriorityFeedItem[] = input.missingPaymentMethodProjects.map(
    (project) => ({
      id: `setup-${project.id}`,
      href: `/projects/${project.id}`,
      title: project.name,
      detail: "No preferred payment method set",
      category: "setup",
      barTone: "setup",
    }),
  );

  const draft: PriorityFeedItem[] = input.staleDrafts.map((invoice) => ({
    id: `draft-${invoice.id}`,
    href: `/invoices/${invoice.id}`,
    title: `${invoice.invoiceNumber} — ${invoice.project.client.name}`,
    detail: `${invoice.project.name} · awaiting review`,
    amount: formatCurrency(invoice.total.toString(), invoice.currency),
    category: "draft",
    barTone: "draft",
  }));

  const activity: ActivityFeedItem[] = [
    ...input.recentInvoiceActivity.map(
      (invoice): ActivityFeedItem => ({
        id: `activity-invoice-${invoice.id}`,
        href: `/invoices/${invoice.id}`,
        title: `Invoice ${invoice.invoiceNumber} ${ACTIVITY_VERBS[invoice.status] ?? invoice.status.toLowerCase()}`,
        detail: invoice.project.client.name,
        category: "activity",
        barTone: ACTIVITY_TONE[invoice.status] ?? "info",
        timestamp: invoice.updatedAt,
      }),
    ),
    ...input.recentProjects.map(
      (project): ActivityFeedItem => ({
        id: `activity-project-${project.id}`,
        href: `/projects/${project.id}`,
        title: `Project ${project.name} created`,
        detail: project.client.name,
        category: "activity",
        barTone: "info",
        timestamp: project.createdAt,
      }),
    ),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, input.activityLimit);

  return [...overdue, ...setup, ...draft, ...activity];
}

/** README §2 — the alert banner's headline count excludes plain "activity" entries. */
export function countActionableFeedItems(items: PriorityFeedItem[]): number {
  return items.filter((item) => item.category !== "activity").length;
}
