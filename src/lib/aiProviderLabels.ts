import type { AiProviderName } from "@/lib/ai-providers/types";

/**
 * Deliberately its own plain module, not exported from
 * ProviderSettingsCard.tsx — that file is `"use client"`, and a server
 * component (src/app/settings/page.tsx) importing a plain non-component
 * export from a client module doesn't reliably resolve under Next.js's RSC
 * bundling (it silently comes through as `undefined` at runtime instead of
 * erroring, which is what actually happened here). Constants shared across
 * the client/server boundary need a plain module like this one.
 */
export const PROVIDER_LABELS: Record<AiProviderName, string> = {
  google: "Google (Gemini)",
  anthropic: "Anthropic (Claude)",
  groq: "Groq",
};
