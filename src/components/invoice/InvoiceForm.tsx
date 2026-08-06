"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
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
import type { InvoiceAiContext } from "@/services/aiAssistService";
import type { InvoiceAutofillData } from "@/services/invoiceService";
import { computeDueDate } from "@/lib/invoicePeriod";
import type {
  DisplayCurrency,
  InvoicePeriodType,
  ProjectCurrencyMode,
} from "@/generated/prisma/client";
import { Sparkles } from "lucide-react";

export type InvoiceFormProjectInfo = {
  name: string;
  contractorName: string;
  clientName: string;
  preferredPaymentMethodLabel: string | null;
  displayCurrency: DisplayCurrency;
  /** M26 — gates the Converted Total field (DUAL only). */
  currencyMode: ProjectCurrencyMode;
  /** M26 — the invoice's actual resolved currency: always USD for DUAL, `displayCurrency` for SINGLE. */
  currency: string;
  invoiceNumberFormat: string;
  /** M19.2b — drives the create form's live due-date recompute only; unused in edit mode. */
  invoicePeriodType: InvoicePeriodType | null;
  /** M35 — gates the "Add Referral Credit" button on LineItemsEditor. */
  referralCreditEnabled: boolean;
  /** M35 — project.referralCreditLabel already resolved against its default. */
  referralCreditDefaultLabel: string;
};

/**
 * Docs/product_spec.md Workflow 4 — contractor, client, preferred payment
 * method, and invoice-number format are inherited from the project and never
 * re-entered here; this panel is read-only, sourced from live project data
 * (not the invoice's own snapshot, which only exists once a draft is saved).
 * Redesign v3 (ui_redesign_handoff_v3 screenshots/16) — a compact single-row
 * context bar instead of a full facts card; "Change project" only makes
 * sense in create mode (an existing draft's project is fixed).
 */
