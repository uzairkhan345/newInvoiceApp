import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Page header — optional back link + optional eyebrow + title + optional
 * subtitle + optional primary action. Typography per Docs/ui_design_guide.md
 * §5. The eyebrow label reuses StatsCard's existing uppercase label
 * treatment rather than introducing a second one.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  backHref,
  backLabel = "Back",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-2 pb-8">
      {backHref ? (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {eyebrow ? (
            <span className="text-[10px] font-[750] tracking-[0.1em] text-muted-foreground uppercase">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="flex items-center gap-3 text-[27px] font-normal tracking-[-0.945px] text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[13px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action ? (
          <div className="w-full shrink-0 sm:w-auto">{action}</div>
        ) : null}
      </div>
    </div>
  );
}
