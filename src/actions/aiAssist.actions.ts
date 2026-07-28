"use server";

import { z } from "zod";
import {
  aiAssistService,
  type InvoiceAiContext,
} from "@/services/aiAssistService";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const requestSchema = z.object({
  formType: z.enum(["party", "paymentMethod"]),
  promptText: z.string().trim().min(1),
});

/**
 * The one deliberate exception besides the two
 * file-download Route Handlers: AI-assist stays a Server Action (invoked via
 * startTransition from AIAssistPanel) rather than a fetch route, keeping one
 * mutation pattern. Never throws to the client — provider/parse failures are
 * already swallowed inside aiAssistService/fallbackRunner; a null result
 * here just means "no suggestion available," reported as a normal
 * (non-blocking) result, not an exception.
 *
 * Party/Payment Method only — Invoice goes through `runInvoiceAiAssistAction`
 * below.
 */
export async function runAiAssistAction(
  formType: "party" | "paymentMethod",
  promptText: string,
): Promise<ActionResult<Record<string, unknown>>> {
  const parsed = requestSchema.safeParse({ formType, promptText });
  if (!parsed.success) {
    return { success: false, error: "Enter a prompt first." };
  }

  const suggestion = await aiAssistService.runPrompt(
    parsed.data.formType,
    parsed.data.promptText,
  );

  if (!suggestion || Object.keys(suggestion).length === 0) {
    return {
      success: false,
      error:
        "Couldn't generate a suggestion right now — fill the form by hand.",
    };
  }

  return { success: true, data: suggestion };
}

export type InvoiceAiAssistResult =
  | { responseType: "suggestion"; suggestion: Record<string, unknown> }
  | { responseType: "clarification"; question: string };

/**
 * M18 — the invoice-only path: threads project +
 * current-form-value context into the prompt and can return a clarifying
 * question instead of a suggestion. `promptText` is either the user's fresh
 * prompt, or — when continuing a clarification round — the whole
 * accumulated transcript so far (built client-side in AIAssistPanel, which
 * holds the chat history; this action itself stays stateless).
 */
export async function runInvoiceAiAssistAction(
  promptText: string,
  context: InvoiceAiContext,
): Promise<ActionResult<InvoiceAiAssistResult>> {
  const parsed = z.string().trim().min(1).safeParse(promptText);
  if (!parsed.success) {
    return { success: false, error: "Enter a prompt first." };
  }

  const result = await aiAssistService.runInvoicePrompt({
    promptText: parsed.data,
    context,
  });

  if (!result) {
    return {
      success: false,
      error:
        "Couldn't generate a suggestion right now — fill the form by hand.",
    };
  }

  if (
    result.responseType === "suggestion" &&
    Object.keys(result.suggestion).length === 0
  ) {
    return {
      success: false,
      error:
        "Couldn't generate a suggestion right now — fill the form by hand.",
    };
  }

  return { success: true, data: result };
}
