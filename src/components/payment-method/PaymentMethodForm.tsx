"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import {
  paymentMethodSchema,
  type PaymentMethodInput,
} from "@/lib/validation/paymentMethod";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
} from "@/actions/paymentMethod.actions";
import { paymentMethodTemplates } from "@/components/payment-method/paymentMethodTemplates";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AIAssistPanel } from "@/components/ai-assist/AIAssistPanel";
import { useApplySuggestion } from "@/components/ai-assist/useApplySuggestion";
import type { AiAssistConfigSummary } from "@/lib/ai-providers/config";

const typeLabels: Record<PaymentMethodInput["type"], string> = {
  BANK_WIRE: "Bank Wire",
  ZELLE: "Zelle",
  PAYONEER: "Payoneer",
  CUSTOM: "Custom",
};

export function PaymentMethodForm({
  mode,
  partyId,
  paymentMethodId,
  defaultValues,
  aiConfig,
}: {
  mode: "create" | "edit";
  partyId: string;
  paymentMethodId?: string;
  defaultValues?: Partial<PaymentMethodInput>;
  aiConfig: AiAssistConfigSummary;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { highlightedKeys, applySuggestion } = useApplySuggestion();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<PaymentMethodInput>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: {
      type: "BANK_WIRE",
      label: "",
      isDefault: false,
      fields: paymentMethodTemplates.BANK_WIRE.map((f) => ({ ...f })),
      ...defaultValues,
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "fields",
  });

  // Tracks the last-selected type so a template swap only fires when the
  // field list still exactly matches that type's untouched template — any
  // admin edit (including one that leaves labels/keys but not values blank)
  // permanently opts the row set out of further auto-swaps.
  const previousTypeRef = useRef<PaymentMethodInput["type"]>(
    defaultValues?.type ?? "BANK_WIRE",
  );

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createPaymentMethodAction(partyId, values)
          : await updatePaymentMethodAction(paymentMethodId!, partyId, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Payment method created" : "Payment method updated",
      );
      router.push(`/parties/${partyId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  function handleApplySuggestion(suggestion: Record<string, unknown>) {
    applySuggestion(suggestion, (patch) => {
      reset({ ...getValues(), ...patch });
      if (typeof patch.type === "string") {
        previousTypeRef.current = patch.type as PaymentMethodInput["type"];
      }
    });
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} noValidate>
            <FormField
              label="Type"
              htmlFor="type"
              required
              error={errors.type?.message}
              highlighted={highlightedKeys.has("type")}
            >
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (!value) return;
                      // Load the new type's starting scaffold only when the
                      // current fields still exactly match the previous
                      // type's untouched template — never clobber an admin's
                      // in-progress edits (Docs/product_spec.md §4 Workflow 2).
                      const currentFields = getValues("fields");
                      const matchesPreviousTemplate =
                        JSON.stringify(currentFields) ===
                        JSON.stringify(
                          paymentMethodTemplates[previousTypeRef.current],
                        );
                      field.onChange(value);
                      if (matchesPreviousTemplate) {
                        setValue(
                          "fields",
                          paymentMethodTemplates[value].map((f) => ({ ...f })),
                        );
                      }
                      previousTypeRef.current =
                        value as PaymentMethodInput["type"];
                    }}
                  >
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Label"
              htmlFor="label"
              required
              error={errors.label?.message}
              highlighted={highlightedKeys.has("label")}
            >
              <Input
                id="label"
                placeholder="e.g. Chase Checking Account"
                {...register("label")}
              />
            </FormField>

            <div
              className={cn(
                "mb-4 flex items-center gap-2 rounded-md transition-colors duration-1000",
                highlightedKeys.has("isDefault") && "bg-brand-light/60",
              )}
            >
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="isDefault"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
              <label
                htmlFor="isDefault"
                className="text-[13px] font-medium text-foreground"
              >
                Set as default payment method for this party
              </label>
            </div>

            <div
              className={cn(
                "mb-2 flex items-center justify-between rounded-md transition-colors duration-1000",
                highlightedKeys.has("fields") && "bg-brand-light/60",
              )}
            >
              <span className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
                Fields <span className="text-destructive">*</span>
              </span>
              <Button
                type="button"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => append({ key: "", label: "", value: "" })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Field
              </Button>
            </div>

            {errors.fields?.message ? (
              <p className="mb-2 text-[11px] text-destructive">
                {errors.fields.message}
              </p>
            ) : null}

            <div className="mb-4 flex flex-col gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-[10px] border border-border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      Field {index + 1}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        aria-label="Move field up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                        aria-label="Move field down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-destructive"
                        onClick={() => remove(index)}
                        aria-label="Remove field"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FormField
                      label="Key"
                      htmlFor={`fields.${index}.key`}
                      error={errors.fields?.[index]?.key?.message}
                      className="mb-0"
                    >
                      <Input
                        id={`fields.${index}.key`}
                        placeholder="bank_name"
                        {...register(`fields.${index}.key` as const)}
                      />
                    </FormField>
                    <FormField
                      label="Label"
                      htmlFor={`fields.${index}.label`}
                      error={errors.fields?.[index]?.label?.message}
                      className="mb-0"
                    >
                      <Input
                        id={`fields.${index}.label`}
                        placeholder="Bank Name"
                        {...register(`fields.${index}.label` as const)}
                      />
                    </FormField>
                    <FormField
                      label="Value"
                      htmlFor={`fields.${index}.value`}
                      error={errors.fields?.[index]?.value?.message}
                      className="mb-0"
                    >
                      <Input
                        id={`fields.${index}.value`}
                        placeholder="Deutsche Bank"
                        {...register(`fields.${index}.value` as const)}
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting
                ? "Saving…"
                : mode === "create"
                  ? "Add Payment Method"
                  : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AIAssistPanel
        formType="paymentMethod"
        aiConfig={aiConfig}
        onApply={handleApplySuggestion}
      />
    </div>
  );
}
