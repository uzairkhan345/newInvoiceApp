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
