"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteProjectAlertScheduleAction } from "@/actions/projectAlertSchedule.actions";
import { AlertScheduleFormDialog } from "@/components/project-alert-schedule/AlertScheduleFormDialog";
import { ClearAlertScheduleButton } from "@/components/project-alert-schedule/ClearAlertScheduleButton";
import { DAY_LABELS } from "@/components/project-alert-schedule/dayOfMonthLabels";
import type { ProjectAlertScheduleWithFiringState } from "@/services/projectAlertScheduleService";

export function AlertScheduleRow({
  projectId,
  schedule,
}: {
  projectId: string;
  schedule: ProjectAlertScheduleWithFiringState;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 pt-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-bold text-foreground">
              {schedule.label || `Day ${DAY_LABELS[schedule.dayOfMonth]} reminder`}
            </span>
            <Badge variant="secondary" className="uppercase">
              {DAY_LABELS[schedule.dayOfMonth]} of the month
            </Badge>
            <Badge variant="outline" className="uppercase">
              {schedule.recurring ? "Recurring" : "One-time"}
            </Badge>
            {schedule.isFired ? (
              <Badge className="border-transparent bg-[var(--status-sent-bg)] text-[var(--status-sent-text)] uppercase">
                Fired
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {schedule.isFired ? (
            <ClearAlertScheduleButton
              scheduleId={schedule.id}
              projectId={projectId}
            />
          ) : null}
          <Button
            variant="outline"
            className="h-8 px-3 text-[12px]"
            onClick={() => setEditOpen(true)}
          >
            Edit
          </Button>
          <ConfirmDialog
            triggerLabel="Delete"
            triggerVariant="destructive"
            title="Delete this alert schedule?"
            description="This cannot be undone."
            confirmLabel="Delete"
            onConfirm={async () => {
              const result = await deleteProjectAlertScheduleAction(
                schedule.id,
                projectId,
              );
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              toast.success("Alert schedule deleted");
              router.refresh();
            }}
          />
        </div>
      </CardContent>
      <AlertScheduleFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        schedule={schedule}
      />
    </Card>
  );
}
