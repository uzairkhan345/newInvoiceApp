import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { buildPriorityFeed, countActionableFeedItems } from "@/lib/priorityFeed";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { AlertScheduleWithProject } from "@/repositories/projectAlertScheduleRepository";

function invoice(overrides: Partial<InvoiceListItem>): InvoiceListItem {
  return {
    id: "invoice-1",
    invoiceNumber: "TP-01",
    issueDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-15"),
    status: "SENT",
    currency: "USD",
    subtotal: new Prisma.Decimal(100),
    total: new Prisma.Decimal(100),
    convertedTotal: null,
    convertedCurrency: null,
    fromPartySnapshot: {},
    toPartySnapshot: {},
    paymentDetailsSnapshot: [],
    itemsNote: null,
    bottomNote: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    projectId: "project-1",
    project: {
      id: "project-1",
      name: "Test Project",
      client: { id: "client-1", name: "Test Client" },
    },
    ...overrides,
  } as InvoiceListItem;
}

function project(
  overrides: Partial<ProjectWithRelations>,
): ProjectWithRelations {
  return {
    id: "project-2",
    name: "Test Project 2",
    createdAt: new Date("2026-01-01"),
    client: { id: "client-2", name: "Client Two" },
    ...overrides,
  } as ProjectWithRelations;
}

function alertSchedule(
  overrides: Partial<AlertScheduleWithProject>,
): AlertScheduleWithProject {
  return {
    id: "schedule-1",
    projectId: "project-3",
    dayOfMonth: 1,
    recurring: true,
    label: null,
    clearedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    project: { id: "project-3", name: "Test Project 3" },
    ...overrides,
  } as AlertScheduleWithProject;
}

describe("buildPriorityFeed", () => {
  it("orders overdue, then fired alerts, then setup gaps, then stale drafts, then activity", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      firedAlertSchedules: [alertSchedule({ id: "fired-1" })],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      staleDrafts: [invoice({ id: "draft-1", status: "DRAFT" })],
      recentInvoiceActivity: [
        invoice({
          id: "activity-1",
          status: "PAID",
          updatedAt: new Date("2026-01-10"),
        }),
      ],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(feed.map((item) => item.category)).toEqual([
      "overdue",
      "fired",
      "setup",
      "draft",
      "activity",
    ]);
  });

  it("sorts activity entries (invoices + projects) chronologically, most recent first", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [],
      staleDrafts: [],
      recentInvoiceActivity: [
        invoice({
          id: "older",
          status: "SENT",
          updatedAt: new Date("2026-01-01"),
        }),
      ],
      recentProjects: [
        project({ id: "newer", createdAt: new Date("2026-01-15") }),
      ],
      activityLimit: 8,
    });

    expect(feed.map((item) => item.id)).toEqual([
      "activity-project-newer",
      "activity-invoice-older",
    ]);
  });

  it("caps activity entries at the given limit", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [],
      staleDrafts: [],
      recentInvoiceActivity: [
        invoice({ id: "a", status: "SENT", updatedAt: new Date("2026-01-01") }),
        invoice({ id: "b", status: "SENT", updatedAt: new Date("2026-01-02") }),
        invoice({ id: "c", status: "SENT", updatedAt: new Date("2026-01-03") }),
      ],
      recentProjects: [],
      activityLimit: 2,
    });

    expect(feed).toHaveLength(2);
  });

  it("colors PAID activity green (positive) and SENT/VOID indigo (info)", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [],
      staleDrafts: [],
      recentInvoiceActivity: [
        invoice({
          id: "paid",
          status: "PAID",
          updatedAt: new Date("2026-01-03"),
        }),
        invoice({
          id: "sent",
          status: "SENT",
          updatedAt: new Date("2026-01-02"),
        }),
        invoice({
          id: "void",
          status: "VOID",
          updatedAt: new Date("2026-01-01"),
        }),
      ],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(feed.map((item) => item.barTone)).toEqual(["positive", "info", "info"]);
  });

  it("gives fired alert items the setup (amber) tone, a project link, and a clear field", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      firedAlertSchedules: [
        alertSchedule({
          id: "fired-1",
          label: "Send invoice",
          recurring: true,
          project: { id: "project-9", name: "Acme Co" },
        }),
      ],
      missingPaymentMethodProjects: [],
      staleDrafts: [],
      recentInvoiceActivity: [],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({
      category: "fired",
      barTone: "setup",
      href: "/projects/project-9",
      title: "Send invoice",
      detail: "Acme Co · recurring",
      clear: { scheduleId: "fired-1", projectId: "project-9" },
    });
  });

  it("falls back to a 'Day N reminder' title when the label is blank", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      firedAlertSchedules: [alertSchedule({ id: "fired-1", dayOfMonth: 8, label: null })],
      missingPaymentMethodProjects: [],
      staleDrafts: [],
      recentInvoiceActivity: [],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(feed[0].title).toBe("Day 8th reminder");
  });

  it("does not set `clear` on any non-fired item", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      staleDrafts: [invoice({ id: "draft-1", status: "DRAFT" })],
      recentInvoiceActivity: [],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(feed.every((item) => item.clear === undefined)).toBe(true);
  });
});

describe("countActionableFeedItems", () => {
  it("excludes plain activity entries from the count", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      staleDrafts: [],
      recentInvoiceActivity: [
        invoice({ id: "activity-1", status: "PAID" }),
        invoice({ id: "activity-2", status: "SENT" }),
      ],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(countActionableFeedItems(feed)).toBe(2);
  });

  it("includes fired alerts in the count", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      firedAlertSchedules: [alertSchedule({ id: "fired-1" })],
      missingPaymentMethodProjects: [],
      staleDrafts: [],
      recentInvoiceActivity: [],
      recentProjects: [],
      activityLimit: 8,
    });

    expect(countActionableFeedItems(feed)).toBe(1);
  });

  it("returns 0 when the feed is empty", () => {
    expect(countActionableFeedItems([])).toBe(0);
  });
});
