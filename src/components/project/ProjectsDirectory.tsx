"use client";

import { useState } from "react";
import { Search, LayoutGrid, Rows3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProjectTable } from "@/components/project/ProjectTable";
import { ProjectCardGrid } from "@/components/project/ProjectCardGrid";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

type View = "table" | "cards";
const VIEW_STORAGE_KEY = "projects-view";

/**
 * Projects list toolbar + table/card view switch (ui_redesign_handoff_v3
 * screenshots/04-05). Search and the view preference are client-side only —
 * the status filter tabs (All/Active/Needs attention/Archived) stay
 * server-driven Links, unchanged from before this redesign.
 */
export function ProjectsDirectory({
  projects,
  firedProjectIds = [],
  billingRowByProjectId,
}: {
  projects: ProjectWithRelations[];
  firedProjectIds?: string[];
  billingRowByProjectId: Record<string, ProjectBillingRow>;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "table";
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "table" || stored === "cards" ? stored : "table";
  });

  function selectView(next: View) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const filtered = projects.filter((project) => {
    if (!query.trim()) return true;
    const haystack =
      `${project.name} ${project.client.name} ${project.abbreviation ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[280px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="pl-8"
          />
        </div>
        <div className="ml-auto flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            aria-label="Table view"
            aria-pressed={view === "table"}
            onClick={() => selectView("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold",
              view === "table"
                ? "bg-card text-brand shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Rows3 className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            type="button"
            aria-label="Card view"
            aria-pressed={view === "cards"}
            onClick={() => selectView("cards")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold",
              view === "cards"
                ? "bg-card text-brand shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-[12px] text-muted-foreground">
          No projects match “{query}”.
        </div>
      ) : view === "table" ? (
        <ProjectTable projects={filtered} firedProjectIds={firedProjectIds} />
      ) : (
        <ProjectCardGrid
          projects={filtered}
          firedProjectIds={firedProjectIds}
          billingRowByProjectId={billingRowByProjectId}
        />
      )}
    </div>
  );
}
