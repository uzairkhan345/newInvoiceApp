"use server";

import { invoiceService } from "@/services/invoiceService";
import { projectService } from "@/services/projectService";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { buildPriorityFeed, type PriorityFeedItem } from "@/lib/priorityFeed";
import { requireSession } from "@/lib/authz";

export type ActionResult<T> =
  { success: true; data: T } | { success: false; error: string };

/**
 * Read-only — powers the global nav `AlertsBell`, mirroring the same feed
 * the Dashboard's Action Required panel builds (`src/app/page.tsx`), so the
 * bell shows the same overdue/prepare/draft/due/setup items rather than
 * only fired ProjectAlertSchedule reminders. No per-page server props reach
 * `AlertsBell` (permanently-mounted Client Component), hence the action.
 */
export async function listPriorityFeedAction(): Promise<
  ActionResult<PriorityFeedItem[]>
> {
  const check = await requireSession();
  if (!check.ok) return { success: false, error: check.error };

  const [
    activeProjects,
    allInvoices,
    overdueInvoices,
    staleDrafts,
    dueSoonInvoices,
    missingPaymentMethodProjects,
    firedAlertSchedules,
  ] = await Promise.all([
    projectService.list({ status: "ACTIVE" }),
    invoiceService.list(),
    invoiceService.listOverdue(),
    invoiceService.listStaleDrafts(),
    invoiceService.listDueSoon(),
    projectService.listMissingPreferredPaymentMethod(),
    projectAlertScheduleService.listFiredAcrossActiveProjects(),
  ]);

  const feed = buildPriorityFeed({
    overdueInvoices,
    dueSoonInvoices,
    staleDrafts,
    missingPaymentMethodProjects,
    firedAlertSchedules,
    activeProjects,
    allInvoices,
  });

  return { success: true, data: feed };
}
