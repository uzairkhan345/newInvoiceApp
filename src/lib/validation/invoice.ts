import { z } from "zod";

/** Up to 2 decimal places, matching Decimal(10,2)/Decimal(12,2) column precision. */
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

const quantitySchema = z
  .string()
  .trim()
  .refine((value) => DECIMAL_PATTERN.test(value) && Number(value) > 0, {
    message: "Quantity must be greater than 0",
  });

const unitPriceSchema = z
  .string()
  .trim()
  .refine((value) => DECIMAL_PATTERN.test(value) && Number(value) >= 0, {
    message: "Unit price must be zero or greater",
  });

/**
 * Docs/mvp_user_stories.md Story 4.1/4.2 — description/quantity/unitPrice
 * per line item; amount is always backend-calculated (Docs/product_spec.md
 * §1.5), never accepted from the client.
 */
export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  quantity: quantitySchema,
  unitPrice: unitPriceSchema,
});

/**
 * Docs/mvp_user_stories.md Story 4.1 — invoiceNumber/issueDate/dueDate are
 * always required; convertedTotal is optional here regardless of the
 * project's DisplayCurrency (the "required before SEND if non-USD" rule is
 * Story 4.4's validateForSend, which is M6's job, not draft-save time).
 * At least one line item is required at this stage for UX (M5), even though
 * the backend-enforced "must have ≥1 item before send" gate is also M6.
 */
export const invoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1, "Invoice number is required"),
  issueDate: z.string().trim().min(1, "Issue date is required"),
  dueDate: z.string().trim().min(1, "Due date is required"),
  convertedTotal: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((value) => !value || DECIMAL_PATTERN.test(value), {
      message: "Enter a valid amount",
    }),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
