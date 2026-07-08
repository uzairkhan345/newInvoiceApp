import type { ReactNode } from "react";

/**
 * Page header — title + optional subtitle + optional primary action.
 * Typography per Docs/ui_design_guide.md §5.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-[13px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
