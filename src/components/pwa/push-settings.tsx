"use client";

import * as React from "react";
import { Bell, BellRing, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePush, type SubscribeResult } from "./use-push";
import { getPushStatusAction } from "@/server/actions/push.actions";

function explain(r: Extract<SubscribeResult, { ok: false }>, isBrave: boolean): string {
  switch (r.reason) {
    case "insecure":
      return "ต้องใช้ HTTPS หรือ localhost";
    case "denied":
      return "ถูกบล็อก — เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์";
    case "invalid-key":
      return "รหัส VAPID ไม่ถูกต้องหรือยังไม่ได้ตั้งค่าในเซิร์ฟเวอร์";
    case "push-service-error":
      return isBrave
        ? "Brave บล็อก push service — ปิด Shields หรือเปิดใช้ Google services ใน brave://settings/privacy"
        : "Push service ถูกบล็อก — ลองปิด ad-blocker หรือตรวจสอบสิทธิ์การแจ้งเตือน";
    default:
      return r.error ? `ไม่สำเร็จ: ${r.error}` : "เปิดไม่สำเร็จ";
  }
}

export function PushSettings() {
  const { permission, supported, secure, iosNeedsInstall, isBrave, subscribe, sendTest } = usePush();
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
      toast.error(explain(r, isBrave));
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
      } else if (res.mismatch && res.mismatch > 0) {
        toast.error(
          `VAPID key เปลี่ยน — กด “เปิดการแจ้งเตือน” อีกครั้งเพื่อสมัครใหม่ (${res.mismatch} อุปกรณ์)`,
        );
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
      {iosNeedsInstall ? (
        <p className="rounded-md border border-primary/30 bg-secondary/40 px-3 py-2 text-sm text-foreground">
          บน iPhone/iPad ต้องติดตั้งแอปก่อน: เปิดด้วย <span className="font-medium">Safari</span> →
          แตะปุ่มแชร์ → <span className="font-medium">เพิ่มไปยังหน้าจอโฮม</span> →
          เปิดแอปจากไอคอน แล้วจึงกด “เปิดการแจ้งเตือน” (ต้อง iOS 16.4 ขึ้นไป)
        </p>
      ) : (
        permission === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            เบราว์เซอร์/อุปกรณ์นี้ไม่รองรับ Web Push
          </p>
        )
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

      {isBrave && (
        <p className="text-xs text-muted-foreground">
          บน Brave หากกดเปิดแล้วขึ้น “Registration failed - push service error” ให้ปิด Shields สำหรับเว็บนี้ หรือเปิด “Use Google services for push messaging” ใน <code>brave://settings/privacy</code>
        </p>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Bell className="mt-0.5 size-3.5 shrink-0" />
        กด “ส่งการแจ้งเตือนทดสอบ” เพื่อตรวจว่าการแจ้งเตือนบนเครื่องทำงาน — ควรเห็น notification เด้งขึ้นมา
      </p>
    </div>
  );
}
