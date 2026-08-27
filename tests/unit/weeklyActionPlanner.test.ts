import { describe, expect, it } from "vitest";
import { buildWeeklyActionPlanner } from "@/lib/weeklyActionPlanner";
import type { PriorityFeedItem } from "@/lib/priorityFeed";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

function item(
  projectId: string,
  category: PriorityFeedItem["category"],
  actionDate: Date | null,
): PriorityFeedItem {
  return {
    id: `${category}-${projectId}`,
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
