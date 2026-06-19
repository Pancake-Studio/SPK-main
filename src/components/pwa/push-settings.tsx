"use client";

import * as React from "react";
import { Bell, BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePush } from "./use-push";
import { getPushStatusAction } from "@/server/actions/push.actions";

export function PushSettings() {
  const { permission, supported, secure, subscribe, sendTest } = usePush();
  const [status, setStatus] = React.useState<{ configured: boolean; subscriptions: number } | null>(
    null,
  );
  const [busy, setBusy] = React.useState<"enable" | "test" | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      setStatus(await getPushStatusAction());
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function onEnable() {
    setBusy("enable");
    const r = await subscribe();
    setBusy(null);
    if (r.ok) {
      toast.success("เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว");
      refresh();
    } else {
      toast.error(
        r.reason === "insecure"
          ? "ต้องใช้ HTTPS หรือ localhost"
          : r.reason === "denied"
            ? "ถูกบล็อก — เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์"
            : r.error
              ? `ไม่สำเร็จ: ${r.error}`
              : "เปิดไม่สำเร็จ",
      );
    }
  }

  async function onTest() {
    setBusy("test");
    try {
      const res = await sendTest();
      if (!res.configured) {
        toast.error("เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า VAPID (.env)");
      } else if (res.total === 0) {
        toast.error("อุปกรณ์นี้ยังไม่ได้สมัคร — กด “เปิดการแจ้งเตือน” ก่อน");
      } else if (res.sent > 0) {
        toast.success(`ส่งแล้ว ${res.sent} อุปกรณ์ — ดูการแจ้งเตือนของเครื่อง`);
      } else {
        toast.error(
          `ส่งไม่สำเร็จ ${res.failed} อุปกรณ์ — ดู log เซิร์ฟเวอร์ (คีย์อาจไม่ตรง: รีสตาร์ท dev/rebuild)`,
        );
      }
    } catch {
      toast.error("ส่งทดสอบไม่สำเร็จ");
    }
    setBusy(null);
    refresh();
  }

  const permLabel =
    permission === "granted"
      ? "อนุญาตแล้ว"
      : permission === "denied"
        ? "ถูกบล็อก"
        : permission === "unsupported"
          ? "ไม่รองรับ"
          : "ยังไม่ตัดสินใจ";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">สถานะสิทธิ์:</span>
        <Badge variant={permission === "granted" ? "success" : permission === "denied" ? "destructive" : "muted"}>
          {permLabel}
        </Badge>
        <span className="text-muted-foreground">อุปกรณ์ที่สมัคร:</span>
        <Badge variant={status && status.subscriptions > 0 ? "success" : "muted"}>
          {status ? status.subscriptions : "…"}
        </Badge>
        {status && !status.configured && (
          <Badge variant="warning">เซิร์ฟเวอร์ยังไม่ตั้งค่า VAPID</Badge>
        )}
      </div>

      {!secure && (
        <p className="text-sm text-destructive">
          ต้องเปิดผ่าน HTTPS หรือ localhost จึงจะใช้การแจ้งเตือนบนอุปกรณ์ได้
        </p>
      )}
      {permission === "unsupported" && (
        <p className="text-sm text-muted-foreground">
          เบราว์เซอร์/อุปกรณ์นี้ไม่รองรับ Web Push (บน iOS ต้องติดตั้งลงหน้าจอหลักก่อน)
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={onEnable}
          loading={busy === "enable"}
          disabled={!supported || !secure || permission === "denied"}
        >
          <BellRing />
          เปิดการแจ้งเตือน
        </Button>
        <Button
          variant="outline"
          onClick={onTest}
          loading={busy === "test"}
          disabled={!supported}
        >
          <Send />
          ส่งการแจ้งเตือนทดสอบ
        </Button>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Bell className="mt-0.5 size-3.5 shrink-0" />
        กด “ส่งการแจ้งเตือนทดสอบ” เพื่อตรวจว่าการแจ้งเตือนบนเครื่องทำงาน — ควรเห็น notification เด้งขึ้นมา
      </p>
    </div>
  );
}
