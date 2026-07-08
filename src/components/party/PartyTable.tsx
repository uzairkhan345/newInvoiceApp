"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import type { Party } from "@/generated/prisma/client";

/**
 * Docs/ui_design_guide.md §9 — single unified roster, no role column/filter
 * (Docs/implementation_decisions.md §15). `Type` renders as a neutral,
 * informational tag only, never a filter axis.
 */
export function PartyTable({ parties }: { parties: Party[] }) {
  const router = useRouter();

  const columns: DataTableColumn<Party>[] = [
    {
      header: "Name",
      cell: (party) => <span className="font-medium">{party.name}</span>,
    },
    {
      header: "Type",
      cell: (party) => (
        <Badge variant="secondary" className="uppercase">
          {party.type}
        </Badge>
      ),
    },
    {
      header: "Email",
      cell: (party) =>
        party.email ?? <span className="text-muted-foreground">—</span>,
    },
    {
      header: "Location",
      cell: (party) =>
        [party.city, party.state, party.country].filter(Boolean).join(", ") || (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={parties}
      getRowKey={(party) => party.id}
      onRowClick={(party) => router.push(`/parties/${party.id}`)}
    />
  );
}
