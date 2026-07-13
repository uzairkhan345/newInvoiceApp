import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDisplayDate } from "@/lib/dates";

export type ActivityItem = {
  id: string;
  href: string;
  message: string;
  timestamp: Date;
};

/**
 * Dashboard context panel (M10, 1fr) — Docs/ui_design_guide.md §16. A plain
 * log of real lifecycle events, no cron/automated-dispatch framing.
 */
export function ActivityLog({ items }: { items: ActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[15px] font-bold text-foreground">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Lifecycle events will show up here."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex flex-col gap-0.5 text-[13px] text-foreground hover:text-brand"
                >
                  <span>{item.message}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDisplayDate(item.timestamp)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
