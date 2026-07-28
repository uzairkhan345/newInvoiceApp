import { FilterChips } from "@/components/shared/FilterChips";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

export type ProjectStatusFilterValue = (typeof FILTERS)[number]["value"];

/** M27 v2 redesign (design_handoff_dashboard_v2/README.md §4) — new, the Projects list had no filter before this. */
export function ProjectStatusFilter({
  active,
  fromDashboard = false,
}: {
  active: ProjectStatusFilterValue;
  fromDashboard?: boolean;
}) {
  return (
    <FilterChips
      options={FILTERS}
      active={active}
      hrefFor={(value) => {
        const params = new URLSearchParams();
        if (value !== "all") params.set("status", value);
        if (fromDashboard) params.set("from", "dashboard");
        const query = params.toString();
        return query ? `/projects?${query}` : "/projects";
      }}
    />
  );
}
