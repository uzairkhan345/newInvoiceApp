"use client";

import { useState } from "react";
import { AlertBanner } from "@/components/dashboard/AlertBanner";
import {
  ActionRequiredPanel,
  type ActionMetric,
  type FilterKey,
  type MetricKey,
} from "@/components/dashboard/ActionRequiredPanel";
import type { PriorityFeedItem } from "@/lib/priorityFeed";

/**
 * Owns the one filter state AlertBanner's "Review urgent items" button and
 * ActionRequiredPanel's 4 stat cards both drive — matches the reference
 * prototype, where clicking either lands on the same filtered list rather
 * than each having its own separate behavior.
 */
export function DashboardActionArea({
  items,
  metrics,
  headline,
}: {
  items: PriorityFeedItem[];
  metrics: Record<MetricKey, ActionMetric>;
  headline: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  return (
    <>
      {items.length > 0 ? (
        <AlertBanner
          headline={headline}
          urgentCount={metrics.overdue.count}
          onReviewUrgent={() => setFilter("overdue")}
        />
      ) : null}
      <ActionRequiredPanel
        items={items}
        metrics={metrics}
        filter={filter}
        onFilterChange={setFilter}
      />
    </>
  );
}
