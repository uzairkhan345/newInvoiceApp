import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectService } from "@/services/projectService";

/**
 * Docs/implementation_decisions.md §20 — the mandatory project-picker gate.
 * There is no path to the invoice form that skips picking an existing
 * project first (Story 4.1).
 */
export default async function NewInvoiceProjectPickerPage() {
  const projects = await projectService.list();

  return (
    <>
      <PageHeader
        title="Create Invoice"
        subtitle="Pick the project this invoice belongs to — contractor, client, payment method, and invoice number format all come from it."
      />
      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project before you can create an invoice."
          action={
            <Button nativeButton={false} render={<Link href="/projects/new" />}>
              Create your first project
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/invoices/new/${project.id}`}
              className="flex items-center justify-between rounded-[10px] border border-border p-4 transition-colors hover:bg-muted/40"
            >
              <div>
                <p className="text-[13px] font-bold text-foreground">
                  {project.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {project.contractor.name} → {project.client.name}
                </p>
              </div>
              <Badge
                variant={project.status === "ACTIVE" ? "default" : "secondary"}
                className="uppercase"
              >
                {project.status}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
