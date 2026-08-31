import { describe, expect, it } from "vitest";
import { buildWeeklyActionPlanner } from "@/lib/weeklyActionPlanner";
import type { PriorityFeedItem } from "@/lib/priorityFeed";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";

function invoice(
  id: string,
  projectId: string,
  total: number,
  currency = "USD",
): InvoiceListItem {
  return {
    id,
    projectId,
    total,
    currency,
  } as unknown as InvoiceListItem;
}

function item(
  projectId: string,
  category: PriorityFeedItem["category"],
  actionDate: Date | null,
  id?: string,
): PriorityFeedItem {
  return {
    id: id ?? `${category}-${projectId}`,
    category,
    tier: "High",
    barTone: category === "overdue" ? "overdue" : category,
    projectId,
    projectName: projectId,
    clientName: "Client",
    issue: category,
    actionDate,
    action: { label: "Open", href: `/projects/${projectId}` },
  };
}

function row(
  projectId: string,
  nextInvoiceDate: Date | null,
): ProjectBillingRow {
  return {
    projectId,
    projectName: projectId,
    clientName: "Client",
    billingLabel: "Monthly",
    lastInvoiceDate: null,
    lastInvoiceTotal: null,
    lastInvoiceCurrency: null,
    lastCoveredPeriod: null,
    nextInvoiceDate,
    exposureTotal: "0",
    exposureCurrency: "USD",
    exposureCount: 0,
    overdueCount: 0,
    draftCount: 0,
    statusLabel: "On track",
    statusTone: "positive",
  };
}

describe("buildWeeklyActionPlanner", () => {
  const now = new Date("2026-08-27T18:00:00.000Z");

  it("keeps one action per project using owner-action precedence", () => {
    const result = buildWeeklyActionPlanner({
      now,
      billingRows: [],
      items: [
        item("atlas", "setup", null),
        item("atlas", "draft", new Date("2026-08-27T00:00:00Z")),
        item("atlas", "overdue", new Date("2026-08-20T00:00:00Z")),
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      projectId: "atlas",
      category: "overdue",
      section: "overdue",
    });
  });

  it("uses UTC calendar boundaries for today and the next seven days", () => {
    const result = buildWeeklyActionPlanner({
      now,
      billingRows: [],
      items: [
        item("today", "due", new Date("2026-08-27T00:00:00Z")),
        item("week", "due", new Date("2026-09-03T00:00:00Z")),
        item("later", "due", new Date("2026-09-04T00:00:00Z")),
      ],
    });
    expect(
      result.map(({ projectId, section }) => [projectId, section]),
    ).toEqual([
      ["today", "today"],
      ["week", "week"],
      ["later", "later"],
    ]);
  });

  it("buckets a past-dated prepare/draft item into 'action', not 'overdue' — that heading is reserved for an actual overdue invoice", () => {
    const result = buildWeeklyActionPlanner({
      now,
      billingRows: [],
      items: [
        item("recurring", "prepare", new Date("2026-08-20T00:00:00Z")),
        item("stale-draft", "draft", new Date("2026-08-20T00:00:00Z")),
        item("real-overdue", "overdue", new Date("2026-08-20T00:00:00Z")),
      ],
    });
    expect(
      result.map(({ projectId, section }) => [projectId, section]),
    ).toEqual([
      ["recurring", "action"],
      ["stale-draft", "action"],
      ["real-overdue", "overdue"],
    ]);
  });

  it("folds multiple overdue invoices for the same project into one aggregate line", () => {
    const result = buildWeeklyActionPlanner({
      now,
      billingRows: [],
      allInvoices: [
        invoice("inv-1", "lumen", 8000),
        invoice("inv-2", "lumen", 9000),
      ],
      items: [
        item(
          "lumen",
          "overdue",
          new Date("2026-07-31T00:00:00Z"),
          "overdue-inv-1",
        ),
        item(
          "lumen",
          "overdue",
          new Date("2026-08-05T00:00:00Z"),
          "overdue-inv-2",
        ),
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      projectId: "lumen",
      issue: "2 invoices overdue",
      amount: "$17,000.00",
      secondaryLink: { href: "/projects/lumen?tab=invoices&returnTo=%2F" },
    });
  });

  it("does not aggregate a single overdue invoice", () => {
    const result = buildWeeklyActionPlanner({
      now,
      billingRows: [],
      allInvoices: [invoice("inv-1", "lumen", 8000)],
      items: [
        item(
          "lumen",
          "overdue",
          new Date("2026-07-31T00:00:00Z"),
          "overdue-inv-1",
        ),
      ],
    });
    expect(result[0].issue).toBe("overdue");
  });

  it("does not blend mismatched currencies when aggregating", () => {
    const result = buildWeeklyActionPlanner({
      now,
      billingRows: [],
      allInvoices: [
        invoice("inv-1", "lumen", 8000, "USD"),
        invoice("inv-2", "lumen", 9000, "AUD"),
      ],
      items: [
        item(
          "lumen",
          "overdue",
          new Date("2026-07-31T00:00:00Z"),
          "overdue-inv-1",
        ),
        item(
          "lumen",
          "overdue",
          new Date("2026-08-05T00:00:00Z"),
          "overdue-inv-2",
        ),
      ],
    });
    expect(result[0].issue).toBe("overdue");
  });

  it("adds an open-project action for an otherwise healthy project scheduled within seven days", () => {
    const result = buildWeeklyActionPlanner({
      now,
      items: [],
      billingRows: [row("atlas", new Date("2026-08-30T00:00:00Z"))],
    });
    expect(result[0]).toMatchObject({
      projectId: "atlas",
      issue: "Upcoming invoice schedule",
      section: "week",
      action: { label: "Open project" },
    });
  });
});
