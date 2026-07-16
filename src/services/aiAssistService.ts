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
  "itemsNote": string (an optional note describing the line items as a whole, only if the prompt gives one),
  "bottomNote": string (a separate optional note shown near the bottom of the document, only if the prompt gives one),
  "items": [
    {
      "description": string,
      "isFlatAmount": boolean (true for a flat lump-sum item with no hours/rate; false, the default, for an hourly item),
      "quantity": string (plain decimal; only for an hourly item, i.e. isFlatAmount is false),
      "unitPrice": string (plain decimal, USD; only for an hourly item),
      "amount": string (plain decimal, USD; only for a flat item, i.e. isFlatAmount is true — never set this for an hourly item, its amount is always computed from quantity × unitPrice)
    }, ...
  ]
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
