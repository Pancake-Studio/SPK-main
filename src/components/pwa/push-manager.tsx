"use client";

import * as React from "react";
import { Bell, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePush, type SubscribeResult } from "./use-push";

function explain(r: Extract<SubscribeResult, { ok: false }>): string {
  switch (r.reason) {
    case "insecure":
      return "ต้องใช้ HTTPS หรือ localhost จึงจะเปิดการแจ้งเตือนได้";
    case "denied":
      return "การแจ้งเตือนถูกบล็อก — เปิดสิทธิ์ในตั้งค่าเบราว์เซอร์";
    case "default":
      return "ยังไม่ได้อนุญาตการแจ้งเตือน";
    case "unsupported":
      return "อุปกรณ์/เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน";
    default:
      return r.error ? `เปิดไม่สำเร็จ: ${r.error}` : "เปิดการแจ้งเตือนไม่สำเร็จ";
  }
}

/**
 * Ensures the device is subscribed to Web Push. On mount (each login/dashboard
 * load) re-syncs if granted, and best-effort prompts if undecided. A banner with
 * a real button covers browsers that require a user gesture (e.g. iOS).
 */
export function PushManager() {
  const { permission, supported, secure, subscribe, ensureSubscribed } = usePush();
  const [dismissed, setDismissed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  // Re-sync existing grant / best-effort auto prompt once.
  const ran = React.useRef(false);
  React.useEffect(() => {
    if (ran.current || !supported || !secure) return;
    ran.current = true;
    (async () => {
      try {
        if (Notification.permission === "granted") await ensureSubscribed();
        else if (Notification.permission === "default") await subscribe();
      } catch {
        /* surfaced via the banner button instead */
      }
    })();
  }, [supported, secure, ensureSubscribed, subscribe]);

  async function onEnable() {
    setBusy(true);
    const r = await subscribe();
    setBusy(false);
    if (r.ok) toast.success("เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว");
    else toast.error(explain(r));
  }

  if (permission === "granted" || permission === "unsupported" || dismissed) {
    return null;
  }

  const denied = permission === "denied";

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/30 bg-secondary/40 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
        <Bell className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">เปิดการแจ้งเตือนบนอุปกรณ์นี้</p>
        <p className="text-xs text-muted-foreground">
          {!secure
            ? "ต้องเปิดผ่าน HTTPS หรือ localhost จึงจะใช้ได้"
            : denied
              ? "การแจ้งเตือนถูกปิดอยู่ — เปิดสิทธิ์ได้ในตั้งค่าเบราว์เซอร์/แอป"
              : "รับแจ้งเตือนการแลกคาบและตารางเปลี่ยน แม้ไม่ได้เปิดหน้าเว็บ"}
        </p>
      </div>
      {!denied && secure && (
        <Button size="sm" onClick={onEnable} loading={busy}>
          เปิด
        </Button>
      )}
      <button
        aria-label="ปิด"
        onClick={() => setDismissed(true)}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
