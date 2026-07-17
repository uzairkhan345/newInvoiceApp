// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { aiProviderSettingsService } from "@/services/aiProviderSettingsService";
import { prisma } from "@/lib/prisma";

afterEach(async () => {
  await prisma.aiProviderSetting.deleteMany();
});

describe("aiProviderSettingsService", () => {
  it("getSettingsForDisplay self-seeds the 3 fixed providers in google/anthropic/groq order, all unconfigured", async () => {
    const settings = await aiProviderSettingsService.getSettingsForDisplay();
    expect(settings.map((s) => s.provider)).toEqual([
      "google",
      "anthropic",
      "groq",
    ]);
    for (const setting of settings) {
      expect(setting.hasKey).toBe(false);
      expect(setting.maskedKeyHint).toBeNull();
      expect(setting.models).toEqual([]);
      expect(setting.enabled).toBe(true);
    }
  });

  it("updateProviderSetting encrypts the key at rest and never exposes it in the display summary", async () => {
    await aiProviderSettingsService.updateProviderSetting("google", {
      apiKey: "sk-real-google-key-abcd",
      models: ["gemini-2.5-flash", "gemini-2.5-pro"],
      enabled: true,
    });

    const row = await prisma.aiProviderSetting.findUniqueOrThrow({
      where: { provider: "google" },
    });
    expect(row.apiKeyCiphertext).not.toBeNull();
    expect(row.apiKeyCiphertext).not.toContain("sk-real-google-key-abcd");

    const settings = await aiProviderSettingsService.getSettingsForDisplay();
    const google = settings.find((s) => s.provider === "google")!;
    expect(google.hasKey).toBe(true);
    expect(google.maskedKeyHint).toBe("••••••••abcd");
    expect(google.models).toEqual(["gemini-2.5-flash", "gemini-2.5-pro"]);
  });

  it("a blank apiKey on a later save keeps the previously-saved key", async () => {
    await aiProviderSettingsService.updateProviderSetting("groq", {
      apiKey: "sk-original-groq-key",
      models: ["llama-3.3-70b-versatile"],
      enabled: true,
    });

    await aiProviderSettingsService.updateProviderSetting("groq", {
      apiKey: "", // blank = keep existing key
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      enabled: false,
    });

    const settings = await aiProviderSettingsService.getSettingsForDisplay();
    const groq = settings.find((s) => s.provider === "groq")!;
    expect(groq.hasKey).toBe(true);
    expect(groq.maskedKeyHint).toBe("••••••••-key");
    expect(groq.models).toEqual([
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
    ]);
    expect(groq.enabled).toBe(false);
  });

  it("getResolvedSequence walks providers in cascade order then each provider's models in order, skipping disabled/keyless/model-less rows", async () => {
    await aiProviderSettingsService.updateProviderSetting("google", {
      apiKey: "g-key",
      models: ["gemini-2.5-flash", "gemini-2.5-pro"],
      enabled: true,
    });
    // anthropic: has a key but no models — must be skipped entirely.
    await aiProviderSettingsService.updateProviderSetting("anthropic", {
      apiKey: "a-key",
      models: [],
      enabled: true,
    });
    // groq: configured but disabled — must be skipped.
    await aiProviderSettingsService.updateProviderSetting("groq", {
      apiKey: "gr-key",
      models: ["llama-3.3-70b-versatile"],
      enabled: false,
    });

    const sequence = await aiProviderSettingsService.getResolvedSequence();
    expect(sequence).toEqual([
      { provider: "google", model: "gemini-2.5-flash", apiKey: "g-key" },
      { provider: "google", model: "gemini-2.5-pro", apiKey: "g-key" },
    ]);

    const summary = await aiProviderSettingsService.getConfigSummary();
    expect(summary).toEqual({
      configured: true,
      primary: { provider: "google", model: "gemini-2.5-flash" },
      fallback: [{ provider: "google", model: "gemini-2.5-pro" }],
    });
  });

  it("moveProvider swaps adjacent cascade order, and is a no-op past either end", async () => {
    await aiProviderSettingsService.getSettingsForDisplay(); // ensure seeded

    await aiProviderSettingsService.moveProvider("anthropic", "up");
    let settings = await aiProviderSettingsService.getSettingsForDisplay();
    expect(settings.map((s) => s.provider)).toEqual([
      "anthropic",
      "google",
      "groq",
    ]);

    // First position "up" is a no-op.
    await aiProviderSettingsService.moveProvider("anthropic", "up");
    settings = await aiProviderSettingsService.getSettingsForDisplay();
    expect(settings.map((s) => s.provider)).toEqual([
      "anthropic",
      "google",
      "groq",
    ]);

    // Last position "down" is a no-op.
    await aiProviderSettingsService.moveProvider("groq", "down");
    settings = await aiProviderSettingsService.getSettingsForDisplay();
    expect(settings.map((s) => s.provider)).toEqual([
      "anthropic",
      "google",
      "groq",
    ]);
  });
});
