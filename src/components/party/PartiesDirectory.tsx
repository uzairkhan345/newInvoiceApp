"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PartyTable } from "@/components/party/PartyTable";
import type { Party } from "@/generated/prisma/client";
import type { PartyBillingRow } from "@/lib/partyBillingStatus";

/**
 * Parties list search — redesign v3 milestone 6, same client-side-only
 * reasoning as InvoicesDirectory.tsx/ProjectsDirectory.tsx's search boxes.
 */
export function PartiesDirectory({
  parties,
  billingRowByPartyId,
}: {
  parties: Party[];
  billingRowByPartyId: Record<string, PartyBillingRow>;
}) {
  const [query, setQuery] = useState("");

  const filtered = parties.filter((party) => {
    if (!query.trim()) return true;
    const haystack = `${party.name} ${party.email ?? ""}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="relative mb-4 max-w-[280px]">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search parties…"
          aria-label="Search parties"
          className="pl-8"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-[12px] text-muted-foreground">
          No parties match “{query}”.
        </div>
      ) : (
        <PartyTable
          parties={filtered}
          billingRowByPartyId={billingRowByPartyId}
        />
      )}
    </div>
  );
}
