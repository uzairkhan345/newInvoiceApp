import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvoiceAssistResponse } from "@/lib/validation/aiSuggestions";

/**
 * M35 — runInvoicePrompt must force isReferralCredit: false on every
 * suggested item regardless of what the model returns, since that field is
 * only ever meant to be set through the dedicated "Add Referral Credit"
 * button. runWithFallback (already covered in isolation by
 * aiProviderFallback.test.ts) is mocked here so this test can focus purely
 * on the post-processing step.
 */
const runWithFallback = vi.fn<() => Promise<InvoiceAssistResponse | null>>();
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
