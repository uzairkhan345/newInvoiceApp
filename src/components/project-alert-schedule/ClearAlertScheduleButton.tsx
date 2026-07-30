"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { clearProjectAlertScheduleAction } from "@/actions/projectAlertSchedule.actions";

/**
 * M29 — shared by the project detail page's alert list and the global nav
 * `AlertsBell`. No confirmation dialog: clearing is non-destructive (a
 * recurring schedule re-arms itself next month; a cleared one-time
 * schedule's config row stays visible/editable, nothing is deleted). The
 * server action revalidates every server-rendered surface, so clearing from
 * either place reflects everywhere except the bell's own client-held list —
 * `onCleared` lets a caller (the bell) drop the item locally for instant
 * feedback instead of waiting on its own next refetch.
 */
export function ClearAlertScheduleButton({
  scheduleId,
  projectId,
  className,
  onCleared,
}: {
  scheduleId: string;
  projectId: string;
  className?: string;
  onCleared?: () => void;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="outline"
      className={cn("h-7 shrink-0 px-2.5 text-[11px]", className)}
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
          onCleared?.();
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
