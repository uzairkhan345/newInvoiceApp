// @vitest-environment node
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  invoiceService,
  InvoiceNotDraftError,
  DuplicateInvoiceNumberError,
  InvalidTransitionError,
  InvoiceSendValidationError,
  InvoiceNotFoundError,
} from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { partyService } from "@/services/partyService";
import { paymentMethodService } from "@/services/paymentMethodService";
import { prisma } from "@/lib/prisma";
import type { InvoiceInput } from "@/lib/validation/invoice";
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

async function createTestParty(overrides: Partial<PartyInput> = {}) {
  const party = await partyService.create(basePartyInput(overrides));
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
    abbreviation: "TP",
    clientId: "",
    contractorId: "",
    preferredPaymentMethodId: "",
    invoiceNumberFormat: "{abbreviation}-{number}",
    displayCurrency: "USD",
    status: "ACTIVE",
    ...overrides,
  };
}

async function createTestProject(overrides: Partial<ProjectInput> = {}) {
  const contractor = await createTestParty({ name: "[test] Contractor" });
  const client = await createTestParty({ name: "[test] Client" });
  const paymentMethod = await paymentMethodService.create(
    contractor.id,
    basePaymentMethodInput(),
  );

  const project = await projectService.create(
    baseProjectInput({
      contractorId: contractor.id,
      clientId: client.id,
      preferredPaymentMethodId: paymentMethod.id,
      ...overrides,
    }),
  );
  createdProjectIds.push(project.id);

  return { project, contractor, client, paymentMethod };
}

function baseInvoiceInput(overrides: Partial<InvoiceInput> = {}): InvoiceInput {
  return {
    invoiceNumber: "TP-01",
    issueDate: "2026-01-01",
    dueDate: "2026-01-15",
    convertedTotal: "",
    items: [{ description: "Consulting", quantity: "2", unitPrice: "150.00" }],
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

describe("invoiceService.createDraft", () => {
  it("computes line amount, subtotal, and total from quantity × unitPrice", async () => {
    const { project } = await createTestProject();

    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({
        items: [
          { description: "Design", quantity: "3", unitPrice: "100.00" },
          { description: "Development", quantity: "10", unitPrice: "50.50" },
        ],
      }),
    );
    createdInvoiceIds.push(invoice.id);

    expect(invoice.subtotal.toString()).toBe("805");
    expect(invoice.total.toString()).toBe("805");
  });

  it("ignores any client-submitted amount/subtotal/total and always recomputes them", async () => {
    const { project } = await createTestProject();

    // A tampered payload that includes fields the real InvoiceInput type
    // doesn't even expose — simulating a client that bypassed the form and
    // hit the service/action directly with extra bogus values.
    const tamperedInput = {
      ...baseInvoiceInput({
        items: [{ description: "Consulting", quantity: "1", unitPrice: "10" }],
      }),
      subtotal: "999999.99",
      total: "999999.99",
    } as InvoiceInput & { subtotal: string; total: string };
    (tamperedInput.items[0] as unknown as { amount: string }).amount =
      "999999.99";

    const invoice = await invoiceService.createDraft(project.id, tamperedInput);
    createdInvoiceIds.push(invoice.id);

    expect(invoice.subtotal.toString()).toBe("10");
    expect(invoice.total.toString()).toBe("10");
  });

  it("always sets total equal to subtotal — no tax anywhere", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);

    expect(invoice.total.toString()).toBe(invoice.subtotal.toString());
  });

  it("snapshots the contractor, client, and preferred payment method's live fields", async () => {
    const { project, contractor, client, paymentMethod } =
      await createTestProject();

    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);

    expect(invoice.fromPartySnapshot).toMatchObject({ name: contractor.name });
    expect(invoice.toPartySnapshot).toMatchObject({ name: client.name });
    expect(invoice.paymentDetailsSnapshot).toEqual(paymentMethod.fields);
  });

  it("persists convertedTotal only when the project's DisplayCurrency isn't USD", async () => {
    const { project: usdProject } = await createTestProject();
    const usdInvoice = await invoiceService.createDraft(
      usdProject.id,
      baseInvoiceInput({ convertedTotal: "500" }),
    );
    createdInvoiceIds.push(usdInvoice.id);
    expect(usdInvoice.convertedTotal).toBeNull();
    expect(usdInvoice.convertedCurrency).toBeNull();

    const { project: audProject } = await createTestProject({
      displayCurrency: "AUD",
    });
    const audInvoice = await invoiceService.createDraft(
      audProject.id,
      baseInvoiceInput({ invoiceNumber: "TP-02", convertedTotal: "750.50" }),
    );
    createdInvoiceIds.push(audInvoice.id);
    expect(audInvoice.convertedTotal?.toString()).toBe("750.5");
    expect(audInvoice.convertedCurrency).toBe("AUD");
  });

  it("rejects a duplicate invoice number within the same project with a friendly error", async () => {
    const { project } = await createTestProject();
    const first = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ invoiceNumber: "TP-DUP" }),
    );
    createdInvoiceIds.push(first.id);

    await expect(
      invoiceService.createDraft(
        project.id,
        baseInvoiceInput({ invoiceNumber: "TP-DUP" }),
      ),
    ).rejects.toBeInstanceOf(DuplicateInvoiceNumberError);
  });
});

