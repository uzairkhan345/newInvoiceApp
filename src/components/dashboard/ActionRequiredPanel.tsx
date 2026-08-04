"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowUpRight, Clock, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DUE_SOON_WITHIN_DAYS } from "@/lib/dashboardTrend";
import type { PriorityFeedItem, PriorityFeedBarTone } from "@/lib/priorityFeed";

/**
 * Dashboard "Action required" panel (redesign v3,
 * ui_redesign_handoff_v3/rendered-html/01-dashboard.html +
 * prototype-source/globals.css's .metric-card/.action-row rules) — the 4
 * toggle-filter metric cards plus the filtered action list below them,
 * sharing one client-side filter state exactly like the mockup's single
 * component does. Replaces the old dashboard StatsCard row + PriorityFeed.
 *
 * Rows are plain containers, not whole-row `<Link>`s: the mockup always
 * keeps the project name independently clickable from the row's own
 * primary action, and a `<button>`/nested `<a>` can't validly sit inside
 * an enclosing `<a>` — same constraint M29's old fired-alert rows hit.
 */

type MetricKey = "prepare" | "draft" | "due" | "overdue";
type FilterKey = MetricKey | "all";

const METRIC_ORDER: MetricKey[] = ["prepare", "draft", "due", "overdue"];

const METRIC_CONFIG: Record<
  MetricKey,
  { label: string; icon: typeof Plus; iconBg: string; iconText: string }
> = {
  prepare: {
    label: "Invoices to prepare",
    icon: Plus,
    iconBg: "bg-[var(--status-sent-bg)]",
    iconText: "text-[var(--status-sent-text)]",
  },
  draft: {
    label: "Drafts to send",
    icon: ArrowUpRight,
    iconBg: "bg-brand-light",
    iconText: "text-brand",
  },
  due: {
    label: `Due within ${DUE_SOON_WITHIN_DAYS} days`,
    icon: Clock,
    iconBg: "bg-blue-100",
    iconText: "text-blue-600",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    iconBg: "bg-[var(--status-overdue-bg)]",
    iconText: "text-[var(--status-overdue-text)]",
  },
};

const TONE_STYLES: Record<
  PriorityFeedBarTone,
  { bar: string; tagBg: string; tagText: string }
> = {
  overdue: {
    bar: "bg-[var(--status-overdue-text)]",
    tagBg: "bg-[var(--status-overdue-bg)]",
    tagText: "text-[var(--status-overdue-text)]",
  },
  prepare: {
    bar: "bg-[var(--status-sent-text)]",
    tagBg: "bg-[var(--status-sent-bg)]",
    tagText: "text-[var(--status-sent-text)]",
  },
  draft: {
    bar: "bg-brand",
    tagBg: "bg-brand-light",
    tagText: "text-brand",
  },
  due: {
    bar: "bg-blue-600",
    tagBg: "bg-blue-100",
    tagText: "text-blue-700",
  },
  setup: {
    bar: "bg-[var(--status-draft-text)]",
    tagBg: "bg-[var(--status-draft-bg)]",
    tagText: "text-[var(--status-draft-text)]",
  },
};

export type ActionMetric = { count: number; amount?: string };

export function ActionRequiredPanel({
  items,
  metrics,
}: {
  items: PriorityFeedItem[];
  metrics: Record<MetricKey, ActionMetric>;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const filtered =
    filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {METRIC_ORDER.map((key) => {
          const config = METRIC_CONFIG[key];
          const metric = metrics[key];
          const selected = filter === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(selected ? "all" : key)}
              className={cn(
                "group relative flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                selected && "border-brand/40 ring-2 ring-brand/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-lg",
                  config.iconBg,
                  config.iconText,
                )}
              >
                <config.icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[10px] font-extrabold tracking-wide text-muted-foreground uppercase">
                {config.label}
              </span>
              <span className="mt-1.5 font-mono text-2xl font-bold text-foreground">
                {metric.count}
              </span>
              {metric.amount ? (
                <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {metric.amount}
                </span>
              ) : null}
              <span
                className={cn(
                  "absolute right-4 bottom-3.5 text-[10px] font-bold text-muted-foreground opacity-0 transition-opacity",
                  "group-hover:opacity-100",
                  selected && "opacity-100",
                )}
              >
                View items →
              </span>
            </button>
          );
        })}
      </div>

      <Card className="mt-4 gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-[18px]">
          <div>
            <span className="text-[15px] font-bold text-foreground">
              Action required
            </span>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Projects where the billing cycle needs your attention.
            </p>
          </div>
          {filter !== "all" ? (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="rounded-md bg-accent px-2.5 py-1.5 text-[11px] font-bold text-brand"
            >
              Clear filter ×
            </button>
          ) : null}
        </div>

        <div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-[12px] text-muted-foreground">
              No items in this category.
            </div>
          ) : (
            filtered.map((item, index) => {
              const tone = TONE_STYLES[item.barTone];
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-stretch gap-4 px-5 py-3.5",
                    index > 0 && "border-t border-muted",
                  )}
                >
                  <span
                    className={cn(
                      "w-[3px] shrink-0 self-stretch rounded-full",
                      tone.bar,
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-[5px] px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide uppercase",
                          tone.tagBg,
                          tone.tagText,
                        )}
                      >
                        {item.tier}
                      </span>
                      <Link
                        href={`/projects/${item.projectId}`}
                        className="truncate text-[13px] font-bold text-foreground hover:text-brand hover:underline"
                      >
                        {item.projectName}
                      </Link>
                      {item.clientName ? (
                        <span className="truncate border-l border-border pl-2 text-[10px] text-muted-foreground">
                          {item.clientName}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[12px] font-semibold text-foreground">
                      {item.issue}
                    </span>
                    {item.note ? (
                      <span className="text-[10px] text-muted-foreground">
                        {item.note}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-center gap-0.5">
                    {item.amount ? (
                      <span className="font-mono text-[12px] font-semibold text-foreground">
                        {item.amount}
                      </span>
                    ) : null}
                    {item.timing ? (
                      <span
                        className={cn(
                          "text-[10px]",
                          item.timingDanger
                            ? "font-bold text-[var(--status-overdue-text)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.timing}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 self-center">
                    {item.secondaryLink ? (
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={item.secondaryLink.href} />}
                      >
                        {item.secondaryLink.label}
                      </Button>
                    ) : null}
                    {item.action.disabled ? (
                      <span title={item.action.disabledReason}>
                        <Button variant="secondary" size="sm" disabled>
                          {item.action.label}
                        </Button>
                      </span>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={item.action.href ?? "#"} />}
                      >
                        {item.action.label}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => setFilter("all")}
          className="w-full border-t border-border bg-muted/40 py-3 text-center text-[11px] font-bold text-brand"
        >
          View all billing actions →
        </button>
      </Card>
    </>
  );
}
