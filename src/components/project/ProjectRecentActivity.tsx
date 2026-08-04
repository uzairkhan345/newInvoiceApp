import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/currency";
import { formatDisplayDate } from "@/lib/dates";
import type { InvoiceListItem } from "@/repositories/invoiceRepository";

const VERB: Partial<Record<string, string>> = {
  SENT: "sent",
  PAID: "marked paid",
  VOID: "voided",
};

const DOT_TONE: Partial<Record<string, string>> = {
  PAID: "bg-[var(--status-paid-text)]",
  SENT: "bg-brand",
  VOID: "bg-muted-foreground",
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
}: {
  invoices: InvoiceListItem[];
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
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="flex items-start gap-2.5 hover:opacity-80"
              >
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_TONE[invoice.status] ?? "bg-muted-foreground"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground">
                    Invoice {invoice.invoiceNumber}{" "}
                    {VERB[invoice.status] ?? invoice.status.toLowerCase()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatCurrency(invoice.total.toString(), invoice.currency)}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {formatDisplayDate(invoice.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
