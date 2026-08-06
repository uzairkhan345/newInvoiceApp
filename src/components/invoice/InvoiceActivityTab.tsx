import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { InvoiceActivityEvent } from "@/lib/invoiceActivity";

const DOT_TONE: Record<InvoiceActivityEvent["tone"], string> = {
  negative: "bg-[var(--status-overdue-text)]",
  positive: "bg-[var(--status-paid-text)]",
  info: "bg-brand",
  neutral: "bg-muted-foreground",
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

/** Invoice detail Activity tab — see lib/invoiceActivity.ts for what's real vs. deliberately omitted. */
export function InvoiceActivityTab({
  invoiceNumber,
  events,
}: {
  invoiceNumber: string;
  events: InvoiceActivityEvent[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[14px] font-bold text-foreground">
          Invoice activity
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Audit trail for {invoiceNumber}.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 p-0">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`flex items-start gap-3 px-5 py-3.5 ${index > 0 ? "border-t border-muted" : ""}`}
          >
            <span
              className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_TONE[event.tone]}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground">
                {event.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {event.detail}
              </p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatDateTime(event.date)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
