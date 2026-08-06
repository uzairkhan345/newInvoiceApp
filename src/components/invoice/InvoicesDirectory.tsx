"use client";

import { useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FiltersButton } from "@/components/shared/FiltersButton";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import type { InvoiceTableRow } from "@/lib/invoiceTableRow";

/**
 * Invoices list toolbar + search (ui_redesign_handoff_v3 screenshots/06) —
 * client-side only, same reasoning as ProjectsDirectory's search box. No
 * table/card view toggle here — the mockup only shows a table for invoices.
 * `filterSlot` (the status chips) is optional — the embedded, project-scoped
 * invoice list (Project detail's Invoices & alerts tab) uses `InvoiceTable`
 * directly instead of this component, so it never passes one.
 */
export function InvoicesDirectory({
  invoices,
  hideProjectColumn,
  filterSlot,
}: {
  invoices: InvoiceTableRow[];
  hideProjectColumn?: boolean;
  filterSlot?: ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = invoices.filter((invoice) => {
    if (!query.trim()) return true;
    const haystack =
      `${invoice.invoiceNumber} ${invoice.project.client.name} ${invoice.project.name}`.toLowerCase();
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
            placeholder="Search invoices…"
            aria-label="Search invoices"
            className="pl-8"
          />
        </div>
        {filterSlot}
        <FiltersButton className="ml-auto" />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-[12px] text-muted-foreground">
          No invoices match “{query}”.
        </div>
      ) : (
        <InvoiceTable
          invoices={filtered}
          hideProjectColumn={hideProjectColumn}
        />
      )}
    </div>
  );
}
