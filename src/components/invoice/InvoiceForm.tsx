"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { invoiceSchema, type InvoiceInput } from "@/lib/validation/invoice";
import {
  createInvoiceDraftAction,
  updateInvoiceDraftAction,
} from "@/actions/invoice.actions";
import { LineItemsEditor } from "@/components/invoice/LineItemsEditor";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AIAssistPanel } from "@/components/ai-assist/AIAssistPanel";
import { useApplySuggestion } from "@/components/ai-assist/useApplySuggestion";
import type { AiAssistConfigSummary } from "@/lib/ai-providers/config";

export type InvoiceFormProjectInfo = {
  name: string;
  contractorName: string;
  clientName: string;
  preferredPaymentMethodLabel: string | null;
  displayCurrency: "USD" | "AUD" | "GBP";
};

/**
 * Docs/product_spec.md Workflow 4 — contractor, client, preferred payment
 * method, and invoice-number format are inherited from the project and never
 * re-entered here; this panel is read-only, sourced from live project data
 * (not the invoice's own snapshot, which only exists once a draft is saved).
 */
function ProjectInfoPanel({ project }: { project: InvoiceFormProjectInfo }) {
  return (
    <Card className="mb-4">
      <CardContent className="grid grid-cols-1 gap-3 pt-6 text-[13px] sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
            Project
          </p>
          <p className="font-medium text-foreground">{project.name}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
            Display Currency
          </p>
          <p className="font-mono text-foreground">{project.displayCurrency}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
            Contractor
          </p>
          <p className="text-foreground">{project.contractorName}</p>
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
            Client
          </p>
          <p className="text-foreground">{project.clientName}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
            Preferred Payment Method
          </p>
          <p className="text-foreground">
            {project.preferredPaymentMethodLabel ?? (
              <span className="text-muted-foreground">
                None set on the project
              </span>
            )}
          </p>
          {project.preferredPaymentMethodLabel === null ? (
            <p className="mt-1 inline-block rounded-full bg-[var(--alert-warning-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--alert-warning-text)]">
              This invoice will be generated with no payment details
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceForm({
  mode,
  projectId,
  invoiceId,
  project,
  defaultValues,
  aiConfig,
}: {
  mode: "create" | "edit";
  projectId: string;
  invoiceId?: string;
  project: InvoiceFormProjectInfo;
  defaultValues?: Partial<InvoiceInput>;
  aiConfig: AiAssistConfigSummary;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { highlightedKeys, applySuggestion } = useApplySuggestion();

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      issueDate: "",
      dueDate: "",
      convertedTotal: "",
      itemsNote: "",
      bottomNote: "",
      items: [
        {
          description: "",
          isFlatAmount: false,
          quantity: "1",
          unitPrice: "0",
          amount: "",
        },
      ],
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createInvoiceDraftAction(projectId, values)
          : await updateInvoiceDraftAction(invoiceId!, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "create" ? "Invoice created" : "Invoice updated");
      router.push(`/invoices/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <>
      <ProjectInfoPanel project={project} />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} noValidate>
              <FormField
                label="Invoice Number"
                htmlFor="invoiceNumber"
                required
                error={errors.invoiceNumber?.message}
                highlighted={highlightedKeys.has("invoiceNumber")}
              >
                <Input
                  id="invoiceNumber"
                  className="font-mono"
                  {...register("invoiceNumber")}
                />
              </FormField>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  label="Issue Date"
                  htmlFor="issueDate"
                  required
                  error={errors.issueDate?.message}
                  highlighted={highlightedKeys.has("issueDate")}
                >
                  <Input
                    id="issueDate"
                    type="date"
                    {...register("issueDate")}
                  />
                </FormField>
                <FormField
                  label="Due Date"
                  htmlFor="dueDate"
                  required
                  error={errors.dueDate?.message}
                  highlighted={highlightedKeys.has("dueDate")}
                >
                  <Input id="dueDate" type="date" {...register("dueDate")} />
                </FormField>
              </div>

              {project.displayCurrency !== "USD" ? (
                <FormField
                  label={`Converted Total (${project.displayCurrency})`}
                  htmlFor="convertedTotal"
                  error={errors.convertedTotal?.message}
                  highlighted={highlightedKeys.has("convertedTotal")}
                >
                  <Input
                    id="convertedTotal"
                    inputMode="decimal"
                    placeholder="Manually entered — no automatic exchange-rate lookup"
                    {...register("convertedTotal")}
                  />
                </FormField>
              ) : null}

              <LineItemsEditor
                control={control}
                register={register}
                errors={errors}
                highlighted={highlightedKeys.has("items")}
              />

              <FormField
                label="Items Note"
                htmlFor="itemsNote"
                error={errors.itemsNote?.message}
                highlighted={highlightedKeys.has("itemsNote")}
              >
                <Textarea
                  id="itemsNote"
                  rows={2}
                  placeholder="Optional — describes the line items as a whole, shown italicized below them"
                  {...register("itemsNote")}
                />
              </FormField>

              <FormField
                label="Note"
                htmlFor="bottomNote"
                error={errors.bottomNote?.message}
                highlighted={highlightedKeys.has("bottomNote")}
              >
                <Textarea
                  id="bottomNote"
                  rows={2}
                  placeholder="Optional — a separate note shown near the bottom of the document"
                  {...register("bottomNote")}
                />
              </FormField>

              <Button type="submit" disabled={isSubmitting} className="mt-2">
                {isSubmitting
                  ? "Saving…"
                  : mode === "create"
                    ? "Create Invoice"
                    : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <AIAssistPanel
          formType="invoice"
          aiConfig={aiConfig}
          onApply={(suggestion) =>
            applySuggestion(suggestion, (patch) =>
              reset({ ...getValues(), ...patch }),
            )
          }
        />
      </div>
    </>
  );
}
