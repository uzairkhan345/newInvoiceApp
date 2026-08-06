import { AlertTriangle } from "lucide-react";
import { formatDisplayDate } from "@/lib/dates";

/**
 * Invoice detail overdue warning (ui_redesign_handoff_v3
 * screenshots/07-09 — shown above the tabs, so it's visible regardless of
 * which tab is active). "Send reminder" is disabled — no email-sending
 * infrastructure exists anywhere in this app.
 */
export function InvoiceOverdueBanner({ dueDate }: { dueDate: Date }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-[var(--alert-error-border)] bg-[var(--alert-error-bg)] px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--status-overdue-bg)] text-[var(--status-overdue-text)]">
        <AlertTriangle className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-foreground">
          Payment was due {formatDisplayDate(dueDate)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Record the payment once it arrives, or send a reminder.
        </p>
      </div>
      <span title="Sending reminder emails isn't set up yet.">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-[var(--status-overdue-text)]/30 bg-card px-3 py-1.5 text-[11px] font-semibold text-[var(--status-overdue-text)] opacity-50"
        >
          Send reminder
        </button>
      </span>
    </div>
  );
}
