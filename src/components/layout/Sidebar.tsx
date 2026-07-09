"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Briefcase, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * App shell sidebar — Docs/ui_design_guide.md §3.
 * Nav items are added alongside their pages as milestones land — Dashboard
 * (M0), Parties (M2), Projects (M4), and Invoices (M5) exist so far.
 */
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/invoices", label: "Invoices", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
          I
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-sidebar-foreground">
            Invoice App
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                isActive
                  ? "bg-brand-light text-brand"
                  : "text-sidebar-foreground hover:bg-muted",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t border-sidebar-border px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-bold text-brand">
          A
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-xs font-semibold text-sidebar-foreground">
            Admin
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            admin@local
          </span>
        </div>
      </div>
    </aside>
  );
}
