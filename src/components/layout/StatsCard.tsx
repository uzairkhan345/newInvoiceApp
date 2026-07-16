import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Dashboard stats row (M10) — Docs/ui_design_guide.md §16. Counts only; any
 * dollar figure is secondary subtext, never the headline metric.
 */
export function StatsCard({
  label,
  value,
  subtext,
  icon: Icon,
}: {
  label: string;
  value: number;
  subtext?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="text-2xl font-extrabold tracking-[-0.02em] text-foreground">
            {value}
          </span>
          {subtext ? (
            <span className="text-[11px] text-muted-foreground">{subtext}</span>
          ) : null}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-light text-brand">
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardContent>
    </Card>
  );
}
