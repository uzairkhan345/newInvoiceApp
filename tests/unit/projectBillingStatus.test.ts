import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  buildLastInvoiceByProjectId,
  buildProjectBillingRows,
  buildReceivablesAgeing,
  resolveHealthCategory,
} from "@/lib/projectBillingStatus";
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
    id: "project-1",
    name: "Test Project",
    invoicePeriodType: null,
    displayCurrency: "USD",
    client: { id: "client-1", name: "Test Client" },
    createdAt: new Date("2026-01-01"),
    ...overrides,
  } as ProjectWithRelations;
}

function alertSchedule(
  overrides: Partial<AlertScheduleWithProject>,
): AlertScheduleWithProject {
  return {
    id: "schedule-1",
    projectId: "project-1",
    dayOfMonth: 25,
    recurring: true,
    label: null,
    clearedAt: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    project: { id: "project-1", name: "Test Project" },
    ...overrides,
  } as AlertScheduleWithProject;
}

describe("buildLastInvoiceByProjectId", () => {
  it("keeps the most recently issued invoice per project", () => {
    const map = buildLastInvoiceByProjectId([
      invoice({
        id: "a",
        issueDate: new Date("2026-01-01"),
        total: new Prisma.Decimal(100),
      }),
      invoice({
        id: "b",
        issueDate: new Date("2026-01-15"),
        total: new Prisma.Decimal(200),
      }),
    ]);
    expect(map.get("project-1")?.total).toBe("200");
  });
});

describe("buildProjectBillingRows", () => {
  it("marks a project with an overdue invoice as overdue, days computed from dueDate", () => {
    const overdueInvoice = invoice({
      id: "od-1",
      dueDate: new Date("2026-01-10"),
    });
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [overdueInvoice],
      overdueInvoices: [overdueInvoice],
      staleDrafts: [],
      firedAlertSchedules: [],
      now: NOW,
    });

    expect(rows[0].statusTone).toBe("overdue");
    expect(rows[0].statusLabel).toBe("10 days overdue");
  });

  it("prioritizes overdue over a fired schedule or a stale draft", () => {
    const overdueInvoice = invoice({
      id: "od-1",
      dueDate: new Date("2026-01-10"),
    });
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [overdueInvoice],
      overdueInvoices: [overdueInvoice],
      staleDrafts: [invoice({ id: "draft-1", status: "DRAFT" })],
      firedAlertSchedules: [alertSchedule({})],
      now: NOW,
    });

    expect(rows[0].statusTone).toBe("overdue");
  });

  it("falls back to On track (positive) when nothing needs attention", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      now: NOW,
    });

    expect(rows[0]).toMatchObject({
      statusTone: "positive",
      statusLabel: "On track",
    });
  });

  it("labels a project with no invoicePeriodType as Milestone", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({ invoicePeriodType: null })],
      allInvoices: [],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      now: NOW,
    });

    expect(rows[0].billingLabel).toBe("Milestone");
  });

  it("computes next invoice date from invoicePeriodType off the last invoice when no schedule is fired", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({ invoicePeriodType: "MONTHLY" })],
      allInvoices: [invoice({ id: "a", issueDate: new Date("2026-01-05") })],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      now: NOW,
    });

    expect(rows[0].nextInvoiceDate?.toISOString().slice(0, 10)).toBe(
      "2026-02-05",
    );
  });

  it("prefers a fired alert schedule's resolved day over the invoicePeriodType calc", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({ invoicePeriodType: "MONTHLY" })],
      allInvoices: [invoice({ id: "a", issueDate: new Date("2026-01-05") })],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [alertSchedule({ dayOfMonth: 25 })],
      now: NOW,
    });

    expect(rows[0].nextInvoiceDate?.toISOString().slice(0, 10)).toBe(
      "2026-01-25",
    );
  });

  it("returns null next invoice date when there's no schedule and no invoicePeriodType", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({ invoicePeriodType: null })],
      allInvoices: [invoice({ id: "a" })],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      now: NOW,
    });

    expect(rows[0].nextInvoiceDate).toBeNull();
  });

  it("sums only SENT invoices for exposure", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [
        invoice({
          id: "sent-1",
          status: "SENT",
          total: new Prisma.Decimal(300),
        }),
        invoice({
          id: "draft-1",
          status: "DRAFT",
          total: new Prisma.Decimal(999),
        }),
      ],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      now: NOW,
    });

    expect(rows[0].exposureTotal).toBe("300");
  });

  it("marks a project with no preferred payment method as setupIncomplete when nothing more urgent applies", () => {
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [project({})],
      now: NOW,
    });

    expect(rows[0].statusTone).toBe("setupIncomplete");
    expect(rows[0].statusLabel).toBe("Setup incomplete");
  });

  it("marks a project with a due-soon outstanding invoice as upcoming when nothing more urgent applies", () => {
    const dueSoonInvoice = invoice({ id: "due-soon-1", status: "SENT" });
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [dueSoonInvoice],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      dueSoonInvoices: [dueSoonInvoice],
      now: NOW,
    });

    expect(rows[0].statusTone).toBe("upcoming");
    expect(rows[0].statusLabel).toBe("Payment due soon");
  });

  it("prioritizes overdue/prepare/draft over setupIncomplete and upcoming", () => {
    const overdueInvoice = invoice({
      id: "od-1",
      dueDate: new Date("2026-01-10"),
    });
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [overdueInvoice],
      overdueInvoices: [overdueInvoice],
      staleDrafts: [],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [project({})],
      dueSoonInvoices: [overdueInvoice],
      now: NOW,
    });

    expect(rows[0].statusTone).toBe("overdue");
  });

  it("prioritizes setupIncomplete over upcoming", () => {
    const dueSoonInvoice = invoice({ id: "due-soon-1", status: "SENT" });
    const rows = buildProjectBillingRows({
      activeProjects: [project({})],
      allInvoices: [dueSoonInvoice],
      overdueInvoices: [],
      staleDrafts: [],
      firedAlertSchedules: [],
      missingPaymentMethodProjects: [project({})],
      dueSoonInvoices: [dueSoonInvoice],
      now: NOW,
    });

    expect(rows[0].statusTone).toBe("setupIncomplete");
  });
});

