import type { PriorityFeedItem } from "@/lib/priorityFeed";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";

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
    .map((item) => ({ ...item, section: sectionFor(item.actionDate, now) }))
    .sort(
      (a, b) =>
        (a.actionDate?.getTime() ?? Infinity) -
        (b.actionDate?.getTime() ?? Infinity),
    );
}
