"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellOff, CheckCheck, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { NotificationIcon } from "./notification-icon";
import { TimeAgo } from "@/components/time-ago";
import { cn } from "@/lib/utils";
import type { ClientNotification } from "@/lib/types";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  loadNotificationsAction,
} from "@/server/actions/notification.actions";

export function NotificationFeed({
  initialItems,
  initialHasMore,
}: {
  initialItems: ClientNotification[];
  initialHasMore: boolean;
}) {
  const router = useRouter();
  const [list, setList] = React.useState(initialItems);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loading, setLoading] = React.useState(false);

  // Re-sync when the server component re-renders with fresh first-page data.
  React.useEffect(() => {
    setList(initialItems);
    setHasMore(initialHasMore);
  }, [initialItems, initialHasMore]);

  const hasUnread = list.some((n) => !n.isRead);

  // Load the next page; guarded so the observer can't fire it twice at once.
  const loadingRef = React.useRef(false);
  const loadMore = React.useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await loadNotificationsAction(list.length);
      // De-dupe in case a realtime refresh shifted the window.
      setList((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...res.items.filter((n) => !seen.has(n.id))];
      });
      setHasMore(res.hasMore);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, list.length]);

  // Infinite scroll: load more when the sentinel scrolls into view.
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore]);

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
                <TimeAgo date={n.createdAt} className="mt-1 block text-xs text-muted-foreground" />
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

      {/* Sentinel + loading indicator for infinite scroll. */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              กำลังโหลด…
            </span>
          ) : (
            <Button variant="ghost" size="sm" onClick={loadMore}>
              โหลดเพิ่ม
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
