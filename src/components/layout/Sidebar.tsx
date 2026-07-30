"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems, isActiveNavHref } from "./navItems";
import { AlertsBell } from "./AlertsBell";

/**
 * Desktop nav shell (≥1024px) — M27 v2 redesign,
 * design_handoff_dashboard_v2/README.md §1, Docs/ui_design_guide.md §3.
 * Dark navy surface, replacing the prior white sidebar. Below 1024px this
 * renders nothing — MobileNav.tsx's top bar + bottom tab bar take over
 * entirely rather than this collapsing to a drawer.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[240px] shrink-0 flex-col bg-nav lg:flex">
      <div className="flex items-center justify-between gap-2.5 px-5 py-[22px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-brand text-[13px] font-bold text-white">
            I
          </div>
          <span className="text-sm font-bold text-white">Invoice App</span>
        </div>
        <AlertsBell variant="sidebar" />
      </div>

      <nav className="flex flex-1 flex-col gap-[3px] px-3 py-1">
        {navItems.map((item) => {
          const isActive = isActiveNavHref(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-[9px] text-[13px] font-semibold transition-colors",
                isActive
                  ? "bg-nav-active text-nav-active-foreground"
                  : "text-nav-muted hover:bg-white/[0.06]",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
                  isActive
                    ? "bg-brand text-white"
                    : "bg-nav-icon text-nav-muted",
                )}
              >
                <item.icon className="h-3 w-3" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-nav-border px-5 py-4">
        <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          A
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-xs font-semibold text-white">
            Admin
          </span>
          <span className="truncate text-[11px] text-nav-email">
            admin@local
          </span>
        </div>
      </div>
    </aside>
  );
}