function ProjectContextBar({
  project,
  invoiceNumber,
  showChangeProjectLink,
}: {
  project: InvoiceFormProjectInfo;
  invoiceNumber: string;
  showChangeProjectLink: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-light bg-brand-light/20 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-light font-mono text-[11px] font-bold text-brand">
          {project.name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-foreground">
            {project.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {project.clientName}
          </p>
        </div>
      </div>
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px]">
        <div>
          <dt className="font-bold tracking-wide text-muted-foreground uppercase">
            Currency
          </dt>
          <dd className="mt-0.5 font-mono text-foreground">
            {project.currency}
            {project.currencyMode === "DUAL"
              ? ` (+ ${project.displayCurrency})`
              : ""}
          </dd>
        </div>
        <div>
          <dt className="font-bold tracking-wide text-muted-foreground uppercase">
            Payment method
          </dt>
          <dd className="mt-0.5 text-foreground">
            {project.preferredPaymentMethodLabel ?? (
              <span className="font-semibold text-[var(--alert-warning-text)]">
                None set
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="font-bold tracking-wide text-muted-foreground uppercase">
            Number
          </dt>
          <dd className="mt-0.5 font-mono text-foreground">
            {invoiceNumber || "—"}
          </dd>
        </div>
      </dl>
      {showChangeProjectLink ? (
        <Link
          href="/invoices/new"
          className="text-[11px] font-bold text-brand hover:underline"
        >
          Change
        </Link>
      ) : null}
    </div>
  );
}

/** Redesign v3 — purely visual grouping of the existing form fields into numbered sections; no field/validation changes. */
function FormSectionHeader({
  number,
  title,
  subtitle,
  action,
}: {
  number: number;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-6 mb-3 flex items-center justify-between border-t border-muted pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-[11px] font-bold text-brand">
          {number}
        </span>
        <div>
          <p className="text-[12px] font-bold text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function InvoiceForm({
  mode,
  projectId,
  invoiceId,
  project,
  defaultValues,
  aiConfig,
  autofillData,
}: {
  mode: "create" | "edit";
  projectId: string;
  invoiceId?: string;
  project: InvoiceFormProjectInfo;
  defaultValues?: Partial<InvoiceInput>;
  aiConfig: AiAssistConfigSummary;
  /** M18 (Autofill) — the project's most recent invoice's items/notes, pre-fetched server-side; create mode only, null when the project has no prior invoice. */
  autofillData?: InvoiceAutofillData | null;
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
    setValue,
    watch,
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
          isReferralCredit: false,
          quantity: "1",
          unitPrice: "0",
          amount: "",
        },
      ],
      ...defaultValues,
    },
  });

  /**
   * M19.2b — create-form only (edit mode leaves an
   * existing draft's dueDate untouched, since there's no way to tell whether
   * a loaded value was auto-computed or deliberately hand-set). Tracks the
   * last auto-computed value so any divergence — typed by hand, or set by an
   * applied AI-assist suggestion — permanently opts this form session out of
   * further auto-recompute, mirroring PaymentMethodForm's type-template-swap
   * ref (`previousTypeRef`).
   */
  const lastAutoDueDateRef = useRef<string | undefined>(getValues("dueDate"));
  const issueDate = watch("issueDate");

  useEffect(() => {
    if (mode !== "create" || !project.invoicePeriodType || !issueDate) return;
    const currentDueDate = getValues("dueDate");
    if (
      lastAutoDueDateRef.current !== undefined &&
      currentDueDate !== lastAutoDueDateRef.current
    ) {
      return;
    }
    const computed = computeDueDate(issueDate, project.invoicePeriodType);
    lastAutoDueDateRef.current = computed;
    setValue("dueDate", computed, { shouldValidate: true });
  }, [issueDate, mode, project.invoicePeriodType, getValues, setValue]);

  /** M18 (Autofill) — items/notes only; invoiceNumber/dates/convertedTotal are left exactly as they are. */
  function handleAutofill() {
    if (!autofillData) return;
    reset({
      ...getValues(),
      items: autofillData.items,
      itemsNote: autofillData.itemsNote,
      bottomNote: autofillData.bottomNote,
    });
    toast.success("Filled in from the last invoice — review before saving.");
  }

  /** M18 (AI-assist context) — read fresh at send-time, not memoized, so it always reflects the form's current values. */
  function getAiContext(): InvoiceAiContext {
    return {
      project: {
        name: project.name,
        contractorName: project.contractorName,
        clientName: project.clientName,
        preferredPaymentMethodLabel: project.preferredPaymentMethodLabel,
        currency: project.currency,
        invoiceNumberFormat: project.invoiceNumberFormat,
      },
      currentValues: getValues(),
    };
  }

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
      <ProjectContextBar
        project={project}
        invoiceNumber={watch("invoiceNumber")}
        showChangeProjectLink={mode === "create"}
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} noValidate>
              <FormSectionHeader
                number={1}
                title="Invoice details"
                subtitle="Number and payment dates"
                action={
                  mode === "create" && autofillData ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      onClick={handleAutofill}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Use Last Invoice
                    </Button>
                  ) : undefined
                }
              />
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
                {mode === "create" ? (
                  <p className="text-[11px] text-muted-foreground">
                    Suggested automatically from the project&rsquo;s format —
                    freely editable, so you can continue a sequence from outside
                    this app.
                  </p>
                ) : null}
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

              {project.currencyMode === "DUAL" ? (
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

              <FormSectionHeader
                number={2}
                title="Line items"
                subtitle="Services, hours and rates"
              />
              <LineItemsEditor
                control={control}
                register={register}
                errors={errors}
                highlighted={highlightedKeys.has("items")}
                currency={project.currency}
                referralCreditEnabled={project.referralCreditEnabled}
                referralCreditDefaultLabel={project.referralCreditDefaultLabel}
              />

              <FormSectionHeader
                number={3}
                title="Notes"
                subtitle="Optional information shown on the invoice"
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
              {mode === "create" ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Saved as a draft immediately — edit freely until it&rsquo;s
                  marked Sent.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <AIAssistPanel
          formType="invoice"
          aiConfig={aiConfig}
          getContext={getAiContext}
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
