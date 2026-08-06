import type { Party } from "@/generated/prisma/client";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";
import type { ProjectWithRelations } from "@/repositories/projectRepository";
import { DUE_SOON_WITHIN_DAYS } from "@/lib/dashboardTrend";

/**
 * Parties directory (redesign v3, milestone 6) — pure aggregation over data
 * already fetched for the page (all parties, all projects, all invoices),
 * same lightweight style as projectBillingStatus.ts/buildPriorityFeed.
 *
 * `Party` has no stored Role field (Docs/implementation_decisions.md §15) —
 * "Client"/"Contractor" is not a database concept. This module derives it
 * live, display-only, from which side of Project.contractorId/clientId a
 * party actually appears on; nothing here is persisted.
 */

export type PartyRelationship = "client" | "contractor" | "both" | "unassigned";

function resolveRelationship(
  partyId: string,
  allProjects: ProjectWithRelations[],
): PartyRelationship {
  const isClient = allProjects.some((project) => project.clientId === partyId);
  const isContractor = allProjects.some(
    (project) => project.contractorId === partyId,
  );
  if (isClient && isContractor) return "both";
  if (isClient) return "client";
  if (isContractor) return "contractor";
  return "unassigned";
}

export type PartyHealthTone =
  "overdue" | "dueSoon" | "current" | "none" | "internal";

export type OutstandingBucket = { currency: string; total: string };

export type PartyBillingRow = {
  partyId: string;
  relationship: PartyRelationship;
  activeProjectCount: number;
  outstandingByCurrency: OutstandingBucket[];
  healthLabel: string;
  healthTone: PartyHealthTone;
};

/**
 * A contractor-only party (never a project's client) has no receivable
 * relationship to track — "Internal" mirrors the mock's treatment of the
 * app's own operator. A party on neither side yet (freshly created, not
 * assigned to a project) gets the same neutral "No open invoices" health as
 * a client with no invoices — there's nothing to distinguish them on.
 */
function resolveHealth(
  relationship: PartyRelationship,
  clientInvoices: InvoiceListItem[],
  now: Date,
): { label: string; tone: PartyHealthTone } {
  if (relationship === "contractor") {
    return { label: "Internal", tone: "internal" };
  }

  const outstanding = clientInvoices.filter(
    (invoice) => invoice.status === "SENT",
  );
  const overdue = outstanding.find(
    (invoice) => invoice.dueDate.getTime() < now.getTime(),
  );
  if (overdue) return { label: "Overdue", tone: "overdue" };

  const dueSoonCutoff =
    now.getTime() + DUE_SOON_WITHIN_DAYS * 24 * 60 * 60 * 1000;
  const dueSoon = outstanding.find(
    (invoice) => invoice.dueDate.getTime() <= dueSoonCutoff,
  );
  if (dueSoon) return { label: "Due soon", tone: "dueSoon" };

  if (outstanding.length > 0) return { label: "Current", tone: "current" };
  if (clientInvoices.length > 0) return { label: "Paid up", tone: "current" };
  return { label: "No open invoices", tone: "none" };
}

export function buildPartyBillingRows(input: {
  parties: Party[];
  allProjects: ProjectWithRelations[];
  allInvoices: InvoiceListItem[];
  now?: Date;
}): PartyBillingRow[] {
  const now = input.now ?? new Date();

  return input.parties.map((party) => {
    const relationship = resolveRelationship(party.id, input.allProjects);
    const activeProjectCount = input.allProjects.filter(
      (project) =>
        project.status === "ACTIVE" &&
        (project.clientId === party.id || project.contractorId === party.id),
    ).length;
    const clientInvoices = input.allInvoices.filter(
      (invoice) => invoice.project.client.id === party.id,
    );

    const outstandingTotals = new Map<string, number>();
    for (const invoice of clientInvoices) {
      if (invoice.status !== "SENT") continue;
      outstandingTotals.set(
        invoice.currency,
        (outstandingTotals.get(invoice.currency) ?? 0) + Number(invoice.total),
      );
    }
    const outstandingByCurrency = Array.from(
      outstandingTotals,
      ([currency, total]) => ({ currency, total: total.toString() }),
    );

    const { label, tone } = resolveHealth(relationship, clientInvoices, now);

    return {
      partyId: party.id,
      relationship,
      activeProjectCount,
      outstandingByCurrency,
      healthLabel: label,
      healthTone: tone,
    };
  });
}
