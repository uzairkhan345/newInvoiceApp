import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DirectoryView } from "@/lib/useViewPreference";

/** Table/Cards switch shared by every directory page that offers a card view (Projects, Parties). */
export function ViewToggle({
  view,
  onChange,
}: {
  view: DirectoryView;
  onChange: (next: DirectoryView) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
      <button
        type="button"
        aria-label="Table view"
        aria-pressed={view === "table"}
        onClick={() => onChange("table")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold",
          view === "table"
            ? "bg-card text-brand shadow-sm"
            : "text-muted-foreground",
        )}
      >
        <Rows3 className="h-3.5 w-3.5" />
        Table
      </button>
      <button
        type="button"
        aria-label="Card view"
        aria-pressed={view === "cards"}
        onClick={() => onChange("cards")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold",
          view === "cards"
            ? "bg-card text-brand shadow-sm"
            : "text-muted-foreground",
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Cards
      </button>
    </div>
  );
}
