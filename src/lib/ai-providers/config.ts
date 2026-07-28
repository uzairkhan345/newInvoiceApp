import { aiProviderSettingsService } from "@/services/aiProviderSettingsService";
import type {
  AiAssistConfigSummary,
  ResolvedAiTarget,
} from "@/services/aiProviderSettingsService";

export type { ResolvedAiTarget, AiAssistConfigSummary };

/**
 * DB-backed — supersedes M11's
 * environment-variables-only resolution (`implementation_decisions.md` §22
 * addendum). Thin re-exports over `aiProviderSettingsService` so
 * `fallbackRunner.ts` and every form page keep importing from this same
 * module; both are now `async` since they read Postgres. Server-only.
 */
export function resolveAiAssistSequence(): Promise<ResolvedAiTarget[]> {
  return aiProviderSettingsService.getResolvedSequence();
}

export function getAiAssistConfigSummary(): Promise<AiAssistConfigSummary> {
  return aiProviderSettingsService.getConfigSummary();
}
