import Link from "next/link";
import { BellDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { paymentMethodSummary } from "@/components/project/ProjectTable";
import { formatCurrency } from "@/lib/currency";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import {
  BILLING_TONE_ACCENT,
  BILLING_TONE_PILL,
  type ProjectBillingRow,
} from "@/lib/projectBillingStatus";

/**
 * Projects list — alternative card view (ui_redesign_handoff_v3
 * screenshots/05-projects-card-desktop.jpg), toggled against ProjectTable by
 * ProjectsDirectory. Archived projects have no billing row (that aggregate
 * is ACTIVE-only) — they render a plain neutral "Archived" tag instead.
 */
export function ProjectCardGrid({
  projects,
  firedProjectIds = [],
  billingRowByProjectId,
}: {
  projects: ProjectWithRelations[];
  firedProjectIds?: string[];
  billingRowByProjectId: Record<string, ProjectBillingRow>;
}) {
  const firedProjectIdSet = new Set(firedProjectIds);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const billingRow = billingRowByProjectId[project.id];
        const paymentMethod = paymentMethodSummary(project);
        const accent = billingRow
          ? BILLING_TONE_ACCENT[billingRow.statusTone]
          : "bg-border";

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={cn("absolute top-0 bottom-0 left-0 w-[3px]", accent)}
            />
            <div className="flex items-center gap-2.5 py-3.5 pr-4 pl-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light font-mono text-[11px] font-bold text-brand">
                {(project.abbreviation || "??").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-bold text-foreground">
                    {project.name}
                  </span>
                  {firedProjectIdSet.has(project.id) ? (
                    <BellDot
                      className="h-3.5 w-3.5 shrink-0 text-[var(--status-overdue-text)]"
                      aria-label="Has a pending alert"
                    />
                  ) : null}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  {project.client.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between border-y border-muted bg-muted/30 px-5 py-2.5">
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap uppercase",
                  billingRow
                    ? BILLING_TONE_PILL[billingRow.statusTone]
                    : "bg-muted text-muted-foreground",
                )}
              >
                {billingRow ? billingRow.statusLabel : "Archived"}
              </span>
              {billingRow && Number(billingRow.exposureTotal) > 0 ? (
                <span className="font-mono text-[13px] font-semibold text-foreground">
                  {formatCurrency(
                    billingRow.exposureTotal,
                    billingRow.exposureCurrency,
                  )}
                </span>
              ) : null}
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 px-5 py-3.5 text-[11px]">
              <div>
                <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                  Billing cycle
                </dt>
                <dd className="mt-1 text-foreground">
                  {billingRow?.billingLabel ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                  Next billing
                </dt>
                <dd className="mt-1 text-foreground">
                  {billingRow?.nextInvoiceDate
                    ? new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      }).format(billingRow.nextInvoiceDate)
                    : "Not scheduled"}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="font-bold tracking-wide text-muted-foreground uppercase">
                  Payment setup
                </dt>
                <dd
                  className={cn(
                    "mt-1 truncate",
                    paymentMethod.missing
                      ? "font-semibold text-[var(--alert-warning-text)]"
                      : "text-foreground",
                  )}
                >
                  {paymentMethod.text}
                </dd>
              </div>
            </dl>
            <div className="mt-auto flex items-center justify-between border-t border-muted px-5 py-2.5 text-[11px] font-bold text-brand">
              Open project
              <span>→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
