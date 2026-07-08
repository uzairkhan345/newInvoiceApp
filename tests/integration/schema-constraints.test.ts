// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../src/generated/prisma/client";

const prisma = new PrismaClient();

describe("Invoice (projectId, invoiceNumber) uniqueness constraint", () => {
  let contractorId: string;
  let clientId: string;
  let projectId: string;

  beforeAll(async () => {
    const contractor = await prisma.party.create({
      data: { name: "[test] Constraint Contractor", type: "ORGANIZATION" },
    });
    const client = await prisma.party.create({
      data: { name: "[test] Constraint Client", type: "ORGANIZATION" },
    });
    const project = await prisma.project.create({
      data: {
        name: "[test] Constraint Project",
        clientId: client.id,
        contractorId: contractor.id,
        invoiceNumberFormat: "{number}",
        displayCurrency: "USD",
        status: "ACTIVE",
      },
    });
    contractorId = contractor.id;
    clientId = client.id;
    projectId = project.id;
  });

  afterAll(async () => {
    await prisma.invoice.deleteMany({ where: { projectId } });
    await prisma.project.delete({ where: { id: projectId } });
    await prisma.party.delete({ where: { id: contractorId } });
    await prisma.party.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  const baseInvoiceData = {
    status: "DRAFT" as const,
    issueDate: new Date("2026-01-01"),
    dueDate: new Date("2026-01-31"),
    subtotal: "100.00",
    total: "100.00",
    fromPartySnapshot: {},
    toPartySnapshot: {},
    paymentDetailsSnapshot: [],
  };

  it("allows the first invoice with a given invoiceNumber in a project", async () => {
    const invoice = await prisma.invoice.create({
      data: {
        ...baseInvoiceData,
        projectId,
        invoiceNumber: "DUPLICATE-TEST-01",
      },
    });
    expect(invoice.invoiceNumber).toBe("DUPLICATE-TEST-01");
  });

  it("rejects a second invoice with the same (projectId, invoiceNumber)", async () => {
    await expect(
      prisma.invoice.create({
        data: {
          ...baseInvoiceData,
          projectId,
          invoiceNumber: "DUPLICATE-TEST-01",
        },
      }),
    ).rejects.toThrow();
  });

  it("allows the same invoiceNumber in a different project", async () => {
    const otherProject = await prisma.project.create({
      data: {
        name: "[test] Constraint Project 2",
        clientId,
        contractorId,
        invoiceNumberFormat: "{number}",
        displayCurrency: "USD",
        status: "ACTIVE",
      },
    });

    const invoice = await prisma.invoice.create({
      data: {
        ...baseInvoiceData,
        projectId: otherProject.id,
        invoiceNumber: "DUPLICATE-TEST-01",
      },
    });
    expect(invoice.invoiceNumber).toBe("DUPLICATE-TEST-01");

    await prisma.invoice.deleteMany({ where: { projectId: otherProject.id } });
    await prisma.project.delete({ where: { id: otherProject.id } });
  });
});
