import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Read-only label/value pair for view-mode detail cards — the display
 * counterpart to FormField's label styling, so view and edit modes read as
 * one system.
 */
export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-[13px] text-foreground">{value}</span>
    </div>
  );
}
