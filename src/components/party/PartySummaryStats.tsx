import { cn } from "@/lib/utils";

/**
 * Parties list summary row (ui_redesign_handoff_v3
 * screenshots/03-parties-desktop.jpg's own screenshot capture is mislabeled
 * — it actually shows the Dashboard with the cursor over the Parties nav
 * item — so this mirrors the rendered-html/03-parties.html + prototype
 * source's `partyRows` summary block instead). Plain static stat cards, same
 * shape as InvoiceSummaryStats.tsx.
 */
export function PartySummaryStats({
  totalParties,
  activeRelationships,
  openReceivables,
  needsAttention,
}: {
  totalParties: { value: string; note: string };
  activeRelationships: { value: string; note: string };
  openReceivables: { value: string; note: string };
  needsAttention: { value: string; note: string };
}) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Total parties" {...totalParties} />
      <Stat label="Active relationships" {...activeRelationships} />
      <Stat label="Open receivables" {...openReceivables} />
      <Stat label="Needs attention" {...needsAttention} danger />
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  danger = false,
}: {
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card p-4",
        danger &&
          "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--status-overdue-text)]",
      )}
    >
      <span className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <div
        className={cn(
          "mt-2 font-mono text-xl font-bold text-foreground",
          danger && "text-[var(--status-overdue-text)]",
        )}
      >
        {value}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{note}</p>
    </div>
  );
}
