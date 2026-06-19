"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationIcon } from "./notification-icon";
import { cn, timeAgo } from "@/lib/utils";
import type { ClientNotification } from "@/lib/types";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification.actions";

export function NotificationBell({
  initialItems,
  initialUnread,
}: {
  initialItems: ClientNotification[];
  initialUnread: number;
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [unread, setUnread] = React.useState(initialUnread);
  const [open, setOpen] = React.useState(false);

  // Live updates via Server-Sent Events.
  React.useEffect(() => {
    const es = new EventSource("/api/realtime");
    es.addEventListener("notification", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as ClientNotification;
        setItems((prev) => [{ ...data, isRead: false }, ...prev].slice(0, 30));
        setUnread((u) => u + 1);
        toast(data.title, { description: data.message });
        router.refresh();
      } catch {
        /* ignore malformed events */
      }
    });
    es.onerror = () => {
      /* browser auto-reconnects */
    };
    return () => es.close();
  }, [router]);

  async function onMarkAll() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsReadAction();
    router.refresh();
  }

  async function onItemClick(n: ClientNotification) {
    if (!n.isRead) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      await markNotificationReadAction(n.id);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[18px] text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">การแจ้งเตือน</p>
          {unread > 0 && (
            <button
              onClick={onMarkAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              อ่านทั้งหมด
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[380px]">
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              ยังไม่มีการแจ้งเตือน
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const body = (
                  <div className="flex gap-3 px-4 py-3">
                    <NotificationIcon type={n.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
                return (
                  <li
                    key={n.id}
                    className={cn(!n.isRead && "bg-secondary/40")}
                  >
                    {n.linkUrl ? (
                      <Link href={n.linkUrl} onClick={() => onItemClick(n)} className="block hover:bg-muted/50">
                        {body}
                      </Link>
                    ) : (
                      <button
                        onClick={() => onItemClick(n)}
                        className="block w-full text-left hover:bg-muted/50"
                      >
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
