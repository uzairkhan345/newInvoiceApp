"use client";

import { Controller, useFieldArray, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/shared/FormField";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { InvoiceInput } from "@/lib/validation/invoice";

/**
 * Docs/mvp_user_stories.md Story 4.1/4.2 — line items are denominated in the
 * invoice's resolved `currency` (Docs/feedback_backlog.md M26 — always USD
 * for a `DUAL`-mode project, the project's own currency for a `SINGLE`-mode
 * one); the displayed per-row/subtotal amounts here are a client-side preview only.
 * The backend recomputes amount/subtotal/total from quantity × unitPrice for
 * an Hourly row (Docs/product_spec.md §1.5) — nothing shown here is ever
 * trusted as the submitted value for that mode. A Flat row (M14,
 * `isFlatAmount`) is the one narrow exception: its `amount` IS the submitted
 * value, entered directly since there's no quantity/rate to compute it from.
 */
export function LineItemsEditor({
  control,
  register,
  errors,
  highlighted,
  currency,
}: {
  control: Control<InvoiceInput>;
  register: UseFormRegister<InvoiceInput>;
  errors: FieldErrors<InvoiceInput>;
  /** Docs/ui_design_guide.md §14 — brief flash after AI Assist replaces the item list. */
  highlighted?: boolean;
  /** Docs/feedback_backlog.md M26 — the invoice's actual currency (project-resolved), never hardcoded "USD". */
  currency: string;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });

  function rowAmount(index: number): number {
    const row = watchedItems?.[index];
    if (row?.isFlatAmount) {
      const amount = Number(row.amount);
      return Number.isFinite(amount) ? amount : 0;
    }
    const quantity = Number(row?.quantity);
    const unitPrice = Number(row?.unitPrice);
    return Number.isFinite(quantity) && Number.isFinite(unitPrice)
      ? quantity * unitPrice
      : 0;
  }

  const subtotalPreview = (watchedItems ?? []).reduce(
    (sum: number, _item: unknown, index: number) => sum + rowAmount(index),
    0,
  );

  return (
    <div className="mb-4">
      <div
        className={cn(
          "mb-2 flex items-center justify-between rounded-md transition-colors duration-1000",
          highlighted && "bg-brand-light/60",
        )}
      >
        <span className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
          Line Items <span className="text-destructive">*</span>
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          onClick={() =>
            append({
              description: "",
              isFlatAmount: false,
              quantity: "1",
              unitPrice: "0",
              amount: "",
            })
          }
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line Item
        </Button>
      </div>

      {errors.items?.message ? (
        <p className="mb-2 text-[11px] text-destructive">
          {errors.items.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-[10px] border border-border p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground">
                Item {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive"
                disabled={fields.length === 1}
                onClick={() => remove(index)}
                aria-label="Remove line item"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <FormField
              label="Description"
              htmlFor={`items.${index}.description`}
              error={errors.items?.[index]?.description?.message}
              className="mb-3"
            >
              <Input
                id={`items.${index}.description`}
                {...register(`items.${index}.description` as const)}
              />
            </FormField>

            <div className="mb-3 flex items-center gap-2">
              <Controller
                name={`items.${index}.isFlatAmount` as const}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id={`items.${index}.isFlatAmount`}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
              <label
                htmlFor={`items.${index}.isFlatAmount`}
                className="text-[12px] font-medium text-foreground"
              >
                Flat amount (no quantity/rate)
              </label>
            </div>

            {watchedItems?.[index]?.isFlatAmount ? (
              <FormField
                label={`Amount (${currency})`}
                htmlFor={`items.${index}.amount`}
                error={errors.items?.[index]?.amount?.message}
                className="mb-0"
              >
                <Input
                  id={`items.${index}.amount`}
                  inputMode="decimal"
                  {...register(`items.${index}.amount` as const)}
                />
              </FormField>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <FormField
                  label="Quantity"
                  htmlFor={`items.${index}.quantity`}
                  error={errors.items?.[index]?.quantity?.message}
                  className="mb-0"
                >
                  <Input
                    id={`items.${index}.quantity`}
                    inputMode="decimal"
                    {...register(`items.${index}.quantity` as const)}
                  />
                </FormField>
                <FormField
                  label={`Unit Price (${currency})`}
                  htmlFor={`items.${index}.unitPrice`}
                  error={errors.items?.[index]?.unitPrice?.message}
                  className="mb-0"
                >
                  <Input
                    id={`items.${index}.unitPrice`}
                    inputMode="decimal"
                    {...register(`items.${index}.unitPrice` as const)}
                  />
                </FormField>
                <FormField
                  label="Amount"
                  htmlFor={`items.${index}.amount-preview`}
                  className="mb-0"
                >
                  <Input
                    id={`items.${index}.amount-preview`}
                    value={formatCurrency(rowAmount(index), currency)}
                    disabled
                    className="font-mono"
                  />
                </FormField>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <p className="text-[13px] font-bold text-foreground">
          Subtotal:{" "}
          <span className="font-mono">
            {formatCurrency(subtotalPreview, currency)}
          </span>
        </p>
      </div>
    </div>
  );
}
