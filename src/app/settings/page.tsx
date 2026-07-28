import { PageHeader } from "@/components/layout/PageHeader";
import { ProviderSettingsCard } from "@/components/settings/ProviderSettingsCard";
import { aiProviderSettingsService } from "@/services/aiProviderSettingsService";

/**
 * M16 — DB-backed AI-assist configuration,
 * replacing M11's read-only env-var summary. Always exactly 3 fixed
 * provider cards (Question 14 of the M16 grill session) — no add/remove.
 * The first card (lowest `order`) is the default/first-tried provider.
 */
export default async function SettingsPage() {
  const settings = await aiProviderSettingsService.getSettingsForDisplay();

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="AI-assist providers, API keys, and fallback order. Every Party/Payment Method/Invoice form works fully by hand regardless of what's configured here."
      />
      <div className="flex max-w-2xl flex-col gap-4">
        {settings.map((setting, index) => (
          <ProviderSettingsCard
            key={setting.provider}
            setting={setting}
            isFirst={index === 0}
            isLast={index === settings.length - 1}
          />
        ))}
      </div>
    </>
  );
}
