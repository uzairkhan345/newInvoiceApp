import { describe, expect, it } from "vitest";
import { computeDueDate } from "@/lib/invoicePeriod";

describe("computeDueDate", () => {
  it("adds 7 flat days for WEEKLY", () => {
    expect(computeDueDate("2026-07-21", "WEEKLY")).toBe("2026-07-28");
  });

  it("adds 15 flat days for SEMI_MONTHLY", () => {
    expect(computeDueDate("2026-07-21", "SEMI_MONTHLY")).toBe("2026-08-05");
  });

  it("adds 1 calendar month for MONTHLY on a mid-month date", () => {
    expect(computeDueDate("2026-07-15", "MONTHLY")).toBe("2026-08-15");
  });

  it("clamps MONTHLY to the target month's last day instead of overflowing (Jan 31 -> Feb 28)", () => {
    expect(computeDueDate("2027-01-31", "MONTHLY")).toBe("2027-02-28");
  });

  it("clamps MONTHLY to Feb 29 in a leap year", () => {
    expect(computeDueDate("2028-01-31", "MONTHLY")).toBe("2028-02-29");
  });

  it("rolls MONTHLY over into January of the next year from December", () => {
    expect(computeDueDate("2026-12-31", "MONTHLY")).toBe("2027-01-31");
  });

  it("does not clamp MONTHLY when the target month has enough days (Apr 30 -> May 30)", () => {
    expect(computeDueDate("2026-04-30", "MONTHLY")).toBe("2026-05-30");
  });

  it("clamps MONTHLY from Mar 31 to Apr 30 in a non-leap year", () => {
    expect(computeDueDate("2026-03-31", "MONTHLY")).toBe("2026-04-30");
  });
});
