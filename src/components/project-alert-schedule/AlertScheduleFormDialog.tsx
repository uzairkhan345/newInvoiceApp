"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertScheduleForm } from "@/components/project-alert-schedule/AlertScheduleForm";
import type { ProjectAlertSchedule } from "@/generated/prisma/client";

/**
 * M29 — chrome only, mirrors CreatePaymentMethodDialog.tsx: the form is
 * only rendered while `open`, so each opening starts fresh (create) or
 * freshly re-prefilled (edit). Presence of `schedule` selects edit mode.
 */
export function AlertScheduleFormDialog({
  open,
  onOpenChange,
  projectId,
  schedule,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  schedule?: ProjectAlertSchedule;
}) {
  const mode = schedule ? "edit" : "create";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Alert Schedule" : "Edit Alert Schedule"}
          </DialogTitle>
          <DialogDescription>
            A day-of-month reminder for this project — shown on the dashboard
            and here once it fires.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AlertScheduleForm
            mode={mode}
            projectId={projectId}
            scheduleId={schedule?.id}
            defaultValues={
              schedule
                ? {
                    dayOfMonth: schedule.dayOfMonth,
                    recurring: schedule.recurring,
                    label: schedule.label ?? "",
                  }
                : undefined
            }
            onSaved={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
