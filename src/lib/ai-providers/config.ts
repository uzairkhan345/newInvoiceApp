import type {
  AiProviderName,
  AiProviderTarget,
} from "@/lib/ai-providers/types";

const KNOWN_PROVIDERS: AiProviderName[] = ["google", "anthropic", "groq"];

export type ResolvedAiTarget = AiProviderTarget & { apiKey: string };

export type AiAssistConfigSummary = {
  configured: boolean;
  primary: AiProviderTarget | null;
  fallback: AiProviderTarget[];
};

function apiKeyFor(provider: AiProviderName): string | undefined {
  switch (provider) {
    case "google":
      return process.env.GOOGLE_API_KEY || undefined;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || undefined;
    case "groq":
      return process.env.GROQ_API_KEY || undefined;
  }
}

/** "google:gemini-2.5-flash,anthropic:claude-haiku-4-5" → ordered targets. */
function parseFallbackSequence(raw: string | undefined): AiProviderTarget[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [provider, model] = entry.split(":").map((part) => part.trim());
      return { provider, model } as AiProviderTarget;
    })
    .filter(
      (target): target is AiProviderTarget =>
        KNOWN_PROVIDERS.includes(target.provider) && Boolean(target.model),
    );
}

/**
 * Full primary→fallback sequence, each entry only included if its API key
 * env var is actually set — a provider/model configured without a key is
 * unusable and treated the same as not configured at all (Docs/execution_plan.md
 * §16 M11). Server-only (reads process.env directly) — never import from a
 * "use client" module.
 */
export function resolveAiAssistSequence(): ResolvedAiTarget[] {
  const targets: AiProviderTarget[] = [];

  const primaryProvider = process.env.AI_PRIMARY_PROVIDER as
    AiProviderName | undefined;
  const primaryModel = process.env.AI_PRIMARY_MODEL;
  if (
    primaryProvider &&
    KNOWN_PROVIDERS.includes(primaryProvider) &&
    primaryModel
  ) {
    targets.push({ provider: primaryProvider, model: primaryModel });
  }

  targets.push(...parseFallbackSequence(process.env.AI_FALLBACK_SEQUENCE));

  const resolved: ResolvedAiTarget[] = [];
  for (const target of targets) {
    const apiKey = apiKeyFor(target.provider);
    if (apiKey) resolved.push({ ...target, apiKey });
  }
  return resolved;
}

/**
 * Safe-to-render summary (provider/model names only, never a key) for the
 * AI-assist panel's absent-state check and its read-only "Configure" entry
 * point (Story 11.4) — compute server-side and pass down as a prop, since
 * client components can't read non-NEXT_PUBLIC_ env vars.
 */
export function getAiAssistConfigSummary(): AiAssistConfigSummary {
  const sequence = resolveAiAssistSequence();
  const [primary, ...fallback] = sequence;
  return {
    configured: sequence.length > 0,
    primary: primary
      ? { provider: primary.provider, model: primary.model }
      : null,
    fallback: fallback.map(({ provider, model }) => ({ provider, model })),
  };
}
