import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  buildPriorityFeed,
  countActionableFeedItems,
} from "@/lib/priorityFeed";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { AlertScheduleWithProject } from "@/repositories/projectAlertScheduleRepository";

const NOW = new Date("2026-01-20T00:00:00.000Z");

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
    dayOfMonth: 15,
    recurring: true,
    label: null,
    clearedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    project: { id: "project-3", name: "Schedule Project" },
    ...overrides,
  } as AlertScheduleWithProject;
}

describe("buildPriorityFeed", () => {
  it("orders overdue, then prepare, then draft, then due, then setup", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      dueSoonInvoices: [
        invoice({ id: "due-1", dueDate: new Date("2026-01-25") }),
      ],
      staleDrafts: [invoice({ id: "draft-1", status: "DRAFT" })],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      firedAlertSchedules: [alertSchedule({ id: "schedule-1" })],
      activeProjects: [],
      allInvoices: [],
      now: NOW,
    });

    expect(feed.map((item) => item.category)).toEqual([
      "overdue",
      "prepare",
      "draft",
      "due",
      "setup",
    ]);
  });

  it("assigns Critical/High/Upcoming tiers matching the mockup", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      dueSoonInvoices: [
        invoice({ id: "due-1", dueDate: new Date("2026-01-25") }),
      ],
      staleDrafts: [invoice({ id: "draft-1", status: "DRAFT" })],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      firedAlertSchedules: [alertSchedule({ id: "schedule-1" })],
      activeProjects: [],
      allInvoices: [],
      now: NOW,
    });

    expect(feed.map((item) => item.tier)).toEqual([
      "Critical",
      "High",
      "High",
      "Upcoming",
      "High",
    ]);
  });

  it("overdue rows render Send reminder disabled — no email-sending infrastructure exists", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      dueSoonInvoices: [],
      staleDrafts: [],
      missingPaymentMethodProjects: [],
      firedAlertSchedules: [],
      activeProjects: [],
      allInvoices: [],
      now: NOW,
    });

    expect(feed[0].action).toMatchObject({
      label: "Send reminder",
      disabled: true,
    });
    expect(feed[0].secondaryLink?.href).toBe("/invoices/overdue-1");
  });

  it("prepare rows resolve the client name from activeProjects and link Create invoice to the project", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      dueSoonInvoices: [],
      staleDrafts: [],
      missingPaymentMethodProjects: [],
      firedAlertSchedules: [
        alertSchedule({
          id: "schedule-1",
          project: { id: "project-3", name: "Schedule Project" },
        }),
      ],
      activeProjects: [
        project({
          id: "project-3",
          name: "Schedule Project",
          client: {
            id: "client-3",
            name: "Schedule Client",
          } as ProjectWithRelations["client"],
        }),
      ],
      allInvoices: [],
      now: NOW,
    });

    expect(feed[0].clientName).toBe("Schedule Client");
    expect(feed[0].action).toMatchObject({
      label: "Create invoice",
      href: "/invoices/new/project-3",
    });
    expect(feed[0].secondaryLink?.href).toBe("/projects/project-3");
  });

  it("prepare rows estimate an amount from the project's most recent invoice", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      dueSoonInvoices: [],
      staleDrafts: [],
      missingPaymentMethodProjects: [],
      firedAlertSchedules: [
        alertSchedule({
          id: "schedule-1",
          project: { id: "project-3", name: "Schedule Project" },
        }),
      ],
      activeProjects: [project({ id: "project-3", name: "Schedule Project" })],
      allInvoices: [
        invoice({
          id: "past-invoice",
          projectId: "project-3",
          issueDate: new Date("2025-12-01"),
          total: new Prisma.Decimal(500),
          currency: "USD",
        }),
      ],
      now: NOW,
    });

    expect(feed[0].amount).toBe("$500.00");
  });

  it("due rows compute days-until from dueDate", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      dueSoonInvoices: [
        invoice({ id: "due-1", dueDate: new Date("2026-01-23") }),
      ],
      staleDrafts: [],
      missingPaymentMethodProjects: [],
      firedAlertSchedules: [],
      activeProjects: [],
      allInvoices: [],
      now: NOW,
    });

    expect(feed[0].timing).toBe("Due in 3 days");
  });

  it("setup rows link Complete setup to the project", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [],
      dueSoonInvoices: [],
      staleDrafts: [],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      firedAlertSchedules: [],
      activeProjects: [],
      allInvoices: [],
      now: NOW,
    });

    expect(feed[0]).toMatchObject({
      category: "setup",
      tier: "High",
      action: { label: "Complete setup", href: "/projects/setup-1" },
    });
  });
});

describe("countActionableFeedItems", () => {
  it("counts every item — the feed is action-only now, no activity rows to exclude", () => {
    const feed = buildPriorityFeed({
      overdueInvoices: [invoice({ id: "overdue-1" })],
      dueSoonInvoices: [
        invoice({ id: "due-1", dueDate: new Date("2026-01-25") }),
      ],
      staleDrafts: [],
      missingPaymentMethodProjects: [project({ id: "setup-1" })],
      firedAlertSchedules: [],
      activeProjects: [],
      allInvoices: [],
      now: NOW,
    });

    expect(countActionableFeedItems(feed)).toBe(3);
  });

  it("returns 0 when the feed is empty", () => {
    expect(countActionableFeedItems([])).toBe(0);
  });
});
