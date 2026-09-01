import { describe, expect, it } from "vitest";
import {
  applyInvoiceNumberTokens,
  getInvoiceNumberTokenReference,
} from "@/lib/invoiceNumberFormat";

describe("applyInvoiceNumberTokens", () => {
  const now = new Date("2026-08-31T12:00:00Z");

  it("substitutes every supported token", () => {
    const result = applyInvoiceNumberTokens(
      "{abbreviation}-{number}-{year}-{year_short}-{month}-{day}",
      { abbreviation: "ACM", number: "03", now },
    );
    expect(result).toBe("ACM-03-2026-26-08-31");
  });

  it("defaults {date} to MM-DD-YYYY", () => {
    const result = applyInvoiceNumberTokens("{date}", {
      abbreviation: "ACM",
      number: "01",
      now,
    });
    expect(result).toBe("08-31-2026");
  });

  it("supports every explicit {date:...} shape", () => {
    const values = { abbreviation: "ACM", number: "01", now };
    expect(applyInvoiceNumberTokens("{date:MM-DD-YYYY}", values)).toBe(
      "08-31-2026",
    );
    expect(applyInvoiceNumberTokens("{date:DD-MM-YYYY}", values)).toBe(
      "31-08-2026",
    );
    expect(applyInvoiceNumberTokens("{date:MM/DD/YYYY}", values)).toBe(
      "08/31/2026",
    );
    expect(applyInvoiceNumberTokens("{date:DD/MM/YYYY}", values)).toBe(
      "31/08/2026",
    );
  });

  it("keeps non-token characters literal", () => {
    const result = applyInvoiceNumberTokens("INV_{number}!!", {
      abbreviation: "ACM",
      number: "07",
      now,
    });
    expect(result).toBe("INV_07!!");
  });

  it("returns the format unchanged when it has no recognized tokens", () => {
    const result = applyInvoiceNumberTokens("plain-text-only", {
      abbreviation: "ACM",
      number: "01",
      now,
    });
    expect(result).toBe("plain-text-only");
  });
});

describe("getInvoiceNumberTokenReference", () => {
  it("lists exactly the tokens applyInvoiceNumberTokens recognizes", () => {
    const now = new Date("2026-08-31T12:00:00Z");
    const reference = getInvoiceNumberTokenReference(now);
    const tokens = reference.map((entry) => entry.token);
    expect(tokens).toEqual([
      "{abbreviation}",
      "{number}",
      "{year}",
      "{year_short}",
      "{month}",
      "{day}",
      "{date}",
      "{date:MM-DD-YYYY}",
      "{date:DD-MM-YYYY}",
      "{date:MM/DD/YYYY}",
      "{date:DD/MM/YYYY}",
    ]);
  });

  it("resolves each sample against the given date, matching applyInvoiceNumberTokens directly", () => {
    const now = new Date("2026-08-31T12:00:00Z");
    const reference = getInvoiceNumberTokenReference(now);
    for (const entry of reference) {
      if (entry.token === "{abbreviation}" || entry.token === "{number}") {
        continue; // Illustrative, not date-derived.
      }
      const resolved = applyInvoiceNumberTokens(entry.token, {
        abbreviation: "ACM",
        number: "01",
        now,
      });
      expect(entry.sample).toBe(resolved);
    }
  });

  it("defaults to today when no date is passed", () => {
    expect(() => getInvoiceNumberTokenReference()).not.toThrow();
  });
});
