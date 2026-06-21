import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Megaphone,
  TriangleAlert,
  Bell,
  Ban,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { NOTIFICATION_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAP: Record<string, { icon: LucideIcon; className: string }> = {
  [NOTIFICATION_TYPES.SWAP_REQUEST]: { icon: ArrowLeftRight, className: "bg-secondary text-secondary-foreground" },
  [NOTIFICATION_TYPES.SWAP_APPROVED]: { icon: CheckCircle2, className: "bg-success/15 text-success" },
  [NOTIFICATION_TYPES.SWAP_REJECTED]: { icon: XCircle, className: "bg-destructive/15 text-destructive" },
  [NOTIFICATION_TYPES.SWAP_CANCEL_REQUEST]: { icon: Ban, className: "bg-secondary text-secondary-foreground" },
  [NOTIFICATION_TYPES.SWAP_CANCELLED]: { icon: Undo2, className: "bg-info/15 text-info" },
  [NOTIFICATION_TYPES.SCHEDULE_CHANGED]: { icon: CalendarClock, className: "bg-info/15 text-info" },
  [NOTIFICATION_TYPES.ANNOUNCEMENT]: { icon: Megaphone, className: "bg-gold/15 text-gold-foreground dark:text-yellow" },
  [NOTIFICATION_TYPES.EMERGENCY]: { icon: TriangleAlert, className: "bg-destructive/15 text-destructive" },
};

export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const entry = MAP[type] ?? { icon: Bell, className: "bg-muted text-muted-foreground" };
  const Icon = entry.icon;
  return (
    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", entry.className, className)}>
      <Icon className="size-[18px]" />
    </span>
  );
}
