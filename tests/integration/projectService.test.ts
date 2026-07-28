// @vitest-environment node
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  projectService,
  ProjectDeletionBlockedError,
  PreferredPaymentMethodMismatchError,
  deriveAbbreviation,
} from "@/services/projectService";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import { prisma } from "@/lib/prisma";
import type { ProjectInput } from "@/lib/validation/project";
import type { PartyInput } from "@/lib/validation/party";
import type { PaymentMethodInput } from "@/lib/validation/paymentMethod";

const createdPartyIds: string[] = [];
const createdProjectIds: string[] = [];
const createdInvoiceIds: string[] = [];

function basePartyInput(overrides: Partial<PartyInput> = {}): PartyInput {
  return {
    name: "[test] Party",
    email: "",
    type: "ORGANIZATION",
    street1: "",
    street2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    ...overrides,
  };
}

async function createTestParty(name: string) {
  const party = await partyService.create(basePartyInput({ name }));
  createdPartyIds.push(party.id);
  return party;
}

function basePaymentMethodInput(
  overrides: Partial<PaymentMethodInput> = {},
): PaymentMethodInput {
  return {
    type: "BANK_WIRE",
    label: "Test Account",
    isDefault: false,
    fields: [{ key: "bank_name", label: "Bank Name", value: "Test Bank" }],
    ...overrides,
  };
}

function baseProjectInput(overrides: Partial<ProjectInput>): ProjectInput {
  return {
    name: "[test] Project",
    abbreviation: "",
    clientId: "",
    contractorId: "",
    preferredPaymentMethodId: "",
    invoiceNumberFormat: "{abbreviation}-{number}-{date}",
    currencyMode: "SINGLE",
    displayCurrency: "USD",
    status: "ACTIVE",
    ...overrides,
  };
}

