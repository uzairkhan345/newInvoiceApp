"use server";

import { revalidatePath } from "next/cache";
import {
  invoiceService,
  ProjectNotFoundError,
  InvoiceNotFoundError,
  InvoiceNotDraftError,
  DuplicateInvoiceNumberError,
} from "@/services/invoiceService";
import { invoiceSchema } from "@/lib/validation/invoice";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

function friendlyErrorOrThrow(error: unknown): string {
  if (
    error instanceof ProjectNotFoundError ||
    error instanceof InvoiceNotFoundError ||
    error instanceof InvoiceNotDraftError ||
    error instanceof DuplicateInvoiceNumberError
  ) {
    return error.message;
  }
  throw error;
}

export async function createInvoiceDraftAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const invoice = await invoiceService.createDraft(projectId, parsed.data);
    revalidatePath("/invoices");
    return { success: true, data: { id: invoice.id } };
  } catch (error) {
    return { success: false, error: friendlyErrorOrThrow(error) };
  }
}

export async function updateInvoiceDraftAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const invoice = await invoiceService.updateDraft(id, parsed.data);
    revalidatePath("/invoices");
    revalidatePath(`/invoices/${id}`);
    return { success: true, data: { id: invoice.id } };
  } catch (error) {
    return { success: false, error: friendlyErrorOrThrow(error) };
  }
}
