import { partyRepository } from "@/repositories/partyRepository";
import type { PartyWriteInput } from "@/repositories/partyRepository";
import type { PartyInput } from "@/lib/validation/party";
import type { Party } from "@/generated/prisma/client";

/**
 * Thrown when a delete is blocked by a live foreign-key reference
 * (Docs/implementation_decisions.md §18). Callers (server actions) catch this
 * specifically to surface a friendly message instead of a raw DB error.
 */
export class PartyDeletionBlockedError extends Error {
  constructor() {
    super(
      "This party is still assigned to a project as its contractor or client. Remove it from the project (or delete the project) before deleting the party.",
    );
    this.name = "PartyDeletionBlockedError";
  }
}

/** Empty-string optional fields become `null`, never left `undefined` — see partyRepository. */
function toWriteInput(input: PartyInput): PartyWriteInput {
  const nullIfEmpty = (value: string | undefined) =>
    value && value.length > 0 ? value : null;

  return {
    name: input.name,
    email: nullIfEmpty(input.email),
    type: input.type,
    street1: nullIfEmpty(input.street1),
    street2: nullIfEmpty(input.street2),
    city: nullIfEmpty(input.city),
    state: nullIfEmpty(input.state),
    postalCode: nullIfEmpty(input.postalCode),
    country: nullIfEmpty(input.country),
  };
}

function list(): Promise<Party[]> {
  return partyRepository.findMany();
}

function getById(id: string): Promise<Party | null> {
  return partyRepository.findById(id);
}

function create(input: PartyInput): Promise<Party> {
  return partyRepository.create(toWriteInput(input));
}

function update(id: string, input: PartyInput): Promise<Party> {
  return partyRepository.update(id, toWriteInput(input));
}

/** Story 1.3 — blocked while referenced as any Project's contractor or client. */
async function isDeletable(id: string): Promise<boolean> {
  const referenced = await partyRepository.isReferencedByAnyProject(id);
  return !referenced;
}

async function deleteParty(id: string): Promise<void> {
  if (!(await isDeletable(id))) {
    throw new PartyDeletionBlockedError();
  }
  await partyRepository.delete(id);
}

export const partyService = {
  list,
  getById,
  create,
  update,
  isDeletable,
  delete: deleteParty,
};
