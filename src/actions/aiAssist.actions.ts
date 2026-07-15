"use server";

import { z } from "zod";
import { aiAssistService, type AiFormType } from "@/services/aiAssistService";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const requestSchema = z.object({
  formType: z.enum(["party", "paymentMethod", "invoice"]),
  promptText: z.string().trim().min(1),
});

/**
 * Docs/execution_plan.md §1 — the one deliberate exception besides the two
 * file-download Route Handlers: AI-assist stays a Server Action (invoked via
 * startTransition from AIAssistPanel) rather than a fetch route, keeping one
 * mutation pattern. Never throws to the client — provider/parse failures are
 * already swallowed inside aiAssistService/fallbackRunner; a null result
 * here just means "no suggestion available," reported as a normal
 * (non-blocking) result, not an exception.
 */
export async function runAiAssistAction(
  formType: AiFormType,
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
