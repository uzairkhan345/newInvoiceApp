"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  projectAlertScheduleSchema,
  type ProjectAlertScheduleInput,
} from "@/lib/validation/projectAlertSchedule";
import {
  createProjectAlertScheduleAction,
  updateProjectAlertScheduleAction,
} from "@/actions/projectAlertSchedule.actions";
import { FormField } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DayOfMonthPicker } from "@/components/project-alert-schedule/DayOfMonthPicker";

/**
 * M29 — dialog-only, never a full page (see
 * AlertScheduleFormDialog): the form is small enough that a full-page
 * nav-away/back round trip per alert would fight the "add several in one
 * sitting" workflow it's built for. No `embedded` prop branching needed —
 * unlike PaymentMethodForm/PartyForm, there is no standalone full-page mode
 * to branch away from.
 */
export function AlertScheduleForm({
  mode,
  projectId,
  scheduleId,
  defaultValues,
  onSaved,
}: {
  mode: "create" | "edit";
  projectId: string;
  scheduleId?: string;
  defaultValues?: Partial<ProjectAlertScheduleInput>;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectAlertScheduleInput>({
    resolver: zodResolver(projectAlertScheduleSchema),
    defaultValues: {
      dayOfMonth: 1,
      recurring: true,
      label: "",
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const result =
        mode === "create"
          ? await createProjectAlertScheduleAction(projectId, values)
          : await updateProjectAlertScheduleAction(
              scheduleId!,
              projectId,
              values,
            );

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "create" ? "Alert schedule added" : "Alert schedule updated",
      );
      onSaved();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FormField
        label="Day of Month"
        htmlFor="dayOfMonth"
        required
        error={errors.dayOfMonth?.message}
      >
        <Controller
          name="dayOfMonth"
          control={control}
          render={({ field }) => (
            <DayOfMonthPicker
              id="dayOfMonth"
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <div className="mb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Controller
            name="recurring"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="recurring"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked)}
              />
            )}
          />
          <label
            htmlFor="recurring"
            className="text-[13px] font-medium text-foreground"
          >
            Repeat every month
          </label>
        </div>
        <p className="pl-6 text-[11px] text-muted-foreground">
          When cleared, this alert reappears automatically on the same day next
          month. Leave unchecked for a one-time reminder that never reappears
          once cleared.
        </p>
      </div>

      <FormField label="Label" htmlFor="label" error={errors.label?.message}>
        <Input
          id="label"
          placeholder="e.g. Send invoice"
          {...register("label")}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting
          ? "Saving…"
          : mode === "create"
            ? "Add Alert"
            : "Save Changes"}
      </Button>
    </form>
  );
}
