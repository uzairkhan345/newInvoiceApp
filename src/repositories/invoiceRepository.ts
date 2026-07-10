import { prisma } from "@/lib/prisma";
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  Prisma,
} from "@/generated/prisma/client";
import type { ProjectWithRelations } from "@/repositories/projectRepository";

/**
 * Thin Prisma wrappers only — no validation, no business rules
 * (Docs/execution_plan.md §6).
 */
export type InvoiceItemWriteInput = {
  description: string;
  quantity: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  amount: Prisma.Decimal;
  sortOrder: number;
};

export type InvoiceWriteInput = {
  projectId: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  convertedTotal: Prisma.Decimal | null;
  convertedCurrency: string | null;
  fromPartySnapshot: Prisma.InputJsonValue;
  toPartySnapshot: Prisma.InputJsonValue;
  paymentDetailsSnapshot: Prisma.InputJsonValue;
  items: InvoiceItemWriteInput[];
};

export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[];
  project: ProjectWithRelations;
};

export type InvoiceListItem = Invoice & {
  project: { id: string; name: string; client: { id: string; name: string } };
};

function findMany(filters?: {
  projectId?: string;
  status?: InvoiceStatus;
}): Promise<InvoiceListItem[]> {
  return prisma.invoice.findMany({
    where: {
      ...(filters?.projectId ? { projectId: filters.projectId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

function findById(id: string): Promise<InvoiceWithItems | null> {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      project: {
        include: {
          client: true,
          contractor: true,
          preferredPaymentMethod: true,
        },
      },
    },
  });
}

/** Sourced for invoiceNumberService's per-project sequence computation. */
function findInvoiceNumbersForProject(projectId: string): Promise<string[]> {
  return prisma.invoice
    .findMany({ where: { projectId }, select: { invoiceNumber: true } })
    .then((rows) => rows.map((row) => row.invoiceNumber));
}

function itemsCreateInput(items: InvoiceItemWriteInput[]) {
  return items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    sortOrder: item.sortOrder,
  }));
}

function createWithItems(data: InvoiceWriteInput): Promise<Invoice> {
  const { items, ...invoiceData } = data;
  return prisma.invoice.create({
    data: {
      ...invoiceData,
      items: { create: itemsCreateInput(items) },
    },
  });
}

/**
 * Docs/execution_plan.md §6 — delete-and-recreate every InvoiceItem row on
 * each DRAFT save rather than diffing; items have no identity referenced
 * elsewhere, so this is simpler and equally correct. Wrapped in a
 * transaction since it's two dependent writes, unlike createWithItems's
 * single nested-write query.
 */
function replaceItemsAndUpdate(
  id: string,
  data: InvoiceWriteInput,
): Promise<Invoice> {
  const { items, ...invoiceData } = data;
  return prisma.$transaction(async (tx) => {
    await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
    return tx.invoice.update({
      where: { id },
      data: {
        ...invoiceData,
        items: { create: itemsCreateInput(items) },
      },
    });
  });
}

/** Fields relocked at the exact moment of a DRAFT→SENT transition (§10). */
export type SentSnapshotUpdate = {
  fromPartySnapshot: Prisma.InputJsonValue;
  toPartySnapshot: Prisma.InputJsonValue;
  paymentDetailsSnapshot: Prisma.InputJsonValue;
  convertedTotal: Prisma.Decimal | null;
  convertedCurrency: string | null;
};

/**
 * `snapshotUpdate` is only ever passed for the DRAFT→SENT transition (the
 * one moment snapshot fields are ever touched again after creation) — every
 * other transition is a bare status change.
 */
function updateStatus(
  id: string,
  status: InvoiceStatus,
  snapshotUpdate?: SentSnapshotUpdate,
): Promise<Invoice> {
  return prisma.invoice.update({
    where: { id },
    data: { status, ...snapshotUpdate },
  });
}

/** Story 5.6 — deletable in any status; InvoiceItem rows cascade (schema `onDelete: Cascade`). */
function deleteById(id: string): Promise<Invoice> {
  return prisma.invoice.delete({ where: { id } });
}

export const invoiceRepository = {
  findMany,
  findById,
  findInvoiceNumbersForProject,
  createWithItems,
  replaceItemsAndUpdate,
  updateStatus,
  deleteById,
};
