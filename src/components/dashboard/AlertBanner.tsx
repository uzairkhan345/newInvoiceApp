/**
 * Dashboard alert banner (redesign v3) — a single "Review urgent items"
 * action wired to the same client-side filter state ActionRequiredPanel's
 * stat cards use (via DashboardActionArea.tsx), not a row of separate
 * navigation links. Matches the reference prototype's behavior: clicking it
 * filters the Action Required list below to the overdue category, same as
 * clicking the Overdue stat card directly.
 */
export function AlertBanner({
  headline,
  urgentCount,
  onReviewUrgent,
}: {
  headline: string;
  urgentCount: number;
  onReviewUrgent: () => void;
}) {
  return (
    // Plain inline style here, not a Tailwind arbitrary-value background-image class — that form didn't reliably apply for a CSS-var-backed gradient.
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[14px] px-[22px] py-5 text-white"
      style={{ backgroundImage: "var(--alert-banner-gradient)" }}
    >
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-bold tracking-[0.08em] text-[#a5b4fc] uppercase">
          Attention needed
        </span>
        <span className="text-[16px] font-normal">{headline}</span>
        {urgentCount > 0 ? (
          <span className="text-[13px] text-white/70">
            {urgentCount} {urgentCount === 1 ? "is" : "are"} urgent and should
            be handled today.
          </span>
        ) : null}
      </div>
      {urgentCount > 0 ? (
        <button
          type="button"
          onClick={onReviewUrgent}
          className="rounded-lg bg-white/[0.12] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-white/[0.2]"
        >
          Review urgent items →
        </button>
      ) : null}
    </div>
  );
}
