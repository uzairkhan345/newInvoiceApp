import Link from "next/link";
import { Activity, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardView = "list" | "health";

const VIEWS: {
  value: DashboardView;
  label: string;
  icon: typeof LayoutList;
}[] = [
  { value: "list", label: "List view", icon: LayoutList },
  { value: "health", label: "Project billing health", icon: Activity },
];

/**
 * Dashboard List/Health view toggle (reference prototype parity) — `?view=`
 * driven real Links, same idiom as ProjectDetailTabs/PartyDetailTabs rather
 * than client-side tab state, so each view stays bookmarkable/shareable.
 */
export function DashboardViewToggle({ active }: { active: DashboardView }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      {VIEWS.map((view) => {
        const isActive = view.value === active;
        const href = view.value === "list" ? "/" : "/?view=health";
        const Icon = view.icon;
        return (
          <Link
            key={view.value}
            href={href}
            aria-label={view.label}
            title={view.label}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
              isActive
                ? "bg-brand-light text-brand"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </Link>
        );
      })}
    </div>
  );
}
