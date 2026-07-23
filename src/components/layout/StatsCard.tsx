import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Dashboard stats row (M10) — Docs/ui_design_guide.md §16. Counts only; any
 * dollar figure is secondary subtext, never the headline metric. `subtext`
 * accepts a `ReactNode` (Docs/feedback_backlog.md M26), not just a string, so
 * the Sent/Unpaid card can stack per-currency breakdown lines beneath the
 * primary USD figure instead of blending currencies into one string.
 * `href` (Docs/feedback_backlog.md — dashboard card navigation) makes the
 * whole card a link into the matching filtered list, reusing the same
 * hover treatment as the invoices/new project-picker cards.
 */
export function StatsCard({
  label,
  value,
  subtext,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  subtext?: ReactNode;
  icon: LucideIcon;
  href?: string;
}) {
  const card = (
    <Card
      className={cn(href && "transition-colors hover:bg-muted/40")}
    >
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-extrabold tracking-[-0.02em] text-foreground">
            {value}
          </span>
          {subtext ? (
            <div className="flex flex-col gap-0.5 text-[11px] text-muted-foreground">
              {subtext}
            </div>
          ) : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
