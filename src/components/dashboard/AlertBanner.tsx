import Link from "next/link";

export type AlertBannerChip = { label: string; href: string };

/**
 * Dashboard alert banner (M27 v2 redesign) — design_handoff_dashboard_v2/README.md
 * §2, Docs/ui_design_guide.md §16. Renders only when there's at least one
 * actionable Priority Feed item; the caller is responsible for not rendering
 * this at all when `chips` is empty (omitted entirely, never shown empty).
 */
export function AlertBanner({
  headline,
  chips,
}: {
  headline: string;
  chips: AlertBannerChip[];
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
        <span className="text-[15px] font-bold">{headline}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.href}
            href={chip.href}
            className="rounded-full bg-white/[0.12] px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/[0.2]"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
