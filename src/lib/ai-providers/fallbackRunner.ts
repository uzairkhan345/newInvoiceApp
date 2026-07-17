import type { ZodType } from "zod";
import { resolveAiAssistSequence } from "@/lib/ai-providers/config";
import { callGoogle } from "@/lib/ai-providers/google";
import { callAnthropic } from "@/lib/ai-providers/anthropic";
import { callGroq } from "@/lib/ai-providers/groq";
import type {
  AiProviderCaller,
  AiProviderName,
} from "@/lib/ai-providers/types";

const CALLERS: Record<AiProviderName, AiProviderCaller> = {
  google: callGoogle,
  anthropic: callAnthropic,
  groq: callGroq,
};

/** Strips ```json fences a model may wrap its output in despite instructions not to. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate.trim());
}

/**
 * Walks the DB-backed provider→model fallback sequence (M16,
 * Docs/execution_plan.md — providers in cascade order, each provider's
 * models in list order), stopping at the first response that parses as JSON
 * and validates against `schema`. Every per-target failure (network error,
 * non-JSON response, schema mismatch) is logged and swallowed — this never
 * throws, since AI-assist is pure progressive enhancement and must never
 * surface a blocking error to a form.
 */
export async function runWithFallback<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
}): Promise<T | null> {
  const sequence = await resolveAiAssistSequence();

  for (const target of sequence) {
    try {
      const raw = await CALLERS[target.provider]({
        model: target.model,
        apiKey: target.apiKey,
        systemPrompt: params.systemPrompt,
        userPrompt: params.userPrompt,
      });
      const parsed = params.schema.safeParse(extractJson(raw));
      if (parsed.success) {
        return parsed.data;
      }
      console.error(
        `aiAssist: ${target.provider}:${target.model} returned a response that failed schema validation`,
        parsed.error.flatten(),
      );
    } catch (error) {
      console.error(
        `aiAssist: ${target.provider}:${target.model} failed`,
        error,
      );
    }
  }

  return null;
}
