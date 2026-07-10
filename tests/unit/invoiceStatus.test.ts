import { describe, expect, it } from "vitest";
import { deriveDisplayStatus } from "@/lib/invoiceStatus";

function daysFromNow(days: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days),
  );
}

describe("deriveDisplayStatus", () => {
  it("shows OVERDUE for a SENT invoice past its due date", () => {
    expect(deriveDisplayStatus("SENT", daysFromNow(-1))).toBe("OVERDUE");
  });

  it("shows SENT (not OVERDUE) for a SENT invoice due today or in the future", () => {
    expect(deriveDisplayStatus("SENT", daysFromNow(0))).toBe("SENT");
    expect(deriveDisplayStatus("SENT", daysFromNow(5))).toBe("SENT");
  });

  it("never shows OVERDUE for DRAFT, even with a past due date", () => {
    expect(deriveDisplayStatus("DRAFT", daysFromNow(-10))).toBe("DRAFT");
  });

  it("never shows OVERDUE for PAID, even with a past due date", () => {
    expect(deriveDisplayStatus("PAID", daysFromNow(-10))).toBe("PAID");
  });

  it("never shows OVERDUE for VOID, even with a past due date", () => {
    expect(deriveDisplayStatus("VOID", daysFromNow(-10))).toBe("VOID");
  });
});
