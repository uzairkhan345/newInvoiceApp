import { cn } from "@/lib/utils";
import type { ProjectWithRelations } from "@/repositories/projectRepository";

export function ProjectStatusPill({
  status,
}: {
  status: ProjectWithRelations["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit shrink-0 items-center justify-center rounded-4xl px-2 py-0.5 text-xs font-semibold uppercase",
        status === "ACTIVE"
          ? "bg-brand-light text-brand"
          : "bg-muted text-[var(--text-secondary)]",
      )}
    >
      {status}
    </span>
  );
}
