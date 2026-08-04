"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDisplayDate } from "@/lib/dates";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import type { ProjectBillingRow } from "@/lib/projectBillingStatus";

/**
 * Invoice create-project picker card grid (ui_redesign_handoff_v3
 * screenshots/15) — client-side search over the already-fetched ACTIVE
 * project list, same pattern as ProjectsDirectory/InvoicesDirectory.
 */
export function InvoiceProjectPicker({
  projects,
  billingRows,
}: {
  projects: ProjectWithRelations[];
  billingRows: ProjectBillingRow[];
}) {
  const [query, setQuery] = useState("");
  const billingRowByProjectId = new Map(
    billingRows.map((row) => [row.projectId, row]),
  );

  const filtered = projects.filter((project) => {
    if (!query.trim()) return true;
    const haystack = `${project.name} ${project.client.name}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="relative mb-4 max-w-[320px]">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by project or client…"
          aria-label="Search projects"
          autoFocus
          className="pl-8"
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {filtered.length} active{" "}
          {filtered.length === 1 ? "project" : "projects"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-[12px] text-muted-foreground">
          No projects match “{query}”.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((project) => {
            const billingRow = billingRowByProjectId.get(project.id);
            return (
              <Link
                key={project.id}
                href={`/invoices/new/${project.id}`}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light font-mono text-[11px] font-bold text-brand">
                    {(project.abbreviation || "??").slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-foreground">
                      {project.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {project.client.name}
                    </p>
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-2 border-t border-muted px-4 py-3 text-[11px]">
                  <div>
                    <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                      Billing
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {billingRow?.billingLabel ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                      Currency
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {project.displayCurrency}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                      Next invoice
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {billingRow?.nextInvoiceDate
                        ? formatDisplayDate(billingRow.nextInvoiceDate)
                        : "Not scheduled"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-auto flex items-center justify-between border-t border-muted px-4 py-2.5 text-[11px] font-bold text-brand">
                  Select project
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
