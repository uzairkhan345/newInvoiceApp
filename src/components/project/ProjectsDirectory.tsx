"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Search, LayoutGrid, Rows3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FiltersButton } from "@/components/shared/FiltersButton";
import { ProjectTable } from "@/components/project/ProjectTable";
import { ProjectCardGrid } from "@/components/project/ProjectCardGrid";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

type View = "table" | "cards";
const VIEW_STORAGE_KEY = "projects-view";

/**
 * `useSyncExternalStore` — the hydration-safe way to read a browser-only
 * value like localStorage: the server snapshot ("table") and the client's
 * first-paint snapshot are allowed to differ without React warning about a
 * mismatch, unlike reading it in a `useState` lazy initializer or a plain
 * `useEffect` + `setState` (the latter also trips the
 * `react-hooks/set-state-in-effect` lint rule). `notify` lets `selectView`
 * below announce same-tab writes — `storage` events only fire cross-tab.
 */
const viewListeners = new Set<() => void>();
function subscribeToView(callback: () => void) {
  viewListeners.add(callback);
  return () => viewListeners.delete(callback);
}
function notifyViewChanged() {
  viewListeners.forEach((callback) => callback());
}
function getViewSnapshot(): View {
  return window.localStorage.getItem(VIEW_STORAGE_KEY) === "cards"
    ? "cards"
    : "table";
}
function getServerViewSnapshot(): View {
  return "table";
}

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
  const view = useSyncExternalStore(
    subscribeToView,
    getViewSnapshot,
    getServerViewSnapshot,
  );

  function selectView(next: View) {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    notifyViewChanged();
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
        {filterSlot}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
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
