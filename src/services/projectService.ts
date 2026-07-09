import { projectRepository } from "@/repositories/projectRepository";
import type {
  ProjectWriteInput,
  ProjectWithRelations,
} from "@/repositories/projectRepository";
import { paymentMethodRepository } from "@/repositories/paymentMethodRepository";
import type { ProjectInput } from "@/lib/validation/project";
import type { Project } from "@/generated/prisma/client";

/**
 * Thrown when a delete is blocked by a live foreign-key reference
 * (Docs/implementation_decisions.md §18). Callers (server actions) catch this
 * specifically to surface a friendly message instead of a raw DB error.
 */
export class ProjectDeletionBlockedError extends Error {
  constructor() {
    super(
      "This project still has invoices attached to it. Delete its invoices before deleting the project.",
    );
    this.name = "ProjectDeletionBlockedError";
  }
}

/**
 * Thrown when the submitted `preferredPaymentMethodId` doesn't belong to the
 * submitted `contractorId` (Docs/product_spec.md §1.3/Workflow 3). This is a
 * server-side re-check even though the UI's picker only ever offers the
 * contractor's own payment methods — never trust the client-submitted id.
 */
export class PreferredPaymentMethodMismatchError extends Error {
  constructor() {
    super(
      "The selected preferred payment method doesn't belong to the selected contractor.",
    );
    this.name = "PreferredPaymentMethodMismatchError";
  }
}

/**
 * Story 3.1/Docs/implementation_decisions.md §9/§22 — falls back to
 * auto-derived initials of the project name when Abbreviation is left blank.
 * A single-word name takes its first two characters (initials of one word
 * would otherwise collapse to a single, not-very-useful letter).
 */
export function deriveAbbreviation(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return words.map((word) => word[0].toUpperCase()).join("");
}

/** Empty-string optional fields become `null`, never left `undefined` — see partyService's equivalent. */
function nullIfEmpty(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

function toWriteInput(input: ProjectInput): ProjectWriteInput {
  const abbreviation =
    nullIfEmpty(input.abbreviation) ?? deriveAbbreviation(input.name);

  return {
    name: input.name,
    abbreviation,
    clientId: input.clientId,
    contractorId: input.contractorId,
    preferredPaymentMethodId: nullIfEmpty(input.preferredPaymentMethodId),
    invoiceNumberFormat: input.invoiceNumberFormat,
    displayCurrency: input.displayCurrency,
    status: input.status,
  };
}

/** Workflow 3's verification step — never trust the client-submitted pairing. */
async function assertPreferredPaymentMethodBelongsToContractor(
  preferredPaymentMethodId: string | null,
  contractorId: string,
): Promise<void> {
  if (!preferredPaymentMethodId) return;

  const paymentMethod = await paymentMethodRepository.findById(
    preferredPaymentMethodId,
  );
  if (!paymentMethod || paymentMethod.partyId !== contractorId) {
    throw new PreferredPaymentMethodMismatchError();
  }
}

function list(): Promise<ProjectWithRelations[]> {
  return projectRepository.findMany();
}

function getById(id: string): Promise<ProjectWithRelations | null> {
  return projectRepository.findById(id);
}

async function create(input: ProjectInput): Promise<Project> {
  const data = toWriteInput(input);
  await assertPreferredPaymentMethodBelongsToContractor(
    data.preferredPaymentMethodId,
    data.contractorId,
  );
  return projectRepository.create(data);
}

async function update(id: string, input: ProjectInput): Promise<Project> {
  const data = toWriteInput(input);
  await assertPreferredPaymentMethodBelongsToContractor(
    data.preferredPaymentMethodId,
    data.contractorId,
  );
  return projectRepository.update(id, data);
}

/** Story 3.4 — blocked while the project has any Invoice rows. */
async function isDeletable(id: string): Promise<boolean> {
  const invoiceCount = await projectRepository.countInvoices(id);
  return invoiceCount === 0;
}

async function deleteProject(id: string): Promise<void> {
  if (!(await isDeletable(id))) {
    throw new ProjectDeletionBlockedError();
  }
  await projectRepository.delete(id);
}

export const projectService = {
  list,
  getById,
  create,
  update,
  isDeletable,
  delete: deleteProject,
};
