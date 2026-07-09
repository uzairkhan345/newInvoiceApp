import { invoiceRepository } from "@/repositories/invoiceRepository";
import type {
  InvoiceItemWriteInput,
  InvoiceListItem,
  InvoiceWithItems,
  InvoiceWriteInput,
} from "@/repositories/invoiceRepository";
import { projectRepository } from "@/repositories/projectRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import { generateInvoiceNumber } from "@/services/invoiceNumberService";
import type { InvoiceInput } from "@/lib/validation/invoice";
import { Prisma } from "@/generated/prisma/client";
import type { Invoice } from "@/generated/prisma/client";

/**
 * Thrown when a projectId doesn't resolve to a real Project — createDraft is
 * always entered from a real project-picker gate, so this only ever fires
 * against a stale/tampered id.
 */
export class ProjectNotFoundError extends Error {
  constructor() {
    super("Project not found.");
    this.name = "ProjectNotFoundError";
  }
}

export class InvoiceNotFoundError extends Error {
  constructor() {
    super("Invoice not found.");
    this.name = "InvoiceNotFoundError";
  }
}

/**
 * Docs/implementation_decisions.md §10/§11 — updateDraft throws immediately
 * if invoked on a non-DRAFT invoice; DRAFT is the only editable status.
 */
export class InvoiceNotDraftError extends Error {
  constructor() {
    super("This invoice is no longer a draft and can't be edited.");
    this.name = "InvoiceNotDraftError";
  }
}

/** Docs/execution_plan.md §9 point 4 — friendly message for a manual-edit collision. */
export class DuplicateInvoiceNumberError extends Error {
  constructor() {
    super(
      "This invoice number is already used by another invoice in this project. Choose a different number.",
    );
    this.name = "DuplicateInvoiceNumberError";
  }
}

function translateWriteError(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new DuplicateInvoiceNumberError();
  }
  return error;
}

type PartySnapshot = {
  name: string;
  email: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

function toPartySnapshot(party: {
  name: string;
  email: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}): PartySnapshot {
  return {
    name: party.name,
    email: party.email,
    street1: party.street1,
    street2: party.street2,
    city: party.city,
    state: party.state,
    postalCode: party.postalCode,
    country: party.country,
  };
}

/**
 * Docs/implementation_decisions.md §11/Story 6.1 — recomputed from current
 * live Party/PaymentMethod data on every DRAFT save, never a stored/cached
 * value re-read from a prior snapshot.
 */
function buildSnapshots(project: ProjectWithRelations) {
  return {
    fromPartySnapshot: toPartySnapshot(project.contractor),
    toPartySnapshot: toPartySnapshot(project.client),
    paymentDetailsSnapshot: project.preferredPaymentMethod?.fields ?? [],
  };
}

/** Docs/product_spec.md §1.5 — amount is always backend-calculated, never trusted from the client. */
function computeItems(items: InvoiceInput["items"]): InvoiceItemWriteInput[] {
  return items.map((item, index) => {
    const quantity = new Prisma.Decimal(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    return {
      description: item.description,
      quantity,
      unitPrice,
      amount: quantity.times(unitPrice),
      sortOrder: index,
    };
  });
}

function sumAmounts(items: InvoiceItemWriteInput[]): Prisma.Decimal {
  return items.reduce(
    (sum, item) => sum.plus(item.amount),
    new Prisma.Decimal(0),
  );
}

function toWriteInput(
  project: ProjectWithRelations,
  input: InvoiceInput,
): InvoiceWriteInput {
  const items = computeItems(input.items);
  const subtotal = sumAmounts(items);
  const isNonUsd = project.displayCurrency !== "USD";

  return {
    projectId: project.id,
    invoiceNumber: input.invoiceNumber,
    issueDate: new Date(input.issueDate),
    dueDate: new Date(input.dueDate),
    subtotal,
    total: subtotal, // Docs/implementation_decisions.md §13 — no tax, Total always equals Subtotal.
    convertedTotal:
      isNonUsd && input.convertedTotal
        ? new Prisma.Decimal(input.convertedTotal)
        : null,
    convertedCurrency: isNonUsd ? project.displayCurrency : null,
    ...buildSnapshots(project),
    items,
  };
}

async function loadProjectOrThrow(
  projectId: string,
): Promise<ProjectWithRelations> {
  const project = await projectRepository.findById(projectId);
  if (!project) throw new ProjectNotFoundError();
  return project;
}

function list(): Promise<InvoiceListItem[]> {
  return invoiceRepository.findMany();
}

function getById(id: string): Promise<InvoiceWithItems | null> {
  return invoiceRepository.findById(id);
}

/**
 * Computes the suggested invoice number shown pre-filled on the create form
 * (Story 4.1). Generation happens once, here — not inside createDraft — since
 * the number must already be visible before the admin's first save, and is a
 * plain editable field from then on (Docs/execution_plan.md §9 point 3).
 */
async function previewNextInvoiceNumber(projectId: string): Promise<string> {
  const project = await loadProjectOrThrow(projectId);
  const existingInvoiceNumbers =
    await invoiceRepository.findInvoiceNumbersForProject(projectId);
  return generateInvoiceNumber({
    project: {
      abbreviation: project.abbreviation,
      name: project.name,
      invoiceNumberFormat: project.invoiceNumberFormat,
    },
    existingInvoiceNumbers,
  });
}

async function createDraft(
  projectId: string,
  input: InvoiceInput,
): Promise<Invoice> {
  const project = await loadProjectOrThrow(projectId);
  try {
    return await invoiceRepository.createWithItems(
      toWriteInput(project, input),
    );
  } catch (error) {
    throw translateWriteError(error);
  }
}

/** Docs/mvp_user_stories.md Story 6.1 — recomputes snapshot + totals on every save while DRAFT. */
async function updateDraft(id: string, input: InvoiceInput): Promise<Invoice> {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new InvoiceNotFoundError();
  if (existing.status !== "DRAFT") throw new InvoiceNotDraftError();

  const project = await loadProjectOrThrow(existing.projectId);
  try {
    return await invoiceRepository.replaceItemsAndUpdate(
      id,
      toWriteInput(project, input),
    );
  } catch (error) {
    throw translateWriteError(error);
  }
}

export const invoiceService = {
  list,
  getById,
  previewNextInvoiceNumber,
  createDraft,
  updateDraft,
};
