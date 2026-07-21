import { paymentMethodRepository } from "@/repositories/paymentMethodRepository";
import type {
  PaymentMethodField,
  PaymentMethodWriteInput,
} from "@/repositories/paymentMethodRepository";
import type { PaymentMethodInput } from "@/lib/validation/paymentMethod";
import type { PaymentMethod } from "@/generated/prisma/client";
import { encryptSecret, decryptSecret } from "@/lib/crypto/settingsEncryption";

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

/**
 * Docs/feedback_backlog.md M17.5 — only `value` is encrypted (the actual
 * banking detail); `key`/`label` are just field labels like "Account Number"
 * and aren't sensitive, and encrypting them would break nothing but gain
 * nothing either.
 */
function encryptFields(fields: PaymentMethodField[]): PaymentMethodField[] {
  return fields.map((field) => ({
    ...field,
    value: encryptSecret(field.value),
  }));
}

function decryptFields(fields: PaymentMethodField[]): PaymentMethodField[] {
  return fields.map((field) => ({
    ...field,
    value: decryptSecret(field.value),
  }));
}

function decryptPaymentMethod(method: PaymentMethod): PaymentMethod {
  return {
    ...method,
    fields: decryptFields(
      method.fields as unknown as PaymentMethodField[],
    ) as unknown as PaymentMethod["fields"],
  };
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
    fields: encryptFields(input.fields),
  };
}

async function listForParty(partyId: string): Promise<PaymentMethod[]> {
  const methods = await paymentMethodRepository.findByParty(partyId);
  return methods.map(decryptPaymentMethod);
}

async function getById(id: string): Promise<PaymentMethod | null> {
  const method = await paymentMethodRepository.findById(id);
  return method ? decryptPaymentMethod(method) : null;
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
  const created = await paymentMethodRepository.create(
    toWriteInput(partyId, input),
  );
  return decryptPaymentMethod(created);
}

async function update(
  id: string,
  partyId: string,
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  if (input.isDefault) {
    await paymentMethodRepository.unsetDefaultForParty(partyId, id);
  }
  const updated = await paymentMethodRepository.update(id, {
    type: input.type,
    label: input.label,
    isDefault: input.isDefault,
    fields: encryptFields(input.fields),
  });
  return decryptPaymentMethod(updated);
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
