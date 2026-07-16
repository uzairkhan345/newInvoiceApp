/**
 * Docs/ui_design_guide.md §15 — exact required copy. Renders for SENT/PAID/VOID;
 * zero edit controls exist anywhere on the page in that state.
 *
 * `print:hidden` (Docs/execution_plan.md §12, M9): this is an internal
 * admin-facing note about the app's own edit workflow, not part of the
 * invoice document itself — it must not appear on an actual downloaded
 * PDF sent to a client. Hiding it under print media also fixes a real
 * pagination bug: its ~54px height, added on top of the A4 page's exact
 * 297mm min-height, pushed printed output onto a near-empty second page.
 */
export function LockedBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-[8px] border border-border bg-muted/40 px-4 py-2.5 text-[11px] text-muted-foreground print:hidden">
      This invoice is locked. Line items, snapshots, and totals can no longer be
      edited.
    </div>
  );
}
