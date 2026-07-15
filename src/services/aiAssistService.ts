import type { ZodType } from "zod";
import { runWithFallback } from "@/lib/ai-providers/fallbackRunner";
import {
  partySuggestionSchema,
  paymentMethodSuggestionSchema,
  invoiceSuggestionSchema,
  type PartySuggestion,
  type PaymentMethodSuggestion,
  type InvoiceSuggestion,
} from "@/lib/validation/aiSuggestions";

export type AiFormType = "party" | "paymentMethod" | "invoice";

const JSON_ONLY_RULE =
  "Respond with ONLY a single raw JSON object — no markdown code fences, no prose before or after. " +
  "Omit any key you cannot confidently determine from the prompt; never invent placeholder values or guess.";

const SYSTEM_PROMPTS: Record<AiFormType, string> = {
  party: `You fill in a "Party" form field (a contractor or client on an invoicing app) from a natural-language description.
${JSON_ONLY_RULE}
JSON shape (all keys optional):
{
  "name": string,
  "email": string,
  "type": "INDIVIDUAL" | "ORGANIZATION",
  "street1": string, "street2": string, "city": string, "state": string, "postalCode": string, "country": string
}`,
  paymentMethod: `You fill in a "Payment Method" form for a specific party on an invoicing app (the owning party is already fixed — never mention or infer one).
${JSON_ONLY_RULE}
JSON shape (all keys optional):
{
  "type": "BANK_WIRE" | "ZELLE" | "PAYONEER" | "CUSTOM",
  "label": string,
  "isDefault": boolean,
  "fields": [ { "key": string, "label": string, "value": string }, ... ]
}
"fields" is an ordered list of the actual payment instruction lines (e.g. account number, routing number, Zelle email) — key is a short machine-friendly id, label is the customer-facing name shown on invoices, value is the actual data.`,
  invoice: `You fill in an invoice's line items and dates on an invoicing app. The contractor, client, and payment method are already fixed by the project and must never appear in your output.
${JSON_ONLY_RULE}
JSON shape (all keys optional):
{
  "invoiceNumber": string,
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "convertedTotal": string (a plain decimal number, only if the prompt gives a converted-currency amount),
  "items": [ { "description": string, "quantity": string (plain decimal), "unitPrice": string (plain decimal, USD) }, ... ]
}`,
};

export type AiSuggestion =
  PartySuggestion | PaymentMethodSuggestion | InvoiceSuggestion;

/**
 * Every suggestion schema is a `.partial()` of a real form schema (see
 * aiSuggestions.ts), so each is individually a `ZodType<AiSuggestion>` by
 * structural widening — cast once here rather than fighting TypeScript's
 * generic inference over a Record-indexed union of distinct object shapes.
 */
const SCHEMAS: Record<AiFormType, ZodType<AiSuggestion>> = {
  party: partySuggestionSchema as ZodType<AiSuggestion>,
  paymentMethod: paymentMethodSuggestionSchema as ZodType<AiSuggestion>,
  invoice: invoiceSuggestionSchema as ZodType<AiSuggestion>,
};

/**
 * Docs/execution_plan.md §5 aiAssistService row — walks the env-configured
 * provider/model fallback sequence, returns a partial, schema-validated
 * suggestion, or null if every provider failed/is unconfigured. Never
 * throws — the caller (the Server Action) always gets a clean result.
 */
async function runPrompt(
  formType: AiFormType,
  promptText: string,
): Promise<AiSuggestion | null> {
  return runWithFallback({
    systemPrompt: SYSTEM_PROMPTS[formType],
    userPrompt: promptText,
    schema: SCHEMAS[formType],
  });
}

export const aiAssistService = { runPrompt };
