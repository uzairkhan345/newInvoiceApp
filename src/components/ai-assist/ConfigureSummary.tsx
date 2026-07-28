import Link from "next/link";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * M16 — the "Configure" entry point now links
 * straight into the real editable /settings page, superseding M11's
 * read-only env-var summary dialog (Story 11.4's original framing).
 */
export function ConfigureSummary() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Configure AI Assist"
      nativeButton={false}
      render={<Link href="/settings" />}
    >
      <Settings2 className="h-3.5 w-3.5" />
    </Button>
  );
}
