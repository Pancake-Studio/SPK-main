"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  GraduationCap,
  School,
  BookOpen,
  CalendarDays,
  Clock,
  Sparkles,
  ClipboardList,
  ArrowLeftRight,
  Share2,
  Megaphone,
  FileSpreadsheet,
  Settings,
  Bell,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavIcon, NavItem } from "@/lib/nav";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  admins: ShieldCheck,
  teachers: Users,
  students: GraduationCap,
  classes: School,
  subjects: BookOpen,
  schedule: CalendarDays,
  periods: Clock,
  activities: Sparkles,
  tasks: ClipboardList,
  swap: ArrowLeftRight,
  delegate: Share2,
  announce: Megaphone,
  sync: FileSpreadsheet,
  settings: Settings,
  bell: Bell,
  profile: User,
};

export function SidebarNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  // A nav item matches when the path equals its href or sits under it. When two
  // items both match (e.g. /teacher/schedule and /teacher/schedule/manage), only
  // the MOST specific (longest href) should highlight — otherwise both light up.
  const activeHref = items.reduce((best, item) => {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return matches && item.href.length > best.length ? item.href : best;
  }, "");

  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === activeHref;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
            )}
            <Icon className="size-[18px] shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
