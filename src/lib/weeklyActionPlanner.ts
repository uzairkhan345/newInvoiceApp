import type { PriorityFeedItem } from "@/lib/priorityFeed";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import { formatCurrency } from "@/lib/currency";

type ExpectedPeriod = { start: Date; end: Date };

function expectedPeriodFor(
  project: ProjectWithRelations,
  now: Date,
): ExpectedPeriod | null {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  if (!project.invoicePeriodType) return null;
  if (project.invoicePeriodType === "MONTHLY") {
    return {
      start: new Date(Date.UTC(year, month, 1)),
      end: new Date(Date.UTC(year, month + 1, 0)),
    };
  }
  if (project.invoicePeriodType === "SEMI_MONTHLY") {
    return day <= 15
      ? {
          start: new Date(Date.UTC(year, month, 1)),
          end: new Date(Date.UTC(year, month, 15)),
        }
      : {
          start: new Date(Date.UTC(year, month, 16)),
          end: new Date(Date.UTC(year, month + 1, 0)),
        };
  }
  const mondayOffset = (now.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, day - mondayOffset));
  return { start, end: new Date(start.getTime() + 6 * 86_400_000) };
}

function sameUtcDate(a: Date | null, b: Date): boolean {
  return a !== null && utcDay(a) === utcDay(b);
}

export type PlannerSection =
  "overdue" | "today" | "week" | "later" | "unscheduled" | "onTrack";
export type ProjectAction = PriorityFeedItem & { section: PlannerSection };

const PRECEDENCE: Record<PriorityFeedItem["category"], number> = {
  overdue: 0,
  prepare: 1,
  draft: 2,
  due: 3,
  setup: 4,
};

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

const AGGREGATE_LABEL: Partial<Record<PriorityFeedItem["category"], string>> = {
  overdue: "invoices overdue",
  draft: "draft invoices awaiting review",
  due: "invoices due soon",
};

/**
 * The planner keeps only the single most urgent item per project/category
 * (see the precedence loop below), which understates a project's real
 * exposure when it has more than one invoice in the same state — e.g. two
 * overdue invoices would otherwise show only the older one's amount. When
 * siblings exist, fold them into one line showing the combined total and a
 * count, matching how the pre-planner Health view surfaced this (see
 * feedback_backlog.md's dashboard-multi-invoice-exposure fix) — bail out
 * rather than guess if their currencies don't match, since this app never
 * blends currencies in a single figure.
 */
function withAggregateIfNeeded(
  item: PriorityFeedItem,
  itemsByProjectCategory: Map<string, PriorityFeedItem[]>,
  invoicesByProject: Map<string, InvoiceListItem[]>,
): PriorityFeedItem {
  const label = AGGREGATE_LABEL[item.category];
  if (!label) return item;
  const siblings =
    itemsByProjectCategory.get(`${item.projectId}|${item.category}`) ?? [];
  if (siblings.length < 2) return item;

  const prefix = `${item.category}-`;
  const projectInvoices = invoicesByProject.get(item.projectId) ?? [];
  const invoices = siblings
    .map((sibling) =>
      sibling.id.startsWith(prefix)
        ? projectInvoices.find(
            (inv) => inv.id === sibling.id.slice(prefix.length),
          )
        : undefined,
    )
    .filter((invoice): invoice is InvoiceListItem => invoice != null);
  if (invoices.length < 2) return item;

  const currency = invoices[0].currency;
  if (!invoices.every((invoice) => invoice.currency === currency)) return item;

  const total = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total),
    0,
  );
  return {
    ...item,
    issue: `${invoices.length} ${label}`,
    amount: formatCurrency(total, currency),
    secondaryLink: {
      label: "View invoices →",
      href: `/projects/${item.projectId}?tab=invoices&returnTo=%2F`,
    },
  };
}

function sectionFor(date: Date | null, now: Date): PlannerSection {
  if (!date) return "unscheduled";
  const delta = Math.round((utcDay(date) - utcDay(now)) / 86_400_000);
  if (delta < 0) return "overdue";
  if (delta === 0) return "today";
  if (delta <= 7) return "week";
  return "later";
}

/** One owner-facing action per active project, selected by the agreed billing precedence. */
export function buildWeeklyActionPlanner(input: {
  items: PriorityFeedItem[];
  billingRows: ProjectBillingRow[];
  activeProjects?: ProjectWithRelations[];
  allInvoices?: InvoiceListItem[];
  now?: Date;
}): ProjectAction[] {
  const now = input.now ?? new Date();
  const expectedByProject = new Map(
    (input.activeProjects ?? []).map((project) => [
      project.id,
      expectedPeriodFor(project, now),
    ]),
  );
  const invoicesByProject = new Map<string, InvoiceListItem[]>();
  for (const invoice of input.allInvoices ?? []) {
    const list = invoicesByProject.get(invoice.projectId) ?? [];
    list.push(invoice);
    invoicesByProject.set(invoice.projectId, list);
  }
  const itemsByProjectCategory = new Map<string, PriorityFeedItem[]>();
  for (const item of input.items) {
    const key = `${item.projectId}|${item.category}`;
    const list = itemsByProjectCategory.get(key);
    if (list) list.push(item);
    else itemsByProjectCategory.set(key, [item]);
  }

  const selected = new Map<string, PriorityFeedItem>();
  for (const item of input.items) {
    const expected = expectedByProject.get(item.projectId);
    const projectInvoices = invoicesByProject.get(item.projectId) ?? [];
    const invoiceForExpectedPeriod = expected
      ? projectInvoices.find(
          (invoice) =>
            invoice.status !== "VOID" &&
            sameUtcDate(invoice.periodStart, expected.start) &&
            sameUtcDate(invoice.periodEnd, expected.end),
        )
      : undefined;
    if (item.category === "prepare" && invoiceForExpectedPeriod) continue;
    if (
      item.category === "draft" &&
      expected &&
      item.id.startsWith("draft-") &&
      invoiceForExpectedPeriod?.id !== item.id.slice("draft-".length)
    )
      continue;
    const current = selected.get(item.projectId);
    if (!current || PRECEDENCE[item.category] < PRECEDENCE[current.category]) {
      selected.set(item.projectId, item);
    }
  }

  for (const row of input.billingRows) {
    if (selected.has(row.projectId)) continue;
    const next = row.nextInvoiceDate;
    const withinWeek =
      next &&
      utcDay(next) > utcDay(now) &&
      utcDay(next) <= utcDay(now) + 7 * 86_400_000;
    if (withinWeek) {
      selected.set(row.projectId, {
        id: `upcoming-${row.projectId}`,
        category: "due",
        tier: "Upcoming",
        barTone: "due",
        projectId: row.projectId,
        projectName: row.projectName,
        clientName: row.clientName,
        issue: "Upcoming invoice schedule",
        timing: `Invoice date ${next.toISOString().slice(0, 10)}`,
        actionDate: next,
        action: {
          label: "Open project",
          href: `/projects/${row.projectId}?returnTo=%2F`,
        },
      });
    }
  }

  return Array.from(selected.values())
    .map((item) =>
      withAggregateIfNeeded(item, itemsByProjectCategory, invoicesByProject),
    )
    .map((item) => ({ ...item, section: sectionFor(item.actionDate, now) }))
    .sort(
      (a, b) =>
        (a.actionDate?.getTime() ?? Infinity) -
        (b.actionDate?.getTime() ?? Infinity),
    );
}
