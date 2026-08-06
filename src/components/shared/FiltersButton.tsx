import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Directory toolbar "Filters" button (ui_redesign_handoff_v3) — inert in the
 * reference prototype itself (no panel opens, confirmed by clicking it
 * there), and there's no broader filter capability in this app beyond the
 * status/relationship chips already next to it — rendered disabled with a
 * tooltip rather than faking a working control, same convention as the
 * disabled "Send reminder" buttons elsewhere in this redesign.
 */
export function FiltersButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      disabled
      title="No additional filters yet"
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <SlidersHorizontal className="h-3.5 w-3.5" />
      Filters
    </button>
  );
}
