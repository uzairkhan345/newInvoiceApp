"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  resolveTrendPresentation,
  scaleSparklineBars,
  type TrendSemantics,
} from "@/lib/dashboardTrend";

const TONE_BAR: Record<"positive" | "negative" | "neutral", string> = {
  positive: "bg-[var(--status-paid-text)]",
  negative: "bg-[var(--status-overdue-text)]",
  neutral: "bg-muted-foreground",
};

export type StatTrendProps = {
  delta: number;
  semantics: TrendSemantics;
  sparklineCounts: number[];
};

/**
 * Dashboard stats row (M27 v2 redesign) — Docs/ui_design_guide.md §16,
 * design_handoff_dashboard_v2/README.md §2. Counts only; any dollar figure
 * is secondary subtext, never the headline metric. `trend` only drives the
 * sparkline's tone/shape now (no arrow/delta text is rendered). `href` makes
 * the whole card a link into the matching filtered list.
 *
 * `subtext` is a single primary line; any further lines go in `moreItems`
 * behind a "+N more" popover chip instead of stacking indefinitely — a card
 * whose content varies in length (e.g. one line per currency or per
 * overdue project) must not grow taller than its siblings in the row. The
 * chip renders as a non-native trigger (`nativeButton={false}`) with
 * propagation stopped on click: it sits inside the card's own `<Link>` when
 * `href` is set, and a real nested `<button>`/click bubbling to that anchor
 * would either be invalid HTML or navigate away instead of opening the
 * popover.
 */
export function StatsCard({
  label,
  value,
  subtext,
  moreItems,
  href,
  trend,
}: {
  label: string;
  value: number;
  subtext?: ReactNode;
  moreItems?: ReactNode[];
  href?: string;
  trend?: StatTrendProps;
}) {
  const presentation = trend
    ? resolveTrendPresentation(trend.delta, trend.semantics)
    : null;
  const bars = trend ? scaleSparklineBars(trend.sparklineCounts) : null;
  const barColorClass = presentation
    ? TONE_BAR[presentation.tone]
    : "bg-muted-foreground";

  const card = (
    <Card className={cn("h-full", href && "transition-colors hover:bg-muted/40")}>
      <CardContent className="flex h-full flex-col gap-2.5">
        <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <div className="flex items-end justify-between gap-2.5">
          <span className="font-mono text-[28px] font-bold text-foreground">
            {value}
          </span>
          {bars ? (
            <div className="flex h-6 items-end gap-[3px]">
              {bars.map((height, index) => (
                <span
                  key={index}
                  className={cn(
                    "w-1 rounded-[2px] opacity-55",
                    barColorClass,
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          ) : null}
        </div>
        {subtext ? (
          <div className="mt-auto flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <span className="truncate">{subtext}</span>
            {moreItems && moreItems.length > 0 ? (
              <Popover>
                <PopoverTrigger
                  nativeButton={false}
                  render={<span role="button" tabIndex={0} />}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className="shrink-0 cursor-pointer rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground select-none data-[popup-open]:bg-brand data-[popup-open]:text-white"
                >
                  +{moreItems.length} more
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="flex w-auto min-w-[160px] flex-col gap-1 p-2.5 font-mono text-[11px] text-secondary-foreground"
                >
                  {moreItems.map((item, index) => (
                    <div key={index}>{item}</div>
                  ))}
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
