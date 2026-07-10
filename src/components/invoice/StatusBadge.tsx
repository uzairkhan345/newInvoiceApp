import { cn } from "@/lib/utils";
import { deriveDisplayStatus } from "@/lib/invoiceStatus";
import type { InvoiceStatus } from "@/generated/prisma/client";

/** Docs/ui_design_guide.md §7/§11 — the 5 fixed lifecycle colors. */
const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-[#f1f5f9] text-[#475569]",
  SENT: "bg-[#fffbeb] text-[#b45309]",
  PAID: "bg-[#ecfdf5] text-[#047857]",
  VOID: "bg-[#fff1f2] text-[#be123c]",
  OVERDUE: "bg-[#fef2f2] text-[#b91c1c]",
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
