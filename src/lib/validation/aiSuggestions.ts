import { z } from "zod";
import { partySchema } from "@/lib/validation/party";
import { paymentMethodSchema } from "@/lib/validation/paymentMethod";
import { invoiceSchema } from "@/lib/validation/invoice";

/**
 * Docs/execution_plan.md §16 M11 — AI-assist suggestions are validated
 * against the SAME zod schemas the manual form submission uses, just made
 * partial: the assistant is expected to omit any field it can't confidently
 * fill (Docs/implementation_decisions.md §19's "staging only" rule means the
 * admin still supplies/corrects the rest by hand before submitting).
 */
export const partySuggestionSchema = partySchema.partial();
export const paymentMethodSuggestionSchema = paymentMethodSchema.partial();
export const invoiceSuggestionSchema = invoiceSchema.partial();

export type PartySuggestion = z.infer<typeof partySuggestionSchema>;
export type PaymentMethodSuggestion = z.infer<
  typeof paymentMethodSuggestionSchema
>;
export type InvoiceSuggestion = z.infer<typeof invoiceSuggestionSchema>;

/**
 * Docs/feedback_backlog.md M18 (AI-assist context + clarification) —
 * invoice-only: the model's response is either a confident suggestion
 * (same shape as before) or a single clarifying question when it can't
 * proceed without an answer. Party/Payment Method forms are unchanged and
 * never use this — they always return a plain `invoiceSuggestionSchema`-
 * shaped object via the original single-shot path.
 */
export const invoiceAssistResponseSchema = z.discriminatedUnion(
  "responseType",
  [
    z.object({
      responseType: z.literal("suggestion"),
      suggestion: invoiceSuggestionSchema,
    }),
    z.object({
      responseType: z.literal("clarification"),
      question: z.string().trim().min(1),
    }),
  ],
);

export type InvoiceAssistResponse = z.infer<typeof invoiceAssistResponseSchema>;