afterEach(async () => {
  if (createdInvoiceIds.length) {
    await prisma.invoice.deleteMany({
      where: { id: { in: createdInvoiceIds.splice(0) } },
    });
  }
  if (createdProjectIds.length) {
    await prisma.project.deleteMany({
      where: { id: { in: createdProjectIds.splice(0) } },
    });
  }
  if (createdPartyIds.length) {
    await prisma.party.deleteMany({
      where: { id: { in: createdPartyIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("deriveAbbreviation", () => {
  it("takes the initials of each word in a multi-word name", () => {
    expect(deriveAbbreviation("Torque Gears")).toBe("TG");
    expect(deriveAbbreviation("Acme Robotics Inc")).toBe("ARI");
  });

  it("falls back to the first two characters for a single-word name", () => {
    expect(deriveAbbreviation("Torque")).toBe("TO");
  });
});

describe("projectService", () => {
  it("creates a project linking a contractor and a client", async () => {
    const contractor = await createTestParty("[test] Contractor");
    const client = await createTestParty("[test] Client");

    const project = await projectService.create(
      baseProjectInput({
        name: "[test] Ongoing Support",
        contractorId: contractor.id,
        clientId: client.id,
      }),
    );
    createdProjectIds.push(project.id);

    expect(project.contractorId).toBe(contractor.id);
    expect(project.clientId).toBe(client.id);
    expect(project.displayCurrency).toBe("USD");
    expect(project.status).toBe("ACTIVE");
  });

  it("auto-derives the abbreviation from the project name when left blank", async () => {
    const contractor = await createTestParty("[test] Abbrev Contractor");
    const client = await createTestParty("[test] Abbrev Client");

    const project = await projectService.create(
      baseProjectInput({
        name: "Torque Gears",
        contractorId: contractor.id,
        clientId: client.id,
        abbreviation: "",
      }),
    );
    createdProjectIds.push(project.id);

    expect(project.abbreviation).toBe("TG");
  });

  it("uses the explicit abbreviation when provided, instead of deriving one", async () => {
    const contractor = await createTestParty("[test] Explicit Contractor");
    const client = await createTestParty("[test] Explicit Client");

    const project = await projectService.create(
      baseProjectInput({
        name: "[test] Gearbox Ventures",
        contractorId: contractor.id,
        clientId: client.id,
        abbreviation: "GV",
      }),
    );
    createdProjectIds.push(project.id);

    expect(project.abbreviation).toBe("GV");
  });

  it("accepts a preferred payment method that belongs to the selected contractor", async () => {
    const contractor = await createTestParty("[test] PPM Contractor");
    const client = await createTestParty("[test] PPM Client");
    const method = await paymentMethodService.create(
      contractor.id,
      basePaymentMethodInput(),
    );

    const project = await projectService.create(
      baseProjectInput({
        name: "[test] PPM Project",
        contractorId: contractor.id,
        clientId: client.id,
        preferredPaymentMethodId: method.id,
      }),
    );
    createdProjectIds.push(project.id);

    expect(project.preferredPaymentMethodId).toBe(method.id);
  });

  it("rejects a preferred payment method that belongs to a different party", async () => {
    const contractor = await createTestParty("[test] Mismatch Contractor");
    const otherParty = await createTestParty("[test] Mismatch Other");
    const client = await createTestParty("[test] Mismatch Client");
    const otherPartysMethod = await paymentMethodService.create(
      otherParty.id,
      basePaymentMethodInput(),
    );

    await expect(
      projectService.create(
        baseProjectInput({
          name: "[test] Mismatch Project",
          contractorId: contractor.id,
          clientId: client.id,
          preferredPaymentMethodId: otherPartysMethod.id,
        }),
      ),
    ).rejects.toBeInstanceOf(PreferredPaymentMethodMismatchError);
  });

  it("re-validates the preferred payment method on update, not just create", async () => {
    const contractorA = await createTestParty("[test] Update Contractor A");
    const contractorB = await createTestParty("[test] Update Contractor B");
    const client = await createTestParty("[test] Update Client");
    const methodForA = await paymentMethodService.create(
      contractorA.id,
      basePaymentMethodInput(),
    );

    const project = await projectService.create(
      baseProjectInput({
        name: "[test] Update Project",
        contractorId: contractorA.id,
        clientId: client.id,
        preferredPaymentMethodId: methodForA.id,
      }),
    );
    createdProjectIds.push(project.id);

    await expect(
      projectService.update(
        project.id,
        baseProjectInput({
          name: "[test] Update Project",
          contractorId: contractorB.id,
          clientId: client.id,
          preferredPaymentMethodId: methodForA.id,
        }),
      ),
    ).rejects.toBeInstanceOf(PreferredPaymentMethodMismatchError);
  });

  it("deletes a project with zero invoices", async () => {
    const contractor = await createTestParty("[test] Delete Contractor");
    const client = await createTestParty("[test] Delete Client");
    const project = await projectService.create(
      baseProjectInput({
        name: "[test] Deletable Project",
        contractorId: contractor.id,
        clientId: client.id,
      }),
    );

    await expect(projectService.isDeletable(project.id)).resolves.toBe(true);
    await expect(projectService.delete(project.id)).resolves.toBeUndefined();
    await expect(projectService.getById(project.id)).resolves.toBeNull();
  });

  it("blocks deletion when the project has at least one invoice", async () => {
    const contractor = await createTestParty("[test] Invoice Contractor");
    const client = await createTestParty("[test] Invoice Client");
    const project = await projectService.create(
      baseProjectInput({
        name: "[test] Project With Invoice",
        contractorId: contractor.id,
        clientId: client.id,
      }),
    );
    createdProjectIds.push(project.id);

    const invoice = await prisma.invoice.create({
      data: {
        projectId: project.id,
        invoiceNumber: "TEST-001",
        status: "DRAFT",
        issueDate: new Date("2026-01-01"),
        dueDate: new Date("2026-01-15"),
        subtotal: "100.00",
        total: "100.00",
        fromPartySnapshot: {},
        toPartySnapshot: {},
        paymentDetailsSnapshot: [],
      },
    });
    createdInvoiceIds.push(invoice.id);

    await expect(projectService.isDeletable(project.id)).resolves.toBe(false);
    await expect(projectService.delete(project.id)).rejects.toBeInstanceOf(
      ProjectDeletionBlockedError,
    );

    await prisma.invoice.delete({ where: { id: invoice.id } });
    createdInvoiceIds.splice(createdInvoiceIds.indexOf(invoice.id), 1);

    await expect(projectService.isDeletable(project.id)).resolves.toBe(true);
  });
});
