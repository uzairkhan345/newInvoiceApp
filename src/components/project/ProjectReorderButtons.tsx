"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { moveProjectAction } from "@/actions/project.actions";

/**
 * Projects page Rows view's reorder arrows (ProjectTable.tsx) — only rendered
 * when the list is the full, unfiltered ACTIVE sequence (the "Active" status
 * tab with no search query — see ProjectsDirectory's `reorderable`), so the
 * visible row above/below always matches the ACTIVE neighbor the server
 * action actually swaps with. The resulting order is shared via
 * `Project.sortOrder`, so Cards/Workspace views reflect it too even though
 * they don't render arrows themselves.
 */
export function ProjectReorderButtons({
  projectId,
  disableUp,
  disableDown,
}: {
  projectId: string;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function move(direction: "up" | "down") {
    setPending(true);
    const result = await moveProjectAction(projectId, direction);
    setPending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={disableUp || pending}
        onClick={() => move("up")}
        aria-label="Move project up"
        className={cn(
          "rounded text-muted-foreground hover:text-foreground",
          (disableUp || pending) && "cursor-not-allowed opacity-30",
        )}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={disableDown || pending}
        onClick={() => move("down")}
        aria-label="Move project down"
        className={cn(
          "rounded text-muted-foreground hover:text-foreground",
          (disableDown || pending) && "cursor-not-allowed opacity-30",
        )}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
