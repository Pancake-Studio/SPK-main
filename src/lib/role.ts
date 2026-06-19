import { ROLES } from "@/lib/constants";

const LABELS: Record<string, string> = {
  [ROLES.ADMIN]: "ผู้ดูแลระบบ",
  [ROLES.TEACHER]: "ครู",
  [ROLES.STUDENT]: "นักเรียน",
};

export function roleLabel(role: string): string {
  return LABELS[role] ?? role;
}
