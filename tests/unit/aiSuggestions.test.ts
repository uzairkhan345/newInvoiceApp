import { describe, expect, it } from "vitest";
import {
  partySuggestionSchema,
  paymentMethodSuggestionSchema,
  invoiceSuggestionSchema,
} from "@/lib/validation/aiSuggestions";

describe("aiSuggestions schemas", () => {
  it("accepts an empty object (assistant confident about nothing)", () => {
    expect(partySuggestionSchema.safeParse({}).success).toBe(true);
    expect(paymentMethodSuggestionSchema.safeParse({}).success).toBe(true);
    expect(invoiceSuggestionSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial party suggestion missing required-on-submit fields", () => {
    const result = partySuggestionSchema.safeParse({ name: "Acme Robotics" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid party type even when partial", () => {
    const result = partySuggestionSchema.safeParse({ type: "NOT_A_TYPE" });
    expect(result.success).toBe(false);
  });

  it("requires every key of a fields[] entry when fields is present", () => {
    const missingValue = paymentMethodSuggestionSchema.safeParse({
      fields: [{ key: "iban", label: "IBAN" }],
    });
    expect(missingValue.success).toBe(false);

    const complete = paymentMethodSuggestionSchema.safeParse({
      fields: [{ key: "iban", label: "IBAN", value: "DE1234" }],
    });
    expect(complete.success).toBe(true);
  });

  it("requires every key of an items[] entry when items is present — invoiceItemSchema isn't itself partialed", () => {
    const missingUnitPrice = invoiceSuggestionSchema.safeParse({
      items: [
        {
          description: "Consulting",
          isFlatAmount: false,
          quantity: "3",
          unitPrice: "",
          amount: "",
        },
      ],
    });
    expect(missingUnitPrice.success).toBe(false);

    const complete = invoiceSuggestionSchema.safeParse({
      items: [
        {
          description: "Consulting",
          isFlatAmount: false,
          quantity: "3",
          unitPrice: "150",
          amount: "",
        },
      ],
    });
    expect(complete.success).toBe(true);
  });

  it("accepts a Flat-mode item suggestion (amount, no quantity/unitPrice)", () => {
    const result = invoiceSuggestionSchema.safeParse({
      items: [
        {
          description: "Retainer",
          isFlatAmount: true,
          quantity: "",
          unitPrice: "",
          amount: "500",
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
