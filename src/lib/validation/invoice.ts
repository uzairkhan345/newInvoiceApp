import { z } from "zod";

/** Up to 2 decimal places, matching Decimal(10,2)/Decimal(12,2) column precision. */
const DECIMAL_PATTERN = /^\d+(\.\d{1,2})?$/;

function isValidDecimal(value: string, allowZero: boolean): boolean {
  if (!DECIMAL_PATTERN.test(value)) return false;
  const num = Number(value);
  return allowZero ? num >= 0 : num > 0;
}

/**
 * Docs/mvp_user_stories.md Story 4.1/4.2 — description plus a per-item
 * Hourly/Flat toggle (M14, Docs/implementation_decisions.md §10):
 * Hourly requires quantity/unitPrice (amount is always backend-calculated
 * from them, never accepted from the client — Docs/product_spec.md §1.5);
 * Flat requires `amount` directly from the client instead (the one narrow,
 * deliberate exception to that rule) and leaves quantity/unitPrice blank.
 * `invoiceItemBaseSchema` is exported unrefined so aiSuggestions.ts can
 * `.partial()` it — `.partial()` doesn't compose with the `superRefine()`-
 * wrapped `invoiceItemSchema` below (a ZodEffects, not a ZodObject).
 */
export const invoiceItemBaseSchema = z.object({
  description: z.string().trim().min(1, "Description is required"),
  isFlatAmount: z.boolean(),
  quantity: z.string().trim(),
  unitPrice: z.string().trim(),
  amount: z.string().trim(),
});

export const invoiceItemSchema = invoiceItemBaseSchema.superRefine(
  (item, ctx) => {
    if (item.isFlatAmount) {
      if (!isValidDecimal(item.amount, true)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Amount must be zero or greater",
        });
      }
      return;
    }
    if (!isValidDecimal(item.quantity, false)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["quantity"],
        message: "Quantity must be greater than 0",
      });
    }
    if (!isValidDecimal(item.unitPrice, true)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitPrice"],
        message: "Unit price must be zero or greater",
      });
    }
  },
);

/**
 * Docs/mvp_user_stories.md Story 4.1 — invoiceNumber/issueDate/dueDate are
 * always required; convertedTotal is optional here regardless of the
 * project's DisplayCurrency (the "required before SEND if non-USD" rule is
 * Story 4.4's validateForSend, which is M6's job, not draft-save time).
 * At least one line item is required at this stage for UX (M5), even though
 * the backend-enforced "must have ≥1 item before send" gate is also M6.
 * `itemsNote`/`bottomNote` (M14) are both independently optional, plain
 * admin-authored content — not a snapshot of live external data.
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
  itemsNote: z.string().trim().optional().or(z.literal("")),
  bottomNote: z.string().trim().optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
