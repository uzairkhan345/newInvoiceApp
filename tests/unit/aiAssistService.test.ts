import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * M35 — runInvoicePrompt must force isReferralCredit: false on every
 * suggested item regardless of what the model returns, since that field is
 * only ever meant to be set through the dedicated "Add Referral Credit"
 * button. runWithFallback (already covered in isolation by
 * aiProviderFallback.test.ts) is mocked here so this test can focus purely
 * on the post-processing step. Untyped (`unknown`) since this file's mock
 * also stands in for classifyItemsNotePeriod's differently-shaped response
 * below.
 */
const runWithFallback = vi.fn<() => Promise<unknown>>();
vi.mock("@/lib/ai-providers/fallbackRunner", () => ({
  runWithFallback: () => runWithFallback(),
}));

const { aiAssistService } = await import("@/services/aiAssistService");

afterEach(() => {
  runWithFallback.mockReset();
});

describe("aiAssistService.runInvoicePrompt — Referral Credit guard (M35)", () => {
  it("forces isReferralCredit false even when the model hallucinates it true", async () => {
    runWithFallback.mockResolvedValue({
      responseType: "suggestion",
      suggestion: {
        items: [
          {
            description: "Referral Credit (Thank you!)",
            isFlatAmount: true,
            isReferralCredit: true,
            quantity: "",
            unitPrice: "",
            amount: "150",
          },
        ],
      },
    });

    const result = await aiAssistService.runInvoicePrompt({
      promptText: "irrelevant",
      context: {
        project: {
          name: "Test Project",
          contractorName: "Contractor",
          clientName: "Client",
          preferredPaymentMethodLabel: null,
          currency: "USD",
          invoiceNumberFormat: "{number}",
        },
        currentValues: {},
      },
    });

    expect(result?.responseType).toBe("suggestion");
    if (result?.responseType === "suggestion") {
      expect(result.suggestion.items?.[0]?.isReferralCredit).toBe(false);
    }
  });

  it("passes through a clarification response untouched", async () => {
    runWithFallback.mockResolvedValue({
      responseType: "clarification",
      question: "Which rate applies to the second item?",
    });

    const result = await aiAssistService.runInvoicePrompt({
      promptText: "irrelevant",
      context: {
        project: {
          name: "Test Project",
          contractorName: "Contractor",
          clientName: "Client",
          preferredPaymentMethodLabel: null,
          currency: "USD",
          invoiceNumberFormat: "{number}",
        },
        currentValues: {},
      },
    });

    expect(result).toEqual({
      responseType: "clarification",
      question: "Which rate applies to the second item?",
    });
  });
});

describe("aiAssistService.classifyItemsNotePeriod — Autofill note carryover", () => {
  it("returns true for a note classified as a pure period statement", async () => {
    runWithFallback.mockResolvedValue({ isDefaultPeriodNote: true });

    await expect(
      aiAssistService.classifyItemsNotePeriod(
        "Covers services rendered Jul 1 – Jul 31, 2026.",
      ),
    ).resolves.toBe(true);
  });

  it("returns false for a note classified as containing other content", async () => {
    runWithFallback.mockResolvedValue({ isDefaultPeriodNote: false });

    await expect(
      aiAssistService.classifyItemsNotePeriod(
        "Includes a one-time setup fee in addition to the monthly retainer.",
      ),
    ).resolves.toBe(false);
  });

  it("returns null (not false) when every provider fails/is unconfigured", async () => {
    runWithFallback.mockResolvedValue(null);

    await expect(
      aiAssistService.classifyItemsNotePeriod("Some note."),
    ).resolves.toBeNull();
  });
});
