"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProjectAction, PlannerSection } from "@/lib/weeklyActionPlanner";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";
import type { PriorityFeedBarTone } from "@/lib/priorityFeed";

const SECTIONS: { value: PlannerSection; label: string }[] = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "later", label: "Later" },
  { value: "unscheduled", label: "Unscheduled" },
];

const SECTION_HEADER_STYLES: Record<PlannerSection, string> = {
  overdue: "bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]",
  today: "bg-[var(--status-upcoming-bg)] text-[var(--status-upcoming-text)]",
  week: "bg-[var(--status-upcoming-bg)] text-[var(--status-upcoming-text)]",
  later: "bg-[var(--status-draft-bg)] text-[var(--status-draft-text)]",
  unscheduled: "bg-[var(--status-sent-bg)] text-[var(--status-sent-text)]",
  onTrack: "bg-[var(--status-paid-bg)] text-[var(--status-paid-text)]",
};

const ACTION_ACCENT_STYLES: Record<PriorityFeedBarTone, string> = {
  overdue: "bg-[var(--status-overdue-text)]",
  prepare: "bg-[var(--status-sent-text)]",
  draft: "bg-brand",
  due: "bg-[var(--status-upcoming-text)]",
  setup: "bg-[var(--status-sent-text)]",
};

export function WeeklyActionPlanner({
  actions,
  onTrackProjects,
}: {
  actions: ProjectAction[];
  onTrackProjects: ProjectBillingRow[];
}) {
  const [filter, setFilter] = useState<PlannerSection | "onTrack" | "all">(
    "all",
  );
  const visible =
    filter === "all" || filter === "onTrack"
      ? actions
      : actions.filter((action) => action.section === filter);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((section) => {
          const count = actions.filter(
            (action) => action.section === section.value,
          ).length;
          if (section.value === "today" && count === 0) return null;
          return (
            <button
              key={section.value}
              type="button"
              onClick={() =>
                setFilter(filter === section.value ? "all" : section.value)
              }
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-bold",
                filter === section.value
                  ? SECTION_HEADER_STYLES[section.value]
                  : "border-border bg-card text-muted-foreground",
                section.value === "overdue" &&
                  filter === "all" &&
                  "border-[var(--status-overdue-text)]/30 bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]",
              )}
            >
              {section.label} ({count})
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setFilter(filter === "onTrack" ? "all" : "onTrack")}
          className={cn(
            "rounded-full border px-3 py-1.5 text-[11px] font-bold text-[var(--status-paid-text)]",
            filter === "onTrack"
              ? "border-[var(--status-paid-text)] bg-[var(--status-paid-bg)]"
              : "border-border bg-card",
          )}
        >
          On track ({onTrackProjects.length})
        </button>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[14px] font-semibold">Weekly action planner</h2>
            <p className="text-[11px] text-muted-foreground">
              One highest-priority action per project.
            </p>
          </div>
        </div>
        {filter === "onTrack" ? (
          <div>
            {onTrackProjects.map((project) => (
              <div
                key={project.projectId}
                className="flex items-center justify-between border-b border-muted px-5 py-4 last:border-b-0"
              >
                <div>
                  <Link
                    href={`/projects/${project.projectId}?returnTo=%2F`}
                    className="text-[13px] font-bold hover:text-brand hover:underline"
                  >
                    {project.projectName}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">
                    {project.clientName} · No action required
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/projects/${project.projectId}?returnTo=%2F`}
                    />
                  }
                >
                  Open project
                </Button>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <CheckCircle2 className="h-6 w-6 text-[var(--status-paid-text)]" />
            <p className="text-[12px] text-muted-foreground">
              No project actions in this period.
            </p>
          </div>
        ) : (
          SECTIONS.map((section) => {
            const rows = visible.filter(
              (action) => action.section === section.value,
            );
            if (rows.length === 0) return null;
            return (
              <section key={section.value}>
                <div
                  className={cn(
                    "border-b border-border px-5 py-2 text-[10px] font-extrabold tracking-wide uppercase",
                    SECTION_HEADER_STYLES[section.value],
                  )}
                >
                  {section.label}
                </div>
                {rows.map((action) => (
                  <div
                    key={action.id}
                    className="relative grid gap-3 border-b border-muted px-5 py-4 pl-6 last:border-b-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_auto_auto] lg:items-center"
                  >
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-[3px]",
                        ACTION_ACCENT_STYLES[action.barTone],
                      )}
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/projects/${action.projectId}?returnTo=%2F`}
                        className="truncate text-[13px] font-bold hover:text-brand hover:underline"
                      >
                        {action.projectName}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {action.clientName}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold">
                        {action.issue}
                      </p>
                      {action.note ? (
                        <p className="text-[10px] text-muted-foreground">
                          {action.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="lg:text-right">
                      {action.amount ? (
                        <p className="font-mono text-[12px] font-semibold">
                          {action.amount}
                        </p>
                      ) : null}
                      <p
                        className={cn(
                          "text-[10px]",
                          action.timingDanger
                            ? "font-bold text-[var(--status-overdue-text)]"
                            : "text-muted-foreground",
                        )}
                      >
                        {action.timing ?? "No date set"}
                      </p>
                    </div>
                    {action.action.disabled ? (
                      <span title={action.action.disabledReason}>
                        <Button size="sm" variant="secondary" disabled>
                          {action.action.label}
                        </Button>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        nativeButton={false}
                        render={
                          <Link
                            href={
                              action.action.href ??
                              `/projects/${action.projectId}`
                            }
                          />
                        }
                      >
                        {action.action.label}
                      </Button>
                    )}
                  </div>
                ))}
              </section>
            );
          })
        )}
      </Card>
    </div>
  );
}
