import { ROLES, type Role } from "@/lib/constants";

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
};

export type NavIcon =
  | "dashboard"
  | "teachers"
  | "students"
  | "classes"
  | "subjects"
  | "schedule"
  | "periods"
  | "tasks"
  | "swap"
  | "announce"
  | "sync"
  | "settings"
  | "bell"
  | "profile";

export const NAV: Record<Role, NavItem[]> = {
  [ROLES.ADMIN]: [
    { label: "ภาพรวม", href: "/admin", icon: "dashboard" },
    { label: "ครู", href: "/admin/teachers", icon: "teachers" },
    { label: "นักเรียน", href: "/admin/students", icon: "students" },
    { label: "ห้องเรียน", href: "/admin/classes", icon: "classes" },
    { label: "วิชา", href: "/admin/subjects", icon: "subjects" },
    { label: "ตารางสอน", href: "/admin/schedule", icon: "schedule" },
    { label: "เวลาเรียน / คาบ", href: "/admin/periods", icon: "periods" },
    { label: "คำขอแลกคาบ", href: "/admin/swaps", icon: "swap" },
    { label: "ประกาศ", href: "/admin/announcements", icon: "announce" },
    { label: "Sync Excel", href: "/admin/data-sync", icon: "sync" },
  ],
  [ROLES.TEACHER]: [
    { label: "ภาพรวม", href: "/teacher", icon: "dashboard" },
    { label: "ตารางสอนของฉัน", href: "/teacher/schedule", icon: "schedule" },
    { label: "มอบหมายงาน", href: "/teacher/assignments", icon: "tasks" },
    { label: "แลกคาบสอน", href: "/teacher/swaps", icon: "swap" },
    { label: "การแจ้งเตือน", href: "/teacher/notifications", icon: "bell" },
  ],
  [ROLES.STUDENT]: [
    { label: "ภาพรวม", href: "/student", icon: "dashboard" },
    { label: "ตารางเรียน", href: "/student/schedule", icon: "schedule" },
    { label: "งาน / To-do", href: "/student/todos", icon: "tasks" },
    { label: "การแจ้งเตือน", href: "/student/notifications", icon: "bell" },
  ],
};

export function navForRole(role: string): NavItem[] {
  return NAV[role as Role] ?? [];
}
