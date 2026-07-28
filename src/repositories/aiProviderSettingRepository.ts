import { prisma } from "@/lib/prisma";
import type { AiProviderSetting } from "@/generated/prisma/client";
import type { AiProviderName } from "@/lib/ai-providers/types";

/**
 * Thin Prisma wrappers only — no encryption, no business rules
 *. Fixed 3-provider set — see
 * `KNOWN_PROVIDERS` in `@/lib/ai-providers/config`.
 */
const KNOWN_PROVIDERS: AiProviderName[] = ["google", "anthropic", "groq"];

function findAllOrdered(): Promise<AiProviderSetting[]> {
  return prisma.aiProviderSetting.findMany({ orderBy: { order: "asc" } });
}

/**
 * Idempotently creates any of the 3 fixed provider rows that don't exist yet
 * (default order = its index in `KNOWN_PROVIDERS`), so the app never needs a
 * separate seed step — the settings page and the runtime resolver both call
 * this before reading.
 */
function ensureSeeded(): Promise<{ count: number }> {
  return prisma.aiProviderSetting.createMany({
    data: KNOWN_PROVIDERS.map((provider, index) => ({
      provider,
      order: index,
    })),
    skipDuplicates: true,
  });
}

function update(
  provider: AiProviderName,
  data: Partial<{
    apiKeyCiphertext: string | null;
    models: string[];
    enabled: boolean;
  }>,
): Promise<AiProviderSetting> {
  return prisma.aiProviderSetting.update({ where: { provider }, data });
}

/** Swaps the persisted `order` of two provider rows (adjacent-move reordering). */
function swapOrder(
  a: { provider: AiProviderName; order: number },
  b: { provider: AiProviderName; order: number },
): Promise<unknown> {
  return prisma.$transaction([
    prisma.aiProviderSetting.update({
      where: { provider: a.provider },
      data: { order: b.order },
    }),
    prisma.aiProviderSetting.update({
      where: { provider: b.provider },
      data: { order: a.order },
    }),
  ]);
}

export const aiProviderSettingRepository = {
  findAllOrdered,
  ensureSeeded,
  update,
  swapOrder,
};
