"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { deletePaymentMethodAction } from "@/actions/paymentMethod.actions";
import type { PaymentMethod } from "@/generated/prisma/client";
import type { PaymentMethodField } from "@/repositories/paymentMethodRepository";

const typeLabels: Record<string, string> = {
  BANK_WIRE: "Bank Wire",
  ZELLE: "Zelle",
  PAYONEER: "Payoneer",
  CUSTOM: "Custom",
};

/**
 * Docs/execution_plan.md §16 M3 — payment-method sub-list on the party
 * detail page. `deletableIds` is precomputed server-side (each method's live
 * reference check) rather than re-fetched per row.
 */
export function PaymentMethodList({
  partyId,
  paymentMethods,
  deletableIds,
  projectNamesByPaymentMethodId,
}: {
  partyId: string;
  paymentMethods: PaymentMethod[];
  deletableIds: Set<string>;
  /** Docs/feedback_backlog.md M25 — which project(s) (if any) use each method as their preferred payment method, ACTIVE projects only. */
  projectNamesByPaymentMethodId: Record<string, string[]>;
}) {
  const router = useRouter();

  if (paymentMethods.length === 0) {
    return (
      <EmptyState
        title="No payment methods yet"
        description="Add a payment method so this party can be selected as a project's preferred payout channel."
        action={
          <Button
            nativeButton={false}
            render={<Link href={`/parties/${partyId}/payment-methods/new`} />}
          >
            Add Payment Method
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {paymentMethods.map((method) => {
        const fields = method.fields as unknown as PaymentMethodField[];
        const usedByProjects = projectNamesByPaymentMethodId[method.id] ?? [];
        return (
          <Card key={method.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-foreground">
                    {method.label}
                  </span>
                  <Badge variant="secondary" className="uppercase">
                    {typeLabels[method.type] ?? method.type}
                  </Badge>
                  {method.isDefault ? (
                    <Badge className="uppercase">Default</Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {fields.map((f) => f.label).join(" · ")}
                </p>
                {usedByProjects.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      Used by:
                    </span>
                    {usedByProjects.map((projectName) => (
                      <Badge
                        key={projectName}
                        variant="outline"
                        className="border-transparent bg-brand-light font-normal normal-case text-brand"
                      >
                        {projectName}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  className="h-8 px-3 text-[12px]"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/parties/${partyId}/payment-methods/${method.id}`}
                    />
                  }
                >
                  Edit
                </Button>
                <ConfirmDialog
                  triggerLabel="Delete"
                  triggerVariant="destructive"
                  disabled={!deletableIds.has(method.id)}
                  disabledReason="This payment method is set as a project's preferred payment method. Change the project's preferred payment method first."
                  title={`Delete ${method.label}?`}
                  description="This cannot be undone."
                  confirmLabel="Delete"
                  onConfirm={async () => {
                    const result = await deletePaymentMethodAction(
                      method.id,
                      partyId,
                    );
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success("Payment method deleted");
                    router.refresh();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
