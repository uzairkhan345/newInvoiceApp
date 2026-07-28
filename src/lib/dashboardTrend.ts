/**
 * Dashboard trend/sparkline math — M27 v2 redesign,
 * design_handoff_dashboard_v2/README.md §2, Docs/ui_design_guide.md §16.
 * There is no history/audit table in the schema (every status is derived
 * live, never snapshotted over time), so every figure computed from these
 * helpers is a best-effort approximation built from createdAt/updatedAt
 * timestamps that already exist — explicitly agreed with the user not to be
 * a make-or-break feature at this stage.
 *
 * Known artifact: every trend delta below is computed as (currently-in-bucket
 * entries created/updated in-window) − (currently-in-the-next-bucket exits
 * updated in-window). A record that both enters and leaves a bucket fully
 * within the same trailing window (e.g. a project created and archived, or
 * an invoice drafted and sent, all inside 30 days) nets to -1 rather than 0,
 * since it drops out of "entered" the moment it's no longer currently in
 * that bucket while still counting once toward "exited" — see
 * tests/integration/dashboardTrend.test.ts for a worked example of this. An
 * accepted consequence of not having a real history table, not a bug.
 */

/** Docs/feedback_backlog.md M27 — "stale draft" threshold, deliberately a single named constant so it's changeable later without a design decision. */
export const STALE_DRAFT_DAYS = 1;

export const TREND_WINDOW_DAYS = 30;
export const SPARKLINE_BUCKETS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/** Whole days elapsed since `date` — used for the stale-draft alert chip's "N+ days" text. */
export function daysSince(date: Date, now = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY_MS);
}

/** A stat card's approximated trend: net change over the window + per-bucket activity volume for the sparkline. */
export type StatTrend = {
  delta: number;
  sparklineCounts: number[];
};

export type TrendSemantics = "higher-is-better" | "lower-is-better" | "neutral";

export type TrendTone = "positive" | "negative" | "neutral";

export type TrendPresentation = {
  arrow: "▲" | "▼" | "–";
  deltaText: string;
  tone: TrendTone;
};

function formatDelta(delta: number): string {
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * Neutral-semantics stats (e.g. Draft Invoices — more/fewer drafts isn't
 * inherently good or bad) always render the flat dash regardless of actual
 * sign, matching the v2 design's own example ("Draft Invoices" shows
 * "– +1", not "▲ +1"). Non-neutral stats show a real arrow colored by
 * whether that direction is favorable for that specific metric (e.g. a
 * rising Overdue count is unfavorable even though the arrow points up).
 */
export function resolveTrendPresentation(
  delta: number,
  semantics: TrendSemantics,
): TrendPresentation {
  if (semantics === "neutral" || delta === 0) {
    return { arrow: "–", deltaText: formatDelta(delta), tone: "neutral" };
  }
  const isUp = delta > 0;
  const favorable = semantics === "higher-is-better" ? isUp : !isUp;
  return {
    arrow: isUp ? "▲" : "▼",
    deltaText: formatDelta(delta),
    tone: favorable ? "positive" : "negative",
  };
}

/** Buckets timestamps into `bucketCount` equal trailing windows, oldest to newest. */
export function bucketCounts(
  timestamps: Date[],
  days = TREND_WINDOW_DAYS,
  bucketCount = SPARKLINE_BUCKETS,
  now = new Date(),
): number[] {
  const bucketMs = (days * DAY_MS) / bucketCount;
  const windowStart = now.getTime() - days * DAY_MS;
  const counts = new Array<number>(bucketCount).fill(0);
  for (const timestamp of timestamps) {
    const offset = timestamp.getTime() - windowStart;
    if (offset < 0) continue;
    const index = Math.min(bucketCount - 1, Math.floor(offset / bucketMs));
    counts[index] += 1;
  }
  return counts;
}

/**
 * Scales bucket counts to 0-100 (%) bar heights for the 5-bar sparkline. A
 * genuinely-zero bucket still renders a small visible sliver (8%) rather
 * than collapsing to nothing, matching typical sparkline treatment.
 */
export function scaleSparklineBars(counts: number[]): number[] {
  const max = Math.max(...counts, 0);
  if (max === 0) return counts.map(() => 8);
  return counts.map((count) =>
    count === 0 ? 8 : Math.round((count / max) * 100),
  );
}
