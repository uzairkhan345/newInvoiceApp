import { describe, expect, it } from "vitest";
import { invoiceSchema } from "@/lib/validation/invoice";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    invoiceNumber: "TQ-01",
    issueDate: "2026-01-01",
    dueDate: "2026-01-15",
    convertedTotal: "",
    items: [
      {
        description: "Consulting",
        isFlatAmount: false,
        quantity: "1",
        unitPrice: "100",
        amount: "",
      },
    ],
    ...overrides,
  };
}

describe("invoiceSchema", () => {
  it("accepts a fully valid draft input", () => {
    expect(invoiceSchema.safeParse(baseInput()).success).toBe(true);
  });

  it("rejects an empty items array — at least one line item is required", () => {
    const result = invoiceSchema.safeParse(baseInput({ items: [] }));
    expect(result.success).toBe(false);
  });

  it("rejects a quantity of 0 or less", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "X",
            isFlatAmount: false,
            quantity: "0",
            unitPrice: "10",
            amount: "",
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "X",
            isFlatAmount: false,
            quantity: "1",
            unitPrice: "-5",
            amount: "",
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a zero unit price (free line items are allowed)", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "Free",
            isFlatAmount: false,
            quantity: "1",
            unitPrice: "0",
            amount: "",
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts a Flat-mode item with amount but no quantity/unitPrice", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "Retainer",
            isFlatAmount: true,
            quantity: "",
            unitPrice: "",
            amount: "1125",
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a Flat-mode item missing amount", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "Retainer",
            isFlatAmount: true,
            quantity: "",
            unitPrice: "",
            amount: "",
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an Hourly-mode item missing quantity or unitPrice", () => {
    const missingQuantity = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "X",
            isFlatAmount: false,
            quantity: "",
            unitPrice: "100",
            amount: "",
          },
        ],
      }),
    );
    expect(missingQuantity.success).toBe(false);

    const missingUnitPrice = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "X",
            isFlatAmount: false,
            quantity: "1",
            unitPrice: "",
            amount: "",
          },
        ],
      }),
    );
    expect(missingUnitPrice.success).toBe(false);
  });

  it("accepts a mixed invoice with both an Hourly and a Flat item", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [
          {
            description: "Hourly work",
            isFlatAmount: false,
            quantity: "2",
            unitPrice: "100",
            amount: "",
          },
          {
            description: "Retainer",
            isFlatAmount: true,
            quantity: "",
            unitPrice: "",
            amount: "500",
          },
        ],
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a missing invoice number", () => {
    const result = invoiceSchema.safeParse(baseInput({ invoiceNumber: "" }));
    expect(result.success).toBe(false);
  });

  it("does not require convertedTotal even when blank", () => {
    const result = invoiceSchema.safeParse(baseInput({ convertedTotal: "" }));
    expect(result.success).toBe(true);
  });

  it("rejects a non-numeric convertedTotal", () => {
    const result = invoiceSchema.safeParse(
      baseInput({ convertedTotal: "abc" }),
    );
    expect(result.success).toBe(false);
  });
});
