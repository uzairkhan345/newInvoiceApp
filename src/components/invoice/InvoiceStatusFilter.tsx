import { FilterChips } from "@/components/shared/FilterChips";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
] as const;

export type InvoiceStatusFilterValue = (typeof FILTERS)[number]["value"];

/**
 * Docs/feedback_backlog.md M24, restyled as pill chips by M27
 * (design_handoff_dashboard_v2/README.md §3) — `/invoices?status=...`
 * (status omitted means "all"). "Overdue" and "Sent" deliberately overlap
 * (an overdue invoice is still SENT) — same overlapping treatment the
 * dashboard already gives these two categories. "Void" is new in M27 (the
 * v2 design's chip row is All/Draft/Sent/Paid/Overdue/Void; the prior M24
 * tabs never included it).
 */
export function InvoiceStatusFilter({
  active,
  fromDashboard = false,
}: {
  active: InvoiceStatusFilterValue;
  fromDashboard?: boolean;
}) {
  return (
    <FilterChips
      options={FILTERS}
      active={active}
      hrefFor={(value) => {
        const params = new URLSearchParams();
        if (value !== "all") params.set("status", value);
        if (fromDashboard) params.set("from", "dashboard");
        const query = params.toString();
        return query ? `/invoices?${query}` : "/invoices";
      }}
    />
  );
}