describe("invoiceService.updateDraft", () => {
  it("recomputes the snapshot from current live data on every save (Story 6.1)", async () => {
    const { project, contractor } = await createTestProject();

    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    expect(invoice.fromPartySnapshot).toMatchObject({
      email: null,
    });

    await partyService.update(contractor.id, {
      ...basePartyInput({ name: contractor.name }),
      email: "updated@test.example",
    });

    const updated = await invoiceService.updateDraft(
      invoice.id,
      baseInvoiceInput(),
    );

    expect(updated.fromPartySnapshot).toMatchObject({
      email: "updated@test.example",
    });
  });

  it("recalculates totals after a line item change", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({
        items: [{ description: "Consulting", quantity: "1", unitPrice: "100" }],
      }),
    );
    createdInvoiceIds.push(invoice.id);
    expect(invoice.subtotal.toString()).toBe("100");

    const updated = await invoiceService.updateDraft(
      invoice.id,
      baseInvoiceInput({
        items: [
          { description: "Consulting", quantity: "1", unitPrice: "100" },
          { description: "Extra", quantity: "2", unitPrice: "25" },
        ],
      }),
    );

    expect(updated.subtotal.toString()).toBe("150");
  });

  it("throws InvoiceNotDraftError when the invoice is no longer DRAFT", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);

    // M6 owns the real transitionStatus — flip status directly here to
    // simulate a SENT invoice for this M5-scoped guard test.
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT" },
    });

    await expect(
      invoiceService.updateDraft(invoice.id, baseInvoiceInput()),
    ).rejects.toBeInstanceOf(InvoiceNotDraftError);
  });
});

describe("invoiceService.previewNextInvoiceNumber", () => {
  it("computes the next sequence number for a fresh project", async () => {
    const { project } = await createTestProject();
    const preview = await invoiceService.previewNextInvoiceNumber(project.id);
    expect(preview).toBe("TP-01");
  });

  it("advances past existing invoice numbers, skipping any gap left by a deletion", async () => {
    const { project } = await createTestProject();
    const first = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ invoiceNumber: "TP-01" }),
    );
    const second = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ invoiceNumber: "TP-05" }),
    );
    createdInvoiceIds.push(first.id, second.id);

    const preview = await invoiceService.previewNextInvoiceNumber(project.id);
    expect(preview).toBe("TP-06");
  });
});

describe("invoiceService.validateForSend", () => {
  it("rejects when there are no line items", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ items: [] }),
    );
    createdInvoiceIds.push(invoice.id);

    await expect(
      invoiceService.validateForSend(invoice.id),
    ).rejects.toBeInstanceOf(InvoiceSendValidationError);
  });

  it("rejects when the due date is before the issue date", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ issueDate: "2026-02-01", dueDate: "2026-01-01" }),
    );
    createdInvoiceIds.push(invoice.id);

    await expect(
      invoiceService.validateForSend(invoice.id),
    ).rejects.toBeInstanceOf(InvoiceSendValidationError);
  });

  it("rejects when the project's non-USD DisplayCurrency has no convertedTotal", async () => {
    const { project } = await createTestProject({ displayCurrency: "AUD" });
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ convertedTotal: "" }),
    );
    createdInvoiceIds.push(invoice.id);

    await expect(
      invoiceService.validateForSend(invoice.id),
    ).rejects.toBeInstanceOf(InvoiceSendValidationError);
  });

  it("resolves without throwing when every requirement is met", async () => {
    const { project } = await createTestProject({ displayCurrency: "AUD" });
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ convertedTotal: "500" }),
    );
    createdInvoiceIds.push(invoice.id);

    await expect(
      invoiceService.validateForSend(invoice.id),
    ).resolves.toBeUndefined();
  });
});

