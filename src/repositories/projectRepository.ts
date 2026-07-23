import { prisma } from "@/lib/prisma";
import type {
  Party,
  PaymentMethod,
  Project,
  DisplayCurrency,
  ProjectStatus,
  InvoicePeriodType,
} from "@/generated/prisma/client";

/**
 * Thin Prisma wrappers only — no validation, no business rules
 * (Docs/execution_plan.md §6). `preferredPaymentMethodId: null` explicitly
 * clears the field on update, matching the null-normalization pattern used by
 * partyRepository/paymentMethodRepository.
 */
export type ProjectWriteInput = {
  name: string;
  abbreviation: string | null;
  serviceDescription: string | null;
  clientId: string;
  contractorId: string;
  preferredPaymentMethodId: string | null;
  invoiceNumberFormat: string;
  invoicePeriodType: InvoicePeriodType | null;
  displayCurrency: DisplayCurrency;
  status: ProjectStatus;
};

export type ProjectWithRelations = Project & {
  client: Party;
  contractor: Party;
  preferredPaymentMethod: PaymentMethod | null;
};

function findMany(): Promise<ProjectWithRelations[]> {
  return prisma.project.findMany({
    include: { client: true, contractor: true, preferredPaymentMethod: true },
    orderBy: { name: "asc" },
  });
}

function findById(id: string): Promise<ProjectWithRelations | null> {
  return prisma.project.findUnique({
    where: { id },
    include: { client: true, contractor: true, preferredPaymentMethod: true },
  });
}

function create(data: ProjectWriteInput): Promise<Project> {
  return prisma.project.create({ data });
}

function update(id: string, data: ProjectWriteInput): Promise<Project> {
  return prisma.project.update({ where: { id }, data });
}

function deleteById(id: string): Promise<Project> {
  return prisma.project.delete({ where: { id } });
}

/**
 * Story 3.4 / Docs/implementation_decisions.md §18: a Project is deletable
 * only while it has zero Invoice rows. invoiceRepository doesn't exist until
 * M5, so this counts the Invoice table directly — same pattern M2/M3 used for
 * their own deferred live-reference checks against Project.
 */
function countInvoices(projectId: string): Promise<number> {
  return prisma.invoice.count({ where: { projectId } });
}

/**
 * Dashboard (M10) — projects missing a preferred payment method, Story 8.3.
 * Scoped to ACTIVE only: an ARCHIVED project isn't issuing new invoices, so
 * flagging it as needing attention would just be noise on the dashboard.
 */
function findMissingPreferredPaymentMethod(): Promise<ProjectWithRelations[]> {
  return prisma.project.findMany({
    where: { preferredPaymentMethodId: null, status: "ACTIVE" },
    include: { client: true, contractor: true, preferredPaymentMethod: true },
    orderBy: { name: "asc" },
  });
}

/** Dashboard (M10) — Active Projects stat. */
function countActive(): Promise<number> {
  return prisma.project.count({ where: { status: "ACTIVE" } });
}

/** Dashboard (M10) — Recent Activity's "project created" events. */
function findRecentlyCreated(limit: number): Promise<ProjectWithRelations[]> {
  return prisma.project.findMany({
    include: { client: true, contractor: true, preferredPaymentMethod: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export const projectRepository = {
  findMany,
  findById,
  create,
  update,
  delete: deleteById,
  countInvoices,
  findMissingPreferredPaymentMethod,
  countActive,
  findRecentlyCreated,
};
