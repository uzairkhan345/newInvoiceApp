import Link from "next/link";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "sent", label: "Sent" },
  { value: "draft", label: "Draft" },
] as const;

export type InvoiceStatusFilterValue = (typeof FILTERS)[number]["value"];

/**
 * Docs/feedback_backlog.md M24 — plain `Link`-driven filter tabs on
 * `/invoices?status=...` (status omitted means "all"), not the stateful
 * `ui/tabs.tsx` primitive: that component manages its own client-side
 * selection state, which would fight page navigation. Styled to visually
 * match `tabsListVariants`' default variant instead. "Overdue" and "Sent"
 * deliberately overlap (an overdue invoice is still SENT) — same
 * overlapping treatment the dashboard already gives these two categories.
 */
export function InvoiceStatusFilter({
  active,
}: {
  active: InvoiceStatusFilterValue;
}) {
  return (
    <div className="mb-4 inline-flex w-fit items-center gap-[3px] rounded-lg bg-muted p-[3px]">
      {FILTERS.map((filter) => (
        <Link
          key={filter.value}
          href={filter.value === "all" ? "/invoices" : `/invoices?status=${filter.value}`}
          className={cn(
            "rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors",
            active === filter.value
              ? "bg-background text-foreground shadow-sm"
              : "text-foreground/60 hover:text-foreground",
          )}
        >
          {filter.label}
        </Link>
      ))}
    </div>
  );
}
