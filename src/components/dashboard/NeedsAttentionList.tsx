import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";

export type NeedsAttentionTag = "Overdue" | "Draft" | "No payment method";

export type NeedsAttentionItem = {
  id: string;
  href: string;
  title: string;
  detail: string;
  tag: NeedsAttentionTag;
};

const TAG_STYLES: Record<NeedsAttentionTag, string> = {
  Overdue: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]",
  Draft: "bg-[var(--status-draft-bg)] text-[var(--status-draft-text)]",
  "No payment method":
    "bg-[var(--alert-warning-bg)] text-[var(--alert-warning-text)]",
};

/**
 * Dashboard primary panel (M10, 2fr) — Docs/ui_design_guide.md §16. Items
 * arrive pre-sorted most-urgent-first (overdue invoices, then drafts
 * awaiting review, then projects missing a preferred payment method).
 */
export function NeedsAttentionList({ items }: { items: NeedsAttentionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold text-foreground">
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="Nothing needs your attention right now."
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3 text-[13px] hover:bg-muted/60"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold text-foreground">
                      {item.title}
                    </span>
                    <span className="truncate text-[12px] text-muted-foreground">
                      {item.detail}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                      TAG_STYLES[item.tag],
                    )}
                  >
                    {item.tag}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
