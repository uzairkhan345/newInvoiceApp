import { paymentMethodRepository } from "@/repositories/paymentMethodRepository";
import type { PaymentMethodWriteInput } from "@/repositories/paymentMethodRepository";
import type { PaymentMethodInput } from "@/lib/validation/paymentMethod";
import type { PaymentMethod } from "@/generated/prisma/client";

/**
 * Thrown when a delete is blocked by a live foreign-key reference
 * (Docs/implementation_decisions.md §18). Callers (server actions) catch this
 * specifically to surface a friendly message instead of a raw DB error.
 */
export class PaymentMethodDeletionBlockedError extends Error {
  constructor() {
    super(
      "This payment method is set as a project's preferred payment method. Change the project's preferred payment method before deleting it.",
    );
    this.name = "PaymentMethodDeletionBlockedError";
  }
}

function toWriteInput(
  partyId: string,
  input: PaymentMethodInput,
): PaymentMethodWriteInput {
  return {
    partyId,
    type: input.type,
    label: input.label,
    isDefault: input.isDefault,
    fields: input.fields,
  };
}

function listForParty(partyId: string): Promise<PaymentMethod[]> {
  return paymentMethodRepository.findByParty(partyId);
}

function getById(id: string): Promise<PaymentMethod | null> {
  return paymentMethodRepository.findById(id);
}

/**
 * Story 2.1, Docs/implementation_decisions.md §22 — at most one IsDefault per
 * party. Enforced here (not just disabled in the UI): un-set any prior
 * default for this party before writing the new row.
 */
async function create(
  partyId: string,
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  if (input.isDefault) {
    await paymentMethodRepository.unsetDefaultForParty(partyId);
  }
  return paymentMethodRepository.create(toWriteInput(partyId, input));
}

async function update(
  id: string,
  partyId: string,
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  if (input.isDefault) {
    await paymentMethodRepository.unsetDefaultForParty(partyId, id);
  }
  return paymentMethodRepository.update(id, {
    type: input.type,
    label: input.label,
    isDefault: input.isDefault,
    fields: input.fields,
  });
}

/** Story 2.4 — blocked while set as any Project's preferred payment method. */
async function isDeletable(id: string): Promise<boolean> {
  const referenced =
    await paymentMethodRepository.isReferencedAsPreferredPaymentMethod(id);
  return !referenced;
}

async function deletePaymentMethod(id: string): Promise<void> {
  if (!(await isDeletable(id))) {
    throw new PaymentMethodDeletionBlockedError();
  }
  await paymentMethodRepository.delete(id);
}

export const paymentMethodService = {
  listForParty,
  getById,
  create,
  update,
  isDeletable,
  delete: deletePaymentMethod,
};
