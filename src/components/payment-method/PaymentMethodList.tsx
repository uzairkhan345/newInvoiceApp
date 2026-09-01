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
import type { ProjectRef } from "@/services/projectService";
import { PAYMENT_METHOD_TYPE_LABELS } from "@/lib/paymentMethodLabels";
import { withReturnTo } from "@/lib/backNavigation";

/**
 * M3 — payment-method sub-list on the party
 * detail page. `deletableIds` is precomputed server-side (each method's live
 * reference check) rather than re-fetched per row.
 */
export function PaymentMethodList({
  partyId,
  paymentMethods,
  deletableIds,
  projectRefsByPaymentMethodId,
  returnTo,
}: {
  partyId: string;
  paymentMethods: PaymentMethod[];
  deletableIds: Set<string>;
  /** M25 — which project(s) (if any) use each method as their preferred payment method, ACTIVE projects only; each tag links to that project's detail page. */
  projectRefsByPaymentMethodId: Record<string, ProjectRef[]>;
  /** The party page's own incoming returnTo — nested into each "used by" project link's own returnTo, so the chain survives that extra hop too. */
  returnTo?: string;
}) {
  const router = useRouter();
  // Nested once here so every link below (this tab's own path plus the
  // party page's own incoming returnTo) chains correctly, whether it goes
  // to a payment-method page or — for the "used by" tags — a project.
  const pmReturnTo = withReturnTo(
    `/parties/${partyId}?tab=payment-methods`,
    returnTo,
  );

  if (paymentMethods.length === 0) {
    return (
      <EmptyState
        title="No payment methods yet"
        description="Add a payment method so this party can be selected as a project's preferred payout channel."
        action={
          <Button
            nativeButton={false}
            render={
              <Link
                href={withReturnTo(
                  `/parties/${partyId}/payment-methods/new`,
                  pmReturnTo,
                )}
              />
            }
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
        const usedByProjects = projectRefsByPaymentMethodId[method.id] ?? [];
        return (
          <Card key={method.id}>
            <CardContent className="flex items-start justify-between gap-4 pt-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-foreground">
                    {method.label}
                  </span>
                  <Badge variant="secondary" className="uppercase">
                    {PAYMENT_METHOD_TYPE_LABELS[method.type] ?? method.type}
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
                    {usedByProjects.map((project) => (
                      <Badge
                        key={project.id}
                        variant="outline"
                        className="border-transparent bg-[var(--status-paid-bg)] font-normal normal-case text-[var(--status-paid-text)] transition-colors hover:bg-[#047857] hover:text-white"
                        render={
                          <Link
                            href={withReturnTo(
                              `/projects/${project.id}`,
                              pmReturnTo,
                            )}
                          />
                        }
                      >
                        {project.name}
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
                      href={withReturnTo(
                        `/parties/${partyId}/payment-methods/${method.id}`,
                        pmReturnTo,
                      )}
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
