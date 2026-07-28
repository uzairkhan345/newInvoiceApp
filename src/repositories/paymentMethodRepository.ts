import { prisma } from "@/lib/prisma";
import type {
  PaymentMethod,
  PaymentMethodType,
  Prisma,
} from "@/generated/prisma/client";

/**
 * Thin Prisma wrappers only — no validation, no business rules
 *. `fields` is the ordered {key,label,value}[]
 * array (Docs/product_spec.md §2) — array position IS the persisted order.
 */
export type PaymentMethodField = { key: string; label: string; value: string };

export type PaymentMethodWriteInput = {
  partyId: string;
  type: PaymentMethodType;
  label: string;
  isDefault: boolean;
  fields: PaymentMethodField[];
};

function findByParty(partyId: string): Promise<PaymentMethod[]> {
  return prisma.paymentMethod.findMany({
    where: { partyId },
    orderBy: { createdAt: "asc" },
  });
}

function findById(id: string): Promise<PaymentMethod | null> {
  return prisma.paymentMethod.findUnique({ where: { id } });
}

function create(data: PaymentMethodWriteInput): Promise<PaymentMethod> {
  return prisma.paymentMethod.create({
    data: {
      partyId: data.partyId,
      type: data.type,
      label: data.label,
      isDefault: data.isDefault,
      fields: data.fields as Prisma.InputJsonValue,
    },
  });
}

function update(
  id: string,
  data: Omit<PaymentMethodWriteInput, "partyId">,
): Promise<PaymentMethod> {
  return prisma.paymentMethod.update({
    where: { id },
    data: {
      type: data.type,
      label: data.label,
      isDefault: data.isDefault,
      fields: data.fields as Prisma.InputJsonValue,
    },
  });
}

function deleteById(id: string): Promise<PaymentMethod> {
  return prisma.paymentMethod.delete({ where: { id } });
}

/**
 * Un-sets any currently-default payment method for the party, optionally
 * excluding one id (the row being updated, so re-saving an already-default
 * method doesn't need to briefly race itself). Called by paymentMethodService
 * before create/update whenever the incoming row is marked default
 * (Docs/implementation_decisions.md §22).
 */
function unsetDefaultForParty(
  partyId: string,
  excludeId?: string,
): Promise<Prisma.BatchPayload> {
  return prisma.paymentMethod.updateMany({
    where: {
      partyId,
      isDefault: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    data: { isDefault: false },
  });
}

/**
 * Live-reference check, same pattern as
 * partyRepository.isReferencedByAnyProject — queries Project directly. Was
 * already fully live as of M3 (before projectRepository existed); stays a
 * direct query now that it does, for the same reason (
 * §16 M4).
 */
function isReferencedAsPreferredPaymentMethod(
  paymentMethodId: string,
): Promise<boolean> {
  return prisma.project
    .count({ where: { preferredPaymentMethodId: paymentMethodId } })
    .then((count) => count > 0);
}

export const paymentMethodRepository = {
  findByParty,
  findById,
  create,
  update,
  delete: deleteById,
  unsetDefaultForParty,
  isReferencedAsPreferredPaymentMethod,
};
