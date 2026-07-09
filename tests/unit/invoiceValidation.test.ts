import { describe, expect, it } from "vitest";
import { invoiceSchema } from "@/lib/validation/invoice";

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    invoiceNumber: "TQ-01",
    issueDate: "2026-01-01",
    dueDate: "2026-01-15",
    convertedTotal: "",
    items: [{ description: "Consulting", quantity: "1", unitPrice: "100" }],
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
        items: [{ description: "X", quantity: "0", unitPrice: "10" }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a negative unit price", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [{ description: "X", quantity: "1", unitPrice: "-5" }],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a zero unit price (free line items are allowed)", () => {
    const result = invoiceSchema.safeParse(
      baseInput({
        items: [{ description: "Free", quantity: "1", unitPrice: "0" }],
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
