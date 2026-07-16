import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/currency";

describe("formatCurrency", () => {
  it("formats a number as USD by default currency code", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("formats a numeric string input the same as a number", () => {
    expect(formatCurrency("1234.5", "USD")).toBe("$1,234.50");
  });

  it("formats AUD with its own currency symbol", () => {
    expect(formatCurrency(500, "AUD")).toBe("A$500.00");
  });

  it("formats GBP with its own currency symbol", () => {
    expect(formatCurrency(500, "GBP")).toBe("£500.00");
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });

  it("formats a negative amount", () => {
    expect(formatCurrency(-42.1, "USD")).toBe("-$42.10");
  });
});
