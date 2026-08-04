"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FiltersButton } from "@/components/shared/FiltersButton";
import { ViewToggle } from "@/components/shared/ViewToggle";
import { useViewPreference } from "@/lib/useViewPreference";
import { ProjectTable } from "@/components/project/ProjectTable";
import { ProjectCardGrid } from "@/components/project/ProjectCardGrid";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

const VIEW_STORAGE_KEY = "projects-view";

/**
 * Projects list toolbar + table/card view switch (ui_redesign_handoff_v3
 * screenshots/04-05). Search and the view preference are client-side only —
 * the status filter tabs (All/Active/Needs attention/Archived) stay
 * server-driven Links, unchanged from before this redesign, but now render
 * via `filterSlot` in the same toolbar row as search rather than a separate
 * row above it, matching the reference's single-row toolbar.
 */
export function ProjectsDirectory({
  projects,
  firedProjectIds = [],
  billingRowByProjectId,
  filterSlot,
}: {
  projects: ProjectWithRelations[];
  firedProjectIds?: string[];
  billingRowByProjectId: Record<string, ProjectBillingRow>;
  filterSlot?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useViewPreference(VIEW_STORAGE_KEY);

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
        {filterSlot}
        <div className="ml-auto flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <FiltersButton />
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
