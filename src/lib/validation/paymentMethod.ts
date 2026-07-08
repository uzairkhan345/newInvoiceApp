import { z } from "zod";

/**
 * Docs/mvp_user_stories.md Story 2.1/2.2: type/label/default flag plus an
 * ordered, non-empty list of {key,label,value} fields. Array order IS the
 * persisted display order (Docs/product_spec.md §2) — no separate sortOrder
 * needed, unlike InvoiceItem.
 */
export const paymentMethodFieldSchema = z.object({
  key: z.string().trim().min(1, "Key is required"),
  label: z.string().trim().min(1, "Label is required"),
  value: z.string().trim().min(1, "Value is required"),
});

export const paymentMethodSchema = z.object({
  type: z.enum(["BANK_WIRE", "ZELLE", "PAYONEER", "CUSTOM"], {
    message: "Select a payment method type",
  }),
  label: z.string().trim().min(1, "Label is required"),
  isDefault: z.boolean(),
  fields: z.array(paymentMethodFieldSchema).min(1, "Add at least one field"),
});

export type PaymentMethodFieldInput = z.infer<typeof paymentMethodFieldSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
