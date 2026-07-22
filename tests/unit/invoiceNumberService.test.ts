import { describe, expect, it } from "vitest";
import {
  generateInvoiceNumber,
  nextSequence,
} from "@/services/invoiceNumberService";

describe("invoiceNumberService.generateInvoiceNumber", () => {
  it("substitutes {abbreviation}, {number}, and {date} in order", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "Torque Gears",
        invoiceNumberFormat: "{abbreviation}-{number}-{date}",
      },
      existingInvoiceNumbers: [],
      now: new Date(2026, 6, 9), // July 9, 2026 (local)
    });

    expect(result).toBe("TQ-01-07-09-2026");
  });

  it("substitutes tokens in a different literal arrangement", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "Torque Gears",
        invoiceNumberFormat: "{abbreviation}-{date}/{number}",
      },
      existingInvoiceNumbers: [],
      now: new Date(2026, 6, 9),
    });

    expect(result).toBe("TQ-07-09-2026/01");
  });

  it("falls back to auto-derived initials when Project.abbreviation is blank", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: null,
        name: "Torque Gears",
        invoiceNumberFormat: "{abbreviation}-{number}",
      },
      existingInvoiceNumbers: [],
    });

    expect(result).toBe("TG-01");
  });

  it("defaults {date} to MM-DD-YYYY", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "[redacted]",
        invoiceNumberFormat: "{date}",
      },
      existingInvoiceNumbers: [],
      now: new Date(2026, 0, 5), // Jan 5, 2026
    });

    expect(result).toBe("01-05-2026");
  });

  it("substitutes {year} as a standalone 4-digit token, independent of {date}", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "[redacted]",
        invoiceNumberFormat: "{abbreviation}-{year}-{number}",
      },
      existingInvoiceNumbers: [],
      now: new Date(2026, 6, 9), // July 9, 2026 (local)
    });

    expect(result).toBe("TQ-2026-01");
  });

  it("honors an explicit {date:DD-MM-YYYY} qualifier", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "[redacted]",
        invoiceNumberFormat: "{date:DD-MM-YYYY}",
      },
      existingInvoiceNumbers: [],
      now: new Date(2026, 0, 5), // Jan 5, 2026
    });

    expect(result).toBe("05-01-2026");
  });

  it("zero-pads the sequence number to 2 digits by default", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "[redacted]",
        invoiceNumberFormat: "{abbreviation}-{number}",
      },
      existingInvoiceNumbers: ["TQ-01", "TQ-02"],
    });

    expect(result).toBe("TQ-03");
  });

  it("grows beyond 2 digits without truncation once the sequence reaches 100", () => {
    const result = generateInvoiceNumber({
      project: {
        abbreviation: "TQ",
        name: "[redacted]",
        invoiceNumberFormat: "{abbreviation}-{number}",
      },
      existingInvoiceNumbers: ["TQ-99"],
    });

    expect(result).toBe("TQ-100");
  });
});

describe("invoiceNumberService.nextSequence", () => {
  it("computes max(existing) + 1, not a count — a gap from a deleted invoice never causes a collision", () => {
    // Invoice "TQ-02" was deleted; only 01 and 05 remain. A count-based
    // approach would wrongly produce 3 here.
    const sequence = nextSequence(
      ["TQ-01", "TQ-05"],
      "{abbreviation}-{number}",
    );
    expect(sequence).toBe(6);
  });

  it("starts at 1 when there are no existing invoice numbers", () => {
    expect(nextSequence([], "{abbreviation}-{number}")).toBe(1);
  });

  it("ignores invoice numbers that don't parse against the format (e.g. manually edited)", () => {
    const sequence = nextSequence(
      ["TQ-01", "a completely custom string"],
      "{abbreviation}-{number}",
    );
    expect(sequence).toBe(2);
  });

  it("treats {year} as a wildcard when extracting the sequence, same as {date}", () => {
    const sequence = nextSequence(
      ["TQ-2026-01", "TQ-2026-02"],
      "{abbreviation}-{year}-{number}",
    );
    expect(sequence).toBe(3);
  });
});
