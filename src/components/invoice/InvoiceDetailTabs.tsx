import Link from "next/link";
import { cn } from "@/lib/utils";
import { withReturnTo } from "@/lib/backNavigation";

export type InvoiceDetailTab = "summary" | "preview" | "activity";

const TABS: { value: InvoiceDetailTab; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "preview", label: "Invoice preview" },
  { value: "activity", label: "Activity" },
];

/**
 * Invoice detail tabs (ui_redesign_handoff_v3 screenshots/07-09) — non-DRAFT
 * invoices only (see InvoiceDetailPage). Same URL-driven `?tab=` idiom as
 * ProjectDetailTabs, not client-side tab state.
 */
export function InvoiceDetailTabs({
  invoiceId,
  active,
  activityCount,
  returnTo,
}: {
  invoiceId: string;
  active: InvoiceDetailTab;
  activityCount: number;
  /** Carried through to each tab link so switching tabs doesn't drop the back-navigation origin — see `withReturnTo`. */
  returnTo?: string;
}) {
  return (
    <nav
      aria-label="Invoice sections"
      className="mb-6 flex gap-6 border-b border-border"
    >
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        const href = withReturnTo(
          tab.value === "summary"
            ? `/invoices/${invoiceId}`
            : `/invoices/${invoiceId}?tab=${tab.value}`,
          returnTo,
        );
        return (
          <Link
            key={tab.value}
            href={href}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 border-b-2 pb-3 text-[13px] font-semibold",
              isActive
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.value === "activity" ? (
              <span className="rounded-full bg-brand-light px-1.5 py-0.5 text-[10px] font-bold text-brand">
                {activityCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
