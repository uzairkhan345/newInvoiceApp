"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClearAlertScheduleButton } from "@/components/project-alert-schedule/ClearAlertScheduleButton";
import { listPriorityFeedAction } from "@/actions/priorityFeed.actions";
import type {
  PriorityFeedItem,
  PriorityFeedCategory,
} from "@/lib/priorityFeed";

const DOT_TONE: Record<PriorityFeedCategory, string> = {
  overdue: "bg-[var(--status-overdue-text)]",
  prepare: "bg-[var(--status-sent-text)]",
  draft: "bg-brand",
  due: "bg-blue-600",
  setup: "bg-[var(--status-draft-text)]",
};

/** `prepare` items' id is `prepare-${scheduleId}` (see priorityFeed.ts) — the only category with a real dismiss/clear concept (ProjectAlertSchedule.clearedAt). */
function scheduleIdFor(item: PriorityFeedItem): string | null {
  return item.category === "prepare" ? item.id.slice("prepare-".length) : null;
}

/**
 * Global alerts bell (nav shell) — shows the same overdue/prepare/draft/due/
 * setup feed as the Dashboard's Action Required panel (`listPriorityFeedAction`
 * mirrors `buildPriorityFeed`'s inputs in `src/app/page.tsx`), broadened from
 * fired-ProjectAlertSchedule-only per explicit user direction (this
 * intentionally revisits part of M30's dashboard/bell split — see
 * Docs/internal/feedback_backlog.md's dashboard-v3 section). `Sidebar`/
 * `MobileTopBar` are permanently-mounted Client Components with no per-page
 * server props, so this fetches its own data via a server action rather than
 * reading it from a layout — refetched on mount and on every client-side
 * navigation (pathname change), since that's the only invalidation signal
 * that reaches a component this high in the tree.
 */
export function AlertsBell({ variant }: { variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();
  const [items, setItems] = useState<PriorityFeedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    listPriorityFeedAction().then((result) => {
      if (!cancelled && result.success) setItems(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          variant === "sidebar"
            ? "h-[30px] w-[30px] bg-nav-active text-nav-active-foreground"
            : "h-[26px] w-[26px] bg-white/[0.08] text-white",
        )}
      >
        <Bell className="h-3.5 w-3.5" />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-nav bg-red-400 px-[3px] text-[9px] font-bold text-white">
            {count}
          </span>
        ) : null}
        <span className="sr-only">
          {count > 0 ? `${count} pending alerts` : "No pending alerts"}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side={variant === "sidebar" ? "right" : "bottom"}
        align={variant === "sidebar" ? "start" : "end"}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3.5">
          <div>
            <div className="text-[14px] font-normal tracking-[-0.14px] text-foreground">
              Pending alerts
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Triggered items that need attention
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-1 text-[10px] font-bold text-brand">
            {count} active
          </span>
        </div>
        {count === 0 ? (
          <div className="border-t border-border px-4 py-6 text-center text-[12px] text-muted-foreground">
            No pending alerts.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {items.map((item) => {
              const scheduleId = scheduleIdFor(item);
              return (
                <div
                  key={item.id}
                  className="flex gap-2.5 border-t border-border px-4 py-3"
                >
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      DOT_TONE[item.category],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-semibold text-foreground">
                      {item.issue}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {item.projectName}
                      {item.clientName ? ` · ${item.clientName}` : ""}
                      {item.amount ? ` · ${item.amount}` : ""}
                    </span>
                    {item.timing ? (
                      <span
                        className={cn(
                          "block text-[11px]",
                          item.timingDanger
                            ? "font-semibold text-[var(--status-overdue-text)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {item.timing}
                      </span>
                    ) : null}
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold">
                      {item.action.disabled ? (
                        <span
                          className="text-muted-foreground"
                          title={item.action.disabledReason}
                        >
                          {item.action.label}
                        </span>
                      ) : (
                        <Link
                          href={item.action.href ?? "#"}
                          className="text-brand hover:underline"
                        >
                          {item.action.label}
                        </Link>
                      )}
                      {scheduleId ? (
                        <ClearAlertScheduleButton
                          scheduleId={scheduleId}
                          projectId={item.projectId}
                          className="h-auto shrink-0 border-none bg-transparent p-0 text-[11px] font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onCleared={() =>
                            setItems((prev) =>
                              prev.filter((i) => i.id !== item.id),
                            )
                          }
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="border-t border-border px-4 py-2.5 text-center">
          <Link
            href="/"
            className="text-[11px] font-bold text-brand hover:underline"
          >
            View action dashboard →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
