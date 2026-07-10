import { isOverdue } from "@/lib/dates";
import type { InvoiceStatus } from "@/generated/prisma/client";

export type DisplayInvoiceStatus = InvoiceStatus | "OVERDUE";

/**
 * Docs/ui_design_guide.md §11 — OVERDUE is a derived display swap, never a
 * stored status and never shown alongside SENT.
 */
export function deriveDisplayStatus(
  status: InvoiceStatus,
  dueDate: Date,
): DisplayInvoiceStatus {
  return status === "SENT" && isOverdue(dueDate) ? "OVERDUE" : status;
}
