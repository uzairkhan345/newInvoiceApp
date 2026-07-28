import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  PriorityFeedBarTone,
  PriorityFeedCategory,
  PriorityFeedItem,
} from "@/lib/priorityFeed";

const CATEGORY_LABEL: Record<PriorityFeedCategory, string> = {
  overdue: "Overdue",
  setup: "Setup",
  draft: "Draft",
  activity: "Activity",
};

/**
 * "setup" reuses the existing SENT-status hex pair (`#fffbeb`/`#b45309`) —
 * not a new token, just the same amber the design spec asks for, which
 * happens to already exist under that name (Docs/ui_design_guide.md §7).
 */
const TONE_STYLES: Record<
  PriorityFeedBarTone,
  { bar: string; tagBg: string; tagText: string }
> = {
  overdue: {
    bar: "bg-[var(--status-overdue-text)]",
    tagBg: "bg-[var(--status-overdue-bg)]",
    tagText: "text-[var(--status-overdue-text)]",
  },
  setup: {
    bar: "bg-[var(--status-sent-text)]",
    tagBg: "bg-[var(--status-sent-bg)]",
    tagText: "text-[var(--status-sent-text)]",
  },
  draft: {
    bar: "bg-[var(--status-draft-text)]",
    tagBg: "bg-[var(--status-draft-bg)]",
    tagText: "text-[var(--status-draft-text)]",
  },
  positive: {
    bar: "bg-[var(--status-paid-text)]",
    tagBg: "bg-[var(--status-paid-bg)]",
    tagText: "text-[var(--status-paid-text)]",
  },
  info: { bar: "bg-brand", tagBg: "bg-brand-light", tagText: "text-brand" },
};

/**
 * Dashboard Priority Feed (M27 v2 redesign) — replaces the old separate
 * NeedsAttentionList + ActivityLog cards with one merged, urgency-sorted
 * list. `items` arrive pre-sorted (see `src/lib/priorityFeed.ts`).
 * design_handoff_dashboard_v2/README.md §2, Docs/ui_design_guide.md §16.
 */
export function PriorityFeed({ items }: { items: PriorityFeedItem[] }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-[18px]">
        <span className="text-[15px] font-bold text-foreground">
          Priority Feed
        </span>
        <span className="text-[11px] text-muted-foreground">
          Most urgent first
        </span>
      </div>
      <div className="max-h-[520px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--alert-success-bg)] text-[var(--alert-success-text)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-[13px] font-bold text-foreground">
              All caught up
            </p>
            <p className="max-w-[260px] text-[11px] text-muted-foreground">
              No overdue invoices, drafts, activity, or setup gaps right now.
            </p>
          </div>
        ) : (
          items.map((item, index) => {
            const tone = TONE_STYLES[item.barTone];
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-stretch gap-3 px-5 hover:bg-muted/40",
                  index > 0 && "border-t border-muted",
                )}
              >
                <span
                  className={cn("w-[3px] shrink-0 self-stretch", tone.bar)}
                />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 py-3">
                  <span className="truncate text-[13px] font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="truncate text-[12px] text-muted-foreground">
                    {item.detail}
                  </span>
                </div>
                {item.amount ? (
                  <span className="shrink-0 self-center font-mono text-[13px] font-semibold text-foreground">
                    {item.amount}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "shrink-0 self-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                    tone.tagBg,
                    tone.tagText,
                  )}
                >
                  {CATEGORY_LABEL[item.category]}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </Card>
  );
}
