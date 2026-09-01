import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { formatShortDate } from "@/lib/dates";
import { withReturnTo } from "@/lib/backNavigation";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";

const VERB: Partial<Record<string, string>> = {
  SENT: "sent",
  PAID: "marked paid",
  VOID: "voided",
};

const DOT_TONE: Partial<Record<string, string>> = {
  PAID: "border-[var(--status-paid-text)]",
  SENT: "border-brand",
  VOID: "border-muted-foreground",
};

/**
 * Project detail Overview tab's Recent activity panel
 * (ui_redesign_handoff_v3 screenshots/10) — real invoice lifecycle events
 * only (createdAt/updatedAt-derived, same basis the old dashboard activity
 * feed used before it was dropped dashboard-wide); no fabricated
 * "settings updated" entries, since there's no audit log backing that.
 */
export function ProjectRecentActivity({
  invoices,
  returnTo,
}: {
  invoices: InvoiceListItem[];
  /** Pre-resolved to this project's own page (see the project detail page's OverviewTab) so back-navigation from an invoice returns to the project, not wherever the project itself came from. */
  returnTo?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[14px] font-bold text-foreground">
          Recent activity
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Latest project billing events.
        </p>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            No invoice activity yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((invoice, index) => (
              <div key={invoice.id} className="relative">
                {index < invoices.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-[13px] bottom-[-13px] left-[5px] w-px bg-border"
                  />
                ) : null}
                <Link
                  href={withReturnTo(`/invoices/${invoice.id}`, returnTo)}
                  className="flex items-start gap-2.5 hover:opacity-80"
                >
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 h-[11px] w-[11px] shrink-0 rounded-full border-[3px] bg-card",
                      DOT_TONE[invoice.status] ?? "border-muted-foreground",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground">
                      Invoice{" "}
                      {VERB[invoice.status] ?? invoice.status.toLowerCase()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {invoice.invoiceNumber} ·{" "}
                      {formatCurrency(
                        invoice.total.toString(),
                        invoice.currency,
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatShortDate(invoice.updatedAt)}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
