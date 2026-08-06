import { FilterChips } from "@/components/shared/FilterChips";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "client", label: "Client" },
  { value: "contractor", label: "Contractor" },
] as const;

export type PartyRelationshipFilterValue = (typeof FILTERS)[number]["value"];

/**
 * Redesign v3 milestone 6 — `/parties?type=...` (omitted means "all"), same
 * server-driven-chips idiom as InvoiceStatusFilter/ProjectStatusFilter.
 * "Client"/"Contractor" match a party whose live-derived relationship
 * (partyBillingStatus.ts) is that role or "both" — there's no third chip
 * for "both", since it isn't a real distinct category in the mockup.
 */
export function PartyRelationshipFilter({
  active,
}: {
  active: PartyRelationshipFilterValue;
}) {
  return (
    <FilterChips
      options={FILTERS}
      active={active}
      hrefFor={(value) =>
        value === "all" ? "/parties" : `/parties?type=${value}`
      }
    />
  );
}
