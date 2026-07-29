"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clearProjectAlertScheduleAction } from "@/actions/projectAlertSchedule.actions";

/**
 * M29 — shared by the project detail page's alert list and the dashboard
 * Priority Feed. No confirmation dialog: clearing is non-destructive (a
 * recurring schedule re-arms itself next month; a cleared one-time
 * schedule's config row stays visible/editable, nothing is deleted). The
 * server action revalidates both surfaces, so clearing from either place
 * reflects everywhere.
 */
export function ClearAlertScheduleButton({
  scheduleId,
  projectId,
}: {
  scheduleId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      className="h-7 shrink-0 px-2.5 text-[11px]"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);
        try {
          const result = await clearProjectAlertScheduleAction(
            scheduleId,
            projectId,
          );
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          toast.success("Alert cleared");
          router.refresh();
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "Clearing…" : "Clear"}
    </Button>
  );
}
