import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { buildPartyBillingRows } from "@/lib/partyBillingStatus";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { Party } from "@/generated/prisma/client";

const NOW = new Date("2026-01-20T00:00:00.000Z");

function party(overrides: Partial<Party>): Party {
  return {
    id: "party-1",
    name: "Test Party",
    email: null,
    type: "ORGANIZATION",
    street1: null,
    street2: null,
    city: null,
    state: null,
    postalCode: null,
    country: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  } as Party;
}

function project(
  overrides: Partial<ProjectWithRelations>,
): ProjectWithRelations {
  return {
    id: "project-1",
    name: "Test Project",
    clientId: "client-1",
    contractorId: "contractor-1",
    status: "ACTIVE",
    ...overrides,
  } as ProjectWithRelations;
}

function invoice(overrides: Partial<InvoiceListItem>): InvoiceListItem {
  return {
    id: "invoice-1",
    invoiceNumber: "TP-01",
    issueDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-25"),
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

describe("buildPartyBillingRows — relationship derivation", () => {
  it("marks a party referenced only as a project's client as 'client'", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1", contractorId: "other" })],
      allInvoices: [],
      now: NOW,
    });
    expect(rows[0].relationship).toBe("client");
  });

  it("marks a party referenced only as a project's contractor as 'contractor'", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "contractor-1" })],
      allProjects: [
        project({ clientId: "other", contractorId: "contractor-1" }),
      ],
      allInvoices: [],
      now: NOW,
    });
    expect(rows[0].relationship).toBe("contractor");
  });

  it("marks a party used as both client and contractor (on different projects) as 'both'", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "party-1" })],
      allProjects: [
        project({
          id: "p1",
          clientId: "party-1",
          contractorId: "other",
        }),
        project({
          id: "p2",
          clientId: "other",
          contractorId: "party-1",
        }),
      ],
      allInvoices: [],
      now: NOW,
    });
    expect(rows[0].relationship).toBe("both");
  });

  it("marks a party on neither side of any project as 'unassigned'", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "party-1" })],
      allProjects: [project({ clientId: "other", contractorId: "other2" })],
      allInvoices: [],
      now: NOW,
    });
    expect(rows[0].relationship).toBe("unassigned");
  });
});

describe("buildPartyBillingRows — active project count", () => {
  it("counts only ACTIVE projects referencing the party on either side", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "party-1" })],
      allProjects: [
        project({ id: "p1", clientId: "party-1", status: "ACTIVE" }),
        project({ id: "p2", contractorId: "party-1", status: "ACTIVE" }),
        project({ id: "p3", clientId: "party-1", status: "ARCHIVED" }),
      ],
      allInvoices: [],
      now: NOW,
    });
    expect(rows[0].activeProjectCount).toBe(2);
  });
});

describe("buildPartyBillingRows — billing health", () => {
  it("is 'Internal' for a contractor-only party, ignoring any invoices", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "party-1" })],
      allProjects: [project({ clientId: "other", contractorId: "party-1" })],
      allInvoices: [
        invoice({
          status: "SENT",
          dueDate: new Date("2026-01-01"),
          project: {
            id: "project-1",
            name: "Test Project",
            client: { id: "party-1", name: "Test Party" },
          },
        }),
      ],
      now: NOW,
    });
    expect(rows[0].healthTone).toBe("internal");
    expect(rows[0].healthLabel).toBe("Internal");
  });

  it("is 'Overdue' when a SENT invoice's due date has passed", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1" })],
      allInvoices: [
        invoice({ status: "SENT", dueDate: new Date("2026-01-05") }),
      ],
      now: NOW,
    });
    expect(rows[0].healthTone).toBe("overdue");
  });

  it("is 'Due soon' when a SENT invoice is due within the due-soon window but not yet overdue", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1" })],
      allInvoices: [
        invoice({ status: "SENT", dueDate: new Date("2026-01-24") }),
      ],
      now: NOW,
    });
    expect(rows[0].healthTone).toBe("dueSoon");
  });

  it("is 'Current' when a SENT invoice is outstanding but due well in the future", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1" })],
      allInvoices: [
        invoice({ status: "SENT", dueDate: new Date("2026-03-01") }),
      ],
      now: NOW,
    });
    expect(rows[0].healthTone).toBe("current");
    expect(rows[0].healthLabel).toBe("Current");
  });

  it("is 'Paid up' when every invoice is resolved (none SENT)", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1" })],
      allInvoices: [invoice({ status: "PAID" })],
      now: NOW,
    });
    expect(rows[0].healthTone).toBe("current");
    expect(rows[0].healthLabel).toBe("Paid up");
  });

  it("is 'No open invoices' for a client with no invoices at all", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1" })],
      allInvoices: [],
      now: NOW,
    });
    expect(rows[0].healthTone).toBe("none");
    expect(rows[0].healthLabel).toBe("No open invoices");
  });
});

describe("buildPartyBillingRows — outstanding totals", () => {
  it("sums SENT invoices per currency, ignoring non-SENT invoices", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "client-1" })],
      allProjects: [project({ clientId: "client-1" })],
      allInvoices: [
        invoice({
          id: "a",
          status: "SENT",
          currency: "USD",
          total: new Prisma.Decimal(100),
        }),
        invoice({
          id: "b",
          status: "SENT",
          currency: "USD",
          total: new Prisma.Decimal(50),
        }),
        invoice({
          id: "c",
          status: "PAID",
          currency: "USD",
          total: new Prisma.Decimal(9999),
        }),
        invoice({
          id: "d",
          status: "SENT",
          currency: "GBP",
          total: new Prisma.Decimal(30),
        }),
      ],
      now: NOW,
    });
    expect(rows[0].outstandingByCurrency).toEqual(
      expect.arrayContaining([
        { currency: "USD", total: "150" },
        { currency: "GBP", total: "30" },
      ]),
    );
    expect(rows[0].outstandingByCurrency).toHaveLength(2);
  });

  it("only counts invoices where this party is the project's client, not its contractor", () => {
    const rows = buildPartyBillingRows({
      parties: [party({ id: "contractor-1" })],
      allProjects: [
        project({ clientId: "other", contractorId: "contractor-1" }),
      ],
      allInvoices: [
        invoice({
          status: "SENT",
          total: new Prisma.Decimal(500),
          project: {
            id: "project-1",
            name: "Test Project",
            client: { id: "other", name: "Other Client" },
          },
        }),
      ],
      now: NOW,
    });
    expect(rows[0].outstandingByCurrency).toEqual([]);
  });
});
