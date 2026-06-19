"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { NotificationIcon } from "./notification-icon";
import { cn, timeAgo } from "@/lib/utils";
import type { ClientNotification } from "@/lib/types";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/server/actions/notification.actions";

export function NotificationFeed({ items }: { items: ClientNotification[] }) {
  const router = useRouter();
  const [list, setList] = React.useState(items);

  React.useEffect(() => setList(items), [items]);

  const hasUnread = list.some((n) => !n.isRead);

  async function markAll() {
    setList((p) => p.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsReadAction();
    router.refresh();
  }

  async function markOne(n: ClientNotification) {
    if (n.isRead) return;
    setList((p) => p.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    await markNotificationReadAction(n.id);
    router.refresh();
  }

  if (list.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="ยังไม่มีการแจ้งเตือน"
        description="การแจ้งเตือนเกี่ยวกับการแลกคาบ ตารางเรียน และประกาศจะปรากฏที่นี่"
      />
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={markAll}>
            <CheckCheck className="size-4" />
            ทำเครื่องหมายอ่านทั้งหมด
          </Button>
        </div>
      )}
      <Card className="divide-y divide-border p-0">
        {list.map((n) => {
          const body = (
            <div className="flex gap-3 p-4">
              <NotificationIcon type={n.type} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{n.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
            </div>
          );
          return (
            <div key={n.id} className={cn(!n.isRead && "bg-secondary/30")}>
              {n.linkUrl ? (
                <Link href={n.linkUrl} onClick={() => markOne(n)} className="block hover:bg-muted/40">
                  {body}
                </Link>
              ) : (
                <button onClick={() => markOne(n)} className="block w-full text-left hover:bg-muted/40">
                  {body}
                </button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
