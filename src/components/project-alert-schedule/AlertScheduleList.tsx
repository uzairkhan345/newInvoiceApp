"use client";

import { AlertScheduleRow } from "@/components/project-alert-schedule/AlertScheduleRow";
import type { ProjectAlertScheduleWithFiringState } from "@/services/projectAlertScheduleService";

/** M29 — non-empty-state list, matching PaymentMethodList.tsx's structure. */
export function AlertScheduleList({
  projectId,
  schedules,
}: {
  projectId: string;
  schedules: ProjectAlertScheduleWithFiringState[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {schedules.map((schedule) => (
        <AlertScheduleRow
          key={schedule.id}
          projectId={projectId}
          schedule={schedule}
        />
      ))}
    </div>
  );
}
