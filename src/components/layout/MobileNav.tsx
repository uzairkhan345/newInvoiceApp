"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, isActiveNavHref } from "./navItems";

/**
 * Mobile nav shell (<1024px) — M27 v2 redesign,
 * design_handoff_dashboard_v2/README.md §1, Docs/ui_design_guide.md §3.
 * Replaces the sidebar entirely (it never just disappears): a fixed top
 * bar (logo/wordmark only) plus a fixed bottom tab bar, one tab per nav
 * item. AppShell.tsx pads main content to clear both.
 */
export function MobileTopBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-40 flex h-[52px] items-center gap-2 bg-nav px-4 lg:hidden">
      <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-brand text-xs font-bold text-white">
        I
      </div>
      <span className="text-[13px] font-bold text-white">Invoice App</span>
    </div>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-nav px-1 pt-1.5 pb-2.5 lg:hidden">
      {navItems.map((item) => {
        const isActive = isActiveNavHref(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 py-1"
          >
            <item.icon
              className={cn(
                "h-5 w-5",
                isActive ? "text-nav-active-foreground" : "text-nav-email",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-semibold",
                isActive ? "text-nav-active-foreground" : "text-nav-email",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
