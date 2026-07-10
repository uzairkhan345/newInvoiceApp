import { cn } from "@/lib/utils";
import { deriveDisplayStatus } from "@/lib/invoiceStatus";
import type { InvoiceStatus } from "@/generated/prisma/client";

/**
 * Docs/ui_design_guide.md §7/§11 — the 5 fixed lifecycle colors, sourced from
 * the `--status-*` custom properties already defined in globals.css §7
 * (reserved there for "once StatusBadge lands") rather than duplicating the
 * hex values here.
 */
const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[var(--status-draft-bg)] text-[var(--status-draft-text)]",
  SENT: "bg-[var(--status-sent-bg)] text-[var(--status-sent-text)]",
  PAID: "bg-[var(--status-paid-bg)] text-[var(--status-paid-text)]",
  VOID: "bg-[var(--status-void-bg)] text-[var(--status-void-text)]",
  OVERDUE: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]",
};

export function StatusBadge({
  status,
  dueDate,
}: {
  status: InvoiceStatus;
  dueDate: Date;
}) {
  const displayStatus = deriveDisplayStatus(status, dueDate);

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl px-2 py-0.5 text-xs font-semibold uppercase",
        STATUS_STYLES[displayStatus],
      )}
    >
      {displayStatus}
    </span>
  );
}