describe("invoiceService.transitionStatus", () => {
  it("DRAFT -> SENT succeeds and locks a final recompute of the snapshot", async () => {
    const { project, contractor } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);

    // Edit the source party after the last draft save but before sending —
    // the one final recompute at SENT (Story 6.2) should still pick this up.
    await partyService.update(contractor.id, {
      ...basePartyInput({ name: contractor.name }),
      email: "final-recompute@test.example",
    });

    const sent = await invoiceService.transitionStatus(invoice.id, "SENT");
    expect(sent.status).toBe("SENT");
    expect(sent.fromPartySnapshot).toMatchObject({
      email: "final-recompute@test.example",
    });

    // A later party edit must never affect the now-locked SENT snapshot.
    await partyService.update(contractor.id, {
      ...basePartyInput({ name: contractor.name }),
      email: "after-sent@test.example",
    });
    const reFetched = await invoiceService.getById(invoice.id);
    expect(reFetched?.fromPartySnapshot).toMatchObject({
      email: "final-recompute@test.example",
    });
  });

  it("createDraft -> updateDraft -> transitionStatus(SENT), then a source-party mutation leaves the SENT snapshot unchanged", async () => {
    const { project, contractor } = await createTestProject();

    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({
        items: [{ description: "Consulting", quantity: "1", unitPrice: "100" }],
      }),
    );
    createdInvoiceIds.push(invoice.id);

    const updated = await invoiceService.updateDraft(
      invoice.id,
      baseInvoiceInput({
        items: [{ description: "Consulting", quantity: "2", unitPrice: "100" }],
      }),
    );
    expect(updated.subtotal.toString()).toBe("200");

    const sent = await invoiceService.transitionStatus(invoice.id, "SENT");
    expect(sent.status).toBe("SENT");
    expect(sent.fromPartySnapshot).toMatchObject({ name: contractor.name });

    await partyService.update(contractor.id, {
      ...basePartyInput({ name: "Renamed After Send" }),
    });

    const reFetched = await invoiceService.getById(invoice.id);
    expect(reFetched?.fromPartySnapshot).toMatchObject({
      name: contractor.name,
    });
    expect(reFetched?.subtotal.toString()).toBe("200");
  });

  it("DRAFT -> VOID succeeds", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);

    const voided = await invoiceService.transitionStatus(invoice.id, "VOID");
    expect(voided.status).toBe("VOID");
  });

  it("SENT -> PAID succeeds", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "SENT");

    const paid = await invoiceService.transitionStatus(invoice.id, "PAID");
    expect(paid.status).toBe("PAID");
  });

  it("SENT -> VOID succeeds", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "SENT");

    const voided = await invoiceService.transitionStatus(invoice.id, "VOID");
    expect(voided.status).toBe("VOID");
  });

  it("rejects PAID -> VOID — a paid invoice can never be voided", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "SENT");
    await invoiceService.transitionStatus(invoice.id, "PAID");

    await expect(
      invoiceService.transitionStatus(invoice.id, "VOID"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects any transition back to DRAFT", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "SENT");

    await expect(
      invoiceService.transitionStatus(invoice.id, "DRAFT"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);

    await invoiceService.transitionStatus(invoice.id, "PAID");
    await expect(
      invoiceService.transitionStatus(invoice.id, "DRAFT"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects any transition out of VOID", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "VOID");

    await expect(
      invoiceService.transitionStatus(invoice.id, "SENT"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(
      invoiceService.transitionStatus(invoice.id, "PAID"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects DRAFT -> PAID directly, without passing through SENT", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);

    await expect(
      invoiceService.transitionStatus(invoice.id, "PAID"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects PAID -> SENT — a paid invoice can never revert to sent", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "SENT");
    await invoiceService.transitionStatus(invoice.id, "PAID");

    await expect(
      invoiceService.transitionStatus(invoice.id, "SENT"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("rejects VOID -> DRAFT — VOID is terminal", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    createdInvoiceIds.push(invoice.id);
    await invoiceService.transitionStatus(invoice.id, "VOID");

    await expect(
      invoiceService.transitionStatus(invoice.id, "DRAFT"),
    ).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it("blocks DRAFT -> SENT via validateForSend when send requirements aren't met, leaving the invoice DRAFT", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput({ items: [] }),
    );
    createdInvoiceIds.push(invoice.id);

    await expect(
      invoiceService.transitionStatus(invoice.id, "SENT"),
    ).rejects.toBeInstanceOf(InvoiceSendValidationError);

    const stillDraft = await invoiceService.getById(invoice.id);
    expect(stillDraft?.status).toBe("DRAFT");
  });
});

describe("invoiceService.delete", () => {
  it("deletes a DRAFT invoice and cascades its line items", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );

    await invoiceService.delete(invoice.id);

    expect(await invoiceService.getById(invoice.id)).toBeNull();
    const remainingItems = await prisma.invoiceItem.count({
      where: { invoiceId: invoice.id },
    });
    expect(remainingItems).toBe(0);
  });

  it("deletes an invoice in any status (SENT/PAID/VOID), not just DRAFT", async () => {
    const { project } = await createTestProject();
    const invoice = await invoiceService.createDraft(
      project.id,
      baseInvoiceInput(),
    );
    await invoiceService.transitionStatus(invoice.id, "SENT");
    await invoiceService.transitionStatus(invoice.id, "PAID");

    await invoiceService.delete(invoice.id);
    expect(await invoiceService.getById(invoice.id)).toBeNull();
  });

  it("throws InvoiceNotFoundError for a nonexistent id", async () => {
    await expect(
      invoiceService.delete("nonexistent-id"),
    ).rejects.toBeInstanceOf(InvoiceNotFoundError);
  });
});
