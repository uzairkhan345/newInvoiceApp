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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
}: {
  mode: "create" | "edit";
  projectId: string;
  invoiceId?: string;
  project: InvoiceFormProjectInfo;
  defaultValues?: Partial<InvoiceInput>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      invoiceNumber: "",
      issueDate: "",
      dueDate: "",
      convertedTotal: "",
      items: [{ description: "", quantity: "1", unitPrice: "0" }],
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
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} noValidate>
            <FormField
              label="Invoice Number"
              htmlFor="invoiceNumber"
              required
              error={errors.invoiceNumber?.message}
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
              >
                <Input id="issueDate" type="date" {...register("issueDate")} />
              </FormField>
              <FormField
                label="Due Date"
                htmlFor="dueDate"
                required
                error={errors.dueDate?.message}
              >
                <Input id="dueDate" type="date" {...register("dueDate")} />
              </FormField>
            </div>

            {project.displayCurrency !== "USD" ? (
              <FormField
                label={`Converted Total (${project.displayCurrency})`}
                htmlFor="convertedTotal"
                error={errors.convertedTotal?.message}
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
            />

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
    </>
  );
}
