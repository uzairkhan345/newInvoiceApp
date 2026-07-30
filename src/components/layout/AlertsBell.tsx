"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ClearAlertScheduleButton } from "@/components/project-alert-schedule/ClearAlertScheduleButton";
import { listFiredAlertSchedulesAction } from "@/actions/projectAlertSchedule.actions";
import { DAY_LABELS } from "@/components/project-alert-schedule/dayOfMonthLabels";
import type { AlertScheduleWithProject } from "@/repositories/projectAlertScheduleRepository";

/**
 * Global alerts bell (nav shell) — fired ProjectAlertSchedule rows used to
 * render as an "Alert" category inside the dashboard Priority Feed; they now
 * live only here, visible from every page instead of just the Dashboard
 * (see priorityFeed.ts for why that also fixed the banner's chip count).
 * `Sidebar`/`MobileTopBar` are permanently-mounted Client Components with no
 * per-page server props, so this fetches its own data via a server action
 * rather than reading it from a layout — refetched on mount and on every
 * client-side navigation (pathname change), since that's the only
 * invalidation signal that reaches a component this high in the tree.
 */
export function AlertsBell({
  variant,
}: {
  variant: "sidebar" | "mobile";
}) {
  const pathname = usePathname();
  const [schedules, setSchedules] = useState<AlertScheduleWithProject[]>([]);

  useEffect(() => {
    let cancelled = false;
    listFiredAlertSchedulesAction().then((result) => {
      if (!cancelled && result.success) setSchedules(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const count = schedules.length;

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
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-[13px] font-bold text-foreground">
            Pending Alerts
          </span>
          <span className="text-[11px] text-muted-foreground">
            {count} active
          </span>
        </div>
        {count === 0 ? (
          <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
            No pending alerts.
          </div>
        ) : (
          schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center gap-3 border-t border-border px-4 py-3 first:border-t-0"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-bold text-foreground">
                  {schedule.label ||
                    `Day ${DAY_LABELS[schedule.dayOfMonth]} reminder`}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {schedule.project.name} ·{" "}
                  {schedule.recurring ? "recurring" : "one-time"}
                </div>
              </div>
              <ClearAlertScheduleButton
                scheduleId={schedule.id}
                projectId={schedule.project.id}
                className="h-6 shrink-0 rounded-full border-none bg-accent px-2.5 text-[10px] text-accent-foreground hover:bg-accent"
                onCleared={() =>
                  setSchedules((prev) =>
                    prev.filter((s) => s.id !== schedule.id),
                  )
                }
              />
            </div>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
