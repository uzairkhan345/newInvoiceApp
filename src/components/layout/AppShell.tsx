"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTopBar, MobileTabBar } from "@/components/layout/MobileNav";
import type { Role } from "@/generated/prisma/client";

/**
 * `/invoices/[id]/print` must render bare, with
 * zero app chrome (no sidebar, no page padding), since it's the exact markup
 * Puppeteer will later navigate to and screenshot (M9). `AppShell` itself is
 * rendered from the `(app)` route group's layout (M28's auth gate), which
 * every page including `print` sits under — the shell is toggled here by
 * pathname rather than by moving `print` to its own layout, so this
 * component's own logic doesn't need to know about that route group.
 *
 * Nav breakpoint is 1024px (`lg`) — M27, design_handoff_dashboard_v2/README.md
 * §1: below it, Sidebar renders nothing and MobileTopBar/MobileTabBar take
 * over instead of a collapsing drawer, so main content pads for their fixed
 * 52px/64px heights only below that breakpoint.
 */
export function AppShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isBarePrintRoute = /^\/invoices\/[^/]+\/print$/.test(pathname ?? "");

  if (isBarePrintRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <MobileTopBar />
      <main className="min-w-0 flex-1 pt-[52px] pb-16 lg:pt-0 lg:pb-0">
        <div className="mx-auto max-w-[1200px] p-4 lg:p-10">{children}</div>
      </main>
      <MobileTabBar role={role} />
    </div>
  );
}
