import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Shared nav item list — Docs/ui_design_guide.md §3 / M27
 * (design_handoff_dashboard_v2/README.md §1). Used by both the desktop
 * Sidebar and the mobile top bar / bottom tab bar so the two chrome
 * variants never drift out of sync.
 */
export const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/projects", label: "Projects", icon: Briefcase },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActiveNavHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
