"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertScheduleFormDialog } from "@/components/project-alert-schedule/AlertScheduleFormDialog";

/** M29 — reused both in the section header and the EmptyState CTA. */
export function AddAlertScheduleButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="h-8 px-3 text-[12px]"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Alert
      </Button>
      <AlertScheduleFormDialog
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
      />
    </>
  );
}
