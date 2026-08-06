"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dates";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import {
  BILLING_TONE_ACCENT,
  BILLING_TONE_PILL,
  type ProjectBillingRow,
} from "@/lib/projectBillingStatus";

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[320px]">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by project or client…"
            aria-label="Search projects"
            autoFocus
            className="pl-8"
          />
        </div>
        <p className="ml-auto text-[11px] text-muted-foreground">
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
            const accent = billingRow
              ? BILLING_TONE_ACCENT[billingRow.statusTone]
              : "bg-border";
            return (
              <Link
                key={project.id}
                href={`/invoices/new/${project.id}`}
                className="relative flex flex-col gap-3 overflow-hidden rounded-xl border border-border bg-card px-5 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={cn(
                    "absolute top-0 bottom-0 left-0 w-[3px]",
                    accent,
                  )}
                />
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
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
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand" />
                </div>
                <dl className="grid grid-cols-3 gap-2 text-[11px]">
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
                <div className="flex items-center justify-between text-[11px]">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap uppercase",
                      billingRow
                        ? BILLING_TONE_PILL[billingRow.statusTone]
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {billingRow ? billingRow.statusLabel : "No action"}
                  </span>
                  <span className="font-bold text-brand">Select project</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
