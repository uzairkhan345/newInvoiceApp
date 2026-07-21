"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { projectSchema, type ProjectInput } from "@/lib/validation/project";
import {
  createProjectAction,
  updateProjectAction,
} from "@/actions/project.actions";
import { PartyPickerWithCreateEscape } from "@/components/project/PartyPickerWithCreateEscape";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Party, PaymentMethod } from "@/generated/prisma/client";

/** Sentinel for "no preferred payment method" — Select items can't carry an empty-string value. */
const NO_PAYMENT_METHOD = "__none__";

const displayCurrencyLabels: Record<ProjectInput["displayCurrency"], string> = {
  USD: "USD",
  AUD: "AUD",
  GBP: "GBP",
};

const statusLabels: Record<ProjectInput["status"], string> = {
  ACTIVE: "Active",
  ARCHIVED: "Archived",
};

export function ProjectForm({
  mode,
  projectId,
  defaultValues,
  initialParties,
  initialPaymentMethodsByPartyId,
}: {
  mode: "create" | "edit";
  projectId?: string;
  defaultValues?: Partial<ProjectInput>;
  initialParties: Party[];
  initialPaymentMethodsByPartyId: Record<string, PaymentMethod[]>;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parties, setParties] = useState(initialParties);
  const [paymentMethodsByPartyId, setPaymentMethodsByPartyId] = useState(
    initialPaymentMethodsByPartyId,
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      clientId: "",
      contractorId: "",
      preferredPaymentMethodId: "",
      invoiceNumberFormat: "{abbreviation}-{number}-{date}",
      displayCurrency: "USD",
      status: "ACTIVE",
      ...defaultValues,
    },
  });

  const contractorId = watch("contractorId");
  const availablePaymentMethods = paymentMethodsByPartyId[contractorId] ?? [];

  function registerNewParty(party: Party) {
    setParties((prev) =>
      [...prev, party].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setPaymentMethodsByPartyId((prev) => ({
      ...prev,
      [party.id]: prev[party.id] ?? [],
    }));
  }

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createProjectAction(values)
          : await updateProjectAction(projectId!, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "create" ? "Project created" : "Project updated");
      router.push(`/projects/${result.data.id}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} noValidate>
          <FormField
            label="Name"
            htmlFor="name"
            required
            error={errors.name?.message}
          >
            <Input id="name" {...register("name")} />
          </FormField>

          <FormField
            label="Abbreviation"
            htmlFor="abbreviation"
            error={errors.abbreviation?.message}
          >
            <Input
              id="abbreviation"
              placeholder="Auto-derived from name if left blank"
              {...register("abbreviation")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Controller
              name="contractorId"
              control={control}
              render={({ field }) => (
                <PartyPickerWithCreateEscape
                  label="Contractor"
                  parties={parties}
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    // A payment method scoped to the previous contractor is
                    // meaningless once the contractor changes.
                    setValue("preferredPaymentMethodId", "");
                  }}
                  onPartyCreated={registerNewParty}
                  error={errors.contractorId?.message}
                />
              )}
            />
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <PartyPickerWithCreateEscape
                  label="Client"
                  parties={parties}
                  value={field.value}
                  onChange={field.onChange}
                  onPartyCreated={registerNewParty}
                  error={errors.clientId?.message}
                />
              )}
            />
          </div>

          <FormField
            label="Preferred Payment Method"
            htmlFor="preferredPaymentMethodId"
            error={errors.preferredPaymentMethodId?.message}
          >
            <Controller
              name="preferredPaymentMethodId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value || NO_PAYMENT_METHOD}
                  onValueChange={(value) =>
                    field.onChange(value === NO_PAYMENT_METHOD ? "" : value)
                  }
                  disabled={!contractorId}
                >
                  <SelectTrigger
                    id="preferredPaymentMethodId"
                    className="w-full"
                  >
                    <SelectValue
                      placeholder={
                        contractorId ? "None" : "Select a contractor first"
                      }
                      renderValue={(value) =>
                        value === NO_PAYMENT_METHOD
                          ? "None"
                          : (() => {
                              const method = availablePaymentMethods.find(
                                (m) => m.id === value,
                              );
                              return method
                                ? `${method.label}${method.isDefault ? " (Default)" : ""}`
                                : undefined;
                            })()
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PAYMENT_METHOD}>None</SelectItem>
                    {availablePaymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.label}
                        {method.isDefault ? " (Default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {contractorId && availablePaymentMethods.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                This contractor has no payment methods yet — add one from their
                party page, then set it here later.
              </p>
            ) : null}
          </FormField>

          <FormField
            label="Invoice Number Format"
            htmlFor="invoiceNumberFormat"
            required
            error={errors.invoiceNumberFormat?.message}
          >
            <Input
              id="invoiceNumberFormat"
              placeholder="{abbreviation}-{number}-{date}"
              {...register("invoiceNumberFormat")}
            />
          </FormField>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Display Currency"
              htmlFor="displayCurrency"
              required
              error={errors.displayCurrency?.message}
            >
              <Controller
                name="displayCurrency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="displayCurrency" className="w-full">
                      <SelectValue
                        renderValue={(value) =>
                          displayCurrencyLabels[
                            value as ProjectInput["displayCurrency"]
                          ]
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label="Status"
              htmlFor="status"
              required
              error={errors.status?.message}
            >
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue
                        renderValue={(value) =>
                          statusLabels[value as ProjectInput["status"]]
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting
              ? "Saving…"
              : mode === "create"
                ? "Create Project"
                : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
