"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  transitionInvoiceStatusAction,
  deleteInvoiceAction,
} from "@/actions/invoice.actions";
import type { InvoiceStatus } from "@/generated/prisma/client";

/** Docs/implementation_decisions.md §10 — only ever renders valid-transition buttons for the current status. */
const TRANSITIONS: Record<
  InvoiceStatus,
  {
    target: InvoiceStatus;
    label: string;
    description: string;
  }[]
> = {
  DRAFT: [
    {
      target: "SENT",
      label: "Mark as Sent",
      description:
        "This permanently locks the invoice's contractor, client, payment, and total details. It can no longer be edited afterward.",
    },
    {
      target: "VOID",
      label: "Void",
      description:
        "This voids the draft. Voided invoices remain visible for history but are excluded from all totals.",
    },
  ],
  SENT: [
    {
      target: "PAID",
      label: "Mark as Paid",
      description: "This marks the invoice as paid. Paid invoices are terminal and read-only.",
    },
    {
      target: "VOID",
      label: "Void",
      description:
        "This voids the invoice. Voided invoices remain visible for history but are excluded from all totals.",
    },
  ],
  PAID: [],
  VOID: [],
};

export function StatusActionBar({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();

  async function handleTransition(target: InvoiceStatus) {
    const result = await transitionInvoiceStatusAction(invoiceId, target);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Invoice marked as ${target.toLowerCase()}.`);
    router.refresh();
  }

  async function handleDelete() {
    const result = await deleteInvoiceAction(invoiceId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Invoice deleted.");
    router.push("/invoices");
  }

  return (
    <div className="flex items-center gap-2">
      {TRANSITIONS[status].map((transition) => (
        <ConfirmDialog
          key={transition.target}
          triggerLabel={transition.label}
          triggerVariant={transition.target === "VOID" ? "outline" : "default"}
          title={transition.label}
          description={transition.description}
          confirmLabel={transition.label}
          onConfirm={() => handleTransition(transition.target)}
        />
      ))}
      <ConfirmDialog
        triggerLabel="Delete"
        triggerVariant="destructive"
        title="Delete Invoice"
        description="This permanently deletes the invoice and its line items. This cannot be undone."
        confirmLabel="Delete Invoice"
        onConfirm={handleDelete}
      />
    </div>
  );
}
