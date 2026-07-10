"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

/**
 * Docs/execution_plan.md §12 — `/invoices/[id]/print` must render bare, with
 * zero app chrome (no sidebar, no page padding), since it's the exact markup
 * Puppeteer will later navigate to and screenshot (M9). There is only one
 * Next.js root layout in this app (no route groups in the folder structure
 * per Docs/execution_plan.md §2), so the shell is toggled here by pathname
 * rather than via a second root layout.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBarePrintRoute = /^\/invoices\/[^/]+\/print$/.test(pathname ?? "");

  if (isBarePrintRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[1200px] p-4 md:p-10">{children}</div>
      </main>
    </div>
  );
}
