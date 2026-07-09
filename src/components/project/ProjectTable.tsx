"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import type { ProjectWithRelations } from "@/repositories/projectRepository";

/** Docs/ui_design_guide.md §9/§4 — List/Ledger template for Projects. */
export function ProjectTable({
  projects,
}: {
  projects: ProjectWithRelations[];
}) {
  const router = useRouter();

  const columns: DataTableColumn<ProjectWithRelations>[] = [
    {
      header: "Name",
      cell: (project) => <span className="font-medium">{project.name}</span>,
    },
    {
      header: "Contractor",
      cell: (project) => project.contractor.name,
    },
    {
      header: "Client",
      cell: (project) => project.client.name,
    },
    {
      header: "Currency",
      cell: (project) => (
        <span className="font-mono text-[12px]">{project.displayCurrency}</span>
      ),
    },
    {
      header: "Status",
      cell: (project) => (
        <Badge
          variant={project.status === "ACTIVE" ? "default" : "secondary"}
          className="uppercase"
        >
          {project.status}
        </Badge>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={projects}
      getRowKey={(project) => project.id}
      onRowClick={(project) => router.push(`/projects/${project.id}`)}
    />
  );
}
