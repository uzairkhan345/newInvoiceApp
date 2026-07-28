import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  resolveTrendPresentation,
  scaleSparklineBars,
  type TrendSemantics,
} from "@/lib/dashboardTrend";

const TONE_TEXT: Record<"positive" | "negative" | "neutral", string> = {
  positive: "text-[var(--status-paid-text)]",
  negative: "text-[var(--status-overdue-text)]",
  neutral: "text-muted-foreground",
};

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
 * is secondary subtext, never the headline metric. `trend` is optional so
 * this can still render a plain stat card without a trend indicator.
 * `href` (Docs/feedback_backlog.md — dashboard card navigation) makes the
 * whole card a link into the matching filtered list.
 */
export function StatsCard({
  label,
  value,
  subtext,
  href,
  trend,
}: {
  label: string;
  value: number;
  subtext?: ReactNode;
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
    <Card className={cn(href && "transition-colors hover:bg-muted/40")}>
      <CardContent className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
            {label}
          </span>
          {presentation ? (
            <span
              className={cn(
                "text-[11px] font-bold",
                TONE_TEXT[presentation.tone],
              )}
            >
              {presentation.arrow} {presentation.deltaText}
            </span>
          ) : null}
        </div>
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
          <div className="flex flex-col gap-0.5 font-mono text-[11px] text-muted-foreground">
            {subtext}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
