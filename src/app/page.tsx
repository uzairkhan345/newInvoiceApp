import { PageHeader } from "@/components/layout/PageHeader";

/**
 * Placeholder dashboard (M0 scaffolding only).
 * The real operational dashboard (stats row, Needs Attention, Recent Activity)
 * is built in M10 — see Docs/execution_plan.md §16.
 */
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Placeholder — the real dashboard lands in milestone M10."
      />
      <p className="text-sm text-muted-foreground">
        App shell is scaffolded. Nothing else is built yet.
      </p>
    </>
  );
}
