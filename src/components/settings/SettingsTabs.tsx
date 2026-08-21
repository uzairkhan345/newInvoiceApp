import { FilterChips } from "@/components/shared/FilterChips";

const TABS = [
  { value: "providers", label: "AI Providers" },
  { value: "users", label: "Users" },
] as const;

/** M28 — real route tabs (/settings vs /settings/users), not a `?`-param
 * variant of one page like FilterChips' other users — `hrefFor` just points
 * at two different pages instead. */
export function SettingsTabs({
  active,
}: {
  active: (typeof TABS)[number]["value"];
}) {
  return (
    <div className="mb-4">
      <FilterChips
        options={TABS}
        active={active}
        hrefFor={(value) =>
          value === "providers" ? "/settings" : "/settings/users"
        }
      />
    </div>
  );
}
