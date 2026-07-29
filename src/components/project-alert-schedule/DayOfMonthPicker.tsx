"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DAY_OPTIONS,
  DAY_LABELS,
} from "@/components/project-alert-schedule/dayOfMonthLabels";

/**
 * M29 — calendar-grid alternative to a plain day-of-month `<select>`. Still
 * emits a bare 1-31 int with no month/year attached: the schedule is a
 * recurring day-of-month (see dayOfMonthLabels.ts, alertScheduleFiring.ts),
 * not an absolute date, so the grid is intentionally month-agnostic rather
 * than a real bound calendar.
 */
export function DayOfMonthPicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: number;
  onChange: (day: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
      >
        <span>{DAY_LABELS[value] ?? "Select a day"}</span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <div className="grid grid-cols-7 gap-1">
          {DAY_OPTIONS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => {
                onChange(day);
                setOpen(false);
              }}
              className={cn(
                "flex size-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                day === value &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
