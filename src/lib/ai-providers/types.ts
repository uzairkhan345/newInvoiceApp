export type AiProviderName = "google" | "anthropic" | "groq";

export type AiProviderTarget = {
  provider: AiProviderName;
  model: string;
};

/**
 * Every provider is asked to return raw text expected to be a single JSON
 * object (fallbackRunner.ts parses/validates it) — no provider SDK is used,
 * just each vendor's plain REST API, so no new dependency is needed for a
 * feature that's pure progressive enhancement.
 */
export type AiProviderCaller = (params: {
  model: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}) => Promise<string>;