describe("resolveHealthCategory", () => {
  it("groups overdue/prepare/draft/setupIncomplete as needsAttention", () => {
    expect(resolveHealthCategory("overdue")).toBe("needsAttention");
    expect(resolveHealthCategory("prepare")).toBe("needsAttention");
    expect(resolveHealthCategory("draft")).toBe("needsAttention");
    expect(resolveHealthCategory("setupIncomplete")).toBe("needsAttention");
  });

  it("maps upcoming and positive to their own categories", () => {
    expect(resolveHealthCategory("upcoming")).toBe("upcoming");
    expect(resolveHealthCategory("positive")).toBe("healthy");
  });
});

describe("buildReceivablesAgeing", () => {
  it("buckets by days past due and excludes non-USD invoices", () => {
    const ageing = buildReceivablesAgeing(
      [
        invoice({
          id: "not-due",
          dueDate: new Date("2026-01-25"),
          total: new Prisma.Decimal(100),
        }),
        invoice({
          id: "late-15",
          dueDate: new Date("2026-01-05"),
          total: new Prisma.Decimal(200),
        }),
        invoice({
          id: "late-40",
          dueDate: new Date("2025-12-10"),
          total: new Prisma.Decimal(300),
        }),
        invoice({
          id: "non-usd",
          dueDate: new Date("2026-01-05"),
          total: new Prisma.Decimal(400),
          currency: "GBP",
        }),
      ],
      NOW,
    );

    expect(ageing.notYetDue.total).toBe("100");
    expect(ageing.dueSoon.total).toBe("200");
    expect(ageing.late.total).toBe("300");
  });
});
