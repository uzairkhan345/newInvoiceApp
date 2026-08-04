import { describe, expect, it } from "vitest";
import { buildInvoiceActivity } from "@/lib/invoiceActivity";

describe("buildInvoiceActivity", () => {
  it("shows only Invoice created for a DRAFT invoice", () => {
    const events = buildInvoiceActivity({
      status: "DRAFT",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      dueDate: new Date("2026-01-15"),
    });
    expect(events.map((e) => e.id)).toEqual(["created"]);
  });

  it("shows created then sent for a SENT invoice that isn't overdue", () => {
    const events = buildInvoiceActivity({
      status: "SENT",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-02"),
      dueDate: new Date("2099-01-01"),
    });
    expect(events.map((e) => e.id)).toEqual(["status", "created"]);
  });

  it("adds a became-overdue event, derived from dueDate, for an overdue SENT invoice", () => {
    const events = buildInvoiceActivity({
      status: "SENT",
      createdAt: new Date("2020-01-01"),
      updatedAt: new Date("2020-01-02"),
      dueDate: new Date("2020-01-15"),
    });
    expect(events.map((e) => e.id)).toEqual(["overdue", "status", "created"]);
  });

  it("does not fabricate a sent event for a PAID invoice — that timestamp is unrecoverable", () => {
    const events = buildInvoiceActivity({
      status: "PAID",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-10"),
      dueDate: new Date("2026-01-15"),
    });
    expect(events.map((e) => e.id)).toEqual(["status", "created"]);
    expect(events[0].title).toBe("Invoice marked paid");
  });

  it("shows voided for a VOID invoice", () => {
    const events = buildInvoiceActivity({
      status: "VOID",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-05"),
      dueDate: new Date("2026-01-15"),
    });
    expect(events[0].title).toBe("Invoice voided");
  });

  it("sorts events newest first", () => {
    const events = buildInvoiceActivity({
      status: "SENT",
      createdAt: new Date("2020-01-01"),
      updatedAt: new Date("2020-01-02"),
      dueDate: new Date("2020-01-15"),
    });
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].date.getTime()).toBeGreaterThanOrEqual(
        events[i].date.getTime(),
      );
    }
  });
});
