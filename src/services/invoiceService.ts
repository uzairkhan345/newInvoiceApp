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
import type { Invoice, InvoiceStatus } from "@/generated/prisma/client";

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

/**
 * Docs/implementation_decisions.md §10 — the hardcoded transition matrix;
 * anything not listed here is rejected regardless of what the UI sent.
 */
export class InvalidTransitionError extends Error {
  constructor(from: InvoiceStatus, to: InvoiceStatus) {
    super(`An invoice can't move from ${from} to ${to}.`);
    this.name = "InvalidTransitionError";
  }
}

/** Docs/mvp_user_stories.md Story 4.4 — one or more send-blocking reasons. */
export class InvoiceSendValidationError extends Error {
  reasons: string[];
  constructor(reasons: string[]) {
    super(reasons.join(" "));
    this.name = "InvoiceSendValidationError";
    this.reasons = reasons;
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

/**
 * Docs/product_spec.md §1.5 — amount is always backend-calculated from
 * quantity × unitPrice, never trusted from the client — for Hourly items.
 * M14 adds one narrow, deliberate exception: a Flat item (`isFlatAmount`)
 * has no quantity/unitPrice at all, and its `amount` IS trusted directly
 * from the client, since there is nothing to compute it from.
 */
function computeItems(items: InvoiceInput["items"]): InvoiceItemWriteInput[] {
  return items.map((item, index) => {
    if (item.isFlatAmount) {
      return {
        description: item.description,
        isFlatAmount: true,
        quantity: null,
        unitPrice: null,
        amount: new Prisma.Decimal(item.amount),
        sortOrder: index,
      };
    }
    const quantity = new Prisma.Decimal(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    return {
      description: item.description,
      isFlatAmount: false,
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

/** M14 — plain admin-authored content, never left as `undefined`; blank means "no note". */
function nullIfBlank(value: string | undefined): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
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
    itemsNote: nullIfBlank(input.itemsNote),
    bottomNote: nullIfBlank(input.bottomNote),
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

function listByStatus(status: InvoiceStatus): Promise<InvoiceListItem[]> {
  return invoiceRepository.findMany({ status });
}

/** Dashboard (M10) — stats row counts (Docs/ui_design_guide.md §16). */
function countByStatus(status: InvoiceStatus): Promise<number> {
  return invoiceRepository.countByStatus(status);
}

/** Dashboard (M10) — USD-only outstanding subtext for the Sent/Unpaid stat. */
function sumSubtotalByStatus(status: InvoiceStatus): Promise<Prisma.Decimal> {
  return invoiceRepository.sumSubtotalByStatus(status);
}

/** Dashboard (M10) — Needs Attention's overdue set. */
function listOverdue(): Promise<InvoiceListItem[]> {
  return invoiceRepository.findOverdueCandidates();
}

/** Dashboard (M10) — Recent Activity's invoice-side lifecycle events. */
function listRecentActivity(limit: number): Promise<InvoiceListItem[]> {
  return invoiceRepository.findRecentByStatuses(
    ["SENT", "PAID", "VOID"],
    limit,
  );
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

/**
 * Docs/execution_plan.md §8 / Docs/implementation_decisions.md §10 — the
 * only authoritative transition rules; enforced here regardless of what the
 * UI sent, per Story 5.5.
 */
const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "VOID"],
  PAID: [],
  VOID: [],
};

/** Docs/mvp_user_stories.md Story 4.4 — the DRAFT→SENT send-validation checklist. */
function collectSendValidationReasons(
  existing: InvoiceWithItems,
  project: ProjectWithRelations,
): string[] {
  const reasons: string[] = [];

  if (existing.items.length === 0) {
    reasons.push("Add at least one line item before sending.");
  }
  if (!existing.invoiceNumber.trim()) {
    reasons.push("Invoice number is required before sending.");
  }
  if (!existing.issueDate) {
    reasons.push("Issue date is required before sending.");
  }
  if (!existing.dueDate) {
    reasons.push("Due date is required before sending.");
  }
  if (
    existing.issueDate &&
    existing.dueDate &&
    existing.dueDate.getTime() < existing.issueDate.getTime()
  ) {
    reasons.push("Due date must be on or after the issue date.");
  }
  if (project.displayCurrency !== "USD" && existing.convertedTotal == null) {
    reasons.push(
      `Enter a converted total in ${project.displayCurrency} before sending.`,
    );
  }

  return reasons;
}

/** Docs/mvp_user_stories.md Story 4.4 — throws with every applicable reason when incomplete. */
async function validateForSend(id: string): Promise<void> {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new InvoiceNotFoundError();
  const project = await loadProjectOrThrow(existing.projectId);

  const reasons = collectSendValidationReasons(existing, project);
  if (reasons.length > 0) throw new InvoiceSendValidationError(reasons);
}

/**
 * Docs/implementation_decisions.md §10/§11 — enforces the transition matrix
 * and, only for DRAFT→SENT, performs the one final snapshot recompute
 * (covering any live edits since the last draft save) before permanently
 * locking. No other transition touches snapshot fields.
 */
async function transitionStatus(
  id: string,
  target: InvoiceStatus,
): Promise<Invoice> {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new InvoiceNotFoundError();

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(target)) {
    throw new InvalidTransitionError(existing.status, target);
  }

  if (target !== "SENT") {
    return invoiceRepository.updateStatus(id, target);
  }

  const project = await loadProjectOrThrow(existing.projectId);
  const reasons = collectSendValidationReasons(existing, project);
  if (reasons.length > 0) throw new InvoiceSendValidationError(reasons);

  const isNonUsd = project.displayCurrency !== "USD";
  return invoiceRepository.updateStatus(id, "SENT", {
    ...buildSnapshots(project),
    convertedTotal: isNonUsd ? existing.convertedTotal : null,
    convertedCurrency: isNonUsd ? project.displayCurrency : null,
  });
}

/** Story 5.6 — deletable in any status; this is what unblocks Project deletion. */
async function remove(id: string): Promise<void> {
  const existing = await invoiceRepository.findById(id);
  if (!existing) throw new InvoiceNotFoundError();
  await invoiceRepository.deleteById(id);
}

export const invoiceService = {
  list,
  listByStatus,
  getById,
  previewNextInvoiceNumber,
  createDraft,
  updateDraft,
  validateForSend,
  transitionStatus,
  delete: remove,
  countByStatus,
  sumSubtotalByStatus,
  listOverdue,
  listRecentActivity,
};
