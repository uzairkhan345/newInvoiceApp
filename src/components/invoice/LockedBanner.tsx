/**
 * Docs/ui_design_guide.md §15 — exact required copy. Renders for SENT/PAID/VOID;
 * zero edit controls exist anywhere on the page in that state.
 */
export function LockedBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-[8px] border border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground">
      This invoice is locked. Line items, snapshots, and totals can no longer
      be edited.
    </div>
  );
}
