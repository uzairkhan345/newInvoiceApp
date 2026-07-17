import { z } from "zod";

/**
 * M16 (Docs/execution_plan.md) — one provider card's form. `apiKey` blank
 * means "keep the existing key" (see aiProviderSettingsService), so it's
 * intentionally not `.min(1)`-required. `models` is free-text (Question 8 of
 * the M16 grill session — no curated per-provider list); array position IS
 * the within-provider fallback order, same convention as `PaymentMethod.fields`.
 */
export const aiProviderSettingSchema = z.object({
  apiKey: z.string().trim(),
  models: z.array(
    z.object({ value: z.string().trim().min(1, "Model id is required") }),
  ),
  enabled: z.boolean(),
});

export type AiProviderSettingInput = z.infer<typeof aiProviderSettingSchema>;
