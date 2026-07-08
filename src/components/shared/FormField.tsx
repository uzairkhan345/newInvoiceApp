import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Docs/ui_design_guide.md §10 — label/input/error shape shared by every form.
 * Not a shadcn primitive; shadcn's `base-nova` preset ships no `Form`
 * component under this registry (see Docs/execution_plan.md §7 M0 note), so
 * this is the reusable wiring point for react-hook-form + zod across forms.
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-bold tracking-[0.05em] text-muted-foreground uppercase"
      >
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </label>
      {children}
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
