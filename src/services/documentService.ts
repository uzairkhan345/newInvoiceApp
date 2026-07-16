import type { InvoiceStatus } from "@/generated/prisma/client";
import type { InvoiceWithItems } from "@/repositories/invoiceRepository";
import type { PaymentMethodField } from "@/repositories/paymentMethodRepository";

export type PartySnapshotData = {
  name: string;
  email: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

/** `quantity`/`unitPrice` are null exactly when `isFlatAmount` is true (M14). */
export type InvoiceDocumentLineItem = {
  id: string;
  description: string;
  isFlatAmount: boolean;
  quantity: string | null;
  unitPrice: string | null;
  amount: string;
};

export type InvoiceDocumentData = {
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  projectName: string;
  contractor: PartySnapshotData;
  client: PartySnapshotData;
  paymentDetails: PaymentMethodField[];
  items: InvoiceDocumentLineItem[];
  itemsNote: string | null;
  subtotal: string;
  total: string;
  convertedTotal: string | null;
  convertedCurrency: string | null;
  bottomNote: string | null;
};

/**
 * Docs/execution_plan.md §12 — the single view-model assembler consumed
 * identically by the on-screen preview, the print route, and (M8/M9) the
 * Excel/PDF builders. Sources exclusively from the invoice's own scalar
 * fields and snapshot JSON (never a live Party/PaymentMethod lookup, even
 * for a DRAFT invoice mid-edit) — a pure, synchronous mapper that imports no
 * repository, so there is nothing here that could ever issue a live query.
 * `invoice.items` arrives pre-ordered by `sortOrder` (invoiceRepository.findById's
 * `orderBy`), so no re-sorting is needed here.
 */
function assembleInvoiceDocumentData(
  invoice: InvoiceWithItems,
): InvoiceDocumentData {
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    projectName: invoice.project.name,
    contractor: invoice.fromPartySnapshot as unknown as PartySnapshotData,
    client: invoice.toPartySnapshot as unknown as PartySnapshotData,
    paymentDetails:
      invoice.paymentDetailsSnapshot as unknown as PaymentMethodField[],
    items: invoice.items.map((item) => ({
      id: item.id,
      description: item.description,
      isFlatAmount: item.isFlatAmount,
      quantity: item.quantity?.toString() ?? null,
      unitPrice: item.unitPrice?.toString() ?? null,
      amount: item.amount.toString(),
    })),
    itemsNote: invoice.itemsNote,
    subtotal: invoice.subtotal.toString(),
    total: invoice.total.toString(),
    convertedTotal: invoice.convertedTotal?.toString() ?? null,
    convertedCurrency: invoice.convertedCurrency,
    bottomNote: invoice.bottomNote,
  };
}

export const documentService = {
  assembleInvoiceDocumentData,
};
