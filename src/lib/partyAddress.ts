import type { PartySnapshotData } from "@/services/documentService";

/**
 * Shared by InvoiceDocument.tsx (on-screen/print) and buildInvoiceWorkbook.ts
 * (Excel) so the address-line formatting can't drift between the two
 * outputs.
 */
export function addressLines(party: PartySnapshotData): string[] {
  const lines: string[] = [];
  if (party.street1) lines.push(party.street1);
  if (party.street2) lines.push(party.street2);
  const cityState = [party.city, party.state].filter(Boolean).join(", ");
  const cityLine = [cityState, party.postalCode].filter(Boolean).join(" ");
  if (cityLine) lines.push(cityLine);
  if (party.country) lines.push(party.country);
  return lines;
}
