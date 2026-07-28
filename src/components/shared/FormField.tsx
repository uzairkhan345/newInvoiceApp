import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Docs/ui_design_guide.md §10 — label/input/error shape shared by every form.
 * Not a shadcn primitive; shadcn's `base-nova` preset ships no `Form`
 * component under this registry, so
 * this is the reusable wiring point for react-hook-form + zod across forms.
 */
export function FormField({
  label,
  htmlFor,
  required,
  error,
  highlighted,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  /** Docs/ui_design_guide.md §14 — brief brand-light flash after AI Assist populates this field. */
  highlighted?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-1.5 rounded-md transition-colors duration-1000",
        highlighted && "bg-brand-light/60",
        className,
      )}
    >
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
